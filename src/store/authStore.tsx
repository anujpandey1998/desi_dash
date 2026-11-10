import React, { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { auth, firebaseStatus, initializeFirebase } from '../services/firebase/client';
import { ensureProfile, watchProfile, type UserProfile } from '../services/firebase/userService';
import { firebaseMessage } from '../services/firebase/errors';
import { saveCourierName } from '../game3d/profile';

type AuthState={loading:boolean;configured:boolean;user:User|null;profile:UserProfile|null;error:string;retry:()=>void};
const Context=createContext<AuthState>({loading:true,configured:false,user:null,profile:null,error:'',retry:()=>{}});
export const useAuth=()=>useContext(Context);
export function AuthProvider({children}:PropsWithChildren) {
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState<Omit<AuthState,'retry'>>(()=>({loading:true,...firebaseStatus(),user:null,profile:null}));
  useEffect(()=>{
    let active=true,stopAuth=()=>{},stopProfile=()=>{},generation=0;
    const status=firebaseStatus();
    if(!status.configured){setState({loading:false,...status,user:null,profile:null});return;}
    void initializeFirebase().then(()=>{
      if(!active)return;
      stopAuth=onAuthStateChanged(auth(),user=>{
        const current=++generation;stopProfile();
        setState(s=>({...s,loading:!!user,user,profile:null,error:''}));
        if(!user)return;
        void ensureProfile(user).then(()=>{
          if(!active||current!==generation)return;
          stopProfile=watchProfile(user.uid,profile=>{
            if(!active||current!==generation)return;
            setState(s=>({...s,loading:false,profile,error:''}));void saveCourierName(profile.displayName).catch(()=>{});
          },error=>{if(active&&current===generation)setState(s=>({...s,loading:false,error:firebaseMessage(error)}));});
        }).catch(error=>{if(active&&current===generation)setState(s=>({...s,loading:false,error:firebaseMessage(error)}));});
      });
    }).catch(error=>{if(active)setState(s=>({...s,loading:false,error:firebaseMessage(error)}));});
    return()=>{active=false;generation++;stopAuth();stopProfile();};
  },[attempt]);
  return <Context.Provider value={{...state,retry:()=>setAttempt(x=>x+1)}}>{children}</Context.Provider>;
}
