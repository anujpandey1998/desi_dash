// Rooftop Radio: original score synthesized from oscillators and seeded noise.
// No recordings, samples, MIDI files or external compositions are used.
const fs = require('node:fs'), path = require('node:path');
const rate = 22050, bpm = 120, beat = 60 / bpm, bars = 32;
const duration = bars * 4 * beat, length = duration * rate;
const left = new Float32Array(length), right = new Float32Array(length);
const tau = Math.PI * 2, hz = midi => 440 * 2 ** ((midi - 69) / 12);
let seed = 309710;
const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
function voice(at, seconds, amp, pan, sample) {
  const start = Math.round(at * rate), count = Math.ceil(seconds * rate);
  const l = Math.sqrt((1 - pan) / 2), r = Math.sqrt((1 + pan) / 2);
  for (let i = 0; i < count; i++) {
    const t = i / rate, fade = Math.min(1, t / .006) * Math.min(1, (seconds - t) / .025);
    const v = sample(t) * amp * fade, index = (start + i) % length;
    left[index] += v * l; right[index] += v * r;
  }
}
function pluck(at, note, amp = .15, pan = 0, seconds = .55) {
  const f = hz(note);
  const wave = t => (Math.sin(tau*f*t) + .28*Math.sin(tau*f*2*t)*Math.exp(-12*t) + .12*Math.sin(tau*f*3*t)*Math.exp(-18*t)) * Math.exp(-6*t);
  voice(at, seconds, amp, pan, wave);
  voice(at + .375, seconds, amp * .18, -pan, wave);
}
// Cmaj9, Am9, Fmaj9, G6, with four independently composed two-bar motifs.
const chords = [[48,55,59,62,64],[45,52,55,59,60],[41,48,52,55,57],[43,50,55,57,59]];
const motifs = [
  [[0,76],[.75,79],[1.5,74],[2.25,76],[3.5,71],[4.5,74],[5.25,72],[6,79],[7.25,76]],
  [[.5,72],[1.25,76],[2,79],[3.25,74],[4,76],[5.5,71],[6.25,74],[7,72]],
  [[0,77],[1.25,76],[2.5,72],[3.25,69],[4.5,72],[5.25,76],[6.5,79],[7.25,77]],
  [[.25,74],[1.5,79],[2.25,76],[3.5,74],[4.25,71],[5,69],[6.25,74],[7.5,72]],
];
for (let bar = 0; bar < bars; bar++) {
  const start = bar * 4 * beat, chord = chords[Math.floor(bar / 2) % 4];
  for (const offset of [.5, 2.5]) for (const note of chord.slice(1)) {
    const f = hz(note);
    voice(start+offset*beat, .7, .026, (note%3-1)*.4, t => (Math.sin(tau*f*t)+.15*Math.sin(tau*f*2*t))*Math.exp(-4*t));
  }
  for (const offset of [0, 1.5, 2, 3.5]) {
    const f = hz(chord[0] - 12 + (offset === 3.5 ? 7 : 0));
    voice(start+offset*beat,.28,.23,0,t => (Math.sin(tau*f*t)+.2*Math.sin(tau*f*2*t))*Math.exp(-9*t));
  }
  for (const offset of [0, 2, ...(bar%4===3?[3.5]:[])]) {
    voice(start+offset*beat,.24,.4,0,t => Math.sin(tau*(49*t+7*(1-Math.exp(-32*t))))*Math.exp(-20*t));
  }
  for (const offset of [1,3]) voice(start+offset*beat,.16,.105,.12,t => (noise()*.8+Math.sin(tau*190*t)*.2)*Math.exp(-32*t));
  for (let step = 0; step < 8; step++) {
    const at = start + (step*.5+(step%2?.055:0))*beat;
    voice(at,.065,step%2?.035:.025,step%2?.45:-.45,t => noise()*Math.exp(-65*t));
  }
  if (bar % 2 === 0) {
    const phrase = Math.floor(bar/2), motif = motifs[phrase%4];
    for (const [offset,note] of motif) pluck(start+offset*beat,note+(phrase>=12?12:0),phrase>=12?.105:.145,(offset%2-.5)*.4);
    if (phrase>=8 && phrase<12) for (let i=0;i<8;i++) pluck(start+(i+.25)*beat,chord[1+i%3]+12,.055,(i%2?.5:-.5),.4);
  }
}
let peak=0; for(let i=0;i<length;i++) peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
const gain=.86/Math.max(peak,.86), data=Buffer.alloc(length*4), header=Buffer.alloc(44);
let energy=0;
for(let i=0;i<length;i++){const l=left[i]*gain,r=right[i]*gain;energy+=(l*l+r*r)/2;data.writeInt16LE(Math.round(l*32767),i*4);data.writeInt16LE(Math.round(r*32767),i*4+2);}
header.write('RIFF');header.writeUInt32LE(data.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);
const output=path.resolve(__dirname,'../src/assets/audio/rooftop-radio.wav');fs.writeFileSync(output,Buffer.concat([header,data]));
console.log(JSON.stringify({output,bpm,bars,duration,peak:peak*gain,rms:Math.sqrt(energy/length)}));
