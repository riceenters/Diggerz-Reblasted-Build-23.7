(function(){
'use strict';
if(window.__diggerzBuild250BootInstalled)return;
window.__diggerzBuild250BootInstalled=true;

var BUILD='25.0';
var MENU_TRACK='/build25-menu.mp3';
var FOXY_IMAGE='/build25-foxy.gif';
var FOXY_FINAL_IMAGE='/build25-foxy-final.png';
var FOXY_SOUND='/build25-foxy-scream.mp3';
var FOXY_ODDS=667;
var INTRO_TOTAL_SECONDS=26; // finished intro project: 26 seconds before menu reveal
var FOXY_NEXT_BOOT_KEY='diggerz.build25.foxyScaredLastBoot';
var introStarted=false,introFinished=false,introSkipRequested=false,introSkipResolve=null,menuAudio=null,overlay=null,stage=null,sceneMedia=null,sceneText=null,flash=null;
var joinedLast=false;

var FINAL_MESSAGES=[
  "YOU HAVENT LOCKED YOUR DOOR!",
  "THE BLACK PUMPKIN HAS RETURNED!",
  "YOU HAVE HOMEWORK TO DO!",
  "YOU DONT HAVE HANDS!",
  "YOU HAVENT PAYED THE BILLS!",
  "JOB APPLICATION!",
  "NOBODY LIKES YOU!",
  "THE SUN IS GOING TO EXPLODE SOON!",
  "11/09/11",
  "THAT FOX HASNT JUMPSCARED YOU YET!"
];

var SCENES=[
 {duration:2,delay:0,bgColor:'#000000',text:'hi',fontSize:64,textColor:'#ff9500',fontWeight:'900',outlineWidth:2,outlineColor:'#ff9500',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:2,delay:0,bgColor:'#000000',text:'Original game by MeanDean',fontSize:64,textColor:'#ff9500',fontWeight:'700',outlineWidth:2,outlineColor:'#ff9500',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:2,delay:2,bgColor:'#000000',text:'Game resurected by Limeguy',fontSize:40,textColor:'#00ff1e',fontWeight:'900',outlineWidth:2,outlineColor:'#00ff1e',x:50,y:82,mediaType:'image',mediaSrc:'/build25-lime.png',fit:'custom',mediaW:41,mediaH:39,enterTime:.4,exitTime:.4},
 {duration:1,delay:0,bgColor:'#000000',text:'and also by...',fontSize:64,textColor:'#ff9500',fontWeight:'900',outlineWidth:2,outlineColor:'#ff9500',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:2,delay:0,bgColor:'#000000',text:'HeuFancy',fontSize:64,textColor:'#a600ff',fontWeight:'900',outlineWidth:2,outlineColor:'#eeff00',x:50,y:10,mediaType:'image',mediaSrc:'/build25-heufancy.png',fit:'contain',mediaW:101,mediaH:57,enterTime:.4,exitTime:.4},
 {duration:2,delay:0,bgColor:'#000000',text:'And mainly a clanker at first...',fontSize:64,textColor:'#ff9500',fontWeight:'700',outlineWidth:2,outlineColor:'#ff9500',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:3,delay:0,bgColor:'#000000',text:'anyways...its that time of year agin...',fontSize:35,textColor:'#ff9500',fontWeight:'900',outlineWidth:2,outlineColor:'#ff9500',x:50,y:49,mediaType:'',mediaSrc:'',fit:'contain',mediaW:102,mediaH:102,enterTime:.4,exitTime:.4},
 {duration:2,delay:0,bgColor:'#000000',text:'Dark Monstorus bunnys roam the battle feild',fontSize:64,textColor:'#ffea00',fontWeight:'700',outlineWidth:2,outlineColor:'#4f4f4f',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:2,delay:1,bgColor:'#000000',text:'Zombies have invaded and you must kill them',fontSize:64,textColor:'#00ff40',fontWeight:'700',outlineWidth:2,outlineColor:'#00ff40',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:3,delay:0,bgColor:'#000000',text:'and worst of all...',fontSize:64,textColor:'#ff0000',fontWeight:'700',outlineWidth:2,outlineColor:'#ff0000',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4},
 {duration:1,delay:1,bgColor:'#000000',text:'',fontSize:73,textColor:'#ff0000',fontWeight:'700',outlineWidth:2,outlineColor:'#ff0000',x:50,y:50,mediaType:'',mediaSrc:'',fit:'contain',mediaW:100,mediaH:100,enterTime:.4,exitTime:.4}
];

function sleep(ms){return new Promise(function(resolve){var done=false;var t=setTimeout(finish,Math.max(0,ms|0));function finish(){if(done)return;done=true;clearTimeout(t);if(introSkipResolve===finish)introSkipResolve=null;resolve()}introSkipResolve=finish;if(introSkipRequested)finish()})}
function rand(max){
  max=Math.max(1,max|0);
  try{
    if(window.crypto&&crypto.getRandomValues){
      var a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;
    }
  }catch(e){}
  return Math.floor(Math.random()*max);
}
function hadFoxyLastBoot(){
  try{
    if(localStorage.getItem(FOXY_NEXT_BOOT_KEY)==='1'){
      localStorage.removeItem(FOXY_NEXT_BOOT_KEY);
      return true;
    }
  }catch(e){}
  return false;
}
function markFoxyForNextBoot(){
  try{localStorage.setItem(FOXY_NEXT_BOOT_KEY,'1')}catch(e){}
}
function pickFinalMessage(){
  return hadFoxyLastBoot() ? 'HAHA WERE YOU FROZEN IN TERROR?!' : FINAL_MESSAGES[rand(FINAL_MESSAGES.length)];
}
function makeOverlay(){
  var css=document.createElement('style');
  css.id='diggerz-build25-intro-style';
  css.textContent=[
    '#diggerz25-intro{position:fixed;inset:0;z-index:2147483646;background:#000;overflow:hidden;font-family:Arial,Helvetica,sans-serif;user-select:none;touch-action:none}',
    '#diggerz25-stage{position:absolute;width:960px;height:540px;left:50%;top:50%;transform:translate(-50%,-50%);transform-origin:center;background:#000;overflow:hidden}',
    '#diggerz25-media{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:none;max-height:none;opacity:0;transition:opacity .4s linear}',
    '#diggerz25-text{position:absolute;transform:translate(-50%,-50%);text-align:center;white-space:pre-wrap;max-width:92%;line-height:1.08;opacity:0;transition:opacity .4s linear}',
    '#diggerz25-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:20}',
    '#diggerz25-click{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);font:bold 18px Arial,sans-serif;color:#fff;text-shadow:0 2px 5px #000;letter-spacing:.08em;display:none;z-index:30}',
    '#diggerz25-foxy{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;z-index:15;background:#000}',
    '@media(max-aspect-ratio:16/9){#diggerz25-stage{width:100vw;height:56.25vw}}',
    '@media(min-aspect-ratio:16/9){#diggerz25-stage{width:177.7778vh;height:100vh}}'
  ].join('');
  document.head.appendChild(css);
  overlay=document.createElement('div');overlay.id='diggerz25-intro';
  stage=document.createElement('div');stage.id='diggerz25-stage';
  sceneMedia=document.createElement('img');sceneMedia.id='diggerz25-media';sceneMedia.alt='';
  sceneText=document.createElement('div');sceneText.id='diggerz25-text';
  var foxy=document.createElement('img');foxy.id='diggerz25-foxy';foxy.alt='';
  flash=document.createElement('div');flash.id='diggerz25-flash';
  var click=document.createElement('div');click.id='diggerz25-click';click.textContent='CLICK TO START';
  stage.appendChild(sceneMedia);stage.appendChild(sceneText);stage.appendChild(foxy);stage.appendChild(flash);
  overlay.appendChild(stage);overlay.appendChild(click);
  var skip=document.createElement('button');skip.id='diggerz25-skip';skip.type='button';skip.textContent='SKIP INTRO';
  skip.style.cssText='position:absolute;z-index:50;right:18px;top:18px;background:#1c1c1cdd;color:white;border:2px solid #eee;border-radius:8px;padding:12px 18px;font:bold 15px Arial;cursor:pointer;pointer-events:auto';
  skip.onclick=function(ev){ev.stopPropagation();introSkipRequested=true;if(introSkipResolve)introSkipResolve();};
  overlay.appendChild(skip);
  document.body.appendChild(overlay);
  return overlay;
}
function setupMenuAudio(){
  if(menuAudio)return menuAudio;
  try{
    menuAudio=new Audio(MENU_TRACK);
    menuAudio.preload='auto';
    menuAudio.loop=true;
    menuAudio.volume=1;
    menuAudio.id='diggerz-build25-menu-audio';
  }catch(e){menuAudio=null}
  return menuAudio;
}
function playMenuAudio(){
  var a=setupMenuAudio();if(!a)return Promise.resolve(false);
  try{
    var p=a.play();
    if(p&&typeof p.then==='function')return p.then(function(){return true}).catch(function(){return false});
  }catch(e){}
  return Promise.resolve(false);
}
async function ensureAudioAndStart(){
  var ok=await playMenuAudio();
  if(ok)return true;
  var click=document.getElementById('diggerz25-click');
  if(click)click.style.display='block';
  return new Promise(function(resolve){
    var done=false;
    function go(){
      if(done)return;
      playMenuAudio().then(function(success){
        if(!success)return;
        done=true;
        if(click)click.style.display='none';
        document.removeEventListener('pointerdown',go,true);
        document.removeEventListener('keydown',go,true);
        resolve(true);
      });
    }
    document.addEventListener('pointerdown',go,true);
    document.addEventListener('keydown',go,true);
  });
}
function resetScene(){
  if(!stage)return;
  sceneMedia.style.opacity='0';sceneMedia.style.display='none';sceneMedia.removeAttribute('src');
  sceneText.style.opacity='0';sceneText.textContent='';
  stage.style.background='#000';
}
async function playScene(s){
  if(introSkipRequested)return;
  resetScene();
  stage.style.background=s.bgColor||'#000';
  if(s.delay>0)await sleep(s.delay*1000);
  if(introSkipRequested)return;
  sceneText.textContent=s.text||'';
  sceneText.style.fontSize=(+s.fontSize||64)+'px';
  sceneText.style.color=s.textColor||'#fff';
  sceneText.style.fontWeight=s.fontWeight||'700';
  sceneText.style.webkitTextStroke=(Math.max(0,+s.outlineWidth||0))+'px '+(s.outlineColor||'#000');
  sceneText.style.textShadow='none';
  sceneText.style.left=(+s.x||50)+'%';
  sceneText.style.top=(+s.y||50)+'%';
  sceneText.style.transitionDuration=Math.max(0,+s.enterTime||0)+'s';
  if(s.mediaType==='image'&&s.mediaSrc){
    sceneMedia.src=s.mediaSrc;
    sceneMedia.style.display='block';
    if(s.fit==='custom'){
      sceneMedia.style.width=(+s.mediaW||100)+'%';
      sceneMedia.style.height=(+s.mediaH||100)+'%';
      sceneMedia.style.objectFit='contain';
    }else{
      sceneMedia.style.width='100%';
      sceneMedia.style.height='100%';
      sceneMedia.style.objectFit=s.fit==='stretch'?'fill':(s.fit||'contain');
    }
    sceneMedia.style.transitionDuration=Math.max(0,+s.enterTime||0)+'s';
  }
  await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(function(){
    sceneText.style.opacity='1';
    if(sceneMedia.style.display!=='none')sceneMedia.style.opacity='1';
    resolve();
  })})});
  var duration=Math.max(.1,+s.duration||1),exit=Math.max(0,Math.min(duration,+s.exitTime||0));
  await sleep(Math.max(0,(duration-exit)*1000));
  if(introSkipRequested)return;
  sceneText.style.transitionDuration=exit+'s';sceneMedia.style.transitionDuration=exit+'s';
  sceneText.style.opacity='0';sceneMedia.style.opacity='0';
  if(exit>0)await sleep(exit*1000);
}
async function assetExists(url){
  try{
    var r=await fetch(url,{method:'HEAD',cache:'no-store'});
    return !!r.ok;
  }catch(e){return false}
}
async function maybeFoxy(){
  if(rand(FOXY_ODDS)!==0)return false;
  if(!(await assetExists(FOXY_IMAGE)))return false;
  var foxy=document.getElementById('diggerz25-foxy');
  resetScene();
  if(!foxy)return false;

  // Start the animation fresh every time. The underlying Diggerz menu is
  // already loaded underneath this overlay and is never replaced.
  foxy.src=FOXY_IMAGE+'?boot='+Date.now();
  foxy.style.display='block';

  try{
    var scare=new Audio(FOXY_SOUND);
    scare.volume=1;
    scare.play().catch(function(){});
  }catch(e){}

  // Foxy animation is ~0.8s. Freeze on its last frame while the scream
  // finishes, matching the approved playtest.
  await sleep(800);
  if(await assetExists(FOXY_FINAL_IMAGE))foxy.src=FOXY_FINAL_IMAGE;
  await sleep(1243);

  markFoxyForNextBoot();
  return true;
}
async function flashToMenu(strong){
  if(!flash)return;
  flash.style.transition='none';flash.style.opacity='1';
  await sleep(strong?110:70);
  flash.style.transition='opacity '+(strong?'.42s':'.28s')+' ease-out';
  flash.style.opacity='0';
  if(overlay){
    overlay.style.transition='opacity .22s linear';
    overlay.style.opacity='0';
  }
  await sleep(strong?440:300);
}
function watchMenuMusic(){
  setInterval(function(){
    if(!menuAudio||!introFinished)return;
    var P=window.DiggerzPvp22,joined=!!(P&&P.joined);
    if(joined!==joinedLast){
      joinedLast=joined;
      if(joined){
        try{
          var from=menuAudio.volume,steps=10,n=0;
          var t=setInterval(function(){n++;try{menuAudio.volume=Math.max(0,from*(1-n/steps))}catch(e){}if(n>=steps){clearInterval(t);try{menuAudio.pause();menuAudio.volume=1}catch(e){}}},80);
        }catch(e){}
      }else{
        try{menuAudio.volume=1;menuAudio.play().catch(function(){})}catch(e){}
      }
    }
  },250);
}
async function runIntro(){
  if(introStarted)return;introStarted=true;introSkipRequested=false;
  makeOverlay();
  SCENES[SCENES.length-1].text=pickFinalMessage();
  // One audio element owns BOTH the intro and menu music. Start at 0 once,
  // then never seek/restart it when the intro overlay disappears.
  var bootAudio=setupMenuAudio();
  if(bootAudio){try{bootAudio.currentTime=0;bootAudio.loop=true;bootAudio.volume=1}catch(e){}}
  await ensureAudioAndStart();
  for(var i=0;i<SCENES.length&&!introSkipRequested;i++)await playScene(SCENES[i]);
  if(!introSkipRequested){var scared=await maybeFoxy();if(!introSkipRequested)await flashToMenu(scared);}
  if(overlay)try{overlay.remove()}catch(e){}
  var st=document.getElementById('diggerz-build25-intro-style');if(st)try{st.remove()}catch(e){}
  introFinished=true;
  window.__diggerzBuild25IntroFinished=true;
  // menuAudio is intentionally still playing here at ~26s into the track.
  // The remaining music becomes the main-menu soundtrack seamlessly.
  watchMenuMusic();
}
window.DiggerzBuild250Boot={
  build:BUILD,
  messages:FINAL_MESSAGES.slice(),
  odds:FOXY_ODDS,
  introSeconds:INTRO_TOTAL_SECONDS,
  get audio(){return menuAudio},
  replay:function(){if(overlay)return;introStarted=false;introFinished=false;runIntro()}
};
function boot(){if(document.body)runIntro();else setTimeout(boot,20)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}());

/* Build 25 Cart Racing hybrid prototype — isolated until multiplayer playtest. */
(function(){
  'use strict';
  if(window.__diggerzCartRaceInstalled)return;
  window.__diggerzCartRaceInstalled=true;
  var button=null, raceRoom='', hookedSocket=null, pendingCart=false, results=null,manualExit=false,lastC=0,racePhase='waiting',raceAudio=null,countdownTimer=null;
  function raceActive(){var p=window.DiggerzPvp22;return !!(p&&p.mode==='race'&&(p.requested||p.joined));}
  function ensureCart(){
    if(!raceActive()||manualExit)return false;
    try{
      if(typeof l==='undefined'||!l.z39||typeof oa==='undefined')return false;
      var player=l.z39;
      if(player.i32===oa.MODE_CART)return true;
      if(typeof player.L31!=='function')return false;
      // Native Diggerz cart system: item 109 is its Basic Cart.
      // Coaster Town's recovered original physics are not installed yet.
      player.J31|=1;
      player.L31([109],[0],[0],[0],[0],[0],[0]);
      return player.i32===oa.MODE_CART;
    }catch(e){console.warn('[Cart Racing] native cart entry:',e);return false}
  }
  function launch(){
    try{
      var p=window.DiggerzPvp22;
      if(!p||typeof q==='undefined'||typeof l==='undefined'||!q.InitMainGame)return;
      p.mode='race';p.requested=true;p.intentionalClose=false;
      q.diggerzPvpRequested=true;q.diggerzPeerMode='race';q.diggerzDigTradeRequested=false;q.diggerzShopRequested=false;
      l.A45=false;l.A46=false;l.A47=false;l.A48=false;l.A40=null;
      q.player.l7=false;q.mClicked=false;
      q.InitMainGame();
      manualExit=false;pendingCart=true;
    }catch(e){console.error('[Cart Racing] launch failed:',e)}
  }
  function installButton(){
    if(button||!document.body)return;
    button=document.createElement('button');button.id='build25-cart-race-launch';
    button.innerHTML='<span class="build25-new">NEW</span><span>CART RACING</span>';
    button.style.cssText='position:fixed;right:14px;bottom:16px;z-index:900;color:#fff;background:linear-gradient(145deg,#f34335,#8f0b12);border:3px solid #ff9c90;border-radius:12px;padding:12px 22px;font:bold 17px Arial;cursor:pointer;box-shadow:0 4px 20px #0008;display:flex;flex-direction:column;gap:2px;align-items:center';
    button.onclick=launch;
    if(!document.getElementById('build25-cart-race-style')){var st=document.createElement('style');st.id='build25-cart-race-style';st.textContent='@keyframes raceNewPop{0%,100%{transform:scale(.7)}50%{transform:scale(1.16)}}.build25-new{font:900 12px Arial;color:#ffff33;letter-spacing:2px;animation:raceNewPop 1.3s ease-in-out infinite;text-shadow:0 2px #740000}#build25-race-countdown{position:fixed;inset:0;z-index:2147482999;pointer-events:none;display:flex;align-items:center;justify-content:center;font:1000 clamp(110px,23vw,360px) Impact,Arial Black,sans-serif;text-shadow:8px 12px 0 #400;animation:raceSmash .62s cubic-bezier(.11,1.2,.38,1) both}@keyframes raceSmash{from{transform:scale(4) rotate(-12deg);opacity:0}45%{transform:scale(.84);opacity:1}to{transform:scale(1);opacity:1}}';document.head.appendChild(st)}
    document.body.appendChild(button);
  }
  function showCountdown(value){
    var el=document.getElementById('build25-race-countdown');if(el)el.remove();
    el=document.createElement('div');el.id='build25-race-countdown';
    el.textContent=value;el.style.color=value==='GO!'?'#00edff':'#ef2525';
    document.body.appendChild(el);
    setTimeout(function(){if(el.isConnected)el.remove()},900);
  }
  function playRaceTheme(){
    if(raceAudio)return;
    raceAudio=new Audio('/cart-racing-theme.mp3');raceAudio.loop=true;raceAudio.volume=.65;
    raceAudio.play().catch(function(e){console.warn('[Cart Racing] theme missing or blocked',e)});
  }
  function stopRaceTheme(){if(raceAudio){raceAudio.pause();raceAudio.currentTime=0;raceAudio=null}}
  function startCountdown(startsAt){
    racePhase='countdown';clearInterval(countdownTimer);
    var last='';
    function tick(){var ms=startsAt-Date.now();var shown=ms<=0?'GO!':String(Math.ceil(ms/1000));if(shown!==last&&(['3','2','1','GO!'].indexOf(shown)>=0)){last=shown;showCountdown(shown)}if(ms<=-800){clearInterval(countdownTimer);racePhase='racing';playRaceTheme()}}
    countdownTimer=setInterval(tick,60);tick();
  }
  function handleRacePacket(ev){
    if(!raceActive()||typeof ev.data!=='string')return;
    var m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(!m||!m.t)return;
    if(m.t==='race-setup'||m.t==='race-respawn'){manualExit=false;pendingCart=true;setTimeout(ensureCart,150);return}
    if(m.t==='race-countdown'){startCountdown(Number(m.startsAt));return}
    if(m.t==='race-waiting'){racePhase='waiting';clearInterval(countdownTimer);return}
    if(m.t==='race-start'){racePhase='racing';pendingCart=true;showCountdown('GO!');playRaceTheme();return}
    if(m.t==='race-kill-all'){stopRaceTheme();racePhase='finished';return}
    if(m.t==='race-standings'){
      var self=window.DiggerzPvp22, cid=self&&self.connectionId;
      var standings=m.standings||[];
      var me=standings.find(function(x){return x.connectionId===cid});
      var hud=document.getElementById('build25-race-place');
      if(!hud){hud=document.createElement('div');hud.id='build25-race-place';hud.style.cssText='position:fixed;top:16px;right:20px;z-index:9998;padding:10px 16px;background:#7c0f12dd;border:2px solid #fff5;border-radius:10px;color:#fff;font:bold 22px Arial';document.body.appendChild(hud)}
      hud.textContent=(me?'#'+me.place:'--')+' / '+standings.length+' PLACE';
      return;
    }
    if(m.t==='race-checkpoint'){console.info('[Cart Racing] checkpoint',m.number,m.total);return}
    if(m.t==='race-results'){
      stopRaceTheme();racePhase='finished';if(results)results.remove();
      results=document.createElement('div');results.id='build25-race-results';
      results.style.cssText='position:fixed;inset:0;z-index:2147483000;background:#000c;color:#fff;display:flex;align-items:center;justify-content:center;font:18px Arial';
      var box=document.createElement('div');box.style.cssText='padding:30px;background:#172332;border:2px solid #f7c76b;border-radius:14px;text-align:center;max-width:440px';
      var h=document.createElement('h2');var pstate=window.DiggerzPvp22;h.textContent=(m.winnerId&&pstate&&m.winnerId===pstate.connectionId)?'YOU WIN!':'RACE OVER';box.appendChild(h);
      (m.finishers||[]).forEach(function(f){var p=document.createElement('p');p.textContent='#'+f.place+' '+f.name;box.appendChild(p)});
      function action(label,fn){var b=document.createElement('button');b.textContent=label;b.style.cssText='margin:8px;padding:12px 16px;cursor:pointer';b.onclick=fn;box.appendChild(b)}
      action('Play Again',function(){try{sessionStorage.setItem('build25-auto-race','1')}catch(e){}location.reload()});
      action('Dig & Trade',function(){location.reload()});
      action('Leave',function(){location.reload()});
      results.appendChild(box);document.body.appendChild(results);
    }
  }
  // Native C key remains responsible for toggling cart state.
  // Prevent inventory-selection ejections from persisting, but respect C exits.
  document.addEventListener('keydown',function(ev){
    if(!raceActive()||!(ev.code==='KeyC'||ev.key==='c'||ev.key==='C')||ev.repeat)return;
    if(Date.now()-lastC<220)return;
    lastC=Date.now();
    try{
      var inCart=typeof l!=='undefined'&&l.z39&&typeof oa!=='undefined'&&l.z39.i32===oa.MODE_CART;
      manualExit=!!inCart;
      if(!manualExit)pendingCart=true;
    }catch(e){}
    // Do not suppress the native event: original C handler handles exit/entry.
  },true);
  setInterval(function(){
    var p=window.DiggerzPvp22;
    if(!p)return;
    if(p.socket&&p.socket!==hookedSocket){hookedSocket=p.socket;hookedSocket.addEventListener('message',handleRacePacket)}
    if(raceActive()&&!manualExit){pendingCart=true;if(ensureCart())pendingCart=false;}
    if(window.__diggerzBuild25IntroFinished&&!p.joined&&!p.starting){
      installButton();if(button)button.style.display=raceActive()?'none':'flex';
      try{if(sessionStorage.getItem('build25-auto-race')==='1'){sessionStorage.removeItem('build25-auto-race');launch()}}catch(e){}
    }else if(button)button.style.display='none';
  },300);
}());
