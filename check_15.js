
(function(){
  function install230(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService,q=window.q,l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!q||!l){setTimeout(install230,50);return}
    var proto=DS.prototype;if(proto.__build230)return;proto.__build230=true;
    P.battle={phase:'waiting',fightAt:0,nextShrinkAt:0,shrinkStage:0,left:1,right:126,targetLeft:1,targetRight:126,shrinking:false,elimination:false,serverOffset:0,shrinkAt:0,localEliminated:false,resultsShown:false,lastCountdown:-1,lastBuildSecond:-1,_shrinkAppliedFor:0};
    P.coinDrops={};P._skySpawned=false;
    var banner=document.getElementById('diggerz-br-banner'),pop=document.getElementById('diggerz-br-pop'),winner=document.getElementById('diggerz-br-winner');
    var leftBar=document.getElementById('diggerz-br-left'),rightBar=document.getElementById('diggerz-br-right');
    function serverNow(){return Date.now()+(P.battle.serverOffset||0)}
    function chat(s){try{if(P.service&&P.service.message)P.service.message(s)}catch(e){}}
    function bannerText(text,color){if(!banner)return;if(!text){banner.style.display='none';return}banner.textContent=text;banner.style.color=color||'#39e7ff';banner.style.display='block'}
    function popText(text,color){if(!pop)return;pop.classList.remove('go');void pop.offsetWidth;pop.textContent=text;pop.style.color=color||'#ffe52e';pop.classList.add('go')}
    function winText(name){if(!winner)return;var text=String(name||'Player')+' wins!';winner.querySelector('.front').textContent=text;winner.querySelector('.shadow').textContent=text;winner.style.display='block';setTimeout(function(){winner.style.display='none'},2600)}
    function resetBattleUi(){bannerText('');if(winner)winner.style.display='none';if(leftBar)leftBar.style.display='none';if(rightBar)rightBar.style.display='none'}
    function stats(service){if(!service.battleStats)service.battleStats={shots:0,hits:0,kills:0};return service.battleStats}
    function existingResult(){try{var Io=window.DiggerzRuntime&&window.DiggerzRuntime.getIo();return Io&&q.GetChildByType(Io)}catch(e){return null}}
    function showResults(service,title){if(!service||P.battle.resultsShown)return;P.battle.resultsShown=true;try{var Io=window.DiggerzRuntime&&window.DiggerzRuntime.getIo();if(!Io)throw new Error('result class missing');var old=existingResult();if(old)old.a0=1;var st=stats(service);q.children.push(new Io(st.shots|0,st.hits|0,st.kills|0,title))}catch(e){service.centerMessage(title)}}
    // Build 23.0 sky spawning: y=-6 was outside the reconstructed 80-tile world
    // and could make the camera follow empty sky before the local physics body existed.
    // Spawn from the top INSIDE the world instead.  The normal player physics then
    // produces the OG fall without bypassing the client's player-creation path.
    function skySpawn(service,x,y){if(!service||!service.state)return false;var maxX=Math.max(3,(service.state.width||128)-3),sx=isFinite(x)?+x:(8+Math.random()*112),sy=isFinite(y)?+y:2;sx=Math.max(3,Math.min(maxX,sx));sy=Math.max(1,sy);service.state.x=sx;service.state.y=sy;if(!l.z39||!l.z39.b33){service._pendingSkySpawn={x:sx,y:sy};return false}try{l.z39.l38(sx*l._44,sy*l._44)}catch(e){l.z39.b6=sx*l._44;l.z39.b7=sy*l._44}try{l.z39.i32=oa.MODE_IDLE;l.z39.set_alp(1);l.z39.set_local_alp(1)}catch(e){}service._pendingSkySpawn=null;service.localDead=false;service.localHealth=l.z39.N34||3;service.deathReadyAt=0;try{if(l.z38){l.z38.s38=l.z39;l.z38.t39=l.z39.b6;l.z38.T30=l.z39.b7}}catch(e){}service.sendHealth(service.localHealth,service.localHealth);service.pvpSend({t:'respawn',x:sx,y:sy});service.pvpSendHello();if(P.connected)service.pvpSendNativeSpawn();return true}
    proto.pvpSkySpawn=function(x,y){skySpawn(this,x,y)};

    // Shared drops use the same GUID key as the recovered client's own drop table.
    proto.pvpGuidKey=function(id){try{return id&&id.q4?id.q4():[id.P4|0,id.P5|0,id.P6|0,id.P7|0].join(':')}catch(e){return ''}};
    proto.pvpAddSharedDrop=function(d){if(!d||!Array.isArray(d.guid))return;var guid=this.guidFromParts(d.guid),key=this.pvpGuidKey(guid);if(this.drops[key])return;var drop={guid:guid,category:d.category|0,id:d.id|0,count:Math.max(1,d.count|0),x:+d.x||0,y:+d.y||0,text:String(d.text||''),tier:String(d.tier||'')};this.drops[key]=drop;this.enqueue(15,1,function(packet){packet.R8(guid);packet.R4(drop.category);packet.r8(drop.x);packet.r8(0);packet.r8(drop.y);packet.r8(drop.x);packet.r8(0);packet.r8(drop.y-.35);packet.R2(drop.id);packet.R2(drop.count);packet.R0(0);packet.s0(true);packet.R9(drop.text)})};
    proto.pvpRemoveSharedDrop=function(parts){if(!Array.isArray(parts))return;var guid=this.guidFromParts(parts),key=this.pvpGuidKey(guid),drop=this.drops[key];if(!drop)return;delete this.drops[key];this.removeDrop(drop)};

    // Retry projectile rendering until the remote avatar's native spawn packet exists.
    proto.pvpEchoPeerAttack=function(m,attempt){attempt=attempt|0;var peer=this.pvpPeerForConnection(m&&m._serverFrom),entity=peer&&this.pvpEntityForPeer(peer);if(!peer||!peer.id||!entity){if(attempt<10){var self=this;setTimeout(function(){self.pvpEchoPeerAttack(m,attempt+1)},40+attempt*20)}return}var self=this;function one(tx,ty){self.enqueue(287,1,function(packet){packet.r8(+m.fromX||0);packet.r8(+m.fromY||0);packet.r8(+tx||0);packet.r8(+ty||0);packet.R0(m.attackType|0);packet.R8(peer.id)})}if((m.attackType|0)===31){var dx=m.toX-m.fromX,dy=m.toY-m.fromY,ox=-dy*.14,oy=dx*.14;one(m.toX+ox,m.toY+oy);one(m.toX,m.toY);one(m.toX-ox,m.toY-oy)}else one(m.toX,m.toY)};

    function addCoinVisual(service,c){if(!service||!c||!c.id||P.coinDrops[c.id])return;var entry={id:String(c.id),x:+c.x||0,y:+c.y||0,value:Math.max(1,c.value|0),pending:false,sprite:null};try{var R=window.DiggerzRuntime,Z=R&&R.getZ(),F=R&&R.getF();if(Z&&F&&F.COIN_PNG&&service.game){var sp=Z.I9();sp.Init(F.COIN_PNG());sp.D7(service.game);sp.b6=entry.x*l._44;sp.b7=entry.y*l._44;sp.set_local_xScale(sp.set_local_yScale(.72));sp.F6(3,.72,.94,650,true);sp.F6(4,.72,.94,650,true);service.game._9.push(sp);entry.sprite=sp}}catch(e){}P.coinDrops[entry.id]=entry}
    function removeCoinVisual(id){var c=P.coinDrops[String(id||'')];if(!c)return;try{if(c.sprite)c.sprite.a0=1}catch(e){}delete P.coinDrops[String(id||'')]}

    var oldRoomState=proto.pvpApplyRoomState;proto.pvpApplyRoomState=function(m){var r=oldRoomState.call(this,m);if(m&&Array.isArray(m.coins))for(var i=0;i<m.coins.length;i++)addCoinVisual(this,m.coins[i]);return r};
    var oldReceive=proto.pvpReceive;proto.pvpReceive=function(m){
      if(!m)return;
      if(m.t==='battle-state'){var b=P.battle;b.serverOffset=(+m.serverNow||Date.now())-Date.now();b.phase=String(m.phase||b.phase);b.fightAt=+m.fightAt||0;b.nextShrinkAt=+m.nextShrinkAt||0;b.shrinkStage=m.shrinkStage|0;if(isFinite(+m.left)&&isFinite(+m.right)){var nl=+m.left,nr=+m.right;if(Math.abs(nl-b.left)>0.05||Math.abs(nr-b.right)>0.05){b.targetLeft=nl;b.targetRight=nr;b.shrinking=true;b._shrinkAnimStartedAt=0;b._shrinkFromLeft=b.left;b._shrinkFromRight=b.right}else{b.left=nl;b.right=nr;b.targetLeft=nl;b.targetRight=nr}}if(isFinite(+m.nextLeft))b.nextShrinkLeft=+m.nextLeft;if(isFinite(+m.nextRight))b.nextShrinkRight=+m.nextRight;b.elimination=!!m.elimination;if(b.phase==='finished')bannerText('');return}
      if(m.t==='battle-event'){
        if(m.kind==='build-start'){try{restoreWorldSnapshot(this)}catch(e){}P.battle.phase='build';P.battle.fightAt=+m.fightAt||P.battle.fightAt;P.battle.lastCountdown=-1;P.battle.resultsShown=false;P.battle.left=1;P.battle.right=126;P.battle.targetLeft=1;P.battle.targetRight=126;P.battle.shrinking=false;P.battle.shrinkStage=0;P.battle.shrinkAt=0;P.battle._shrinkAppliedFor=0;P.battle.elimination=false;P.battle._tileSnap=null;P.battle._varSnap=null;stats(this).shots=stats(this).hits=stats(this).kills=0}
        else if(m.kind==='fight'){P.battle.phase='fight';P.battle.shrinkAt=0;P.battle.left=1;P.battle.right=126;P.battle.targetLeft=1;P.battle.targetRight=126;P.battle.shrinking=false;P.battle.shrinkStage=0;P.battle._shrinkAppliedFor=0;bannerText('');popText('FIGHT!','#ff2f39')}
        else if(m.kind==='shrink-warning'){P.battle.shrinkAt=+m.shrinkAt||0;P.battle.lastCountdown=-1;P.battle._shrinkAppliedFor=0;bannerText('World Shrink Coming!','#39e7ff')}
        else if(m.kind==='shrink'){P.battle.shrinkAt=0;P.battle.targetLeft=isFinite(+m.left)?+m.left:P.battle.left;P.battle.targetRight=isFinite(+m.right)?+m.right:P.battle.right;P.battle.shrinkStage=m.stage|0;P.battle.shrinking=true;P.battle._shrinkAnimStartedAt=0;P.battle._shrinkFromLeft=P.battle.left;P.battle._shrinkFromRight=P.battle.right;P.battle._shrinkAppliedFor=0;bannerText('');try{if(!P.battle._tileSnap&&this.state&&this.state.tiles){P.battle._tileSnap=this.state.tiles.slice(0);P.battle._varSnap=(this.state.variants||[]).slice(0)}}catch(e){}}
        else if(m.kind==='elimination'){P.battle.elimination=true;P.battle.phase='elimination';chat('^6ELIMINATION HAS BEGUN!')}
        return
      }
      if(m.t==='fire-blocked'){chat("^9You can't shoot until the match starts!");return}
      if(m.t==='freedig-fire-blocked'){chat("^9PvP is off in free dig! No fighting!");return}
      if(m.t==='aim'){var peer=this.pvpPeerForConnection(m._serverFrom),e=peer&&this.pvpEntityForPeer(peer);if(e&&e.M37)try{e.M37((+m.x||0)*l._44,(+m.y||0)*l._44);e.e0()}catch(_e){}return}
      if(m.t==='hit-confirm'){stats(this).hits++;return}
      if(m.t==='kill-confirm'){stats(this).kills=Math.max(stats(this).kills,m.kills|0);return}
      if(m.t==='kill-feed'){chat('^7'+String(m.killerName||'Player')+' ^9['+(m.kills|0)+'] ^1> ^7'+String(m.victimName||'Player'));return}
      if(m.t==='players-remaining'){chat('^3Players remaining: ^2'+Math.max(0,m.count|0));return}
      if(m.t==='force-respawn'){P.battle.localEliminated=false;P.battle.resultsShown=false;skySpawn(this,+m.x,+m.y);return}
      if(m.t==='eliminated'){P.battle.localEliminated=true;P.battle.elimination=true;var self=this;setTimeout(function(){showResults(self,'^1Eliminated!')},1700);return}
      if(m.t==='coin-spawn'){addCoinVisual(this,m.coin);return}
      if(m.t==='coin-remove'){removeCoinVisual(m.id);return}
      if(m.t==='coin-award'){var amount=Math.max(1,m.amount|0);this.state.coins=Math.max(0,(this.state.coins||0)+amount);this.sendCoins();this.markDirty();this.save(true);chat('^9You have '+this.state.coins+' coins.');return}
      if(m.t==='winner'){winText(m.name);if(String(m.connectionId||'')===String(P.connectionId||'')){var self=this;stats(this).kills=Math.max(stats(this).kills,m.kills|0);setTimeout(function(){showResults(self,'^3You won!')},1900)}return}
      if(m.t==='player-joined'){
        // Everyone including the joiner sees the same single line.
        chat('^2'+String(m.name||m._serverName||'Player')+'^7 is now here.');
        return
      }
      if(m.t==='welcome-message'){
        // Suppressed — join chat is the only presence line.
        return
      }
      if(m.t==='hello'){
        // Always silent. Join chat comes only from player-joined for others.
        var saved=this.message;this.message=function(){};try{oldReceive.call(this,m)}finally{this.message=saved}
        return
      }
      if(m.t==='peer-left'){
        var gone=this.pvpPeerForConnection(m.connectionId),name=String(gone&&gone.name||m.name||'Player'),saved2=this.message;this.message=function(){};try{oldReceive.call(this,m)}finally{this.message=saved2}
        // Single exit message for everyone.
        chat('^1'+name+' has exited this area.');
        return
      }
      return oldReceive.call(this,m)
    };

    // Server-authoritative projectile blast notification. Old client hit guesses are ignored by 23.0 server.
    var previousImpact=proto.weaponImpactDamage;proto.weaponImpactDamage=function(x,y,impactType){var r=previousImpact.call(this,x,y,impactType);if(this.mode==='pvp'&&P.mode==='pvp'&&(P.battle.phase==='fight'||P.battle.phase==='elimination'))this.pvpSend({t:'impact',x:+x||0,y:+y||0,impactType:impactType|0});return r};

    // Build 23.0 weapon gates. Free Dig is non-combat, while Battle Royale
    // keeps weapons locked during the defense phase. Mining/digging attacks
    // remain available in both modes.
    var previousA17=proto.A17;proto.A17=function(opcode,body,c){
      if(opcode===287&&(this.mode==='pvp'||this.mode==='digtrade')){
        var attackType=-1,pos=body&&body.Q0;
        try {
          // K._16 hands A17 a packet whose cursor is already at the END because
          // it was just written. Read from byte 0, then restore the writer cursor.
          if(body) body.Q0=0;
          body.Q4();body.Q4();body.Q4();body.Q4();attackType=body.r1()
        } catch(e) { attackType=-1 }
        finally { try{if(body)body.Q0=pos}catch(_e){} }
        var held=null;try{held=l.z39&&l.z39.n38&&l.z39.n38.B30?l.z39.n38.B30[l.z39.n38.q43]:null}catch(_heldErr){}
        // T40 is the recovered tool/mining gear path (Pickaxe and related gear).
        // Keep the legacy mining impact codes too, since physics tools can report them.
        var mining=!!(held&&held.T40)||attackType===25||attackType===21||attackType===36||attackType===40;
        if(P.mode==='digtrade'&&!mining){
          var adminPvp=!!(this.adminPvpEnabled||(typeof q!=='undefined'&&q.diggerzAdminPvpEnabled));
          if(!adminPvp){
            if(!this._freeDigFireBlockAt||Date.now()-this._freeDigFireBlockAt>700){
              this._freeDigFireBlockAt=Date.now();
              chat("^9PvP is off in free dig! No fighting!")
            }
            return
          }
        }
        if(P.mode==='pvp'&&!mining&&(P.battle.phase!=='fight'&&P.battle.phase!=='elimination')){
          if(!this._fireBlockAt||Date.now()-this._fireBlockAt>700){this._fireBlockAt=Date.now();chat("^9You can't shoot until the match starts!")}
          return
        }
        if(P.mode==='pvp'&&!mining)stats(this).shots++
      }
      return previousA17.call(this,opcode,body,c)
    };

    // No result screen before elimination: die, fall from the sky, keep fighting.
    var normalShowDeath=proto.showLocalDeath;proto.showLocalDeath=function(source){
      if(this.mode==='pvp'&&P.mode==='pvp'){
        try{if(l.z39)l.z39.l34()}catch(e){}
        this.deathReadyAt=Date.now()+1700;
        if(P.battle.elimination){var self=this;setTimeout(function(){showResults(self,'^1Eliminated!')},1650)}
        return
      }
      return normalShowDeath.call(this,source)
    };

    // Continuously send server position + mouse aim, and keep the camera on YOU.
    proto.pvpTick=function(){
      if(!(this.mode==='pvp'||this.mode==='digtrade')||!P.joined||!l.z39)return;if(!P.service)P.attach(this);
      try{if(!this.localDead&&l.z38){l.z38.s38=l.z39;l.z38.t39=l.z39.b6;l.z38.T30=l.z39.b7}}catch(e){}
      if(this.ticks%3===0){
        var x=l.z39.b6/l._44,y=l.z39.b7/l._44;this.pvpSend({t:'state',x:x,y:y});
        try{var game=this.game||l.z38,wx=(q.mX-game.A7)/(game.a8||1)/l._44,wy=(q.mY-game.A8)/(game.a9||1)/l._44;if(isFinite(wx)&&isFinite(wy))this.pvpSend({t:'aim',x:wx,y:wy})}catch(e){}
        if(P.connected&&!this.localDead)this.pvpSendNativeMovement()
      }
      if(this.mode==='pvp'){
        var b=P.battle;/* Build 23.0: solid white shrink barriers clamp movement instead of damaging through a red zone. */
        if(!this.localDead&&!P.battle.localEliminated)for(var id in P.coinDrops){var coin=P.coinDrops[id];if(!coin.pending&&Math.hypot(x-coin.x,y-coin.y)<=1.6){coin.pending=true;this.pvpSend({t:'coin-pickup',id:id})}}
      }
    };

    // First entry into either multiplayer mode starts near the top of the map,
    // matching OG Diggerz.  IMPORTANT: put the coordinates in the spawn packet
    // BEFORE the recovered client creates l.z39.  Teleporting l.z39 afterward was
    // the Build 22.17 bug that could leave only the camera in the sky.
    var currentSendPlayer=proto.sendPlayer;proto.sendPlayer=function(){if((this.mode==='pvp'||this.mode==='digtrade')&&!this._skyEntryDone){this._skyEntryDone=true;var sx=8+Math.random()*112;if(this.state){var maxX=Math.max(3,(this.state.width||128)-3);this.state.x=Math.max(3,Math.min(maxX,sx));this.state.y=2}}return currentSendPlayer.call(this)};

    function shrinkStages(){return [{left:12,right:115},{left:24,right:103},{left:36,right:91},{left:48,right:79},{left:56,right:71},{left:60,right:67}];}
    function applyShrinkStage(stage){
      var b=P.battle, stages=shrinkStages(), idx;
      if((stage|0)<=0) idx=0; else idx=Math.min(stages.length-1,(stage|0)-1);
      if(b.shrinkStage>0) idx=Math.min(stages.length-1,b.shrinkStage);
      var s=stages[idx];
      b.targetLeft=s.left; b.targetRight=s.right; b.shrinking=true; b._shrinkAnimStartedAt=0; b._shrinkFromLeft=b.left; b._shrinkFromRight=b.right; b.shrinkStage=idx+1;
    }
    function hideDomBars(){
      // overlays are intentional (blue danger fill + edge lines). do not force-hide.
      var st=document.getElementById('diggerz-hide-dom-br-style');
      if(st&&st.parentNode)st.parentNode.removeChild(st);
    }
    // Glowing BR border = same technique as the real map-end sparks (S34/S35):
    // SPARK_PNG entities with looping alpha pulse, positioned at safe-zone edges.
    // No DOM. Outside tiles only fade (never deleted).
    function hideDomBars(){
      ['diggerz-br-left','diggerz-br-right','diggerz-br-left-fill','diggerz-br-right-fill'].forEach(function(id){
        var el=document.getElementById(id); if(el){el.style.display='none';el.style.visibility='hidden'}
      });
      if(!document.getElementById('diggerz-hide-dom-br-style')){
        var st=document.createElement('style'); st.id='diggerz-hide-dom-br-style';
        st.textContent='#diggerz-br-left,#diggerz-br-right,.diggerz-br-border{display:none!important;visibility:hidden!important;opacity:0!important}';
        document.head.appendChild(st);
      }
    }
    function fx(){
      return {
        z: (typeof z!=='undefined'?z:window.DiggerzZ),
        f: (typeof f!=='undefined'?f:window.DiggerzF),
        E: (typeof E!=='undefined'?E:window.DiggerzE),
        spark: (window.DiggerzSparkPNG||null),
        white: (window.DiggerzWhiteParticlePNG||null)
      };
    }
    function killNativeEdges(){
      var b=P.battle; if(!b)return;
      ['nativeLeft','nativeRight','nativeLeft2','nativeRight2'].forEach(function(k){
        try{
          if(b[k]){
            try{ if(b[k].set_local_alp) b[k].set_local_alp(0); }catch(_e){}
            try{ b[k].a0=1; }catch(_e){}
            b[k]=null;
          }
        }catch(e){}
      });
    }
    // BR border lines + transparent outside tiles.
    // The old-style effect is recreated by fading every terrain tile outside
    // the current safe-zone bounds. The white lines sit on the OUTSIDE FACES
    // of the boundary blocks:
    //   left  = right face of left boundary block
    //   right = left face of right boundary block
    function makeGlowEdge(worldX){
      var F=fx(), Z=F.z;
      if(!Z||!Z.I9)return null;
      var initFn = window.DiggerzFillRectPNG || (F.f && F.f.FILLRECT_PNG) || window.DiggerzSparkPNG || (F.f && F.f.SPARK_PNG) || F.spark;
      if(!initFn)return null;
      try{
        var e=Z.I9(), sheet=F.f||window.DiggerzF;
        var bmp=(typeof initFn==='function') ? initFn.call(sheet) : initFn;
        e.Init(bmp);
        if(l.z38)e.D7(l.z38);
        e.b6=worldX;e.b7=0;
        var tile=l._44||32, mapH=(P.service&&P.service.state?P.service.state.height:80)*tile;
        try{e.set_local_xScale(1.7);e.set_local_yScale(mapH/3)}catch(_e){}
        try{e.set_local_r(1);e.set_local_g(1);e.set_local_b(1);e.set_local_alp(1);if(e.set_alp)e.set_alp(1)}catch(_e){}
        try{e.a0=0;e.B8=3;e.c2=true}catch(_e){}
        try{if(l.z38&&l.z38._9)l.z38._9.push(e)}catch(_e){}
        e._diggerzBorderBar=true;
        return e;
      }catch(err){return null}
    }
    // ================================================================
    // BORDER LINE POSITION CONTROLS (PIXELS)
    // Change ONLY these two numbers to place the white lines exactly where
    // you want them. Positive = move right, negative = move left.
    // The collision boundary uses these exact same pixel positions.
    // ================================================================
    // Keep each line locked to the actual edge between faded and safe blocks.
    // These are optional fine-tuning offsets; 0 means exactly on that edge.
    var BORDER_LINE_LEFT_PX  = -32;
    var BORDER_LINE_RIGHT_PX = -32;
    window.DiggerzBorderLinePosition = {
      left: function(){ return BORDER_LINE_LEFT_PX; },
      right: function(){ return BORDER_LINE_RIGHT_PX; },
      setLeft: function(v){ BORDER_LINE_LEFT_PX=+v||0; },
      setRight: function(v){ BORDER_LINE_RIGHT_PX=+v||0; }
    };
    function edgeWorldX(tileCoord,which){
      var tile=l._44||32, v=+tileCoord;
      // Snap to the edge of the actual tile being faded. During the 550ms
      // interpolation b.left/right are fractional, but the terrain itself is
      // still made of whole blocks. Using ceil/floor keeps the white line on
      // the block edge instead of drifting into a block after the countdown.
      var base;
      if(which==='left'){
        base=Math.ceil(v)*tile;
        return base + BORDER_LINE_LEFT_PX;
      }else{
        base=(Math.floor(v)+1)*tile;
        return base + BORDER_LINE_RIGHT_PX;
      }
    }
    function slowPulseAlpha(){
      var phase=(Date.now()%2000)/2000;
      var a=phase<0.5?(1-phase*2):((phase-0.5)*2);
      return a*a*(3-2*a);
    }
    function setAlp(e,a){
      if(!e)return;
      a=Math.max(0,Math.min(1,+a));
      try{if(e.set_local_alp)e.set_local_alp(a)}catch(_e){}
      try{if(e.set_alp)e.set_alp(a)}catch(_e){}
    }
    function fadeWorldOutsideBounds(service,left,right){
      if(!service||!service.state||!l.z38||!l.z38.R39)return 0;
      left=+left||0; right=+right||0;
      var w=service.state.width|0, h=service.state.height|0, tile=l._44||32;
      var layer=l.z38.R39[l._46!=null?l._46:0];
      if(!layer||!layer.r33)return 0;
      var changed=0;
      for(var x=0;x<w;x++){
        var outside=(x<left)||(x>right);
        var aa=outside?0.30:1;
        for(var y=0;y<h;y++){
          try{
            var ent=layer.r33(x*tile,y*tile);
            if(!ent)continue;
            setAlp(ent,aa);
            if(ent._9)for(var i=0;i<ent._9.length;i++)setAlp(ent._9[i],aa);
            changed++;
          }catch(_e){}
        }
      }
      return changed;
    }
    function carveWorldToBounds(service,left,right){return fadeWorldOutsideBounds(service,left,right)}
    function killNativeEdges(){
      var b=P.battle;if(!b)return;
      ['nativeLeft','nativeRight'].forEach(function(k){
        try{if(b[k]){setAlp(b[k],0);b[k].a0=1;b[k]=null}}catch(_e){}
      });
    }
    function ensureGlowEdges(service){
      var b=P.battle;
      if(!b||!service||service.mode!=='pvp')return;
      if(!(b.phase==='fight'||b.phase==='elimination'||b.shrinking||b.shrinkAt)){killNativeEdges();return}
      var tile=l._44||32, lx=edgeWorldX(b.left,'left'), rx=edgeWorldX(b.right,'right');
      if(!b.nativeLeft)b.nativeLeft=makeGlowEdge(lx);
      if(!b.nativeRight)b.nativeRight=makeGlowEdge(rx);
      var pulse=slowPulseAlpha();
      var mapH=(service.state?service.state.height:80)*tile;
      function place(ent,x){
        if(!ent)return;
        try{ent.b6=x;ent.b7=0;ent.a0=0;ent.B8=3}catch(_e){}
        try{ent.set_local_xScale(1.7);ent.set_local_yScale(mapH/3)}catch(_e){}
        try{ent.set_local_r(1);ent.set_local_g(1);ent.set_local_b(1);setAlp(ent,pulse)}catch(_e){}
      }
      place(b.nativeLeft,lx);place(b.nativeRight,rx);
    }
    function bHasSnapshot(){return false}
    function restoreWorldSnapshot(service){
      if(!service||!service.state)return;
      try{fadeWorldOutsideBounds(service,0,(service.state.width|0)-1)}catch(_e){}
      killNativeEdges();
    }
    function flashWorldEdge(service,left,right,on){if(on)ensureGlowEdges(service)}
    function pulseEdgeLine(service,left,right){ensureGlowEdges(service)}
    function stepBorderAnim(service){
      var b=P.battle;
      if(!b)return;
      hideDomBars();
      if(!(service&&service.mode==='pvp'&&(b.phase==='fight'||b.phase==='elimination'||b.shrinking||b.shrinkAt))){
        killNativeEdges();
        try{if(service&&service.state)fadeWorldOutsideBounds(service,0,(service.state.width|0)-1)}catch(e){}
      }
      if(!b.shrinking){
        // During the countdown, leave the barrier at the current world edge.
        // Once shrinking actually begins, the next render uses the new bounds.
        if(service&&service.mode==='pvp'&&(b.phase==='fight'||b.phase==='elimination'||b.shrinkAt)){
          try{fadeWorldOutsideBounds(service,b.left,b.right);ensureGlowEdges(service)}catch(e){}
        }
        return;
      }
      var now=Date.now();
      if(!b._shrinkAnimStartedAt){
        b._shrinkAnimStartedAt=now;
        b._shrinkFromLeft=b.left;
        b._shrinkFromRight=b.right;
      }
      var t=Math.min(1,(now-b._shrinkAnimStartedAt)/550);
      t=t*t*(3-2*t);
      var startL=isFinite(b._shrinkFromLeft)?b._shrinkFromLeft:b.left;
      var startR=isFinite(b._shrinkFromRight)?b._shrinkFromRight:b.right;
      b.left=startL+(b.targetLeft-startL)*t;
      b.right=startR+(b.targetRight-startR)*t;
      // Render the transparent terrain and white lines from the SAME bounds used
      // by the shrink animation. This is the important part: the correction starts
      // on the first frame of the shrink, immediately after the countdown.
      try{fadeWorldOutsideBounds(service,b.left,b.right);ensureGlowEdges(service)}catch(e){}
      if(t>=1){b.left=b.targetLeft;b.right=b.targetRight;b.shrinking=false;b._shrinkAnimStartedAt=0;b._shrinkFromLeft=0;b._shrinkFromRight=0;
        try{fadeWorldOutsideBounds(service,b.left,b.right);ensureGlowEdges(service)}catch(e){}
      }
    }

    function countdownUi(){
      hideDomBars();
      var b=P.battle, now=serverNow(), service=P.service;
      if(P.mode!=='pvp'){resetBattleUi();return}
      if(b.phase==='build'&&b.fightAt){
        var rem=Math.max(0,Math.ceil((b.fightAt-now)/1000));
        if(rem>3){bannerText('Match begins in '+rem+' seconds. Build your defence now!','#39e7ff');b.lastCountdown=-1}
        else if(rem>0){bannerText('');if(rem!==b.lastCountdown){b.lastCountdown=rem;popText(String(rem),'#ffe52e')}}
        else bannerText('');
      }
      if(b.shrinkAt){
        var sr=Math.max(0,Math.ceil((b.shrinkAt-now)/1000));
        if(sr>3)bannerText('World Shrink Coming!','#39e7ff');
        else if(sr>0){
          bannerText('World Shrink Coming!','#39e7ff');
          if(sr!==b.lastCountdown){b.lastCountdown=sr;popText(String(sr),'#ffe52e')}
          // Flash the real world-edge columns white during 3-2-1.
          try{flashWorldEdge(service,b.left,b.right,true)}catch(e){}
        }
        if(now>=b.shrinkAt && b._shrinkAppliedFor!==b.shrinkAt){
          b._shrinkAppliedFor=b.shrinkAt;
          b.shrinkAt=0;b.lastCountdown=-1;bannerText('');
          if(isFinite(+b.nextShrinkLeft)&&isFinite(+b.nextShrinkRight)){
            b.targetLeft=+b.nextShrinkLeft;b.targetRight=+b.nextShrinkRight;b.shrinking=true;b._shrinkAnimStartedAt=0;b._shrinkFromLeft=b.left;b._shrinkFromRight=b.right;
          }else{
            applyShrinkStage((b.shrinkStage|0)+1);
          }
          try{fadeWorldOutsideBounds(service,b.left,b.right)}catch(e){}
          popText('SHRINK!','#ffe52e');
        }
      }
      if(!b.shrinkAt&&b.nextShrinkAt&&(b.phase==='fight'||b.phase==='elimination')&&now<=b.nextShrinkAt+50){
        var nr=Math.max(0,Math.ceil((b.nextShrinkAt-now)/1000));
        if(nr>0&&nr<=3&&nr!==b.lastCountdown){b.lastCountdown=nr;popText(String(nr),'#ffe52e');try{flashWorldEdge(service,b.left,b.right,true)}catch(e){}}
        if(now>=b.nextShrinkAt && b._shrinkAppliedFor!==b.nextShrinkAt){
          b._shrinkAppliedFor=b.nextShrinkAt;b.nextShrinkAt=0;
          applyShrinkStage((b.shrinkStage|0)+1);bannerText('');
          try{fadeWorldOutsideBounds(service,b.left,b.right)}catch(e){}
          popText('SHRINK!','#ffe52e');
        }
      }
      try{stepBorderAnim(service)}catch(e){}
    }
    setInterval(countdownUi,100);

    window.DiggerzBattlePlayAgain=function(){resetBattleUi();P.battle.resultsShown=false;P.battle.localEliminated=false;P.intentionalClose=true;P.requested=false;try{if(P.socket)P.socket.close(1000,'play again')}catch(e){}P.socket=null;P.connected=false;P.joined=false;P.room='';P.connectionId='';P.service=null;P.queue=[];P.nativeQueue=[];P.mode='pvp';try{l.A45=false;l.A46=false;q.diggerzPvpRequested=true;q.diggerzPeerMode='pvp';q.diggerzDigTradeRequested=false;q.diggerzShopRequested=false;q.InitMainGame()}catch(e){q.InitTitleScreen()}};
    window.DiggerzBattleEquip=function(){resetBattleUi();P.intentionalClose=true;P.requested=false;try{if(P.socket)P.socket.close(1000,'equip')}catch(e){}P.socket=null;P.connected=false;P.joined=false;P.service=null;try{l.A45=true;l.A46=false;q.diggerzPvpRequested=false;q.diggerzShopRequested=true;q.InitMainGame()}catch(e){q.InitTitleScreen()}};
    window.DiggerzBattleExit=function(){resetBattleUi();P.intentionalClose=true;P.requested=false;try{if(P.socket)P.socket.close(1000,'exit')}catch(e){}P.socket=null;P.connected=false;P.joined=false;P.service=null;q.InitTitleScreen()};
    try{var Io=window.DiggerzRuntime&&window.DiggerzRuntime.getIo();if(Io&&Io.prototype){var oldEquip=Io.prototype.a53;Io.prototype.a53=function(){if(P.mode==='pvp'&&window.DiggerzBattleEquip)return window.DiggerzBattleEquip();return oldEquip.call(this)}}}catch(e){}
  }
  install230();
}());
