import {spawn} from 'node:child_process';
import {readdir} from 'node:fs/promises';
import path from 'node:path';
const env={...process.env,EMULATOR_TEST:'1'};
const inheritedPath=Object.entries(env).find(([key])=>key.toLowerCase()==='path')?.[1]||'';
for(const key of Object.keys(env))if(key.toLowerCase()==='path')delete env[key];
env.PATH=path.dirname(process.execPath)+path.delimiter+inheritedPath;
if(process.platform==='win32'){
 const root=path.resolve('.tools/java21');
 try{const folder=(await readdir(root,{withFileTypes:true})).find(item=>item.isDirectory());if(folder){env.JAVA_HOME=path.join(root,folder.name);env.PATH=path.join(env.JAVA_HOME,'bin')+path.delimiter+env.PATH;}}catch{}
}
const args=['emulators:exec','--project','demo-footly','--only','auth,firestore','node scripts/browser-check.mjs'];
const command=process.platform==='win32'?process.execPath:'firebase';
if(process.platform==='win32')args.unshift(path.join(env.APPDATA,'npm','node_modules','firebase-tools','lib','bin','firebase.js'));
const processHandle=spawn(command,args,{env,stdio:'inherit',windowsHide:true});
processHandle.on('error',error=>{console.error(error.message);process.exitCode=1;});
processHandle.on('exit',code=>{process.exitCode=code||0;});
