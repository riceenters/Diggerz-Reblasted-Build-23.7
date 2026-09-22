(function(){
  'use strict';

  var BUILD='24.0';
  var installed=false;
  var gravityTimer=null;
  var rgbInstalled=false;
  var rgbAnimationStarted=false;
  var rgbObjects=[];
  var RGB_TIME_ZONE='America/New_York';
  var TRUE_RGB_DEFAULT_ODDS=100000;
  var TRUE_RGB_KPOP_ODDS=101337;
  var TRUE_RGB_MILITARY_ODDS=1000000;
  var TRUE_RGB_MILITARY_ID=554;
  var TRUE_RGB_KPOP_IDS={559:true,560:true,561:true,562:true};
  var RGB_KPOP_SHOE_IDS={511:true,561:true};
  var RGB_WING_IDS={501:true,551:true};
  var RGB_KPOP_AUDIO_SOURCES=[
    '/jams_vip.ogg',
    'https://nu.vgmtreasurechest.com/soundtracks/kaiju-paradise-original-game-soundtrack-2021/okmbxjdn/13.%20JAMS%20%28VIP%29.mp3'
  ];
  var RGB_KPOP_MAX_VOLUME=.58;
  var RGB_KPOP_FULL_DISTANCE=3;
  var RGB_KPOP_FADE_DISTANCE=16;
  var rgbKpopAudio=null;
  var rgbKpopAudioRetryAt=0;
  var rgbKpopAudioSourceIndex=0;
  var rgbKpopAudioFailed=false;
  var rgbKpopGestureInstalled=false;

  // Build 24.0 RGB catalog. Normal RGB IDs are weekend-event variants.
  // Their True RGB counterparts use the same recovered item geometry/behavior
  // but a darker animated color cycle and only come from the off-week ultra-rare rolls.
  var RGB_ITEMS=[
    {id:500,trueId:550,baseId:110,name:'RGB Ball Cap',trueName:'True RGB Ball Cap'},
    {id:501,trueId:551,baseId:213,name:'RGB Wings',trueName:'True RGB Wings'},
    {id:502,trueId:552,baseId:181,name:'RGB Trance Eyes',trueName:'True RGB Trance Eyes'},
    {id:503,trueId:553,baseId:113,name:'RGB Jetpack',trueName:'True RGB Jetpack'},
    {id:504,trueId:554,baseId:247,name:'RGB Military Hat',trueName:'True RGB Military Hat'},
    {id:505,trueId:555,baseId:127,name:'RGB Mohawk',trueName:'True RGB Mohawk'},
    {id:506,trueId:556,baseId:173,name:'RGB Spiky Hair',trueName:'True RGB Spiky Hair'},
    {id:507,trueId:557,baseId:109,name:'Cute RGB Bob',trueName:'True RGB Cute Bob'},
    {id:508,trueId:558,baseId:58,name:'Short RGB Hair',trueName:'True RGB Short Hair'},
    {id:509,trueId:559,baseId:67,name:'RGB K-Pop Shirt',trueName:'True RGB K-Pop Shirt'},
    {id:510,trueId:560,baseId:57,name:'RGB K-Pop Pants',trueName:'True RGB K-Pop Pants'},
    {id:511,trueId:561,baseId:56,name:'RGB K-Pop Shoes',trueName:'True RGB K-Pop Shoes'},
    // Both RGB Stetsons now cycle the entire recovered Yellow Stetson texture.
    {id:512,trueId:562,baseId:105,name:'RGB Stetson',trueName:'True RGB Stetson'},
    {id:513,trueId:563,baseId:234,name:'RGB Sparkle Shoes',trueName:'True RGB Sparkle Shoes'},
    {id:514,trueId:564,baseId:233,name:'RGB Sparkle Gloves',trueName:'True RGB Sparkle Gloves'},
    {id:515,trueId:565,baseId:125,name:'RGB Retriever',trueName:'True RGB Retriever'},
    {id:516,trueId:566,baseId:387,name:'RGB Dual Lightsword',trueName:'True RGB Dual Lightsword',weapon:true},
    {id:517,trueId:567,baseId:379,name:'RGB Lightsword',trueName:'True RGB Lightsword',weapon:true},
    {id:518,trueId:568,baseId:20,name:'RGB Shirt',trueName:'True RGB Shirt'},
    {id:519,trueId:569,baseId:187,name:'RGB WC Shirt',trueName:'True RGB WC Shirt'},
    {id:520,trueId:570,baseId:23,name:'RGB Pants',trueName:'True RGB Pants'}
  ];
  var RGB_BY_ID={};
  var RGB_IDS=[];
  var TRUE_RGB_IDS=[];
  var RGB_WEAPON_IDS={516:true,517:true,566:true,567:true};
  for(var rgbIndex=0;rgbIndex<RGB_ITEMS.length;rgbIndex++){
    var rgbDef=RGB_ITEMS[rgbIndex];
    RGB_BY_ID[rgbDef.id]={
      id:rgbDef.id,baseId:rgbDef.baseId,name:rgbDef.name,trueRgb:false,
      weapon:!!rgbDef.weapon,stetson:!!rgbDef.stetson
    };
    RGB_BY_ID[rgbDef.trueId]={
      id:rgbDef.trueId,baseId:rgbDef.baseId,name:rgbDef.trueName,trueRgb:true,
      weapon:!!rgbDef.weapon,stetson:!!rgbDef.stetson
    };
    RGB_IDS.push(rgbDef.id);
    TRUE_RGB_IDS.push(rgbDef.trueId);
  }

  function randomHash(){
    try{
      if(window.crypto&&window.crypto.getRandomValues){
        var a=new Uint32Array(1);
        window.crypto.getRandomValues(a);
        return (a[0]&0x7fffffff)>>>0;
      }
    }catch(error){}
    return Math.floor(Math.random()*0x7fffffff)>>>0;
  }

  function easternParts(date){
    date=date||new Date();
    try{
      var parts=new Intl.DateTimeFormat('en-US',{
        timeZone:RGB_TIME_ZONE,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit'
      }).formatToParts(date);
      var out={weekday:'',year:0,month:0,day:0};
      for(var i=0;i<parts.length;i++){
        if(parts[i].type==='weekday')out.weekday=parts[i].value;
        else if(parts[i].type==='year')out.year=parseInt(parts[i].value,10)||0;
        else if(parts[i].type==='month')out.month=parseInt(parts[i].value,10)||0;
        else if(parts[i].type==='day')out.day=parseInt(parts[i].value,10)||0;
      }
      return out;
    }catch(error){
      var localDay=date.getDay();
      return {
        weekday:localDay===0?'Sun':localDay===6?'Sat':'Weekday',
        year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate()
      };
    }
  }

  function isRgbWeekend(){
    var p=easternParts(new Date());
    return p.weekday==='Sat'||p.weekday==='Sun';
  }

  function weekendSeed(){
    var now=new Date();
    var p=easternParts(now);
    // Sunday shares Saturday's featured trio.
    if(p.weekday==='Sun'){
      now=new Date(now.getTime()-24*60*60*1000);
      p=easternParts(now);
    }
    var seed=((p.year*10000+p.month*100+p.day)^0x524742)&0x7fffffff;
    return seed||240;
  }

  function featuredRgbIds(){
    var pool=RGB_IDS.slice(),seed=weekendSeed();
    for(var i=pool.length-1;i>0;i--){
      seed=(Math.imul(seed,1103515245)+12345)&0x7fffffff;
      var j=seed%(i+1),tmp=pool[i];
      pool[i]=pool[j];pool[j]=tmp;
    }
    return pool.slice(0,3);
  }

  function isAnyRgbId(id){
    return !!RGB_BY_ID[id|0];
  }

  function isRgbWeaponId(id){
    return !!RGB_WEAPON_IDS[id|0];
  }

  function trueRgbOdds(id){
    id=id|0;
    if(id===TRUE_RGB_MILITARY_ID)return TRUE_RGB_MILITARY_ODDS;
    if(TRUE_RGB_KPOP_IDS[id])return TRUE_RGB_KPOP_ODDS;
    return TRUE_RGB_DEFAULT_ODDS;
  }

  function genericTrueRgbIds(){
    var out=[];
    for(var i=0;i<TRUE_RGB_IDS.length;i++){
      var id=TRUE_RGB_IDS[i]|0;
      if(id!==TRUE_RGB_MILITARY_ID&&!TRUE_RGB_KPOP_IDS[id])out.push(id);
    }
    return out;
  }

  function rollTrueRgbReward(){
    // Military Hat is intentionally absurdly rare.
    if(randomHash()%TRUE_RGB_MILITARY_ODDS===0)
      return {category:2,id:TRUE_RGB_MILITARY_ID,count:1,tier:'true-rgb'};

    // Each True RGB K-Pop piece, including the Stetson, has its own 1/101,337 roll.
    var kpop=[559,560,561,562];
    var start=randomHash()%kpop.length;
    for(var i=0;i<kpop.length;i++){
      var id=kpop[(start+i)%kpop.length];
      if(randomHash()%TRUE_RGB_KPOP_ODDS===0)
        return {category:2,id:id,count:1,tier:'true-rgb'};
    }

    // Everything else uses the general 1/100,000 True RGB event roll.
    if(randomHash()%TRUE_RGB_DEFAULT_ODDS===0){
      var pool=genericTrueRgbIds();
      if(pool.length){
        var pick=pool[randomHash()%pool.length];
        return {category:2,id:pick,count:1,tier:'true-rgb'};
      }
    }
    return null;
  }

  function inventoryCount(service,category,id){
    var total=0,slots=service&&service.state&&service.state.slots||[];
    for(var i=0;i<slots.length;i++){
      var item=slots[i];
      if(item&&(item.category|0)===(category|0)&&(item.id|0)===(id|0))total+=Math.max(0,item.count|0);
    }
    return total;
  }

  function rainbowRgb(phase){
    phase=((phase%1)+1)%1;
    var h=phase*6,i=Math.floor(h),f=h-i,q=1-f;
    switch(i%6){
      case 0:return [1,f,0];
      case 1:return [q,1,0];
      case 2:return [0,1,f];
      case 3:return [0,q,1];
      case 4:return [f,0,1];
      default:return [1,0,q];
    }
  }

  function rgbColorFor(def,color){
    var low=def&&def.trueRgb?0.10:0.28;
    var gain=def&&def.trueRgb?0.62:1.12;
    return [low+gain*color[0],low+gain*color[1],low+gain*color[2]];
  }

  function applyRgbColor(obj,def,color){
    if(!obj||!def)return false;
    var rgb=rgbColorFor(def,color);
    try{
      obj._build240RgbStetson=!!def.stetson;
      obj.c9=false;
      if(typeof obj.set_local_r==='function')obj.set_local_r(rgb[0]);
      if(typeof obj.set_local_g==='function')obj.set_local_g(rgb[1]);
      if(typeof obj.set_local_b==='function')obj.set_local_b(rgb[2]);
      if(typeof obj.set_r==='function')obj.set_r(rgb[0]);
      if(typeof obj.set_g==='function')obj.set_g(rgb[1]);
      if(typeof obj.set_b==='function')obj.set_b(rgb[2]);
      return true;
    }catch(error){return false}
  }

  function entityNode(ent,path){
    try{
      var node=ent&&ent.i33?ent.i33:ent;
      for(var i=0;i<path.length;i++)node=node&&node.f2?node.f2(path[i]):null;
      return node||null;
    }catch(error){return null}
  }

  function tintDirectBodyParts(ent,color){
    var ap=ent&&ent.J33;
    if(!ap||!ap.length)return;
    var shirt=RGB_BY_ID[ap[2]|0];
    if(shirt){
      applyRgbColor(entityNode(ent,['front_shoulder','arm']),shirt,color);
      applyRgbColor(entityNode(ent,['back_shoulder','arm_back']),shirt,color);
      applyRgbColor(entityNode(ent,['torso']),shirt,color);
    }
    var pants=RGB_BY_ID[ap[7]|0];
    if(pants){
      applyRgbColor(entityNode(ent,['front_lowerleg','leg']),pants,color);
      applyRgbColor(entityNode(ent,['back_lowerleg','leg_back']),pants,color);
      applyRgbColor(entityNode(ent,['pants']),pants,color);
    }
  }

  function hasRgbKpopShoes(ent,appearanceFallback){
    var ap=ent&&ent.J33;
    if(!(ap&&ap.length))ap=appearanceFallback;
    return !!(ap&&RGB_KPOP_SHOE_IDS[ap[3]|0]);
  }

  function rgbKpopMusicState(){
    var service=window.q&&q.diggerzService;
    var local=window.l&&l.z39;
    var scale=window.l&&Number(l._44)||1;
    var state={present:false,factor:0,distance:Infinity};
    if(!local)return state;

    // A wearer always hears their own shoes at full intended volume.
    if(hasRgbKpopShoes(local,service&&service.state&&service.state.appearance)){
      state.present=true;state.factor=1;state.distance=0;return state;
    }

    var lx=Number(local.b6)/scale,ly=Number(local.b7)/scale;
    var peers=service&&service.pvpPeers||{};
    for(var key in peers){
      var peer=peers[key];
      var ent=service&&service.pvpEntityForPeer?service.pvpEntityForPeer(peer):null;
      var ap=(ent&&ent.J33&&ent.J33.length)?ent.J33:(peer&&peer.info&&peer.info.appearance);
      if(!ap||!RGB_KPOP_SHOE_IDS[ap[3]|0])continue;
      state.present=true;

      var px=NaN,py=NaN;
      if(ent&&isFinite(Number(ent.b6))&&isFinite(Number(ent.b7))){
        px=Number(ent.b6)/scale;py=Number(ent.b7)/scale;
      }else if(peer&&isFinite(Number(peer.lastX))&&isFinite(Number(peer.lastY))){
        px=Number(peer.lastX);py=Number(peer.lastY);
      }else if(peer&&peer.info&&isFinite(Number(peer.info.x))&&isFinite(Number(peer.info.y))){
        px=Number(peer.info.x);py=Number(peer.info.y);
      }
      if(!isFinite(px)||!isFinite(py)||!isFinite(lx)||!isFinite(ly))continue;
      var distance=Math.hypot(px-lx,py-ly);
      if(distance<state.distance)state.distance=distance;
    }

    if(!state.present||!isFinite(state.distance))return state;
    if(state.distance<=RGB_KPOP_FULL_DISTANCE)state.factor=1;
    else if(state.distance>=RGB_KPOP_FADE_DISTANCE)state.factor=0;
    else{
      var t=(RGB_KPOP_FADE_DISTANCE-state.distance)/(RGB_KPOP_FADE_DISTANCE-RGB_KPOP_FULL_DISTANCE);
      state.factor=t*t*(3-2*t);
    }
    return state;
  }

  function rgbWingDef(ent){
    var ap=ent&&ent.J33,id=ap&&ap[5]|0;
    return RGB_WING_IDS[id]?RGB_BY_ID[id]:null;
  }

  function spawnWingSparkles(ent,def,color,now){
    if(!ent||!def)return;
    if(ent._build240WingSparkAt&&now-ent._build240WingSparkAt<85)return;
    ent._build240WingSparkAt=now;
    var x=Number(ent.b6),y=Number(ent.b7);
    if(!isFinite(x)||!isFinite(y))return;
    try{
      var rt=window.DiggerzRuntime,z=rt&&rt.getZ&&rt.getZ(),f=rt&&rt.getF&&rt.getF();
      var service=window.q&&q.diggerzService,game=service&&service.game;
      if(!z||!f||!f.SPARK_PNG||!game)return;
      for(var si=0;si<2;si++){
        var sp=z.I9();
        sp.Init(f.SPARK_PNG());
        sp.D7(game);
        sp.b6=x+(si?1:-1)*(18+Math.random()*18)+(Math.random()-.5)*7;
        sp.b7=y-12+(Math.random()-.5)*40;
        sp.set_local_xScale(sp.set_local_yScale(.55+Math.random()*.35));
        applyRgbColor(sp,def,color);
        sp.F6(5,.95,0,520);
        sp.F6(3,.75,.08,520);
        sp.F6(4,.75,.08,520);
        game._9.push(sp);
      }
    }catch(error){}
  }

  function spawnKpopTrail(ent,def,color,now){
    if(!ent||!hasRgbKpopShoes(ent))return;
    var x=Number(ent.b6),y=Number(ent.b7);
    if(!isFinite(x)||!isFinite(y))return;
    var lx=Number(ent._build240TrailX),ly=Number(ent._build240TrailY);
    ent._build240TrailX=x;ent._build240TrailY=y;
    if(!isFinite(lx)||!isFinite(ly)||Math.hypot(x-lx,y-ly)<1.25)return;
    if(ent._build240TrailAt&&now-ent._build240TrailAt<95)return;
    ent._build240TrailAt=now;
    try{
      var rt=window.DiggerzRuntime,z=rt&&rt.getZ&&rt.getZ(),f=rt&&rt.getF&&rt.getF();
      var service=window.q&&q.diggerzService,game=service&&service.game;
      if(!z||!f||!f.STAR_PNG||!game)return;
      var sp=z.I9();
      sp.Init(f.STAR_PNG());
      sp.D7(game);
      sp.b6=x+(Math.random()-.5)*12;
      sp.b7=y+12+(Math.random()-.5)*7;
      sp.set_local_xScale(sp.set_local_yScale(.16+Math.random()*.08));
      applyRgbColor(sp,def,color);
      sp.F6(5,.95,0,520);
      sp.F6(3,.2,.04,520);
      sp.F6(4,.2,.04,520);
      game._9.push(sp);
    }catch(error){}
  }

  function ensureRgbKpopAudio(){
    if(rgbKpopAudio||rgbKpopAudioFailed)return rgbKpopAudio;
    try{
      rgbKpopAudio=new Audio();
      rgbKpopAudio.loop=true;
      rgbKpopAudio.preload='auto';
      rgbKpopAudio.volume=0;
      rgbKpopAudio.playsInline=true;
      rgbKpopAudioSourceIndex=0;
      rgbKpopAudio.src=RGB_KPOP_AUDIO_SOURCES[rgbKpopAudioSourceIndex];
      rgbKpopAudio.onerror=function(){
        if(rgbKpopAudioSourceIndex+1<RGB_KPOP_AUDIO_SOURCES.length){
          rgbKpopAudioSourceIndex++;
          try{
            rgbKpopAudio.src=RGB_KPOP_AUDIO_SOURCES[rgbKpopAudioSourceIndex];
            rgbKpopAudio.load();
            rgbKpopAudioRetryAt=0;
          }catch(error){}
        }else{
          rgbKpopAudioFailed=true;
          try{rgbKpopAudio.pause()}catch(error){}
        }
      };
      rgbKpopAudio.load();
    }catch(error){
      rgbKpopAudioFailed=true;
      rgbKpopAudio=null;
    }
    return rgbKpopAudio;
  }

  function tryPlayRgbKpop(){
    var audio=ensureRgbKpopAudio();
    if(!audio||rgbKpopAudioFailed)return;
    try{
      var p=audio.play();
      if(p&&p.catch)p.catch(function(){});
    }catch(error){}
  }

  function installRgbKpopGestureUnlock(){
    if(rgbKpopGestureInstalled)return;
    rgbKpopGestureInstalled=true;
    function unlock(){
      var state=rgbKpopMusicState();
      if(!state.present)return;
      var audio=ensureRgbKpopAudio();
      if(!audio)return;
      try{
        audio.volume=Math.max(audio.volume,Math.min(RGB_KPOP_MAX_VOLUME,state.factor*RGB_KPOP_MAX_VOLUME));
      }catch(error){}
      tryPlayRgbKpop();
    }
    document.addEventListener('pointerdown',unlock,{passive:true});
    document.addEventListener('touchstart',unlock,{passive:true});
    document.addEventListener('keydown',unlock);
  }

  function updateRgbKpopMusic(){
    var state=rgbKpopMusicState();

    if(!state.present){
      if(rgbKpopAudio&&!rgbKpopAudio.paused){
        try{
          rgbKpopAudio.volume=Math.max(0,rgbKpopAudio.volume-.035);
          if(rgbKpopAudio.volume<=.01){rgbKpopAudio.pause();rgbKpopAudio.currentTime=0}
        }catch(error){}
      }
      return;
    }

    var audio=ensureRgbKpopAudio();
    if(!audio)return;

    var target=Math.max(0,Math.min(RGB_KPOP_MAX_VOLUME,state.factor*RGB_KPOP_MAX_VOLUME));
    try{
      var current=isFinite(Number(audio.volume))?Number(audio.volume):0;
      var step=.045;
      if(current<target)current=Math.min(target,current+step);
      else if(current>target)current=Math.max(target,current-step);
      audio.volume=Math.max(0,Math.min(1,current));
    }catch(error){}

    // Keep the track running silently while a wearer exists but is out of range.
    // That makes walking back toward them fade into the current point in the song.
    if(audio.paused&&Date.now()>=rgbKpopAudioRetryAt){
      rgbKpopAudioRetryAt=Date.now()+1200;
      tryPlayRgbKpop();
    }
  }

  function animateEquippedRgb(color,now){
    var service=window.q&&q.diggerzService;
    var local=window.l&&l.z39;
    if(local){
      tintDirectBodyParts(local,color);
      var ldef=RGB_BY_ID[local.J33&&local.J33[3]|0];
      if(ldef&&RGB_KPOP_SHOE_IDS[ldef.id|0])spawnKpopTrail(local,ldef,color,now);
      var lwing=rgbWingDef(local);
      if(lwing)spawnWingSparkles(local,lwing,color,now);
    }
    try{
      var peers=service&&service.pvpPeers||{};
      for(var key in peers){
        var ent=service.pvpEntityForPeer&&service.pvpEntityForPeer(peers[key]);
        if(!ent)continue;
        tintDirectBodyParts(ent,color);
        var def=RGB_BY_ID[ent.J33&&ent.J33[3]|0];
        if(def&&RGB_KPOP_SHOE_IDS[def.id|0])spawnKpopTrail(ent,def,color,now);
        var wing=rgbWingDef(ent);
        if(wing)spawnWingSparkles(ent,wing,color,now);
      }
    }catch(error){}
    updateRgbKpopMusic();
  }

  function registerRgbObject(obj,def){
    if(!obj||!def)return obj;
    obj._build240Rgb=def;
    obj._build240RgbStetson=!!def.stetson;
    if(rgbObjects.indexOf(obj)<0)rgbObjects.push(obj);
    return obj;
  }

  function decorateRgbWeekendBox(box){
    if(!box)return box;
    return registerRgbObject(box,{trueRgb:false,box:true,name:'RGB Weekend Box'});
  }

  function animateRgbObjects(now){
    var phase=(Number(now)||Date.now())/3600;
    var color=rainbowRgb(phase);
    var kept=[];
    for(var i=0;i<rgbObjects.length;i++){
      var obj=rgbObjects[i],def=obj&&obj._build240Rgb;
      if(!obj||!def)continue;
      // Pooled display objects can be recycled. Only animate an object while it
      // still carries its RGB marker and has not been destroyed.
      if(obj.a0===1||obj.a2===false)continue;
      // c9=false makes the hue sweep affect the full recovered item image.
      // This also RGB-ifies Golden Wings' inherited sparkle children.
      if(applyRgbColor(obj,def,color))kept.push(obj);
    }
    rgbObjects=kept;
    animateEquippedRgb(color,Number(now)||Date.now());
    requestAnimationFrame(animateRgbObjects);
  }

  function trueRgbMessage(player,itemId){
    var odds=trueRgbOdds(itemId);
    return String(player||'Player')+' FOUND A TRUE RGB ITEM! 1/'+odds.toLocaleString('en-US')+' CHANCE!!! CONGRATS!!!';
  }

  function announceTrueRgb(service,player,itemId){
    var message=trueRgbMessage(player,itemId);
    try{service.message('^6'+message)}catch(error){}
    // Use the same full-screen center-message path used by Super Rare finds.
    try{service.centerMessage('^6'+message)}catch(error){}
    return message;
  }

  function announceTrueRgbLocal(service,itemId){
    var player=service&&service.playerName?service.playerName():'Player';
    return announceTrueRgb(service,player,itemId);
  }

  function installRgb(proto){
    if(rgbInstalled||proto.__build240Rgb)return true;
    if(!window.DiggerzRuntime)return false;
    var rt=window.DiggerzRuntime,h=rt.getH&&rt.getH(),Yf=rt.getYf&&rt.getYf();
    if(!h||typeof h.n7!=='function')return false;

    // Register the virtual variant IDs with every existing inventory/catalog
    // path. The item factory below maps each one onto its recovered base asset.
    var itemPool=window.DiggerzService.ITEM_POOL||[];
    for(var i=0;i<RGB_IDS.length;i++){
      if(itemPool.indexOf(RGB_IDS[i])<0)itemPool.push(RGB_IDS[i]);
      if(itemPool.indexOf(TRUE_RGB_IDS[i])<0)itemPool.push(TRUE_RGB_IDS[i]);
    }

    // Map virtual RGB IDs back to their recovered base IDs in the wearable
    // behavior factory too. This restores native properties such as Golden
    // Wings gravity/sparkles and the K-Pop Shoes dance animation.
    if(Yf&&typeof Yf.W48==='function'&&!Yf.__build240RgbMapped){
      var oldW48=Yf.W48;
      Yf.W48=function(a,b,c){
        var def=RGB_BY_ID[a|0];
        var out=oldW48.call(this,def?def.baseId:a,b,c);
        if(def&&out)registerRgbObject(out,def);
        return out;
      };
      Yf.__build240RgbMapped=true;
    }

    var oldN7=h.n7;
    h.n7=function(a,b,c,d,e,g,p,w,k){
      var def=(a|0)===2?RGB_BY_ID[c|0]:null;
      var args=arguments,out,obj;
      if(def){
        var mapped=[a,b,def.baseId,d,e,g,p,w,k];
        out=oldN7.apply(this,mapped);
        obj=out||b;
        if(obj){
          obj._1=def.name;
          registerRgbObject(obj,def);
        }
        return obj||out;
      }
      out=oldN7.apply(this,args);
      obj=out||b;
      // Clear a stale marker if the display-object pool recycled an old RGB root.
      if(obj&&obj._build240Rgb){obj._build240Rgb=null;obj._build240RgbStetson=false;}
      return out;
    };

    // RGB/True RGB are event-only paths and must never leak into the ordinary
    // weekday Super Rare candidate scan just because their catalog IDs exist.
    if(typeof proto.allSuperRareCandidates==='function'){
      var oldAllSuper=proto.allSuperRareCandidates;
      proto.allSuperRareCandidates=function(){
        var list=oldAllSuper.apply(this,arguments)||[],filtered=[];
        for(var n=0;n<list.length;n++){
          var item=list[n];
          if(item&&!isAnyRgbId(item.id|0))filtered.push(item);
        }
        return filtered;
      };
    }

    if(typeof proto.todaySuperRares==='function'){
      var oldToday=proto.todaySuperRares;
      proto.todaySuperRares=function(){
        if(isRgbWeekend()){
          var ids=featuredRgbIds(),list=[];
          for(var n=0;n<ids.length;n++)list.push({category:2,id:ids[n],count:1,tier:'super'});
          return list;
        }
        return oldToday.apply(this,arguments);
      };
    }

    if(typeof proto.superRareRewardAt==='function'){
      var oldSuper=proto.superRareRewardAt;
      proto.superRareRewardAt=function(hash){
        if(isRgbWeekend()){
          var ids=featuredRgbIds();
          if(!ids.length)return null;
          return {category:2,id:ids[Math.abs(hash|0)%ids.length],count:1,tier:'super'};
        }
        var reward=oldSuper.apply(this,arguments);
        // Belt-and-suspenders protection for an older cached candidate list.
        if(reward&&isAnyRgbId(reward.id|0))return null;
        return reward;
      };
    }

    // True RGB gets its own pickup celebration instead of the normal Super Rare
    // screen. The global relay happens only after the item actually entered the
    // inventory, so a full inventory cannot trigger a fake find announcement.
    if(typeof proto.pickup==='function'){
      var oldPickup=proto.pickup;
      proto.pickup=function(packet){
        var pos=packet&&packet.Q0,guid=null,key='',drop=null,before=0;
        try{
          if(packet){guid=packet.Q6();key=guid&&guid.q4?guid.q4():'';drop=key?this.drops[key]:null;packet.Q0=pos}
          if(drop&&drop.tier==='true-rgb'&&RGB_BY_ID[drop.id|0]&&RGB_BY_ID[drop.id|0].trueRgb){
            before=inventoryCount(this,drop.category,drop.id);
          }else drop=null;
        }catch(error){try{if(packet)packet.Q0=pos}catch(_e){}}
        var result=oldPickup.call(this,packet);
        if(drop){
          var after=inventoryCount(this,drop.category,drop.id);
          if(after>before){
            var itemName=RGB_BY_ID[drop.id|0].name;
            announceTrueRgbLocal(this,drop.id|0);
            try{
              if(typeof this.pvpSend==='function')this.pvpSend({t:'true-rgb-found',itemId:drop.id|0,itemName:itemName});
            }catch(error){}
          }
        }
        return result;
      };
    }

    // Every room/server client receives the same global True RGB celebration.
    if(typeof proto.pvpReceive==='function'){
      var oldReceive=proto.pvpReceive;
      proto.pvpReceive=function(message){
        // Multiplayer drop awards bypass the normal pickup() path, so announce
        // a True RGB find here after the server-authoritative item reaches inventory.
        if(message&&message.t==='drop-award'&&message.drop&&message.drop.tier==='true-rgb'){
          var award=message.drop,id=award.id|0,def=RGB_BY_ID[id];
          if(def&&def.trueRgb){
            var before=inventoryCount(this,award.category|0,id);
            var result=oldReceive.apply(this,arguments);
            var after=inventoryCount(this,award.category|0,id);
            if(after>before){
              announceTrueRgbLocal(this,id);
              try{if(typeof this.pvpSend==='function')this.pvpSend({t:'true-rgb-found',itemId:id,itemName:def.name})}catch(error){}
            }
            return result;
          }
        }
        if(message&&message.t==='true-rgb-global'){
          var who=String(message.name||'Player');
          var id=message.itemId|0;
          announceTrueRgb(this,who,id);
          return;
        }
        return oldReceive.apply(this,arguments);
      };
    }

    proto.__build240Rgb=true;
    rgbInstalled=true;
    if(!rgbAnimationStarted){
      rgbAnimationStarted=true;
      installRgbKpopGestureUnlock();
      requestAnimationFrame(animateRgbObjects);
    }
    return true;
  }

  function dropPacket(service,drop,fromY,toY){
    if(!service||!drop||!drop.guid||!service.enqueue)return;
    var x=Number(drop.x)||0;
    var endY=Number(toY);
    var startY=Number(fromY);
    if(!isFinite(endY)||!isFinite(startY))return;
    service.enqueue(15,1,function(packet){
      packet.R8(drop.guid);
      packet.R4(drop.category|0);
      packet.r8(x);
      packet.r8(0);
      packet.r8(endY);
      packet.r8(x);
      packet.r8(0);
      packet.r8(startY);
      packet.R2(drop.id|0);
      packet.R2(Math.max(1,drop.count|0));
      packet.R0(0);
      packet.s0(true);
      packet.R9(String(drop.text||''));
    });
    drop.y=endY;
    drop._build240LastGravityAt=Date.now();
  }

  function shouldFall(service,drop){
    if(!service||!service.state||!drop||drop.isCoin)return false;
    if((drop.count|0)<=0)return false;
    var height=Number(service.state.height)||80;
    var y=Number(drop.y);
    var x=Math.round(Number(drop.x)||0);
    if(!isFinite(y)||y>=height-1.15)return false;
    var probeY=Math.floor(y+1.0);
    if(probeY<0||probeY>=height)return false;
    try{return !(service.tileAt(x,probeY)|0)}catch(error){return false}
  }

  function gravityStep(){
    try{
      var service=(window.q&&q.diggerzService)||(window.DiggerzPvp22&&window.DiggerzPvp22.service);
      if(!service||!service.drops||!service.state)return;
      var now=Date.now(),height=Number(service.state.height)||80;
      for(var key in service.drops){
        if(!Object.prototype.hasOwnProperty.call(service.drops,key))continue;
        var drop=service.drops[key];
        if(!drop||drop.isCoin)continue;
        if(!drop._build240BornAt)drop._build240BornAt=now;
        if(now-drop._build240BornAt<450)continue;
        if(drop._build240LastGravityAt&&now-drop._build240LastGravityAt<360)continue;
        if(!shouldFall(service,drop))continue;
        var oldY=Number(drop.y)||0;
        var newY=Math.min(height-1.2,oldY+0.72);
        if(newY>oldY+0.01)dropPacket(service,drop,oldY,newY);
      }
    }catch(error){}
  }

  function install(){
    if(installed)return true;
    if(!window.DiggerzService||!window.DiggerzService.prototype||!window.DiggerzRuntime)return false;
    var proto=window.DiggerzService.prototype;
    if(proto.__build240Patches&&proto.__build240Rgb){installed=true;return true}

    if(!proto.__build240Patches){
      proto.__build240Patches=true;

      // Track blocks placed after the world was loaded. Re-mining a placed block
      // cannot generate another bonus-loot roll. Build 24.0 also no longer
      // returns mined terrain itself to inventory.
      var oldSetTile=proto.setTile;
      if(typeof oldSetTile==='function'){
        proto.setTile=function(x,y,id,variant){
          var result=oldSetTile.call(this,x,y,id,variant);
          if(result!==false&&(id|0)>0){
            if(!this._build240PlacedTiles)this._build240PlacedTiles={};
            this._build240PlacedTiles[(x|0)+':'+(y|0)]=true;
          }
          return result;
        };
      }

      // Every successful natural-block break gets fresh independent randomness.
      // Monday-Friday first checks the ultra-rare True RGB tables. Saturday/Sunday
      // reserve Super Rare finds for the three featured normal RGB variants.
      proto.miningRewardAt=function(x,y){
        var placed=this._build240PlacedTiles&&this._build240PlacedTiles[(x|0)+':'+(y|0)];
        if(placed){
          delete this._build240PlacedTiles[(x|0)+':'+(y|0)];
          return null;
        }

        if(isRgbWeekend()){
          // RGB Weekend gets an extra independent Super Rare roll before the
          // normal mining table, making the featured trio roughly twice as
          // obtainable as ordinary daily Super Rares without reducing any
          // existing Rare/Common reward band.
          var rgbWeekendBonusRoll=randomHash()%10000;
          if(rgbWeekendBonusRoll<12){
            return this.superRareRewardAt(randomHash());
          }
        }else{
          var trueReward=rollTrueRgbReward();
          if(trueReward)return trueReward;
        }

        var hash=randomHash();
        var roll=hash%10000,item,list;
        if(roll<12)return this.superRareRewardAt(hash);
        if(roll<42){
          list=window.DiggerzService.RARE_REWARDS||[];
          if(list.length){
            item=list[Math.floor(hash/42)%list.length];
            return {category:item.category,id:item.id,count:item.count||1,tier:'rare'};
          }
          var rares=window.DiggerzService.RARE_DROPS||[];
          if(!rares.length)return null;
          return {category:2,id:rares[Math.floor(hash/42)%rares.length],count:1,tier:'rare'};
        }
        if(roll<1242){
          // Preserve the established Build 23.3 common-reward quantities/pool;
          // only the random source changed in Build 24.
          list=window.DiggerzService.COMMON_REWARDS||[];
          if(list.length){
            item=list[Math.floor(hash/642)%list.length];
            return {category:item.category,id:item.id,count:item.count||1,tier:item.category===1?'block':'weapon'};
          }
          if(roll<642){
            var blocks=window.DiggerzService.NORMAL_BLOCK_POOL||[];
            if(!blocks.length)return null;
            return {category:1,id:blocks[Math.floor(hash/642)%blocks.length],count:1,tier:'block'};
          }
          return this.normalWeaponRewardAt(hash);
        }
        return null;
      };

      // Mark newly-created pickups so the original spawn hop happens once,
      // then Build 24 gravity pulls them down through cleared space.
      var oldSpawnDrop=proto.spawnDrop;
      if(typeof oldSpawnDrop==='function'){
        proto.spawnDrop=function(){
          var before={},key;
          for(key in this.drops)before[key]=true;
          var result=oldSpawnDrop.apply(this,arguments);
          var now=Date.now();
          for(key in this.drops){
            if(!before[key]&&this.drops[key])this.drops[key]._build240BornAt=now;
          }
          return result;
        };
      }

      gravityTimer=setInterval(gravityStep,90);
    }

    if(!installRgb(proto))return false;

    installed=true;
    window.DiggerzBuild240={
      build:BUILD,
      patches:true,
      rgb:true,
      timeZone:RGB_TIME_ZONE,
      isRgbWeekend:isRgbWeekend,
      featuredRgbIds:featuredRgbIds,
      isRgbWeaponId:isRgbWeaponId,
      isAnyRgbId:isAnyRgbId,
      decorateRgbWeekendBox:decorateRgbWeekendBox,
      normalRgbIds:RGB_IDS.slice(),
      trueRgbIds:TRUE_RGB_IDS.slice()
    };
    return true;
  }

  function boot(){if(!install())setTimeout(boot,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
}());
