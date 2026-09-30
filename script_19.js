
(function(){
  function install233(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService,q=window.q,l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!q||!l){setTimeout(install233,50);return}
    var proto=DS.prototype;if(proto.__build233)return;proto.__build233=true;

    // --- 50-slot inventory migration ---
    var previousNewState=proto.newState;
    proto.newState=function(){var st=previousNewState.call(this);while(st.slots.length<50)st.slots.push(this.emptyItem());return st};
    var previousRestore=proto.restoreProgress;
    proto.restoreProgress=function(saved){var r=previousRestore.call(this,saved);if(!this.state.slots)this.state.slots=[];while(this.state.slots.length<50)this.state.slots.push(this.emptyItem());return r};

    // --- Build 23.3 rarity tables (KaiRotten recovered list) ---
    // Counts are the number of items in the spawned stack, not probability weights.
    DS.NORMAL_BLOCK_POOL=[184,117,334];
    DS.RARE_COSMETICS=[110,111,112];
    DS.RARE_WEAPONS=[79,80,276];
    DS.RARE_DROPS=DS.RARE_COSMETICS.concat(DS.RARE_WEAPONS);
    DS.SHOP_ONLY_RARES=[107];
    DS.RARE_ITEMS=DS.RARE_DROPS.concat(DS.SHOP_ONLY_RARES);
    DS.WEAPON_GROUPS=[[328],[370],[93],[139],[329],[248]];
    DS.COMMON_REWARDS=[
      {category:1,id:184,count:50}, // Wood Panels / Wood
      {category:1,id:117,count:50}, // Lava
      {category:2,id:328,count:1},  // Blue launcher / Homing Mortar
      {category:2,id:370,count:1},  // Yellow launcher / Homing Mortar
      {category:2,id:93,count:3},   // Grenade Launcher
      {category:2,id:139,count:3},  // Bazooka
      {category:2,id:329,count:1},  // Blade, recovered weapon equivalent of Saw
      {category:2,id:248,count:3},  // Shotgun
      {category:1,id:334,count:2}   // Bomb, recovered block equivalent of TNT
    ];
    DS.RARE_REWARDS=[
      {category:2,id:79,count:2},   // Blue Ray Gun
      {category:2,id:80,count:2},   // Red Ray Gun
      {category:2,id:110,count:1},  // Red Ball Cap
      {category:2,id:111,count:1},  // Blue Ball Cap
      {category:2,id:112,count:1},  // Black Ball Cap
      {category:1,id:138,count:25}, // Water
      {category:1,id:121,count:50}, // Color Ladder
      {category:1,id:134,count:25}, // Desert / Sand
      {category:1,id:110,count:50}, // Ice Tiles
      {category:1,id:156,count:25}, // Red One-way
      {category:1,id:157,count:25}, // Yellow One-way
      {category:1,id:155,count:25}, // Blue One-way
      {category:1,id:154,count:25}, // Green One-way (neutral extra allowed by KaiRotten)
      {category:1,id:328,count:25}, // Purple One-way
      {category:1,id:329,count:25}, // Orange One-way
      {category:1,id:330,count:25}, // Cyan One-way
      {category:1,id:331,count:25}, // Grey One-way
      {category:1,id:332,count:25}, // Black One-way
      {category:1,id:333,count:25}, // Brown One-way
      {category:2,id:276,count:3}   // Musket
    ];
    DS.LIGHTSWORD_POOL=[379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394];
    DS.BUILD233_SUPER_FIXED=[187,188,189,190,191,192,193,355,356,357,358,359,360,247,230,235].concat(DS.LIGHTSWORD_POOL);
    proto.allSuperRareCandidates=function(){
      if(this.superRareCandidates233)return this.superRareCandidates233;
      var out=[],seen={};
      function add(id){id=id|0;if(id<=0||id===81||id===79||id===80)return;var k='2:'+id;if(!seen[k]){seen[k]=true;out.push({category:2,id:id})}}
      for(var i=0;i<DS.BUILD233_SUPER_FIXED.length;i++)add(DS.BUILD233_SUPER_FIXED[i]);
      // The recovered note allows items from the changing Shop board to appear as Super Rares.
      // Add every currently active Shop item, but keep the explicitly Rare ray guns in Rare.
      try{var shop=this.shopListings?this.shopListings():[];for(i=0;i<shop.length;i++){var it=shop[i]||{};if(Array.isArray(it.randomIds)){for(var j=0;j<it.randomIds.length;j++)add(it.randomIds[j])}else add(it.itemId)}}catch(e){}
      this.superRareCandidates233=out;return out
    };
    var oldToday=proto.todaySuperRares;
    proto.todaySuperRares=function(){if(this.superRares233)return this.superRares233;this.superRares=null;var r=oldToday.call(this);this.superRares233=r;return r};
    proto.normalWeaponRewardAt=function(hash){var list=DS.COMMON_REWARDS.filter(function(x){return x.category===2});if(!list.length)return null;var item=list[Math.floor(hash/200)%list.length];return {category:item.category,id:item.id,count:item.count,tier:'weapon'}};
    proto.miningRewardAt=function(x,y){
      var hash=this.miningHashAt(x,y),roll=hash%10000,item,list;
      // Keep the established overall frequency: .12% Super, .30% Rare, 12% Common.
      if(roll<12){var sr=this.superRareRewardAt(hash);if(sr)sr.count=1;return sr}
      if(roll<42){list=DS.RARE_REWARDS;item=list[Math.floor(hash/42)%list.length];return {category:item.category,id:item.id,count:item.count,tier:'rare'}}
      if(roll<1242){list=DS.COMMON_REWARDS;item=list[Math.floor(hash/642)%list.length];return {category:item.category,id:item.id,count:item.count,tier:item.category===1?'block':'weapon'}}
      return null
    };
    // --- Music: Dig+Trade player + synchronized PvP pre-match track ---
    var TRACKS=['music_theme.ogg','music_theme2.ogg','music_theme3.ogg','music_theme4.ogg'];
    var digHowl=null,digTrack=-1,pvpHowl=null,pvpKey='',pvpFightAt=0,pvpOffset=0,pvpBaseVolume=.7;
    var player=document.createElement('div');player.id='diggerz-music-player';player.innerHTML='<div class="mp-title">MUSIC PLAYER</div><select id="diggerz-music-track"><option value="0">Track 1</option><option value="1">Track 2</option><option value="2">Track 3</option><option value="3">Track 4</option></select><div class="mp-row"><button id="diggerz-music-play">Play</button><button id="diggerz-music-pause">Pause</button></div><div class="mp-row"><button id="diggerz-music-restart">Restart</button><button id="diggerz-music-rewind">-2 sec</button></div>';
    document.body.appendChild(player);
    var style=document.createElement('style');style.id='diggerz-build233-style';style.textContent='#diggerz-music-player{display:none;position:fixed;left:10px;top:72px;z-index:2147482305;width:176px;padding:7px;background:rgba(10,17,25,.88);border:2px solid rgba(255,255,255,.72);border-radius:6px;color:#fff;font:700 11px/1.2 Arial,sans-serif;text-shadow:1px 1px #000;box-shadow:0 3px 12px rgba(0,0,0,.45)}#diggerz-music-player .mp-title{text-align:center;margin-bottom:5px;color:#ffe052}#diggerz-music-player select{width:100%;padding:4px;background:#111d2a;color:#fff;border:1px solid #64788e;border-radius:3px;font:inherit}#diggerz-music-player .mp-row{display:flex;gap:4px;margin-top:4px}#diggerz-music-player button{flex:1;padding:4px 2px;background:#263a50;color:#fff;border:1px solid #7b8fa4;border-radius:3px;font:inherit;cursor:pointer}#diggerz-music-player button:hover{background:#36506c}';document.head.appendChild(style);
    var sel=document.getElementById('diggerz-music-track');
    function newTrackHowl(i,loop,onload){return new Howl({src:[TRACKS[i]],preload:true,loop:!!loop,volume:pvpBaseVolume,onload:onload||null})}
    function digSetTrack(i,play){
      i=Math.max(0,Math.min(3,i|0));
      if(!digHowl||digTrack!==i){if(digHowl)try{digHowl.unload()}catch(e){}digTrack=i;digHowl=newTrackHowl(i,false)}
      if(play)try{digHowl.play()}catch(e){}
    }
    sel.onchange=function(){digSetTrack(+sel.value,true)};
    document.getElementById('diggerz-music-play').onclick=function(){digSetTrack(+sel.value,true)};
    document.getElementById('diggerz-music-pause').onclick=function(){if(digHowl)try{digHowl.pause()}catch(e){}};
    document.getElementById('diggerz-music-restart').onclick=function(){digSetTrack(+sel.value,false);if(digHowl)try{digHowl.stop();digHowl.play()}catch(e){}};
    document.getElementById('diggerz-music-rewind').onclick=function(){if(!digHowl)return;try{var pos=Number(digHowl.seek())||0;digHowl.seek(Math.max(0,pos-2))}catch(e){}};
    function startPvpMusic(track,startedAt,fightAt,serverNow){
      track=Number(track);if(!isFinite(track)||track<0||track>3)return;startedAt=+startedAt||Date.now();fightAt=+fightAt||0;pvpOffset=(+serverNow||Date.now())-Date.now();pvpFightAt=fightAt;
      var key=track+':'+startedAt;
      if(key===pvpKey&&pvpHowl){try{if(!pvpHowl.playing())pvpHowl.play()}catch(e){}return}
      pvpKey=key;if(pvpHowl)try{pvpHowl.unload()}catch(e){}
      function syncStart(){if(!pvpHowl)return;try{var d=Number(pvpHowl.duration())||0,elapsed=Math.max(0,(Date.now()+pvpOffset-startedAt)/1000);if(d>0)pvpHowl.seek(elapsed%d);pvpHowl.volume(pvpBaseVolume);if(!pvpHowl.playing())pvpHowl.play()}catch(e){}}
      pvpHowl=newTrackHowl(track,true,syncStart);if(pvpHowl.state&&pvpHowl.state()==='loaded')syncStart()
    }
    function stopPvpMusic(){if(pvpHowl)try{pvpHowl.stop();pvpHowl.unload()}catch(e){}pvpHowl=null;pvpKey='';pvpFightAt=0}
    function setPvpMusicVolume(target,ms){if(!pvpHowl)return;target=Math.max(0,Math.min(1,+target||0));try{var current=Number(pvpHowl.volume());if(ms&&pvpHowl.fade)pvpHowl.fade(isFinite(current)?current:pvpBaseVolume,target,ms);else pvpHowl.volume(target);if(!pvpHowl.playing())pvpHowl.play()}catch(e){}}
    function duckPvpMusic(ms){pvpFightAt=0;setPvpMusicVolume(pvpBaseVolume*.25,ms||900)}
    function raisePvpMusic(ms){setPvpMusicVolume(pvpBaseVolume,ms||1200)}
    var prevReceive233=proto.pvpReceive;
    proto.pvpReceive=function(m){
      if(m&&m.t==='battle-state'){
        if(m.mapMusic)stopPvpMusic();
        else if(m.phase==='build')startPvpMusic(m.preMatchTrack,m.musicStartedAt,m.fightAt,m.serverNow);
        else if(m.phase==='fight'||m.phase==='elimination')duckPvpMusic(700);
        else if(m.phase==='finished')raisePvpMusic(1200)
      }else if(m&&m.t==='battle-event'){
        if(m.mapMusic)stopPvpMusic();
        else if(m.kind==='build-start')startPvpMusic(m.preMatchTrack,m.musicStartedAt,m.fightAt,m.serverNow);
        else if(m.kind==='fight'||m.kind==='elimination')duckPvpMusic(900)
      }else if(m&&m.t==='winner')raisePvpMusic(1200);
      return prevReceive233.call(this,m)
    };
    setInterval(function(){
      var service=P.service,show=!!(P.joined&&P.mode==='digtrade'&&service&&service.mode==='digtrade');player.style.display=show?'block':'none';if(!show&&digHowl)try{digHowl.pause()}catch(e){};
      if((P.mode!=='pvp'||!P.joined)&&pvpHowl){stopPvpMusic();return}
      if(P.mode==='pvp'&&P.joined&&pvpFightAt&&pvpKey&&pvpHowl){var rem=pvpFightAt-(Date.now()+pvpOffset),duck=pvpBaseVolume*.25;if(rem<=0){pvpFightAt=0;setPvpMusicVolume(duck,0)}else if(rem<=3000){try{pvpHowl.volume(duck+(pvpBaseVolume-duck)*(rem/3000))}catch(e){}}else try{pvpHowl.volume(pvpBaseVolume)}catch(e){}}
    },100);
  }
  install233();
}());
