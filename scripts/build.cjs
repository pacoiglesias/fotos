const fs = require("fs"),
  path = require("path"),
  cp = require("child_process"),
  crypto = require("crypto");
const esbuild = require("esbuild"),
  root = path.resolve(__dirname, ".."),
  dist = path.join(root, "dist");
function copy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
}
(async () => {
  // This build writes a strict allowlist; unrelated files can never be published.
  if (dist !== path.join(root, "dist") || path.dirname(dist) !== root)
    throw Error("Unsafe build directory");
  if (fs.existsSync(dist) && fs.lstatSync(dist).isSymbolicLink())
    throw Error("Build directory cannot be a symlink");
  if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  for (const file of [
    "index.html",
    "phone-upload.html",
    "phone-download.html",
    "manifest.json",
  ])
    copy(path.join(root, file), path.join(dist, file));
  copy(path.join(root, "js"), path.join(dist, "js"));
  copy(path.join(root, "css/styles.css"), path.join(dist, "css/styles.css"));
  copy(path.join(root, "css/scan-assist.css"), path.join(dist, "css/scan-assist.css"));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "manifest.json")),
  );
  for (const icon of manifest.icons || []) {
    if (
      !icon.src.startsWith("data:") &&
      fs.existsSync(path.join(root, icon.src))
    )
      copy(path.join(root, icon.src), path.join(dist, icon.src));
  }
  const vendor = path.join(dist, "vendor");
  fs.mkdirSync(vendor, { recursive: true });
  copy(require.resolve("qrcode-generator"), path.join(vendor, "qrcode.js"));
  copy(
    path.join(root, "node_modules/jspdf/dist/jspdf.umd.min.js"),
    path.join(vendor, "jspdf.umd.min.js"),
  );
  copy(
    path.join(root, "node_modules/jszip/dist/jszip.min.js"),
    path.join(vendor, "jszip.min.js"),
  );
  for (const name of ["pdf.mjs", "pdf.worker.mjs"])
    copy(
      path.join(root, "node_modules/pdfjs-dist/legacy/build", name),
      path.join(vendor, name),
    );
  for (const dir of ["cmaps", "standard_fonts", "wasm"])
    copy(
      path.join(root, "node_modules/pdfjs-dist", dir),
      path.join(vendor, dir),
    );
  for (const name of [
    "@firebase/app",
    "@firebase/auth",
    "@firebase/database",
    "jspdf",
    "jszip",
    "pdfjs-dist",
    "qrcode-generator",
  ])
    for (const license of ["LICENSE", "LICENSE.txt", "LICENSE.md"]) {
      const source = path.join(root, "node_modules", name, license);
      if (fs.existsSync(source))
        copy(
          source,
          path.join(
            vendor,
            "licenses",
            name.replaceAll("/", "-") + "-" + license,
          ),
        );
    }
  await esbuild.build({
    entryPoints: [path.join(root, "src/firebase-transfer.js")],
    outfile: path.join(dist, "js/firebase-transfer.js"),
    bundle: true,
    minify: true,
    format: "iife",
    target: ["es2022"],
  });
  const cli = path.join(root, "node_modules/@tailwindcss/cli/dist/index.mjs");
  cp.execFileSync(
    process.execPath,
    [cli, "-i", "css/tailwind.css", "-o", "dist/css/tailwind.css", "--minify"],
    { cwd: root, stdio: "inherit" },
  );
  const files = [];
  function walk(dir) {
    for (const x of fs.readdirSync(dir, { withFileTypes: true })) {
      if (x.isDirectory()) walk(path.join(dir, x.name));
      else
        files.push(
          path.relative(dist, path.join(dir, x.name)).replaceAll("\\", "/"),
        );
    }
  }
  walk(dist);
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(path.join(root, "sw.js")));
  for (const file of files.sort())
    hash.update(file).update(fs.readFileSync(path.join(dist, file)));
  const version = "realscan-" + hash.digest("hex").slice(0, 16);
  const sw = fs
    .readFileSync(path.join(root, "sw.js"), "utf8")
    .replace("__BUILD_VERSION__", version)
    .replace("__CORE_ASSETS__", JSON.stringify(files.map((f) => "./" + f)));
  const sourceCommit = cp
    .execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
    .trim();
  fs.writeFileSync(path.join(dist, "sw.js"), sw);
  fs.writeFileSync(
    path.join(dist, "version.json"),
    JSON.stringify({
      version,
      sourceCommit,
      builtAt: new Date().toISOString(),
    }),
  );
  console.log(JSON.stringify({ version, files: files.length, dist }));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
