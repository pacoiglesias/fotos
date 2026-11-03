const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 const handlers={},keys=new Set(['realscan-cache-v3.3.0','realscan-0123456789abcdef','unrelated-cache-for-test']);let release,claimed=0,reply,activation,information;
 const gate=new Promise(resolve=>release=resolve);
 const context={URL,Response,Promise,caches:{keys:async()=>[...keys],delete:async key=>{await gate;return keys.delete(key);}},self:{addEventListener:(type,fn)=>handlers[type]=fn,clients:{claim:async()=>{claimed++;}}}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8').replace('__BUILD_VERSION__','realscan-0123456789abcdef').replace('__CORE_ASSETS__','[]'),context);
 handlers.activate({waitUntil:p=>activation=p});handlers.message({data:{type:'REALSCAN_CACHE_INFO'},ports:[{postMessage:value=>reply=value}],waitUntil:p=>information=p});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(reply,undefined,'The worker must not claim readiness while obsolete-cache deletion is pending');release();await Promise.all([activation,information]);
 assert.equal(reply.name,'realscan-0123456789abcdef');assert.equal(claimed,1);assert(!keys.has('realscan-cache-v3.3.0'));assert(keys.has('unrelated-cache-for-test'));assert(keys.has(reply.name));console.log('PASS Worker readiness waits for cache cleanup and preserves unrelated caches');
 keys.add('realscan-cache-v3.28.1');keys.add('realscan-fedcba9876543210');reply=undefined;handlers.message({data:{type:'REALSCAN_CACHE_INFO'},ports:[{postMessage:value=>reply=value}],waitUntil:p=>information=p});await information;assert.equal(reply.name,'realscan-0123456789abcdef');assert(!keys.has('realscan-cache-v3.28.1'),'A legacy cache that reappears after activation must be removed before reporting readiness');assert(keys.has('realscan-fedcba9876543210'),'Readiness must not remove another build that could be installing');assert(keys.has('unrelated-cache-for-test'));console.log('PASS Readiness removes late legacy caches while preserving other builds and unrelated application storage');
})().catch(error=>{console.error(error);process.exitCode=1;});
