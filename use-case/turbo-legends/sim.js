"use strict";
// Shared car model for the player and AI. Fixed 1/60 s steps; no DOM access.
const STEP=1/60, REF=10000, CAR_W=.24, CAR_LEN=360, CENTRIFUGAL=.5, STEER_RATE=2.1;
function carStats(carIndex,up){
  const car=CARS[carIndex],u=k=>up[k]||0;
  return {top:REF*car.speed*(1+.04*u("turbo")+.015*u("engine")),accel:car.accel*(1+.08*u("engine")+.03*u("turbo")),
    brake:car.brake*(1+.1*u("brakes")),grip:car.grip*(1+.07*u("tires")),susp:1+.08*u("suspension"),maxNitro:100*(1+.2*u("nitro"))};
}
function newCar(id,name,stats,z,x,lap){
  return {id,name,z,x,lap,speed:0,stats,nitro:stats.maxNitro,maxNitro:stats.maxNitro,nitroActive:false,nitroHeld:false,nitroUses:0,
    drift:0,drifting:false,driftTime:0,steer:0,wallHits:0,hitCool:0,offroad:false,finished:false,finishTime:null,ai:null,yaw:0};
}
function wrapDelta(d,L){d%=L;if(d>L/2)d-=L;if(d<-L/2)d+=L;return d}
function progressOf(c,L){return c.lap*L+c.z}
// difficulty factor: easy .88 / normal .96 / hard 1.04, +.02 per environment, +.01 per round in career/championship.
function aiFactor(difficulty,world,round){return (DIFFICULTY[difficulty]||DIFFICULTY.normal)+.02*world+.01*(round||0)}
function createRace(opts){
  const track=buildTrack(TRACKS[opts.trackId]),L=track.length,cars=[];
  const slot=k=>({z:L-SEG*2-Math.floor(k/2)*SEG*3,x:k%2?.42:-.42});
  const playerSlot=opts.solo?0:4, ps=slot(playerSlot);
  const player=newCar(0,"You",opts.playerStats,ps.z,opts.solo?0:ps.x,-1);cars.push(player);
  if(!opts.solo){
    const factor=aiFactor(opts.difficulty,track.def.world,opts.round), grid=[0,1,2,3,5,6,7];
    AI_NAMES.forEach((name,i)=>{
      const persona=PERSONALITIES[AI_SEATS[i]], top=REF*(1+.06*track.def.world)*factor*persona.topMul;
      const st={top,accel:1+.05*track.def.world,brake:1.05,grip:1+.05*track.def.world,susp:1,maxNitro:0};
      const s=slot(grid[i]),c=newCar(i+1,name,st,s.z,s.x,-1);
      c.ai={persona,personaName:AI_SEATS[i],lane:(i%3-1)*.35,mistake:0,mistakeKind:"",blockT:0,targetX:s.x,rand:seeded(opts.trackId*31+i+7)};
      c.look=AI_LOOKS[i];cars.push(c);
    });
  }
  return {track,cars,player,time:0,countdown:3,laps:track.def.laps,events:[],pairCool:{},order:[],finishedCount:0};
}
function aiInput(car,race){
  const t=race.track,L=t.length,a=car.ai,P=a.persona,sp=car.speed/REF;
  // Look ahead for the sharpest bend and its direction.
  let maxC=0,dirC=0;const base=Math.floor(car.z/SEG);
  for(let k=2;k<P.lookahead;k++){const s=t.segs[(base+k)%t.N];if(Math.abs(s.curve)>Math.abs(maxC))maxC=s.curve;if(k<20)dirC+=s.curve}
  const here=t.segs[base%t.N].curve;
  let target=a.lane*.4+Math.sign(dirC||here)*Math.min(1,Math.abs(dirC||here)/40+.25)*P.lineBias*.55;
  // Overtake: slower car ahead within overtakeGap → move to the side with more room.
  let ahead=null,best=Infinity;
  for(const o of race.cars){if(o===car||o.finished&&o!==race.player)continue;const dz=wrapDelta(o.z-car.z,L);if(dz>0&&dz<P.overtakeGap&&dz<best&&Math.abs(o.x-car.x)<CAR_W*1.6){best=dz;ahead=o}}
  if(ahead&&ahead.speed<car.speed*1.01){target=ahead.x>0?ahead.x-.55:ahead.x+.55;if(Math.abs(target)>.85)target=ahead.x>0?ahead.x-.55:ahead.x+.55}
  // Defensive blocking: occasionally shadow a close follower's line.
  a.blockT-=STEP;
  if(!ahead){for(const o of race.cars){if(o===car)continue;const dz=wrapDelta(car.z-o.z,L);if(dz>0&&dz<900&&o.speed>car.speed){if(a.blockT<=0&&a.rand()<P.blockChance*STEP*6)a.blockT=1.2;if(a.blockT>0)target=o.x;break}}}
  // Mistakes: run wide or lift for 0.5–1.5 s, then recover.
  if(a.mistake>0)a.mistake-=STEP;else if(a.rand()<P.mistakeRate*STEP){a.mistake=.5+a.rand();a.mistakeKind=a.rand()<.5?"wide":"lift"}
  if(a.mistake>0&&a.mistakeKind==="wide")target=-Math.sign(maxC||1)*1.05;
  target=Math.max(-.85,Math.min(.85,target));a.targetX+=(target-a.targetX)*Math.min(1,STEP*3);
  // Speed: brake if speed²·|curve| would exceed this driver's corner limit.
  let want=car.stats.top*(race.rubber?race.rubber(car):1);
  const limitSp=Math.abs(maxC)>.3?Math.sqrt(P.cornerLimit*car.stats.grip/Math.abs(maxC)):9;
  want=Math.min(want,limitSp*REF);
  const lift=a.mistake>0&&a.mistakeKind==="lift";
  const err=a.targetX-car.x;
  const counter=here*sp*sp*CENTRIFUGAL/car.stats.grip/(STEER_RATE*Math.min(1,.35+sp));
  return {throttle:!lift&&car.speed<want,brake:car.speed>want+REF*.06,steer:Math.max(-1,Math.min(1,err*4+counter)),drift:false,nitro:false,want};
}
function hitWall(car,race,pushTo){
  car.x=pushTo;
  if(car.hitCool<=0){car.speed*=.45;car.wallHits++;car.hitCool=.5;race.events.push({type:"wall",car})}
}
function stepCar(car,inp,race,dt){
  const t=race.track,L=t.length,st=car.stats,seg=segAt(t,car.z),sp=car.speed/REF;
  car.hitCool=Math.max(0,car.hitCool-dt);
  car.offroad=Math.abs(car.x)>1;
  // Nitro: each new press that fires counts as a use; cannot fire when empty.
  const edge=inp.nitro&&!car.nitroHeld;car.nitroHeld=!!inp.nitro;
  if(edge&&car.nitro<=0.5)race.events.push({type:"nitroEmpty",car});
  const canNitro=inp.nitro&&car.nitro>0&&car.speed>st.top*.15&&(car.nitroActive||edge&&car.nitro>.5);
  if(canNitro&&!car.nitroActive){car.nitroUses++;race.events.push({type:"nitro",car})}
  car.nitroActive=canNitro;
  let limit=st.top;
  if(car.nitroActive){limit*=1.25;car.nitro=Math.max(0,car.nitro-26*dt)}else car.nitro=Math.min(car.maxNitro,car.nitro+2.5*dt);
  const A=REF*.3*st.accel;
  if(inp.throttle)car.speed+=A*(1-.55*Math.min(1,car.speed/limit))*dt*(car.nitroActive?1.8:1);
  else car.speed-=REF*.12*dt;
  if(inp.brake)car.speed-=REF*.95*st.brake*dt;
  if(car.speed>limit)car.speed=Math.max(limit,car.speed-REF*.45*dt);
  if(car.offroad){const offTop=st.top*.5*Math.min(1.4,st.susp);if(car.speed>offTop)car.speed=Math.max(offTop,car.speed-REF*.9*dt/st.susp)}
  // Drift: sharper steering, sideways slide, small speed loss; grip returns smoothly on release.
  car.drifting=!!inp.drift&&Math.abs(inp.steer)>.1&&sp>.3;
  if(car.drifting){car.driftTime+=dt;car.speed-=REF*.05*dt}
  car.drift+=((car.drifting?Math.sign(inp.steer):0)-car.drift)*Math.min(1,dt*(car.drifting?6:3));
  car.steer+=(inp.steer-car.steer)*Math.min(1,dt*(car.ai?8:14));
  const steerMul=1+.4*Math.abs(car.drift), rate=STEER_RATE*Math.min(1,.35+sp)*Math.min(1,sp*8)*steerMul*(car.offroad?.85:1);
  car.x+=car.steer*rate*dt;
  car.x-=seg.curve*sp*sp*CENTRIFUGAL/(st.grip*(car.offroad?.85*st.susp:Math.min(1.15,.95+.05*st.susp)))*dt;
  if(car.drifting)car.x-=Math.sign(inp.steer)*.12*sp*dt;
  car.yaw=car.steer*.6+car.drift*.5;
  car.speed=Math.max(0,car.speed);
  // Never stuck: minimum crawl with throttle.
  if(inp.throttle&&car.speed<REF*.08)car.speed=REF*.08;
  // Solid scenery and tunnel walls.
  if(seg.tunnel&&Math.abs(car.x)>.9)hitWall(car,race,Math.sign(car.x)*.84);
  else if(car.offroad){
    for(const s of seg.sprites){if(!s.solid)continue;const reach=(s.cw+CAR_W)/2;if(Math.abs(car.x-s.offset)<reach){hitWall(car,race,s.offset-Math.sign(s.offset)*(reach+.02));break}}
  }
  car.x=Math.max(-2.5,Math.min(2.5,car.x));
  car.z+=car.speed*dt;
  if(car.z>=L){car.z-=L;car.lap++;race.events.push({type:"lap",car});
    if(car.lap>=race.laps&&!car.finished){car.finished=true;car.finishTime=race.time;race.finishedCount++;race.events.push({type:"finish",car})}}
}
function collideCars(race){
  const cars=race.cars,L=race.track.length;
  for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++){
    const a=cars[i],b=cars[j],dz=wrapDelta(b.z-a.z,L),dx=b.x-a.x;
    if(Math.abs(dz)>=CAR_LEN||Math.abs(dx)>=CAR_W)continue;
    const front=dz>=0?b:a,rear=front===b?a:b;
    const push=(CAR_W-Math.abs(dx))/2+.01,dir=dx>=0?1:-1;
    a.x-=dir*push;b.x+=dir*push;
    if(rear.speed>front.speed*.92){rear.speed=front.speed*.92}
    const key=a.id*8+b.id;
    if(!(race.pairCool[key]>race.time)){race.pairCool[key]=race.time+.5;race.events.push({type:"bump",a,b})}
  }
}
function rankCars(race){
  const L=race.track.length;
  return [...race.cars].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:progressOf(b,L)-progressOf(a,L));
}
function stepRace(race,playerInput,dt){
  race.time+=dt;race.events.length=0;
  const p=race.player,L=race.track.length;
  // Mild catch-up so the pack stays in sight but positions are still earned.
  race.rubber=c=>{if(p.finished)return 1;const g=progressOf(p,L)-progressOf(c,L);return 1+Math.max(-.04,Math.min(.04,g/150000))};
  for(const c of race.cars){
    const inp=c===p&&!p.finished?playerInput:(c.ai?aiInput(c,race):autoInput(c,race));
    stepCar(c,inp,race,dt);
  }
  collideCars(race);
  race.order=rankCars(race);
}
// After the player finishes, an autopilot keeps the car rolling during the finish banner.
function autoInput(car,race){
  if(!car.ai)car.ai={persona:PERSONALITIES.Balanced,lane:0,mistake:0,mistakeKind:"",blockT:0,targetX:car.x,rand:seeded(99)};
  const i=aiInput(car,race);i.throttle=car.speed<car.stats.top*.6;i.brake=false;return i;
}
