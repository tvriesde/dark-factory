"use strict";
// Web Audio only: synthesized engine, tyres, effects and a looping retro music pattern.
let audioContext=null,audioFailed=false,master=null,musicGain=null,fxGain=null;
let engineA=null,engineB=null,engineFilter=null,engineGain=null,squealGain=null,noiseBuffer=null,musicTimer=null,musicStep=0,nextNoteTime=0;
function audioStart(){
  if(audioFailed)return;
  try{
    if(!audioContext){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error("no audio");
      audioContext=new AC();master=audioContext.createGain();master.connect(audioContext.destination);
      musicGain=audioContext.createGain();fxGain=audioContext.createGain();musicGain.connect(master);fxGain.connect(master);
      noiseBuffer=audioContext.createBuffer(1,audioContext.sampleRate,audioContext.sampleRate);
      const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      // Engine: two detuned oscillators through a low-pass filter.
      engineA=audioContext.createOscillator();engineB=audioContext.createOscillator();engineA.type="sawtooth";engineB.type="square";
      engineFilter=audioContext.createBiquadFilter();engineFilter.type="lowpass";engineFilter.frequency.value=600;
      engineGain=audioContext.createGain();engineGain.gain.value=0;
      const bGain=audioContext.createGain();bGain.gain.value=.5;
      engineA.connect(engineFilter);engineB.connect(bGain).connect(engineFilter);engineFilter.connect(engineGain).connect(fxGain);
      engineA.start();engineB.start();
      // Tyre squeal: looping band-passed noise whose gain follows the drift amount.
      const sq=audioContext.createBufferSource();sq.buffer=noiseBuffer;sq.loop=true;
      const bp=audioContext.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1900;bp.Q.value=7;
      squealGain=audioContext.createGain();squealGain.gain.value=0;sq.connect(bp).connect(squealGain).connect(fxGain);sq.start();
      nextNoteTime=audioContext.currentTime+.1;musicTimer=setInterval(scheduleMusic,100);
      applyAudioSettings();
    }
    if(audioContext.state==="suspended")audioContext.resume().catch(audioUnavailable);
  }catch(e){audioUnavailable()}
}
function audioUnavailable(){if(audioFailed)return;audioFailed=true;storageWarning+=(storageWarning?" ":"")+"Audio is unavailable in this browser; racing remains playable.";showWarning()}
function applyAudioSettings(){
  if(!audioContext)return;const s=data.settings,now=audioContext.currentTime;
  musicGain.gain.setTargetAtTime(s.musicMute?0:s.music*.5,now,.03);
  fxGain.gain.setTargetAtTime(s.effectsMute?0:s.effects,now,.03);
}
function audioSuspend(){if(audioContext&&audioContext.state==="running")audioContext.suspend().catch(()=>{})}
function audioResume(){if(audioContext&&audioContext.state==="suspended")audioContext.resume().catch(()=>{})}
function tone(freq,duration,type="sine",volume=.15,when=0){
  if(!audioContext||audioFailed)return;
  const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime+when;
  o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g).connect(fxGain);o.start(t);o.stop(t+duration+.02);
}
function noiseBurst(duration,filterType,freq,volume,sweepTo){
  if(!audioContext||audioFailed)return;
  const src=audioContext.createBufferSource(),f=audioContext.createBiquadFilter(),g=audioContext.createGain(),t=audioContext.currentTime;
  src.buffer=noiseBuffer;f.type=filterType;f.frequency.setValueAtTime(freq,t);if(sweepTo)f.frequency.exponentialRampToValueAtTime(sweepTo,t+duration);
  g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);src.connect(f).connect(g).connect(fxGain);src.start(t);src.stop(t+duration+.02);
}
// Engine pitch follows speed (with simple gear steps) and throttle.
function engineSound(speedPct,throttle,running){
  if(!engineA||!audioContext)return;
  const now=audioContext.currentTime,gears=[.18,.36,.55,.75,1.3];let g=0;while(g<gears.length-1&&speedPct>gears[g])g++;
  const lo=g?gears[g-1]:0,rpm=Math.max(0,Math.min(1,(speedPct-lo)/(gears[g]-lo)));
  const f=48+rpm*95+g*14+(throttle?8:0);
  engineA.frequency.setTargetAtTime(f,now,.04);engineB.frequency.setTargetAtTime(f*.503,now,.04);
  engineFilter.frequency.setTargetAtTime(throttle?900+speedPct*900:500,now,.08);
  engineGain.gain.setTargetAtTime(running?(throttle?.09:.05):0,now,.08);
}
function squeal(amount){if(squealGain&&audioContext)squealGain.gain.setTargetAtTime(Math.max(0,Math.min(1,amount))*.06,audioContext.currentTime,.05)}
function sfx(name,strength=1){
  switch(name){
    case "thud":noiseBurst(.25,"lowpass",320,.5*strength);tone(70,.25,"sine",.35*strength);break;
    case "nitro":noiseBurst(.7,"bandpass",400,.35,2600);break;
    case "beep":tone(440,.16,"square",.12);break;
    case "go":tone(880,.4,"square",.14);break;
    case "lap":tone(660,.12,"triangle",.14);tone(990,.18,"triangle",.14,.12);break;
    case "empty":tone(160,.12,"square",.08);break;
    case "fanfare":[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,i===3?.7:.18,"square",.11,i*.15));break;
  }
}
// Original looping chip-tune pattern (bass + arpeggio + hat), scheduled ahead on the audio clock.
const MUSIC_BASS=[110,110,0,110,87.31,87.31,0,87.31,130.81,130.81,0,130.81,98,98,0,123.47];
const MUSIC_ARP=[[440,523.25,659.25],[349.23,440,523.25],[523.25,659.25,783.99],[392,493.88,587.33]];
function scheduleMusic(){
  if(!audioContext||audioFailed||audioContext.state!=="running")return;
  const stepDur=60/138/4;
  if(nextNoteTime<audioContext.currentTime-.5)nextNoteTime=audioContext.currentTime+.05;
  while(nextNoteTime<audioContext.currentTime+.3){
    const s=musicStep%64,bar=Math.floor(s/16),b=MUSIC_BASS[s%16],t=nextNoteTime;
    const note=(f,d,type,v)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(musicGain);o.start(t);o.stop(t+d+.02)};
    if(b)note(b*(bar===2?1.122:1),stepDur*1.6,"square",.09);
    if(s%2===0){const ch=MUSIC_ARP[bar];note(ch[(s/2)%3],stepDur*1.4,"triangle",.06)}
    if(s%4===2){const src=audioContext.createBufferSource(),f=audioContext.createBiquadFilter(),g=audioContext.createGain();src.buffer=noiseBuffer;f.type="highpass";f.frequency.value=7000;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);src.connect(f).connect(g).connect(musicGain);src.start(t);src.stop(t+.06)}
    nextNoteTime+=stepDur;musicStep++;
  }
}
