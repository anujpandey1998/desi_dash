const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{test}=require('node:test'),assert=require('node:assert/strict');
function setup(){
  let release;const mode=new Promise(r=>release=r),players=[],exports={};
  const storage={getItem:async()=>null,setItem:async()=>{}};
  const audio={setAudioModeAsync:()=>mode,createAudioPlayer(source){const p={source,plays:0,pauses:0,play(){this.plays++;},pause(){this.pauses++;},seekTo:async()=>{}};players.push(p);return p;}};
  const code=ts.transpileModule(fs.readFileSync('src/services/audioService.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  vm.runInNewContext(code,{exports,require(name){if(name==='expo-audio')return audio;if(name.includes('async-storage'))return storage;if(name==='expo-haptics')return {};if(name.endsWith('.wav')||name.endsWith('.mp3'))return name;throw Error(name);},Promise});
  return {api:exports,players,release};
}
test('concurrent music starts create one looping user-provided music player',async()=>{const t=setup(),a=t.api.startMusic(),b=t.api.startMusic();t.release();await Promise.all([a,b]);assert.equal(t.players.length,1);assert.match(t.players[0].source,/rooftop-user-theme/);assert.equal(t.players[0].loop,true);assert.equal(t.players[0].volume,.3);});
test('pause while loading prevents late playback and allows a later resume',async()=>{const t=setup(),a=t.api.startMusic();await t.api.pauseMusic();t.release();await a;assert.equal(t.players.length,0);await t.api.startMusic();assert.equal(t.players.length,1);assert.equal(t.players[0].plays,1);await t.api.pauseMusic();assert.equal(t.players[0].pauses,1);});
test('sound disabled during initialization prevents playback',async()=>{const t=setup(),a=t.api.startMusic();await t.api.setSoundEnabled(false);t.release();await a;assert.equal(t.players.length,0);});
