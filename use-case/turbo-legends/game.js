"use strict";
const $=id=>document.getElementById(id);
let page="home", setupMode="quick", selectedTrack=0, selectedWorld=0, selectedCar=0, draft=defaultStyle(), garageAngle=.6, settingsReturn="home";
let race=null, view=null, paused=false, lastFocus=null, keys={}, lastFrame=0, accumulator=0, resultProcessed=false, hudCache={}, summaryTimer=0;
const canvas=$("raceCanvas"), ctx=canvas.getContext("2d"), mini=$("minimap").getContext("2d"), garageCtx=$("garageCanvas").getContext("2d");
const motionQuery=window.matchMedia?matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
loadData();
function showWarning(){$("warning").textContent=storageWarning;$("warning").hidden=!storageWarning}
function announce(text){$("status").textContent=text}
function updateWallet(){$("wallet").textContent="$"+data.cash.toLocaleString()}
function reducedMotion(){return data.settings.reduceMotion||motionQuery.matches}
function showPage(name){
  page=name; document.querySelectorAll(".screen,.race-screen").forEach(el=>el.hidden=el.id!==name);
  $("footer").hidden=name==="race"; updateWallet(); showWarning();
  if(name==="garage")renderGarage();
  if(name==="settings")renderSettings();
  if(name!=="race"){engineSound(0,false,false);squeal(0)}
  window.scrollTo(0,0);
}
function button(text,fn,kind="secondary"){const b=document.createElement("button");b.className=kind;b.textContent=text;b.addEventListener("click",fn);return b}
function closeModal(){if($("modal").hidden)return;$("modal").hidden=true;$("modalActions").replaceChildren();if(lastFocus&&lastFocus.isConnected)lastFocus.focus()}
function modal(title,text,actions,kicker="TURBO LEGENDS"){
  lastFocus=document.activeElement;$("modalKicker").textContent=kicker;$("modalTitle").textContent=title;$("modalText").textContent=text;
  const box=$("modalActions");box.replaceChildren();actions.forEach(a=>box.append(button(a[0],a[1],a[2]||"secondary")));$("modal").hidden=false;box.querySelector("button").focus();
}
function showPause(){
  if(!race||page!=="race"||paused||resultProcessed)return;
  paused=true;keys={};audioSuspend();
  modal("Race paused","Take a breath. Your race is frozen.",[
    ["Resume",resumeRace,"primary"],["Settings",()=>{closeModal();settingsReturn="pause";showPage("settings")}],
    ["Restart",()=>confirmRaceAction("Restart race?","Your current race progress will be lost.",()=>{closeModal();audioResume();startRace()})],
    ["Exit race",()=>confirmRaceAction("Exit race?","Your current race progress will be lost. No rewards will be awarded.",()=>{closeModal();race=null;paused=false;audioResume();showPage("home")})]
  ],"PAUSED");
}
function resumeRace(){closeModal();paused=false;audioResume();lastFrame=performance.now();accumulator=0;$("pauseButton").focus()}
function confirmRaceAction(title,text,fn){closeModal();modal(title,text,[["Cancel",()=>{closeModal();paused=false;showPause()}],["Confirm",fn,"primary"]],"ARE YOU SURE?")}

// ---------- Mode setup ----------
function careerTrack(){const c=data.championship;return c?c.world*3+c.round:data.world*3}
function cupTrack(){const c=data.cup;return c&&c.world===selectedWorld?c.world*3+c.round:selectedWorld*3}
function setup(mode){
  setupMode=mode;
  if(mode==="career")selectedTrack=careerTrack();
  else if(mode==="cup"){selectedWorld=data.cup?data.cup.world:Math.min(selectedWorld,data.world);selectedTrack=cupTrack()}
  else if(!trackUnlocked(selectedTrack))selectedTrack=0;
  const text={
    quick:["THE ROAD IS CALLING","Quick race","Choose an unlocked track and race seven rivals."],
    cup:["PICK A WORLD / THREE ROUNDS","Championship","Choose an unlocked world and race its three tracks for points. Most points takes the cup."],
    career:["FOUR WORLDS / THREE ROUNDS","Career championship","Coast → Alps → Night City → Desert. Win a world's championship to unlock the next world and its cars."],
    trial:["YOU AGAINST THE CLOCK","Time trial","Set a personal best with your selected car. No rivals, just the road."]
  }[mode];
  $("setupKicker").textContent=text[0];$("setupTitle").textContent=text[1];$("setupDescription").textContent=text[2];
  renderTracks();showPage("setup");
}
function trackUnlocked(id){return data.tracks.includes(id)}
function renderTracks(){
  const list=$("trackList");list.replaceChildren();
  if(setupMode==="cup"){
    WORLDS.forEach((world,w)=>{
      const open=w<=data.world,b=document.createElement("button");b.className="track"+(selectedWorld===w?" selected":"")+(open?"":" locked");
      const title=document.createElement("strong"),small=document.createElement("small");title.textContent=world.name+" Championship";
      const reason=!open?"Locked: win the "+WORLDS[w-1].name+" career championship":data.cup&&data.cup.world===w?"In progress · Round "+(data.cup.round+1)+" of 3":world.names.join(" · ");
      small.textContent=reason;b.append(title,small);b.setAttribute("aria-pressed",String(selectedWorld===w));
      b.addEventListener("click",()=>{if(!open){announce(reason);return}selectedWorld=w;selectedTrack=cupTrack();renderTracks()});
      list.append(b);
    });
    const c=data.cup&&data.cup.world===selectedWorld?data.cup:null;
    $("selectedTrack").textContent=WORLDS[selectedWorld].name+" Championship";
    $("trackDetail").textContent="Rounds: "+WORLDS[selectedWorld].names.join(" → ")+" · 3 laps each";
    $("setupNote").textContent=(c?"Continue: Round "+(c.round+1)+" of 3 · Your points "+c.points[0]+" · ":"")+"Points 10 / 8 / 6 / 5 / 4 / 3 / 2 / 1";
    $("difficulty").disabled=false;$("startRace").textContent=c?"Continue championship →":"Start championship →";
    return;
  }
  TRACKS.forEach(t=>{
    const b=document.createElement("button");b.className="track"+(selectedTrack===t.id?" selected":"")+(trackUnlocked(t.id)?"":" locked");
    const title=document.createElement("strong"),small=document.createElement("small");title.textContent=t.name;
    let reason=trackUnlocked(t.id)?"Unlocked · "+"●".repeat(t.difficulty)+"○".repeat(3-t.difficulty):t.world>data.world?"Win the "+WORLDS[t.world-1].name+" career championship":"Complete "+TRACKS[t.id-1].name+" to unlock";
    if(setupMode==="career")reason=t.id===selectedTrack?"Championship round "+(t.id%3+1):Math.floor(t.id/3)===Math.floor(selectedTrack/3)?"Round "+(t.id%3+1):t.world>data.world?"Locked world":"Career world";
    small.textContent=WORLDS[t.world].name+" · "+reason;b.append(title,small);b.setAttribute("aria-pressed",String(selectedTrack===t.id));
    b.addEventListener("click",()=>{if(setupMode==="career"){announce("Career tracks follow the championship round order.");return}if(!trackUnlocked(t.id)){announce(reason);return}selectedTrack=t.id;renderTracks()});
    list.append(b);
  });
  const t=TRACKS[selectedTrack],best=data.bests[t.id+":"+data.selected];$("selectedTrack").textContent=t.name;
  $("trackDetail").textContent=WORLDS[t.world].name+" · Difficulty "+t.difficulty+"/3 · "+t.laps+" laps"+(WORLDS[t.world].tunnel?" · tunnels":"")+(WORLDS[t.world].haze?" · sandstorm haze":"");
  $("setupNote").textContent=setupMode==="career"?"Round "+((data.championship?.round||0)+1)+" of 3 · 10 / 8 / 6 / 5 / 4 / 3 / 2 / 1 points":setupMode==="trial"?"Selected car: "+CARS[data.selected].name+" · Best "+(best?timeText(best):"none yet")+" · Completion $"+REWARDS.completion+", beat your best +$"+REWARDS.pb:"Selected car: "+CARS[data.selected].name;
  $("difficulty").disabled=setupMode==="trial";
  $("startRace").textContent=setupMode==="trial"?"Start time trial →":setupMode==="career"&&data.championship?"Continue career →":"Start race →";
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>{audioStart();const target=b.dataset.page;if(["quick","career","trial","cup"].includes(target))setup(target);else showPage(target)}));
$("brand").addEventListener("click",e=>{e.preventDefault();if(page==="race"){showPause();return}showPage("home")});
$("raceNow").addEventListener("click",()=>{audioStart();setupMode="quick";selectedTrack=0;startRace()});
$("startRace").addEventListener("click",()=>{
  audioStart();
  if(setupMode==="trial"){startRace();return}
  if(setupMode==="cup"&&data.cup&&data.cup.world!==selectedWorld){
    modal("Start a new championship?","Your "+WORLDS[data.cup.world].name+" championship (round "+(data.cup.round+1)+" of 3) will be abandoned.",[["Cancel",closeModal],["Start new",()=>{data.cup=null;saveData();closeModal();showPrerace()},"primary"]],"CHAMPIONSHIP");return}
  showPrerace();
});
$("settingsLink").addEventListener("click",()=>{audioStart();if(page==="race"){showPause();return}settingsReturn=page;showPage("settings")});
$("settingsBack").addEventListener("click",()=>{if(settingsReturn==="pause"){showPage("race");paused=false;showPause()}else showPage(settingsReturn)});

// ---------- Pre-race card ----------
function raceTrackId(){return setupMode==="career"?careerTrack():setupMode==="cup"?cupTrack():selectedTrack}
function showPrerace(){
  const id=raceTrackId(),t=TRACKS[id],obj=OBJECTIVES[id%3],diff=$("difficulty").value,series=setupMode==="career"?data.championship:setupMode==="cup"?(data.cup&&data.cup.world===t.world?data.cup:null):null;
  $("preraceKicker").textContent=setupMode==="career"?"CAREER":setupMode==="cup"?"CHAMPIONSHIP":"QUICK RACE";
  $("preraceTitle").textContent=t.name;
  $("preraceDetail").textContent=WORLDS[t.world].name+" · "+t.laps+" laps · "+diff[0].toUpperCase()+diff.slice(1)+" rivals"+(setupMode!=="quick"?" · Round "+((series?.round||0)+1)+" of 3":"")+" · "+CARS[data.selected].name;
  const ul=$("preraceRewards");ul.replaceChildren();
  const P=REWARDS.places,lines=["1st $"+P[0]+" · 2nd $"+P[1]+" · 3rd $"+P[2]+" · 4th–8th $"+P[3]+"–$"+P[7],"Completion $"+REWARDS.completion+" · Win bonus $"+REWARDS.win,"New personal best $"+REWARDS.pb+" (when you beat your saved best)"];
  if(setupMode!=="quick")lines.push("Points 10 / 8 / 6 / 5 / 4 / 3 / 2 / 1"+(series?" · Your points "+series.points[0]:""));
  lines.forEach(x=>{const li=document.createElement("li");li.textContent=x;ul.append(li)});
  $("preraceObjective").textContent="★ Optional: "+obj.label+"  +$"+REWARDS.objective;
  showPage("prerace");$("preraceStart").focus();
}
$("preraceStart").addEventListener("click",()=>{audioStart();startRace()});
$("preraceBack").addEventListener("click",()=>setup(setupMode));

// ---------- Settings ----------
function renderSettings(){
  const s=data.settings;["music","effects"].forEach(k=>{$(k+"Volume").value=s[k];$(k+"Mute").checked=s[k+"Mute"]});$("reduceMotion").checked=s.reduceMotion;
}
["music","effects"].forEach(k=>{$(k+"Volume").addEventListener("input",e=>{data.settings[k]=Number(e.target.value);applyAudioSettings();saveData()});$(k+"Mute").addEventListener("change",e=>{data.settings[k+"Mute"]=e.target.checked;applyAudioSettings();saveData()})});
$("reduceMotion").addEventListener("change",e=>{data.settings.reduceMotion=e.target.checked;saveData()});
$("resetData").addEventListener("click",()=>modal("Reset all progress?","This permanently removes your saved cars, cash, career and records.",[["Cancel",closeModal],["Reset progress",()=>{resetStorage();closeModal();showWarning();renderSettings();applyAudioSettings();updateWallet();selectedCar=0;draft=defaultStyle();announce("Progress reset.")},"danger"]]));

// ---------- Garage ----------
function getUpgrade(car,key){return data.upgrades[car]?.[key]||0}
function renderGarage(){
  const select=$("carSelect");select.replaceChildren();
  CARS.forEach((car,i)=>{const o=document.createElement("option");o.value=i;o.textContent=car.name+" ("+car.shape+") · "+(data.owned.includes(i)?"Owned":car.world>data.world?"Locked: win "+WORLDS[car.world-1].name:"$"+car.price.toLocaleString());select.append(o)});
  select.value=selectedCar;
  const car=CARS[selectedCar],owned=data.owned.includes(selectedCar);
  $("carInfo").textContent="Speed "+Math.round(car.speed*100)+" · Acceleration "+Math.round(car.accel*100)+" · Grip "+Math.round(car.grip*100)+" · Braking "+Math.round(car.brake*100);
  $("buyCar").textContent=owned?"Owned":car.world>data.world?"Unlock "+WORLDS[car.world].name+" first":data.cash<car.price?"Not enough cash · $"+car.price.toLocaleString():"Buy for $"+car.price.toLocaleString();
  $("buyCar").disabled=owned||car.world>data.world||data.cash<car.price;
  $("useCar").disabled=!owned||selectedCar===data.selected;$("useCar").textContent=selectedCar===data.selected?"Selected car":"Use this car";
  const tuning=$("tuning");tuning.replaceChildren();
  Object.entries(UPGRADES).forEach(([key,desc])=>{
    const level=getUpgrade(selectedCar,key),row=document.createElement("div"),info=document.createElement("div"),title=document.createElement("strong"),small=document.createElement("small");
    row.className="upgrade";title.textContent=key[0].toUpperCase()+key.slice(1)+" · "+level+"/5";small.textContent=desc;info.append(title,small);
    const cost=upgradeCost(level),label=level===5?"Max level":!owned?"Buy car first":data.cash<cost?"Not enough cash · $"+cost:"Upgrade $"+cost;
    const b=button(label,()=>{if(!data.owned.includes(selectedCar)||level>=5||data.cash<cost)return;data.cash-=cost;data.upgrades[selectedCar]??={};data.upgrades[selectedCar][key]=level+1;saveData();updateWallet();renderGarage();announce(key+" upgraded to level "+(level+1))});
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
(()=>{let dragX=null;const gc=$("garageCanvas");gc.addEventListener("pointerdown",e=>{dragX=e.clientX;gc.setPointerCapture(e.pointerId)});
  gc.addEventListener("pointermove",e=>{if(dragX===null)return;garageAngle+=(e.clientX-dragX)*.012;dragX=e.clientX;drawGarage()});
  const end=()=>{dragX=null};gc.addEventListener("pointerup",end);gc.addEventListener("pointercancel",end)})();
function drawGarage(){drawGarage3D(garageCtx,garageCtx.canvas.width,garageCtx.canvas.height,CARS[selectedCar].shape,draft,garageAngle)}

// ---------- Race ----------
function startRace(){
  let round=0;
  if(setupMode==="career"){if(!data.championship)data.championship={world:data.world,round:0,points:Array(8).fill(0)};round=data.championship.round;selectedTrack=careerTrack()}
  if(setupMode==="cup"){if(!data.cup||data.cup.world!==selectedWorld)data.cup={world:selectedWorld,round:0,points:Array(8).fill(0)};round=data.cup.round;selectedTrack=data.cup.world*3+round}
  const solo=setupMode==="trial",difficulty=solo?"normal":$("difficulty").value;
  race=createRace({trackId:selectedTrack,difficulty,round,playerStats:carStats(data.selected,data.upgrades[data.selected]||{}),solo});
  race.mode=setupMode;race.difficulty=difficulty;race.objective=solo?null:OBJECTIVES[selectedTrack%3];race.objectiveNote="";race.finishBanner=0;race.lastBeep=4;race.goTime=0;
  view=newView();hudCache={};summaryTimer=0;$("standings").dataset.signature="";$("hudObjective").hidden=!race.objective;$("race").classList.remove("flash");
  resultProcessed=false;paused=false;keys={};showPage("race");resizeCanvas();lastFrame=performance.now();accumulator=0;$("pauseButton").focus();
  announce(TRACKS[selectedTrack].name+". Race starting. Arrow keys or WASD drive, Space drifts, Shift fires nitro, Escape pauses.");saveData();
}
function resizeCanvas(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;let ratio=Math.min(devicePixelRatio||1,1.5);if(w*ratio>1600)ratio=1600/w;canvas.width=Math.max(320,Math.floor(w*ratio));canvas.height=Math.max(240,Math.floor(h*ratio))}
window.addEventListener("resize",()=>{if(page==="race")resizeCanvas()});
const keyMap={ArrowUp:"accelerate",w:"accelerate",ArrowDown:"brake",s:"brake",ArrowLeft:"left",a:"left",ArrowRight:"right",d:"right"," ":"drift",Shift:"nitro"};
window.addEventListener("keydown",e=>{
  if(!$("modal").hidden){if(e.key==="Tab"){const list=[...$("modalActions").querySelectorAll("button:not(:disabled)")];if(list.length){const i=list.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();list.at(-1).focus()}else if(!e.shiftKey&&i===list.length-1){e.preventDefault();list[0].focus()}}}else if(e.key==="Escape"){e.preventDefault();$("modalActions").querySelector("button")?.click()}return}
  if(page!=="race")return;
  if(e.key==="Tab"||e.key==="Escape"){e.preventDefault();showPause();return}
  const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){e.preventDefault();keys[key]=true}
});
window.addEventListener("keyup",e=>{const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){keys[key]=false;if(page==="race")e.preventDefault()}});
window.addEventListener("blur",()=>{keys={};if(page==="race"&&!paused)showPause()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&page==="race"&&!paused)showPause()});
$("pauseButton").addEventListener("click",showPause);
document.querySelectorAll("[data-key]").forEach(b=>{
  const release=e=>{keys[b.dataset.key]=false;b.classList.remove("active");if(e&&e.pointerId!==undefined&&b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId)};
  b.addEventListener("pointerdown",e=>{e.preventDefault();audioStart();keys[b.dataset.key]=true;b.classList.add("active");b.setPointerCapture(e.pointerId)});
  b.addEventListener("pointerup",release);b.addEventListener("pointercancel",release);b.addEventListener("lostpointercapture",()=>release());
  b.addEventListener("contextmenu",e=>e.preventDefault());
});
function playerInput(){return {throttle:!!keys.accelerate,brake:!!keys.brake,steer:(keys.right?1:0)-(keys.left?1:0),drift:!!keys.drift,nitro:!!keys.nitro}}
function objectiveState(){
  const o=race&&race.objective,p=race&&race.player;if(!o)return null;
  if(o.id==="nowall")return p.wallHits?{text:"★ No wall hits ✗",state:"failed",ok:false}:{text:"★ No wall hits ✓",state:p.finished?"done":"progress",ok:true};
  if(o.id==="nitro"){const n=Math.min(3,p.nitroUses),ok=n>=3;return {text:ok?"★ Nitro 3/3 ✓":"★ Use nitro "+n+"/3",state:ok?"done":p.finished?"failed":"progress",ok}}
  const d=Math.min(5,p.driftTime),ok=d>=5;return {text:ok?"★ Drift 5.0/5 s ✓":"★ Drift "+d.toFixed(1)+"/5 s",state:ok?"done":p.finished?"failed":"progress",ok};
}
function tick(dt){
  const r=race,p=r.player;
  if(r.countdown>0){
    r.countdown=Math.max(0,r.countdown-dt);const n=Math.ceil(r.countdown);
    if(n!==r.lastBeep){r.lastBeep=n;sfx(n?"beep":"go");announce(n?String(n):"Go!")}
    engineSound(keys.accelerate?.35:.05,!!keys.accelerate,true);return;
  }
  r.goTime+=dt;
  stepRace(r,playerInput(),dt);
  const rm=reducedMotion();
  for(const e of r.events){
    if(e.type==="wall"&&e.car===p){sfx("thud");if(rm)view.flash=.35;else view.shake=1;const W=canvas.width,H=canvas.height;for(let k=0;k<14;k++)spawn(view,W/2+(p.x>0?1:-1)*W*.08,H*.9,W*.2,"spark",rm)}
    else if(e.type==="bump"){const mine=e.a===p||e.b===p;
      if(mine){sfx("thud",.8);if(rm)view.flash=.3;else view.shake=.6;for(let k=0;k<8;k++)spawn(view,canvas.width/2,canvas.height*.85,canvas.width*.2,"spark",rm)}
      else if(Math.abs(wrapDelta(e.a.z-p.z,r.track.length))<4000)sfx("thud",.25)}
    else if(e.type==="lap"&&e.car===p&&p.lap>0&&p.lap<r.laps){sfx("lap");announce("Lap "+(p.lap+1)+" of "+r.laps+(r.laps-p.lap===1?". Final lap!":""))}
    else if(e.type==="nitro"&&e.car===p)sfx("nitro");
    else if(e.type==="nitroEmpty"&&e.car===p){sfx("empty");view.nitroFlash=.6}
    else if(e.type==="finish"&&e.car===p){sfx("fanfare");const pos=r.order.indexOf(p)+1;announce(r.mode==="trial"?"Finished in "+timeText(p.finishTime):"Finished in position "+(pos||1)+" of 8.")}
  }
  const st=objectiveState();
  if(st&&st.state!=="progress"&&r.objectiveNote!==st.state){r.objectiveNote=st.state;if(!p.finished||st.state==="done")announce(st.state==="failed"?"Objective failed: "+r.objective.label+".":"Objective complete: "+r.objective.label+"!")}
  engineSound(p.speed/p.stats.top,!!keys.accelerate&&!p.finished,true);
  squeal(p.drifting?1:p.offroad&&p.speed>2000?.25:0);
  if(p.finished){r.finishBanner+=dt;if(r.finishBanner>2.6)finishRace()}
}
function setHud(id,value){if(hudCache[id]!==value){hudCache[id]=value;$(id).textContent=value}}
function updateHud(dt){
  const r=race,p=r.player,solo=r.mode==="trial",pos=r.order.indexOf(p)+1||r.cars.length;
  setHud("hudPosition",solo?"SOLO":pos+" / 8");
  setHud("hudLap",Math.max(1,Math.min(p.lap+1,r.laps))+" / "+r.laps);
  setHud("hudTime",timeText(p.finished?p.finishTime:r.time));
  setHud("hudSpeed",String(Math.round(p.speed*.025)));
  const pct=Math.round(p.nitro/p.maxNitro*100);setHud("hudNitroText",pct+"%");
  if(hudCache.nitroW!==pct){hudCache.nitroW=pct;$("hudNitro").style.width=pct+"%"}
  view.nitroFlash=Math.max(0,(view.nitroFlash||0)-dt);const nf=view.nitroFlash>0;if(hudCache.nf!==nf){hudCache.nf=nf;$("hudNitro").parentElement.classList.toggle("empty",nf)}
  view.flash=Math.max(0,view.flash-dt);const fl=view.flash>0;if(hudCache.fl!==fl){hudCache.fl=fl;$("race").classList.toggle("flash",fl)}
  setHud("raceMessage",r.countdown>0?String(Math.ceil(r.countdown)):p.finished?(solo?"FINISH!":"FINISH! P"+pos):r.goTime<1.2?"GO!":"");
  const st=objectiveState(),chip=$("hudObjective");
  if(hudCache.objHidden!==!st){hudCache.objHidden=!st;chip.hidden=!st}
  if(st){setHud("hudObjective",st.text);if(hudCache.objState!==st.state){hudCache.objState=st.state;chip.className="objective-chip "+st.state}}
  const list=$("standings"),order=r.order.length?r.order:r.cars,entries=order.map(a=>(a===p?"YOU":a.name)+(a.finished?" ✓":"")),signature=entries.join("|");
  if(list.dataset.signature!==signature){list.replaceChildren();entries.forEach((text,i)=>{const li=document.createElement("li");li.textContent=text;li.value=i+1;if(order[i]===p)li.className="me";else if(i>=3)li.className="extra";list.append(li)});list.dataset.signature=signature}
  summaryTimer-=dt;if(summaryTimer<=0){summaryTimer=1;$("raceSummary").textContent=r.track.def.name+": "+(solo?"time trial":"position "+pos+" of 8")+", lap "+Math.max(1,Math.min(p.lap+1,r.laps))+" of "+r.laps+", "+Math.round(p.speed*.025)+" km/h, nitro "+pct+"%"+(p.offroad?", off the road":"")+(st?", objective "+st.text.replace("★ ",""):"")+"."}
}
function timeText(seconds){const m=Math.floor(seconds/60),s=(seconds%60).toFixed(2).padStart(5,"0");return m+":"+s}
const ordinal=n=>n+(n===1?"st":n===2?"nd":n===3?"rd":"th");
function finishRace(){
  if(resultProcessed)return;resultProcessed=true;engineSound(0,false,false);squeal(0);
  const r=race,p=r.player,solo=r.mode==="trial",rank=rankCars(r),position=rank.indexOf(p)+1,time=p.finishTime,key=r.track.def.id+":"+data.selected,previous=data.bests[key],pb=previous!==undefined&&time<previous;
  if(previous===undefined||time<previous)data.bests[key]=time;
  const lines=[];
  if(!solo)lines.push(["Finish "+ordinal(position),REWARDS.places[position-1]]);
  lines.push(["Completion bonus",REWARDS.completion]);
  if(!solo&&position===1)lines.push(["Win bonus",REWARDS.win]);
  if(pb)lines.push(["New personal best",REWARDS.pb]);
  const st=objectiveState();if(st)lines.push(["★ "+r.objective.label+(st.ok?" ✓":" ✗"),st.ok?REWARDS.objective:0]);
  const total=lines.reduce((a,l)=>a+l[1],0);data.cash+=total;
  let unlock="",pointsText="";const id=r.track.def.id;
  if(id%3<2&&!data.tracks.includes(id+1)){data.tracks.push(id+1);unlock="Unlocked "+TRACKS[id+1].name+". "}
  const seriesKey=r.mode==="career"?"championship":r.mode==="cup"?"cup":null;
  if(seriesKey&&data[seriesKey]){
    const champ=data[seriesKey];rank.forEach((driver,i)=>champ.points[driver.id]+=POINTS[i]);pointsText="Points +"+POINTS[position-1]+" · total "+champ.points[0];
    if(champ.round===2){
      const ordered=Array.from({length:8},(_,i)=>i).sort((a,b)=>champ.points[b]-champ.points[a]||rank.findIndex(x=>x.id===a)-rank.findIndex(x=>x.id===b));
      unlock+=WORLDS[champ.world].name+" championship winner: "+(ordered[0]===0?"You":AI_NAMES[ordered[0]-1])+" ("+champ.points[ordered[0]]+" points). ";
      if(seriesKey==="championship"&&ordered[0]===0&&champ.world<3&&data.world===champ.world){data.world++;if(!data.tracks.includes(data.world*3))data.tracks.push(data.world*3);unlock+="Unlocked "+WORLDS[data.world].name+" and its cars."}
      else if(seriesKey==="championship"&&ordered[0]!==0)unlock+="Win the championship to unlock the next world.";
      data[seriesKey]=null;
    }else{champ.round++;unlock+="Round "+(champ.round+1)+" of 3 is ready: "+TRACKS[champ.world*3+champ.round].name+"."}
  }
  saveData();updateWallet();
  $("resultKicker").textContent=solo?"TIME TRIAL COMPLETE":"RESULTS · "+r.track.def.name.toUpperCase();
  $("resultTitle").textContent=solo?"Time trial complete.":position===1?"Victory looks good on you.":position<=3?"On the podium.":"Across the finish line.";
  $("resultListTitle").textContent=solo?"Your time":"Standings";
  $("resultSummary").textContent=r.track.def.name+" · "+timeText(time)+" · "+(previous!==undefined?(pb?"New personal best!":"Best "+timeText(previous)):"First personal best set.");
  $("resultCash").textContent="+$"+total.toLocaleString();
  const box=$("rewardDetail");box.replaceChildren();
  for(const [label,amount] of lines){const row=document.createElement("div"),a=document.createElement("span"),b=document.createElement("strong");row.className="reward-row";a.textContent=label;b.textContent="$"+amount;row.append(a,b);box.append(row)}
  if(pointsText){const row=document.createElement("div"),a=document.createElement("span");row.className="reward-row";a.textContent=pointsText;row.append(a);box.append(row)}
  $("unlockDetail").textContent=unlock||"Complete the next race to keep progressing.";
  const list=$("resultList");list.replaceChildren();
  (solo?[p]:rank).forEach((driver,i)=>{const li=document.createElement("li"),name=document.createElement("strong"),tm=document.createElement("span");name.textContent=(solo?"":(i+1)+". ")+(driver===p?"You":driver.name);tm.textContent=(driver.finished?timeText(driver.finishTime):"On track")+(seriesKey?" · "+POINTS[i]+" pts":"");li.append(name,tm);list.append(li)});
  const next=seriesKey&&data[seriesKey];
  $("resultContinue").textContent=next?"Next round →":"Continue →";$("resultAgain").hidden=!!seriesKey;
  showPage("results");$("resultContinue").focus();
  announce((solo?"Time trial complete. Time "+timeText(time):"Race complete. Position "+position+" of 8")+". Reward "+total+" dollars.");
}
$("resultContinue").addEventListener("click",()=>{const m=race?.mode||"quick";if((m==="career"&&data.championship)||(m==="cup"&&data.cup)){setupMode=m;showPrerace()}else setup(m)});
$("resultAgain").addEventListener("click",()=>{audioStart();startRace()});

function frame(now){
  const dt=Math.min(.1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(page==="race"&&race&&!paused){
    accumulator+=dt;let steps=0;
    while(accumulator>=STEP&&steps<6&&page==="race"&&race&&!resultProcessed){tick(STEP);accumulator-=STEP;steps++}
    if(steps===6)accumulator=0;
    if(page==="race"&&race&&!resultProcessed){
      const style=data.styles[data.selected]||defaultStyle();
      renderRace(ctx,canvas.width,canvas.height,race,view,{dt,reduced:reducedMotion(),style,shape:CARS[data.selected].shape,braking:!!keys.brake});
      renderMinimap(mini,race);updateHud(dt);
    }
  }
  requestAnimationFrame(frame);
}
showWarning();updateWallet();selectedCar=data.selected;draft={...(data.styles[selectedCar]||defaultStyle())};showPage("home");requestAnimationFrame(t=>{lastFrame=t;frame(t)});
