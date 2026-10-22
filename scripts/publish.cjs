// All supported deploy entry points publish the same committed build to both sites.
const cp = require('child_process'), fs = require('fs'), assert = require('assert');
function firebase(args) {
  if (!args.every(x => /^[a-zA-Z0-9_.:=/-]+$/.test(x))) throw Error('Unsafe CLI argument');
  if (process.platform === 'win32') cp.execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'firebase.cmd ' + args.join(' ')], {stdio: 'inherit'});
  else cp.execFileSync('firebase', args, {stdio: 'inherit'});
}
(async () => {
  assert.equal(cp.execFileSync('git', ['status','--porcelain','--untracked-files=no'], {encoding:'utf8'}).trim(), '', 'Guarda los cambios en un commit antes de publicar.');
  cp.execFileSync(process.execPath, ['scripts/verify.cjs'], {stdio:'inherit'});
  cp.execFileSync(process.execPath, ['scripts/check-release.cjs'], {stdio:'inherit'});
  const expected = JSON.parse(fs.readFileSync('dist/version.json'));
  firebase(['deploy','--only','hosting','--project','fotos-cobertores-pro']);
  firebase(['deploy','--only','hosting','--project','cobertores-web','--config','firebase.secondary.json']);
  for (const host of ['fotos-cobertores-pro.web.app','fotos-cobertores-pro.firebaseapp.com','fotos-cobertores.web.app','fotos-cobertores.firebaseapp.com']) {
    let actual, lastError;
    for (let attempt=0; attempt<3; attempt++) {
      try {
        const response = await fetch('https://' + host + '/version.json', {cache:'no-store', signal:AbortSignal.timeout(15000)});
        assert(response.ok, host + ': version no disponible');
        actual = await response.json();
        assert.equal(actual.version, expected.version, host + ': contenido diferente');
        assert.equal(actual.sourceCommit, expected.sourceCommit, host + ': commit diferente');
        lastError = null;
        break;
      } catch(error) { lastError = error; if (attempt<2) await new Promise(resolve=>setTimeout(resolve,1500)); }
    }
    if (lastError) throw new Error(host + ': ' + lastError.message);
    console.log('VERIFICADO https://' + host + ' ' + actual.version + ' ' + actual.sourceCommit);
  }
})().catch(e => { console.error('Publicacion incompleta: ' + e.message + '. Comprueba los dos sitios antes de darla por terminada.'); process.exitCode=1; });
