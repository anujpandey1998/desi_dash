import React,{useState} from 'react';
import {Text,TextInput} from 'react-native';
import {Button,Card} from '../../components/ui';
import {useAuth} from '../../store/authStore';
import {logout,resendVerification} from '../../services/firebase/authService';
import {renameUser} from '../../services/firebase/userService';
import {firebaseMessage} from '../../services/firebase/errors';
import {authStyles as s} from './AuthScreens';
export function AccountCard(){
  const {user,profile,error,retry}=useAuth();const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  if(!user)return <Card><Text style={s.copy}>Offline mode. Firebase configure karke accounts enable karo.</Text></Card>;
  async function action(kind:'name'|'verify'|'logout'){
    if(busy||!user)return;setBusy(true);setMessage('');try{
      if(kind==='name'){await renameUser(user.uid,name);setName('');setMessage('Naam update ho gaya!');}
      else if(kind==='verify'){await resendVerification();setMessage('Verification email bhej diya. Inbox/spam check karo.');}
      else await logout();
    }catch(e){setMessage(firebaseMessage(e));}finally{setBusy(false);}
  }
  return <Card style={s.card}><Text style={s.message}>Your account - {profile?.displayName||'Courier'}</Text>
    <TextInput style={s.input} value={name} onChangeText={setName} maxLength={20} placeholder="New courier name" placeholderTextColor="#BAC8E5" accessibilityLabel="New display name" editable={!busy}/>
    <Button title="Save name" compact disabled={busy||!name.trim()} onPress={()=>void action('name')}/>
    {!user.emailVerified&&<Button title="Resend verification email" tone="teal" compact disabled={busy} onPress={()=>void action('verify')}/>}
    {!!error&&<><Text style={s.message}>{error}</Text><Button title="Retry profile" compact onPress={retry}/></>}
    {!!message&&<Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
    <Button title={busy?'Please wait...':'Logout'} tone="panel" disabled={busy} onPress={()=>void action('logout')}/>
  </Card>;
}
