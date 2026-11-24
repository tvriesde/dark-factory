"use strict";
// Segment road builder (classic pseudo-3D). Pure data; only trackMapCanvas touches the DOM.
const SEG=200, ROAD_W=1500, CAM_H=1000, DRAW_DIST=200, TUNNEL_H=2600;
function seeded(seed){let s=(seed*2654435761+12345)>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
const easeIn=(a,b,p)=>a+(b-a)*p*p, easeInOut=(a,b,p)=>a+(b-a)*(-Math.cos(p*Math.PI)/2+.5);
function buildTrack(def){
  const world=WORLDS[def.world], segs=[]; let y=0;
  for(const s of def.sections){
    const enter=Math.max(1,Math.round(s.n*.25)), leave=enter, hold=s.n-enter-leave, y0=y, y1=y+s.hill*SEG;
    for(let k=0;k<s.n;k++){
      const curve=k<enter?easeIn(0,s.curve,k/enter):k<enter+hold?s.curve:easeInOut(s.curve,0,(k-enter-hold)/leave);
      const y2=easeInOut(y0,y1,(k+1)/s.n);
      segs.push({i:segs.length,z:segs.length*SEG,curve,y1:y,y2,tunnel:s.tunnel,sprites:[],band:Math.floor(segs.length/3)%2,clipY:0});
      y=y2;
    }
  }
  const N=segs.length, drift=y; // close any residual so the lap end meets the start
  segs.forEach(s=>{s.y1-=drift*s.i/N;s.y2-=drift*(s.i+1)/N});
  // Props: seeded by track id so each track keeps its own scenery.
  const rnd=seeded(def.id+1), props=world.props, total=props.reduce((a,p)=>a+p.weight,0);
  const pick=()=>{let r=rnd()*total;for(const p of props){if((r-=p.weight)<=0)return p}return props[0]};
  const add=(i,kind,offset,w,cw,flip)=>{if(segs[i]&&!segs[i].tunnel)segs[i].sprites.push({kind,offset,w,cw,solid:true,flip:!!flip})};
  const density=def.world===1?.3:def.world===2?.22:.2;
  for(let i=6;i<N-4;i++){
    if(segs[i].tunnel)continue;
    for(const side of [-1,1]){
      if(rnd()<density*.5){const p=pick();add(i,p.kind,side*(p.min+rnd()*(p.max-p.min)),p.w*(.85+rnd()*.3),p.cw)}
    }
    if(world.edge.every&&i%world.edge.every===0)for(const side of [-1,1])add(i,world.edge.kind,side*world.edge.offset,world.edge.kind==="lamp"?.35:.08,.08);
  }
  // Curve warning chevrons on the outside of sharp bends.
  let at=0;
  for(const s of def.sections){
    if(Math.abs(s.curve)>=3&&!s.tunnel)for(let k=0;k<3;k++)add(at+2+k*7,"chev",-Math.sign(s.curve)*1.32,.34,.1,s.curve<0);
    at+=s.n;
  }
  // Tunnel entry/exit flags for portal drawing.
  segs.forEach((s,i)=>{s.portalIn=s.tunnel&&!segs[(i-1+N)%N].tunnel;s.portalOut=s.tunnel&&!segs[(i+1)%N].tunnel});
  // Minimap polyline: integrate heading from curves, then close heading and position.
  const raw=segs.map(s=>s.curve*.0042); let turn=raw.reduce((a,b)=>a+b,0);
  const target=(turn>=0?1:-1)*Math.PI*2, fix=(target-turn)/N;
  let h=0, px=0, pz=0; const pts=[];
  for(let i=0;i<N;i++){pts.push({x:px,z:pz});h+=raw[i]+fix;px+=Math.sin(h);pz-=Math.cos(h)}
  pts.forEach((p,i)=>{p.x-=px*i/N;p.z-=pz*i/N});
  return {def,world,segs,N,length:N*SEG,map:pts,mapCanvas:null};
}
function segAt(track,z){return track.segs[((Math.floor(z/SEG)%track.N)+track.N)%track.N]}
function trackMapCanvas(track,w,h){
  if(track.mapCanvas||typeof document==="undefined")return track.mapCanvas;
  const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d"),pts=track.map;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;pts.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z)});
  const pad=12, s=Math.min((w-pad*2)/(maxX-minX||1),(h-pad*2)/(maxZ-minZ||1)), ox=(w-(maxX-minX)*s)/2, oz=(h-(maxZ-minZ)*s)/2;
  track.mapPoint=i=>{const p=pts[((i%pts.length)+pts.length)%pts.length];return {x:ox+(p.x-minX)*s,y:oz+(p.z-minZ)*s}};
  g.lineJoin="round";g.lineCap="round";
  const path=()=>{g.beginPath();for(let i=0;i<=pts.length;i+=2){const q=track.mapPoint(i);i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y)}g.closePath()};
  g.strokeStyle="#0b1220";g.lineWidth=8;path();g.stroke();
  g.strokeStyle="#c3d0de";g.lineWidth=4;path();g.stroke();
  g.strokeStyle="#ffd36b";g.lineWidth=4;g.beginPath();track.segs.forEach((sg,i)=>{if(sg.tunnel){const a=track.mapPoint(i),b=track.mapPoint(i+1);g.moveTo(a.x,a.y);g.lineTo(b.x,b.y)}});g.globalAlpha=.6;g.stroke();g.globalAlpha=1;
  const a=track.mapPoint(0),b=track.mapPoint(6),ang=Math.atan2(b.y-a.y,b.x-a.x);
  g.save();g.translate(a.x,a.y);g.rotate(ang+Math.PI/2);for(let k=-2;k<2;k++)for(let r=0;r<2;r++){g.fillStyle=(k+r)%2?"#111":"#fff";g.fillRect(k*2.5,r*2.5-2.5,2.5,2.5)}g.restore();
  track.mapCanvas=c;return c;
}
