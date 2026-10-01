
(function(){
  function install231(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService,q=window.q,l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!q||!l){setTimeout(install231,50);return}
    var proto=DS.prototype;if(proto.__build231)return;proto.__build231=true;
    var ACCOUNT_KEY='diggerz.resurrection.accounts.v1',BOUND_KEY='diggerz.resurrection.boundEmail.v1';
    var speaker={state:null,serverOffset:0,audios:[],track:-1,volume:0,lastTint:null};
    var leftFill=document.createElement('div'),rightFill=document.createElement('div');
    leftFill.id='diggerz-br-left-fill';rightFill.id='diggerz-br-right-fill';document.body.appendChild(leftFill);document.body.appendChild(rightFill);
    var css=document.createElement('style');css.id='diggerz-build231-style';css.textContent=`
      #diggerz-diagnostics{display:none!important}
      .diggerz-br-border{background:rgba(255,255,255,.95)!important;box-shadow:none!important;width:2px!important}
      #diggerz-br-left,#diggerz-br-right{display:none;position:fixed;z-index:2147482400;pointer-events:none;width:2px;background:rgba(255,255,255,0.95);box-shadow:none;transition:none}
      #diggerz-br-left-fill,#diggerz-br-right-fill{display:none;position:fixed;z-index:2147482399;pointer-events:none;background:rgba(40,140,255,.22)}
      #diggerz-trade-review{font-family:Arial,sans-serif!important;background:rgba(0,0,0,.55)!important}
      #diggerz-trade-review .box{width:min(520px,calc(100vw - 30px))!important;background:linear-gradient(#4a4a4a,#232323)!important;border:4px solid #d4d4d4!important;border-radius:2px!important;box-shadow:inset 0 0 0 2px #111,0 8px 0 #111,0 15px 35px #000!important;padding:14px!important;text-align:center!important}
      #diggerz-trade-review h2{margin:3px 0 14px!important;color:#ff3434!important;text-shadow:2px 2px 0 #111!important;font-size:23px!important}
      #diggerz-trade-receive{list-style:none!important;padding:0!important;margin:8px auto 17px!important;display:flex!important;gap:12px!important;justify-content:center!important;min-height:94px!important}
      #diggerz-trade-receive .trade-review-slot{width:116px;height:88px;box-sizing:border-box;background:linear-gradient(#858585,#4c4c4c);border:3px solid #d7d7d7;box-shadow:inset 0 0 0 3px #262626;display:flex;align-items:center;justify-content:center;padding:5px;color:white;text-shadow:1px 2px #111;font-weight:bold;font-size:13px;overflow:hidden}
      #diggerz-trade-review .warn{display:none!important}
      #diggerz-trade-review .row{justify-content:center!important;gap:20px!important}
      #diggerz-trade-review button{min-width:125px!important;border:3px solid #eee!important;border-radius:2px!important;box-shadow:inset 0 0 0 2px rgba(0,0,0,.45),0 4px 0 #111!important;color:#fff!important;text-shadow:2px 2px #111!important;font-size:17px!important;padding:9px 14px!important}
      #diggerz-trade-confirm{background:linear-gradient(#f2c92e,#a77900)!important}
      #diggerz-trade-back{background:linear-gradient(#e34848,#8f1717)!important}
      .diggerz-turret-tracer{position:fixed;height:3px;transform-origin:0 50%;pointer-events:none;z-index:2147482300;background:#fff7a8;box-shadow:0 0 5px #ffca38;opacity:.95;transition:opacity .16s linear}
    `;document.head.appendChild(css);

    var review=document.getElementById('diggerz-trade-review'),reviewList=document.getElementById('diggerz-trade-receive'),confirmBtn=document.getElementById('diggerz-trade-confirm'),cancelBtn=document.getElementById('diggerz-trade-back');
    if(review){var h=review.querySelector('h2');if(h)h.textContent='You will get these items.';if(confirmBtn)confirmBtn.textContent='Comfirm';if(cancelBtn)cancelBtn.textContent='Cancel'}

    function chat(service,text){try{service.message(text)}catch(e){}}
    function refreshBoard(service){try{var board=service&&service.game&&service.game.f4?service.game.f4(window.Ao):null;if(board&&board.Z44)board.Z44()}catch(e){}}
    function nameWins(e,w){try{if(e&&e.J30&&e.J30.E32)e.J30.E32.E37(String(e._1||'Player')+' ^9'+Math.max(0,w|0))}catch(_e){}} function applyWins(service){try{if(service&&l.z39)nameWins(l.z39,service.state.wins|0);refreshBoard(service)}catch(e){}}
    function setRemoteWins(service,cid,wins){try{var peer=service.pvpPeerForConnection(cid),e=peer&&service.pvpEntityForPeer(peer);if(peer&&peer.info)peer.info.wins=Math.max(0,wins|0);if(e)nameWins(e,wins);refreshBoard(service)}catch(err){}}
    function smallPrompt(service,text){
      if(!service||!text)return;
      try{
        var game=service.game||l.z38;if(!game||!game._9){service.centerMessage(text);return}
        for(var i=0;i<game._9.length;i++){var old=game._9[i];if(old&&old._1==='BattleSmallText'){old.a0=1;try{old.e3()}catch(e){}}}
        var a=new xa(q.CENTERX,q.CENTERY-55,String(text),q.MAIN_FONT_SMALL);a._1='BattleSmallText';a.set_local_xScale(a.set_local_yScale(1.25));a.F6(5,1,0,1550);game._9.push(a)
      }catch(e){try{service.centerMessage(text)}catch(_e){}}
    }
    function reviewItemName(service,item){item=item||{};if(!item.category||!item.count)return 'Empty';var name='Item';try{name=service.itemName(item.category|0,item.id|0)}catch(e){}return (item.count>1?item.count+' × ':'')+name}
    function showTradeReview(service,m){
      if(!review||!reviewList||!service.pvpTrade)return;
      reviewList.innerHTML='';var items=Array.isArray(m.receive)?m.receive:[];
      for(var i=0;i<3;i++){var d=document.createElement('div');d.className='trade-review-slot';d.textContent=reviewItemName(service,items[i]);reviewList.appendChild(d)}
      service.pvpTrade.reviewOpen=true;service.pvpTrade.reviewToken=String(m.reviewToken||'');if(confirmBtn)confirmBtn.disabled=false;review.style.display='flex'
    }
    function closeTradeReview(){if(review)review.style.display='none';if(confirmBtn)confirmBtn.disabled=false}
    if(confirmBtn)confirmBtn.onclick=function(){var s=P.service,tr=s&&s.pvpTrade;if(!s||!tr||!tr.reviewOpen)return;confirmBtn.disabled=true;s.pvpSend({t:'trade-confirm',tradeId:tr.id,reviewToken:tr.reviewToken})};
    if(cancelBtn)cancelBtn.onclick=function(){var s=P.service,tr=s&&s.pvpTrade;if(tr){tr.reviewOpen=false;s.pvpSend({t:'trade-review-back',tradeId:tr.id})}closeTradeReview()};

    function canvasTransform(service,x,y){
      try{var game=service.game||l.z38,canvas=document.querySelector('#openfl-content canvas'),r=canvas?canvas.getBoundingClientRect():{left:0,top:0,width:q.SCREENWIDTH,height:q.SCREENHEIGHT};var sx=r.width/(q.SCREENWIDTH||r.width||1),sy=r.height/(q.SCREENHEIGHT||r.height||1);return {x:r.left+(game.A7+x*l._44*(game.a8||1))*sx,y:r.top+(game.A8+y*l._44*(game.a9||1))*sy,rect:r}}catch(e){return null}
    }
    function renderBarrier(service){ hideDomBars(); }
    function audioFor(i){if(!speaker.audios[i]){var a=new Audio('/music_theme'+(i?i+1:'')+'.ogg');a.preload='auto';speaker.audios[i]=a}return speaker.audios[i]}
    function stopSpeaker(){for(var i=0;i<speaker.audios.length;i++)if(speaker.audios[i]){speaker.audios[i].pause();speaker.audios[i].volume=0}speaker.track=-1;speaker.volume=0}
    function setSpeakerState(m){speaker.state=m&&m.speaker?Object.assign({},m.speaker):null;speaker.serverOffset=(+m.serverNow||Date.now())-Date.now();if(!speaker.state||!speaker.state.on)stopSpeaker()}
    function findTileEntity(x,y){try{if(l.z38&&l.z38.R39&&l.z38.R39[l._46])return l.z38.R39[l._46].r33(x*l._44,y*l._44)}catch(e){}return null}
    function tintSpeaker(state,on){var ent=state&&findTileEntity(state.x|0,state.y|0);if(!ent)return;var phase=Date.now()/430,r=.5+.5*Math.sin(phase),g=.5+.5*Math.sin(phase+2.094),b=.5+.5*Math.sin(phase+4.188);if(!on)r=g=b=1;var targets=[ent];if(ent._9)for(var i=0;i<ent._9.length;i++)targets.push(ent._9[i]);for(i=0;i<targets.length;i++){var t=targets[i];try{if(t.set_local_r)t.set_local_r(r);if(t.set_local_g)t.set_local_g(g);if(t.set_local_b)t.set_local_b(b)}catch(e){}}}
    function tickSpeaker(service){
      var st=speaker.state;if(!st){return}tintSpeaker(st,!!st.on);if(!st.on||!l.z39){stopSpeaker();return}
      var dist=Math.hypot(l.z39.b6/l._44-(+st.x||0),l.z39.b7/l._44-(+st.y||0)),radius=16,target=dist>=radius?0:Math.min(.72,Math.pow(1-dist/radius,1.35)*.72),idx=Math.max(0,Math.min(3,st.trackIndex|0));
      if(speaker.track!==idx){for(var i=0;i<speaker.audios.length;i++)if(speaker.audios[i]&&i!==idx){speaker.audios[i].pause();speaker.audios[i].volume=0}speaker.track=idx}
      var a=audioFor(idx);speaker.volume+=(target-speaker.volume)*.18;a.volume=Math.max(0,Math.min(1,speaker.volume));
      if(target<=.002){if(!a.paused)a.pause();return}
      var elapsed=Math.max(0,(Date.now()+speaker.serverOffset-(+st.startedAt||Date.now()))/1000);if(isFinite(a.duration)&&a.duration>0)elapsed=Math.min(Math.max(0,elapsed),Math.max(0,a.duration-.1));
      try{if(Math.abs((a.currentTime||0)-elapsed)>1.8)a.currentTime=elapsed}catch(e){}
      if(a.paused)a.play().catch(function(){})
    }
    function positionalSound(path,x,y,radius){if(!l.z39)return;var d=Math.hypot(l.z39.b6/l._44-(+x||0),l.z39.b7/l._44-(+y||0));radius=radius||11;if(d>=radius)return;try{var a=new Audio(path);a.volume=Math.max(.05,Math.min(.9,(1-d/radius)*.85));a.play().catch(function(){})}catch(e){}}

    function tracer(service,m){var A=canvasTransform(service,+m.x||0,+m.y||0),B=canvasTransform(service,+m.toX||0,+m.toY||0);if(!A||!B)return;var dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy),el=document.createElement('div');el.className='diggerz-turret-tracer';el.style.left=A.x+'px';el.style.top=A.y+'px';el.style.width=d+'px';el.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';document.body.appendChild(el);setTimeout(function(){el.style.opacity='0';setTimeout(function(){el.remove()},180)},55)}
    function turretVisual(service,m){var tx=Math.floor(+m.x||0),ty=Math.round(+m.y||0),ent=findTileEntity(tx,ty);if(!ent)ent=findTileEntity(tx,Math.floor(+m.y||0));try{if(ent&&ent.I46)ent.I46((+m.toX||0)*l._44,(+m.toY||0)*l._44)}catch(e){}tracer(service,m)}

    // Target Dummy is gone from Free Dig as well as PvP.
    proto.sendTestNpc=function(){this.testNpc=null;try{this.removeTestNpc()}catch(e){}};

    // Wins belong to the yellow number on the player nameplate. Leaderboard k31 remains round kills.
    var oldHello=proto.pvpSendHello;proto.pvpSendHello=function(){applyWins(this);return oldHello.call(this)};
    var oldReceive=proto.pvpReceive;proto.pvpReceive=function(m){
      if(!m)return;
      if(m.t==='trade-review'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){showTradeReview(this,m);return}
      if(m.t==='trade-review-close'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpTrade.localAccepted=false;this.pvpTrade.partnerAccepted=false;this.pvpTrade.locked=false;this.pvpTrade.reviewOpen=false;closeTradeReview();return}
      if(m.t==='speaker-state'){setSpeakerState(m);return}
      if(m.t==='speaker-place-blocked'){
        this._pvpApplyingTile=true;try{var old=m.tile||{};this.setTile(m.x|0,m.y|0,old.id|0,old.variant|0)}finally{this._pvpApplyingTile=false}
        this.addItem(1,122,0,1,0,'');this.sendInventory();chat(this,'^9Someone has allreaddy placed a bluetooth speaker!');return
      }
      if(m.t==='world-sound'){var path=m.sound==='balloon_pop'?'/balloon_pop.ogg':m.sound==='swap'?'/swap.ogg':'';if(path)positionalSound(path,m.x,m.y,11);return}
      if(m.t==='cotton-item-award'){if(this.addItem(m.category|0,m.id|0,0,Math.max(1,m.count|0),0,'')>=0){this.markDirty();this.save(true)}return}
      if(m.t==='turret-fire'){turretVisual(this,m);return}
      if(m.t==='tool-attack'){return} // server owns the damage; native equipped animation already travels in player state.
      if(m.t==='battle-event'&&m.kind==='build-start'){P.battle.winCounted=false}
      if(m.t==='winner'&&String(m.connectionId||'')===String(P.connectionId||'')&&!P.battle.winCounted){P.battle.winCounted=true;this.state.wins=Math.max(0,(this.state.wins|0)+1);this.markDirty();this.save(true);applyWins(this);setTimeout(this.pvpSendHello.bind(this),80)}
      var r=oldReceive.call(this,m);
      if(m.t==='hello'){setRemoteWins(this,m._serverFrom,Math.max(0,m.wins|0));applyWins(this)}
      if(m.t==='kill-confirm'||m.t==='kill-feed')refreshBoard(this);
      return r
    };

    var oldRoom=proto.pvpApplyRoomState;proto.pvpApplyRoomState=function(m){var r=oldRoom.call(this,m);if(m&&('speaker' in m))setSpeakerState({speaker:m.speaker,serverNow:m.serverNow});return r};

    // Clicking a Bluetooth Speaker toggles it before the normal attack/mining gate can consume the click.
    var oldA17=proto.A17;proto.A17=function(opcode,body,c){
      if(opcode===287&&this.mode==='digtrade'&&P.joined&&body){var pos=body.Q0,tx,ty;try{body.Q0=0;body.Q4();body.Q4();tx=body.Q4();ty=body.Q4()}catch(e){}finally{body.Q0=pos}try{var game=this.game||l.z38,mx=Math.round((q.mX-game.A7)/(game.a8||1)/l._44),my=Math.round((q.mY-game.A8)/(game.a9||1)/l._44);if(this.tileAt(mx,my)===122){tx=mx;ty=my}}catch(e){}tx=Math.round(+tx||0);ty=Math.round(+ty||0);if(this.tileAt(tx,ty)===122&&this.distanceToPlayer(tx,ty)<=5){if(!this._speakerToggleAt||Date.now()-this._speakerToggleAt>450){this._speakerToggleAt=Date.now();this.pvpSend({t:'speaker-toggle',x:tx,y:ty})}return}}
      return oldA17.call(this,opcode,body,c)
    };

    var oldTick=proto.pvpTick;proto.pvpTick=function(){var r=oldTick.call(this);applyWins(this);try{renderBarrier(this)}catch(_e){};if(this.mode==='digtrade')tickSpeaker(this);return r};

    // Build 23.7 SECURITY: the browser-local password database has been retired.
    // Preserve the currently bound account's saved game once, then erase password hashes/email bindings.
    try {
      var oldAccounts=JSON.parse(localStorage.getItem('diggerz.resurrection.accounts.v1')||'{}')||{};
      var oldBound=String(localStorage.getItem('diggerz.resurrection.boundEmail.v1')||'').trim().toLowerCase();
      if(oldBound&&oldAccounts[oldBound]&&oldAccounts[oldBound].saved&&!localStorage.getItem(DS.STORAGE_KEY))
        localStorage.setItem(DS.STORAGE_KEY,oldAccounts[oldBound].saved);
      localStorage.removeItem('diggerz.resurrection.accounts.v1');
      localStorage.removeItem('diggerz.resurrection.boundEmail.v1');
    } catch(e) {}

    // The old 23.0 score helpers are intentionally neutralized: kills stay round stats.
    try{applyWins(P.service||null)}catch(e){}
  }
  install231();
}());
