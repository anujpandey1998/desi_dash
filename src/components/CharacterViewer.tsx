import React,{useMemo,useRef,useState} from 'react';
import {Image,PanResponder,Text,View} from 'react-native';
import {CHARACTER_ART} from '../game3d/characterArt';
import type {CharacterId} from '../game3d/profile';
import {Button,Card} from './ui';
import {theme as t} from '../theme/theme';
const names=['Front','Front right','Right side','Back right','Back','Back left','Left side','Front left'];
export function CharacterViewer({character}:{character:CharacterId}){
  const [angle,setAngle]=useState(4),angleRef=useRef(4),start=useRef(4);
  const select=(value:number)=>{const next=(value%8+8)%8;angleRef.current=next;setAngle(next);};
  const pan=useMemo(()=>PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>8&&Math.abs(g.dx)>Math.abs(g.dy),onPanResponderGrant:()=>{start.current=angleRef.current;},onPanResponderMove:(_,g)=>select(start.current+Math.round(g.dx/32))}),[]);
  const art=CHARACTER_ART[character],f=art.turnFrames.frames[angle],scale=Math.min(210/f.w,270/f.h);
  return <Card light style={{alignItems:'center',gap:12}}>
    <Text style={{fontFamily:t.font.bold,color:t.colors.ink,fontSize:22}}>Your courier - 360 view</Text>
    <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={'Character view, '+names[angle]} accessibilityActions={[{name:'increment',label:'Turn right'},{name:'decrement',label:'Turn left'}]} onAccessibilityAction={e=>select(angleRef.current+(e.nativeEvent.actionName==='increment'?1:-1))} style={{width:'100%',height:286,alignItems:'center',justifyContent:'flex-end'}}>
      <View style={{width:f.w*scale,height:f.h*scale,overflow:'hidden'}}><Image source={art.turntable} fadeDuration={0} style={{position:'absolute',width:art.turnFrames.width*scale,height:art.turnFrames.height*scale,left:-f.x*scale,top:-f.y*scale}}/></View>
    </View>
    <Text style={{fontFamily:t.font.bold,color:t.colors.ink}}>{angle*45} degrees - {names[angle]}</Text>
    <Text style={{fontFamily:t.font.regular,color:'#526B8D',textAlign:'center'}}>Drag to rotate. Gameplay always uses the back view.</Text>
    <Text style={{fontFamily:t.font.regular,color:'#526B8D',textAlign:'center',fontSize:11}}>Equipped hoodie colours appear during runs.</Text>
    <View style={{flexDirection:'row',gap:12}}><Button compact title="Turn left" tone="panel" onPress={()=>select(angleRef.current-1)}/><Button compact title="Turn right" tone="teal" onPress={()=>select(angleRef.current+1)}/></View>
  </Card>;
}
