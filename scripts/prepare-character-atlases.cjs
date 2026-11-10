const fs=require('node:fs'),{PNG}=require('pngjs');
const dir='src/assets/runner/';
function prepare(file,rows,counts,out){const p=PNG.sync.read(fs.readFileSync(dir+file)),frames=[];
 for(let r=0;r<counts.length;r++)for(let c=0;c<counts[r];c++){
  const left=Math.ceil(c*p.width/counts[r])+2,right=Math.floor((c+1)*p.width/counts[r])-2,top=rows[r]+1,bottom=rows[r+1]-1;let x0=right,y0=bottom,x1=left,y1=top;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(p.data[(y*p.width+x)*4+3]>150){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  if(x1<=x0||y1<=y0)throw Error('Empty '+file+' frame '+frames.length);
  frames.push({x:x0-1,y:y0-1,w:x1-x0+3,h:y1-y0+3});
 }
 const data={width:p.width,height:p.height,frames};fs.writeFileSync(dir+out,JSON.stringify(data,null,2));console.log(file,p.width,p.height,frames.length);return data;
}
function regular(file,columns,rows,out){const p=PNG.sync.read(fs.readFileSync(dir+file));return prepare(file,Array.from({length:rows+1},(_,r)=>Math.round(r*p.height/rows)),Array(rows).fill(columns),out);}
prepare('blue-courier-back-v1.png',[0,312,634,936,1269],[4,4,4,4],'boy-back-frames.json');
prepare('girl-courier-back-v1.png',[0,332,670,969,1269],[4,4,4,4],'girl-back-frames.json');
regular('courier-turntable-v1.png',4,2,'boy-turntable-frames.json');
regular('girl-turntable-v1.png',4,2,'girl-turntable-frames.json');
prepare('matching-chasers-run-v1.png',[0,350,655,1024],[5,5,6],'chaser-run-frames.json');
