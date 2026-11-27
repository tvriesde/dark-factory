"use strict";
// All game data is synthetic and lives in plain JS constants (no fetch, no build).
// Environments are referenced by index in saves; display names may change safely.
const WORLDS = [
  {name:"Coast", color:"#e9bd7a", sky:"#87b9d1", skyTop:"#3f86b4", fog:"#a9cfe0",
    groundLight:"#8fbf8a", groundDark:"#759d80", road:"#5b5f66", roadDark:"#555960", rumble:["#d94a3d","#f2efe6"], lane:"#f2efe6",
    parallax:["sea","headland"], names:["Bay Loop","Clifftop Run","Harbor Switchbacks"],
    edge:{kind:"sign",every:0},
    props:[
      {kind:"palm",w:.55,cw:.14,weight:5,min:1.3,max:3.2},
      {kind:"hut",w:.95,cw:.8,weight:1.4,min:2.1,max:3.6},
      {kind:"lighthouse",w:.7,cw:.5,weight:.25,min:3.2,max:4.6},
      {kind:"sign",w:.4,cw:.12,weight:.8,min:1.25,max:1.6}
    ]},
  {name:"Alps", color:"#d9e8ed", sky:"#90bbd2", skyTop:"#4d86b3", fog:"#d6e6ee",
    groundLight:"#a9c4bd", groundDark:"#8aa7a1", road:"#5d6168", roadDark:"#565a61", rumble:["#d94a3d","#f2efe6"], lane:"#f2efe6",
    parallax:["peaks","pines"], names:["Valley Ring","Glacier Pass","Summit Hairpins"],
    edge:{kind:"snowpole",every:10,offset:1.22},
    props:[
      {kind:"pine",w:.6,cw:.2,weight:6,min:1.35,max:3.6},
      {kind:"chalet",w:1,cw:.9,weight:1,min:2.3,max:3.6},
      {kind:"rock",w:.5,cw:.45,weight:1.5,min:1.45,max:3}
    ]},
  {name:"Night City", color:"#ba74e8", sky:"#1b1b3a", skyTop:"#080818", fog:"#26264a",
    groundLight:"#3e4664", groundDark:"#2f3650", road:"#3a3d4a", roadDark:"#343744", rumble:["#e040c8","#f2efe6"], lane:"#f6e9ff",
    parallax:["skyline","towers"], names:["Neon Circuit","Elevated Express","Midnight District"], tunnel:true,
    edge:{kind:"lamp",every:12,offset:1.24},
    props:[
      {kind:"neon",w:.8,cw:.7,weight:2,min:1.6,max:2.6},
      {kind:"barrier",w:.5,cw:.5,weight:2,min:1.25,max:1.45},
      {kind:"building",w:1.7,cw:1.6,weight:3,min:2.8,max:4.6}
    ]},
  {name:"Desert", color:"#eeb76b", sky:"#e6a976", skyTop:"#c9744f", fog:"#e9b98a",
    groundLight:"#d8a26e", groundDark:"#c89261", road:"#6a5f58", roadDark:"#635852", rumble:["#e8772e","#f6efe2"], lane:"#f6efe2",
    parallax:["dunes","mesas"], names:["Oasis Loop","Canyon Trail","Dune Ridge"], haze:true,
    edge:{kind:"drum",every:0},
    props:[
      {kind:"cactus",w:.4,cw:.15,weight:4,min:1.3,max:3.6},
      {kind:"rock",w:.6,cw:.55,weight:2,min:1.5,max:3.6},
      {kind:"drum",w:.18,cw:.18,weight:2,min:1.2,max:1.8},
      {kind:"dsign",w:.35,cw:.1,weight:1,min:1.25,max:1.5}
    ]}
];
// City themes (issue #21), indexed by track id. Colours, parallax layers and two extra roadside props per track.
// Tunnels, haze, edge props, AI pace and unlocks still come from WORLDS[world]. All landmark art is drawn in code.
const darkHex=(hex,f)=>"#"+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*f).toString(16).padStart(2,"0")).join("");
const CITIES=[
  ["Rio de Janeiro","#87b9d1","#3f86b4","#a9cfe0","#8fbf8a","#759d80","#5b5f66",["#d94a3d","#f2efe6"],"#f2efe6",["rioBay","rioHillside"],
    [{kind:"lifeguard",w:.7,cw:.5,min:1.8,max:3.2},{kind:"kiosk",w:.9,cw:.7,min:1.9,max:3.4}]],
  ["Sydney","#8ccbe8","#2c7fc9","#b4dcef","#7fb877","#5f9a62","#5a6068",["#1f5fa8","#f2efe6"],"#f2efe6",["sydHarbour","sydCity"],
    [{kind:"jacaranda",w:.6,cw:.15,min:1.3,max:3.2},{kind:"wharfsign",w:.4,cw:.12,min:1.25,max:1.6}]],
  ["Cape Town","#9fc0d0","#56809f","#c6d6de","#a3b783","#879a68","#5e5f63",["#f2c230","#2b6f4a"],"#f2efe6",["capeTable","capeRows"],
    [{kind:"bathbox",w:.8,cw:.7,min:1.8,max:3.2},{kind:"protea",w:.45,cw:.3,min:1.25,max:1.8}]],
  ["Innsbruck","#90bbd2","#4d86b3","#d6e6ee","#a9c4bd","#8aa7a1","#5d6168",["#d94a3d","#f2efe6"],"#f2efe6",["innPeaks","innOldTown"],
    [{kind:"gondola",w:.6,cw:.3,min:1.8,max:3.4},{kind:"gable",w:1,cw:.9,min:2.2,max:3.6}]],
  ["Vancouver","#8aaabf","#3d6688","#c2d2dc","#7fa58c","#628a72","#555b61",["#e05a2a","#f2efe6"],"#f2efe6",["vanCoastRange","vanCedars"],
    [{kind:"maple",w:.6,cw:.18,min:1.3,max:3.4},{kind:"shelter",w:.9,cw:.7,min:1.8,max:3.2}]],
  ["La Paz","#5f9fdc","#1b55a3","#b0cdea","#b9a37f","#9d8865","#66605a",["#d9302f","#f2d24a"],"#f2efe6",["lpzIllimani","lpzSlopes"],
    [{kind:"cablecar",w:.6,cw:.3,min:1.8,max:3.4},{kind:"stall",w:.9,cw:.7,min:1.8,max:3.2}]],
  ["Tokyo","#1b1b3a","#080818","#26264a","#3e4664","#2f3650","#3a3d4a",["#e040c8","#f2efe6"],"#f6e9ff",["tkyTower","tkySigns"],
    [{kind:"vending",w:.4,cw:.35,min:1.25,max:1.8},{kind:"lantern",w:.35,cw:.12,min:1.25,max:1.6}]],
  ["Chicago","#1a2338","#060a15","#22304a","#3a4553","#2c3440","#3d4047",["#2f9be0","#f2efe6"],"#f6e9ff",["chiLakefront","chiElevated"],
    [{kind:"girder",w:.6,cw:.3,min:1.8,max:3.4},{kind:"clock",w:.35,cw:.12,min:1.25,max:1.7}]],
  ["Hong Kong","#26173c","#0c0619","#33204c","#403c5c","#302c46","#3b3946",["#ff4a4a","#ffd84a"],"#f6e9ff",["hkgPeak","hkgHarbour"],
    [{kind:"bamboo",w:.8,cw:.6,min:1.9,max:3.4},{kind:"tramsign",w:.35,cw:.12,min:1.25,max:1.6}]],
  ["Cairo","#e6a976","#c9744f","#e9b98a","#d8a26e","#c89261","#6a5f58",["#e8772e","#f6efe2"],"#f6efe2",["caiPyramids","caiDomes"],
    [{kind:"datepalm",w:.55,cw:.14,min:1.3,max:3.4},{kind:"obelisk",w:.4,cw:.3,min:1.25,max:1.8}]],
  ["Las Vegas","#f0a878","#7c4a8c","#f2c09c","#cf8a5a","#b6744a","#655a57",["#ff3f8a","#f6efe2"],"#f6efe2",["lvsRedRock","lvsStrip"],
    [{kind:"marquee",w:.5,cw:.15,min:1.3,max:1.8},{kind:"joshua",w:.55,cw:.2,min:1.3,max:3.4}]],
  ["Dubai","#f2c58e","#d68c4c","#f5d3a6","#e6c088","#d2a670","#6e655c",["#1fa39a","#f6efe2"],"#f6efe2",["dxbSpire","dxbDunes"],
    [{kind:"windtower",w:.9,cw:.8,min:2,max:3.6},{kind:"camelsign",w:.4,cw:.1,min:1.25,max:1.6}]]
].map(([city,sky,skyTop,fog,groundLight,groundDark,road,rumble,lane,parallax,props],id)=>{
  const w=WORLDS[Math.floor(id/3)]; // a city that keeps its world's road also keeps the world's dark road shade
  return {city,sky,skyTop,fog,groundLight,groundDark,road,roadDark:road===w.road?w.roadDark:darkHex(road,.93),rumble,lane,parallax,props};
});
// Hand-written layouts: [segments, curve (-6..6, + = right), hill (-60..60, height change), tunnel?]
// Hills in each list sum to zero so a lap ends where it started.
const LAYOUTS = [
  // Coast: gentle to twisty, low hills.
  [[50,0,0],[100,2,0],[80,0,10],[90,-2,-10],[120,0,0],[140,3,15],[70,0,-15],[110,-1.5,20],[90,2.5,-20],[80,0,0],[150,2,0],[60,0,0]],
  [[50,0,0],[90,3,20],[60,0,10],[100,-4,-10],[80,0,-20],[120,2,25],[100,-3,0],[60,0,-25],[110,4,0],[80,-2,15],[90,0,-15],[120,3,0],[50,0,0]],
  [[50,0,0],[70,5,0],[50,0,10],[70,-5,-10],[60,0,0],[80,6,15],[40,0,0],[80,-6,-15],[100,0,20],[90,4,-20],[70,-3,0],[60,5,0],[100,0,10],[80,-4,-10],[60,0,0]],
  // Alps: steepest climbs and drops.
  [[50,0,0],[110,2,30],[90,0,20],[100,-3,-30],[80,0,-20],[120,3,40],[100,-2,-40],[100,0,0],[80,-2,15],[80,0,-15],[130,2.5,0],[60,0,0]],
  [[50,0,0],[100,3,50],[80,-4,10],[60,0,-20],[100,4,-40],[90,0,45],[80,-5,-45],[110,0,0],[90,3,30],[80,-3,-30],[100,2,0],[60,0,0]],
  [[50,0,0],[70,6,40],[40,0,20],[70,-6,20],[60,0,-60],[80,5,60],[50,-5,0],[60,0,-60],[70,6,30],[60,-4,-30],[90,0,0],[70,-6,40],[60,4,-40],[80,0,0],[60,3,0],[40,0,0]],
  // Night City: flatter, with tunnels.
  [[50,0,0],[100,2,0],[120,0,0,1],[90,-3,0],[80,0,10],[100,3,-10],[110,-2,0,1],[100,2.5,0],[80,0,0],[120,-2,0],[100,3,0],[60,0,0]],
  [[50,0,0],[80,3,25],[120,0,0],[90,-4,-25],[100,0,0,1],[80,4,0,1],[90,-3,20],[70,0,-20],[100,4,0],[100,0,0,1],[80,-5,0],[100,3,0],[60,0,0]],
  [[50,0,0],[70,5,0],[60,-5,0],[90,0,0,1],[70,6,0,1],[60,0,15],[80,-6,-15],[70,4,0],[90,-4,0,1],[60,0,0],[80,5,20],[60,-5,-20],[90,0,0],[70,6,0],[60,0,0]],
  // Desert: long sweepers, rolling dunes, sandstorm haze.
  [[60,0,0],[140,2,15],[100,0,-15],[120,-2.5,0],[100,0,20],[110,3,-20],[120,-2,0],[100,0,10],[120,2.5,-10],[60,0,0]],
  [[50,0,0],[90,4,20],[70,-4,-20],[100,0,30],[80,5,-30],[90,-3,0],[60,0,15],[90,-5,-15],[100,4,0],[110,0,0],[80,-3,0],[90,3,0],[50,0,0]],
  [[50,0,0],[70,5,35],[60,-6,-35],[80,0,25],[70,6,-25],[70,-4,0],[90,0,40],[70,5,-40],[60,-6,0],[100,0,0],[70,6,20],[80,-5,-20],[60,3,0],[50,0,0]]
];
const TRACKS = WORLDS.flatMap((world,w)=>world.names.map((name,n)=>({
  id:w*3+n, name, world:w, difficulty:n+1, laps:3, storm:w===3&&n===2,
  sections:LAYOUTS[w*3+n].map(([n2,curve,hill,tunnel])=>({n:n2,curve,hill,tunnel:!!tunnel}))
})));
// shape: coupe (low/wide ducktail), roadster (open top), wedge (flat, big wing), van (tall, light bar).
const CARS = [
  {name:"Comet",price:0,world:0,speed:1,accel:1,grip:1,brake:1,shape:"coupe"},
  {name:"Rally",price:450,world:0,speed:.96,accel:1.08,grip:1.12,brake:1.05,shape:"roadster"},
  {name:"Tide",price:2100,world:0,speed:1.12,accel:1.03,grip:.96,brake:1,shape:"coupe"},
  {name:"Ibex",price:2850,world:1,speed:1.04,accel:1.1,grip:1.09,brake:1.05,shape:"van"},
  {name:"Glacier",price:3750,world:1,speed:1.15,accel:.98,grip:1.06,brake:1.08,shape:"roadster"},
  {name:"Pulse",price:4650,world:2,speed:1.13,accel:1.14,grip:.98,brake:1,shape:"wedge"},
  {name:"Voltage",price:5700,world:2,speed:1.2,accel:1.06,grip:.94,brake:1.02,shape:"wedge"},
  {name:"Dune",price:6750,world:3,speed:1.1,accel:1.12,grip:1.13,brake:1.1,shape:"van"},
  {name:"Mirage",price:7800,world:3,speed:1.24,accel:1.12,grip:1.03,brake:1.08,shape:"wedge"}
];
const UPGRADES = {
  engine:"Acceleration +8% and a little top speed per level", turbo:"Top speed +4% per level",
  tires:"Cornering grip +7% per level", brakes:"Braking +10% per level",
  suspension:"Stability and off-road grip +8% per level", nitro:"Nitro capacity +20% per level"
};
const upgradeCost=level=>300*(level+1); // level = current level; the next one costs 300 × its number
const AI_NAMES=["Mika","Jett","Rosa","Kai","Nova","Axel","Zuri"];
const AI_LOOKS=[
  {paint:"#2fb7c9",stripe:"#f4f4f4",shape:"wedge"},{paint:"#f3bd3d",stripe:"#1d1d1d",shape:"coupe"},
  {paint:"#e2557f",stripe:"#ffffff",shape:"roadster"},{paint:"#7fc35a",stripe:"#173016",shape:"van"},
  {paint:"#8f6ee6",stripe:"#f4c85b",shape:"coupe"},{paint:"#e8e2d4",stripe:"#d93a33",shape:"wedge"},
  {paint:"#ef7f3a",stripe:"#20242c",shape:"roadster"}
];
// AI personalities. cornerLimit is compared with speed²·|curve| (speed as a fraction of the reference top).
const PERSONALITIES = {
  Aggressive:{topMul:1.03,cornerLimit:4.4,overtakeGap:1700,lineBias:.7,mistakeRate:.05,blockChance:.1,lookahead:30},
  Defensive:{topMul:.99,cornerLimit:3.9,overtakeGap:900,lineBias:.5,mistakeRate:.02,blockChance:.6,lookahead:40},
  Technical:{topMul:.98,cornerLimit:4.5,overtakeGap:1200,lineBias:.9,mistakeRate:.015,blockChance:.2,lookahead:50},
  Speedster:{topMul:1.05,cornerLimit:3.6,overtakeGap:1500,lineBias:.4,mistakeRate:.04,blockChance:.1,lookahead:26},
  Balanced:{topMul:1,cornerLimit:4.1,overtakeGap:1200,lineBias:.6,mistakeRate:.03,blockChance:.25,lookahead:40}
};
const AI_SEATS=["Aggressive","Defensive","Technical","Speedster","Balanced","Aggressive","Technical"];
const DIFFICULTY={easy:.88,normal:.96,hard:1.04};
const REWARDS={places:[1000,700,500,350,250,175,125,100],completion:150,win:250,pb:150,objective:250};
const OBJECTIVES=[
  {id:"nowall",label:"Finish without hitting a wall"},
  {id:"nitro",label:"Use nitro 3 times",target:3},
  {id:"drift",label:"Drift for 5 s in total",target:5}
];
const POINTS=[10,8,6,5,4,3,2,1];
