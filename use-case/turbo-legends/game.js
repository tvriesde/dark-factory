"use strict";
const $=id=>document.getElementById(id);
let page="home", setupMode="quick", selectedTrack=0, selectedCar=0, draft=defaultStyle(), garageAngle=.6, settingsReturn="home";
let race=null, paused=false, modalReturn=null, lastFocus=null, keys={}, lastFrame=0, accumulator=0, resultProcessed=false;
const canvas=$("raceCanvas"), ctx=canvas.getContext("2d"), mini=$("minimap").getContext("2d"), garageCtx=$("garageCanvas").getContext("2d");
loadData();
function showWarning(){$("warning").textContent=storageWarning;$("warning").hidden=!storageWarning}
function announce(text){$("status").textContent=text}
function updateWallet(){$("wallet").textContent="$"+data.cash.toLocaleString()}
function showPage(name){
  page=name; document.querySelectorAll(".screen,.race-screen").forEach(el=>el.hidden=el.id!==name);
  $("footer").hidden=name==="race"; updateWallet(); showWarning();
  if(name==="garage")renderGarage();
  if(name==="settings")renderSettings();
  window.scrollTo(0,0);
}
function button(text,fn,kind="secondary"){const b=document.createElement("button");b.className=kind;b.textContent=text;b.addEventListener("click",fn);return b}
function closeModal(){if($("modal").hidden)return;$("modal").hidden=true;$("modalActions").replaceChildren();if(lastFocus&&lastFocus.isConnected)lastFocus.focus()}
function modal(title,text,actions,kicker="TURBO LEGENDS"){
  lastFocus=document.activeElement;$("modalKicker").textContent=kicker;$("modalTitle").textContent=title;$("modalText").textContent=text;
  const box=$("modalActions");box.replaceChildren();actions.forEach(a=>box.append(button(a[0],a[1],a[2]||"secondary")));$("modal").hidden=false;box.querySelector("button").focus();
}
function showPause(){
  if(!race||page!=="race"||paused)return;
  paused=true;keys={};engineSound(0,false);
  modal("Race paused","Take a breath. Your race is frozen.",[
    ["Resume",resumeRace,"primary"],["Settings",()=>{closeModal();settingsReturn="pause";showPage("settings")}],
    ["Restart",()=>confirmRaceAction("Restart race?","Your current race progress will be lost.",()=>{closeModal();startRace()})],
    ["Exit race",()=>confirmRaceAction("Exit race?","Your current race progress will be lost. No rewards will be awarded.",()=>{closeModal();race=null;paused=false;showPage("home")})]
  ],"PAUSED");
}
function resumeRace(){closeModal();paused=false;lastFrame=performance.now();accumulator=0;$("pauseButton").focus()}
function confirmRaceAction(title,text,fn){closeModal();modal(title,text,[["Cancel",()=>{closeModal();paused=false;showPause()}],["Confirm",fn,"primary"]],"ARE YOU SURE?")}
function setup(mode){
  setupMode=mode;selectedTrack=mode==="career"?(data.championship?data.championship.world*3+data.championship.round:data.world*3):0;
  $("setupKicker").textContent=mode==="career"?"FOUR WORLDS / THREE ROUNDS":mode==="trial"?"YOU AGAINST THE CLOCK":"THE ROAD IS CALLING";
  $("setupTitle").textContent=mode==="career"?"Career championship":mode==="trial"?"Time trial":"Quick race";
  $("setupDescription").textContent=mode==="career"?"Race three rounds for points. Win the championship to unlock the next world.":mode==="trial"?"Set a personal best with your selected car. No rivals, just the road.":"Choose an unlocked track and race seven rivals.";
  renderTracks();showPage("setup");
}
function trackUnlocked(id){return data.tracks.includes(id)}
function renderTracks(){
  const list=$("trackList");list.replaceChildren();
  TRACKS.forEach(t=>{
    const b=document.createElement("button");b.className="track"+(selectedTrack===t.id?" selected":"")+(trackUnlocked(t.id)?"":" locked");
    const title=document.createElement("strong"),small=document.createElement("small");title.textContent=t.name;
    let reason=trackUnlocked(t.id)?"Unlocked":t.world>data.world?"Win the previous championship":"Complete the previous track";
    if(setupMode==="career"&&t.id===selectedTrack)reason="Championship round";
    small.textContent=WORLDS[t.world].name+" · "+reason;b.append(title,small);
    b.addEventListener("click",()=>{if(setupMode==="career"){announce("Career tracks follow the championship round order.");return}if(!trackUnlocked(t.id)){announce(reason);return}selectedTrack=t.id;renderTracks()});
    list.append(b);
  });
  const t=TRACKS[selectedTrack];$("selectedTrack").textContent=t.name;$("trackDetail").textContent=WORLDS[t.world].name+" · Difficulty "+t.difficulty+"/3 · "+t.laps+" laps";
  $("setupNote").textContent=setupMode==="career"?"Round "+((data.championship?.round||0)+1)+" of 3 · 10 / 8 / 6 / 5 / 4 / 3 / 2 / 1 points":"Selected car: "+CARS[data.selected].name;
  $("difficulty").disabled=setupMode==="trial";
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>{audioStart();const target=b.dataset.page;if(["quick","career","trial"].includes(target))setup(target);else showPage(target)}));
$("brand").addEventListener("click",e=>{e.preventDefault();if(page==="race"){showPause();return}showPage("home")});
$("raceNow").addEventListener("click",()=>{audioStart();setupMode="quick";selectedTrack=0;startRace()});
$("startRace").addEventListener("click",()=>{audioStart();startRace()});
$("settingsLink").addEventListener("click",()=>{audioStart();settingsReturn=page;showPage("settings")});
$("settingsBack").addEventListener("click",()=>{if(settingsReturn==="pause"){showPage("race");paused=false;showPause()}else showPage(settingsReturn)});
function renderSettings(){
  const s=data.settings;["music","effects"].forEach(k=>{$(k+"Volume").value=s[k];$(k+"Mute").checked=s[k+"Mute"]});$("reduceMotion").checked=s.reduceMotion;
}
["music","effects"].forEach(k=>{$(k+"Volume").addEventListener("input",e=>{data.settings[k]=Number(e.target.value);saveData()});$(k+"Mute").addEventListener("change",e=>{data.settings[k+"Mute"]=e.target.checked;saveData()})});
$("reduceMotion").addEventListener("change",e=>{data.settings.reduceMotion=e.target.checked;saveData()});
$("resetData").addEventListener("click",()=>modal("Reset all progress?","This permanently removes your saved cars, cash, career and records.",[["Cancel",closeModal],["Reset progress",()=>{resetStorage();closeModal();showWarning();renderSettings();updateWallet();announce("Progress reset.")},"danger"]]));

function getUpgrade(car,key){return data.upgrades[car]?.[key]||0}
function renderGarage(){
  const select=$("carSelect");select.replaceChildren();
  CARS.forEach((car,i)=>{const o=document.createElement("option");o.value=i;o.textContent=car.name+" · "+(data.owned.includes(i)?"Owned":car.world>data.world?"Locked: win "+WORLDS[car.world-1].name:"$"+car.price);select.append(o)});
  select.value=selectedCar;
  const car=CARS[selectedCar],owned=data.owned.includes(selectedCar);
  $("carInfo").textContent="Speed "+Math.round(car.speed*100)+" · Acceleration "+Math.round(car.accel*100)+" · Grip "+Math.round(car.grip*100)+" · Braking "+Math.round(car.brake*100);
  $("buyCar").textContent=owned?"Owned":car.world>data.world?"Unlock "+WORLDS[car.world].name+" first":"Buy for $"+car.price;
  $("buyCar").disabled=owned||car.world>data.world||data.cash<car.price;
  $("useCar").disabled=!owned||selectedCar===data.selected;$("useCar").textContent=selectedCar===data.selected?"Selected car":"Use this car";
  const tuning=$("tuning");tuning.replaceChildren();
  Object.entries(UPGRADES).forEach(([key,desc])=>{
    const level=getUpgrade(selectedCar,key),row=document.createElement("div"),info=document.createElement("div"),title=document.createElement("strong"),small=document.createElement("small");
    row.className="upgrade";title.textContent=key[0].toUpperCase()+key.slice(1)+" · "+level+"/5";small.textContent=desc;info.append(title,small);
    const cost=200*(level+1),b=button(level===5?"MAX":"Upgrade $"+cost,()=>{if(!data.owned.includes(selectedCar)||level>=5||data.cash<cost)return;data.cash-=cost;data.upgrades[selectedCar]??={};data.upgrades[selectedCar][key]=level+1;saveData();updateWallet();renderGarage();announce(key+" upgraded to level "+(level+1))});
    b.disabled=!owned||level===5||data.cash<cost;row.append(info,b);tuning.append(row);
  });
  for(const key of ["paint","wheels","stripes","spoiler","body"])$(key).value=draft[key];
  drawGarage();
}
$("carSelect").addEventListener("change",e=>{selectedCar=Number(e.target.value);draft={...(data.styles[selectedCar]||defaultStyle())};renderGarage()});
$("buyCar").addEventListener("click",()=>{const c=CARS[selectedCar];if(data.owned.includes(selectedCar)||c.world>data.world||data.cash<c.price)return;data.cash-=c.price;data.owned.push(selectedCar);saveData();renderGarage();updateWallet();announce(c.name+" purchased")});
$("useCar").addEventListener("click",()=>{if(!data.owned.includes(selectedCar))return;data.selected=selectedCar;saveData();renderGarage();announce(CARS[selectedCar].name+" selected")});
$("tuneTab").addEventListener("click",()=>{ $("tuning").hidden=false;$("styling").hidden=true;$("tuneTab").setAttribute("aria-pressed","true");$("styleTab").setAttribute("aria-pressed","false")});
$("styleTab").addEventListener("click",()=>{ $("tuning").hidden=true;$("styling").hidden=false;$("tuneTab").setAttribute("aria-pressed","false");$("styleTab").setAttribute("aria-pressed","true")});
["paint","wheels","stripes","spoiler","body"].forEach(k=>$(k).addEventListener("change",e=>{draft[k]=e.target.value;drawGarage()}));
$("applyStyle").addEventListener("click",()=>{if(!data.owned.includes(selectedCar)){announce("Buy this car before applying appearance.");return}data.styles[selectedCar]={...draft};saveData();announce("Appearance applied")});
$("rotateLeft").addEventListener("click",()=>{garageAngle-=.3;drawGarage()});$("rotateRight").addEventListener("click",()=>{garageAngle+=.3;drawGarage()});
function drawGarage(){
  const c=garageCtx,w=c.canvas.width,h=c.canvas.height;c.clearRect(0,0,w,h);
  c.fillStyle="#101928";c.beginPath();c.ellipse(w/2,h*.75,200,40,0,0,Math.PI*2);c.fill();
  // Orthographic box projection for a rotatable polygon model.
  const a=garageAngle,proj=(x,y,z)=>({x:w/2+(x*Math.cos(a)-z*Math.sin(a))*2.2,y:h*.59-y*2.2+(x*Math.sin(a)+z*Math.cos(a))*.65});
  const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach((p,i)=>{const q=proj(...p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.closePath();c.fill()};
  const wide=draft.body==="Wide"?48:draft.body==="Aero"?38:42;
  for(const x of [-wide,wide])for(const z of [-55,55]){const p=proj(x,4,z);c.fillStyle="#0a0e17";c.beginPath();c.ellipse(p.x,p.y,19,23,0,0,Math.PI*2);c.fill();c.fillStyle=draft.wheels==="Gold"?"#e8bf57":draft.wheels==="Sport"?"#dce7ed":"#75869a";c.beginPath();c.arc(p.x,p.y,9,0,Math.PI*2);c.fill()}
  poly([[-wide,10,-75],[wide,10,-75],[wide,10,75],[-wide,10,75]],draft.paint);
  poly([[-wide,10,75],[wide,10,75],[wide,28,65],[-wide,28,65]],"#9c4137");
  poly([[-wide,28,-65],[wide,28,-65],[wide,28,65],[-wide,28,65]],draft.paint);
  if(draft.body==="Aero")poly([[-wide,28,-65],[wide,28,-65],[wide*.65,32,-78],[-wide*.65,32,-78]],"#aab9c5");
  poly([[-29,28,-24],[29,28,-24],[24,50,-5],[-24,50,-5]],"#263b50");
  poly([[-24,50,-5],[24,50,-5],[24,50,30],[-24,50,30]],"#8db1c4");
  poly([[-24,50,30],[24,50,30],[29,28,48],[-29,28,48]],"#263b50");
  if(draft.stripes!=="None"){for(const x of draft.stripes==="Twin"?[-12,12]:[0])poly([[x-3,29,-64],[x+3,29,-64],[x+3,29,-25],[x-3,29,-25]],"#f9ebcd")}
  if(draft.spoiler!=="None"){const height=draft.spoiler==="Wing"?51:42;poly([[-wide,height,60],[wide,height,60],[wide,height,68],[-wide,height,68]],"#e8edf2")}
}

function startRace(){
  if(setupMode==="career"&&!data.championship)data.championship={world:Math.floor(selectedTrack/3),round:0,points:Array(8).fill(0)};
  if(setupMode==="career")selectedTrack=data.championship.world*3+data.championship.round;
  const track=makeTrack(TRACKS[selectedTrack]),start=pointAt(track,75),car=CARS[data.selected],up=key=>getUpgrade(data.selected,key);
  const player={id:0,name:"You",x:start.x,z:start.z,angle:start.angle,speed:0,nitro:100+20*up("nitro"),maxNitro:100+20*up("nitro"),progress:75,lap:0,checkpoint:1,finished:false,finishTime:null,car,up};
  const rivals=setupMode==="trial"?[]:AI_NAMES.map((name,i)=>({id:i+1,name,progress:64-i*8,lap:0,speed:0,lane:(i%2?1:-1)*(12+(i%3)*5),personality:.93+i*.023,mistake:0,finished:false,finishTime:null}));
  race={track,player,rivals,time:0,countdown:3,elapsed:0,mode:setupMode,difficulty:$("difficulty").value,collisionCooldown:0,driftCooldown:0,lastBeep:4};
  resultProcessed=false;paused=false;keys={};showPage("race");resizeCanvas();lastFrame=performance.now();accumulator=0;$("pauseButton").focus();announce("Race starting. Arrow keys or WASD drive, Space drifts, Shift boosts, Escape pauses.");saveData();
}
function resizeCanvas(){const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.floor(innerWidth*ratio);canvas.height=Math.floor(innerHeight*ratio)}
window.addEventListener("resize",resizeCanvas);
const keyMap={ArrowUp:"accelerate",w:"accelerate",ArrowDown:"brake",s:"brake",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"," ":"drift",Shift:"nitro"};
window.addEventListener("keydown",e=>{
  if(!$("modal").hidden){if(e.key==="Tab"){const list=[...$("modalActions").querySelectorAll("button:not(:disabled)")];if(list.length){const i=list.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();list.at(-1).focus()}else if(!e.shiftKey&&i===list.length-1){e.preventDefault();list[0].focus()}}}else if(e.key==="Escape"){e.preventDefault();$("modalActions").querySelector("button")?.click()}return}
  if(page!=="race")return;
  if(e.key==="Tab"){e.preventDefault();showPause();return}
  if(e.key==="Escape"){e.preventDefault();showPause();return}
  const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){e.preventDefault();keys[key]=true}
});
window.addEventListener("keyup",e=>{const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key)keys[key]=false});
window.addEventListener("blur",()=>{keys={};if(page==="race"&&!paused)showPause()});
$("pauseButton").addEventListener("click",showPause);
document.querySelectorAll("[data-key]").forEach(b=>{
  const release=e=>{keys[b.dataset.key]=false;b.classList.remove("active");if(e&&b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId)};
  b.addEventListener("pointerdown",e=>{e.preventDefault();audioStart();keys[b.dataset.key]=true;b.classList.add("active");b.setPointerCapture(e.pointerId)});
  b.addEventListener("pointerup",release);b.addEventListener("pointercancel",release);b.addEventListener("lostpointercapture",()=>release());
});
function update(dt){
  const r=race,p=r.player,t=r.track;r.elapsed+=dt;
  if(r.countdown>0){r.countdown=Math.max(0,r.countdown-dt);const n=Math.ceil(r.countdown);if(n!==r.lastBeep){tone(n?440:660,.15,"square",.08);r.lastBeep=n}return}
  r.time+=dt;r.collisionCooldown=Math.max(0,r.collisionCooldown-dt);r.driftCooldown=Math.max(0,r.driftCooldown-dt);
  const near=nearest(t,p.x,p.z),off=near.dist>t.width/2;
  const max=95*p.car.speed*(1+.04*p.up("turbo"))*(off?.58+.08*p.up("suspension"):1);
  if(keys.accelerate)p.speed+=33*p.car.accel*(1+.08*p.up("engine"))*dt;
  else p.speed-=12*dt;
  if(keys.brake)p.speed-=55*p.car.brake*(1+.1*p.up("brakes"))*dt;
  if(keys.nitro&&p.nitro>0&&p.speed>10){p.speed+=50*dt;p.nitro=Math.max(0,p.nitro-22*dt);if(Math.random()<dt*4)tone(500,.08,"sawtooth",.04)}
  else p.nitro=Math.min(p.maxNitro,p.nitro+3*dt);
  p.speed=Math.max(0,Math.min(max+(keys.nitro&&p.nitro>0?30:0),p.speed));
  const turn=(keys.right?1:0)-(keys.left?1:0),grip=p.car.grip*(1+.07*p.up("tires"))*(off?.65*(1+.08*p.up("suspension")):1);
  p.angle+=turn*dt*(.45+Math.min(p.speed/100,1)*1.25)*grip*(keys.drift?1.38:1)*(p.speed>1?1:0);
  if(keys.drift&&turn&&p.speed>30){p.speed=Math.max(0,p.speed-8*dt);if(!r.driftCooldown){tone(190,.1,"sawtooth",.04);r.driftCooldown=.3}}
  p.x+=Math.sin(p.angle)*p.speed*dt;p.z+=Math.cos(p.angle)*p.speed*dt;
  const now=nearest(t,p.x,p.z);
  if(now.dist>t.width*.95){p.speed*=.96;if(!r.collisionCooldown){tone(110,.16,"square",.1);r.collisionCooldown=.4}}
  let delta=now.progress-p.progress;if(delta>t.total/2)delta-=t.total;if(delta< -t.total/2)delta+=t.total;
  if(Math.abs(delta)<p.speed*dt*3+5){
    if(delta>0){
      const target=p.checkpoint*t.total/4;
      if(p.checkpoint<4&&p.progress<target&&now.progress>=target)p.checkpoint++;
      if(p.checkpoint===4&&p.progress>t.total*.9&&now.progress<t.total*.1){p.lap++;p.checkpoint=1;tone(700,.2,"triangle",.1);if(p.lap>=t.laps){p.finished=true;p.finishTime=r.time}}
    }
    p.progress=now.progress;
  }
  const factor={easy:.83,normal:.94,hard:1.04}[r.difficulty];
  for(const ai of r.rivals){
    if(ai.finished)continue;
    const look=pointAt(t,ai.progress+45),ahead=pointAt(t,ai.progress+110),curve=Math.abs(Math.atan2(Math.sin(ahead.angle-look.angle),Math.cos(ahead.angle-look.angle)));
    let target=92*factor*ai.personality*(1-Math.min(.28,curve*.6));
    if(Math.random()<dt*.08)ai.mistake=.7+Math.random();
    if(ai.mistake>0){ai.mistake-=dt;target*=.75}
    for(const other of r.rivals){if(other===ai||other.finished)continue;const gap=other.progress-ai.progress;if(gap>0&&gap<22&&Math.abs(ai.lane-other.lane)<12)ai.lane+=(ai.id%2?1:-1)*10*dt}
    ai.lane=Math.max(-t.width*.3,Math.min(t.width*.3,ai.lane));
    ai.speed+=(target-ai.speed)*Math.min(1,dt*.7);ai.progress+=ai.speed*dt;
    if(ai.progress>=t.total){ai.progress-=t.total;ai.lap++;if(ai.lap>=t.laps){ai.finished=true;ai.finishTime=r.time}}
    const q=pointAt(t,ai.progress);ai.x=q.x+Math.cos(q.angle)*ai.lane;ai.z=q.z-Math.sin(q.angle)*ai.lane;ai.angle=q.angle;
    if(Math.hypot(p.x-ai.x,p.z-ai.z)<15&&r.collisionCooldown===0){p.speed*=.72;p.angle+=(p.x>ai.x?.15:-.15);ai.speed*=.8;r.collisionCooldown=.6;tone(100,.2,"square",.12)}
  }
  engineSound(p.speed,true);
  if(p.finished)finishRace();
}
function rankCars(){return [race.player,...race.rivals].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:(b.lap*race.track.total+b.progress)-(a.lap*race.track.total+a.progress))}
function timeText(seconds){const m=Math.floor(seconds/60),s=(seconds%60).toFixed(2).padStart(5,"0");return m+":"+s}
function finishRace(){
  if(resultProcessed)return;resultProcessed=true;engineSound(0,false);tone(880,.5,"triangle",.15);
  const r=race,solo=r.mode==="trial",rank=rankCars(),position=rank.findIndex(x=>x.id===0)+1,key=r.track.id+":"+data.selected,previous=data.bests[key],pb=!!previous&&r.time<previous;
  if(!previous||r.time<previous)data.bests[key]=r.time;
  const posReward=solo?0:[700,600,400,300,250,200,150,100][position-1],win=!solo&&position===1,objective=!solo&&position<=3;
  const total=100+posReward+(win?200:0)+(pb?100:0)+(objective?100:0);data.cash+=total;
  let unlock="";
  if(r.track.id%3<2&&!data.tracks.includes(r.track.id+1)){data.tracks.push(r.track.id+1);unlock="Unlocked "+TRACKS[r.track.id+1].name+". "}
  if(r.mode==="career"){
    const champ=data.championship;rank.forEach((driver,i)=>champ.points[driver.id]+=POINTS[i]);
    if(champ.round===2){
      const ordered=Array.from({length:8},(_,id)=>id).sort((a,b)=>champ.points[b]-champ.points[a]||rank.findIndex(x=>x.id===a)-rank.findIndex(x=>x.id===b));
      unlock+="Championship winner: "+(ordered[0]===0?"You":AI_NAMES[ordered[0]-1])+" ("+champ.points[ordered[0]]+" points). ";
      if(ordered[0]===0&&champ.world<3&&data.world===champ.world){data.world++;data.tracks.push(data.world*3);unlock+="Unlocked "+WORLDS[data.world].name+" and its cars."}
      data.championship=null;
    }else{champ.round++;unlock+="Championship round "+(champ.round+1)+" is ready. Your points: "+champ.points[0]+"."}
  }
  saveData();$("resultKicker").textContent=solo?"TIME TRIAL COMPLETE":"RACE COMPLETE";
  $("resultTitle").textContent=solo?"Time trial complete.":win?"Victory looks good on you.":"Across the finish line.";
  $("resultListTitle").textContent=solo?"Your time":"Standings";
  $("resultSummary").textContent=r.track.name+" · "+timeText(r.time)+" · "+(previous?(pb?"New personal best!":"Best "+timeText(previous)):"First personal best established.");
  $("resultCash").textContent="+$"+total;
  $("rewardDetail").textContent="Completion $100"+(solo?"":" · Position $"+posReward)+(win?" · Win $200":"")+(pb?" · Personal best $100":"")+(objective?" · Top 3 objective $100":"");
  $("unlockDetail").textContent=unlock||"Complete the next race to keep progressing.";
  const list=$("resultList");list.replaceChildren();rank.forEach((driver,i)=>{const li=document.createElement("li"),name=document.createElement("strong"),time=document.createElement("span");name.textContent=(solo?"":(i+1)+". ")+driver.name;time.textContent=(driver.finished?timeText(driver.finishTime):"On track")+(r.mode==="career"?" · "+POINTS[i]+" pts":"");li.append(name,time);list.append(li)});
  $("resultContinue").textContent=r.mode==="career"&&data.championship?"Next round →":"Race again →";
  showPage("results");$("resultContinue").focus();announce(solo?"Time trial complete. Time "+timeText(r.time)+". Reward "+total+" dollars.":"Race complete. Position "+position+". Reward "+total+" dollars.");
}
$("resultContinue").addEventListener("click",()=>{if(race?.mode==="career"&&data.championship)setup("career");else setup(race?.mode||"quick")});

function renderRace(){
  const r=race,p=r.player,t=r.track,w=canvas.width,h=canvas.height,world=WORLDS[t.world];
  ctx.fillStyle=world.sky;ctx.fillRect(0,0,w,h*.42);ctx.fillStyle=world.ground;ctx.fillRect(0,h*.42,w,h*.58);
  // The chase camera projects ground-plane track polygons into perspective.
  const camX=p.x-Math.sin(p.angle)*85,camZ=p.z-Math.cos(p.angle)*85;
  const sin=Math.sin(p.angle),cos=Math.cos(p.angle),focal=w*.72,horizon=h*.37;
  function project(x,z,height=0){
    const dx=x-camX,dz=z-camZ,forward=dx*sin+dz*cos,side=dx*cos-dz*sin;
    if(forward<12)return null;
    const scale=focal/forward;return {x:w/2+side*scale,y:horizon+(95-height)*scale,scale,forward};
  }
  function polygon(points,color){if(points.some(x=>!x))return;ctx.fillStyle=color;ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.fill()}
  // Distant skyline is themed per environment and moves with the heading.
  ctx.fillStyle=t.world===2?"#22263e":t.world===1?"#c2d7dd":t.world===3?"#b47a55":"#668b8c";
  ctx.beginPath();ctx.moveTo(0,h*.42);for(let i=0;i<=12;i++){const x=i*w/12;ctx.lineTo(x,h*(.35-((Math.sin(i*12.3+t.id)*.5+.5)*.11)))}ctx.lineTo(w,h*.42);ctx.fill();
  const segments=[];
  for(let i=0;i<t.points.length;i++){
    const a=t.points[i],b=t.points[(i+1)%t.points.length],angle=Math.atan2(b.x-a.x,b.z-a.z),nx=Math.cos(angle)*t.width/2,nz=-Math.sin(angle)*t.width/2;
    const center=project((a.x+b.x)/2,(a.z+b.z)/2);if(!center||center.forward>950)continue;
    segments.push({i,a,b,nx,nz,depth:center.forward});
  }
  segments.sort((a,b)=>b.depth-a.depth);
  for(const s of segments){
    const {a,b,nx,nz,i}=s,outer=1.12;
    polygon([project(a.x+nx*outer,a.z+nz*outer),project(b.x+nx*outer,b.z+nz*outer),project(b.x-nx*outer,b.z-nz*outer),project(a.x-nx*outer,a.z-nz*outer)],i%4<2?"#e9d8bd":"#da5d50");
    polygon([project(a.x+nx,a.z+nz),project(b.x+nx,b.z+nz),project(b.x-nx,b.z-nz),project(a.x-nx,a.z-nz)],i%2?"#454b53":"#4b5159");
    if(i%4<2)polygon([project(a.x+nx*.025,a.z+nz*.025),project(b.x+nx*.025,b.z+nz*.025),project(b.x-nx*.025,b.z-nz*.025),project(a.x-nx*.025,a.z-nz*.025)],"#e5dec7");
    if(i===0)polygon([project(a.x+nx,a.z+nz),project(b.x+nx,b.z+nz),project(b.x-nx,b.z-nz),project(a.x-nx,a.z-nz)],"#f1eadb");
    if(i%8===0){
      for(const side of [-1,1]){
        const x=a.x+nx*side*1.7,z=a.z+nz*side*1.7,base=project(x,z),top=project(x,z,t.world===2?65:35);
        if(!base||!top)continue;
        const sw=Math.max(2,Math.min(w*.06,base.scale*(t.world===2?13:7)));
        ctx.fillStyle=t.world===2?(i%16?"#7a5c9d":"#468da0"):t.world===3?"#9b674d":t.world===1?"#eef3ee":"#3f735d";
        if(t.world===2){ctx.fillRect(base.x-sw/2,top.y,sw,base.y-top.y);ctx.fillStyle="#f1c85b";ctx.fillRect(base.x-sw*.2,top.y+sw*.4,sw*.35,sw*.2)}
        else{ctx.beginPath();ctx.moveTo(base.x,top.y);ctx.lineTo(base.x+sw,base.y);ctx.lineTo(base.x-sw,base.y);ctx.closePath();ctx.fill()}
      }
    }
  }
  const visible=r.rivals.filter(a=>!a.finished).map(a=>({a,q:project(a.x,a.z)})).filter(o=>o.q&&o.q.forward<700).sort((a,b)=>b.q.forward-a.q.forward);
  for(const {a,q} of visible)drawRaceCar(ctx,q.x,q.y,Math.min(w*.12,18*q.scale),["#56c3d0","#f3bd62","#e17796","#a4d18c","#a887e0","#e7dfd1","#e99159"][a.id-1],null);
  drawRaceCar(ctx,w/2,h*.85,Math.min(w*.16,h*.23),(data.styles[data.selected]||defaultStyle()).paint,data.styles[data.selected]||defaultStyle());
  if(keys.nitro&&p.nitro>0&&!data.settings.reduceMotion&&!matchMedia("(prefers-reduced-motion: reduce)").matches){ctx.fillStyle="#53e7ed";ctx.beginPath();ctx.moveTo(w*.485,h*.87);ctx.lineTo(w*.5,h*.99);ctx.lineTo(w*.515,h*.87);ctx.fill()}
  $("hudPosition").textContent=r.mode==="trial"?"SOLO":(rankCars().findIndex(a=>a.id===0)+1)+" / 8";
  $("hudLap").textContent=Math.min(p.lap+1,t.laps)+" / "+t.laps;
  $("hudTime").textContent=timeText(r.time);
  $("hudSpeed").textContent=Math.round(p.speed*2);
  $("hudNitroText").textContent=Math.round(p.nitro/p.maxNitro*100)+"%";$("hudNitro").style.width=(p.nitro/p.maxNitro*100)+"%";
  $("raceMessage").textContent=r.countdown>0?Math.ceil(r.countdown):r.elapsed<4?"GO!":"";
  const list=$("standings"),entries=rankCars().map(a=>a.name+(a.finished?" (finished)":"")),signature=JSON.stringify(entries);
  if(list.dataset.signature!==signature){list.replaceChildren();entries.forEach(text=>{const li=document.createElement("li");li.textContent=text;list.append(li)});list.dataset.signature=signature}
  renderMinimap();
}
function drawRaceCar(c,x,y,size,color,style){
  c.save();c.translate(x,y);const s=size;
  if(style&&style.body==="Wide")c.scale(1.13,1);
  if(style&&style.body==="Aero")c.scale(.9,1.08);
  c.fillStyle="#10151c";c.fillRect(-s*.55,-s*.2,s*.2,s*.4);c.fillRect(s*.35,-s*.2,s*.2,s*.4);
  c.fillStyle=color;c.beginPath();c.moveTo(-s*.48,0);c.lineTo(-s*.38,-s*.55);c.lineTo(s*.38,-s*.55);c.lineTo(s*.48,0);c.closePath();c.fill();
  c.fillStyle="#263b4a";c.beginPath();c.moveTo(-s*.29,-s*.32);c.lineTo(-s*.2,-s*.62);c.lineTo(s*.2,-s*.62);c.lineTo(s*.29,-s*.32);c.closePath();c.fill();
  c.fillStyle="#f6ad82";c.fillRect(-s*.4,-s*.13,s*.15,s*.08);c.fillRect(s*.25,-s*.13,s*.15,s*.08);
  if(style&&style.stripes!=="None"){c.fillStyle="#f6e8cd";if(style.stripes==="Center")c.fillRect(-s*.025,-s*.3,s*.05,s*.25);else{c.fillRect(-s*.15,-s*.3,s*.04,s*.25);c.fillRect(s*.11,-s*.3,s*.04,s*.25)}}
  if(style&&style.spoiler!=="None"){c.fillStyle="#e0e5e9";c.fillRect(-s*.49,style.spoiler==="Wing"?-s*.28:-s*.22,s*.98,style.spoiler==="Wing"?s*.08:s*.05)}
  if(style&&style.wheels!=="Classic"){c.fillStyle=style.wheels==="Gold"?"#e9c255":"#c3d4e1";c.fillRect(-s*.52,-s*.1,s*.12,s*.07);c.fillRect(s*.4,-s*.1,s*.12,s*.07)}
  c.restore();
}
function renderMinimap(){
  const t=race.track,c=mini,w=c.canvas.width,h=c.canvas.height;c.clearRect(0,0,w,h);
  const xs=t.points.map(p=>p.x),zs=t.points.map(p=>p.z),minX=Math.min(...xs),minZ=Math.min(...zs),scale=Math.min((w-20)/(Math.max(...xs)-minX),(h-20)/(Math.max(...zs)-minZ));
  const pt=(x,z)=>({x:10+(x-minX)*scale,y:10+(z-minZ)*scale});
  c.strokeStyle="#b4c3d2";c.lineWidth=5;c.beginPath();t.points.forEach((p,i)=>{const q=pt(p.x,p.z);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.closePath();c.stroke();
  for(const a of [race.player,...race.rivals]){if(!Number.isFinite(a.x))continue;const q=pt(a.x,a.z);c.fillStyle=a.id===0?"#f4c85b":"#f16a50";c.beginPath();c.arc(q.x,q.y,a.id===0?4:2.5,0,Math.PI*2);c.fill()}
}
function frame(now){
  if(page==="race"&&race&&!paused){
    accumulator+=Math.min(.1,(now-lastFrame)/1000);let steps=0;
    while(accumulator>=1/60&&steps<6&&page==="race"){update(1/60);accumulator-=1/60;steps++}
    if(page==="race")renderRace();
  }
  lastFrame=now;requestAnimationFrame(frame);
}
showWarning();updateWallet();selectedCar=data.selected;draft={...(data.styles[selectedCar]||defaultStyle())};showPage("home");requestAnimationFrame(frame);
