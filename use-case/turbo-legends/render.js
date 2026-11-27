"use strict";
// Canvas 2D renderer: sky, parallax, segment road, sprites, cars, effects, minimap, garage preview.
const CAM_DEPTH=1/Math.tan(50*Math.PI/180), PLAYER_Z=CAM_H*CAM_DEPTH;
const ART={sprites:{},layers:{},cars:{}};
function makeCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
function poly(c,pts,color){c.fillStyle=color;c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fill()}
function shade(hex,f){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,m=v=>Math.max(0,Math.min(255,Math.round(f>1?v+(255-v)*(f-1):v*f)));return "rgb("+m(r)+","+m(g)+","+m(b)+")"}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

// ---------- Roadside sprites (prerendered once per kind) ----------
const SPRITE_DRAW={
  palm:[128,256,g=>{g.strokeStyle="#7a5534";g.lineWidth=12;g.lineCap="round";g.beginPath();g.moveTo(64,252);g.quadraticCurveTo(52,150,74,62);g.stroke();
    g.strokeStyle="#5e4026";g.lineWidth=3;for(let y=240;y>70;y-=16){g.beginPath();g.moveTo(54+(252-y)*.06,y);g.lineTo(70+(252-y)*.06,y-3);g.stroke()}
    g.fillStyle="#2f7a3f";for(let k=0;k<7;k++){const a=-Math.PI+k*Math.PI/6;g.save();g.translate(74,60);g.rotate(a);g.beginPath();g.ellipse(32,6,36,10,.3,0,Math.PI*2);g.fill();g.restore()}
    g.fillStyle="#3f9a50";for(let k=0;k<5;k++){const a=-Math.PI*.9+k*Math.PI/5;g.save();g.translate(74,58);g.rotate(a);g.beginPath();g.ellipse(26,2,26,6,.2,0,Math.PI*2);g.fill();g.restore()}
    g.fillStyle="#5b3b1f";g.beginPath();g.arc(70,66,6,0,7);g.arc(80,64,5,0,7);g.fill()}],
  hut:[160,128,g=>{g.fillStyle="#d8c09a";g.fillRect(18,58,124,66);g.fillStyle="#9a6a3f";g.fillRect(64,80,30,44);g.fillStyle="#7fc4d8";g.fillRect(28,74,26,22);g.fillRect(106,74,26,22);
    poly(g,[4,62,80,10,156,62],"#c79a52");g.fillStyle="#a77c3a";for(let x=12;x<150;x+=10)g.fillRect(x,48+Math.abs(80-x)*-.0,3,14)}],
  lighthouse:[96,320,g=>{poly(g,[28,316,68,316,60,70,36,70],"#f4f1ea");const e=y=>(316-y)/246*8;for(const y of [100,160,220,280])poly(g,[28+e(y+24),y+24,68-e(y+24),y+24,68-e(y),y,28+e(y),y],"#d64a3c");
    g.fillStyle="#2b3440";g.fillRect(30,54,36,18);g.fillStyle="#ffe48a";g.fillRect(36,40,24,16);poly(g,[26,40,48,14,70,40],"#2b3440");g.fillStyle="#30404f";g.fillRect(22,70,52,6)}],
  sign:[96,128,g=>{g.fillStyle="#6b6f76";g.fillRect(20,50,6,78);g.fillRect(70,50,6,78);g.fillStyle="#1f5fa8";rr(g,4,8,88,48,6);g.fill();g.strokeStyle="#fff";g.lineWidth=3;rr(g,8,12,80,40,4);g.stroke();g.fillStyle="#fff";g.font="bold 20px sans-serif";g.textAlign="center";g.fillText("BAY",48,40)}],
  chev:[96,128,g=>{g.fillStyle="#555";g.fillRect(45,70,6,58);g.fillStyle="#ffd23a";g.fillRect(4,8,88,64);g.fillStyle="#141414";for(let k=0;k<3;k++)poly(g,[18+k*26,16,34+k*26,16,52+k*26,40,34+k*26,64,18+k*26,64,36+k*26,40],"#141414")}],
  pine:[128,256,g=>{g.fillStyle="#5a3d25";g.fillRect(56,200,16,56);for(let k=0;k<4;k++){const y=40+k*44,w=26+k*14;poly(g,[64,y-36,64+w,y+40,64-w,y+40],k%2?"#1f5a3e":"#24664a");poly(g,[64,y-36,64+w*.45,y-2,64-w*.45,y-2],"#eef5f7")}}],
  chalet:[180,150,g=>{g.fillStyle="#8a5a33";g.fillRect(20,62,140,84);g.fillStyle="#6d4426";for(let y=70;y<146;y+=10)g.fillRect(20,y,140,2);g.fillStyle="#ffe7a0";g.fillRect(40,86,26,24);g.fillRect(114,86,26,24);g.fillStyle="#4c2f1a";g.fillRect(76,100,28,46);
    poly(g,[2,70,90,10,178,70],"#5b3a22");poly(g,[4,62,90,4,176,62,170,52,90,14,10,52],"#f2f6f8")}],
  snowpole:[24,160,g=>{for(let y=0;y<160;y+=20){g.fillStyle=(y/20)%2?"#f5f5f5":"#d83a2e";g.fillRect(8,y,8,20)}}],
  rock:[140,100,(g,w)=>{const base=w===3?"#a8683f":"#7e8a90";poly(g,[6,98,18,40,52,10,96,18,128,50,136,98],base);poly(g,[52,10,96,18,110,40,60,36,24,46,18,40],shade(base,1.25));poly(g,[96,98,128,50,136,98],shade(base,.75));if(w===1){poly(g,[40,14,52,10,96,18,84,24,50,22],"#f4f8fa")}}],
  neon:[160,200,g=>{g.fillStyle="#2a2a38";g.fillRect(30,100,8,100);g.fillRect(122,100,8,100);g.fillStyle="#141024";rr(g,6,10,148,96,8);g.fill();
    g.shadowColor="#ff3fd0";g.shadowBlur=16;g.strokeStyle="#ff4fd6";g.lineWidth=5;rr(g,14,18,132,80,6);g.stroke();g.shadowColor="#45f0ff";g.fillStyle="#7ff6ff";g.font="bold 34px sans-serif";g.textAlign="center";g.fillText("NEON",80,72);g.shadowBlur=0}],
  lamp:[64,256,g=>{g.fillStyle="#3c4152";g.fillRect(28,20,8,236);g.fillRect(28,18,30,6);g.fillStyle="#ffe9a8";g.shadowColor="#ffd27a";g.shadowBlur=18;g.fillRect(44,24,16,8);g.shadowBlur=0}],
  barrier:[160,60,g=>{poly(g,[4,58,18,10,142,10,156,58],"#c9ccd4");for(let x=10;x<150;x+=36)poly(g,[x,58,x+18,58,x+34,10,x+16,10],"#d8343c");g.fillStyle="#ffd84a";g.fillRect(74,24,12,8)}],
  building:[200,400,g=>{g.fillStyle="#1c1f33";g.fillRect(10,40,180,360);g.fillStyle="#272b45";g.fillRect(10,40,30,360);const r=seeded(5);
    for(let y=60;y<390;y+=22)for(let x=50;x<180;x+=22){if(r()<.55){g.fillStyle=r()<.2?"#ff8ad8":r()<.5?"#ffe39a":"#9fe8ff";g.fillRect(x,y,12,12)}}g.fillStyle="#ff4fd6";g.fillRect(10,36,180,6)}],
  cactus:[100,200,g=>{const c="#3f8a4a";g.fillStyle=c;rr(g,38,20,24,180,12);g.fill();rr(g,8,70,18,60,9);g.fill();rr(g,74,50,18,64,9);g.fill();g.fillRect(14,118,30,14);g.fillRect(58,100,30,14);g.fillStyle="#56a862";g.fillRect(44,26,5,170)}],
  drum:[64,80,g=>{g.fillStyle="#b8452f";g.fillRect(6,8,52,70);g.fillStyle="#8e321f";g.fillRect(6,28,52,5);g.fillRect(6,54,52,5);g.fillStyle="#d26a4f";g.beginPath();g.ellipse(32,8,26,6,0,0,7);g.fill()}],
  dsign:[96,128,g=>{g.fillStyle="#555";g.fillRect(45,64,6,64);poly(g,[48,4,92,48,48,92,4,48],"#ffcf3a");poly(g,[48,12,84,48,48,84,12,48],"#141414");poly(g,[48,18,78,48,48,78,18,48],"#ffcf3a");g.fillStyle="#141414";g.fillRect(44,30,8,26);g.fillRect(44,62,8,8)}]
};
function spriteArt(kind,world){
  const key=kind+(kind==="rock"?world:"");
  if(!ART.sprites[key]){const [w,h,fn]=SPRITE_DRAW[kind],c=makeCanvas(w,h);fn(c.getContext("2d"),world);ART.sprites[key]={c,aspect:h/w}}
  return ART.sprites[key];
}
// ---------- Parallax layers (seamless 1024×256 tiles) ----------
function wave(x,parts){let v=0;for(const [k,a,p] of parts)v+=a*Math.sin(2*Math.PI*k*x/1024+p);return v}
const LAYER_DRAW={
  sea:g=>{g.fillStyle="#5a95b8";g.fillRect(0,200,1024,56);g.fillStyle="#7fb3cf";for(let x=0;x<1024;x+=48)g.fillRect(x+(x*7)%30,214+(x%5)*7,22,2);
    g.fillStyle="#6c8f9a";g.beginPath();g.moveTo(0,200);for(let x=0;x<=1024;x+=8){const h=Math.max(0,wave(x,[[3,30,0],[7,14,1],[2,18,2]]));g.lineTo(x,200-h)}g.lineTo(1024,200);g.fill()},
  headland:g=>{g.fillStyle="#4f8a5c";g.beginPath();g.moveTo(0,256);for(let x=0;x<=1024;x+=8)g.lineTo(x,180-Math.max(0,wave(x,[[2,40,1],[5,14,0],[1,22,3]])));g.lineTo(1024,256);g.fill();
    for(let x=40;x<1024;x+=170){const y=180-Math.max(0,wave(x,[[2,40,1],[5,14,0],[1,22,3]]));g.strokeStyle="#3a5d3d";g.lineWidth=3;g.beginPath();g.moveTo(x,y);g.lineTo(x+4,y-34);g.stroke();g.fillStyle="#3a6d44";g.beginPath();g.ellipse(x+4,y-34,14,4,0,0,7);g.fill()}},
  peaks:g=>{const top=x=>110-wave(x,[[3,40,0],[7,22,1],[13,10,2],[1,16,4]]);g.fillStyle="#7d95ab";g.beginPath();g.moveTo(0,256);for(let x=0;x<=1024;x+=4)g.lineTo(x,top(x));g.lineTo(1024,256);g.fill();
    g.save();g.clip();g.fillStyle="#f3f7fa";g.beginPath();g.moveTo(0,0);for(let x=0;x<=1024;x+=4)g.lineTo(x,top(x)+22+wave(x,[[29,5,0]]));g.lineTo(1024,0);g.fill();g.restore()},
  pines:g=>{const top=x=>190-wave(x,[[2,22,2],[5,10,0]]);g.fillStyle="#2d5b4a";g.beginPath();g.moveTo(0,256);for(let x=0;x<=1024;x+=8)g.lineTo(x,top(x));g.lineTo(1024,256);g.fill();
    for(let x=0;x<1024;x+=14){const y=top(x)+4,h=18+(x*13)%20;poly(g,[x,y-h,x+8,y,x-8,y],"#234b3c")}},
  skyline:g=>{const r=seeded(11);for(let x=0;x<1024;){const w=30+r()*50,h=60+r()*120;g.fillStyle="#232745";g.fillRect(x,256-h,w,h);g.fillStyle="#46406e";for(let y=256-h+8;y<250;y+=12)for(let k=x+5;k<x+w-6;k+=10)if(r()<.25)g.fillRect(k,y,4,5);x+=w+2}},
  towers:g=>{const r=seeded(23);for(let x=0;x<1024;){const w=40+r()*70,h=40+r()*110;g.fillStyle="#141729";g.fillRect(x,256-h,w,h);for(let y=256-h+8;y<250;y+=14)for(let k=x+6;k<x+w-8;k+=12)if(r()<.4){g.fillStyle=r()<.3?"#ff7ad9":"#ffd98a";g.fillRect(k,y,5,7)}if(r()<.5){g.fillStyle=r()<.5?"#3ff0ff":"#ff4fd6";g.fillRect(x,256-h,w,3)}x+=w+6}},
  dunes:g=>{g.fillStyle="#e9be8a";g.beginPath();g.moveTo(0,256);for(let x=0;x<=1024;x+=8)g.lineTo(x,190-wave(x,[[2,26,0],[3,16,1],[7,6,2]]));g.lineTo(1024,256);g.fill()},
  mesas:g=>{const r=seeded(31);g.fillStyle="#b4673e";for(let x=20;x<1024;x+=180+r()*120){const w=70+r()*110,h=50+r()*70;poly(g,[x,256,x+14,256-h,x+w-14,256-h,x+w,256],"#b4673e");g.fillStyle="#cc7d4f";g.fillRect(x+14,256-h,w-28,6)}}
};
// ---------- City art (issue #21): original, schematic shapes drawn in code; no text or logos ----------
// Helpers for seamless 1024×256 tiles. Landmarks sit ≥40px from the tile edges; wave() uses integer k only.
function ridge(g,col,top,step=4){g.fillStyle=col;g.beginPath();g.moveTo(0,256);for(let x=0;x<=1024;x+=step)g.lineTo(x,top(x));g.lineTo(1024,256);g.closePath();g.fill()}
function blocks(g,r,o){
  const x1=o.x1??1024,base=o.base??256;
  for(let x=o.x0??0;x<x1;){
    const w=Math.min(o.minW+r()*(o.maxW-o.minW),x1-x),h=o.minH+r()*(o.maxH-o.minH),top=base-h;
    g.fillStyle=o.cols[Math.floor(r()*o.cols.length)];g.fillRect(x,top,w,h);
    if(o.win)for(let y=top+(o.sy||10);y<base-6;y+=o.sy||12)for(let k=x+4;k<x+w-6;k+=o.sx||9)if(r()<o.winP){g.fillStyle=o.win[Math.floor(r()*o.win.length)];g.fillRect(k,y,o.ww||4,o.wh||5)}
    x+=w+(o.gap||0);
  }
}
function water(g,y,col,hi,r,n=40){g.fillStyle=col;g.fillRect(0,y,1024,256-y);for(let k=0;k<n;k++){g.fillStyle=hi[k%hi.length];g.fillRect(r()*984,y+5+r()*(250-y),12+r()*26,2)}}
function snowCap(g,top,depth,col="#f1f5f8"){g.save();g.clip();g.fillStyle=col;g.beginPath();g.moveTo(0,0);for(let x=0;x<=1024;x+=4)g.lineTo(x,top(x)+depth+wave(x,[[37,5,0]]));g.lineTo(1024,0);g.fill();g.restore()}
Object.assign(LAYER_DRAW,{
  // 0 Rio de Janeiro: granite domes over the bay with a cable-car wire / colourful houses on a green hill
  rioBay:g=>{const r=seeded(101);ridge(g,"#7fa6a4",x=>196-wave(x,[[2,14,0],[5,8,1],[9,4,2]]));
    const dome=(cx,w,h,c,l)=>{g.fillStyle=c;g.beginPath();g.moveTo(cx-w/2,208);g.bezierCurveTo(cx-w/2,208-h*1.25,cx+w*.15,208-h*1.35,cx+w/2,208);g.fill();
      g.fillStyle=l;g.beginPath();g.moveTo(cx-w*.4,208);g.bezierCurveTo(cx-w*.4,208-h*1.1,cx-w*.05,208-h*1.25,cx,208-h*.6);g.lineTo(cx-w*.1,208);g.fill();g.fillStyle="#4f7d5a";g.beginPath();g.ellipse(cx,208,w*.55,h*.16,0,Math.PI,0);g.fill()};
    dome(860,120,46,"#76838a","#8a979d");dome(560,96,72,"#6e7a80","#828e94");dome(700,112,150,"#727f86","#8c999f");
    g.strokeStyle="#2b3238";g.lineWidth=1.5;g.beginPath();g.moveTo(560,140);g.quadraticCurveTo(630,128,690,64);g.stroke();
    g.fillStyle="#e85d4a";g.fillRect(622,118,8,6);g.fillStyle="#f2c14e";g.fillRect(660,94,8,6);
    water(g,208,"#4f8fb5",["#8cc0dc","#6fa8c8"],r)},
  rioHillside:g=>{const r=seeded(102),top=x=>176-wave(x,[[2,30,.5],[3,14,2],[7,6,1]]),cols=["#e85d4a","#f2c14e","#4fb3a9","#f2efe6","#e98fb0","#6aa0e0","#f08a3c"];
    ridge(g,"#4f8a56",top,8);
    for(let k=0;k<280;k++){const x=r()*1004,y=top(x+8)+8+r()*r()*70,w=8+r()*10,h=6+r()*8;g.fillStyle=cols[Math.floor(r()*cols.length)];g.fillRect(x,y-h,w,h);g.fillStyle="#2b2f36";g.fillRect(x+2,y-h+2,2,3)}
    g.fillStyle="#3c6b44";g.fillRect(0,240,1024,16)},
  // 1 Sydney: steel arch bridge and sail-roof hall on the harbour / low glass towers
  sydHarbour:g=>{const r=seeded(103),L=180,R=520,dy=200;
    blocks(g,r,{minW:20,maxW:44,minH:14,maxH:46,base:210,cols:["#8fb4c8","#9dbfd1","#84a9be"],gap:3});
    g.strokeStyle="#4c5966";g.lineWidth=5;const arch=h=>{g.beginPath();for(let x=L;x<=R;x+=4){const t=(x-L)/(R-L);x===L?g.moveTo(x,dy-h*4*t*(1-t)):g.lineTo(x,dy-h*4*t*(1-t))}g.stroke()};arch(112);arch(90);
    g.lineWidth=1.5;for(let x=L+14;x<R;x+=14){const t=(x-L)/(R-L);g.beginPath();g.moveTo(x,dy-112*4*t*(1-t));g.lineTo(x,dy);g.stroke()}
    g.fillStyle="#4c5966";g.fillRect(L-50,dy-4,R-L+100,6);g.fillStyle="#b7b0a2";g.fillRect(L-34,dy-58,24,66);g.fillRect(R+10,dy-58,24,66);
    g.fillStyle="#d8cbb0";g.fillRect(630,196,196,12);
    const sail=(x,w,h,c)=>{g.fillStyle=c;g.beginPath();g.moveTo(x,198);g.quadraticCurveTo(x+w*.1,198-h,x+w,198-h);g.quadraticCurveTo(x+w*.65,198-h*.4,x+w*.9,198);g.closePath();g.fill()};
    [[640,60,62],[688,60,76],[738,50,58],[778,40,40]].forEach(([x,w,h],i)=>sail(x,w,h,i%2?"#f4f1ea":"#e3ddd0"));
    water(g,206,"#2f7db0",["#7fc0e0","#5aa4cf"],r)},
  sydCity:g=>{const r=seeded(104);blocks(g,r,{minW:28,maxW:70,minH:30,maxH:110,cols:["#5d8fb0","#6d9dbb","#4f7f9f","#7aa8c4"],win:["#b9dcee","#93c3dc"],winP:.7,sx:8,sy:9,ww:5,wh:3,gap:6});
    ridge(g,"#3f7a4a",x=>238-wave(x,[[8,6,0],[13,4,1]]),8)},
  // 2 Cape Town: flat-topped mountain with a cloud band / pastel row houses
  capeTable:g=>{const r=seeded(105);ridge(g,"#7f97a6",x=>214-wave(x,[[3,10,0],[6,6,1]]));
    poly(g,[80,256,170,120,236,170,236,256],"#61717f");poly(g,[200,256,290,96,700,92,780,150,860,256],"#66778a");
    g.strokeStyle="#55636f";g.lineWidth=3;for(let x=320;x<680;x+=34+r()*20){g.beginPath();g.moveTo(x,98);g.lineTo(x-8+r()*16,150+r()*40);g.stroke()}
    g.fillStyle="#5c6b78";g.beginPath();g.moveTo(800,256);g.quadraticCurveTo(860,96,900,140);g.quadraticCurveTo(940,190,960,256);g.fill();
    g.fillStyle="#f3f6f8";g.fillRect(290,86,410,12);for(let x=296;x<=694;x+=18){g.beginPath();g.arc(x,88,7+r()*5,0,7);g.fill()}
    ridge(g,"#7d8f80",x=>236-wave(x,[[4,5,0],[9,3,1]]),8)},
  capeRows:g=>{const r=seeded(106),cols=["#f4a9a8","#a8d8c9","#f6d98b","#b9c6f0","#f2efe6","#c9e4a6","#f0b98a"];
    for(let x=0;x<1024;){if(r()<.12){x+=30+r()*40;continue}const w=Math.min(18+r()*10,1024-x),h=34+r()*26,c=cols[Math.floor(r()*cols.length)];
      g.fillStyle=c;g.fillRect(x,240-h,w,h);g.fillStyle=shade(c,.8);g.fillRect(x,240-h,w,4);g.fillStyle="#3b4a5c";g.fillRect(x+4,250-h,4,6);if(w>14)g.fillRect(x+w-8,250-h,4,6);g.fillStyle="#6b4a33";g.fillRect(x+w/2-2,232,5,8);x+=w}
    g.fillStyle="#5f8a5a";g.fillRect(0,240,1024,16)},
  // 3 Innsbruck: jagged peaks with a ski-jump tower / onion-dome tower and pastel gables
  innPeaks:g=>{const top=x=>120-wave(x,[[4,34,.6],[9,18,2],[17,8,1],[2,14,3]]);ridge(g,"#6d8299",top);snowCap(g,top,16);
    ridge(g,"#7a9a8e",x=>226-wave(x,[[3,8,1],[7,4,0]]));
    g.fillStyle="#3f6a55";g.beginPath();g.ellipse(640,256,150,66,0,Math.PI,0);g.fill();
    g.strokeStyle="#e6e9ec";g.lineWidth=7;g.beginPath();g.moveTo(618,118);g.quadraticCurveTo(650,206,760,232);g.stroke();
    g.fillStyle="#c9ccd0";g.fillRect(598,118,14,80);g.fillStyle="#8f969e";g.fillRect(588,104,40,16);g.fillStyle="#d7e8f2";g.fillRect(592,108,32,5)},
  innOldTown:g=>{const r=seeded(107),cols=["#f2d08a","#e9a88f","#b8d4c8","#f2efe6","#d8b4e0","#f4c49a"];
    for(let x=0;x<1024;){const w=Math.min(26+r()*18,1024-x),h=40+r()*30,c=cols[Math.floor(r()*cols.length)],t=256-h;g.fillStyle=c;g.fillRect(x,t,w,h);
      if(r()<.5)poly(g,[x,t,x+w/2,t-w*.55,x+w,t],shade(c,.8));else{g.fillStyle=shade(c,.88);g.fillRect(x+3,t-8,w-6,8);g.fillRect(x+8,t-15,Math.max(4,w-16),7)}
      g.fillStyle="#4a5563";for(let y=t+8;y<246;y+=14)for(let k=x+5;k<x+w-6;k+=10)g.fillRect(k,y,4,6);x+=w+1}
    const tx=480;g.fillStyle="#efe3c8";g.fillRect(tx,70,30,186);g.fillStyle="#d6c7a6";g.fillRect(tx,70,6,186);g.fillStyle="#3c2a20";g.fillRect(tx+10,96,10,14);
    g.fillStyle="#3e7a5a";g.beginPath();g.ellipse(tx+15,58,18,15,0,0,7);g.fill();g.beginPath();g.ellipse(tx+15,38,8,7,0,0,7);g.fill();poly(g,[tx+15,14,tx+19,34,tx+11,34],"#3e7a5a")},
  // 4 Vancouver: snowy coast range with a slim disc-top tower / tall cedars and glass towers
  vanCoastRange:g=>{const r=seeded(108),top=x=>112-wave(x,[[3,30,1.2],[6,16,0],[11,8,2],[1,10,.4]]);ridge(g,"#5c7590",top);snowCap(g,top,22);
    ridge(g,"#2f5446",x=>206-wave(x,[[4,8,0],[13,4,1]]),8);
    blocks(g,r,{x0:300,x1:760,minW:16,maxW:30,minH:10,maxH:44,base:238,cols:["#7f96a8","#8aa3b3","#728a9d"],gap:2});
    const tx=560;g.fillStyle="#c9d2d8";g.fillRect(tx-4,110,8,128);g.fillStyle="#9aa8b2";g.beginPath();g.ellipse(tx,118,22,7,0,0,7);g.fill();g.fillStyle="#c9d2d8";g.fillRect(tx-18,110,36,6);g.fillRect(tx-1,84,2,28);
    g.fillStyle="#3f6f8f";g.fillRect(0,238,1024,18)},
  vanCedars:g=>{const r=seeded(109);blocks(g,r,{minW:22,maxW:40,minH:70,maxH:150,cols:["#6f9bb3","#7fb0c4","#5f8ca6"],win:["#b5dbe8"],winP:.5,sx:7,sy:8,ww:4,wh:2,gap:30});
    for(let x=10;x<1004;x+=12+r()*16){const h=50+r()*80,c=r()<.5?"#1f4a3a":"#2a5a45";g.fillStyle="#4a3426";g.fillRect(x-2,240,4,16);for(let k=0;k<5;k++){const y=256-h+k*h/6,w=4+k*3.2;poly(g,[x,y,x+w,y+h/5,x-w,y+h/5],c)}}},
  // 5 La Paz: three-summit snow peak with a cable line / brick-red houses stacked on slopes
  lpzIllimani:g=>{ridge(g,"#8a9fb8",x=>200-wave(x,[[3,10,0],[7,5,1]]));
    const m=[120,256,300,120,360,140,430,64,480,96,540,58,600,90,660,70,760,140,900,256];poly(g,m,"#6c7f9a");
    g.save();g.beginPath();g.moveTo(m[0],m[1]);for(let i=2;i<m.length;i+=2)g.lineTo(m[i],m[i+1]);g.closePath();g.clip();g.fillStyle="#f4f7fa";g.beginPath();g.moveTo(0,0);for(let x=0;x<=1024;x+=4)g.lineTo(x,112+wave(x,[[23,8,0],[7,6,1]]));g.lineTo(1024,0);g.fill();g.restore();
    ridge(g,"#9c8466",x=>216-wave(x,[[2,8,1],[5,5,0]]));
    g.fillStyle="#cfd4da";g.fillRect(58,150,6,106);g.fillRect(960,132,6,124);
    const cy=t=>152+(134-152)*t+60*t*(1-t);g.strokeStyle="#2b2b2b";g.lineWidth=1.5;g.beginPath();for(let x=60;x<=964;x+=8){const t=(x-60)/904;x===60?g.moveTo(x,cy(t)):g.lineTo(x,cy(t))}g.stroke();
    ["#d9302f","#f2d24a","#2f9a4f"].forEach((c,i)=>{for(let x=120+i*30;x<930;x+=90){const y=cy((x-60)/904);g.fillStyle="#2b2b2b";g.fillRect(x+4,y,1,5);g.fillStyle=c;g.fillRect(x,y+5,10,8)}})},
  lpzSlopes:g=>{const r=seeded(110),top=x=>150-wave(x,[[2,30,1],[4,14,0],[9,6,2]]),cols=["#a5523a","#b8653f","#8e4a35","#c2734e","#9a5a44"];ridge(g,"#9d7a5a",top,8);
    for(let k=0;k<320;k++){const x=r()*1008,y=top(x+6)+10+r()*(240-top(x+6)),w=10+r()*6,h=8+r()*4;g.fillStyle=cols[Math.floor(r()*cols.length)];g.fillRect(x,y-h,w,h);g.fillStyle="#3a2620";g.fillRect(x+3,y-h+3,2,3)}},
  // 6 Tokyo: skyline with a red/white lattice tower (the world already paints the moon) / vertical neon sign stacks
  tkyTower:g=>{const r=seeded(111);blocks(g,r,{minW:26,maxW:60,minH:50,maxH:130,cols:["#262a4a","#2d2f52"],win:["#4a4580","#6a5fa0","#ffd98a"],winP:.22,gap:2});
    const tx=520,half=y=>6+40*Math.pow((y-40)/216,1.4);
    for(let y=40,k=0;y<256;y+=24,k++){const y2=Math.min(256,y+24);poly(g,[tx-half(y),y,tx+half(y),y,tx+half(y2),y2,tx-half(y2),y2],k%2?"#f2efe6":"#e0453a")}
    g.strokeStyle="#7a1e1a";g.lineWidth=1;for(let y=40;y<256;y+=12){const y2=y+12;g.beginPath();g.moveTo(tx-half(y),y);g.lineTo(tx+half(y2),y2);g.moveTo(tx+half(y),y);g.lineTo(tx-half(y2),y2);g.stroke()}
    poly(g,[tx-22,256,tx,214,tx+22,256],"#262a4a");g.fillStyle="#f2efe6";g.fillRect(tx-24,146,48,10);g.fillRect(tx-12,90,24,7);g.fillStyle="#ffd98a";g.fillRect(tx-20,149,40,3);g.fillStyle="#e0453a";g.fillRect(tx-1,10,3,30)},
  tkySigns:g=>{const r=seeded(112),neon=["#ff4fd6","#3ff0ff","#ffd84a","#7cff6b","#ff7a3c"];blocks(g,r,{minW:40,maxW:90,minH:60,maxH:150,cols:["#12142a","#181a33"],win:["#2a2c4a"],winP:.3,gap:4});
    for(let x=20;x<990;x+=50+r()*60){const h=50+r()*80,w=12+r()*8,t=236-h,c=neon[Math.floor(r()*neon.length)];g.fillStyle="#0c0c18";g.fillRect(x,t,w,h);
      g.shadowColor=c;g.shadowBlur=8;g.fillStyle=c;for(let y=t+4;y<t+h-8;y+=14){g.fillRect(x+3,y,w-6,r()<.5?8:4)}g.strokeStyle=c;g.lineWidth=1.5;g.strokeRect(x+1,t+1,w-2,h-2);g.shadowBlur=0}},
  // 7 Chicago: lake and a dark stepped tower with twin antennas / elevated rail girders
  chiLakefront:g=>{const r=seeded(113);blocks(g,r,{minW:22,maxW:48,minH:40,maxH:120,base:222,cols:["#1c2338","#222a42","#1a2034"],win:["#ffd98a","#9fc8ff"],winP:.2,gap:2});
    [[566,64,120],[574,48,170],[584,30,196]].forEach(([x,w,h])=>{g.fillStyle="#12162a";g.fillRect(x,222-h,w,h)});g.fillStyle="#2a3150";for(let y=34;y<218;y+=8)g.fillRect(586,y,26,1);
    g.fillStyle="#8a93a6";g.fillRect(588,6,2,22);g.fillRect(606,6,2,22);g.fillStyle="#ff4a4a";g.fillRect(587,4,4,3);g.fillRect(605,4,4,3);
    water(g,222,"#16223a",["#3a4d70","#2c3c5c","#ffd98a"],r,50)},
  chiElevated:g=>{const r=seeded(114);blocks(g,r,{minW:30,maxW:70,minH:40,maxH:90,cols:["#1f2536","#262c40"],win:["#ffd98a"],winP:.25,gap:3});
    g.fillStyle="#5a6578";for(let x=300;x<560;x+=66){g.fillRect(x,150,62,20);g.fillStyle="#ffe39a";for(let k=x+6;k<x+56;k+=10)g.fillRect(k,154,6,6);g.fillStyle="#5a6578"}
    g.fillStyle="#2d3440";g.fillRect(0,170,1024,14);g.strokeStyle="#2d3440";g.lineWidth=3;g.beginPath();for(let x=0;x<1024;x+=32){g.moveTo(x,184);g.lineTo(x+16,200);g.lineTo(x+32,184)}g.stroke();g.fillRect(0,198,1024,4);
    for(let x=40;x<1024;x+=128){g.fillRect(x,184,10,72);g.beginPath();g.moveTo(x-14,200);g.lineTo(x+5,186);g.lineTo(x+24,200);g.stroke()}},
  // 8 Hong Kong: dark ridge, dense lit towers and a faceted triangle tower / harbour reflections and a junk-sail boat
  hkgPeak:g=>{const r=seeded(115);ridge(g,"#1f1736",x=>120-wave(x,[[2,30,0],[3,20,1.5],[7,8,2]]));
    blocks(g,r,{minW:12,maxW:26,minH:60,maxH:150,cols:["#1a1430","#211a3a","#16102a"],win:["#ffd98a","#ff9ad8","#9fe8ff"],winP:.35,sx:6,sy:8,ww:3,wh:4,gap:1});
    poly(g,[500,256,500,90,540,90,540,256],"#2a3550");poly(g,[500,90,500,62,540,30,540,90],"#3a4870");poly(g,[520,90,540,30,540,90],"#46557e");
    g.strokeStyle="#9fb4d8";g.lineWidth=1.5;g.beginPath();for(let y=90;y<256;y+=40){g.moveTo(500,y);g.lineTo(540,y+40);g.moveTo(540,y);g.lineTo(500,y+40)}g.stroke();g.fillStyle="#c9d4e8";g.fillRect(535,8,2,24)},
  hkgHarbour:g=>{const r=seeded(116);blocks(g,r,{minW:14,maxW:30,minH:10,maxH:40,base:204,cols:["#20183a","#271d44"],win:["#ffd98a","#ff9ad8"],winP:.4,sx:6,sy:7,ww:3,wh:3,gap:1});
    water(g,204,"#140c26",["#ff4fd6","#ffd98a","#3ff0ff","#ff4a4a"],r,70);
    poly(g,[250,216,372,216,356,232,264,232],"#3b2418");g.fillStyle="#3b2418";g.fillRect(300,140,3,76);g.fillRect(346,160,3,56);
    poly(g,[304,212,304,140,338,152,344,212],"#c8402e");poly(g,[350,212,350,160,374,168,378,212],"#d4553a");g.strokeStyle="#7a2016";g.lineWidth=1.5;g.beginPath();for(let y=154;y<212;y+=12){g.moveTo(304,y);g.lineTo(341,y)}for(let y=172;y<212;y+=12){g.moveTo(350,y);g.lineTo(376,y)}g.stroke();
    poly(g,[660,214,780,214,770,230,670,230],"#2f6b4a");g.fillStyle="#e8eef2";g.fillRect(680,200,80,14);g.fillStyle="#ffd98a";for(let x=686;x<754;x+=10)g.fillRect(x,204,6,4)},
  // 9 Cairo: three pyramids on dunes / domes and minarets
  caiPyramids:g=>{ridge(g,"#e3b07a",x=>220-wave(x,[[2,10,0],[5,5,1]]));
    for(const [cx,hw,h] of [[300,110,124],[470,90,100],[590,50,54]]){poly(g,[cx-hw,226,cx,226-h,cx+hw,226],"#d9a066");poly(g,[cx,226-h,cx+hw,226,cx+hw*.3,226],"#b5804e")}
    ridge(g,"#d49a62",x=>238-wave(x,[[3,6,0],[8,3,2]]))},
  caiDomes:g=>{const r=seeded(117);blocks(g,r,{minW:30,maxW:70,minH:24,maxH:60,cols:["#b98a62","#c49770","#a87c58"],win:["#5a3f2c"],winP:.4,sx:10,sy:14,ww:4,wh:6,gap:2});
    const minaret=(x,t)=>{g.fillStyle="#d6b48c";g.fillRect(x,t,8,256-t);g.fillRect(x-3,t+20,14,4);g.fillRect(x-2,t+50,12,3);poly(g,[x-1,t,x+4,t-16,x+9,t],"#8a6a4a")};
    const dome=(x,rad,c)=>{g.fillStyle=c;g.fillRect(x-rad,200,rad*2,56);g.beginPath();g.ellipse(x,200,rad,rad*.95,0,Math.PI,0);g.fill();g.fillStyle="#8a6a4a";g.fillRect(x-1,200-rad-10,2,10)};
    for(const x of [140,380,760,900]){dome(x,24,"#c9a27a");minaret(x+34,130)}
    dome(560,40,"#d2ac82");minaret(500,70);minaret(612,70)},
  // 10 Las Vegas: striped red-rock ridge / resort towers and a needle tower with a pod (no signage)
  lvsRedRock:g=>{const top=x=>120-wave(x,[[2,26,0],[5,16,1],[11,8,2]]);ridge(g,"#b0503a",top);
    g.save();g.clip();["#c9673f","#a8472f","#d98457","#9a3f2c"].forEach((c,i)=>{for(let y=80+i*12;y<256;y+=48){g.fillStyle=c;g.beginPath();g.moveTo(0,y);for(let x=0;x<=1024;x+=8)g.lineTo(x,y+wave(x,[[3,4,i]]));for(let x=1024;x>=0;x-=8)g.lineTo(x,y+7+wave(x,[[3,4,i]]));g.fill()}});g.restore();
    ridge(g,"#8a3f30",x=>222-wave(x,[[4,8,0],[9,4,1]]))},
  lvsStrip:g=>{const r=seeded(118);blocks(g,r,{minW:30,maxW:60,minH:60,maxH:140,cols:["#5a3a5e","#6b4a6e","#4e3354"],win:["#ffd98a","#ffb36b","#ff9ad8"],winP:.45,sx:8,sy:9,ww:4,wh:4,gap:14});
    const tx=700;poly(g,[tx-14,256,tx-4,180,tx+4,180,tx+14,256],"#bfb5ae");g.fillStyle="#d8cfc8";g.fillRect(tx-4,40,8,216);
    g.fillStyle="#e8e0da";g.beginPath();g.ellipse(tx,56,22,11,0,0,7);g.fill();g.fillStyle="#bfb5ae";g.fillRect(tx-16,62,32,6);g.fillStyle="#ffd98a";g.fillRect(tx-18,54,36,3);g.fillStyle="#d8cfc8";g.fillRect(tx-1,8,2,38)},
  // 11 Dubai: a very tall stepped spire / dunes and a sail-shaped tower
  dxbSpire:g=>{const r=seeded(119);blocks(g,r,{minW:18,maxW:40,minH:40,maxH:120,cols:["#c49a7c","#b88f74","#cfa688"],win:["#e8c8a0"],winP:.15,gap:6});
    for(let k=0;k<10;k++){const w=64*(1-k/10)+6,y=256-(k+1)*22;g.fillStyle=k%2?"#a8969b":"#9c8a90";g.fillRect(512-w/2,y,w,22);if(k<6){g.fillStyle="#b9a9ad";g.fillRect(512-w/2-6,y+6,4,16);g.fillRect(512+w/2+2,y+10,4,12)}}
    poly(g,[509,36,512,2,515,36],"#9c8a90")},
  dxbDunes:g=>{ridge(g,"#e2b47a",x=>196-wave(x,[[2,20,0],[3,12,1],[6,5,2]]));g.fillStyle="#5fa8b0";g.fillRect(620,224,200,14);
    g.fillStyle="#cfa070";g.beginPath();g.ellipse(720,232,46,8,0,0,7);g.fill();
    g.fillStyle="#f2efe6";g.beginPath();g.moveTo(702,232);g.lineTo(702,62);g.quadraticCurveTo(776,112,762,232);g.closePath();g.fill();
    g.strokeStyle="#b9b2a8";g.lineWidth=3;g.beginPath();g.moveTo(698,232);g.lineTo(698,50);g.moveTo(702,120);g.lineTo(740,120);g.moveTo(702,180);g.lineTo(756,180);g.stroke();g.fillStyle="#b9b2a8";g.fillRect(744,140,22,4);
    ridge(g,"#d6a46a",x=>240-wave(x,[[4,6,0],[7,3,1]]))}
});
Object.assign(SPRITE_DRAW,{
  lifeguard:[96,192,g=>{g.strokeStyle="#7a5534";g.lineCap="round";g.lineWidth=6;g.beginPath();g.moveTo(22,190);g.lineTo(30,102);g.moveTo(74,190);g.lineTo(66,102);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(28,170);g.lineTo(68,120);g.moveTo(68,170);g.lineTo(28,120);g.stroke();
    g.beginPath();g.moveTo(40,190);g.lineTo(44,106);g.moveTo(56,190);g.lineTo(52,106);for(let y=180;y>110;y-=12){g.moveTo(41,y);g.lineTo(55,y)}g.stroke();
    g.fillStyle="#9a6a3f";g.fillRect(8,100,80,6);g.fillStyle="#f2efe6";g.fillRect(14,60,68,42);g.fillStyle="#d94a3d";g.fillRect(14,80,68,10);g.fillStyle="#7fc4d8";g.fillRect(24,66,48,10);
    poly(g,[6,62,48,32,90,62],"#d94a3d");g.fillStyle="#5b4030";g.fillRect(46,8,3,26);poly(g,[49,8,72,14,49,20],"#f2c14e")}],
  kiosk:[160,128,g=>{g.fillStyle="#7a5534";g.fillRect(26,30,6,34);g.fillRect(128,30,6,34);g.fillStyle="#2f8f5a";g.fillRect(20,62,120,62);g.fillStyle="#f2c14e";g.fillRect(20,62,120,8);
    poly(g,[6,36,154,36,140,12,20,12],"#e85d4a");for(let k=0;k<7;k++)poly(g,[20+k*20,12,30+k*20,12,28+k*21,36,14+k*21,36],"#f2efe6");
    for(let k=0;k<6;k++){g.fillStyle="#5a9a3a";g.beginPath();g.arc(36+k*17,56,7,0,7);g.fill();g.fillStyle="#7fc35a";g.beginPath();g.arc(34+k*17,54,2.5,0,7);g.fill()}
    g.fillStyle="#3b4a5c";g.fillRect(34,100,10,24);g.fillRect(116,100,10,24)}],
  jacaranda:[140,200,g=>{const r=seeded(201);g.strokeStyle="#5b4030";g.lineCap="round";g.lineWidth=12;g.beginPath();g.moveTo(70,198);g.lineTo(68,120);g.stroke();g.lineWidth=6;g.beginPath();g.moveTo(68,130);g.lineTo(36,80);g.moveTo(68,124);g.lineTo(104,74);g.moveTo(68,120);g.lineTo(70,60);g.stroke();
    for(let k=0;k<46;k++){const a=r()*Math.PI*2,d=r()*50;g.fillStyle=["#9a6fd6","#b48ce6","#7f58c0","#c7a6ee"][k%4];g.beginPath();g.arc(70+Math.cos(a)*d*1.15,72+Math.sin(a)*d*.75,9+r()*8,0,7);g.fill()}}],
  wharfsign:[96,128,g=>{g.fillStyle="#6b6f76";g.fillRect(20,56,6,72);g.fillRect(70,56,6,72);g.fillStyle="#1f5fa8";rr(g,4,6,88,54,6);g.fill();g.strokeStyle="#fff";g.lineWidth=3;rr(g,8,10,80,46,4);g.stroke();
    poly(g,[22,38,74,38,66,48,30,48],"#fff");g.fillStyle="#fff";g.fillRect(36,26,24,10);g.fillRect(46,18,4,8);g.strokeStyle="#fff";g.lineWidth=2;g.beginPath();for(let x=18;x<78;x+=12){g.moveTo(x,53);g.quadraticCurveTo(x+3,49,x+6,53);g.quadraticCurveTo(x+9,57,x+12,53)}g.stroke()}],
  bathbox:[100,128,g=>{const cols=["#d94a3d","#f2efe6","#2f6db0","#f2efe6"];for(let k=0;k<8;k++){g.fillStyle=cols[k%4];g.fillRect(14+k*9,46,9,80)}g.fillStyle="#3b3b48";g.fillRect(40,82,20,44);
    poly(g,[6,50,50,12,94,50],"#f2c230");poly(g,[14,50,50,20,86,50],"#e0ae1e")}],
  protea:[120,90,g=>{g.fillStyle="#4f7a4a";g.beginPath();g.ellipse(60,74,56,18,0,0,7);g.fill();g.fillStyle="#5f8f55";g.beginPath();g.ellipse(40,66,28,16,0,0,7);g.ellipse(82,64,28,16,0,0,7);g.fill();
    for(const [x,y,s] of [[34,44,1],[64,34,1.2],[92,46,.9]]){for(let k=-3;k<=3;k++){g.save();g.translate(x,y+10*s);g.rotate(k*.28);poly(g,[-4*s,0,0,-24*s,4*s,0],k%2?"#e86a8a":"#f2a0b8");g.restore()}g.fillStyle="#f6e2c8";g.beginPath();g.ellipse(x,y,5*s,8*s,0,0,7);g.fill()}}],
  gondola:[100,256,g=>{g.strokeStyle="#8f969e";g.lineWidth=5;g.beginPath();g.moveTo(22,256);g.lineTo(44,40);g.moveTo(78,256);g.lineTo(56,40);g.stroke();g.lineWidth=2;g.beginPath();for(let y=60;y<240;y+=24){const a=(y-40)/216;g.moveTo(44-22*a,y);g.lineTo(56+22*((y+24-40)/216),y+24);g.moveTo(56+22*a,y);g.lineTo(44-22*((y+24-40)/216),y+24)}g.stroke();
    g.fillStyle="#5d6168";g.fillRect(8,30,84,8);g.fillStyle="#2b2f36";g.beginPath();g.arc(16,30,6,0,7);g.arc(84,30,6,0,7);g.fill();g.fillRect(83,36,2,24);g.fillStyle="#d94a3d";rr(g,68,58,28,24,4);g.fill();g.fillStyle="#bfe0ee";g.fillRect(72,63,20,8)}],
  gable:[180,170,g=>{const c="#f2d08a";g.fillStyle=c;g.fillRect(20,60,140,108);g.fillRect(36,42,108,20);g.fillRect(56,24,68,20);g.fillRect(76,8,28,18);g.fillStyle="#d9b26a";g.fillRect(20,58,140,4);g.fillRect(36,40,108,3);g.fillRect(56,22,68,3);
    for(const y of [76,112])for(const x of [36,82,128]){g.fillStyle="#3f6a55";g.fillRect(x-6,y,6,22);g.fillRect(x+16,y,6,22);g.fillStyle="#4a5563";g.fillRect(x,y,16,22)}
    g.fillStyle="#5a3d2a";g.beginPath();g.moveTo(78,168);g.lineTo(78,146);g.arc(90,146,12,Math.PI,0);g.lineTo(102,168);g.fill();g.fillStyle="#4a5563";g.fillRect(84,28,12,10)}],
  maple:[140,200,g=>{const r=seeded(202);g.strokeStyle="#5a3d2a";g.lineCap="round";g.lineWidth=12;g.beginPath();g.moveTo(70,198);g.lineTo(70,110);g.stroke();g.lineWidth=5;g.beginPath();g.moveTo(70,130);g.lineTo(40,96);g.moveTo(70,124);g.lineTo(100,90);g.stroke();
    for(let k=0;k<40;k++){const a=r()*Math.PI*2,d=r()*46;g.fillStyle=["#c8322b","#e0552f","#a92a26","#f07a3a"][k%4];g.beginPath();g.arc(70+Math.cos(a)*d*1.1,80+Math.sin(a)*d*.85,10+r()*8,0,7);g.fill()}}],
  shelter:[180,130,g=>{g.fillStyle="#3b4450";g.fillRect(10,16,6,112);g.fillRect(164,16,6,112);g.fillRect(4,12,172,10);g.fillStyle="#9cc6d8";g.fillRect(16,26,120,64);g.fillStyle="#c4e2ee";for(let x=26;x<130;x+=36)g.fillRect(x,30,6,56);g.fillStyle="#3b4450";g.fillRect(16,88,120,3);
    g.fillStyle="#7a5534";g.fillRect(40,98,92,8);g.fillStyle="#3b4450";g.fillRect(46,106,4,22);g.fillRect(122,106,4,22);g.fillStyle="#e8eef2";g.fillRect(138,26,24,76);g.fillStyle="#2f9a6a";g.fillRect(142,32,16,40)}],
  cablecar:[100,256,g=>{poly(g,[40,256,60,256,56,40,44,40],"#c9ced4");g.fillStyle="#2f9a4f";g.fillRect(44,70,12,20);g.fillStyle="#f2d24a";g.fillRect(44,90,12,10);g.fillStyle="#8f969e";g.fillRect(12,28,76,12);
    g.fillStyle="#2b2f36";g.beginPath();g.arc(18,34,6,0,7);g.arc(82,34,6,0,7);g.fill();g.fillRect(17,40,2,20);g.fillStyle="#f2d24a";rr(g,4,58,30,26,4);g.fill();g.fillStyle="#bfe0ee";g.fillRect(8,63,22,8)}],
  stall:[160,128,g=>{const c=["#d9302f","#f2d24a","#2f9a4f"];g.fillStyle="#6b4a33";g.fillRect(16,30,6,98);g.fillRect(138,30,6,98);for(let k=0;k<8;k++){g.fillStyle=c[k%3];g.fillRect(8+k*18,18,18,28);g.beginPath();g.arc(17+k*18,46,9,0,Math.PI);g.fill()}
    g.fillStyle="#8a5a33";g.fillRect(12,78,136,12);g.fillRect(20,90,6,38);g.fillRect(134,90,6,38);const r=seeded(203);for(let k=0;k<18;k++){g.fillStyle=["#f2a03a","#d9302f","#7fc35a","#f2d24a"][k%4];g.beginPath();g.arc(22+r()*116,72+r()*4,5,0,7);g.fill()}}],
  vending:[80,140,g=>{g.fillStyle="#c8323a";rr(g,6,8,68,130,4);g.fill();g.fillStyle="#1b2330";g.fillRect(12,16,40,72);const cols=["#3ff0ff","#ffd84a","#7cff6b","#ff7a3c","#f2efe6"];
    for(let row=0;row<4;row++)for(let k=0;k<5;k++){g.fillStyle=cols[(row+k)%5];g.fillRect(15+k*7,20+row*17,5,12)}g.fillStyle="#f2efe6";g.fillRect(56,18,12,52);g.fillStyle="#5d6168";for(let y=24;y<66;y+=8)g.fillRect(59,y,6,4);g.fillStyle="#111";g.fillRect(14,104,38,12);g.fillStyle="#fff7c2";g.fillRect(12,90,40,4)}],
  lantern:[48,200,g=>{g.fillStyle="#3c3036";g.fillRect(14,30,4,170);g.fillRect(14,28,24,3);g.fillRect(35,30,2,8);g.shadowColor="#ff6a4a";g.shadowBlur=12;g.fillStyle="#e0453a";g.beginPath();g.ellipse(36,54,10,15,0,0,7);g.fill();g.shadowBlur=0;
    g.strokeStyle="#a8302a";g.lineWidth=1;g.beginPath();for(let y=46;y<66;y+=5){g.moveTo(27,y);g.lineTo(45,y)}g.stroke();g.fillStyle="#222";g.fillRect(31,38,10,3);g.fillRect(31,68,10,3)}],
  girder:[80,256,g=>{g.fillStyle="#4a5a6a";g.fillRect(20,22,8,226);g.fillRect(52,22,8,226);g.fillRect(0,10,80,14);g.fillRect(12,246,56,10);g.strokeStyle="#4a5a6a";g.lineWidth=3;g.beginPath();for(let y=30;y<240;y+=24){g.moveTo(28,y);g.lineTo(52,y+12);g.lineTo(28,y+24)}g.stroke();
    g.fillStyle="#7a8a9a";for(let y=30;y<240;y+=16){g.fillRect(23,y,2,2);g.fillRect(55,y,2,2)}for(let x=6;x<76;x+=10)g.fillRect(x,15,2,2)}],
  clock:[64,220,g=>{g.fillStyle="#2f3a2f";g.fillRect(29,74,6,140);g.fillRect(22,204,20,16);g.beginPath();g.arc(32,46,26,0,7);g.fill();g.fillRect(30,12,4,10);g.fillStyle="#f2efe6";g.beginPath();g.arc(32,46,20,0,7);g.fill();
    g.strokeStyle="#1a1d24";g.lineWidth=3;g.lineCap="round";g.beginPath();g.moveTo(32,46);g.lineTo(32,32);g.moveTo(32,46);g.lineTo(42,50);g.stroke();g.fillStyle="#1a1d24";for(let k=0;k<12;k++){const a=k*Math.PI/6;g.fillRect(32+Math.cos(a)*16-1,46+Math.sin(a)*16-1,2,2)}}],
  bamboo:[160,240,g=>{g.fillStyle="#3f8a5a";for(const [x,y] of [[8,8],[56,68],[104,128],[8,188],[104,8]])g.fillRect(x,y,48,60);g.strokeStyle="#5aa874";g.lineWidth=1;g.beginPath();for(let x=8;x<152;x+=8){g.moveTo(x,0);g.lineTo(x,240)}g.stroke();
    g.fillStyle="#c8a96a";for(let x=6;x<160;x+=48)g.fillRect(x,0,5,240);for(let y=6;y<240;y+=30)g.fillRect(0,y,160,4);g.strokeStyle="#b08f52";g.lineWidth=3;g.beginPath();g.moveTo(8,236);g.lineTo(150,10);g.stroke()}],
  tramsign:[64,180,g=>{g.fillStyle="#6b6f76";g.fillRect(29,54,6,126);g.fillStyle="#2f7a4a";rr(g,6,6,52,50,5);g.fill();g.strokeStyle="#fff";g.lineWidth=2;rr(g,9,9,46,44,4);g.stroke();
    g.fillStyle="#fff";rr(g,16,22,32,22,3);g.fill();g.fillStyle="#2f7a4a";g.fillRect(19,26,8,7);g.fillRect(29,26,8,7);g.fillRect(39,26,6,7);g.strokeStyle="#fff";g.beginPath();g.moveTo(26,22);g.lineTo(32,14);g.lineTo(38,22);g.stroke();g.fillStyle="#fff";g.beginPath();g.arc(22,46,3,0,7);g.arc(42,46,3,0,7);g.fill()}],
  datepalm:[128,256,g=>{g.fillStyle="#8a6a46";g.fillRect(56,84,16,172);g.strokeStyle="#6e5236";g.lineWidth=2;g.beginPath();for(let y=92;y<252;y+=10){g.moveTo(56,y);g.lineTo(72,y+8);g.moveTo(72,y);g.lineTo(56,y+8)}g.stroke();
    for(let k=0;k<11;k++){const a=-Math.PI+k*Math.PI/10-.1;g.save();g.translate(64,80);g.rotate(a);g.fillStyle=k%2?"#4f7f3a":"#6a9a48";g.beginPath();g.ellipse(34,k%3?8:2,36,6,.35,0,7);g.fill();g.restore()}
    g.fillStyle="#d97a2a";for(const [x,y] of [[52,92],[58,96],[74,94],[68,98]]){g.beginPath();g.arc(x,y,4,0,7);g.fill()}}],
  obelisk:[60,200,g=>{g.fillStyle="#a8855e";g.fillRect(8,188,44,12);poly(g,[18,190,42,190,37,30,23,30],"#c9a37a");poly(g,[30,190,42,190,37,30,30,30],"#b48d63");poly(g,[23,30,37,30,30,12],"#e2c08f");g.fillStyle="#a8855e";for(let y=50;y<170;y+=24)g.fillRect(26,y,4,10)}],
  marquee:[140,220,g=>{g.fillStyle="#3c3036";g.fillRect(64,104,12,116);poly(g,[8,18,110,18,134,62,110,106,8,106],"#7c2a6a");poly(g,[16,26,106,26,124,62,106,98,16,98],"#2a1430");
    [["#ff3f8a",38],["#3ff0ff",58],["#ffd84a",78]].forEach(([c,y])=>{g.fillStyle=c;g.fillRect(26,y-6,76,8)});g.fillStyle="#ffe39a";
    const edge=[[8,18],[110,18],[134,62],[110,106],[8,106],[8,18]];for(let i=0;i<5;i++){const [ax,ay]=edge[i],[bx,by]=edge[i+1],n=Math.max(1,Math.round(Math.hypot(bx-ax,by-ay)/10));for(let k=0;k<n;k++){g.beginPath();g.arc(ax+(bx-ax)*k/n,ay+(by-ay)*k/n,2.6,0,7);g.fill()}}}],
  joshua:[140,190,g=>{g.strokeStyle="#6b5a44";g.lineCap="round";g.lineWidth=10;g.beginPath();g.moveTo(70,188);g.lineTo(70,110);g.lineTo(40,80);g.lineTo(34,46);g.moveTo(70,114);g.lineTo(100,84);g.lineTo(108,52);g.moveTo(70,110);g.lineTo(74,60);g.stroke();
    g.strokeStyle="#6a8a4a";g.lineWidth=3;for(const [x,y] of [[34,44],[108,50],[74,58]]){g.beginPath();for(let k=0;k<14;k++){const a=k/14*Math.PI*2;g.moveTo(x,y);g.lineTo(x+Math.cos(a)*16,y+Math.sin(a)*14)}g.stroke()}}],
  windtower:[130,230,g=>{g.fillStyle="#d9b88a";g.fillRect(8,140,114,88);g.fillStyle="#c4a274";g.fillRect(8,140,114,6);g.fillStyle="#d0ad7e";g.fillRect(60,30,44,112);g.fillStyle="#bd9a6c";g.fillRect(96,30,8,112);
    for(let x=62;x<104;x+=10){g.fillStyle="#d0ad7e";g.fillRect(x,22,6,8)}g.fillStyle="#5a3f2c";for(let x=64;x<100;x+=9)g.fillRect(x,40,5,40);g.fillRect(24,180,22,48);g.fillRect(70,168,14,18)}],
  camelsign:[96,128,g=>{g.fillStyle="#555";g.fillRect(45,80,6,48);poly(g,[48,4,94,84,2,84],"#d9302f");poly(g,[48,18,82,76,14,76],"#f6f3ea");g.fillStyle="#141414";
    g.beginPath();g.ellipse(46,56,13,6,0,0,7);g.fill();g.beginPath();g.arc(44,50,6,Math.PI,0);g.fill();g.fillRect(34,58,2,12);g.fillRect(40,58,2,12);g.fillRect(52,58,2,12);g.fillRect(56,58,2,12);
    g.lineWidth=3;g.strokeStyle="#141414";g.beginPath();g.moveTo(57,54);g.lineTo(62,42);g.lineTo(67,42);g.stroke()}]
});
function layerArt(name){if(!ART.layers[name]){const c=makeCanvas(1024,256);LAYER_DRAW[name](c.getContext("2d"));ART.layers[name]=c}return ART.layers[name]}

// ---------- Cars: rear-view silhouettes ----------
// drawCar(ctx, centreX, bottomY, width, shape, style, yaw[-1..1], opts{brake, wheel})
function drawCar(c,x,y,w,shape,style,yaw=0,opts={}){
  const s=style||defaultStyle(),wide=s.body==="Wide"?1.08:1,u=w*wide;
  const dims={coupe:{h:.26,cab:.17,ct:.52,cb:.72},wedge:{h:.2,cab:.11,ct:.5,cb:.7},roadster:{h:.25,cab:0,ct:.4,cb:.6},van:{h:.36,cab:.27,ct:.82,cb:.88}}[shape]||{h:.26,cab:.17,ct:.52,cb:.72};
  const bodyTop=y-u*(.1+dims.h), lean=-yaw*u*.06;
  c.save();
  c.fillStyle="rgba(0,0,0,.35)";c.beginPath();c.ellipse(x,y-u*.01,u*.56,u*.06,0,0,Math.PI*2);c.fill();
  // side panel revealed when yawing
  if(Math.abs(yaw)>.05){const side=yaw>0?-1:1,sw=Math.abs(yaw)*u*.14;poly(c,[x+side*u*.5,y-u*.06,x+side*(u*.5+sw),y-u*.09,x+side*(u*.5+sw)+lean,bodyTop+u*.04,x+side*u*.5+lean,bodyTop],shade(s.paint,.62))}
  // tyres with animated tread
  const phase=(opts.wheel||0)%1;
  for(const side of [-1,1]){
    const tx=x+side*u*.4-u*.085,ty=y-u*.17;c.fillStyle="#121418";rr(c,tx,ty,u*.17,u*.17,u*.03);c.fill();
    c.fillStyle="#2a2e35";for(let k=0;k<3;k++){const yy=ty+((k/3+phase)%1)*u*.17;c.fillRect(tx+u*.02,yy,u*.13,u*.018)}
    c.fillStyle=s.wheels==="Gold"?"#e8bf57":s.wheels==="Sport"?"#dce7ed":"#8795a6";c.fillRect(x+side*u*.49-(side>0?u*.025:0),ty+u*.05,u*.025,u*.07);
  }
  // body
  const bw=u*.5;
  poly(c,[x-bw,y-u*.1,x+bw,y-u*.1,x+bw*.97+lean,bodyTop,x-bw*.97+lean,bodyTop],s.paint);
  poly(c,[x-bw,y-u*.1,x+bw,y-u*.1,x+bw*.98,y-u*.05,x-bw*.98,y-u*.05],shade(s.paint,.55));
  if(s.body==="Wide")for(const side of [-1,1])poly(c,[x+side*bw,y-u*.1,x+side*bw*1.04,y-u*.12,x+side*bw*1.02+lean,bodyTop+u*.05,x+side*bw*.96+lean,bodyTop+u*.03],shade(s.paint,.8));
  if(s.body==="Aero"){c.fillStyle="#1a1d24";c.fillRect(x-bw*.7,y-u*.06,bw*1.4,u*.035);c.fillStyle="#3a3f49";for(let k=-2;k<=2;k++)c.fillRect(x+k*bw*.22-u*.006,y-u*.07,u*.012,u*.035)}
  // cabin
  const ct=u*dims.ct/2,cb=u*dims.cb/2,cabTop=bodyTop-u*dims.cab,l2=lean*1.8;
  if(dims.cab>0){poly(c,[x-cb+lean,bodyTop,x+cb+lean,bodyTop,x+ct+l2,cabTop,x-ct+l2,cabTop],shade(s.paint,.85));
    poly(c,[x-cb*.86+lean,bodyTop-u*.012,x+cb*.86+lean,bodyTop-u*.012,x+ct*.86+l2,cabTop+u*.025,x-ct*.86+l2,cabTop+u*.025],"#22384c");
    c.fillStyle="rgba(255,255,255,.18)";poly(c,[x-cb*.5+lean,bodyTop-u*.02,x-cb*.3+lean,bodyTop-u*.02,x-ct*.2+l2,cabTop+u*.03,x-ct*.4+l2,cabTop+u*.03],"rgba(255,255,255,.16)")}
  else{ // roadster: roll hoop and driver helmet
    c.fillStyle="#1d2530";c.fillRect(x-u*.2+lean,bodyTop-u*.02,u*.4,u*.03);
    c.fillStyle="#f2f2f2";c.beginPath();c.arc(x-u*.08+l2,bodyTop-u*.07,u*.065,0,Math.PI*2);c.fill();c.fillStyle="#2a3c55";c.fillRect(x-u*.14+l2,bodyTop-u*.08,u*.12,u*.03);
    c.strokeStyle="#c7ced6";c.lineWidth=Math.max(1,u*.018);c.beginPath();c.moveTo(x+u*.02+lean,bodyTop);c.lineTo(x+u*.04+l2,bodyTop-u*.1);c.lineTo(x+u*.2+l2,bodyTop-u*.1);c.lineTo(x+u*.22+lean,bodyTop);c.stroke()}
  if(shape==="coupe")poly(c,[x-bw*.92+lean,bodyTop,x+bw*.92+lean,bodyTop,x+bw*.86+lean,bodyTop-u*.03,x-bw*.86+lean,bodyTop-u*.03],shade(s.paint,1.1)); // ducktail
  if(shape==="van"){c.fillStyle="#20242b";c.fillRect(x-ct*.8+l2,cabTop-u*.035,ct*1.6,u*.035);for(let k=0;k<4;k++){c.fillStyle=k%2?"#ffb43a":"#58c8ff";c.fillRect(x-ct*.7+l2+k*ct*.37,cabTop-u*.03,ct*.28,u*.022)}}
  // stripes
  if(s.stripes&&s.stripes!=="None"){const sc=s.stripeColor||"#f9ebcd";c.fillStyle=sc;const xs=s.stripes==="Twin"?[-.09,.06]:[-.025];for(const o of xs){c.fillRect(x+u*o+lean,bodyTop,u*.05,u*(dims.h-.02));if(dims.cab>0)c.fillRect(x+u*o+l2,cabTop,u*.05,u*.022)}}
  // lights, plate, exhausts
  const lit=opts.brake?"#ff3b30":"#c8202a";
  for(const side of [-1,1]){c.fillStyle=lit;c.fillRect(x+side*bw*.62-u*.09+lean*.5,bodyTop+u*.04,u*.18,u*.05);if(opts.brake){c.fillStyle="rgba(255,60,40,.35)";c.fillRect(x+side*bw*.62-u*.12,bodyTop+u*.02,u*.24,u*.09)}}
  c.fillStyle="#f2ead2";c.fillRect(x-u*.08+lean*.5,y-u*.16,u*.16,u*.05);c.fillStyle="#2a2a2a";c.fillRect(x-u*.06+lean*.5,y-u*.145,u*.12,u*.02);
  c.fillStyle="#2b2b30";for(const side of [-1,1]){c.beginPath();c.arc(x+side*u*.22,y-u*.07,u*.022,0,Math.PI*2);c.fill()}
  // spoiler / wing
  const wing=s.spoiler==="Wing"||shape==="wedge", sport=s.spoiler==="Sport";
  if(wing){const wy=cabTop-u*(shape==="wedge"?.08:.05);c.fillStyle="#1f232b";c.fillRect(x-u*.3+l2,wy,u*.03,bodyTop-wy);c.fillRect(x+u*.27+l2,wy,u*.03,bodyTop-wy);poly(c,[x-u*.54+l2,wy,x+u*.54+l2,wy,x+u*.5+l2,wy-u*.045,x-u*.5+l2,wy-u*.045],s.spoiler==="Wing"?"#e8edf2":shade(s.paint,.7))}
  else if(sport)poly(c,[x-bw*.9+lean,bodyTop,x+bw*.9+lean,bodyTop,x+bw*.94+lean,bodyTop-u*.035,x-bw*.94+lean,bodyTop-u*.035],"#e0e5e9");
  c.restore();
  return {exhaustY:y-u*.07,exhaustX:[x-u*.22,x+u*.22]};
}
function aiCarArt(car,frame){
  const key=car.id+":"+frame;
  if(!ART.cars[key]){const c=makeCanvas(220,150);drawCar(c.getContext("2d"),110,146,200,car.look.shape,{paint:car.look.paint,stripes:"Center",stripeColor:car.look.stripe,wheels:"Sport",spoiler:"None",body:"Standard"},(frame-2)/2);ART.cars[key]=c}
  return ART.cars[key];
}

// ---------- Race scene ----------
const PROJ=Array.from({length:DRAW_DIST},()=>({}));
function newView(){return {sky:0,shake:0,flash:0,fov:0,particles:[],time:0,wheel:0,lastZ:null}}
function renderRace(c,W,H,race,view,opt){
  const t=race.track,world=t.world,wi=t.def.world,p=race.player,N=t.N,L=t.length,segs=t.segs,reduced=opt.reduced,dt=opt.dt;
  view.time+=dt;
  const topSp=p.stats.top;
  // Parallax offset accumulates with curve × distance travelled.
  const pseg=segAt(t,p.z);
  if(view.lastZ!==null){let dz=p.z-view.lastZ;if(dz<-L/2)dz+=L;view.sky+=pseg.curve*dz/SEG;view.wheel+=dz/420}
  view.lastZ=p.z;
  view.fov+=((p.nitroActive&&!reduced?1:0)-view.fov)*Math.min(1,dt*4);
  const depth=CAM_DEPTH/(1+.15*view.fov);
  const camZw=((p.z-PLAYER_Z)%L+L)%L, baseIdx=Math.floor(camZw/SEG), basePct=(camZw%SEG)/SEG;
  const ppct=(p.z%SEG)/SEG, playerY=pseg.y1+(pseg.y2-pseg.y1)*ppct, camY=playerY+CAM_H, camX=p.x*ROAD_W;
  const inTunnel=pseg.tunnel&&segs[baseIdx].tunnel;
  c.save();
  if(view.shake>0&&!reduced){c.translate((Math.random()-.5)*view.shake*18,(Math.random()-.5)*view.shake*12)}
  view.shake=Math.max(0,view.shake-dt*2.5);
  // Sky
  const hz=H/2;
  const grad=c.createLinearGradient(0,0,0,hz);grad.addColorStop(0,world.skyTop);grad.addColorStop(.75,world.sky);grad.addColorStop(1,world.fog);
  c.fillStyle=grad;c.fillRect(-20,-20,W+40,hz+22);
  if(wi===2){c.fillStyle="#f4f1d8";c.beginPath();c.arc(W*.78,H*.12,H*.045,0,Math.PI*2);c.fill();c.fillStyle=world.skyTop;c.beginPath();c.arc(W*.79,H*.11,H*.04,0,Math.PI*2);c.fill();
    c.fillStyle="#cfd3ff";for(let k=0;k<40;k++){const sx=((k*97)%100)/100*W,sy=((k*61)%100)/100*hz*.8;c.fillRect(sx,sy,2,2)}}
  if(wi===3){c.fillStyle="rgba(255,236,190,.85)";c.beginPath();c.arc(W*.25,H*.16,H*.06,0,Math.PI*2);c.fill()}
  c.fillStyle=world.groundDark;c.fillRect(-20,hz,W+40,H-hz+20);
  if(!inTunnel){
    const yShift=Math.max(-H*.08,Math.min(H*.08,playerY/30000*H*.1));
    const drawLayer=(img,height,offset,bottom)=>{const sc=height/256,tw=1024*sc;let ox=-(((offset%tw)+tw)%tw);for(let x=ox;x<W;x+=tw)c.drawImage(img,x,bottom-height,tw+1,height)};
    drawLayer(layerArt(world.parallax[0]),H*.2,view.sky*W*.0009,hz+yShift+2);
    drawLayer(layerArt(world.parallax[1]),H*.14,view.sky*W*.0027,hz+yShift*1.4+4);
  }
  // Project segments near → far (curves accumulate x, hills set y).
  let x=0,dx=-(segs[baseIdx].curve*basePct),maxy=H;
  const fogDensity=t.def.storm?9:world.haze?6:4.5;
  for(let n=0;n<DRAW_DIST;n++){
    const s=segs[(baseIdx+n)%N],pr=PROJ[n],sz=s.z+(baseIdx+n>=N?L:0),cz1=sz-camZw,cz2=cz1+SEG;
    pr.s=s;pr.cz=cz1;pr.sc1=depth/cz1;pr.sc2=depth/cz2;
    pr.x1=W/2+pr.sc1*(x-camX)*W/2;pr.y1=hz-pr.sc1*(s.y1-camY)*H/2;pr.w1=pr.sc1*ROAD_W*W/2;
    pr.x2=W/2+pr.sc2*(x+dx-camX)*W/2;pr.y2=hz-pr.sc2*(s.y2-camY)*H/2;pr.w2=pr.sc2*ROAD_W*W/2;
    x+=dx;dx+=s.curve;
    pr.front=cz1>depth*20;pr.visible=pr.front&&pr.y2<pr.y1&&pr.y2<maxy;
    if(pr.visible)maxy=pr.y2;
    pr.clipY=maxy;pr.fog=1-Math.exp(-(n/DRAW_DIST)*(n/DRAW_DIST)*fogDensity);pr.cars=null;
  }
  // Bucket cars by segment (player included so draw order is correct).
  for(const car of race.cars){
    let d=car.z-camZw;if(d<0)d+=L;const n=Math.floor((d+(camZw%SEG))/SEG);
    if(n>=0&&n<DRAW_DIST){(PROJ[n].cars||(PROJ[n].cars=[])).push(car)}
  }
  const rumbleA=world.rumble[0],rumbleB=world.rumble[1];
  let playerDrawn=false;
  for(let n=DRAW_DIST-1;n>=0;n--){
    const pr=PROJ[n],s=pr.s;
    if(pr.visible){
      const {x1,y1,w1,x2,y2,w2}=pr,r1=w1*.12,r2=w2*.12,yb=n<3?H+20:y1;
      c.fillStyle=s.tunnel?(s.band?"#2c2a3c":"#262434"):(s.band?world.groundLight:world.groundDark);c.fillRect(-20,y2,W+40,yb-y2+1);
      poly(c,[x1-w1-r1,y1,x1-w1,y1,x2-w2,y2,x2-w2-r2,y2],s.band?rumbleA:rumbleB);
      poly(c,[x1+w1+r1,y1,x1+w1,y1,x2+w2,y2,x2+w2+r2,y2],s.band?rumbleA:rumbleB);
      poly(c,[x1-w1,y1,x1+w1,y1,x2+w2,y2,x2-w2,y2],s.band?world.road:world.roadDark);
      if(s.i<2){const cols=14;for(let k=0;k<cols;k++){if((k+s.i)%2)continue;const a=-1+2*k/cols,b=-1+2*(k+1)/cols;poly(c,[x1+w1*a,y1,x1+w1*b,y1,x2+w2*b,y2,x2+w2*a,y2],"#f4f4f4")}
        for(let k=0;k<cols;k++){if(!((k+s.i)%2))continue;const a=-1+2*k/cols,b=-1+2*(k+1)/cols;poly(c,[x1+w1*a,y1,x1+w1*b,y1,x2+w2*b,y2,x2+w2*a,y2],"#15161a")}}
      else if(s.band){const l1=w1*.025,l2=w2*.025;for(const o of [-1/3,1/3])poly(c,[x1+w1*o-l1,y1,x1+w1*o+l1,y1,x2+w2*o+l2,y2,x2+w2*o-l2,y2],world.lane)}
      if(pr.fog>.02){c.globalAlpha=pr.fog;c.fillStyle=s.tunnel?"#12101c":world.fog;c.fillRect(-20,y2,W+40,yb-y2+1);c.globalAlpha=1}
    }
    if(!pr.front)continue;
    if(s.tunnel)drawTunnel(c,W,H,pr,s);
    // Start gantry
    if(s.i===1){const gx1=pr.x1-pr.w1*1.2,gx2=pr.x1+pr.w1*1.2,top=pr.y1-pr.sc1*2400*H/2,pw=Math.max(2,pr.w1*.06),bh=Math.max(3,pr.sc1*380*H/2);
      c.fillStyle="#3b3f48";c.fillRect(gx1-pw/2,top,pw,pr.y1-top);c.fillRect(gx2-pw/2,top,pw,pr.y1-top);
      const cells=16,cw=(gx2-gx1)/cells;for(let k=0;k<cells;k++){c.fillStyle=k%2?"#111":"#f4f4f4";c.fillRect(gx1+k*cw,top,cw+.5,bh/2);c.fillStyle=k%2?"#f4f4f4":"#111";c.fillRect(gx1+k*cw,top+bh/2,cw+.5,bh/2)}}
    // Roadside sprites
    if(s.sprites.length){
      c.globalAlpha=pr.fog>.6?Math.max(0,1-(pr.fog-.6)*2.5):1;
      for(const sp of s.sprites){
        const art=spriteArt(sp.kind,wi),sw=sp.w*pr.w1,sh=sw*art.aspect,sx=pr.x1+sp.offset*pr.w1;
        if(sw<1||sx+sw/2<0||sx-sw/2>W)continue;
        if(sp.flip){c.save();c.translate(sx,0);c.scale(-1,1);c.drawImage(art.c,-sw/2,pr.y1-sh,sw,sh);c.restore()}
        else c.drawImage(art.c,sx-sw/2,pr.y1-sh,sw,sh);
      }
      c.globalAlpha=1;
    }
    if(s.portalIn)drawPortal(c,W,H,pr);
    // Cars on this segment, far first
    if(pr.cars){
      pr.cars.sort((a,b)=>{let da=a.z-camZw,db=b.z-camZw;if(da<0)da+=L;if(db<0)db+=L;return db-da});
      for(const car of pr.cars){
        if(car===p){drawPlayer(c,W,H,race,view,opt);playerDrawn=true;continue}
        let d=car.z-camZw;if(d<0)d+=L;const pct=(d%SEG)/SEG;
        if(d<=depth*20)continue;
        const sc=depth/d,cx=pr.x1+(pr.x2-pr.x1)*pct+sc*car.x*ROAD_W*W/2,cy=pr.y1+(pr.y2-pr.y1)*pct,cw=sc*CAR_W*ROAD_W*W/2;
        if(cw<2||cx<-cw||cx>W+cw)continue;
        const frame=Math.max(0,Math.min(4,Math.round(2+(car.yaw+s.curve*.08)*2))),img=aiCarArt(car,frame),ih=cw*150/200;
        c.globalAlpha=pr.fog>.6?Math.max(0,1-(pr.fog-.6)*2.5):1;
        c.drawImage(img,cx-cw*1.1/2*1,cy-ih+cw*.02,cw*1.1,ih);c.globalAlpha=1;
        if(car.drifting&&cw>20)spawn(view,cx,cy,cw,"smoke",reduced);
      }
    }
  }
  if(!playerDrawn)drawPlayer(c,W,H,race,view,opt);
  drawEffects(c,W,H,race,view,opt,world);
  c.restore();
}
function drawTunnel(c,W,H,pr,s){
  const {x1,y1,w1,x2,y2,w2,sc1,sc2}=pr,ry1=y1-sc1*TUNNEL_H*H/2,ry2=y2-sc2*TUNNEL_H*H/2,k=1.18,lx1=x1-w1*k,rx1=x1+w1*k,lx2=x2-w2*k,rx2=x2+w2*k;
  poly(c,[lx1,ry1,rx1,ry1,rx2,ry2,lx2,ry2],s.band?"#1c1b28":"#191824");
  const wall=s.band?"#3a3550":"#332f48";
  poly(c,[lx1,y1,lx1,ry1,lx2,ry2,lx2,y2],wall);poly(c,[rx1,y1,rx1,ry1,rx2,ry2,rx2,y2],wall);
  if(s.i%4===0){
    const m1=y1+(ry1-y1)*.45,m2=y2+(ry2-y2)*.45,n1=y1+(ry1-y1)*.5,n2=y2+(ry2-y2)*.5;
    poly(c,[lx1,m1,lx1,n1,lx2,n2,lx2,m2],"#ff9a3c");poly(c,[rx1,m1,rx1,n1,rx2,n2,rx2,m2],"#ff9a3c");
    poly(c,[x1-w1*.12,ry1,x1+w1*.12,ry1,x2+w2*.12,ry2,x2-w2*.12,ry2],"#ffe9a8");
  }
  if(pr.fog>.02){c.globalAlpha=pr.fog;const f="#12101c";poly(c,[lx1,ry1,rx1,ry1,rx2,ry2,lx2,ry2],f);poly(c,[lx1,y1,lx1,ry1,lx2,ry2,lx2,y2],f);poly(c,[rx1,y1,rx1,ry1,rx2,ry2,rx2,y2],f);c.globalAlpha=1}
}
function drawPortal(c,W,H,pr){
  const {x1,y1,w1,sc1}=pr,ry=y1-sc1*TUNNEL_H*H/2,py=y1-sc1*(TUNNEL_H+1500)*H/2,k=1.18,lx=x1-w1*k,rx=x1+w1*k,ex=w1*7;
  c.fillStyle="#4a4560";c.fillRect(x1-ex,py,ex*2,ry-py);c.fillRect(x1-ex,ry,lx-(x1-ex),y1-ry);c.fillRect(rx,ry,x1+ex-rx,y1-ry);
  c.strokeStyle="#ff4fd6";c.lineWidth=Math.max(1,w1*.03);c.beginPath();c.moveTo(lx,y1);c.lineTo(lx,ry);c.lineTo(rx,ry);c.lineTo(rx,y1);c.stroke();
  c.fillStyle="#3ff0ff";c.fillRect(x1-ex,py,ex*2,Math.max(1,w1*.03));
}
function drawPlayer(c,W,H,race,view,opt){
  const p=race.player,reduced=opt.reduced,style=opt.style,w=W*.18*Math.min(1,H/W*1.9+.1),spPct=p.speed/p.stats.top;
  const bob=reduced?0:Math.sin(view.time*30)*Math.min(1,spPct)*W*.0015+(p.offroad&&p.speed>500?(Math.random()-.5)*W*.004:0);
  const x=W/2,y=(H>W*1.2?H*.885:H-H*.03)+bob; // portrait: sit between bottom HUD and touch buttons
  const out=drawCar(c,x,y,w,opt.shape,style,p.yaw,{brake:opt.braking,wheel:view.wheel});
  if(p.nitroActive){
    for(const ex of out.exhaustX){const len=w*(reduced?.16:.12+Math.random()*.1);
      const g=c.createLinearGradient(ex,out.exhaustY,ex,out.exhaustY+len);g.addColorStop(0,"#ffffff");g.addColorStop(.3,"#53e7ed");g.addColorStop(1,"rgba(83,231,237,0)");
      c.fillStyle=g;c.beginPath();c.moveTo(ex-w*.03,out.exhaustY);c.lineTo(ex+w*.03,out.exhaustY);c.lineTo(ex,out.exhaustY+len);c.closePath();c.fill()}
  }
  if(p.drifting&&p.speed>2000)for(const ex of [x-w*.4,x+w*.4])spawn(view,ex,y-w*.02,w*.5,"smoke",reduced);
  if(p.offroad&&p.speed>1500)spawn(view,x+(Math.random()-.5)*w,y,w*.3,"dirt",reduced,race.track.world.groundDark);
}
function spawn(view,x,y,size,kind,reduced,color){
  if(reduced&&Math.random()>.25)return;if(view.particles.length>140)return;
  if(kind==="smoke")view.particles.push({x,y,vx:(Math.random()-.5)*size*.6,vy:-size*.25,life:.7,max:.7,r:size*.08,kind});
  else if(kind==="spark")view.particles.push({x,y,vx:(Math.random()-.5)*size*4,vy:-Math.random()*size*2,life:.35,max:.35,r:size*.012,kind});
  else view.particles.push({x,y,vx:(Math.random()-.5)*size*2,vy:-Math.random()*size*1.5,life:.4,max:.4,r:size*.03,kind,color});
}
function drawEffects(c,W,H,race,view,opt,world){
  const dt=opt.dt,p=race.player,reduced=opt.reduced;
  for(let i=view.particles.length-1;i>=0;i--){
    const q=view.particles[i];q.life-=dt;if(q.life<=0){view.particles.splice(i,1);continue}
    q.x+=q.vx*dt;q.y+=q.vy*dt;const a=q.life/q.max;
    if(q.kind==="smoke"){c.fillStyle="rgba(230,230,235,"+(.45*a)+")";c.beginPath();c.arc(q.x,q.y,q.r*(2.2-a*1.2),0,Math.PI*2);c.fill()}
    else if(q.kind==="spark"){q.vy+=H*1.2*dt;c.fillStyle=a>.5?"#fff6c2":"#ffae3c";c.fillRect(q.x,q.y,q.r*3,q.r*3)}
    else{q.vy+=H*dt;c.fillStyle=q.color||"#6b5a3a";c.fillRect(q.x,q.y,q.r,q.r)}
  }
  // Speed lines above 70% of top speed
  if(!reduced&&p.speed>p.stats.top*.7){
    const k=(p.speed/p.stats.top-.7)/.55;c.strokeStyle="rgba(255,255,255,"+Math.min(.5,.2+k*.4)+")";c.lineWidth=Math.max(1,W*.002);c.beginPath();
    for(let i=0;i<14;i++){const side=i%2?1:-1,yy=H*(.3+Math.random()*.6),x0=W/2+side*W*(.32+Math.random()*.1);c.moveTo(x0,yy);c.lineTo(x0+side*W*(.08+k*.1),yy+(yy-H/2)*.25)}
    c.stroke();
  }
  // Desert sandstorm haze and grain streaks
  if(world.haze){
    const storm=race.track.def.storm,a=(storm?.26:.14)+(reduced?0:Math.sin(view.time*1.3)*.05);
    c.fillStyle="rgba(222,165,110,"+a+")";c.fillRect(0,0,W,H);
    if(!reduced){c.strokeStyle="rgba(255,226,180,.35)";c.lineWidth=1;c.beginPath();const n=storm?40:18;
      for(let i=0;i<n;i++){const yy=((i*73.3)%100)/100*H,xx=(((i*191.7)-view.time*W*(.6+i%3*.2))%W+W)%W;c.moveTo(xx,yy);c.lineTo(xx+W*.04,yy+H*.005)}c.stroke()}
  }
}
function renderMinimap(m,race){
  const w=m.canvas.width,h=m.canvas.height,t=race.track;m.clearRect(0,0,w,h);
  const img=trackMapCanvas(t,w,h);if(img)m.drawImage(img,0,0);
  for(const car of race.cars){if(car===race.player)continue;const q=t.mapPoint(Math.floor(car.z/SEG));m.fillStyle=car.look?car.look.paint:"#f16a50";m.strokeStyle="#0b1220";m.lineWidth=1.5;m.beginPath();m.arc(q.x,q.y,3.2,0,Math.PI*2);m.fill();m.stroke()}
  const q=t.mapPoint(Math.floor(race.player.z/SEG));m.fillStyle="#ffd23a";m.strokeStyle="#0b1220";m.lineWidth=2;m.beginPath();
  for(let i=0;i<10;i++){const r=i%2?3:7.5,a=-Math.PI/2+i*Math.PI/5;i?m.lineTo(q.x+Math.cos(a)*r,q.y+Math.sin(a)*r):m.moveTo(q.x+Math.cos(a)*r,q.y+Math.sin(a)*r)}m.closePath();m.stroke();m.fill();
}

// ---------- Garage: rotatable 3D model built from boxes ----------
function drawGarage3D(c,W,H,shape,style,angle){
  c.clearRect(0,0,W,H);
  const g=c.createRadialGradient(W/2,H*.75,10,W/2,H*.75,W*.45);g.addColorStop(0,"#2b3a50");g.addColorStop(1,"rgba(16,25,40,0)");c.fillStyle=g;c.fillRect(0,0,W,H);
  c.fillStyle="#0c1320";c.beginPath();c.ellipse(W/2,H*.76,W*.33,H*.09,0,0,Math.PI*2);c.fill();
  const faces=[],paint=style.paint,glass="#22384c",dark="#14171d";
  const box=(x0,x1,y0,y1,z0,z1,col,o={})=>{ // frustum: top inset in x (ix) and z (izf front, izr rear)
    const ix=o.ix||0,izf=o.izf||0,izr=o.izr||0;
    const P=[[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[x0+ix,y1,z0+izr],[x1-ix,y1,z0+izr],[x1-ix,y1,z1-izf],[x0+ix,y1,z1-izf]];
    const F=[[0,1,2,3,"bottom"],[4,7,6,5,"top"],[0,4,5,1,"rear"],[2,6,7,3,"front"],[1,5,6,2,"side"],[0,3,7,4,"side"]];
    const cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2;
    for(const f of F){const pts=f.slice(0,4).map(i=>P[i]);faces.push({pts,col:typeof col==="string"?col:(col[f[4]]||col.side),center:[cx,cy,cz]})}
  };
  const wd=style.body==="Wide"?1.1:1;
  const D={coupe:{W:80,L:150,H:28,cab:[18,-34,32,10,14,22]},wedge:{W:84,L:158,H:22,cab:[13,-22,38,10,30,10]},roadster:{W:76,L:140,H:26,cab:null},van:{W:82,L:150,H:34,cab:[36,-68,42,4,6,4]}}[shape];
  const hw=D.W/2*wd,hl=D.L/2;
  for(const sx of [-1,1])for(const sz of [-1,1]){const zc=sz*hl*.6;box(sx>0?hw-12:-hw-2,sx>0?hw+2:-hw+12,0,24,zc-14,zc+14,dark);
    box(sx>0?hw+2:-hw-3,sx>0?hw+3:-hw-2,6,18,zc-6,zc+6,style.wheels==="Gold"?"#e8bf57":style.wheels==="Sport"?"#dce7ed":"#8795a6")}
  box(-hw,hw,8,D.H,-hl,hl,{top:paint,side:shade(paint,.85),front:shade(paint,.95),rear:shade(paint,.75),bottom:dark},{izf:8,izr:3});
  if(style.body==="Wide")for(const sx of [-1,1])box(sx>0?hw-2:-hw-4,sx>0?hw+4:-hw+2,10,D.H-4,-hl*.8,hl*.8,shade(paint,.8));
  if(style.body==="Aero"){for(const sx of [-1,1])box(sx>0?hw-6:-hw-2,sx>0?hw+2:-hw+6,5,10,-hl*.55,hl*.55,"#1a1d24");box(-hw*.9,hw*.9,4,8,hl-4,hl+8,"#1a1d24")}
  if(D.cab){const [h,z0,z1,ix,izf,izr]=D.cab;box(-hw*.82,hw*.82,D.H,D.H+h,z0,z1,{top:shape==="van"?paint:shade(paint,.9),side:glass,front:glass,rear:glass},{ix,izf,izr})}
  else{box(-hw*.7,hw*.7,D.H,D.H+14,22,26,glass,{izr:3});box(-12,12,D.H,D.H+18,-10,4,"#f2f2f2");box(-hw*.5,hw*.5,D.H,D.H+16,-22,-18,"#c7ced6")}
  const top=D.H+(D.cab?D.cab[0]:0);
  if(shape==="van")box(-24,24,top,top+5,-20,0,{top:"#ffb43a",side:"#58c8ff",front:"#58c8ff",rear:"#ffb43a"});
  if(shape==="coupe")box(-hw*.9,hw*.9,D.H,D.H+4,-hl,-hl+12,shade(paint,1.1));
  if(style.stripes!=="None")for(const sx of style.stripes==="Twin"?[-12,8]:[-3]){box(sx,sx+5,D.H,D.H+.6,-hl+3,hl-8,"#f9ebcd");if(D.cab)box(sx,sx+5,top,top+.6,D.cab[1]+D.cab[5],D.cab[2]-D.cab[4],"#f9ebcd")}
  if(style.spoiler==="Wing"||shape==="wedge"){const wy=Math.max(top,D.H+18)+4;for(const sx of [-26,22])box(sx,sx+4,D.H,wy,-hl+4,-hl+10,dark);box(-hw-2,hw+2,wy,wy+4,-hl,-hl+16,style.spoiler==="Wing"?"#e8edf2":shade(paint,.7))}
  else if(style.spoiler==="Sport")box(-hw*.9,hw*.9,D.H,D.H+5,-hl,-hl+6,"#e0e5e9");
  for(const sx of [-1,1]){box(sx*hw*.62-10,sx*hw*.62+10,D.H-10,D.H-4,-hl-1,-hl+1,"#d22a2a");box(sx*hw*.6-9,sx*hw*.6+9,D.H-10,D.H-4,hl-1,hl+1,"#ffe9a8")}
  // Rotate (yaw) and tilt (pitch) then project orthographically; painter's sort with back-face culling.
  const ca=Math.cos(angle),sa=Math.sin(angle),pitch=-.42,cp=Math.cos(pitch),spch=Math.sin(pitch),k=W/380;
  const tf=([X,Y,Z])=>{const x=X*ca+Z*sa,z=-X*sa+Z*ca,y=Y-20;return [x,y*cp-z*spch,y*spch+z*cp]};
  const out=[];
  for(const f of faces){
    const r=f.pts.map(tf),ax=r[1][0]-r[0][0],ay=r[1][1]-r[0][1],az=r[1][2]-r[0][2],bx=r[2][0]-r[0][0],by=r[2][1]-r[0][1],bz=r[2][2]-r[0][2];
    let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
    const cc=tf(f.center),fc=r.reduce((a,q)=>[a[0]+q[0]/4,a[1]+q[1]/4,a[2]+q[2]/4],[0,0,0]);
    if((fc[0]-cc[0])*nx+(fc[1]-cc[1])*ny+(fc[2]-cc[2])*nz<0){nx=-nx;ny=-ny;nz=-nz}
    if(nz>0.001)continue; // facing away (camera looks toward +z)
    const light=.62+.38*Math.max(0,nx*-.4+ny*.8-nz*.45);
    out.push({r,depth:fc[2],col:f.col,light});
  }
  out.sort((a,b)=>b.depth-a.depth);
  for(const f of out){c.fillStyle=f.col;c.beginPath();f.r.forEach((q,i)=>{const X=W/2+q[0]*k,Y=H*.62-q[1]*k;i?c.lineTo(X,Y):c.moveTo(X,Y)});c.closePath();c.fill();
    if(f.light!==1){c.fillStyle=f.light>1?"rgba(255,255,255,"+(f.light-1)+")":"rgba(0,0,0,"+(1-f.light)*.8+")";c.fill()}}
  // Inset: the in-race rear view sprite for this shape and style.
  c.fillStyle="rgba(8,12,20,.55)";c.fillRect(W-150,H-104,140,94);drawCar(c,W-80,H-18,104,shape,style,0,{});
  c.fillStyle="#c6d2e0";c.font="11px sans-serif";c.fillText("IN-RACE VIEW",W-142,H-90);
}
