const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert"),
  { chromium } = require("playwright");
let phase = "old",
  browser;
const root = path.resolve("dist");
const oldWorker =
  "const C='realscan-cache-v3.3.0';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['/js/app.js'])).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request));else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});";
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  res.setHeader("Cache-Control", "no-store");
  if (phase === "old") {
    res.setHeader(
      "Content-Type",
      pathname.endsWith(".js") ? "application/javascript" : "text/html",
    );
    return res.end(
      pathname === "/sw.js"
        ? oldWorker
        : pathname === "/js/app.js"
          ? "}"
          : '<html><script>navigator.serviceWorker.register("/sw.js")</script><body>Old broken cache</body></html>',
    );
  }
  const file = path.resolve(
    root,
    "." + (pathname === "/" ? "/index.html" : pathname),
  );
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (e, b) => {
    if (e) return res.writeHead(404).end();
    res.setHeader(
      "Content-Type",
      {
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".html": "text/html",
        ".json": "application/json",
        ".css": "text/css",
        ".wasm": "application/wasm",
      }[path.extname(file)] || "application/octet-stream",
    );
    res.end(b);
  });
});
(async () => {
  await new Promise((r) => server.listen(5518, "127.0.0.1", r));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.REALSCAN_CHROMIUM
      ? { executablePath: process.env.REALSCAN_CHROMIUM }
      : {}),
  });
  const context = await browser.newContext(),
    page = await context.newPage();
  await page.goto("http://127.0.0.1:5518");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  assert(await page.evaluate(async () => !!(await caches.match("/js/app.js"))));
  phase = "new";
  await page.reload();
  await page.waitForFunction(
    expected => typeof updateUI === "function" && window.APP_VERSION === expected,
    "v" + require("../package.json").version,
    { timeout: 45000 },
  );
  const keys = await page.evaluate(() => caches.keys());
  assert(!keys.includes("realscan-cache-v3.3.0"));
  assert(
    keys.includes(JSON.parse(fs.readFileSync("dist/version.json")).version),
  );
  fs.writeFileSync(
    ".audit/repair-evidence/upgrade.json",
    JSON.stringify({ recovered: true, caches: keys }, null, 2),
  );
  console.log(
    "PASS Existing broken cached app recovers to the current build without clearing user storage",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    server.close();
  });
