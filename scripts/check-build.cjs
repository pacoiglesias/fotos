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
