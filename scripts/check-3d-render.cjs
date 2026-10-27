const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs');
const {startPreview}=require('./preview-3d.cjs');
(async()=>{
 const server=await startPreview(0);let browser;
 try {
  const candidates=[process.env.NEON_BROWSER,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  const executablePath=candidates.find(p=>fs.existsSync(p));
  if(!executablePath)throw Error('Set NEON_BROWSER to an installed Chrome/Edge executable to run the WebGL render test.');
  browser=await chromium.launch({executablePath,headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>globalThis.runnerTest?.stats().drawCalls>20);
  await page.screenshot({path:'_tmp_test/3d-first-frame.png'});
  const result=await page.evaluate(()=>{
   const t=globalThis.runnerTest,s=t.runner;s.status='running';
   const safe=s.entities.find(e=>e.active&&e.kind==='coin').lane;
   if(safe)t.steer(safe);
   for(let i=0;i<180;i++)t.advance(1/60);
   const laneMoved=Math.abs(s.x-safe*2.8)<0.02;
   t.jump();for(let i=0;i<15;i++)t.advance(1/60);
   t.world.update(s,1/60,t.camera,false,{...s,x:-2.8,jumpY:1.5,status:'running'});
   const ghost=t.world.root.getObjectByName('GhostCourier');if(!ghost.visible||ghost.position.x!==-2.8||ghost.position.y!==1.5)throw Error('Replay ghost pose incorrect');
   const jumped=s.jumpY>1,meshJumped=t.world.root.getObjectByName('Runner').position.y>1;
   return {laneMoved,jumped,meshJumped,status:s.status,...t.stats()};
  });
  await page.screenshot({path:'_tmp_test/3d-running.png'});
  assert.deepEqual(errors,[]);assert.equal(result.status,'running');assert.ok(result.laneMoved&&result.jumped&&result.meshJumped);assert.ok(result.drawCalls<320);assert.ok(result.triangles<70000);
  console.log('3D WebGL render, shaders, lane movement and animated jump passed:',JSON.stringify(result));
 } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
