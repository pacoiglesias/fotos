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
    "phone-local.html",
    "mobile-scan.html",
    "manifest.json",
    "robots.txt",
  ])
    copy(path.join(root, file), path.join(dist, file));
  copy(path.join(root, "js"), path.join(dist, "js"));
  copy(path.join(root, "css/styles.css"), path.join(dist, "css/styles.css"));
  copy(path.join(root, "css/scan-assist.css"), path.join(dist, "css/scan-assist.css"));
  copy(path.join(root, "css/mobile-scan.css"), path.join(dist, "css/mobile-scan.css"));
  // v3.13.1: polish.css (temas, foco visible, micro-animaciones y la capa
  // de pulido) se enlaza desde index.html: debe copiarse o dist la pide
  // en 404 y los AÑADIDOS 11/12 no se aplican en producción.
  copy(path.join(root, "css/polish.css"), path.join(dist, "css/polish.css"));
  copy(path.join(root, "css/studio.css"), path.join(dist, "css/studio.css"));
  copy(path.join(root, "css/service-flow.css"), path.join(dist, "css/service-flow.css"));
  copy(path.join(root, "css/workbench.css"), path.join(dist, "css/workbench.css"));
  copy(path.join(root, "css/mobile-experience.css"), path.join(dist, "css/mobile-experience.css"));
  for (const file of ["modern-experience.css", "duplex-guide.css", "annotations.css"]) copy(path.join(root, "css", file), path.join(dist, "css", file));
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
  copy(path.join(root,'node_modules/jsqr/dist/jsQR.js'),path.join(vendor,'jsqr.js'));
  for(const file of ['tesseract.min.js','worker.min.js'])copy(path.join(root,'node_modules/tesseract.js/dist',file),path.join(vendor,'ocr',file));
  for(const file of fs.readdirSync(path.join(root,'node_modules/tesseract.js-core')).filter(f=>/^tesseract-core.*\.(js|wasm)$/.test(f)))copy(path.join(root,'node_modules/tesseract.js-core',file),path.join(vendor,'ocr/core',file));
  for(const language of ['spa','eng'])copy(path.join(root,'node_modules/@tesseract.js-data',language,'4.0.0_best_int',language+'.traineddata.gz'),path.join(vendor,'ocr/lang',language+'.traineddata.gz'));
  for(const name of ['tesseract.js','tesseract.js-core'])if(fs.existsSync(path.join(root,'node_modules',name,'LICENSE')))copy(path.join(root,'node_modules',name,'LICENSE'),path.join(vendor,'licenses',name+'-LICENSE'));

  copy(require.resolve("qrcode-generator"), path.join(vendor, "qrcode.js"));
  copy(
    path.join(root, "node_modules/jspdf/dist/jspdf.umd.min.js"),
    path.join(vendor, "jspdf.umd.min.js"),
  );
  copy(
    path.join(root, "node_modules/jszip/dist/jszip.min.js"),
    path.join(vendor, "jszip.min.js"),
  );
  // Fondo blanco con IA en el dispositivo: bundle ES de MediaPipe Tasks
  // Vision, su WASM (variantes SIMD y sin SIMD; FilesetResolver elige) y
  // el modelo selfie_segmenter float16. El modelo no viene en ningún
  // paquete npm: vive como asset fuente en assets/models/ (descargado de
  // storage.googleapis.com/mediapipe-models) y se copia aquí para que el
  // build funcione sin red más allá de npm ci. Todo queda fuera del
  // precaché inicial (ver filtro de CORE_ASSETS): se carga diferido con
  // js/segment-loader.js y el SW lo cachea bajo demanda.
  copy(
    path.join(root, "node_modules/@mediapipe/tasks-vision/vision_bundle.mjs"),
    path.join(vendor, "segment/vision_bundle.mjs"),
  );
  for (const file of fs.readdirSync(path.join(root, "node_modules/@mediapipe/tasks-vision/wasm")))
    copy(
      path.join(root, "node_modules/@mediapipe/tasks-vision/wasm", file),
      path.join(vendor, "segment/wasm", file),
    );
  copy(
    path.join(root, "assets/models/selfie_segmenter.tflite"),
    path.join(vendor, "segment/selfie_segmenter.tflite"),
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
    // Precaché ligero: NO se precargan los archivos de volumen de pdf.js
    // (cmaps y wasm, ~250 ficheros) ni el OCR (49 MB); el service worker
    // los cachea bajo demanda en el primer uso (ver sw.js, caché /vendor/).
    // SÍ se precachean el NÚCLEO de pdf.js (pdf.mjs + pdf.worker.mjs) y las
    // fuentes estándar (16 ficheros, 816 KB): la app expone pdfjsLib desde
    // el arranque, dibuja PDFs con esas fuentes e incrusta LiberationSans
    // en los PDF buscables, también sin conexión.
    // v3.13.1: tampoco se precargan las librerías de carga diferida de
    // vendor-loader.js (jsPDF 420 KB, JSZip 98 KB y el lector jsQR 257 KB;
    // −775 KB de instalación): se descargan la primera vez que una función
    // las necesita y el SW las cachea en ese primer uso, igual que el OCR.
    .replace("__CORE_ASSETS__", JSON.stringify(files.filter(f =>
      !f.startsWith("vendor/ocr/") &&
      !f.startsWith("vendor/cmaps/") &&
      !f.startsWith("vendor/wasm/") &&
      !f.startsWith("vendor/segment/") &&
      f !== "vendor/jspdf.umd.min.js" &&
      f !== "vendor/jszip.min.js" &&
      f !== "vendor/jsqr.js"
    ).map((f) => "./" + f)));
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
