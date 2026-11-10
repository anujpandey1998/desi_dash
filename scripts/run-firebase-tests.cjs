const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),env={...process.env,DEBUG:''};
const jdk=path.join(env.ProgramFiles||'C:/Program Files','Android','Android Studio','jbr');
if(process.platform==='win32'&&fs.existsSync(path.join(jdk,'bin','java.exe'))){env.JAVA_HOME=jdk;env.PATH=path.join(jdk,'bin')+path.delimiter+(env.PATH||'');}
const cli=path.join(path.dirname(require.resolve('firebase-tools/package.json')),'lib','bin','firebase.js');
const result=spawnSync(process.execPath,[cli,'emulators:exec','--only','firestore','--project','demo-rooftop-rush','node --test scripts/firebase*.test.cjs'],{cwd:root,env,stdio:'inherit'});
if(result.error)console.error(result.error.message);process.exit(result.status??1);
