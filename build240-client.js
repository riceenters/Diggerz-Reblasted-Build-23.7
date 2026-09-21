(function(){
  'use strict';

  var BUILD='24.0';
  var installed=false;
  var gravityTimer=null;
  var rgbInstalled=false;
  var rgbAnimationStarted=false;
  var rgbObjects=[];
  var RGB_TIME_ZONE='America/New_York';

  // Build 24.0 RGB catalog. Normal RGB IDs are weekend-event variants.
  // Their True RGB counterparts use the same recovered item geometry/behavior
  // but a darker animated color cycle and only come from the off-week 1/1000 roll.
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
    // Yellow Stetson is the recovered K-Pop-set hat. RGB/True RGB cycle its
    // colored hat surface while preserving the original wearable slot/offset.
    {id:512,trueId:562,baseId:105,name:'RGB Stetson',trueName:'True RGB Stetson',stetson:true},
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
      var low=def.trueRgb?0.10:0.28;
      var gain=def.trueRgb?0.62:1.12;
      var r=low+gain*color[0],g=low+gain*color[1],b=low+gain*color[2];
      try{
        // c9=false makes the hue sweep affect the full recovered item image.
        // This also RGB-ifies Golden Wings' inherited sparkle children.
        obj.c9=false;
        obj.set_local_r(r);obj.set_local_g(g);obj.set_local_b(b);
        obj.set_r(r);obj.set_g(g);obj.set_b(b);
        kept.push(obj);
      }catch(error){}
    }
    rgbObjects=kept;
    requestAnimationFrame(animateRgbObjects);
  }

  function announceTrueRgbLocal(service,name){
    var player=service&&service.playerName?service.playerName():'Player';
    var message=String(player||'Player')+' FOUND A TRUE RGB ITEM! 1/1000 CHANCE!!! CONGRATS!!!';
    try{service.message('^6'+message)}catch(error){}
    try{service.centerMessage('^6'+message)}catch(error){}
    return message;
  }

  function installRgb(proto){
    if(rgbInstalled||proto.__build240Rgb)return true;
    if(!window.DiggerzRuntime)return false;
    var rt=window.DiggerzRuntime,h=rt.getH&&rt.getH();
    if(!h||typeof h.n7!=='function')return false;

    // Register the virtual variant IDs with every existing inventory/catalog
    // path. The item factory below maps each one onto its recovered base asset.
    var itemPool=window.DiggerzService.ITEM_POOL||[];
    for(var i=0;i<RGB_IDS.length;i++){
      if(itemPool.indexOf(RGB_IDS[i])<0)itemPool.push(RGB_IDS[i]);
      if(itemPool.indexOf(TRUE_RGB_IDS[i])<0)itemPool.push(TRUE_RGB_IDS[i]);
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
            announceTrueRgbLocal(this,itemName);
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
        if(message&&message.t==='true-rgb-global'){
          var who=String(message.name||'Player');
          var line=who+' FOUND A TRUE RGB ITEM! 1/1000 CHANCE!!! CONGRATS!!!';
          try{this.message('^6'+line)}catch(error){}
          try{this.centerMessage('^6'+line)}catch(error){}
          return;
        }
        return oldReceive.apply(this,arguments);
      };
    }

    proto.__build240Rgb=true;
    rgbInstalled=true;
    if(!rgbAnimationStarted){
      rgbAnimationStarted=true;
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
      // Monday-Friday first gets the 1/1000 True RGB roll. Saturday/Sunday
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
          var trueRoll=randomHash()%1000;
          if(trueRoll===0){
            var trueId=TRUE_RGB_IDS[randomHash()%TRUE_RGB_IDS.length];
            return {category:2,id:trueId,count:1,tier:'true-rgb'};
          }
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
