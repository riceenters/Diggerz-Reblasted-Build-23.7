(function(){
'use strict';
if(window.__diggerzBuild250BootInstalled)return;
window.__diggerzBuild250BootInstalled=true;

var BUILD='25.0-dev';
var MENU_TRACK='/build25-menu.mp3';
var FOXY_IMAGE='/build25-foxy.gif';
var FOXY_SOUND='/build25-foxy-scream.mp3';
var FOXY_ODDS=667;
var INTRO_TOTAL_SECONDS=26; // finished intro project: 26 seconds before menu reveal
var FOXY_NEXT_BOOT_KEY='diggerz.build25.foxyScaredLastBoot';
var introStarted=false,introFinished=false,menuAudio=null,overlay=null,stage=null,sceneMedia=null,sceneText=null,flash=null;
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

function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,Math.max(0,ms|0))})}
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
  resetScene();
  stage.style.background=s.bgColor||'#000';
  if(s.delay>0)await sleep(s.delay*1000);
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
  foxy.src=FOXY_IMAGE;foxy.style.display='block';
  try{
    var scare=new Audio(FOXY_SOUND);scare.volume=1;scare.play().catch(function(){});
  }catch(e){}
  // The GIF itself is authored to play exactly once (14 frames / 0.8s).
  // Keep its final frame visible until the full scream finishes (~2.04s), then flash.
  await sleep(2043);
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
  if(introStarted)return;introStarted=true;
  makeOverlay();
  SCENES[SCENES.length-1].text=pickFinalMessage();
  // One audio element owns BOTH the intro and menu music. Start at 0 once,
  // then never seek/restart it when the intro overlay disappears.
  var bootAudio=setupMenuAudio();
  if(bootAudio){try{bootAudio.currentTime=0;bootAudio.loop=true;bootAudio.volume=1}catch(e){}}
  await ensureAudioAndStart();
  for(var i=0;i<SCENES.length;i++)await playScene(SCENES[i]);
  var scared=await maybeFoxy();
  await flashToMenu(scared);
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