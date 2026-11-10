const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert"),
  { chromium } = require("playwright");
let phase = "old",
  browser;
const root = path.resolve("dist");
const oldWorker =
  "const C='realscan-cache-v3.3.0';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['/js/app.js','/js/config.js'])).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(fetch(e.request));else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});";
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
        : pathname === "/js/config.js" ? "window.APP_VERSION='v3.28.1';window.__OLD_CONFIG_EXECUTED=true;" : pathname === "/js/app.js" ? "}"
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
  // CI (runner lento + precache del shell más pesado desde 3.41.0, con
  // paperless-ingest/explore y paperless-341.css) demostró que las esperas
  // cortas o sin cota de esta suite queman el job: `serviceWorker.ready`
  // dentro de evaluate() no tiene timeout propio en Playwright y puede no
  // resolverse nunca. Todas las esperas quedan acotadas y por condición
  // (polling), sin sleeps fijos: se sale en cuanto la condición se cumple.
  const swReady = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => "ready"),
      new Promise((resolve) => setTimeout(() => resolve("timeout"), 60000)),
    ]),
  );
  assert.equal(
    swReady,
    "ready",
    "El service worker anterior no llegó a estar listo en 60 s",
  );
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {
    timeout: 60000,
    polling: 250,
  });
  assert(await page.evaluate(async () => !!(await caches.match("/js/app.js"))));
  await page.evaluate(async()=>{localStorage.setItem('user-private-test-marker','keep');const c=await caches.open('unrelated-cache-for-test');await c.put('/unrelated-test',new Response('keep'));});
  phase = "new";
  await page.reload();
  await page.waitForFunction(
    expected => typeof updateUI === "function" && window.APP_VERSION === expected,
    "v" + require("../package.json").version,
    // 45 s se quedó corto en CI: la activación del worker nuevo espera a
    // que el precache (cache.addAll del shell) termine en un runner lento.
    // Espera por condición con polling: no añade demora cuando va bien.
    { timeout: 120000, polling: 250 },
  );
  const expectedBuild = JSON.parse(fs.readFileSync("dist/version.json")).version;
  // Current JS can load before service-worker installation and activation finish.
  // Require a reply from the worker actually controlling this page, not merely a new cache.
  await page.waitForFunction(async expected => {
    const controller = navigator.serviceWorker.controller;
    if (!controller || controller.state !== 'activated') return false;
    const info = await new Promise(resolve => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => { channel.port1.close(); resolve(null); }, 1500);
      channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data); };
      controller.postMessage({type: 'REALSCAN_CACHE_INFO'}, [channel.port2]);
    });
    return info?.name === expected;
  }, expectedBuild, {timeout: 120000, polling: 200});
  assert.equal(await page.evaluate(()=>window.__OLD_CONFIG_EXECUTED),undefined,'Old cached configuration must never execute in the new page');
  assert.equal(await page.evaluate(()=>localStorage.getItem('user-private-test-marker')),'keep');
  // Observe CacheStorage from the caller too: activation may still be completing.
  // La limpieza del caché obsoleto ocurre al activar el worker nuevo; con el
  // precache más pesado y el runner de CI lento, 10 s no bastaban. Se sigue
  // sondeando la condición (cada 100 ms) con un plazo mayor, sin sleeps.
  let keys=[];const cleanupDeadline=Date.now()+60000;
  do{keys=await page.evaluate(()=>caches.keys());if(!keys.includes("realscan-cache-v3.3.0"))break;await page.waitForTimeout(100);}while(Date.now()<cleanupDeadline);
  assert(keys.includes('unrelated-cache-for-test'),'Unrelated application caches must be preserved');
  assert(!keys.includes("realscan-cache-v3.3.0"), "Obsolete cache remains: "+keys.join(", "));
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
    // browser.close() tampoco debe poder colgar el job (visto en CI): si el
    // navegador no cierra en 15 s, se sigue y el proceso termina igualmente.
    if (browser)
      await Promise.race([
        browser.close(),
        new Promise((resolve) => setTimeout(resolve, 15000)),
      ]);
    server.close();
  });
