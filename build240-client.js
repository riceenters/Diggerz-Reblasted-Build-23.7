(function(){
  'use strict';

  var BUILD='24.0';
  var installed=false;
  var gravityTimer=null;

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

  function dropPacket(service,drop,fromY,toY){
    if(!service||!drop||!drop.guid||!service.enqueue)return;
    var x=Number(drop.x)||0;
    var endY=Number(toY);
    var startY=Number(fromY);
    if(!isFinite(endY)||!isFinite(startY))return;
    service.enqueue(15,1,function(packet){
      packet.R8(drop.guid);
      packet.R4(drop.category|0);
      // The recovered item-drop packet stores the destination first and the
      // animation origin second. Reusing the GUID makes the existing entity
      // animate instead of creating another pickup.
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
        // Let the original little spawn-hop finish before gravity takes over.
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
    if(!window.DiggerzService||!window.DiggerzService.prototype)return false;
    var proto=window.DiggerzService.prototype;
    if(proto.__build240Patches){installed=true;return true}
    proto.__build240Patches=true;

    // Track blocks placed after the world was loaded. Re-mining a placed block
    // still gives the block itself back, but it cannot generate another bonus
    // loot roll. That closes the build/mine farming loop entirely.
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

    // Every successful natural-block break gets a fresh independent loot roll.
    // Nothing about the map coordinate determines the result anymore.
    proto.miningRewardAt=function(x,y){
      var placed=this._build240PlacedTiles&&this._build240PlacedTiles[(x|0)+':'+(y|0)];
      if(placed){
        delete this._build240PlacedTiles[(x|0)+':'+(y|0)];
        return null;
      }
      var hash=randomHash();
      var roll=hash%10000;
      if(roll<12)return this.superRareRewardAt(hash);
      if(roll<42){
        var rares=window.DiggerzService.RARE_DROPS||[];
        if(!rares.length)return null;
        return {category:2,id:rares[Math.floor(hash/42)%rares.length],tier:'rare'};
      }
      if(roll<642){
        var blocks=window.DiggerzService.NORMAL_BLOCK_POOL||[];
        if(!blocks.length)return null;
        return {category:1,id:blocks[Math.floor(hash/642)%blocks.length],tier:'block'};
      }
      if(roll<1242)return this.normalWeaponRewardAt(hash);
      return null;
    };

    // Mark newly-created pickups so the original spawn bounce happens once,
    // then let Build 24 gravity pull them down through cleared space.
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
    installed=true;
    window.DiggerzBuild240={build:BUILD,patches:true};
    return true;
  }

  function boot(){if(!install())setTimeout(boot,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
}());
