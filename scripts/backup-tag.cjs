// The verified commit gets its own immutable tag, even when the app version stays unchanged.
const cp=require('child_process'),fs=require('fs');
function backupTag({version,context=process.env,git=args=>cp.execFileSync('git',args,{encoding:'utf8'}).trim()}){
 if(context.GITHUB_ACTIONS!=='true'||context.GITHUB_REF!=='refs/heads/main'||String(context.GITHUB_REPOSITORY).toLowerCase()!=='pacoiglesias/fotos')throw Error('Backup tagging is restricted to main in the RealScan GitHub workflow.');
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid application version.');
 const head=git(['rev-parse','HEAD']);if(head!==context.GITHUB_SHA||! /^[0-9a-f]{40}$/.test(head))throw Error('The checkout does not match the verified workflow commit.');
 const resolve=ref=>{const lines=git(['ls-remote','origin',ref,ref+'^{}']).split(/\r?\n/).filter(Boolean).map(line=>line.split(/\s+/));return lines.find(line=>line[1]===ref+'^{}')?.[0]||lines.find(line=>line[1]===ref)?.[0]||null;};
 if(resolve('refs/heads/main')!==head)throw Error('Main has changed. The newer commit must pass verification first.');
 const tag='v'+version+'+git.'+head.slice(0,12),ref='refs/tags/'+tag;
 const current=resolve(ref);if(current&&current!==head)throw Error('The version tag already identifies another commit. Never overwrite a published backup tag.');
 if(!current){git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','tag','-a',tag,head,'-m','RealScan Pro '+version+' — verified commit '+head]);git(['push','origin',ref]);}
 if(resolve(ref)!==head)throw Error('Remote backup tag verification failed.');
 const release='refs/heads/release/'+version;
 if(resolve('refs/heads/main')!==head)throw Error('Main changed before release promotion.');
 if(resolve(release)!==head)git(['push','origin',head+':'+release]); // Fast-forward only; never force.
 if(resolve(release)!==head)throw Error('Release branch verification failed.');
 return {tag,commit:head,release,verified:true};
}
module.exports={backupTag};
if(require.main===module){try{console.log(JSON.stringify(backupTag({version:JSON.parse(fs.readFileSync('package.json','utf8')).version})));}catch(e){console.error(e.message);process.exitCode=1;}}
