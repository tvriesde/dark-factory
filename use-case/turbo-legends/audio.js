"use strict";
let audioContext=null, engineOsc=null, engineGain=null, musicTimer=null, beat=0, audioFailed=false;
function audioStart(){
  if(audioFailed)return;
  try{
    if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();engineOsc=audioContext.createOscillator();engineGain=audioContext.createGain();engineOsc.type="sawtooth";engineGain.gain.value=0;engineOsc.connect(engineGain).connect(audioContext.destination);engineOsc.start();musicTimer=setInterval(musicBeat,360)}
    if(audioContext.state==="suspended")audioContext.resume().catch(audioUnavailable);
  }catch(e){audioUnavailable()}
}
function audioUnavailable(){audioFailed=true;storageWarning+=(storageWarning?" ":"")+"Audio is unavailable in this browser; racing remains playable.";showWarning()}
function tone(freq,duration,type="sine",volume=.15){
  if(!audioContext||audioFailed||data.settings.effectsMute)return;
  const o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(Math.max(.001,volume*data.settings.effects),now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+duration);
}
function musicBeat(){
  if(!audioContext||audioFailed||data.settings.musicMute||document.hidden)return;
  const notes=[110,165,220,165,130.81,196,261.63,196],o=audioContext.createOscillator(),g=audioContext.createGain(),now=audioContext.currentTime;
  o.type="triangle";o.frequency.value=notes[beat++%notes.length];g.gain.setValueAtTime(Math.max(.001,.08*data.settings.music),now);g.gain.exponentialRampToValueAtTime(.001,now+.28);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+.3);
}
function engineSound(speed,running){if(!engineOsc||!audioContext)return;engineOsc.frequency.setTargetAtTime(45+speed*2,audioContext.currentTime,.1);engineGain.gain.setTargetAtTime(running&&!data.settings.effectsMute?.025*data.settings.effects:0,audioContext.currentTime,.1)}
