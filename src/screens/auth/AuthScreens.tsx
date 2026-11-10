import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { MenuLayout } from '../../components/MenuLayout';
import { Button, Card, Header } from '../../components/ui';
import { theme as t } from '../../theme/theme';
import { login, signup, googleLogin, resetPassword } from '../../services/firebase/authService';
import { firebaseMessage } from '../../services/firebase/errors';
import { useAuth } from '../../store/authStore';

export const authStyles=StyleSheet.create({input:{backgroundColor:t.colors.night,color:t.colors.text,fontFamily:t.font.bold,fontSize:17,borderWidth:2,borderColor:t.colors.outline,borderRadius:18,padding:15},copy:{color:t.colors.muted,fontFamily:t.font.regular,fontSize:14,lineHeight:21},message:{color:t.colors.gold,fontFamily:t.font.bold,fontSize:14,lineHeight:21},card:{gap:16}});
function AuthForm({navigation,mode}:{navigation:any;mode:'login'|'signup'|'reset'}) {
  const {configured,error:setupError,retry}=useAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false);
  const submit=async(google=false)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
    try{
      if(google)await googleLogin();else if(mode==='login')await login(email,password);
      else if(mode==='signup')await signup(email,password,name);
      else {await resetPassword(email);setMessage('Agar account exists hai, reset email bhej diya. Inbox aur spam check karo.');}
    }catch(error){setMessage(firebaseMessage(error));}finally{lock.current=false;setBusy(false);}
  };
  const title=mode==='login'?'Welcome, courier!':mode==='signup'?'Join the rush!':'Forgot password?';
  return <MenuLayout><Header title={title} subtitle="Your next delivery starts here."/><Card style={authStyles.card}>
    {!!setupError&&<><Text style={authStyles.message}>{setupError}</Text><Button title="Retry connection" compact onPress={retry}/></>}
    {!configured&&<Text style={authStyles.message}>Online account setup pending. Aap offline khel sakte hain.</Text>}
    {mode==='signup'&&<TextInput style={authStyles.input} accessibilityLabel="Display name" placeholder="Courier name" placeholderTextColor={t.colors.muted} value={name} onChangeText={setName} maxLength={20} editable={!busy}/>}
    <TextInput style={authStyles.input} accessibilityLabel="Email" placeholder="Email" placeholderTextColor={t.colors.muted} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} editable={!busy}/>
    {mode!=='reset'&&<TextInput style={authStyles.input} accessibilityLabel="Password" placeholder="Password" placeholderTextColor={t.colors.muted} secureTextEntry autoCapitalize="none" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChangeText={setPassword} editable={!busy}/>}
    <Button title={busy?'One moment...':mode==='login'?'Login':mode==='signup'?'Create account':'Send reset email'} tone="green" disabled={busy||!configured} onPress={()=>void submit()}/>
    {mode!=='reset'&&<Button title="Continue with Google" tone="teal" disabled={busy||!configured} onPress={()=>void submit(true)}/>}
    {!!message&&<Text accessibilityLiveRegion="polite" style={authStyles.message}>{message}</Text>}
    {mode==='login'?<><Button title="Create an account" compact tone="panel" disabled={busy} onPress={()=>navigation.navigate('Signup')}/><Button title="Forgot password?" compact tone="panel" disabled={busy} onPress={()=>navigation.navigate('ForgotPassword')}/></>:<Button title="Back to login" compact tone="panel" disabled={busy} onPress={()=>navigation.navigate('Login')}/>}
    {!configured&&<Button title="Play offline" tone="blue" onPress={()=>navigation.navigate('MainMenu')}/>}
  </Card></MenuLayout>;
}
export const LoginScreen=({navigation}:{navigation:any})=><AuthForm navigation={navigation} mode="login"/>;
export const SignupScreen=({navigation}:{navigation:any})=><AuthForm navigation={navigation} mode="signup"/>;
export const ForgotPasswordScreen=({navigation}:{navigation:any})=><AuthForm navigation={navigation} mode="reset"/>;
