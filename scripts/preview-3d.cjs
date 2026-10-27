const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),esbuild=require('esbuild');
async function startPreview(port=8082){
 const root=path.resolve(__dirname,'..'),out=path.join(root,'_tmp_test/preview3d');fs.mkdirSync(out,{recursive:true});
 esbuild.buildSync({entryPoints:[path.join(root,'tools/preview3d.ts')],bundle:true,outfile:path.join(out,'scene.js'),format:'iife',platform:'browser',logLevel:'warning'});
 const html='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Neon Dash 3D render check</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#9bc3cc}canvas{display:block}</style><body><script src="/scene.js"></script></body>';
 const server=http.createServer((req,res)=>{if(req.url==='/scene.js'){res.setHeader('Content-Type','application/javascript');fs.createReadStream(path.join(out,'scene.js')).pipe(res);}else{res.setHeader('Content-Type','text/html');res.end(html);}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;
}
module.exports={startPreview};
if(require.main===module)startPreview().then(server=>{console.log('3D preview: http://127.0.0.1:'+server.address().port);process.on('SIGINT',()=>server.close(()=>process.exit(0)));}).catch(e=>{console.error(e);process.exit(1)});
