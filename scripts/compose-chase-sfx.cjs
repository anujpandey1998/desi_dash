// Original oscillator/noise effects; no sampled recordings.
const fs=require('node:fs'),path=require('node:path'),rate=22050,tau=Math.PI*2;
let seed=931;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
function save(name,duration,sample){const n=Math.round(duration*rate),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){const t=i/rate,v=sample(t)*Math.min(1,t/.006,(duration-t)/.02);b.writeInt16LE(Math.round(Math.max(-.9,Math.min(.9,v))*32767),44+i*2);}fs.writeFileSync(path.resolve(__dirname,'../src/assets/audio',name+'.wav'),b);}
save('footstep',.095,t=>(noise()*.17+Math.sin(tau*110*t)*.35)*Math.exp(-48*t));
save('chaser-shout',.65,t=>{const syllable=(t%.3)/.3,f=180-55*syllable;return (Math.sin(tau*f*t)*.22+Math.sin(tau*f*3*t)*.14+Math.sin(tau*f*5*t)*.06)*Math.sin(Math.PI*syllable)*Math.exp(-t);});
save('bird-caw',.4,t=>(Math.sin(tau*(700*t-180*t*t))*.18+noise()*.08)*(Math.sin(t*38)>.1?1:.25)*Math.exp(-5*t));
save('drone-buzz',1,t=>(Math.sin(tau*110*t)+.4*Math.sin(tau*220*t))*.07*(.8+.2*Math.sin(tau*22*t)));
