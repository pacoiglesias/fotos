const fs=require('fs'),cp=require('child_process'),assert=require('assert');
const head=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(cp.execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','Commit tracked changes before publishing');
const local=JSON.parse(fs.readFileSync('dist/version.json','utf8'));
assert.equal(local.sourceCommit,head,'Rebuild the committed source before publishing');
console.log('Verified release '+local.version+' from '+head);

require('./check-build.cjs');
