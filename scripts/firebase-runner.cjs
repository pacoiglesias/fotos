// Run supported Firebase operations through its documented Node API.
// The CLI bin's exit hook writes lastError even after a successful command.
const fs = require('fs');
const path = require('path');

function resolveSdk(env = process.env) {
  const candidates = [path.resolve(__dirname, '../.audit/firebase-cli/node_modules/firebase-tools')];
  try { candidates.push(path.dirname(require.resolve('firebase-tools/package.json'))); } catch {}
  for (const entry of (env.PATH || '').split(path.delimiter).filter(Boolean)) {
    candidates.push(path.join(entry, 'node_modules/firebase-tools'));
    if (path.basename(entry).toLowerCase() === '.bin') candidates.push(path.resolve(entry, '../firebase-tools'));
    for (const name of ['firebase', 'firebase.cmd']) {
      try {
        let directory = path.dirname(fs.realpathSync(path.join(entry, name)));
        for (let n = 0; n < 4; n++, directory = path.dirname(directory)) candidates.push(directory);
      } catch {}
    }
  }
  for (const directory of [...new Set(candidates)]) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
      if (pkg.name === 'firebase-tools' && /^\d+\.\d+\.\d+/.test(pkg.version)) return {directory, version: pkg.version};
    } catch {}
  }
  throw Error('No se encontro el modulo oficial de Firebase. Ejecuta autenticar_y_desplegar.bat para prepararlo.');
}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--version') return {command: 'version', options: {}};
  let command;
  const options = {nonInteractive: true};
  for (let n = 0; n < args.length; n++) {
    const arg = args[n];
    if (['deploy', 'hosting:sites:list', 'login'].includes(arg)) {
      if (command) throw Error('Solo se permite una operacion de Firebase.');
      command = arg;
    } else if (['--project', '--config', '--only'].includes(arg)) {
      const value = args[++n];
      if (!value || value.startsWith('--')) throw Error('Falta el valor de '+arg+'.');
      const key = arg.slice(2);
      if (options[key] !== undefined) throw Error('Opcion repetida: '+arg+'.');
      options[key] = value;
    } else if (arg === '--non-interactive') options.nonInteractive = true;
    else if (arg === '--interactive') { options.interactive = true; options.nonInteractive = false; }
    else if (arg === '--reauth') options.reauth = true;
    else if (arg === '--no-localhost') options.localhost = false;
    else throw Error('Opcion de Firebase no admitida: '+arg+'.');
  }
  if (!command) throw Error('Falta la operacion de Firebase.');
  if (command === 'login') {
    if (!options.interactive || options.nonInteractive) throw Error('El acceso requiere --interactive.');
    if (options.project || options.config || options.only) throw Error('El acceso no publica ningun proyecto.');
    options.localhost ??= true;
  } else {
    if (!['fotos-cobertores-pro', 'cobertores-web'].includes(options.project)) throw Error('Proyecto de publicacion no admitido.');
    if (options.interactive || options.reauth || options.localhost !== undefined) throw Error('Las opciones de acceso solo se usan con login.');
    if (command === 'deploy' && options.only !== 'hosting') throw Error('Este publicador solo permite --only hosting.');
    if (command === 'hosting:sites:list' && (options.config || options.only)) throw Error('Opciones de comprobacion no validas.');
  }
  return {command, options};
}

async function execute(args, suppliedClient) {
  const parsed = parseArgs(args);
  if (parsed.command === 'version') return resolveSdk().version;
  const client = suppliedClient || require(resolveSdk().directory);
  if (!suppliedClient) client.logger?.useConsoleLoggers?.();
  if (parsed.command === 'deploy') return client.deploy(parsed.options);
  if (parsed.command === 'login') return client.login(parsed.options);
  return client.hosting.sites.list(parsed.options);
}

async function main(args, client, output = console) {
  try {
    const result = await execute(args, client);
    if (args.length === 1 && args[0] === '--version') output.log(result);
    else output.log('Firebase: operacion completada correctamente.');
    return 0;
  } catch (error) {
    output.error('Firebase: '+(error.message || 'La operacion no pudo completarse.'));
    return 1;
  }
}
module.exports = {parseArgs, resolveSdk, execute, main};
if (require.main === module) main(process.argv.slice(2)).then(code => {process.exitCode = code;});
