const assert = require('assert');
const {parseArgs, main, execute} = require('./firebase-runner.cjs');
(async()=>{
  const calls=[], output=[];
  const logger={log:s=>output.push(['success',s]),error:s=>output.push(['error',s])};
  const client={deploy:async options=>calls.push(['deploy',options]),login:async options=>calls.push(['login',options]),hosting:{sites:{list:async options=>calls.push(['list',options])}}};
  assert.equal(await main(['deploy','--only','hosting','--project','fotos-cobertores-pro','--non-interactive'],client,logger),0);
  assert.deepEqual(calls[0],['deploy',{nonInteractive:true,only:'hosting',project:'fotos-cobertores-pro'}]);
  assert.equal(await main(['deploy','--only','hosting','--project','cobertores-web','--config','firebase.secondary.json'],client,logger),0);
  assert.equal(calls[1][1].config,'firebase.secondary.json');
  await execute(['--interactive','login','--reauth','--no-localhost'],client);
  assert.deepEqual(calls[2],['login',{nonInteractive:false,interactive:true,reauth:true,localhost:false}]);
  await execute(['--interactive','login','--reauth'],client);
  assert.equal(calls[3][1].localhost,true);
  await execute(['hosting:sites:list','--project','fotos-cobertores-pro'],client);
  assert.equal(calls[4][0],'list');
  const before=calls.length;
  for(const args of [[],['--token','secret'],['deploy','--project','other','--only','hosting'],['deploy','--project','cobertores-web','--only','database'],['login'],['deploy','--project','cobertores-web','--only'],['hosting:sites:list','--project','cobertores-web','--project','fotos-cobertores-pro']]){
    assert.equal(await main(args,client,logger),1);
  }
  assert.equal(calls.length,before,'Invalid commands must never reach Firebase');
  const failure={deploy:async()=>{throw Error('Authentication expired');}};
  assert.equal(await main(['deploy','--only','hosting','--project','fotos-cobertores-pro'],failure,logger),1);
  assert.deepEqual(output.at(-1),['error','Firebase: Authentication expired']);
  assert.throws(()=>parseArgs(['login','--interactive','--non-interactive']),/interactive/);
  console.log('PASS Official Firebase API preserves real errors, maps both deployments and explicit login, rejects unsafe scope and returns success only on resolution');
})().catch(e=>{console.error(e);process.exitCode=1;});
