const {test}=require('node:test'),assert=require('node:assert/strict');
const {createServer,verify,physics,weekKey}=require('../server/index.cjs');
const {createRunner,advanceRunner}=physics;
function replay(seed){const r=createRunner(seed,90);while(r.status!=='gameover'){advanceRunner(r,1/60);r.events.length=0;}return r;}
test('server replays the same seed to exactly the client result',()=>{for(const seed of [1,42,891,0xffffffff]){const r=replay(seed);assert.deepEqual(verify(seed,r.tick,[]),{score:r.score,distance:Math.floor(r.distance)});}});
test('reject unfinished, excessive and malformed input replays',()=>{assert.throws(()=>verify(42,60,[]));assert.throws(()=>verify(42,90000,[]));assert.throws(()=>verify(42,200,[{tick:-1,action:'jump'}]));assert.throws(()=>verify(42,200,[{tick:1,action:'teleport'}]));const r=replay(42);assert.throws(()=>verify(42,r.tick+1,[]));});
test('same challenge seed generates identical obstacles and timed mode retains limit on reset',()=>{const a=createRunner(42,90),b=createRunner(42,90);assert.equal(JSON.stringify(a.entities),JSON.stringify(b.entities));physics.resetRunner(a,42);assert.equal(a.limit,90);assert.equal(a.tick,0);});
test('weekly league uses a Monday UTC week boundary',()=>{assert.equal(weekKey(Date.parse('2026-10-25T23:59:59Z')),'2026-10-19');assert.equal(weekKey(Date.parse('2026-10-26T00:00:00Z')),'2026-10-26');});
test('HTTP room creation, join, version checks and replay rejection',async()=>{const server=createServer({file:null});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const post=(p,b)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});try{const created=await post('/rooms',{version:1});assert.equal(created.status,201);const room=await created.json();assert.match(room.code,/^[A-F0-9]{6}$/);const joined=await post('/rooms/'+room.code+'/runs',{name:'Anuj',version:1});assert.equal(joined.status,201);const ticket=await joined.json();assert.equal(ticket.challenge.seed,room.seed);const invalid=await post('/rooms/'+room.code+'/results',{token:ticket.token,ticks:1,inputs:[],score:99999999});assert.equal(invalid.status,400);const board=await(await fetch(base+'/rooms/'+room.code)).json();assert.deepEqual(board.entries,[]);assert.equal((await post('/rooms',{version:99})).status,400);assert.equal((await fetch(base+'/rooms/ZZZZZZ')).status,404);}finally{await new Promise(r=>server.close(r));}});

test('a valid HTTP result is ranked, cannot be reused and becomes the next ghost',async()=>{
 const server=createServer({file:null});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(p,b)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
 try{const room=await(await post('/rooms',{version:1})).json(),ticket=await(await post('/rooms/'+room.code+'/runs',{name:'Player',version:1})).json(),r=replay(room.seed);
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,r.tick/60*1000-2900)));
 const body={token:ticket.token,ticks:r.tick,inputs:[],score:9999999};const result=await post('/rooms/'+room.code+'/results',body);assert.equal(result.status,200);const data=await result.json();assert.equal(data.entries[0].score,r.score);assert.equal(data.league.entries[0].badge,'GOLD');assert.equal((await post('/rooms/'+room.code+'/results',body)).status,200);assert.equal((await (await fetch(base+'/rooms/'+room.code)).json()).entries.length,1);assert.equal((await post('/rooms/'+room.code+'/results',{...body,ticks:1})).status,400);
 const next=await(await post('/rooms/'+room.code+'/runs',{name:'Friend',version:1})).json();assert.equal(next.ghost.seed,room.seed);assert.equal(next.ghost.ticks,r.tick);
 }finally{await new Promise(r=>server.close(r));}
});
test('90 second timed run ends even when every obstacle is cleared',()=>{const r=createRunner(42,90);while(r.status!=='gameover'){for(const e of r.entities)e.active=false;advanceRunner(r,1/60);r.events.length=0;}assert.ok(r.elapsed>=90&&r.elapsed<90.02);assert.ok(r.tick<=5585);});
test('daily rewards are claim-once and concurrent claims cannot duplicate coins',async()=>{
 const fs=require('fs'),vm=require('vm'),ts=require('typescript'),store=new Map();
 const storage={getItem:async k=>store.get(k)||null,setItem:async(k,v)=>{store.set(k,v);},multiSet:async pairs=>{for(const [k,v]of pairs)store.set(k,v);}};
 const load=(p,require)=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require,Math,Date,Number,Object,Array,Promise,setTimeout,clearTimeout});return exports;};
 const challenges=load('src/game3d/challenges.ts',()=>{});const service=load('src/services/socialService.ts',p=>p.includes('async-storage')?{__esModule:true,default:storage}:challenges);
 const tutorial=load('src/services/tutorialService.ts',p=>p.includes('async-storage')?{__esModule:true,default:storage}:null);
 assert.equal(await tutorial.loadTutorialComplete(),false);await tutorial.saveTutorialComplete();assert.equal(await tutorial.loadTutorialComplete(),true);
 await service.localTransaction(()=>service.saveCompletedRun(100,600,40,true));assert.equal(await storage.getItem('neon-dash.wallet-coins.v1'),'40');
 await service.localTransaction(()=>service.saveCompletedRun(100,500,0,true));
 assert.equal((await service.loadMissions()).distance,600);
 await assert.rejects(service.claimMission('distance'));
 const claimed=await Promise.allSettled([service.claimMission('coins'),service.claimMission('coins')]);assert.equal(claimed.filter(r=>r.status==='fulfilled').length,1);assert.equal(await storage.getItem('neon-dash.wallet-coins.v1'),'140');
 const progress=await service.loadMissions();assert.equal(progress.runs,2);assert.equal(progress.distance,600);assert.equal(progress.claimed.length,1);
 assert.equal(challenges.missionDay(new Date('2026-10-27T23:59:59Z')),'2026-10-27');
});

test('interstitial policy requires four more solo runs and a three-minute cooldown',()=>{
 const fs=require('fs'),vm=require('vm'),ts=require('typescript'),exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/adPolicy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Math,Date,Number,Object,Array});
 assert.equal(exports.isInterstitialDue(3,0,0,1000000),false);
 assert.equal(exports.isInterstitialDue(4,0,820001,1000000),false);
 assert.equal(exports.isInterstitialDue(4,0,820000,1000000),true);
 assert.equal(exports.isInterstitialDue(7,4,0,1000000),false);
 assert.equal(exports.isInterstitialDue(8,4,0,1000000),true);
});

test('room seed and league survive a server restart',async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rooftop-room-')),file=path.join(dir,'rooms.json');let server=createServer({file});
 const listen=async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;};
 try{let base=await listen();const room=await(await fetch(base+'/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1})})).json();await new Promise(r=>server.close(r));server=createServer({file});base=await listen();const data=await(await fetch(base+'/rooms/'+room.code)).json();assert.equal(data.challenge.code,room.code);assert.equal(data.challenge.seed,room.seed);assert.deepEqual(data.league.entries,[]);}finally{if(server.listening)await new Promise(r=>server.close(r));if(fs.existsSync(file))fs.unlinkSync(file);if(fs.existsSync(file+'.tmp'))fs.unlinkSync(file+'.tmp');fs.rmdirSync(dir);}
});
