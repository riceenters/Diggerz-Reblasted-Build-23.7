(function(){
'use strict';
// Build 25 Zombies runs within Diggerz's existing page and character runtime.
// All game rewards are server-side; do not touch the player's normal saved inventory.
var live=null, frame=null, last=0, selected=0, anim=0;
var status=null, canvas=null, ctx=null, map=null, session='', timer=null;
function root(){
  var p=document.createElement('div');p.id='diggerz-zombies25';
  p.style.cssText='position:fixed;inset:0;z-index:9999;background:#101010;color:#f44;font-family:Arial,sans-serif;display:none';
  p.innerHTML='<div id="z25-msg" style="position:absolute;top:25%;width:100%;text-align:center;font-size:42px;font-weight:900;text-shadow:2px 2px #000;pointer-events:none"></div><canvas id="z25-canvas" style="width:100%;height:100%;image-rendering:pixelated"></canvas><div id="z25-hud" style="position:absolute;bottom:12px;left:20px;text-shadow:2px 2px #000">WAVE 1</div><div id="z25-pts" style="position:absolute;bottom:12px;right:20px;text-shadow:2px 2px #000">0 POINTS</div><div id="z25-help" style="position:absolute;top:8px;left:12px;font-size:13px">A / D: MOVE • CLICK: SHOOT • E: MYSTERY BOX • 1–7: EQUIP • ESC: EXIT</div>';
  document.body.appendChild(p);canvas=p.querySelector('canvas');ctx=canvas.getContext('2d');return p;
}
var ui=null;function show(text,ms){if(!ui)return;var el=ui.querySelector('#z25-msg');el.textContent=text;el.style.display='block';if(ms)setTimeout(function(){if(el.textContent===text)el.style.display='none'},ms);}
function draw(){
 if(!live||!ctx)return;
 canvas.width=Math.max(640,innerWidth);canvas.height=Math.max(420,innerHeight);
 var w=canvas.width,h=canvas.height,tw=w/128,th=h/80;
 ctx.fillStyle='#181823';ctx.fillRect(0,0,w,h);
 if(map&&Array.isArray(map.tiles))map.tiles.forEach(function(t){ctx.fillStyle=t[2]===240?'#514d44':'#424249';ctx.fillRect(t[0]*tw,t[1]*th,Math.ceil(tw),Math.ceil(th))});
 // Existing sprites will replace these temporary debugging bodies after sprite atlas integration.
 var p=live.player||{x:64,y:40};
 ctx.fillStyle='#e6d6c2';ctx.fillRect((p.x-.4)*tw,(p.y-1.4)*th,tw*.8,th*1.4);
 (live.zombies||[]).forEach(function(z){
  ctx.fillStyle='#315a20';ctx.fillRect((z.x-.5)*tw,(z.y-1.5)*th,tw,th*1.5);
  ctx.fillStyle='#171717';ctx.fillRect((z.x-.3)*tw,(z.y-1.3)*th,tw*.2,th*.2);ctx.fillRect((z.x+.13)*tw,(z.y-1.3)*th,tw*.2,th*.2);
  ctx.fillStyle='red';ctx.fillRect((z.x-.2)*tw,(z.y-1.26)*th,tw*.09,th*.08);ctx.fillRect((z.x+.22)*tw,(z.y-1.26)*th,tw*.09,th*.08);
 });
 if(live.box){ctx.fillStyle=live.box.state==='closed'?'#573f30':'#b3943c';ctx.fillRect((live.box.x-.8)*tw,(live.box.y-1)*th,tw*1.6,th);}
 requestAnimationFrame(draw);
}
async function api(action,extra){var res=await fetch('/api/zombies/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({session:session,action:action},extra||{}))});return res.json();}
async function poll(){
 if(!session)return;
 try {
  var res=await fetch('/api/zombies/state?session='+encodeURIComponent(session),{cache:'no-store'});if(!res.ok)return;
  var body=await res.json();live=body.state;
  ui.querySelector('#z25-hud').textContent='WAVE '+live.wave;
  ui.querySelector('#z25-pts').textContent=live.points+' POINTS';
  (body.events||[]).forEach(function(e){
   if(e.t==='zombies-countdown')show('Game will begin in '+e.seconds+' seconds.',850);
   if(e.t==='zombies-wave')show('WAVE '+e.wave,1700);
   if(e.t==='zombies-power')show(e.name,1800);
   if(e.t==='zombies-game-over')show('GAME OVER — ZOMBIES '+e.zombiesKilled+' • WAVES '+e.wavesSurvived+' • POINTS '+e.pointsEarned+' • COINS '+e.coins,0);
  });
 } catch(e){console.warn('[Zombies] state poll failed',e)}
}
function key(e){
 if(!session)return;
 if(e.key==='Escape'){exit();return;}
 var p=live&&live.player;if(!p)return;
 if(e.key==='a'||e.key==='ArrowLeft')api('move',{x:p.x-1,y:p.y});
 if(e.key==='d'||e.key==='ArrowRight')api('move',{x:p.x+1,y:p.y});
 if(e.key.toLowerCase()==='e')api('box');
 if(/^[1-7]$/.test(e.key))api('equip',{index:Number(e.key)-1});
}
function fire(e){if(!session||!live||!live.zombies||!live.zombies.length)return;var rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*128,y=(e.clientY-rect.top)/rect.height*80;var nearest=live.zombies.reduce(function(a,z){var d=Math.hypot(z.x-x,z.y-y);return (!a||d<a.d)?{id:z.id,d:d}:a},null);if(nearest)api('shoot',{zombie:nearest.id});}
async function start(){
 if(session)return;
 if(!ui)ui=root();
 try{
  var mr=await fetch('/api/zombies/map');var result=await mr.json();if(!result.ok)throw Error('Wasteland map is not installed');
  map=result.map;
  var response=await fetch('/api/zombies/start',{method:'POST'}),obj=await response.json();if(!obj.ok)throw Error(obj.error||'Cannot start Zombies');
  session=obj.session;ui.style.display='block';show('Game will begin in 10 seconds.',1200);
  document.addEventListener('keydown',key);canvas.addEventListener('click',fire);
  timer=setInterval(poll,160);poll();requestAnimationFrame(draw);
 }catch(err){alert('Diggerz Zombies: '+err.message)}
}
async function exit(){if(!session)return;var old=session;session='';clearInterval(timer);document.removeEventListener('keydown',key);canvas.removeEventListener('click',fire);ui.style.display='none';try{await fetch('/api/zombies/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:old,action:'leave'})})}catch(e){}}
window.DiggerzLaunchZombies25=start;
})();