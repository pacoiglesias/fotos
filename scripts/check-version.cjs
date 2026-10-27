const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const version = JSON.parse(read('package.json')).version;
assert.match(version, /^\d+\.\d+\.\d+$/);
const lock = JSON.parse(read('package-lock.json'));
assert.equal(lock.version, version, 'package-lock version');
assert.equal(lock.packages[''].version, version, 'package-lock root version');
assert.equal(read('js/config.js').match(/APP_VERSION\s*=\s*['"]v([^'"]+)/)?.[1], version, 'APP_VERSION');
for (const name of ['mobile-scan.html', 'phone-upload.html']) {
  assert.equal(read(name).match(/name="application-version" content="([^"]+)"/)?.[1], version, name);
}
const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
for (const match of html.matchAll(/\bv(\d+\.\d+\.\d+)\b/g)) {
  assert.equal(match[1], version, 'Displayed application version');
}
assert(read('CHANGELOG.md').includes('## ' + version + ' '), 'Version needs a changelog entry');
assert(read('audit/AVANCES.md').includes(version), 'Version needs a progress record');
console.log('PASS Version ' + version + ': package, lock, UI, metadata and change tracking agree');
