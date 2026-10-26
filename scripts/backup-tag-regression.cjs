const assert=require('assert'),{backupTag}=require('./backup-tag.cjs');const sha='a'.repeat(40),other='b'.repeat(40),context={GITHUB_ACTIONS:'true',GITHUB_REF:'refs/heads/main',GITHUB_REPOSITORY:'pacoiglesias/fotos',GITHUB_SHA:sha};
function fixture(existing=null,confirm=true){let remote=existing;const calls=[];const git=args=>{calls.push(args);if(args[0]==='rev-parse')return sha;if(args[0]==='ls-remote')return remote?remote+'\trefs/tags/v3.27.0^{}':'';if(args[0]==='push'&&confirm)remote=sha;return '';};return {git,calls};}
let f=fixture();assert.deepEqual(backupTag({version:'3.27.0',context,git:f.git}),{tag:'v3.27.0',commit:sha,verified:true});assert(f.calls.some(a=>a[0]==='push'));assert(f.calls.some(a=>a.includes('-a')));
f=fixture(sha);backupTag({version:'3.27.0',context,git:f.git});assert(!f.calls.some(a=>a[0]==='push'));
f=fixture(other);assert.throws(()=>backupTag({version:'3.27.0',context,git:f.git}),/another commit/);assert(!f.calls.some(a=>a[0]==='push'));
f=fixture(null,false);assert.throws(()=>backupTag({version:'3.27.0',context,git:f.git}),/verification failed/);
for(const patch of [{GITHUB_ACTIONS:'false'},{GITHUB_REF:'refs/heads/topic'},{GITHUB_REPOSITORY:'other/repo'},{GITHUB_SHA:other}])assert.throws(()=>backupTag({version:'3.27.0',context:{...context,...patch},git:fixture().git}));
assert.throws(()=>backupTag({version:'invalid',context,git:fixture().git}));console.log('PASS Backup tag is annotated, immutable, restricted to the verified main commit and independently checked on origin');
