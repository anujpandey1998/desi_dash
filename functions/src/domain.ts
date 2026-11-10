export type Player={name:string;score:number;distance:number;finished:boolean;left:boolean;lastSeen:{toMillis():number}};
export const ROOM_DURATION=90,STALE_MS=65000;
export function cleanName(value:unknown) {return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim().slice(0,20):'Courier';}
export function validCode(value:unknown):value is string {return typeof value==='string'&&/^[A-Z]{6}$/.test(value);}
export function markAbsent(players:Record<string,Player>,now:number) {
  return Object.fromEntries(Object.entries(players).map(([uid,p])=>[uid,{...p,left:p.left||(!p.finished&&now-p.lastSeen.toMillis()>STALE_MS)}]));
}
export function allDone(players:Record<string,Player>) {return Object.values(players).every(p=>p.left||p.finished);}
