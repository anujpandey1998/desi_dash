export type RunStatus = 'ready' | 'running' | 'paused' | 'gameover';
export type EntityKind = 'tank' | 'barrier' | 'arch' | 'coin' | 'shield';
export type RunEvent = 'coin' | 'jump' | 'slide' | 'shield' | 'impact' | 'gameover' | 'milestone';
export type Entity = { active: boolean; kind: EntityKind; lane: number; z: number; y: number; variant: number };
export const RUN = { laneWidth: 2.8, step: 1 / 60, gravity: 25, jumpSpeed: 9.5, baseSpeed: 13, maxSpeed: 24, rowGap: 27, drawDistance: 175 } as const;
export type Runner = {
  status: RunStatus; resumeStatus: 'ready' | 'running'; countdown: number; lane: number; x: number;
  jumpY: number; jumpVelocity: number; slideTime: number; distance: number; speed: number;
  coins: number; score: number; shield: boolean; grace: number; elapsed: number; accumulator: number;
  tick: number; limit: number; nextRow: number; rowNumber: number; seed: number; milestone: number; entities: Entity[]; events: RunEvent[];
};
function random(s: Runner) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function add(s: Runner, kind: EntityKind, lane: number, z: number, y = 0) {
  const e = s.entities.find(e => !e.active);
  if (e) Object.assign(e, { active: true, kind, lane, z, y, variant: Math.floor(random(s) * 3) });
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
    elapsed: 0, accumulator: 0, tick: 0, limit, nextRow: RUN.rowGap, rowNumber: 0, seed: seed >>> 0,
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
  if (s.status !== 'running' || s.jumpY > 0.02) return;
  s.slideTime = 0; s.jumpVelocity = RUN.jumpSpeed; s.events.push('jump');
}
export function slide(s: Runner) {
  if (s.status !== 'running') return;
  s.slideTime = 0.9;
  if (s.jumpY > 0.02) s.jumpVelocity = -13;
  s.events.push('slide');
}
export function pause(s: Runner) {
  if (s.status !== 'running' && s.status !== 'ready') return;
  s.resumeStatus = s.status; s.status = 'paused'; s.accumulator = 0;
}
export function resume(s: Runner) { if (s.status === 'paused') s.status = s.resumeStatus; }
export function snapshot(s: Runner) {
  return { status: s.status, countdown: Math.ceil(s.countdown), coins: s.coins, score: s.score,
    distance: Math.floor(s.distance), speed: Math.round(s.speed * 3.6), shield: s.shield, milestone: s.milestone };
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
  s.elapsed += dt;
  s.speed = Math.min(RUN.maxSpeed, RUN.baseSpeed + s.distance / 180);
  s.distance += s.speed * dt;
  s.x += (s.lane * RUN.laneWidth - s.x) * Math.min(1, dt * 17);
  s.jumpVelocity -= RUN.gravity * dt;
  s.jumpY = Math.max(0, s.jumpY + s.jumpVelocity * dt);
  if (s.jumpY === 0) s.jumpVelocity = 0;
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
    const halfLength = e.kind === 'tank' ? 4.8 : 0.65;
    if (across > 1.02 || Math.abs(e.z) > halfLength + 0.28 || s.grace > 0) continue;
    const hit = e.kind === 'tank' || (e.kind === 'barrier' ? s.jumpY < 1.0 : s.jumpY + (s.slideTime > 0 ? 0.75 : 1.85) > 1.28);
    if (hit) {
      s.events.push('impact');
      if (s.shield) { s.shield = false; s.grace = 1.4; e.active = false; }
      else { s.status = 'gameover'; s.events.push('gameover'); break; }
    }
  }
  if (s.limit > 0 && s.elapsed >= s.limit && s.status === 'running') { s.status = 'gameover'; s.events.push('gameover'); }
  s.score = Math.floor(s.distance * 10) + s.coins * 50;
  if (s.distance >= s.milestone) { s.milestone += 500; s.events.push('milestone'); }
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
