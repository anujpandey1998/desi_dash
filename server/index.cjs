const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomBytes,createHash}=require('node:crypto'),ts=require('typescript'),vm=require('node:vm');
const physics={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/game3d/simulation.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:physics,Math,Date,Number,Object,Array});
const {createRunner,advanceRunner,steer,jump,slide}=physics;
function weekKey(time){
 const date=new Date(time);date.setUTCHours(0,0,0,0);date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));return date.toISOString().slice(0,10);
}
function weeklyLeague(room,now){
 const week=weekKey(now),entries=room.leagues?.[week]||[];
 return {week,entries:entries.map((entry,index)=>({...entry,badge:index===0?'GOLD':index===1?'SILVER':index===2?'BRONZE':undefined}))};
}
function verify(seed,ticks,inputs){
 if(!Number.isInteger(ticks)||ticks<1||ticks>5585||!Array.isArray(inputs)||inputs.length>1800)throw Error('Invalid replay.');
 let last=-1;for(const i of inputs){if(!Number.isInteger(i.tick)||i.tick<last||i.tick>=ticks||!['left','right','jump','slide'].includes(i.action))throw Error('Invalid inputs.');last=i.tick;}
 const runner=createRunner(seed,90);let index=0;
 for(let tick=0;tick<ticks;tick++){
  if(runner.status==='gameover')throw Error('Replay continues after finish.');
  while(inputs[index]?.tick===tick){const {action}=inputs[index++];if(action==='jump')jump(runner);else if(action==='slide')slide(runner);else steer(runner,action==='left'?-1:1);}
  advanceRunner(runner,1/60);runner.events.length=0;
 }
 if(runner.status!=='gameover')throw Error('Finish the run before submitting.');
 return {score:runner.score,distance:Math.floor(runner.distance)};
}
function createServer({file=process.env.CHALLENGE_DATA||path.join(__dirname,'data.json')}={}){
 let rooms={};if(file&&fs.existsSync(file))rooms=JSON.parse(fs.readFileSync(file,'utf8'));
 const persist=()=>{if(file){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(rooms));fs.renameSync(file+'.tmp',file);}};
 const rates=new Map();
 return http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');const send=(status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));};
  try{
   const now=Date.now(),ip=req.socket.remoteAddress,rate=rates.get(ip)||{time:now,count:0};
   if(now-rate.time>60000){rate.time=now;rate.count=0;}if(++rate.count>90)return send(429,{error:'Too many requests. Try shortly.'});rates.set(ip,rate);if(rates.size>10000)rates.clear();
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>150000)return send(413,{error:'Replay too large.'});}
   const body=raw?JSON.parse(raw):{},parts=new URL(req.url,'http://localhost').pathname.split('/').filter(Boolean);
   if(req.method==='GET'&&parts[0]==='health')return send(200,{ok:true,version:1});
   if(parts[0]!=='rooms')return send(404,{error:'Not found.'});
   if(req.method==='POST'&&parts.length===1){
    if(body.version!==1)throw Error('Update the app to join.');
    for(const [code,r]of Object.entries(rooms))if(r.expires<now)delete rooms[code];
    if(Object.keys(rooms).length>=5000)throw Error('Server full.');
    let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms[code]);
    const room=rooms[code]={code,seed:randomBytes(4).readUInt32LE(),limit:90,expires:now+7*86400000,runs:{},entries:[]};persist();
    return send(201,{code,seed:room.seed,limit:room.limit,expires:room.expires});
   }
   const room=/^[A-F0-9]{6}$/.test(parts[1]||'')?rooms[parts[1]]:null;if(!room||room.expires<now)return send(404,{error:'Room not found or expired.'});
   const challenge={code:room.code,seed:room.seed,limit:room.limit,expires:room.expires};
   if(req.method==='GET'&&parts.length===2)return send(200,{challenge,entries:room.entries,league:weeklyLeague(room,now)});
   if(req.method==='POST'&&parts[2]==='runs'){
    if(body.version!==1||typeof body.name!=='string'||!body.name.trim()||body.name.length>20)throw Error('Invalid player/version.');
    for(const [key,r]of Object.entries(room.runs))if(now-r.created>3600000)delete room.runs[key];
    if(Object.keys(room.runs).length>=500)throw Error('Room is busy. Try later.');
    const token=randomBytes(24).toString('hex');room.runs[token]={name:body.name.trim(),created:now};persist();return send(201,{challenge,token,ghost:room.ghost});
   }
   if(req.method==='POST'&&parts[2]==='results'){
    const fingerprint=createHash('sha256').update(JSON.stringify({ticks:body.ticks,inputs:body.inputs})).digest('hex');
    const receipt=typeof body.token==='string'&&/^[a-f0-9]{48}$/.test(body.token)?room.receipts?.[body.token]:null;
    if(receipt){if(receipt.fingerprint!==fingerprint)throw Error('Run ticket already used.');return send(200,{ok:true,entries:room.entries,league:weeklyLeague(room,now)});}
    const run=typeof body.token==='string'&&/^[a-f0-9]{48}$/.test(body.token)?room.runs[body.token]:null;if(!run||now-run.created>3600000)throw Error('Run ticket expired. Start again.');
    const result=verify(room.seed,body.ticks,body.inputs);if(now-run.created+3000<body.ticks/60*1000)throw Error('Run submitted too quickly.');
    if (!room.entries.length || result.score > room.entries[0].score) room.ghost={seed:room.seed,ticks:body.ticks,inputs:body.inputs};
    const entry={name:run.name,...result};
    room.entries.push(entry);room.entries.sort((a,b)=>b.score-a.score||b.distance-a.distance);room.entries=room.entries.slice(0,50);
    room.leagues ||= {};
    const week=weekKey(now),league=room.leagues[week] ||= [];
    const existing=league.findIndex(item=>item.name.toLowerCase()===entry.name.toLowerCase());
    if(existing<0)league.push(entry);else if(entry.score>league[existing].score)league[existing]=entry;
    league.sort((a,b)=>b.score-a.score||b.distance-a.distance);room.leagues[week]=league.slice(0,50);
    for(const oldWeek of Object.keys(room.leagues).sort().slice(0,-2))delete room.leagues[oldWeek];
    room.receipts ||= {};room.receipts[body.token]={fingerprint,created:now};
    for(const key of Object.keys(room.receipts).slice(0,-100))delete room.receipts[key];
    delete room.runs[body.token];persist();return send(200,{ok:true,entries:room.entries,league:weeklyLeague(room,now)});
   }
   send(404,{error:'Not found.'});
  }catch(e){send(400,{error:e.message});}
 });
}
if(require.main===module)createServer().listen(Number(process.env.PORT)||8787,'0.0.0.0',()=>console.log('Challenge server listening on '+(process.env.PORT||8787)));
module.exports={createServer,verify,physics,weekKey};
