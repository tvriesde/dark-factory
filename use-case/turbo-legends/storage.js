"use strict";
const STORAGE_KEY="turbo-legends-v1";
const defaultStyle=()=>({paint:"#f35d45",wheels:"Classic",stripes:"None",spoiler:"None",body:"Standard"});
const freshData=()=>({version:1,cash:0,owned:[0],selected:0,world:0,tracks:[0],upgrades:{},styles:{},bests:{},championship:null,settings:{music:.4,effects:.6,musicMute:false,effectsMute:false,reduceMotion:false}});
let data=freshData(), storageBlocked=false, storageWarning="";
function validData(d){
  if(!d||d.version!==1||!Number.isSafeInteger(d.cash)||d.cash<0||!Array.isArray(d.owned)||!d.owned.includes(0)||d.owned.some(x=>!Number.isInteger(x)||x<0||x>=CARS.length)||!d.owned.includes(d.selected)||!Number.isInteger(d.world)||d.world<0||d.world>3||!Array.isArray(d.tracks)||!d.tracks.includes(0)||d.tracks.some(x=>!Number.isInteger(x)||x<0||x>=12)||!d.upgrades||typeof d.upgrades!=="object"||!d.styles||typeof d.styles!=="object"||!d.bests||typeof d.bests!=="object"||!d.settings)return false;
  for(const [id,ups] of Object.entries(d.upgrades)){if(!/^[0-8]$/.test(id)||!ups||typeof ups!=="object")return false;for(const [k,v] of Object.entries(ups))if(!(k in UPGRADES)||!Number.isInteger(v)||v<0||v>5)return false}
  const options={paint:["#f35d45","#27c7bd","#f4c85b","#d9e3f2","#815ae5"],wheels:["Classic","Sport","Gold"],stripes:["None","Center","Twin"],spoiler:["None","Sport","Wing"],body:["Standard","Wide","Aero"]};
  for(const [id,style] of Object.entries(d.styles)){if(!/^[0-8]$/.test(id)||!style||Object.keys(options).some(k=>!options[k].includes(style[k])))return false}
  for(const [key,value] of Object.entries(d.bests))if(!/^(?:[0-9]|1[01]):[0-8]$/.test(key)||typeof value!=="number"||!Number.isFinite(value)||value<=0)return false;
  const s=d.settings;if(!["music","effects"].every(k=>typeof s[k]==="number"&&s[k]>=0&&s[k]<=1)||!["musicMute","effectsMute","reduceMotion"].every(k=>typeof s[k]==="boolean"))return false;
  const c=d.championship;if(c!==null&&(!c||!Number.isInteger(c.world)||c.world<0||c.world>3||!Number.isInteger(c.round)||c.round<0||c.round>2||!Array.isArray(c.points)||c.points.length!==8||c.points.some(p=>!Number.isInteger(p)||p<0||p>30)))return false;
  return true;
}
function loadData(){
  try{const raw=localStorage.getItem(STORAGE_KEY);if(raw!==null){const parsed=JSON.parse(raw);if(!validData(parsed))throw Error("invalid");data=parsed}}
  catch(e){storageBlocked=true;storageWarning="Saved data is invalid or storage is unavailable. Progress is session-only; existing data is retained. Reset saved progress in Settings to replace it."}
}
function saveData(){
  if(storageBlocked)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
  catch(e){storageBlocked=true;storageWarning="Storage is unavailable. Progress is session-only and cannot be saved.";showWarning()}
}
function resetStorage(){
  try{localStorage.removeItem(STORAGE_KEY);storageBlocked=false;storageWarning="";data=freshData();saveData();return !storageBlocked}
  catch(e){storageBlocked=true;storageWarning="Storage is unavailable. Progress is session-only.";data=freshData();return false}
}
