import {useRoomRace,RaceLeaderboard,type RaceParams} from './rooms/useRoomRace';
import {firebaseConfigured,auth as firebaseAuth} from '../services/firebase/client';
import {saveCloudHighScore} from '../services/firebase/userService';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, BackHandler, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { playFootstep, playChaserShout, playBirdCaw, setDroneBuzz } from '../services/audioService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Popup } from '../components/ui';
import { BrandMascot, MascotAvatar } from '../components/BrandMascot';
import { theme as t } from '../theme/theme';
import { ECONOMY } from '../constants/economy';
import { buyDronePass, loadDroneInventory, grantAdBenefit, useDronePass } from '../services/droneService';
import { RunnerScene } from '../game3d/RunnerScene';
import { createRunner, DRONE, canStartDrone, startDrone, performStunt, jump, pause, resetRunner, resume, slide, snapshot, steer, type RunEvent } from '../game3d/simulation';
import {loadCharacter,loadCourierName,type CharacterId} from '../game3d/profile';
import { loadOutfit } from '../game3d/profile';
import { loadHighScore, loadRunnerPhoto, loadWalletCoins, saveHighScore, saveWalletCoins } from '../services/runnerPhotoService';
import { loadVibrationSetting, loadSoundSetting, pauseMusic, playButtonTap, playCoin, playCrash, playJump, playDrone, resumeAudioIfNeeded, triggerImpact } from '../services/audioService';

import { type InputAction, type RunInput, type Ticket } from '../game3d/challenges';
import { localTransaction, saveCompletedRun, startChallenge, submitChallenge, trackEvent } from '../services/socialService';
import { showCoinReward, showRewardedReceipt, showInterstitialIfDue, TEST_ADS } from '../services/adService';
import { loadTutorialComplete, saveTutorialComplete } from '../services/tutorialService';

function CooldownRing({remaining}:{remaining:number}){
  const filled=Math.ceil(12*Math.max(0,Math.min(1,remaining/DRONE.cooldown)));
  return <View accessibilityLabel={`${remaining} seconds cooldown`} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}>
    {Array.from({length:12},(_,i)=><View key={i} style={{position:'absolute',width:4,height:7,borderRadius:3,backgroundColor:i<filled?t.colors.ink:'#FFFFFF55',transform:[{rotate:`${i*30}deg`},{translateY:-15}]}}/>)}
    <Text style={{fontFamily:t.font.bold,fontSize:11,color:t.colors.ink}}>{remaining}</Text>
  </View>;
}

export function GameScreen({ navigation, route }: { navigation: any; route: any }) {
  const insets = useSafeAreaInsets();
  const ticket = useRef<Ticket | undefined>(route?.params?.ticket);
  const roomRace=useRef<RaceParams|undefined>(route?.params?.roomRace).current;
  const inputs = useRef<RunInput[]>([]);
  const submitted = useRef(false), uploading = useRef(false), adLock = useRef(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [droneOptions, setDroneOptions] = useState(false), [dronePasses, setDronePasses] = useState(0), [droneMessage, setDroneMessage] = useState('');
  const alive = useRef(true), droneAutoResume = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [adBusy, setAdBusy] = useState(false), [doubled, setDoubled] = useState(false);
  const [tutorialReady, setTutorialReady] = useState(Boolean(ticket.current||roomRace));
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [tutorialSaving, setTutorialSaving] = useState(false);
  const runner = useMemo(() => {
    const created = createRunner(ticket.current?.challenge.seed??roomRace?.seed, ticket.current?.challenge.limit || roomRace?.duration || 0);
    if (!ticket.current&&!roomRace) pause(created);
    if(roomRace)created.countdown=Math.max(0,(roomRace.startsAt-Date.now())/1000);
    return created;
  }, []);
  const roomState=useRoomRace(roomRace,runner,navigation);
  const [hud, setHud] = useState(() => snapshot(runner));
  const [revived,setRevived]=useState(false);
  const coinScale=useRef(new Animated.Value(1)).current,noticeOpacity=useRef(new Animated.Value(0)).current;
  const pop=useRef(new Animated.Value(0)).current;const [powerText,setPowerText]=useState('');
  useEffect(()=>{if(!hud.coins)return;coinScale.stopAnimation();coinScale.setValue(1);Animated.sequence([Animated.timing(coinScale,{toValue:1.35,duration:100,useNativeDriver:true}),Animated.spring(coinScale,{toValue:1,useNativeDriver:true})]).start();},[hud.coins,coinScale]);
  const warningOpacity=useRef(new Animated.Value(0)).current;
  const [caughtReveal,setCaughtReveal]=useState(false);
  useEffect(()=>{const timer=setTimeout(()=>setCaughtReveal(hud.caught),hud.caught?900:0);return()=>clearTimeout(timer);},[hud.caught]);
  const danger=hud.chaserNear&&hud.status==='running';
  useEffect(()=>{if(!danger){warningOpacity.setValue(0);return;}const pulse=Animated.loop(Animated.sequence([Animated.timing(warningOpacity,{toValue:.5,duration:500,useNativeDriver:true}),Animated.timing(warningOpacity,{toValue:.08,duration:500,useNativeDriver:true})]));pulse.start();return()=>pulse.stop();},[danger,warningOpacity]);
  const flyingAudio=hud.droneTime>0&&hud.status==='running';
  useEffect(()=>{void setDroneBuzz(flyingAudio).catch(()=>{});return()=>{void setDroneBuzz(false).catch(()=>{});};},[flyingAudio]);
  const [courierName,setCourierName]=useState('Courier');
  const [character,setCharacter]=useState<CharacterId>('boy'),[characterReady,setCharacterReady]=useState(false);
  const [ready, setReady] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [best, setBest] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [outfit, setOutfit] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const leaving = useRef(false);
  const bankedCoins=useRef(0),runRecorded=useRef(false);
  const banked = useRef(false), saveTask = useRef<Promise<void> | null>(null);
  const tutorialTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCoinSound = useRef(0);
  const showNotice = useCallback((text: string) => {
    noticeOpacity.stopAnimation();noticeOpacity.setValue(1);setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => {Animated.timing(noticeOpacity,{toValue:0,duration:350,useNativeDriver:true}).start();}, 2300);
  }, [noticeOpacity]);
  const bank = useCallback(() => {
    if (saveTask.current) return saveTask.current;
    if (banked.current) return Promise.resolve();
    const finalScore = runner.score, totalCoins=runner.coins, collected = totalCoins-bankedCoins.current;
    setSaving(true);
    saveTask.current = localTransaction(async () => {
      const saved = await saveCompletedRun(finalScore, runner.distance, collected, runner.status === 'gameover',!runRecorded.current);
      setBest(saved.best); setWallet(saved.wallet); bankedCoins.current=totalCoins;if(runner.status==='gameover')runRecorded.current=true;banked.current = true;
      if(firebaseConfigured()){const uid=firebaseAuth().currentUser?.uid;if(uid)void saveCloudHighScore(uid,finalScore).catch(()=>{});}
    }).catch(() => { showNotice('Progress could not be saved. Try again.'); }).finally(() => { setSaving(false); saveTask.current = null; });
    return saveTask.current;
  }, [runner, showNotice]);
  useEffect(() => {
    if (ticket.current||roomRace) return;
    let active = true;
    loadTutorialComplete().then(complete => {
      if (!active) return;
      setTutorialStep(complete ? null : 0);
      setTutorialReady(true);
      if (!complete) { runner.training = true; runner.status = 'running'; runner.countdown = 0; for (const entity of runner.entities) entity.active = false; }
      else resume(runner);
      setHud(snapshot(runner));
    }).catch(error => {
      if (!active) return;
      setTutorialReady(true);
      setTutorialStep(null);
      resetRunner(runner);
      resume(runner);
      setHud(snapshot(runner));
      showNotice(error instanceof Error ? error.message : 'Tutorial could not be loaded.');
    });
    return () => { active = false; };
  }, [runner, showNotice]);
  useEffect(() => {
    loadDroneInventory().then(data => { setDronePasses(data.passes); setWallet(data.coins); }).catch(() => {});
    loadHighScore().then(setBest).catch(() => {});
    loadWalletCoins().then(setWallet).catch(() => {});
    loadRunnerPhoto().then(setPhoto).catch(() => {});
    loadOutfit().then(setOutfit).catch(() => {});
    loadCourierName().then(setCourierName).catch(()=>{});
    loadCharacter().then(setCharacter).catch(()=>{}).finally(()=>setCharacterReady(true));
    void loadVibrationSetting().catch(() => {});
    loadSoundSetting().then(() => { if (AppState.currentState === 'active') void resumeAudioIfNeeded().catch(() => {}); }).catch(() => {});
    return () => { if (tutorialTimer.current) clearTimeout(tutorialTimer.current); if (noticeTimer.current) clearTimeout(noticeTimer.current); void pauseMusic().catch(() => {}); };
  }, []);
  const maybeShowInterstitial = useCallback(async () => {
    if (adLock.current || ticket.current || roomRace || runner.status !== 'gameover') return;
    adLock.current = true;
    setAdBusy(true);
    try { await showInterstitialIfDue(); }
    catch { showNotice('The ad could not be loaded. You can continue playing.'); }
    finally { adLock.current = false; setAdBusy(false); }
  }, [runner, showNotice]);
  useEffect(()=>{
    if(hud.status!=='gameover'||saving||roomRace||ticket.current||(hud.caught&&!caughtReveal))return;
    const timer=setTimeout(()=>void maybeShowInterstitial(),400);return()=>clearTimeout(timer);
  },[hud.status,hud.caught,caughtReveal,saving,roomRace,maybeShowInterstitial]);
  const goHome = useCallback(async () => {
    if (leaving.current || adLock.current) return;
    const finishedSoloRun = runner.status === 'gameover' && !ticket.current&&!roomRace;
    leaving.current = true; pause(runner); await bank();
    if (finishedSoloRun) await maybeShowInterstitial();
    if (banked.current) navigation.goBack(); else leaving.current = false;
  }, [runner, bank, navigation, maybeShowInterstitial]);
  const togglePause = useCallback(() => {
    if (runner.status === 'paused') { resume(runner); void resumeAudioIfNeeded().catch(() => {}); }
    else { pause(runner); void pauseMusic().catch(() => {}); }
    setHud(snapshot(runner));
  }, [runner]);
  useEffect(() => {
    const app = AppState.addEventListener('change', state => {
      if (state === 'active' && droneAutoResume.current) { droneAutoResume.current = false; resume(runner); setHud(snapshot(runner)); void resumeAudioIfNeeded().catch(() => {}); }
      if (state === 'active' && runner.training) { resume(runner); setHud(snapshot(runner)); }
      if (state !== 'active') { pause(runner); setHud(snapshot(runner)); void pauseMusic().catch(() => {}); }
    });
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (adLock.current) return true;
      if (runner.training) { void goHome(); return true; }
      if (runner.status === 'running' || runner.status === 'ready') togglePause(); else void goHome();
      return true;
    });
    return () => { app.remove(); back.remove(); };
  }, [runner, togglePause, goHome]);
  const upload = useCallback(async () => {
    if (!ticket.current || submitted.current || uploading.current) return;
    uploading.current = true;
    setUploadStatus('Verifying your run...');
    try { await submitChallenge(ticket.current, runner.tick, inputs.current); submitted.current = true; setUploadStatus('Verified score posted! Refresh your room leaderboard.'); }
    catch { setUploadStatus('Score upload failed. Tap RETRY UPLOAD before leaving.'); }
    finally { uploading.current = false; }
  }, [runner]);
  const input = useCallback((action: InputAction) => {
    if (runner.status !== 'running') return;
    if(runner.bikeTime>0&&runner.jumpY>.4){performStunt(runner,action==='left'?'spin360':action==='right'?'noHands':action==='jump'?'backflip':'frontflip');return;}
    if (ticket.current) inputs.current.push({ tick: runner.tick, action });
    if (action === 'jump') jump(runner); else if (action === 'slide') slide(runner); else steer(runner, action === 'left' ? -1 : 1);
  }, [runner]);
  const doubleCoins = async () => {
    if (adLock.current || adBusy || doubled || ticket.current || runner.coins < 1) return;
    adLock.current = true;
    setAdBusy(true);
    try {
      await bank(); if (!banked.current) return;
      const earned = await showCoinReward();
      if (!earned) { showNotice('No reward earned. Ad unavailable or closed early.'); return; }
      await localTransaction(async () => { const next = await loadWalletCoins() + runner.coins; await saveWalletCoins(next); setWallet(next); });
      setDoubled(true); showNotice('BONUS COINS ADDED');
    } catch { showNotice('Reward could not be saved.'); } finally { adLock.current = false; setAdBusy(false); }
  };
  const openDrone = () => {
    if (ticket.current || runner.training || adLock.current || !canStartDrone(runner)) return;
    pause(runner); setHud(snapshot(runner)); setDroneMessage(''); setDroneOptions(true);
    void pauseMusic().catch(() => {});
  };
  const closeDrone = () => {
    if (adLock.current) return;
    setDroneOptions(false); resume(runner); if (AppState.currentState !== 'active') pause(runner); setHud(snapshot(runner));
    if (runner.status === 'running') void resumeAudioIfNeeded().catch(() => {});
  };
  const requestDrone = async (source: 'pass' | 'coins' | 'ad') => {
    if (adLock.current || ticket.current || !canStartDrone(runner)) return;
    adLock.current = true; setAdBusy(true); setDroneMessage('');
    try {
      if (source === 'coins') { const data = await buyDronePass(); if (alive.current) { setWallet(data.coins); setDronePasses(data.passes); } }
      if (source === 'ad') {
        const receipt = await showRewardedReceipt();
        if (!receipt) { if (alive.current) setDroneMessage('Ad not completed or unavailable. No reward granted.'); return; }
        const data = await grantAdBenefit(receipt, 'drone'); if (alive.current) setDronePasses(data.passes);
      }
      const passes = await useDronePass(() => alive.current && canStartDrone(runner), () => startDrone(runner));
      if (!alive.current) return;
      setDronePasses(passes); setDroneOptions(false); resume(runner);
      if (AppState.currentState !== 'active') { droneAutoResume.current = true; pause(runner); }
      else void resumeAudioIfNeeded().catch(() => {});
      setHud(snapshot(runner)); showNotice('SWIPE LEFT / RIGHT · STEER YOUR DRONE');
    } catch (error) { if (alive.current) setDroneMessage(error instanceof Error ? error.message : 'Your drone could not arrive. Try again.'); }
    finally { adLock.current = false; if (alive.current) setAdBusy(false); }
  };
  const onEvent = useCallback((event: RunEvent) => {
    if(event==='cycle'){showNotice('CYCLE RUSH! Ramps ahead · 12 seconds');void playDrone().catch(()=>{});}
    if(event==='ramp'){showNotice('AIR TIME! Swipe up/down: flips · left: 360 · right: no-hands');void playJump().catch(()=>{});void triggerImpact().catch(()=>{});}
    if(event==='perfect'){showNotice('PERFECT! '+Math.max(1,runner.combo)+'x combo');void playCoin().catch(()=>{});void triggerImpact().catch(()=>{});}
    if(event==='fall')showNotice('OOPS! Finish the trick before landing');
    if(event==='footstep')void playFootstep().catch(()=>{});
    if(event==='chaserNear'){void playChaserShout().catch(()=>{});showNotice('BHAAGO! '+(runner.chaserKind===0?'Aunty':'Uncle')+' is close!');}
    if(event==='bird')void playBirdCaw().catch(()=>{});
    if(event==='birdHit'){void playCrash().catch(()=>{});void triggerImpact().catch(()=>{});showNotice('BIRD HIT! Battery '+runner.droneHealth+'/3');}
    if(event==='droneCrash')showNotice('BATTERY EMPTY! Emergency landing');
    if(event==='droneApproach')showNotice('ESCAPE DRONE! Auto-grab incoming');
    if(event==='escape')showNotice('BYE BYE! Chaser left behind');
    if(event==='jump'||event==='drone')void triggerImpact().catch(()=>{});
    if (event === 'jump') void playJump().catch(() => {});
    if (event === 'coin' && Date.now() - lastCoinSound.current > 80) { lastCoinSound.current = Date.now(); void playCoin().catch(() => {}); }
    if (event === 'drone') void playDrone().catch(() => {});
    if (event === 'landing' && runner.boostTime>0) showNotice('SMOOTH LANDING · 3 SECOND BOOST!');
    if(event==='shield'||event==='cycle'||event==='drone'){
      setPowerText(event==='shield'?'+1 Shield':event==='cycle'?'Cycle Rush!':'Lift off!');pop.stopAnimation();pop.setValue(0);
      Animated.timing(pop,{toValue:1,duration:1200,useNativeDriver:true}).start();
    }
    if (event === 'shield') showNotice('SHIELD READY');
    if (event === 'milestone') showNotice(`${runner.milestone - 500} m CHECKPOINT`);
    if (event === 'impact') { void triggerImpact().catch(() => {}); if (runner.status !== 'gameover') showNotice(runner.stumbleTime>0?'OUCH! Uncle is catching up':'SHIELD SAVED YOU'); }
    if (event === 'gameover') { void playCrash().catch(() => {}); void pauseMusic().catch(() => {}); setHud(snapshot(runner)); void bank(); void upload(); if (!ticket.current&&!roomRace&&!runRecorded.current) void trackEvent('runs_finished').catch(() => {}); }
  }, [runner, bank, showNotice, upload]);
  const handled = useRef(false);
  const applySwipe = useCallback((dx: number, dy: number) => {
    if (Math.abs(dx) > Math.abs(dy)) input(dx < 0 ? 'left' : 'right');
    else if (dy < 0) input('jump'); else input('slide');
  }, [input]);
  const gesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => runner.status === 'running',
    onMoveShouldSetPanResponder: () => runner.status === 'running',
    onPanResponderGrant: () => { handled.current = false; },
    onPanResponderMove: (_, g) => { if (!handled.current && Math.max(Math.abs(g.dx), Math.abs(g.dy)) > 32) { applySwipe(g.dx, g.dy); handled.current = true; } },
    onPanResponderRelease: (_, g) => { if (!handled.current) { if (Math.max(Math.abs(g.dx), Math.abs(g.dy)) < 14) input('jump'); else applySwipe(g.dx, g.dy); } },
  }), [runner, applySwipe, input]);
  const revive = async () => {
    if(adLock.current||revived||ticket.current||roomRace||saving||doubled||runner.status!=='gameover')return;
    adLock.current=true;setAdBusy(true);
    try{
      const receipt=await showRewardedReceipt();
      if(!receipt){showNotice('Complete the ad to revive');return;}
      const reward=await grantAdBenefit(receipt,'revive');if(!reward.granted){showNotice('This ad reward has already been used');return;}
      if(!alive.current)return;
      setRevived(true);banked.current=false;runner.status=AppState.currentState==='active'?'running':'paused';runner.resumeStatus='running';
      runner.caught=false;runner.stumbleTime=0;runner.chaserGap=6;runner.grace=3;runner.jumpY=0;runner.jumpVelocity=0;runner.bikeTime=0;
      for(const e of runner.entities)if(Math.abs(e.z)<8)e.active=false;
      setHud(snapshot(runner));void resumeAudioIfNeeded().catch(()=>{});
    }catch{showNotice('Revive unavailable. Try again.');}finally{adLock.current=false;if(alive.current)setAdBusy(false);}
  };
  const retry = async () => {
    if (adLock.current || uploading.current) return;
    await bank(); if (!banked.current) return;
    await maybeShowInterstitial();
    if (adLock.current) return;
    if (ticket.current) { try { ticket.current = await startChallenge(ticket.current.challenge.code); } catch { showNotice('Cannot start challenge. Check your connection.'); return; } }
    inputs.current = []; submitted.current = false; setUploadStatus(''); setDoubled(false);
    banked.current = false;bankedCoins.current=0;runRecorded.current=false; setRevived(false); resetRunner(runner, ticket.current?.challenge.seed); setHud(snapshot(runner)); setNotice('');
    void playButtonTap().catch(() => {}); void resumeAudioIfNeeded().catch(() => {});
  };
  const tutorialActions: InputAction[] = ['left', 'jump', 'slide'];
  const tutorialCopy = [
    { title: 'Switch lanes', detail: 'Swipe left or right to dodge rooftop obstacles.', label: 'TRY LEFT LANE' },
    { title: 'Jump barriers', detail: 'Swipe up to clear low barriers.', label: 'TRY JUMP' },
    { title: 'Slide under lines', detail: 'Swipe down to duck beneath low rooftop gates.', label: 'TRY SLIDE' },
  ];
  const practiceTutorial = async (action: InputAction) => {
    if (tutorialStep === null || tutorialSaving) return;
    if (action !== tutorialActions[tutorialStep]) {
      showNotice('Try the highlighted control to continue.');
      return;
    }
    input(action);
    setTutorialSaving(true);
    tutorialTimer.current = setTimeout(() => {
    if (tutorialStep < tutorialActions.length - 1) {
      setTutorialStep(tutorialStep + 1);
      setTutorialSaving(false);
      return;
    }
    setTutorialSaving(true);
    void finishTutorial();
    }, 850);
  };
  const finishTutorial = async () => {
    try { await saveTutorialComplete(); }
    catch { showNotice('Tutorial progress could not be saved.'); }
    finally {
      setTutorialSaving(false);
      setTutorialStep(null);
      resetRunner(runner);
      if (AppState.currentState !== 'active') pause(runner);
      setHud(snapshot(runner));
    }
  };
  const onReady = useCallback(() => {
    if(roomRace){const now=Date.now();runner.countdown=Math.max(0,(roomRace.startsAt-now)/1000);runner.limit=Math.max(.05,roomRace.duration-Math.max(0,(now-roomRace.startsAt)/1000));}
    setReady(true);
  }, [roomRace,runner]);
  const onError = useCallback((error: Error) => { pause(runner); void pauseMusic().catch(() => {}); setRenderError(error.message || 'Scene initialization failed'); }, [runner]);
  const progress = Math.min(100, hud.distance % 500 / 5);
  return <View style={styles.root}>
    <StatusBar hidden />
    {characterReady&&<RunnerScene character={character} runner={runner} ghost={ticket.current?.ghost} outfit={outfit} onSnapshot={setHud} onEvent={onEvent} onReady={onReady} onError={onError} />}
    <View style={StyleSheet.absoluteFill} {...gesture.panHandlers} />
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{borderWidth:10,borderColor:'#FF4B4B',opacity:warningOpacity}]} />
    {danger&&<View pointerEvents="none" style={{position:'absolute',alignSelf:'center',bottom:'24%',backgroundColor:'#FFF3D1',padding:12,borderRadius:18,borderWidth:3,borderColor:'#FF8A3D'}}><Text style={{fontFamily:t.font.bold,color:t.colors.ink,fontSize:18}}>Bhaago! {hud.chaserKind===0?'Aunty':'Uncle'} aa rahe hain!</Text></View>}
    {hud.caught&&!caughtReveal&&<View pointerEvents="none" style={{position:'absolute',alignSelf:'center',top:'35%',backgroundColor:'#FFF3D1',padding:20,borderRadius:24}}><Text style={{fontFamily:t.font.bold,color:t.colors.ink,fontSize:25}}>Pakde gaye! Arre beta, ruko!</Text></View>}
    <View pointerEvents="box-none" style={[styles.hud,{top:insets.top+12,left:insets.left+16,right:insets.right+16}]}>
      <View style={styles.topRow}>
        <View style={styles.coinPill}>{photo && <Image source={{uri:photo}} style={styles.avatar}/>}<Animated.Text style={[styles.coinSymbol,{transform:[{scale:coinScale}]}]}>●</Animated.Text><Text style={styles.coinValue}>{hud.coins}</Text></View>
        <View pointerEvents="none" style={styles.scoreBox}><Text style={styles.small}>SCORE</Text><Text style={styles.score}>{hud.score.toLocaleString()}</Text></View>
        <Button title="Ⅱ" compact tone="panel" accessibilityLabel="Pause game" disabled={!tutorialReady || tutorialStep !== null} onPress={togglePause} style={{width:52}} />
      </View>
      <View pointerEvents="none" style={styles.metrics}><Text style={styles.metric}>{hud.distance} m</Text><Text style={styles.metric}>{hud.shield?'✦ SHIELD':hud.speed+' km/h'}</Text></View>
      <View pointerEvents="none" style={styles.progressTrack}><View style={[styles.progressFill,{width:progress+'%'}]}/></View>
      <Text pointerEvents="none" style={styles.target}>{roomRace?'LIVE RACE - '+Math.max(0,Math.ceil(runner.limit-runner.elapsed))+'s LEFT':ticket.current?'FRIEND RACE · '+Math.max(0,Math.ceil(90-runner.elapsed))+'s LEFT':'NEXT DELIVERY · '+hud.milestone+' m'}</Text>
      {hud.droneTime>0&&<Text pointerEvents="none" style={[styles.metric,{alignSelf:'center',marginTop:8}]}>BATTERY {hud.droneHealth}/3</Text>}
      {hud.bikeTime>0&&<Text pointerEvents="none" style={[styles.metric,{alignSelf:'center',marginTop:8}]}>CYCLE {Math.ceil(hud.bikeTime)}s ? {hud.combo}x</Text>}
    </View>
    {!ticket.current && !roomRace && !runner.training && hud.status==='running' && <View style={{position:'absolute',right:18,bottom:Math.max(insets.bottom,12)+18}}><Button title={hud.bikeTime>0?'Drone after cycle':hud.droneTime>0?'✦ Flying · '+Math.ceil(hud.droneTime)+'s':hud.droneCooldown>0?'Drone':'✦ Drone'} compact tone="teal" icon={hud.droneCooldown>0?<CooldownRing remaining={hud.droneCooldown}/>:undefined} disabled={hud.droneTime>0 || hud.droneCooldown>0 || hud.bikeTime>0} onPress={openDrone}/></View>}
    {roomRace&&<RaceLeaderboard room={roomState.room} error={roomState.error||((hud.status==='gameover')?'Race done. Waiting for other players...':'')}/>}
    <Popup visible={droneOptions} title="Your rooftop ride" onClose={closeDrone} footer={<Button title="Back to the run" compact tone="panel" disabled={adBusy} onPress={closeDrone}/>}>
      <Text style={styles.centerCopy}>Fly for {DRONE.duration} seconds. Swipe left/right for lanes and up/down for height. Dodge birds, follow curved coins, then land with a 3-second boost! Saved passes: {dronePasses}</Text>
      {dronePasses>0 && <Button title="Use saved drone pass" tone="green" disabled={adBusy} onPress={()=>void requestDrone('pass')}/>}
      <Button title={adBusy?'One moment…':'Watch '+(TEST_ADS?'test ':'')+'ad · Free flight'} tone="teal" disabled={adBusy} onPress={()=>void requestDrone('ad')}/>
      <Button title={'Call drone · '+ECONOMY.dronePrice+' coins'} disabled={adBusy || wallet<ECONOMY.dronePrice} onPress={()=>void requestDrone('coins')}/>
      <Text accessibilityLiveRegion="polite" style={styles.centerCopy}>{droneMessage || 'Ads grant a pass only when completed. A pass is kept if your flight cannot start.'}</Text>
    </Popup>
    {!!notice && <Animated.View pointerEvents="none" style={[styles.notice,{top:insets.top+205,opacity:noticeOpacity}]}><Text style={styles.noticeText}>{notice}</Text></Animated.View>}
    {!!powerText&&<Animated.Text pointerEvents="none" style={{position:'absolute',alignSelf:'center',top:'48%',fontFamily:t.font.bold,fontSize:26,color:t.colors.gold,opacity:pop.interpolate({inputRange:[0,.15,.7,1],outputRange:[0,1,1,0]}),transform:[{translateY:pop.interpolate({inputRange:[0,1],outputRange:[15,-65]})},{scale:pop.interpolate({inputRange:[0,.15,1],outputRange:[.7,1.15,1]})}]}}>{powerText}</Animated.Text>}
    {!ready && !renderError && <View style={styles.veil}><BrandMascot size={180}/><ActivityIndicator color={t.colors.teal} size="large"/><Text style={styles.loading}>Getting your rooftops ready…</Text></View>}
    {ready && !tutorialReady && <View style={styles.veil}><ActivityIndicator color={t.colors.teal} size="large"/><Text style={styles.loading}>A quick warm-up first…</Text></View>}
    {ready && tutorialStep!==null && <View style={[styles.veil,{backgroundColor:'transparent',justifyContent:'flex-start',paddingTop:insets.top+100}]}><Card style={styles.tutorialCard}><View style={styles.tutorialHeading}><MascotAvatar size={44}/><Text style={styles.eyebrow}>FIRST DELIVERY · {tutorialStep+1}/3</Text></View><Text style={styles.title}>{tutorialCopy[tutorialStep].title}</Text><Text style={styles.description}>{tutorialCopy[tutorialStep].detail}</Text><Button title={tutorialSaving?'Saving…':tutorialCopy[tutorialStep].label} disabled={tutorialSaving} onPress={()=>void practiceTutorial(tutorialActions[tutorialStep])}/><Text style={styles.instructions}>Once we start, it’s all swipes. No buttons blocking your view.</Text></Card></View>}
    {ready && hud.status==='ready' && <View pointerEvents="none" style={styles.countdown}><Text style={styles.countLabel}>READY, COURIER?</Text><Text style={styles.count}>{hud.countdown||'GO!'}</Text><Text style={styles.instructions}>Swipe to change lanes · Up to jump · Down to slide</Text></View>}
    <Popup visible={hud.status==='paused' && tutorialStep===null && tutorialReady && !droneOptions} title="Take a breather." onClose={togglePause} footer={<View style={styles.popupActions}><Button title="Let’s keep going!" tone="green" onPress={togglePause}/><Button title="Back to city" compact tone="panel" disabled={saving||adBusy} onPress={()=>void goHome()}/></View>}>
      <View style={styles.mascotCenter}><MascotAvatar size={86}/></View><Text style={styles.centerCopy}>The city will wait for you.</Text>{!ticket.current && canStartDrone(runner) && <Button title="Call a delivery drone" tone="teal" onPress={openDrone}/ >}
    </Popup>
    <Popup visible={!roomRace&&hud.status==='gameover'&&(!hud.caught||caughtReveal)} title={hud.caught?'Pakde gaye!':hud.score>best?'A rooftop record!':'What a run!'} onClose={()=>{if(!saving&&!adBusy)void goHome();}} footer={<View style={styles.popupActions}><Button title={saving?'Saving your run…':'Retry'} tone="green" disabled={saving||adBusy} onPress={()=>void retry()}/><Button title="Back to city" compact tone="panel" disabled={saving||adBusy} onPress={()=>void goHome()}/></View>}>
      {!ticket.current&&!revived&&!doubled&&<Button title={adBusy?'Loading ad...':'Revive with ad'} tone="teal" disabled={saving||adBusy} onPress={()=>void revive()}/>}
      <View style={styles.resultHero}><MascotAvatar size={82}/><View style={{flex:1}}><Text style={styles.eyebrow}>DELIVERY COMPLETE</Text><Text style={styles.description}>Delivery late ho gayi? Agli baar pakka!</Text></View></View>
      <Card style={styles.resultRow}><View><Text style={styles.small}>FINAL SCORE</Text><Text style={styles.resultScore}>{hud.score.toLocaleString()}</Text></View><View><Text style={styles.small}>DISTANCE</Text><Text style={styles.resultDistance}>{hud.distance} m</Text></View></Card>
      <View style={styles.resultMeta}><Text style={styles.metaText}>🏆 Best {Math.max(best,hud.score).toLocaleString()}</Text><Text style={styles.metaText}>● +{hud.coins} coins</Text></View><Text style={styles.centerCopy}>Wallet: {wallet} coins</Text>
      {!!ticket.current && <><Text accessibilityLiveRegion="polite" style={styles.centerCopy}>{uploadStatus}</Text>{!submitted.current && <Button title="Retry score upload" compact tone="blue" onPress={()=>void upload()}/>}</>}
      {!ticket.current && hud.coins>0 && <Button title={doubled?'Bonus collected ✓':adBusy?'Loading ad…':'Watch '+(TEST_ADS?'test ':'')+'ad · Double coins'} subtitle="An optional little bonus for your run" tone="teal" disabled={saving||adBusy||doubled} onPress={()=>void doubleCoins()}/>}
    </Popup>
    <Popup visible={Boolean(renderError)} title="The scene could not load." onClose={()=>navigation.goBack()} footer={<Button title="Back to city" onPress={()=>navigation.goBack()}/>}><Text style={styles.description}>Return to the city and try again. If this happens again, share the error below.</Text><Text selectable style={styles.description}>{renderError}</Text></Popup>
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:t.colors.sky},hud:{position:'absolute'},topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},coinPill:{flexDirection:'row',gap:7,alignItems:'center',backgroundColor:'#101E38ED',borderRadius:20,paddingHorizontal:12,paddingVertical:10,borderWidth:2,borderColor:t.colors.outline,minWidth:65},coinSymbol:{color:t.colors.gold,fontSize:18},coinValue:{color:t.colors.text,fontFamily:t.font.bold,fontSize:19,fontWeight:'900'},avatar:{width:24,height:24,borderRadius:12},scoreBox:{alignItems:'center',backgroundColor:'#101E38E8',paddingVertical:7,paddingHorizontal:22,borderRadius:20,minWidth:100,borderWidth:2,borderColor:t.colors.outline},small:{color:t.colors.muted,fontFamily:t.font.bold,fontSize:9,fontWeight:'900',letterSpacing:1.2},score:{color:t.colors.text,fontFamily:t.font.bold,fontSize:32,fontWeight:'900',fontVariant:['tabular-nums']},pause:{width:48,height:48,alignItems:'center',justifyContent:'center',backgroundColor:t.colors.blue,borderRadius:17,borderBottomWidth:4,borderColor:t.colors.blueShadow},pauseText:{color:t.colors.text,fontSize:24,fontWeight:'900'},metrics:{marginTop:10,flexDirection:'row',justifyContent:'space-between'},metric:{color:t.colors.ink,fontFamily:t.font.bold,fontWeight:'900',fontSize:12,backgroundColor:'#F1F6FFE6',paddingVertical:4,paddingHorizontal:9,borderRadius:10,overflow:'hidden'},progressTrack:{height:5,backgroundColor:'#101E3844',borderRadius:4,marginTop:8,overflow:'hidden'},progressFill:{height:5,backgroundColor:t.colors.teal},target:{color:t.colors.ink,fontFamily:t.font.bold,fontSize:9,fontWeight:'900',letterSpacing:1,marginTop:6},veil:{...StyleSheet.absoluteFill,backgroundColor:t.colors.scrim,alignItems:'center',justifyContent:'center',padding:20},tutorialCard:{width:'100%',maxWidth:420,gap:14},tutorialHeading:{flexDirection:'row',alignItems:'center',gap:12},eyebrow:{color:t.colors.gold,fontFamily:t.font.bold,letterSpacing:1,fontSize:10,fontWeight:'900'},title:{color:t.colors.text,fontFamily:t.font.bold,fontWeight:'900',fontSize:28},description:{color:t.colors.muted,fontFamily:t.font.regular,fontSize:13,lineHeight:21},instructions:{color:t.colors.ink,fontFamily:t.font.bold,backgroundColor:t.colors.paleBlue,padding:12,borderRadius:14,fontSize:12,textAlign:'center',overflow:'hidden'},countdown:{...StyleSheet.absoluteFill,justifyContent:'center',alignItems:'center',padding:24},countLabel:{color:t.colors.cream,fontFamily:t.font.bold,fontWeight:'900',fontSize:15,backgroundColor:'#101E38DD',padding:12,borderRadius:14},count:{color:t.colors.gold,fontFamily:t.font.bold,fontSize:110,fontWeight:'900',textShadowColor:t.colors.blueShadow,textShadowRadius:5,textShadowOffset:{width:0,height:6}},loading:{color:t.colors.text,fontFamily:t.font.bold,fontSize:15,marginTop:18},notice:{maxWidth:'90%',position:'absolute',alignSelf:'center',zIndex:20,padding:12,paddingHorizontal:20,borderRadius:18,backgroundColor:t.colors.night,borderWidth:2,borderColor:t.colors.teal},noticeText:{textAlign:'center',color:t.colors.gold,fontFamily:t.font.bold,fontWeight:'900',fontSize:12},popupActions:{gap:12},mascotCenter:{alignItems:'center'},centerCopy:{color:t.colors.muted,fontFamily:t.font.regular,textAlign:'center',fontSize:13,lineHeight:20},resultHero:{flexDirection:'row',alignItems:'center',gap:14},resultRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:t.colors.night},resultScore:{color:t.colors.text,fontFamily:t.font.bold,fontSize:34,fontWeight:'900',marginTop:5},resultDistance:{color:t.colors.gold,fontFamily:t.font.bold,fontSize:23,fontWeight:'900',marginTop:5},resultMeta:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},metaText:{color:t.colors.gold,fontFamily:t.font.bold,fontSize:13,fontWeight:'800'},
});
