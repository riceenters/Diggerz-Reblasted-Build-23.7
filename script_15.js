
(function(){
  function install(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService,q=window.q,l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!q||!l){setTimeout(install,50);return}
    var proto=DS.prototype;if(proto.__release230)return;proto.__release230=true;
    var review=document.getElementById('diggerz-trade-review'),reviewList=document.getElementById('diggerz-trade-receive'),confirmBtn=document.getElementById('diggerz-trade-confirm'),backBtn=document.getElementById('diggerz-trade-back');
    function chat(s){try{if(P.service&&P.service.message)P.service.message(s)}catch(e){}}
    function nativePrompt(service,text){if(!service||!text)return;try{service.centerMessage(String(text))}catch(e){}}
    function smallPrompt(service,text){if(!service||!text)return;try{var game=service.game||l.z38;if(!game||!game._9){nativePrompt(service,text);return}for(var i=0;i<game._9.length;i++){var old=game._9[i];if(old&&old._1==='BattleSmallText'){old.a0=1;try{old.e3()}catch(_e){}}}var a=new xa(q.CENTERX,q.CENTERY-55,String(text),q.MAIN_FONT_SMALL);a._1='BattleSmallText';a.set_local_xScale(a.set_local_yScale(1.25));a.F6(5,1,0,1550);game._9.push(a)}catch(e){nativePrompt(service,text)}}
    // Build 23 map files are sparse on disk. Rebuild a complete 128x80 world locally,
    // then send only changed cells through the recovered native tile packet in manageable batches.
    proto.pvpApplyMapTransforms=function(map){
      if(!map||!l.z38||!l.z38.R39)return false;
      function applyRows(rows,layer){
        if(!Array.isArray(rows))return;
        var worldLayer=l.z38.R39[layer];if(!worldLayer||!worldLayer.r33)return;
        for(var r=0;r<rows.length;r++){
          var row=rows[r];if(!Array.isArray(row)||row.length<5)continue;
          var flags=(row[4]|0)&15;if(!flags)continue;
          var x=row[0]|0,y=row[1]|0,obj=null;
          try{obj=worldLayer.r33(x*l._44,y*l._44)}catch(_e){obj=null}
          if(!obj)continue;
          try{
            if(flags&1){var xs=Number(obj.b4);if(!isFinite(xs)||xs===0)xs=1;obj.set_local_xScale(-Math.abs(xs))}
            if(flags&2){var ys=Number(obj.b5);if(!isFinite(ys)||ys===0)ys=1;obj.set_local_yScale(-Math.abs(ys))} if(flags&8){try{if(typeof obj.set_rot==='function')obj.set_rot(-Math.PI/2);else if(typeof obj.set_rotation==='function')obj.set_rotation(-90)}catch(_rotErr){}} else if(flags&4){try{if(typeof obj.set_rot==='function')obj.set_rot(Math.PI/2);else if(typeof obj.set_rotation==='function')obj.set_rotation(90)}catch(_rotErr){}}
          }catch(_e2){}
        }
      }
      applyRows(map.backgroundTiles,2);applyRows(map.tiles,0);return true
    };
    proto.pvpApplyBaseMap=function(map){
      if((this.mode!=='pvp'&&this.mode!=='digtrade')||!map||map.format!=='diggerz-pvp-map-v1'||(map.width|0)!==128||(map.height|0)!==80||!Array.isArray(map.tiles))return false;
      var total=128*80,oldTiles=(this.state&&this.state.tiles)||[],oldVariants=(this.state&&this.state.variants)||[],oldFlags=(this.state&&this.state.mapTileFlags)||[],oldBg=(this.state&&this.state.backgroundTiles)||[],oldBgV=(this.state&&this.state.backgroundVariants)||[],oldBgF=(this.state&&this.state.mapBackgroundFlags)||[],tiles=new Array(total),variants=new Array(total),flags=new Array(total),bgTiles=new Array(total),bgVariants=new Array(total),bgFlags=new Array(total),i;
      for(i=0;i<total;i++){tiles[i]=0;variants[i]=0;flags[i]=0;bgTiles[i]=0;bgVariants[i]=0;bgFlags[i]=0}
      function loadRows(rows,toTiles,toVars,toFlags){if(!Array.isArray(rows))return;for(var r=0;r<rows.length;r++){var row=rows[r];if(!Array.isArray(row)||row.length<3)continue;var x=row[0]|0,y=row[1]|0,id=row[2]|0,v=(row[3]|0)&31,f=(row[4]|0)&15;if(x<0||x>=128||y<0||y>=80||id<=0||id>2047)continue;var at=x+y*128;toTiles[at]=id;toVars[at]=v;toFlags[at]=f}}
      loadRows(map.backgroundTiles,bgTiles,bgVariants,bgFlags);loadRows(map.tiles,tiles,variants,flags);
      var changed=[],changedBg=[];for(i=0;i<total;i++){if((oldTiles[i]||0)!==(tiles[i]||0)||(oldVariants[i]||0)!==(variants[i]||0)||(oldFlags[i]||0)!==(flags[i]||0))changed.push(i);if((oldBg[i]||0)!==(bgTiles[i]||0)||(oldBgV[i]||0)!==(bgVariants[i]||0)||(oldBgF[i]||0)!==(bgFlags[i]||0))changedBg.push(i)}
      this.state.width=128;this.state.height=80;this.state.tiles=tiles;this.state.variants=variants;this.state.mapTileFlags=flags;this.state.backgroundTiles=bgTiles;this.state.backgroundVariants=bgVariants;this.state.mapBackgroundFlags=bgFlags;this.damage={};this._pvpBaseMapName=String(map.name||'Custom Map');this._pvpBaseMapApplied=true;
      function queueLayer(service,cells,layer,ids,vars){for(var start=0;start<cells.length;start+=300){(function(batch){service.enqueue(11,1,function(packet){packet.R2(batch.length);for(var j=0;j<batch.length;j++){var n=batch[j],tx=n%128,ty=(n/128)|0;packet.R0(tx);packet.R0(layer);packet.R0(ty);packet.R2((ids[n]&2047)|((vars[n]&31)<<11))}})})(cells.slice(start,start+300))}}
      queueLayer(this,changedBg,2,bgTiles,bgVariants);queueLayer(this,changed,0,tiles,variants);
      var theme=Math.max(0,Math.min(9,map.background|0));this.enqueue(102,1,function(packet){packet.R2(theme)});
      var self=this;[0,80,220,600,1200].forEach(function(delay){setTimeout(function(){if(self&&self.pvpApplyMapTransforms)self.pvpApplyMapTransforms(map)},delay)});
      this.markDirty();return true
    };
    var releaseRoomState=proto.pvpApplyRoomState;proto.pvpApplyRoomState=function(m){if(m&&m.map&&(this.mode==='pvp'||this.mode==='digtrade'))this.pvpApplyBaseMap(m.map);return releaseRoomState.call(this,m)};
    function refreshBoard(service){try{if(l.z38&&l.z38.R37&&l.z38.R37.Z44)l.z38.R37.Z44()}catch(e){}}
    function setNameWins(e,w){try{if(e&&e.J30&&e.J30.E32)e.J30.E32.E37(String(e._1||'Player')+' ^9'+Math.max(0,w|0))}catch(_e){}} function resetScores(service){try{if(l.z39){l.z39.k31=0;setNameWins(l.z39,service&&service.state?service.state.wins|0:0)}var peers=service&&service.pvpEnsurePeers?service.pvpEnsurePeers():{};for(var k in peers){var peer=peers[k],e=service.pvpEntityForPeer(peer);if(e){e.k31=0;setNameWins(e,peer&&peer.info?peer.info.wins|0:0)}}refreshBoard(service)}catch(e){}}
    function setScore(service,cid,kills){try{var e=String(cid||'')===String(P.connectionId||'')?l.z39:(service.pvpPeerForConnection(cid)&&service.pvpEntityForPeer(service.pvpPeerForConnection(cid)));if(e)e.k31=Math.max(0,kills|0);refreshBoard(service)}catch(_e){}}
    function itemLine(service,item){item=item||{};if(!item.category||!item.count)return null;return (item.count>1?item.count+' × ':'')+service.itemName(item.category|0,item.id|0)}
    function closeReview(){if(review)review.style.display='none'}
    function showReview(service,m){if(!review||!service.pvpTrade)return;if(confirmBtn)confirmBtn.disabled=false;var items=Array.isArray(m.receive)?m.receive:[];reviewList.innerHTML='';var any=false;for(var i=0;i<items.length;i++){var line=itemLine(service,items[i]);if(!line)continue;any=true;var li=document.createElement('li');li.textContent=line;reviewList.appendChild(li)}if(!any){var li=document.createElement('li');li.textContent='Nothing';reviewList.appendChild(li)}service.pvpTrade.reviewOpen=true;service.pvpTrade.reviewToken=String(m.reviewToken||'');review.style.display='flex'}
    if(confirmBtn)confirmBtn.onclick=function(){var s=P.service,tr=s&&s.pvpTrade;if(!s||!tr||!tr.reviewOpen)return;confirmBtn.disabled=true;s.pvpSend({t:'trade-confirm',tradeId:tr.id,reviewToken:tr.reviewToken})};
    if(backBtn)backBtn.onclick=function(){var s=P.service,tr=s&&s.pvpTrade;if(tr){tr.reviewOpen=false;s.pvpSend({t:'trade-review-back',tradeId:tr.id})}closeReview()};

    // Trade remains editable until both users have reviewed the exact snapshots and confirmed.
    var prevStart=proto.pvpStartTrade;proto.pvpStartTrade=function(m){closeReview();var r=prevStart.call(this,m);if(this.pvpTrade){this.pvpTrade.locked=false;this.pvpTrade.reviewOpen=false;this.pvpTrade.reviewToken=''}return r};
    var prevOffer=proto.pvpTradeOffer;proto.pvpTradeOffer=function(){if(this.pvpTrade){this.pvpTrade.localAccepted=false;this.pvpTrade.partnerAccepted=false;this.pvpTrade.locked=false;this.pvpTrade.reviewOpen=false;closeReview()}return prevOffer.call(this)};
    var prevComplete=proto.pvpCompleteTrade;proto.pvpCompleteTrade=function(receive){closeReview();if(confirmBtn)confirmBtn.disabled=false;return prevComplete.call(this,receive)};
    var prevCancel=proto.pvpCancelTradeLocal;proto.pvpCancelTradeLocal=function(reason){closeReview();if(confirmBtn)confirmBtn.disabled=false;return prevCancel.call(this,reason)};
    // Existing first-stage handler used locked=true. Undo that immediately after it runs.
    var prevA17=proto.A17;proto.A17=function(opcode,body,c){if(opcode===170&&this.pvpTrade){if(!this.pvpTrade.localAccepted){this.pvpTrade.localAccepted=true;this.pvpTrade.locked=false;this.pvpSend({t:'trade-accept',tradeId:this.pvpTrade.id})}return}return prevA17.call(this,opcode,body,c)};
    var prevSwap=proto.swap;proto.swap=function(packet){if(this.pvpTrade)this.pvpTrade.locked=false;return prevSwap.call(this,packet)};

    // Coin drops now use the original item-drop entity and pickup animation.
    proto.pvpCoinGuid=function(id){return this.pvpTradeGuid('coin:'+String(id||''),'kill-coin')};
    proto.pvpAddCoinDrop=function(c){if(!c||!c.id)return;var id=String(c.id),guid=this.pvpCoinGuid(id),key=this.pvpGuidKey(guid);if(this.drops[key])return;var drop={guid:guid,category:1,id:0,count:1,x:+c.x||0,y:+c.y||0,text:'',tier:'coin',isCoin:true,coinId:id};this.drops[key]=drop;this.enqueue(15,1,function(packet){packet.R8(guid);packet.R4(1);packet.r8(drop.x);packet.r8(0);packet.r8(drop.y);packet.r8(drop.x);packet.r8(0);packet.r8(drop.y-.35);packet.R2(0);packet.R2(1);packet.R0(0);packet.s0(true);packet.R9('')})};
    proto.pvpRemoveCoinDrop=function(id){var guid=this.pvpCoinGuid(String(id||'')),key=this.pvpGuidKey(guid),drop=this.drops[key];if(!drop)return;delete this.drops[key];this.removeDrop(drop)};
    var prevRoom=proto.pvpApplyRoomState;proto.pvpApplyRoomState=function(m){var copy=m;if(m&&Array.isArray(m.coins)){copy=Object.assign({},m,{coins:[]})}var r=prevRoom.call(this,copy);if(m&&Array.isArray(m.coins))for(var i=0;i<m.coins.length;i++)this.pvpAddCoinDrop(m.coins[i]);return r};
    var prevPickup=proto.pickup;proto.pickup=function(packet){if((this.mode==='pvp'||this.mode==='digtrade')&&P.joined){var pos=packet.Q0,guid=packet.Q6(),key=this.pvpGuidKey(guid),drop=this.drops[key];packet.Q0=pos;if(drop&&drop.isCoin){if(this.distanceToPlayer(drop.x,drop.y)<=4)this.pvpSend({t:'coin-pickup',id:drop.coinId});return}}return prevPickup.call(this,packet)};

    // Rare-item native center text is the canonical Battle Royale prompt font.
    var prevReceive=proto.pvpReceive;proto.pvpReceive=function(m){
      if(!m)return;
      if(m.t==='trade-review'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){showReview(this,m);return}
      if(m.t==='trade-review-close'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpTrade.localAccepted=false;this.pvpTrade.partnerAccepted=false;this.pvpTrade.locked=false;this.pvpTrade.reviewOpen=false;closeReview();if(confirmBtn)confirmBtn.disabled=false;return}
      if(m.t==='trade-partner-accepted'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpTrade.partnerAccepted=true;this.pvpTrade.locked=false;var sid=this.pvpTrade.sessionGuid;this.enqueue(169,1,function(p){p.R8(sid)});return}
      if(m.t==='admin-message'){nativePrompt(this,String(m.message||''));return}
      if(m.t==='coin-spawn'){this.pvpAddCoinDrop(m.coin);return}
      if(m.t==='coin-remove'){this.pvpRemoveCoinDrop(m.id);return}
      if(m.t==='battle-event'){
        if(m.kind==='build-start'){resetScores(this);smallPrompt(this,'^1Match begins in 40 seconds. Build your defence now!')}
        else if(m.kind==='fight'){nativePrompt(this,'^1FIGHT!')}
        else if(m.kind==='shrink-warning'){smallPrompt(this,'^1World Shrink Coming!')}
        else if(m.kind==='elimination'){nativePrompt(this,'^6ELIMINATION HAS BEGUN!')}
      }
      if(m.t==='kill-confirm'){setScore(this,P.connectionId,m.kills|0)}
      if(m.t==='kill-feed'){setScore(this,m.killerConnectionId,m.kills|0)}
      if(m.t==='winner'){nativePrompt(this,'^3'+String(m.name||'Player')+' wins!');if(String(m.connectionId||'')===String(P.connectionId||'')){try{var a=new Audio('/levelup.ogg');a.volume=.8;a.play().catch(function(){})}catch(e){}}}
      return prevReceive.call(this,m)
    };

    // Native countdown font, one message per second/event, rather than Arial DOM overlays.
    var lastPrompt='';setInterval(function(){var s=P.service,b=P.battle;if(!s||P.mode!=='pvp')return;var now=Date.now()+(b.serverOffset||0),txt='';if(b.phase==='build'&&b.fightAt){var rem=Math.max(0,Math.ceil((b.fightAt-now)/1000));if(rem>3)txt='^1Match begins in '+rem+' seconds. Build your defence now!';else if(rem>0)txt='^1'+rem}else if(b.shrinkAt){var sr=Math.max(0,Math.ceil((b.shrinkAt-now)/1000));if(sr>3)txt='^1World Shrink Coming!';else if(sr>0)txt='^1'+sr}if(txt&&txt!==lastPrompt){lastPrompt=txt;smallPrompt(s,txt)}if(!txt)lastPrompt=''},250);

    // White barrier is solid: clamp local player inside it and cancel outward velocity.
    var prevTick=proto.pvpTick;proto.pvpTick=function(){var r=prevTick.call(this);if(this.mode==='pvp'&&P.mode==='pvp'&&l.z39&&(P.battle.phase==='fight'||P.battle.phase==='elimination')){var min=P.battle.left+.5,max=P.battle.right+.5,x=l.z39.b6/l._44,clamped=Math.max(min,Math.min(max,x));if(clamped!==x){try{l.z39.l38(clamped*l._44,l.z39.b7)}catch(e){l.z39.b6=clamped*l._44}try{var body=l.z39.b33.tBJ;body.wrap_vel||body.setupVelocity();if((x<min&&body.wrap_vel.tBJ.x<0)||(x>max&&body.wrap_vel.tBJ.x>0))body.wrap_vel.tBJ.x=0}catch(e){}}}return r};

    // Admin typed-name actions + rare-font announcements.
    proto.adminScreenMessage=function(text,scope){if(!this.adminIsAdminAuthorized())return {ok:false,message:'Admin authentication required.'};text=String(text||'').trim().slice(0,180);if(!text)return {ok:false,message:'Message is empty.'};scope=scope==='global'?'global':'server';if(this.mode==='pvp'||this.mode==='digtrade'){this.pvpSend({t:'admin-message',adminToken:window.DiggerzAdminSessionToken||'',scope:scope,message:text});nativePrompt(this,text)}else nativePrompt(this,text);return {ok:true,message:(scope==='global'?'Global':'This-server')+' message sent.'}};
    var baseAdminKill=proto.adminKillPlayer;proto.adminKillPlayer=function(name){return baseAdminKill.call(this,String(name||'').trim())};
    var baseAdminTeleport=proto.adminTeleportTo;proto.adminTeleportTo=function(name){name=String(name||'').trim();if(!this.adminIsAdminAuthorized())return {ok:false,message:'Admin authentication required.'};if(!name||name===this.playerName())return {ok:true,message:'You are already there.'};if((this.mode==='pvp'||this.mode==='digtrade')&&this.pvpFindPeerByName){var peer=this.pvpFindPeerByName(name),entity=peer&&this.pvpEntityForPeer(peer);if(!peer)return {ok:false,message:'Player not found.'};var tx=null,ty=null;if(entity&&entity.a2){tx=entity.b6;ty=entity.b7}else if(peer.lastX!=null&&peer.lastY!=null){tx=peer.lastX*l._44;ty=peer.lastY*l._44}else if(peer.info&&isFinite(+peer.info.x)&&isFinite(+peer.info.y)){tx=(+peer.info.x)*l._44;ty=(+peer.info.y)*l._44}if(tx==null||ty==null||!isFinite(tx)||!isFinite(ty))return {ok:false,message:name+' position is unknown.'};if(!l.z39)return {ok:false,message:'Your player is not spawned yet.'};try{l.z39.l38(tx,ty)}catch(e){l.z39.b6=tx;l.z39.b7=ty}this.state.x=tx/l._44;this.state.y=ty/l._44;try{this.pvpSendNativeMovement()}catch(_e){}return {ok:true,message:'Teleported to '+name+'.'}}return baseAdminTeleport.call(this,name)};
  }
  install();
}());
