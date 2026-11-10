const {test,before,after,beforeEach}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const enabled=!!process.env.FIRESTORE_EMULATOR_HOST;
let env,api,rules;
if(enabled){rules=require('@firebase/rules-unit-testing');api=require('firebase/firestore');}
before(async()=>{if(enabled)env=await rules.initializeTestEnvironment({projectId:'demo-rooftop-rules',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});});
after(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{if(env)await env.clearFirestore();});
const check=(name,fn)=>test(name,{skip:!enabled},fn);
const user=()=>({displayName:'Courier',avatarId:'girl',coins:0,highScore:0,createdAt:api.serverTimestamp()});
async function seedRoom(){await env.withSecurityRulesDisabled(async c=>{
 const p=name=>({name,score:0,distance:0,finished:false,left:false,lastSeen:api.Timestamp.now()});
 await api.setDoc(api.doc(c.firestore(),'rooms','room'),{code:'ABCDEF',hostId:'host',status:'playing',players:{host:p('Host'),guest:p('Guest')},maxPlayers:4,createdAt:api.Timestamp.now(),round:1,seed:42,startsAt:Date.now()-1000,duration:90});
});}
check('users are private; only requested profile fields and zero initial coins allowed',async()=>{
 const own=env.authenticatedContext('one').firestore(),other=env.authenticatedContext('two').firestore(),ref=api.doc(own,'users','one');
 await rules.assertSucceeds(api.setDoc(ref,user()));
 await rules.assertSucceeds(api.getDoc(ref));
 await rules.assertFails(api.getDoc(api.doc(other,'users','one')));
 await rules.assertFails(api.setDoc(api.doc(other,'users','two'),{...user(),coins:500}));
 await rules.assertFails(api.updateDoc(ref,{email:'extra@example.com'}));
 await rules.assertFails(api.updateDoc(ref,{coins:1}));
 await rules.assertSucceeds(api.updateDoc(ref,{displayName:'New name',highScore:123}));
 await rules.assertFails(api.updateDoc(ref,{highScore:-1}));
 await rules.assertFails(api.updateDoc(ref,{highScore:10000001}));
 await rules.assertFails(api.deleteDoc(ref));
});
check('only room members can read; room queries and code-index reads are denied',async()=>{
 await seedRoom();const host=env.authenticatedContext('host').firestore(),outsider=env.authenticatedContext('outsider').firestore();
 await rules.assertSucceeds(api.getDoc(api.doc(host,'rooms','room')));
 await rules.assertFails(api.getDoc(api.doc(outsider,'rooms','room')));
 await rules.assertFails(api.getDocs(api.collection(host,'rooms')));
 await rules.assertFails(api.getDoc(api.doc(host,'roomCodes','ABCDEF')));
 await rules.assertFails(api.getDoc(api.doc(env.unauthenticatedContext().firestore(),'rooms','room')));
});
check('player progress cannot modify another player, room status, membership or negative/huge scores',async()=>{
 await seedRoom();const db=env.authenticatedContext('guest').firestore(),ref=api.doc(db,'rooms','room');
 const seen=()=>api.serverTimestamp();
 await rules.assertSucceeds(api.updateDoc(ref,{'players.guest.score':100,'players.guest.distance':12,'players.guest.lastSeen':seen()}));
 for(const patch of [{'players.host.score':20},{status:'finished'},{hostId:'guest'},{'players.guest.score':-1},{'players.guest.score':10000001},{'players.guest.distance':5001},{'players.guest.left':true},{'players.guest.name':'Someone else'},{'players.attacker':{name:'X'}},{round:2}])await rules.assertFails(api.updateDoc(ref,{...patch,'players.guest.lastSeen':seen()}));
 await rules.assertSucceeds(api.updateDoc(ref,{'players.guest.finished':true,'players.guest.lastSeen':seen()}));
 await rules.assertFails(api.updateDoc(ref,{'players.guest.finished':false,'players.guest.lastSeen':seen()}));
 await rules.assertFails(api.updateDoc(api.doc(env.authenticatedContext('host').firestore(),'rooms','room'),{status:'finished'}));
});
check('waiting lobby permits heartbeat but not score writes',async()=>{
 await seedRoom();await env.withSecurityRulesDisabled(c=>api.updateDoc(api.doc(c.firestore(),'rooms','room'),{status:'waiting'}));
 const ref=api.doc(env.authenticatedContext('guest').firestore(),'rooms','room');
 await rules.assertSucceeds(api.updateDoc(ref,{'players.guest.lastSeen':api.serverTimestamp()}));
 await rules.assertFails(api.updateDoc(ref,{'players.guest.score':1,'players.guest.lastSeen':api.serverTimestamp()}));
});
