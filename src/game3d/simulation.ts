export type RunStatus = 'ready' | 'running' | 'paused' | 'gameover';
export type EntityKind = 'tank' | 'barrier' | 'arch' | 'coin' | 'shield';
export type RunEvent = 'coin' | 'jump' | 'slide' | 'shield' | 'impact' | 'gameover' | 'milestone' | 'drone' | 'landing' | 'footstep' | 'chaserNear' | 'caught' | 'escape' | 'bird' | 'birdHit' | 'droneCrash' | 'droneApproach' | 'cycle' | 'ramp' | 'stunt' | 'perfect' | 'fall';
export const DRONE = { duration: 10, height: 5.2, minHeight: 3.8, maxHeight: 7.2, speedMultiplier: 1.45, coinSpacing: 4, cooldown: 24 } as const;
export type Bird = { active: boolean; x: number; y: number; z: number; vx: number; speed: number; kind: number };
export type Stunt = 'backflip' | 'frontflip' | 'noHands' | 'spin360';
export const CYCLE = {duration:12,launchSpeed:14.5,gravity:22,firstAt:180,interval:600} as const;
export type Ramp = {active:boolean;z:number;lane:number};
export type Entity = { active: boolean; kind: EntityKind; lane: number; z: number; y: number; variant: number };
export const RUN = { laneWidth: 2.8, step: 1 / 60, gravity: 25, jumpSpeed: 9.5, baseSpeed: 13, maxSpeed: 24, rowGap: 27, drawDistance: 175 } as const;
export type Runner = {
  status: RunStatus; resumeStatus: 'ready' | 'running'; countdown: number; lane: number; x: number;
  jumpY: number; jumpVelocity: number; slideTime: number; distance: number; speed: number;
  coins: number; score: number; shield: boolean; grace: number; elapsed: number; accumulator: number;
  droneTime: number; droneCooldown: number; droneDistance: number; droneNextCoin: number; droneStartY: number;
  droneAltitude: number; droneLandingY: number; droneHealth: number; droneHitGrace: number; droneCrashed: boolean; droneApproach: number; freeDroneCooldown: number;
  chaserKind: number; chaserGap: number; chaserNear: boolean; chaserEscaped: number; caught: boolean; stumbleTime: number; boostTime: number; landingTime: number; jumpAnticipation: number; footPhase: number; animationPhase: number;
  birdSeed: number; nextBird: number; birds: Bird[];
  bikePedalPhase:number;bikeTime:number;bikeAirborne:boolean;nextCycle:number;nextRamp:number;ramps:Ramp[];bikePitch:number;bikeYaw:number;trick:Stunt|null;trickTime:number;trickStartPitch:number;trickStartYaw:number;combo:number;trickPoints:number;bonusScore:number;lastLanding:'perfect'|'fall'|'';
  training: boolean; tick: number; limit: number; nextRow: number; rowNumber: number; seed: number; milestone: number; entities: Entity[]; events: RunEvent[];
};
function random(s: Runner) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function add(s: Runner, kind: EntityKind, lane: number, z: number, y = 0) {
  const e = s.entities.find(e => !e.active);
  if (e) Object.assign(e, { active: true, kind, lane, z, y, variant: Math.floor(random(s) * 4) });
}
function row(s: Runner, z: number) {
  const safeLane = Math.floor(random(s) * 3) - 1;
  const pattern = s.rowNumber < 2 ? 0.5 : random(s);
  // Entire rows are only jumpable barriers or slideable arches, never three tanks.
  for (let lane = -1; lane <= 1; lane++) {
    if (pattern < 0.16) add(s, 'barrier', lane, z);
    else if (pattern < 0.30) add(s, 'arch', lane, z);
    else if (lane !== safeLane) add(s, random(s) < 0.62 ? 'tank' : 'barrier', lane, z);
  }
  for (let i = 0; i < 7; i++) {
    const y = pattern < 0.16 ? 1.05 + Math.sin(i / 6 * Math.PI) * 1.6 : 1.05;
    add(s, 'coin', safeLane, z + 6 - i * 1.7, y);
  }
  if (s.rowNumber % 7 === 5) add(s, 'shield', safeLane, z + 10, 1.2);
  s.rowNumber++;
}
export function createRunner(seed = Date.now(), limit = 0): Runner {
  const s: Runner = {
    status: 'ready', resumeStatus: 'ready', countdown: 3, lane: 0, x: 0, jumpY: 0, jumpVelocity: 0,
    slideTime: 0, distance: 0, speed: RUN.baseSpeed, coins: 0, score: 0, shield: false, grace: 0,
    elapsed: 0, accumulator: 0, training: false, tick: 0, limit, nextRow: RUN.rowGap, rowNumber: 0, seed: seed >>> 0,
    droneTime: 0, droneCooldown: 0, droneDistance: 0, droneNextCoin: DRONE.coinSpacing, droneStartY: 0,
    droneAltitude: DRONE.height, droneLandingY: 0, droneHealth: 3, droneHitGrace: 0, droneCrashed: false, droneApproach: 0, freeDroneCooldown: 0,
    chaserKind: (seed >>> 4) % 2, chaserGap: 5, chaserNear: false, chaserEscaped: 0, caught: false, stumbleTime: 0, boostTime: 0, landingTime: 0, jumpAnticipation: 0, footPhase: 0, animationPhase: 0,
    birdSeed: (seed ^ 0x76498) >>> 0, nextBird: 1.8, birds: Array.from({length:18},()=>({active:false,x:0,y:0,z:0,vx:0,speed:0,kind:0})),
    bikePedalPhase:0,bikeTime:0,bikeAirborne:false,nextCycle:CYCLE.firstAt,nextRamp:0,ramps:Array.from({length:6},()=>({active:false,z:0,lane:0})),bikePitch:0,bikeYaw:0,trick:null,trickTime:0,trickStartPitch:0,trickStartYaw:0,combo:0,trickPoints:0,bonusScore:0,lastLanding:'',
    milestone: 500, entities: Array.from({ length: 100 }, () => ({ active: false, kind: 'coin', lane: 0, z: 0, y: 0, variant: 0 })), events: [],
  };
  for (let i = 0; i < 6; i++) row(s, -55 - i * RUN.rowGap);
  return s;
}
export function resetRunner(s: Runner, seed = Date.now()) { Object.assign(s, createRunner(seed, s.limit)); }
export function steer(s: Runner, direction: -1 | 1) {
  if (s.status === 'running') s.lane = Math.max(-1, Math.min(1, s.lane + direction));
}
export function jump(s: Runner) {
  if(s.bikeTime>0&&s.jumpY>.4){performStunt(s,'backflip');return;}
  if (s.status === 'running' && s.droneTime > 1.1) { s.droneAltitude = Math.min(DRONE.maxHeight, s.droneAltitude + 1.1); return; }
  if (s.status !== 'running' || s.jumpY > 0.02 || s.droneTime > 0) return;
  s.slideTime = 0; s.jumpVelocity = RUN.jumpSpeed; s.jumpAnticipation = .09; s.events.push('jump');
  if(s.bikeTime>0){s.bikeAirborne=true;s.combo=s.trickPoints=0;s.bikePitch=s.bikeYaw=0;}
}
export function slide(s: Runner) {
  if(s.bikeTime>0&&s.jumpY>.4){performStunt(s,'frontflip');return;}
  if (s.status === 'running' && s.droneTime > 1.1) { s.droneAltitude = Math.max(DRONE.minHeight, s.droneAltitude - 1.1); return; }
  if (s.status !== 'running' || s.droneTime > 0) return;
  s.slideTime = 0.9;
  if (s.jumpY > 0.02) s.jumpVelocity = -13;
  s.events.push('slide');
}
export function pause(s: Runner) {
  if (s.status !== 'running' && s.status !== 'ready') return;
  s.resumeStatus = s.status; s.status = 'paused'; s.accumulator = 0;
}
export function resume(s: Runner) { if (s.status === 'paused') s.status = s.resumeStatus; }
export function droneCoinLane(index: number) { return [0, -1, 1, 0][Math.floor((index - 1) / 6) % 4]; }
export function airCoinPosition(index: number) { return { x: droneCoinLane(index) * RUN.laneWidth + Math.sin(index * .5) * .35, y: DRONE.height + 1 + Math.sin(index * .32) * .9 }; }
function birdRandom(s: Runner) { s.birdSeed = (Math.imul(s.birdSeed,1664525)+1013904223)>>>0; return s.birdSeed/4294967296; }
function offerDrone(s: Runner) { if (canStartDrone(s) && s.freeDroneCooldown <= 0 && s.droneApproach <= 0) { s.droneApproach = 1.2; s.freeDroneCooldown = 35; s.events.push('droneApproach'); } }
export function canStartDrone(s: Runner) {
  return !s.training && s.limit === 0 && s.bikeTime<=0 && s.droneTime <= 0 && s.droneCooldown <= 0 && (s.status === 'running' || (s.status === 'paused' && s.resumeStatus === 'running'));
}
export function startCycle(s:Runner){
  if(s.status!=='running'||s.limit>0||s.training||s.droneTime>0||s.droneApproach>0||s.bikeTime>0||s.jumpY>.02||s.slideTime>0||s.stumbleTime>0)return false;
  s.bikeTime=CYCLE.duration;s.nextCycle=s.distance+CYCLE.interval;s.nextRamp=s.distance+45;s.bikePitch=s.bikeYaw=0;s.trick=null;s.combo=s.trickPoints=0;s.lastLanding='';s.ramps[0]={active:true,z:-28,lane:s.lane};s.events.push('cycle');return true;
}
export function performStunt(s:Runner,trick:Stunt){
  if(s.status!=='running'||s.bikeTime<=0||!s.bikeAirborne||s.jumpY<=.4||s.trick)return false;
  s.trick=trick;s.trickTime=0;s.trickStartPitch=s.bikePitch;s.trickStartYaw=s.bikeYaw;s.events.push('stunt');return true;
}
export function startDrone(s: Runner) {
  if (!canStartDrone(s)) return false;
  s.droneTime = DRONE.duration; s.droneCooldown = DRONE.cooldown;
  s.droneStartY = s.jumpY;
  s.droneAltitude = DRONE.height; s.droneLandingY = 0; s.droneHealth = 3; s.droneHitGrace = 0; s.droneCrashed = false; s.droneApproach = 0; s.nextBird = 1.8;
  s.boostTime = 0; s.chaserEscaped = 2.5; s.chaserGap = 6; s.events.push('escape');
  for (const bird of s.birds) bird.active = false;
  s.droneDistance = 0; s.droneNextCoin = DRONE.coinSpacing;
  s.slideTime = 0; s.jumpVelocity = 0; s.events.push('drone'); return true;
}
export function snapshot(s: Runner) {
  return { status: s.status, countdown: Math.ceil(s.countdown), coins: s.coins, score: s.score,
    distance: Math.floor(s.distance), speed: Math.round(s.speed * 3.6), shield: s.shield, milestone: s.milestone, droneTime: s.droneTime, droneCooldown: Math.ceil(s.droneCooldown), droneHealth:s.droneHealth, droneAltitude:s.droneAltitude, chaserNear:s.chaserNear, chaserKind:s.chaserKind, chaserGap:s.chaserGap, caught:s.caught, boostTime:s.boostTime, droneApproach:s.droneApproach,bikeTime:s.bikeTime,combo:s.combo,trick:s.trick,lastLanding:s.lastLanding,bonusScore:s.bonusScore };
}
export type RunSnapshot = ReturnType<typeof snapshot>;
function step(s: Runner) {
  const dt = RUN.step;
  s.tick++;
  if (s.status === 'ready') {
    s.countdown = Math.max(0, s.countdown - dt);
    if (s.countdown <= 0) s.status = 'running';
    return;
  }
  if (s.status !== 'running') return;
  if (s.training) {
    s.elapsed += dt;
    s.x += (s.lane * RUN.laneWidth - s.x) * Math.min(1, dt * 17);
    s.jumpVelocity -= RUN.gravity * dt;
    s.jumpY = Math.max(0, s.jumpY + s.jumpVelocity * dt);
    if (s.jumpY === 0) s.jumpVelocity = 0;
    s.slideTime = Math.max(0, s.slideTime - dt);
    return;
  }
  s.elapsed += dt;
  if(s.limit===0&&s.distance>=s.nextCycle&&s.distance<s.milestone-5&&startCycle(s))s.nextCycle=s.distance+CYCLE.interval;
  const flying = s.droneTime > 0;
  const wasAirborne = s.jumpY > .02;
  s.stumbleTime = Math.max(0,s.stumbleTime-dt); s.jumpAnticipation = Math.max(0,s.jumpAnticipation-dt); s.landingTime = Math.max(0,s.landingTime-dt);
  s.boostTime = Math.max(0,s.boostTime-dt); s.droneHitGrace = Math.max(0,s.droneHitGrace-dt); s.freeDroneCooldown = Math.max(0,s.freeDroneCooldown-dt); s.chaserEscaped = Math.max(0,s.chaserEscaped-dt);
  s.droneCooldown = Math.max(0, s.droneCooldown - dt);
  s.speed = Math.min(RUN.maxSpeed, RUN.baseSpeed + s.distance / 180) * (flying ? DRONE.speedMultiplier : s.boostTime>0?1.22:s.stumbleTime>0?.62:1);
  s.animationPhase += dt * (s.speed / RUN.baseSpeed) * 1.65;
  if(s.bikeTime>0&&!s.bikeAirborne)s.bikePedalPhase+=s.speed*dt/(.41*4.5);
  s.distance += s.speed * dt;
  s.x += (s.lane * RUN.laneWidth - s.x) * Math.min(1, dt * 17);
  if(s.bikeTime>0){
    s.bikeTime=Math.max(s.jumpY>.02?.001:0,s.bikeTime-dt);
    if(s.trick){s.trickTime=Math.min(.52,s.trickTime+dt);const v=s.trickTime/.52,e=v*v*(3-2*v);
      s.bikePitch=s.trickStartPitch+(s.trick==='backflip'?1:s.trick==='frontflip'?-1:0)*Math.PI*2*e;
      s.bikeYaw=s.trickStartYaw+(s.trick==='spin360'?Math.PI*2:0)*e;
      if(v>=1){s.combo=Math.min(4,s.combo+1);s.trickPoints+=100*s.combo;s.trick=null;}
    }
    if(s.distance>=s.nextRamp){const r=s.ramps.find(r=>!r.active);if(r)Object.assign(r,{active:true,z:-36,lane:s.lane});s.nextRamp=s.distance+48;}
  }
  for(const ramp of s.ramps){if(!ramp.active)continue;ramp.z+=s.speed*dt;
    if(ramp.z>6||s.bikeTime<=0){ramp.active=false;continue;}
    if(s.bikeTime>0&&!s.bikeAirborne&&ramp.z>=-2&&ramp.z<2&&Math.abs(s.x-ramp.lane*RUN.laneWidth)<1){s.jumpY=(ramp.z+2)/4*.9;s.jumpVelocity=0;
      if(ramp.z>=1.65){s.jumpY=.9;s.jumpVelocity=CYCLE.launchSpeed;s.bikeAirborne=true;s.bikePitch=s.bikeYaw=0;s.combo=s.trickPoints=0;s.lastLanding='';ramp.active=false;s.events.push('ramp');}
    }
  }
  if (flying) {
    s.droneTime = Math.max(0, s.droneTime - dt);
    const elapsed = DRONE.duration - s.droneTime;
    const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
    if (elapsed<.9) s.jumpY=s.droneStartY+(s.droneAltitude-s.droneStartY)*smooth(Math.max(0,elapsed-.18)/.72);
    else if (s.droneTime > 1.1) s.jumpY += (s.droneAltitude-s.jumpY) * Math.min(1,dt*5);
    else { if (!s.droneLandingY) s.droneLandingY = s.jumpY; s.jumpY = s.droneLandingY * smooth(s.droneTime/1.1); }
    s.jumpVelocity = 0; s.droneDistance += s.speed * dt;
    while (s.droneDistance >= s.droneNextCoin) { const p = airCoinPosition(Math.round(s.droneNextCoin / DRONE.coinSpacing)); if (Math.abs(s.x - p.x) < .95 && Math.abs(s.jumpY + 1 - p.y) < 1) { s.coins++; s.events.push('coin'); } s.droneNextCoin += DRONE.coinSpacing; }
    s.nextBird -= dt;
    if (s.nextBird <= 0 && s.droneTime > 2) {
      const side = birdRandom(s)<.5?-1:1, group = birdRandom(s)<.4?3:1, y = 4.7 + Math.floor(birdRandom(s)*3)*1.15;
      for (let i=0;i<group;i++) { const b=s.birds.find(b=>!b.active); if (b) Object.assign(b,{active:true,x:side*(5+i*.65),y:y+i*.25,z:-38-i*2,vx:-side*(2+birdRandom(s)*2),speed:5+birdRandom(s)*4,kind:birdRandom(s)<.5?0:1}); }
      s.nextBird = 1.4 + birdRandom(s)*.5; s.events.push('bird');
    }
    for (const b of s.birds) {
      if (!b.active) continue; b.z += (s.speed+b.speed)*dt; b.x += b.vx*dt;
      if (b.z>10 || Math.abs(b.x)>13) { b.active=false; continue; }
      if (s.droneTime>1.1 && !s.droneHitGrace && Math.abs(b.z)<1.2 && Math.abs(b.x-s.x)<.8 && Math.abs(b.y-(s.jumpY+1.4))<.8) {
        b.active=false; s.droneHealth--; s.droneHitGrace=.8; s.events.push('birdHit');
        if (s.droneHealth<=0) { s.droneCrashed=true; s.droneTime=Math.min(s.droneTime,1.1); s.droneLandingY=s.jumpY; s.chaserGap=9; s.events.push('droneCrash'); }
      }
    }
    if (s.droneTime === 0) { s.jumpY = 0; s.grace = Math.max(s.grace, 1.5); s.boostTime = s.droneCrashed?0:3; for(const b of s.birds)b.active=false; s.events.push('landing'); }
  } else {
    s.jumpVelocity -= (s.bikeTime>0?CYCLE.gravity:RUN.gravity) * dt;
    s.jumpY = Math.max(0, s.jumpY + s.jumpVelocity * dt);
  }
  if (s.jumpY === 0) s.jumpVelocity = 0;
  if (wasAirborne && s.jumpY===0) { s.landingTime=.3; if (!flying) s.events.push('landing');
    if(s.bikeTime>0&&s.bikeAirborne){s.bikeAirborne=false;const upright=(a:number)=>Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<.35;
      if(upright(s.bikePitch)&&upright(s.bikeYaw)&&!s.trick){s.bonusScore+=100+s.trickPoints;s.lastLanding='perfect';s.events.push('perfect');s.grace=Math.max(s.grace,.5);}
      else{s.lastLanding='fall';s.bikeTime=0;s.stumbleTime=1;s.grace=1.5;s.chaserGap-=3;s.events.push('fall','impact');}
      s.trick=null;s.trickPoints=0;s.bikePitch=s.bikeYaw=0;
    }
  }
  if (!flying && s.bikeTime<=0 && s.jumpY===0 && !s.slideTime && !s.stumbleTime) { const phase=Math.floor(s.animationPhase*2); if(phase!==s.footPhase){s.footPhase=phase;s.events.push('footstep');} }
  s.slideTime = Math.max(0, s.slideTime - dt); s.grace = Math.max(0, s.grace - dt);
  for (const e of s.entities) {
    if (!e.active) continue;
    e.z += s.speed * dt;
    if (e.z > 16) { e.active = false; continue; }
    const across = Math.abs(e.lane * RUN.laneWidth - s.x);
    if (e.kind === 'coin' || e.kind === 'shield') {
      if (across < 0.85 && Math.abs(e.z) < 0.85 && Math.abs(e.y - (s.jumpY + 0.95)) < 0.95) {
        e.active = false;
        if (e.kind === 'coin') { s.coins++; s.events.push('coin'); }
        else { s.shield = true; s.events.push('shield'); }
      }
      continue;
    }
    const halfLength = s.limit>0?(e.kind==='tank'?4.8:.65):e.kind==='tank'?[1.1,.55,1.1,.85][e.variant%4]:e.kind==='arch'?.3:[.4,.8,.8][e.variant%3];
    if (flying || (s.bikeTime>0&&s.jumpY>3.1) || across > 1.02 || Math.abs(e.z) > halfLength + 0.28 || s.grace > 0) continue;
    const hit = e.kind === 'tank' ? s.limit>0||s.jumpY<[2.1,1.4,1.25,1.8][e.variant%4] : e.kind === 'barrier' ? s.jumpY < (s.limit>0?1:[.5,.75,.85][e.variant%3]) : s.jumpY + (s.slideTime > 0 ? 0.75 : 1.85) > 1.28;
    if (hit) {
      s.events.push('impact');
      if (s.shield) { s.shield = false; s.grace = 1.4; e.active = false; }
      else if (s.limit===0) { s.chaserGap-=2.1; s.stumbleTime=.8; s.grace=1.1; e.active=false; }
      else { s.status = 'gameover'; s.events.push('gameover'); break; }
    }
  }
  if (s.limit===0) {
    s.chaserGap = Math.min(6,s.chaserGap + (flying?2.5:s.stumbleTime>0?-1:.65)*dt);
    const near=s.chaserGap<3 && !flying;
    if(near && !s.chaserNear)s.events.push('chaserNear'); s.chaserNear=near;
    if(s.chaserGap<1 && !flying){s.caught=true;s.status='gameover';s.events.push('caught','gameover');}
    else if(near)offerDrone(s);
    if(s.droneApproach>0){s.droneApproach=Math.max(0,s.droneApproach-dt);if(s.droneApproach===0)startDrone(s);}
  }
  if (s.limit > 0 && s.elapsed >= s.limit && s.status === 'running') { s.status = 'gameover'; s.events.push('gameover'); }
  s.score = Math.floor(s.distance * 10) + s.coins * 50 + s.bonusScore;
  if (s.distance >= s.milestone) { s.milestone += 500; s.events.push('milestone'); if(s.limit===0)offerDrone(s); }
  if (s.distance >= s.nextRow) { row(s, -55 - 5 * RUN.rowGap); s.nextRow += RUN.rowGap; }
}
export function advanceRunner(s: Runner, delta: number) {
  if (!Number.isFinite(delta) || delta <= 0 || s.status === 'paused' || s.status === 'gameover') return;
  s.accumulator += Math.min(delta, 0.1);
  let steps = 0;
  while (s.accumulator + 1e-9 >= RUN.step && steps++ < 6) {
    step(s); s.accumulator -= RUN.step;
    if ((s.status as RunStatus) === 'gameover') { s.accumulator = 0; break; }
  }
}
