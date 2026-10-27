const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const { test }=require('node:test'),assert=require('node:assert/strict');
const exports3d={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/game3d/simulation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exports3d,Math,Date,Number,Object,Array});
const {createRunner,advanceRunner,jump,slide,steer,pause,resume,resetRunner,RUN}=exports3d;
function running(){const s=createRunner(42);s.status='running';for(const e of s.entities)e.active=false;return s;}
function tick(s,seconds,hz=60){for(let i=0;i<Math.round(seconds*hz);i++)advanceRunner(s,1/hz);}
function obstacle(s,kind,z=-0.8,lane=0){Object.assign(s.entities[0],{active:true,kind,lane,z,y:0});}
test('60 and 120 Hz produce the same distance and score',()=>{const a=running(),b=running();tick(a,1,60);tick(b,1,120);assert.ok(Math.abs(a.distance-b.distance)<1e-6);assert.equal(a.score,b.score);});
test('lane switching is bounded and moves smoothly through the middle lane',()=>{const s=running();steer(s,1);steer(s,1);assert.equal(s.lane,1);advanceRunner(s,1/60);assert.ok(s.x>0&&s.x<RUN.laneWidth);tick(s,0.5);assert.ok(Math.abs(s.x-RUN.laneWidth)<0.01);});
test('jump clears a barrier while a grounded runner crashes',()=>{const a=running(),b=running();obstacle(a,'barrier',-5);obstacle(b,'barrier',-5);jump(a);tick(a,0.5);tick(b,0.5);assert.equal(a.status,'running');assert.equal(b.status,'gameover');});
test('slide clears overhead gates; jumping or standing does not',()=>{const a=running(),b=running();obstacle(a,'arch',-3);obstacle(b,'arch',-3);slide(a);tick(a,0.3);tick(b,0.3);assert.equal(a.status,'running');assert.equal(b.status,'gameover');});
test('shield absorbs one collision and provides recovery time',()=>{const s=running();s.shield=true;obstacle(s,'tank',-1);advanceRunner(s,1/60);assert.equal(s.status,'running');assert.equal(s.shield,false);assert.ok(s.grace>0);assert.ok(s.events.includes('impact'));});
test('coins require matching lane, position and height',()=>{const s=running();obstacle(s,'coin',-0.3);s.entities[0].y=1;advanceRunner(s,1/60);assert.equal(s.coins,1);assert.equal(s.entities[0].active,false);assert.ok(s.score>=50);});
test('pause freezes physics and countdown, resume preserves the phase',()=>{const s=createRunner(11);tick(s,1);const countdown=s.countdown;pause(s);tick(s,2);assert.equal(s.countdown,countdown);resume(s);tick(s,2.2);assert.equal(s.status,'running');});
test('reset clears run rewards, shields, velocity and game-over state',()=>{const s=running();s.coins=5;s.shield=true;s.status='gameover';resetRunner(s,7);assert.equal(s.status,'ready');assert.equal(s.coins,0);assert.equal(s.shield,false);assert.equal(s.distance,0);});
test('generated rows always allow a dodge, jump or slide',()=>{for(let seed=1;seed<80;seed++){const s=createRunner(seed),rows=new Map();for(const e of s.entities){if(e.active&&!['coin','shield'].includes(e.kind)){const row=rows.get(e.z)||[];row.push(e.kind);rows.set(e.z,row);}}for(const row of rows.values())if(row.length===3)assert.ok(row.every(k=>k==='barrier')||row.every(k=>k==='arch'));}});
test('long stalls are clamped, invalid deltas ignored, fatal collision fires once',()=>{const s=running();advanceRunner(s,10);assert.ok(s.distance<2);const d=s.distance;advanceRunner(s,NaN);assert.equal(s.distance,d);obstacle(s,'tank',0);tick(s,2);assert.equal(s.events.filter(e=>e==='gameover').length,1);});
