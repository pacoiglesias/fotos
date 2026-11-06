const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const metadata = JSON.parse(read('dist/version.json'));
assert.equal(metadata.appVersion, JSON.parse(read('package.json')).version);
assert.equal(metadata.sourceCommit, cp.execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim());
assert.match(metadata.version, /^realscan-[a-f0-9]{16}$/);
function files(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
for (const file of files(dist)) {
  const relative = path.relative(dist, file).replaceAll(path.sep, '/');
  assert(!/(^|\/)(audit|\.audit|scripts|node_modules|\.git)(\/|$)|\.(md|log|bat|ps1)$/.test(relative), 'Unexpected published file: ' + relative);
}
// The URL hash must identify the exact bytes shipped, including through an old worker.
for (const file of files(dist).filter(f => f.endsWith('.html') || f.endsWith('.css'))) {
  const source = fs.readFileSync(file,'utf8');
  for (const match of source.matchAll(/["']([^"']+\.(?:js|mjs|css))\?v=([a-f0-9]{16})["']/g)) {
    const target = path.resolve(path.dirname(file),match[1]);
    assert(target.startsWith(dist + path.sep) && fs.existsSync(target),'Missing fingerprinted asset: ' + match[1]);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').slice(0,16),match[2],'Stale asset URL: ' + match[1]);
  }
}
// B4: index.html carga los scripts propios en un solo bundle; las páginas
// del teléfono siguen usando los ficheros individuales.
{
  const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const bundleTags = [...index.matchAll(/<script\b[^>]*\bsrc="js\/bundle\.js(\?v=[a-f0-9]{16})?"[^>]*>/g)];
  assert.equal(bundleTags.length, 1, 'index.html debe tener exactamente un tag js/bundle.js');
  assert(bundleTags[0][0].includes('data-bundle-files="'), 'el tag del bundle debe listar data-bundle-files');
  const ownTags = [...index.matchAll(/<script\b[^>]*\bsrc="js\/(?!bundle\.js)[^"]+\.js(\?v=[a-f0-9]{16})?"[^>]*>/g)];
  assert.equal(ownTags.length, 0, 'index.html no debe tener tags js/*.js fuera del bundle: ' + ownTags.map(m => m[0]).join(', '));
  assert(fs.existsSync(path.join(dist, 'js', 'bundle.js')), 'falta dist/js/bundle.js');
  // B6 revisado: el SW precachea pdf.mjs en su forma versionada (la que
  // piden los cargadores B5); el worker y las fuentes estándar no.
  const swSource = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
  assert(/"\.\/vendor\/pdf\.mjs\?v=[a-f0-9]{16}"/.test(swSource), 'sw.js debe precachear vendor/pdf.mjs versionado');
  assert(!swSource.includes('vendor/pdf.worker.mjs'), 'sw.js no debe precachear pdf.worker.mjs');
  assert(!swSource.includes('vendor/standard_fonts/'), 'sw.js no debe precachear standard_fonts');
  // B6 revisado: la fuente del PDF buscable llega por «Preparar sin
  // conexión», no por el precaché: debe estar en el grupo PDF de offline-setup.
  const offlineSetup = fs.readFileSync(path.join(root, 'js', 'offline-setup.js'), 'utf8');
  assert(offlineSetup.includes("const PDF=['vendor/standard_fonts/LiberationSans-Regular.ttf']"), 'offline-setup debe preparar la fuente del PDF buscable');
  // B5: las URLs dinámicas de /vendor/ en los cargadores y en offline-setup
  // llevan ?v=<hash de contenido>. Solo las de esta lista se versionan; los
  // ficheros que las librerías cargan desde una ruta base (core/lang de OCR,
  // wasm de segment, cmaps, standard_fonts) quedan sin versionar por diseño.
  const versionedVendorUrls = {
    'js/vendor-loader.js': ['vendor/jspdf.umd.min.js', 'vendor/jszip.min.js', 'vendor/jsqr.js'],
    'js/segment-loader.js': ['vendor/segment/vision_bundle.mjs', 'vendor/segment/selfie_segmenter.tflite'],
    'js/pdf-loader.mjs': ['../vendor/pdf.mjs', '../vendor/pdf.worker.mjs'],
    'js/document-tools.js': ['../vendor/pdf.mjs', 'vendor/pdf.worker.mjs'],
    'js/pdf-delivery.js': ['../vendor/pdf.mjs', 'vendor/pdf.worker.mjs'],
    'js/local-ocr.js': ['vendor/ocr/tesseract.min.js', 'vendor/ocr/worker.min.js'],
    'js/searchable-pdf.js': ['vendor/ocr/tesseract.min.js', 'vendor/ocr/worker.min.js'],
    'js/doc-identify.js': ['vendor/ocr/tesseract.min.js', 'vendor/ocr/worker.min.js'],
    'js/offline-setup.js': ['vendor/ocr/tesseract.min.js', 'vendor/ocr/worker.min.js', 'vendor/jspdf.umd.min.js', 'vendor/jszip.min.js', 'vendor/jsqr.js', 'vendor/segment/vision_bundle.mjs', 'vendor/segment/selfie_segmenter.tflite'],
  };
  for (const [file, urls] of Object.entries(versionedVendorUrls)) {
    const source = fs.readFileSync(path.join(dist, file), 'utf8');
    for (const url of urls) {
      assert(!source.includes("'" + url + "'") && !source.includes('"' + url + '"'), file + ' tiene URL vendor sin versionar: ' + url);
      assert(source.includes(url + '?v='), file + ' no versiona la URL vendor: ' + url);
    }
  }
}
// CSS imports must be shipped too; a successful build can otherwise hide a 404.
for (const file of files(dist).filter(f => f.endsWith('.css'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/gi)) {
    if (/^(?:https?:|data:|\/\/)/i.test(match[1])) continue;
    const target = path.resolve(path.dirname(file), match[1].split(/[?#]/)[0]);
    assert(target.startsWith(dist + path.sep) && fs.existsSync(target), 'Missing published CSS import: ' + match[1]);
  }
}
for (const config of ['firebase.json', 'firebase.secondary.json']) {
  const hosting = [JSON.parse(read(config)).hosting].flat();
  for (const site of hosting) {
    const policies = site.headers.flatMap(rule => rule.headers).filter(h => h.key.toLowerCase() === 'content-security-policy');
    assert(policies.length, config + ' needs a CSP');
    for (const file of files(dist).filter(f => f.endsWith('.html'))) {
      const html = fs.readFileSync(file, 'utf8');
      for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
        const hash = crypto.createHash('sha256').update(match[1].replace(/\r\n?/g, '\n')).digest('base64');
        for (const policy of policies) assert(policy.value.includes("'sha256-" + hash + "'"), config + ': missing CSP hash in ' + path.basename(file));
      }
    }
  }
}
console.log('PASS Release metadata, source commit, CSP hashes and published file allowlist');
