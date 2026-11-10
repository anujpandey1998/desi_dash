import React from 'react';
import {Image,View} from 'react-native';
import {CHARACTER_ART} from '../game3d/characterArt';
import type {CharacterId} from '../game3d/profile';
export function CharacterPortrait({character,angle=0,width,height}:{character:CharacterId;angle?:number;width:number;height:number}){
  const art=CHARACTER_ART[character],f=art.turnFrames.frames[(angle%8+8)%8],scale=Math.min(width/f.w,height/f.h);
  return <View style={{width,height,alignItems:'center',justifyContent:'flex-end'}}><View style={{width:f.w*scale,height:f.h*scale,overflow:'hidden'}}><Image source={art.turntable} fadeDuration={0} accessibilityLabel={character==='girl'?'Girl courier':'Boy courier'} style={{position:'absolute',width:art.turnFrames.width*scale,height:art.turnFrames.height*scale,left:-f.x*scale,top:-f.y*scale}}/></View></View>;
}
