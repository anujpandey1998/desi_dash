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
   return {laneMoved,jumped,meshJumped,spriteJumped:t.world.root.getObjectByName('Runner').userData.spriteFrame===4,status:s.status,...t.stats()};
  });
  await page.screenshot({path:'_tmp_test/3d-running.png'});
  const framing=await page.evaluate(()=>{
   const t=globalThis.runnerTest,normal=t.stats(),scene=t.world.root.parent;
   t.world.setQuality(true);t.renderer.render(scene,t.camera);
   const low=t.stats(),lowShadows=t.renderer.shadowMap.enabled;
   t.world.setQuality(false);
   for(const aspect of [320/844,390/844,800/1280])for(const x of [-2.8,2.8]){
    t.camera.aspect=aspect;t.camera.updateProjectionMatrix();t.runner.x=x;
    t.world.update(t.runner,.1,t.camera);t.camera.updateMatrixWorld(true);
    for(const edge of [-.48,.48]){
     const point=t.world.root.getObjectByName('Runner').position.clone();point.x+=edge;point.y+=1;
     if(Math.abs(point.project(t.camera).x)>=1)throw Error('Courier clipped at portrait lane edge');
    }
   }
   return {normalCalls:normal.drawCalls,lowCalls:low.drawCalls,lowShadows};
  });
  assert.ok(framing.lowCalls<framing.normalCalls);assert.equal(framing.lowShadows,false);
  assert.deepEqual(errors,[]);assert.equal(result.status,'running');assert.ok(result.laneMoved&&result.jumped&&result.meshJumped&&result.spriteJumped);assert.ok(result.drawCalls<320);assert.ok(result.triangles<70000);
  const front=await page.evaluate(()=>{const t=globalThis.runnerTest;t.reset();t.camera.aspect=390/844;t.camera.updateProjectionMatrix();for(const e of t.runner.entities)e.active=false;t.runner.nextRow=1e9;for(let i=0;i<45;i++)t.advance(1/60);t.renderer.render(t.world.root.parent,t.camera);const actor=t.world.root.getObjectByName('Runner');return{face:actor.userData.faceVisible,identity:actor.userData.appearance};});
  assert.equal(front.face,false);assert.equal(front.identity,'approved-blue-courier');
  await page.screenshot({path:'_tmp_test/3d-front-courier.png'});
  const flight=await page.evaluate(()=>{const t=globalThis.runnerTest;t.reset();t.camera.aspect=390/844;t.camera.updateProjectionMatrix();if(!t.drone())throw Error('Flight activation failed');for(let i=0;i<90;i++)t.advance(1/60);t.renderer.render(t.world.root.parent,t.camera);return {frame:t.world.root.getObjectByName('Runner').userData.spriteFrame,height:t.runner.jumpY,coins:t.runner.coins,visible:t.world.root.getObjectByName('DeliveryDrone').visible,...t.stats()};});
  assert.ok(flight.height>4 && flight.coins>0 && flight.visible);assert.equal(flight.frame,5);assert.ok(flight.drawCalls<320 && flight.triangles<70000);
  await page.screenshot({path:'_tmp_test/3d-drone-flight.png'});
  const birds=await page.evaluate(()=>{const t=globalThis.runnerTest,s=t.runner;s.status='paused';for(let i=0;i<3;i++)Object.assign(s.birds[i],{active:true,x:(i-1)*1.5,y:s.jumpY+1.6+i*.3,z:-7-i*2,vx:2,speed:6,kind:i%2});t.world.update(s,1/60,t.camera);t.renderer.render(t.world.root.parent,t.camera);return{birds:t.world.root.getObjectByName('AirBirds').count,chaser:t.world.root.getObjectByName('NeighborhoodChaser').visible,...t.stats()};});
  assert.equal(birds.birds,3);assert.equal(birds.chaser,true);assert.ok(birds.drawCalls<320&&birds.triangles<70000);
  await page.screenshot({path:'_tmp_test/3d-bird-escape.png'});
  await page.evaluate(()=>{const t=globalThis.runnerTest;t.reset();t.runner.status='gameover';t.runner.caught=true;t.runner.chaserGap=1;t.world.update(t.runner,1/60,t.camera);t.renderer.render(t.world.root.parent,t.camera);});
  await page.screenshot({path:'_tmp_test/3d-caught.png'});
  const cycling=await page.evaluate(()=>{const t=globalThis.runnerTest;t.reset();for(const e of t.runner.entities)e.active=false;t.runner.nextRow=1e9;if(!t.cycle())throw Error('Cycle did not start');for(let i=0;i<40;i++)t.advance(1/60);t.runner.status='paused';t.world.update(t.runner,1/60,t.camera);t.renderer.render(t.world.root.parent,t.camera);return{visible:t.world.root.getObjectByName('Cycle').children[0].visible,volumetric:t.world.root.getObjectByName('Runner').userData.volumetric,...t.stats()};});
  assert.equal(cycling.visible,true);assert.equal(cycling.volumetric,false);assert.ok(cycling.drawCalls<320&&cycling.triangles<70000);
  await page.screenshot({path:'_tmp_test/3d-cycle.png'});
  await page.evaluate(()=>{const t=globalThis.runnerTest,s=t.runner,r=t.world.root.getObjectByName('Runner'),c=t.world.root.getObjectByName('NeighborhoodChaser');s.grace=2;s.jumpY=0;for(let i=0;i<120;i++){s.elapsed=i/60;s.distance=i*.3;s.animationPhase=i/60;t.world.update(s,1/60,t.camera);if(!r.visible||r.userData.frontAtlasFrame!==13||r.position.y!==0)throw Error('Cycling rider flickers or bobs');if(c.scale.y!==1||c.userData.style!=='matching-courier-art'||c.position.z<.8)throw Error('Chaser model or following gap incorrect');}});

  await page.evaluate(()=>{
    const t=globalThis.runnerTest;t.reset();const s=t.runner,c=t.world.root.getObjectByName('NeighborhoodChaser');for(const e of s.entities)e.active=false;s.nextRow=1e9;
    t.world.update(s,1/60,t.camera);t.steer(1);
    for(let i=0;i<12;i++)t.advance(1/60);
    if(Math.abs(c.position.x)>.1)throw Error('Chaser changed lanes before reaction delay');
    for(let i=0;i<48;i++){t.advance(1/60);if(c.position.z<1||c.position.z>6)throw Error('Chaser left following range');}
    if(c.position.x<2.3)throw Error('Chaser did not follow lane after delay');
    t.reset();t.cycle();
  });
  await page.evaluate(()=>{
    const t=globalThis.runnerTest,s=t.runner,r=t.world.root.getObjectByName('Runner');
    for(const mode of ['cycle','drone','run']){
      s.bikeTime=mode==='cycle'?5:0;s.droneTime=mode==='drone'?5:0;s.jumpY=mode==='drone'?5.2:0;
      t.world.update(s,1/60,t.camera);
      if(!r.children[0].visible||r.userData.appearance!=='approved-blue-courier'||r.userData.character!=='boy')throw Error('Approved boy identity changed in '+mode);
      if(t.world.root.getObjectByName('RideCourier'))throw Error('Generic ride model returned');
    }
    for(const kind of [0,1]){s.chaserKind=kind;t.world.update(s,1/60,t.camera);if(t.world.root.getObjectByName('NeighborhoodChaser').userData.style!=='matching-courier-art')throw Error('Chaser artwork replaced');}
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?character=girl');await page.waitForFunction(()=>globalThis.runnerTest?.stats().drawCalls>20);
  const girl=await page.evaluate(()=>{const t=globalThis.runnerTest;t.reset();for(const e of t.runner.entities)e.active=false;for(let i=0;i<30;i++)t.advance(1/60);t.renderer.render(t.world.root.parent,t.camera);return t.world.root.getObjectByName('Runner').userData;});assert.equal(girl.character,'girl');assert.equal(girl.backOnly,true);assert.equal(girl.faceVisible,false);await page.evaluate(()=>{const t=globalThis.runnerTest,r=t.world.root.getObjectByName('Runner');for(const mode of ['cycle','drone']){t.runner.bikeTime=mode==='cycle'?5:0;t.runner.droneTime=mode==='drone'?5:0;t.world.update(t.runner,1/60,t.camera);if(!r.children[0].visible||r.userData.character!=='girl'||r.userData.appearance!=='approved-blue-courier')throw Error('Approved girl replaced in '+mode);}});await page.screenshot({path:'_tmp_test/3d-girl-courier.png'});
  const checkCycleContacts=()=>page.evaluate(()=>{
    const t=globalThis.runnerTest,s=t.runner,r=t.world.root.getObjectByName('Runner');s.status='paused';s.bikeTime=5;s.droneTime=0;s.trick=null;s.jumpY=2;
    let maxError=0;
    const sample=(mesh,point)=>{
      const g=mesh.geometry,uv=g.attributes.uv,p=g.attributes.position,idx=g.index;
      for(let j=0;j<idx.count;j+=3){const a=idx.getX(j),b=idx.getX(j+1),c=idx.getX(j+2),ax=uv.getX(a),ay=uv.getY(a),bx=uv.getX(b),by=uv.getY(b),cx=uv.getX(c),cy=uv.getY(c),d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy),wa=((by-cy)*(point[0]-cx)+(cx-bx)*(point[1]-cy))/d,wb=((cy-ay)*(point[0]-cx)+(ax-cx)*(point[1]-cy))/d,wc=1-wa-wb;
        if(Math.min(wa,wb,wc)<-1e-6)continue;
        return mesh.localToWorld(r.position.clone().set(p.getX(a)*wa+p.getX(b)*wb+p.getX(c)*wc,p.getY(a)*wa+p.getY(b)*wb+p.getY(c)*wc,p.getZ(a)*wa+p.getZ(b)*wb+p.getZ(c)*wc));
      }throw Error('Cycle artwork anchor not found');
    };
    for(const [phase,pitch,yaw] of [[0,0,0],[1.4,0,0],[3.2,0,0],[4.9,0,0],[1.4,.8,0],[3.2,0,1.1]]){
      s.bikePedalPhase=phase;s.bikePitch=pitch;s.bikeYaw=yaw;t.world.update(s,1/60,t.camera);t.world.root.updateMatrixWorld(true);
      const mesh=r.getObjectByName('ApprovedBackCourier'),a=r.userData.cycleAnchors;
      for(const [anchor,name,lift]of [[a.low,'LowPedal',.07],[a.high,'HighPedal',.07],[a.hand,'BikeGrip',0],[a.hip,'BikeSeat',0]]){
        const object=t.world.root.getObjectByName(name),target=object.localToWorld(r.position.clone().set(0,lift,0));maxError=Math.max(maxError,sample(mesh,anchor).distanceTo(target));
      }
    }
    if(maxError>.025)throw Error('Visible approved rider lost cycle contact: '+maxError);
    s.bikePitch=s.bikeYaw=0;s.jumpY=0;return maxError;
  });console.log('Visible girl cycle pedal/handlebar/seat contact error:',await checkCycleContacts());
  for(const mode of ['cycle','drone']){
    await page.evaluate(mode=>{const t=globalThis.runnerTest;t.runner.bikeTime=mode==='cycle'?5:0;t.runner.droneTime=mode==='drone'?5:0;t.runner.jumpY=mode==='drone'?5.2:0;t.runner.status='paused';for(let i=0;i<30;i++)t.world.update(t.runner,1/60,t.camera);t.renderer.render(t.world.root.parent,t.camera);},mode);
    await page.screenshot({path:'_tmp_test/3d-girl-'+mode+'.png'});
  }
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>globalThis.runnerTest?.stats().drawCalls>20);console.log('Visible boy cycle pedal/handlebar/seat contact error:',await checkCycleContacts());
  console.log('Approved artwork and cycle render passed:',JSON.stringify(cycling));
  console.log('Birds and chaser render passed:',JSON.stringify(birds));
  console.log('Drone flight render passed:',JSON.stringify(flight));
  console.log('3D WebGL render, shaders, lane movement and animated jump passed:',JSON.stringify(result));
 } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exit(1)});
