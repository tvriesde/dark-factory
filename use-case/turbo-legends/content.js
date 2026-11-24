"use strict";
const WORLDS = [
  {name:"Coast", color:"#e9bd7a", sky:"#87b9d1", ground:"#759d80", names:["Bay Loop","Clifftop Run","Harbor Switchbacks"]},
  {name:"Alps", color:"#d9e8ed", sky:"#90bbd2", ground:"#8aa7a1", names:["Valley Ring","Glacier Pass","Summit Hairpins"]},
  {name:"Neon City", color:"#ba74e8", sky:"#29294b", ground:"#38405a", names:["Neon Circuit","Elevated Express","Midnight District"]},
  {name:"Desert", color:"#eeb76b", sky:"#e6a976", ground:"#c89261", names:["Oasis Loop","Canyon Trail","Dune Ridge"]}
];
const TRACKS = WORLDS.flatMap((world,w)=>world.names.map((name,n)=>({
  id:w*3+n, name, world:w, difficulty:n+1, laps:3,
  radius:350+n*35+w*10, width:78-n*5,
  // Each closed centerline uses different harmonics and aspect ratios.
  shape:[.05+.035*n,.04+.02*w,.025+.018*n],
  aspect:1.04+((w*3+n)%4)*.1
})));
const CARS = [
  {name:"Comet",price:0,world:0,speed:1,accel:1,grip:1,brake:1},
  {name:"Rally",price:300,world:0,speed:.96,accel:1.08,grip:1.12,brake:1.05},
  {name:"Tide",price:1400,world:0,speed:1.12,accel:1.03,grip:.96,brake:1},
  {name:"Ibex",price:1900,world:1,speed:1.04,accel:1.1,grip:1.09,brake:1.05},
  {name:"Glacier",price:2500,world:1,speed:1.15,accel:.98,grip:1.06,brake:1.08},
  {name:"Pulse",price:3100,world:2,speed:1.13,accel:1.14,grip:.98,brake:1},
  {name:"Voltage",price:3800,world:2,speed:1.2,accel:1.06,grip:.94,brake:1.02},
  {name:"Dune",price:4500,world:3,speed:1.1,accel:1.12,grip:1.13,brake:1.1},
  {name:"Mirage",price:5200,world:3,speed:1.24,accel:1.12,grip:1.03,brake:1.08}
];
const UPGRADES = {
  engine:"Acceleration +8% per level", turbo:"Top speed +4% per level",
  tires:"Cornering grip +7% per level", brakes:"Braking +10% per level",
  suspension:"Off-road grip +8% per level", nitro:"Nitro capacity +20% per level"
};
const AI_NAMES=["Mika","Jett","Rosa","Kai","Nova","Axel","Zuri"];
const POINTS=[10,8,6,5,4,3,2,1];
function makeTrack(t){
  const points=[], count=160;
  for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2;
    const r=t.radius*(1+t.shape[0]*Math.sin(3*a+t.id*.7)+t.shape[1]*Math.cos(5*a+t.id)+t.shape[2]*Math.sin(7*a));
    points.push({x:Math.cos(a)*r*t.aspect,z:Math.sin(a)*r});
  }
  const lengths=[0]; let total=0;
  for(let i=0;i<count;i++){const a=points[i],b=points[(i+1)%count];total+=Math.hypot(b.x-a.x,b.z-a.z);lengths.push(total)}
  return {...t,points,lengths,total};
}
function pointAt(track, distance){
  let d=((distance%track.total)+track.total)%track.total;
  let i=0; while(i<track.points.length-1 && track.lengths[i+1]<d)i++;
  const a=track.points[i], b=track.points[(i+1)%track.points.length], f=(d-track.lengths[i])/(track.lengths[i+1]-track.lengths[i]);
  return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,angle:Math.atan2(b.x-a.x,b.z-a.z)};
}
function nearest(track,x,z){
  let best={dist:Infinity,progress:0,side:0};
  for(let i=0;i<track.points.length;i++){
    const a=track.points[i],b=track.points[(i+1)%track.points.length],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
    const f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len2));
    const px=a.x+f*dx,pz=a.z+f*dz,dist=Math.hypot(x-px,z-pz);
    if(dist<best.dist)best={dist,progress:track.lengths[i]+Math.sqrt(len2)*f,side:((x-px)*dz-(z-pz)*dx)/Math.sqrt(len2)};
  }
  return best;
}
