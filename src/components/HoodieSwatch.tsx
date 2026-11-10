import React from 'react';
import { StyleSheet, View } from 'react-native';

/** Small native wardrobe icon; not a preview of the 3D outfit. */
export function HoodieSwatch() {
  return <View accessible={false} style={s.root}><View style={s.hood}/><View style={s.left}/><View style={s.right}/><View style={s.body}/><View style={s.zip}/><View style={s.pocket}/></View>;
}
const s=StyleSheet.create({
  root:{width:70,height:74},hood:{position:'absolute',left:20,top:3,width:30,height:29,borderRadius:14,backgroundColor:'#FFFFFFD9',borderWidth:5,borderColor:'#FFFFFF70'},body:{position:'absolute',left:15,top:22,width:40,height:46,borderRadius:9,backgroundColor:'#FFFFFFDD'},left:{position:'absolute',left:3,top:24,width:18,height:40,borderRadius:8,backgroundColor:'#FFFFFFDD',transform:[{rotate:'17deg'}]},right:{position:'absolute',right:3,top:24,width:18,height:40,borderRadius:8,backgroundColor:'#FFFFFFDD',transform:[{rotate:'-17deg'}]},zip:{position:'absolute',left:34,top:24,width:2,height:43,backgroundColor:'#42639166'},pocket:{position:'absolute',left:23,top:49,width:24,height:12,borderRadius:4,borderWidth:1,borderColor:'#42639144'},
});
