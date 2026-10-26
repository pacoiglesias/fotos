// Create an immutable annotated backup tag only after the protected CI jobs succeed.
const cp=require('child_process'),fs=require('fs');
function backupTag({version,context=process.env,git=args=>cp.execFileSync('git',args,{encoding:'utf8'}).trim()}){
 if(context.GITHUB_ACTIONS!=='true'||context.GITHUB_REF!=='refs/heads/main'||String(context.GITHUB_REPOSITORY).toLowerCase()!=='pacoiglesias/fotos')throw Error('Backup tagging is restricted to main in the RealScan GitHub workflow.');
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid application version.');
 const head=git(['rev-parse','HEAD']);if(head!==context.GITHUB_SHA||! /^[0-9a-f]{40}$/.test(head))throw Error('The checkout does not match the verified workflow commit.');
 const tag='v'+version,ref='refs/tags/'+tag;
 const resolve=()=>{const lines=git(['ls-remote','--tags','origin',ref,ref+'^{}']).split(/\r?\n/).filter(Boolean).map(line=>line.split(/\s+/));return lines.find(line=>line[1]===ref+'^{}')?.[0]||lines.find(line=>line[1]===ref)?.[0]||null;};
 const current=resolve();if(current&&current!==head)throw Error('The version tag already identifies another commit. Never overwrite a published backup tag.');
 if(!current){git(['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','tag','-a',tag,head,'-m','RealScan Pro '+version+' — verified counter workflow and printing fixes']);git(['push','origin',ref]);}
 if(resolve()!==head)throw Error('Remote backup tag verification failed.');
 return {tag,commit:head,verified:true};
}
module.exports={backupTag};
if(require.main===module){try{console.log(JSON.stringify(backupTag({version:JSON.parse(fs.readFileSync('package.json','utf8')).version})));}catch(e){console.error(e.message);process.exitCode=1;}}
