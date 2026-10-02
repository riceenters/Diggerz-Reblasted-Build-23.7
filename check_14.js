
(function(){
  var P=window.DiggerzPvp22={socket:null,service:null,queue:[],nativeQueue:[],connected:false,joined:false,starting:false,mode:'pvp',menu:null,hooksInstalled:false,room:'',requested:false,everOpened:false,intentionalClose:false,nativeSpawnSeen:false,nativeMoveSeen:false,debugLines:[],connectionId:'',maxPlayers:10};
  // Global fallback used by prototype callbacks during multiplayer startup.
  window.DiggerzIsMultiplayer=window.DiggerzIsMultiplayer||function(service){return !!(service&&(service.mode==='pvp'||service.mode==='digtrade'))};
  var overlay=document.getElementById('diggerz-pvp22'),status=document.getElementById('diggerz-pvp22-status');
  var serverInput=document.getElementById('pvp22-server-url');
  var debugBox=document.getElementById('diggerz-mp-debug'),debugLog=document.getElementById('diggerz-mp-debug-log'),debugSummary=document.getElementById('diggerz-mp-debug-summary');
  function stamp(){try{return new Date().toISOString().slice(11,19)}catch(e){return ''}}
  function serviceName(){try{return P.service?(P.service.constructor&&P.service.constructor.name||'DiggerzService')+'('+String(P.service.mode||'?')+')':'none'}catch(e){return 'error'}}
  function updateDebugSummary(){if(!debugSummary)return;debugSummary.textContent='mode='+P.mode+' | socket='+socketState()+' | room='+(P.room||'none')+' | paired='+(P.connected?'yes':'no')+'\nservice='+serviceName()+' | A45='+(typeof l!=='undefined'?l.A45:'?')+' | A46='+(typeof l!=='undefined'?l.A46:'?')+' | route='+(typeof q!=='undefined'?(q.diggerzConnectionRoute||'?'):'?')}
  function dbg(code,msg){var line='['+stamp()+'] ['+code+'] '+String(msg==null?'':msg);P.debugLines.push(line);if(P.debugLines.length>160)P.debugLines.shift();if(debugLog){debugLog.textContent=P.debugLines.join('\n');debugLog.scrollTop=debugLog.scrollHeight}updateDebugSummary();try{console.log('[Diggerz MP]',code,msg)}catch(e){}}
  window.DiggerzMpDebugLog=dbg;
  function setStatus(t){status.textContent=t;dbg('MP-STATUS',t)}
  window.addEventListener('error',function(e){dbg('JS-001',(e.message||'window error')+' @ '+(e.filename||'?')+':'+(e.lineno||'?'))});
  window.addEventListener('unhandledrejection',function(e){dbg('JS-002','Promise rejection: '+String(e.reason&&e.reason.stack||e.reason||'unknown'))});
  document.getElementById('diggerz-mp-copy').onclick=function(){var t=P.debugLines.join('\n');try{navigator.clipboard.writeText(t);dbg('MP-090','debug log copied')}catch(e){dbg('MP-091','copy failed: '+e.message)}};
  document.getElementById('diggerz-mp-clear').onclick=function(){P.debugLines=[];dbg('MP-000','debug log cleared')};
  document.getElementById('diggerz-mp-hide').onclick=function(){debugBox.style.display='none'};
  function automaticServerUrl(){
    if(location.protocol==='https:')return 'wss://diggerz-multiplayer-test-production.up.railway.app';
    if(location.protocol==='http:')return 'ws://'+location.host;
    try{return localStorage.getItem('diggerzServerUrl')||'ws://127.0.0.1:8080'}catch(e){return 'ws://127.0.0.1:8080'}
  }
  function normalizeServerUrl(value){
    var v=String(value||'').trim()||automaticServerUrl();
    if(/^https:\/\//i.test(v))v='wss://'+v.slice(8);else if(/^http:\/\//i.test(v))v='ws://'+v.slice(7);else if(!/^wss?:\/\//i.test(v))v='ws://'+v;
    return v.replace(/\/+$/,'')
  }
  function saveServerUrl(){if(location.protocol==='file:')try{localStorage.setItem('diggerzServerUrl',serverInput.value)}catch(e){}}
  function loadServerUrl(){serverInput.value=automaticServerUrl();var d=document.getElementById('pvp22-server-display');if(d)d.textContent='Diggerz server: '+serverInput.value}
  function closeSocket(intentional){var s=P.socket;P.intentionalClose=intentional!==false;P.socket=null;P.connected=false;P.joined=false;P.starting=false;P.everOpened=false;if(s)try{s.close(1000,'leaving lobby')}catch(e){}}
  function setMode(mode){P.mode=mode==='digtrade'?'digtrade':'pvp';dbg('MP-001','mode selected: '+P.mode)}
  function show(side,mode){
    if(mode)setMode(mode);
    P.requested=true;P.intentionalClose=false;overlay.style.display='none';dbg('MP-002','background matchmaking requested');
    installRuntimeHooks();
    connectMatchmaking();
  }
  function username(){try{return String(q.thisMain.userName||'Player').slice(0,24)}catch(e){return 'Player'}}
  function clientId(){var k='diggerz.resurrection.clientId.v1',v='';try{v=localStorage.getItem(k)||'';if(!/^[A-Za-z0-9_-]{16,80}$/.test(v)){var a=new Uint8Array(18);crypto.getRandomValues(a);v='DG-'+Array.prototype.map.call(a,function(b){return ('0'+b.toString(16)).slice(-2)}).join('');localStorage.setItem(k,v)}}catch(e){v='DG-'+Math.random().toString(36).slice(2)+Date.now().toString(36)}return v}
  function sendRaw(m){var s=P.socket;if(s&&s.readyState===WebSocket.OPEN)try{s.send(JSON.stringify(m));if(m&&m.t&&m.t!=='state'&&m.t!=='aim'&&m.t!=='ping')dbg('MP-TX-J',m.t+(m.mode?' mode='+m.mode:''));return true}catch(e){dbg('MP-062','JSON send failed: '+e.message)}return false}
  function sendNativePacket(packet){var s=P.socket;if(!packet||!packet.Q1||!s||s.readyState!==WebSocket.OPEN)return false;try{var b=packet.Q1.b;var copy=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);var op=new DataView(copy).getUint16(0,true);s.send(copy);if(op===5)dbg('MP-041','native spawn packet '+op+' sent ('+copy.byteLength+' bytes)');return true}catch(e){dbg('MP-063','native send failed: '+e.message);console.error('Diggerz native packet send',e);return false}}
  P.send=function(m){return sendRaw(m)};
  P.sendNative=function(packet){return sendNativePacket(packet)};
  P.attach=function(service){P.service=service;dbg('MP-070','game service attached: '+serviceName()+'; local/offline service='+(service&&service.constructor===DiggerzService?'YES':'NO'));while(P.queue.length)service.pvpReceive(P.queue.shift());while(P.nativeQueue.length)service.pvpReceiveNative(P.nativeQueue.shift());
    // Defer hello/spawn until room-state has applied map+items+peers, so the
    // local player does not appear in an empty/default world first.
    if(service._pvpWorldSynced){
      if(service.pvpSendHello)service.pvpSendHello();
      if(P.connected&&service.pvpSendNativeSpawn)service.pvpSendNativeSpawn();
    }else{
      var waits=0;
      (function waitSync(){
        waits++;
        if(service._pvpWorldSynced||waits>40){
          try{if(service.pvpSendHello)service.pvpSendHello()}catch(_e){}
          try{if(P.connected&&service.pvpSendNativeSpawn)service.pvpSendNativeSpawn()}catch(_e){}
          return;
        }
        setTimeout(waitSync,100);
      })();
    }
  };
  P.detach=function(service){if(P.service===service)P.service=null};
  function routeGameMessage(m){try{if(P.service&&P.service.pvpReceive)P.service.pvpReceive(m);else P.queue.push(m)}catch(e){console.error('Diggerz server receive',e)}}
  function routeNativePacket(buffer){try{if(P.service&&P.service.pvpReceiveNative)P.service.pvpReceiveNative(buffer);else P.nativeQueue.push(buffer)}catch(e){console.error('Diggerz native server receive',e)}}
  function serverAddress(){var u=(location.protocol==='http:'||location.protocol==='https:')?automaticServerUrl():normalizeServerUrl(serverInput.value);serverInput.value=u;saveServerUrl();var d=document.getElementById('pvp22-server-display');if(d)d.textContent='Diggerz server: '+u;return u}
  function socketState(){var s=P.socket;if(!s)return 'none';return ['CONNECTING','OPEN','CLOSING','CLOSED'][s.readyState]||String(s.readyState)}
  function connectMatchmaking(){
    if(!P.requested)return;
    closeSocket(true);P.intentionalClose=false;P.requested=true;P.connected=false;P.joined=false;P.room='';P.everOpened=false;
    var url=serverAddress();dbg('MP-010','WebSocket URL '+url);setStatus((location.protocol==='file:'?'Connecting to the local Diggerz test server…':'Connecting to Diggerz multiplayer…')+'\nLooking for a '+(P.mode==='pvp'?'Battle':'Dig+Trade')+' player.');
    var ws;try{ws=P.socket=new WebSocket(url);ws.binaryType='arraybuffer'}catch(e){P.socket=null;setStatus('Could not reach the Diggerz multiplayer server. '+(e&&e.message||e));return}
    var openedAt=Date.now();
    ws.onopen=function(){if(P.socket!==ws||!P.requested)return;P.everOpened=true;dbg('MP-011','socket OPEN after '+(Date.now()-openedAt)+'ms');setStatus('Connected. Looking for another '+(P.mode==='pvp'?'Battle':'Dig+Trade')+' player…');sendRaw({t:'matchmake',mode:P.mode,name:username(),clientId:clientId(),build:'24.0'})};
    ws.onmessage=function(event){
      if(P.socket!==ws)return;
      if(event.data instanceof ArrayBuffer){try{var op0=new DataView(event.data).getUint16(0,true);if(op0===5)dbg('MP-031','native spawn packet '+op0+' received ('+event.data.byteLength+' bytes)')}catch(_e){}routeNativePacket(event.data);return}
      if(typeof Blob!=='undefined'&&event.data instanceof Blob){event.data.arrayBuffer().then(routeNativePacket).catch(function(e){console.error('Diggerz Blob packet',e)});return}
      var m;try{m=JSON.parse(event.data)}catch(e){setStatus('Server sent invalid data.');return}if(!m||!m.t)return;
      if(m.t==='banned'){try{localStorage.setItem('diggerz.resurrection.activeBan.v1',JSON.stringify({id:m.id||'',name:m.name||username(),createdAt:+m.createdAt||Date.now(),expiresAt:+m.expiresAt||0,permanent:!!m.permanent,reason:String(m.reason||'no reason provided.')}))}catch(e){};location.replace('https://diggerz-multiplayer-test-production.up.railway.app/banned');return;}
      if(m.t==='kicked'){try{alert('you have been kicked.\nreason: '+String(m.reason||'no reason provided.'))}catch(e){};P.intentionalClose=true;try{ws.close()}catch(e){};setTimeout(function(){location.replace('/')},50);return;}
      if(m.t==='server-hello'){dbg('MP-012','server hello: '+String(m.server||'unknown'));return;}
      if(m.t==='welcome'){P.joined=true;P.suppressPeerJoinChat=true;try{if(P.service)P.service._pvpAnnounceJoins=false}catch(_e){}
        // Keep join spam off on the joining client. Existing peers must never
        // show as "is now here" on this screen.
        setTimeout(function(){P.suppressPeerJoinChat=false;try{if(P.service)P.service._pvpAnnounceJoins=true}catch(_e){}},8000);
        P.room=m.room||'';P.connectionId=m.connectionId||'';P.maxPlayers=m.max||10;dbg('MP-021','WELCOME room='+P.room+' connectionId='+(m.connectionId||'?')+' count='+(m.count||'?')+'/'+(m.max||'?'));setStatus('Connected to '+(P.mode==='pvp'?'Battle':'Dig+Trade')+' server.');return}
      if(m.t==='player-count'){dbg('MP-022','player-count room='+(m.room||P.room||'?')+' '+m.count+'/'+m.max);P.connected=(m.count>=2);return}
      if(m.t==='room-ready'){dbg('MP-023','ROOM READY room='+(m.room||P.room||'?')+' mode='+(m.mode||'?'));if(m.mode&&m.mode!==P.mode){setStatus('Server mode mismatch.');return}P.connected=true;setStatus('Native Diggerz packet link ready.');
        // Only announce ourselves once world sync finished — do not mass-hello.
        if(P.service&&P.service._pvpWorldSynced){try{if(P.service.pvpSendHello)P.service.pvpSendHello()}catch(_e){}try{if(P.service.pvpSendNativeSpawn)P.service.pvpSendNativeSpawn()}catch(_e){}}
        return}
      if(m.t==='server-error'){dbg('MP-050','server-error code='+(m.code||'?')+' message='+(m.message||'?'));P.connected=false;setStatus('Multiplayer server error: '+String(m.message||m.code||'Unknown error.'));return}
      if(m.t==='peer-left'){dbg('MP-040','peer-left '+String(m.connectionId||'?'));P.connected=((m.count||0)>=2);routeGameMessage(m);if(!P.starting&&!P.connected)setStatus('Waiting for more players…');return}
      if(m.t==='pong')return;if(m.t==='hello')dbg('MP-030','peer hello from '+String(m.name||m._serverName||'?'));routeGameMessage(m)
    };
    ws.onerror=function(event){dbg('MP-060','WebSocket error; state='+socketState());if(P.socket===ws&&P.requested&&!P.everOpened)setStatus('Could not reach the Diggerz multiplayer server. If you opened the downloaded HTML directly, the multiplayer server must be running locally; the hosted Render version connects automatically.')};
    ws.onclose=function(event){
      if(P.socket!==ws)return;
      var hadOpened=P.everOpened,hadJoined=P.joined,hadMatch=P.connected,intentional=P.intentionalClose;dbg('MP-061','socket CLOSED code='+event.code+' reason='+(event.reason||'none')+' opened='+hadOpened+' joined='+hadJoined+' paired='+hadMatch);
      P.socket=null;P.connected=false;P.joined=false;P.everOpened=false;
      if(intentional||!P.requested)return;
      if(!hadOpened)setStatus('Could not reach the Diggerz multiplayer server. No match was joined.');
      else if(!hadJoined)setStatus('The multiplayer server connection closed before matchmaking started. No match was joined.');
      else if(!hadMatch)setStatus('Lost the multiplayer server connection. You can keep playing locally, but another player cannot join until the connection returns.');
      else {setStatus('Disconnected from the multiplayer server.');try{if(P.service&&P.service.message)P.service.message('^1DISCONNECTED FROM MULTIPLAYER SERVER.')}catch(e){}}
    };
    setTimeout(function(){if(P.socket===ws&&P.requested&&!P.joined)setStatus('Still trying to reach the Diggerz server… Server state='+socketState()+'.')},10000)
  }
  function installRuntimeHooks(){
    if(P.hooksInstalled)return true;
    if(typeof DiggerzService==='undefined'||!DiggerzService.prototype)return false;
    var proto=DiggerzService.prototype;
    function isMp(service){return window.DiggerzIsMultiplayer(service)}
    // Expose the multiplayer-mode predicate globally as a compatibility fallback.
    // Some native callbacks can outlive the hook-installation scope.
    window.DiggerzIsMultiplayer=window.DiggerzIsMultiplayer||isMp;
    function itemCopy(item){return {category:(item&&item.category)|0,id:(item&&item.id)|0,variant:(item&&item.variant)|0,count:Math.max(0,(item&&item.count)|0),extra:(item&&item.extra)|0,text:String(item&&item.text||'')}}
    function emptyItem(){return {category:0,id:0,variant:0,count:0,extra:0,text:''}}
    function guidParts(id){return id?[id.P4|0,id.P5|0,id.P6|0,id.P7|0]:[0,0,0,0]}
    proto.guidFromParts=function(parts){return this.guid((parts&&parts[0])|0,(parts&&parts[1])|0,(parts&&parts[2])|0,(parts&&parts[3])|0)};
    proto.pvpGuidKey=function(id){return id?[id.P4|0,id.P5|0,id.P6|0,id.P7|0].join(':'):''};
    proto.pvpEnsurePeers=function(){if(!this.pvpPeers)this.pvpPeers={};return this.pvpPeers};
    proto.pvpPeerForConnection=function(cid){return cid&&this.pvpEnsurePeers()[cid]||null};
    proto.pvpFindPeerByName=function(name){name=String(name||'');var peers=this.pvpEnsurePeers();for(var k in peers)if(peers[k]&&peers[k].name===name)return peers[k];return null};
    proto.pvpFindPeerByGuid=function(id){if(!id)return null;var peers=this.pvpEnsurePeers();for(var k in peers){var p=peers[k];if(p&&p.id&&p.id.q2(id))return p}return null};
    proto.pvpIsPeerGuid=function(id){return !!this.pvpFindPeerByGuid(id)};
    proto.pvpEntityForPeer=function(peer){if(!peer||!peer.id||!this.game||!this.game.V31)return null;try{return this.game.V31(peer.id)}catch(e){return null}};
    proto.pvpRefreshLegacyPeer=function(){var peers=this.pvpEnsurePeers();this.peerId=null;this.peerInfo=null;for(var k in peers){if(peers[k]&&peers[k].id){this.peerId=peers[k].id;this.peerInfo=peers[k].info||null;break}}};
    proto.pvpRemovePeer=function(cid){var peers=this.pvpEnsurePeers(),peer=peers[cid];if(!peer)return false;var id=peer.id;delete peers[cid];var self=this;function despawn(guid){if(!guid)return;try{self.enqueue(3,1,function(out){out.R8(guid)})}catch(e){}try{var ent=self.game&&self.game.V31?self.game.V31(guid):null;if(ent){try{if(ent.a0!=null)ent.a0=1}catch(_e){}try{if(typeof ent.e3==='function')ent.e3()}catch(_e){}}}catch(e){}}despawn(id);setTimeout(function(){despawn(id)},80);setTimeout(function(){despawn(id)},300);if(this.pvpTrade&&this.pvpTrade.partnerConnectionId===cid)this.pvpCancelTradeLocal('Player disconnected.');this.pvpRefreshLegacyPeer();return true};
    proto.pvpSend=function(m){return window.DiggerzIsMultiplayer(this)&&P.send(m)};
    proto.pvpSendHello=function(){
      if(!window.DiggerzIsMultiplayer(this)||!this.playerId)return;
      var p=l.z39,skin=q.player&&q.player.l9?(.45+1.1*q.player.l9/100):1.44;
      this.pvpSend({t:'hello',id:guidParts(this.playerId),name:this.playerName(),appearance:this.state.appearance.slice(0,11),appearanceText:this.state.appearanceText||'',x:p?p.b6/l._44:this.state.x,y:p?p.b7/l._44:this.state.y,skin:skin,wins:Math.max(0,this.state.wins|0),mode:P.mode,adminEffects:this.adminEffects||{god:false,fly:false,noclip:false,invis:false}})
    };
    proto.pvpSendNativeSpawn=function(){
      if(!window.DiggerzIsMultiplayer(this)||!this.playerId||!P.connected||this.localDead)return false;
      var self=this,s=this.state,p=l.z39,ap=(s.appearance||[]).slice(0,11);while(ap.length<11)ap.push(0);
      var packet=this.buildNativePacket(5,1,function(out){
        var name=self.playerName();
        out.R8(self.playerId);out.R9(name);out.r8(p?p.b6/l._44:s.x);out.r8(0);out.r8(p?p.b7/l._44:s.y);out.r8(0);
        out.R2(ap.length);for(var i=0;i<ap.length;i++)out.R2(ap[i]||0);out.R9(s.appearanceText||'');out.R2(0);out.R4(0);out.R2(q.player&&q.player.L0||0);out.s0(false);out.R2(1);out.R0(0);out.s0(false);out.R0(0);out.R2(Math.max(0,Math.min(65535,s.wins|0)));out.R8(self.zeroId);out.R4(0);
        var skin=q.player?(.45+1.1*(q.player.l9||90)/100):1.44;out.r8(skin);out.r8(1)
      });
      return P.sendNative(packet)
    };
    proto.pvpReceiveNative=function(buffer){if(!window.DiggerzIsMultiplayer(this))return;var op=0;try{op=new DataView(buffer).getUint16(0,true)}catch(e){}if(op===5)P.nativeSpawnSeen=true;if(op===6)P.nativeMoveSeen=true;this.injectNativePacket(buffer)};
    proto.pvpSendNativeMovement=function(){
      if(!window.DiggerzIsMultiplayer(this)||!P.connected||!l.z39||this.localDead)return false;
      var self=this,p=l.z39,vx=0,vy=0,anim=0,face=1;
      try{var body=p.b33.tBJ;body.wrap_vel||body.setupVelocity();vx=body.wrap_vel.tBJ.x;vy=body.wrap_vel.tBJ.y}catch(e){}
      try{if(p.i33){anim=p.i33._32(p.i33.Z28);if(anim<0)anim=0;face=p.i33.b4||1}}catch(e){anim=0;face=1}
      var xt=p.b6/l._44,yt=p.b7/l._44;
      var packet=this.buildNativePacket(6,1,function(out){out.R8(self.playerId);out.r8(xt);out.r8(yt);out.r8(vx);out.r8(vy);out.r8(anim);out.r8(face);out.R2(0);out.R4(0);out.R4(0);out.R2(Math.max(0,Math.min(65535,Math.round(xt))));out.R2(Math.max(0,Math.min(65535,Math.round(yt))))});
      return P.sendNative(packet)
    };
    proto.pvpEchoPeerAttack=function(m){var peer=this.pvpPeerForConnection(m&&m._serverFrom);if(!peer||!peer.id)return;var self=this;function one(tx,ty){self.enqueue(287,1,function(packet){packet.r8(m.fromX);packet.r8(m.fromY);packet.r8(tx);packet.r8(ty);packet.R0(m.attackType|0);packet.R8(peer.id)})}if((m.attackType|0)===31){var dx=m.toX-m.fromX,dy=m.toY-m.fromY,ox=-dy*.14,oy=dx*.14;one(m.toX+ox,m.toY+oy);one(m.toX,m.toY);one(m.toX-ox,m.toY-oy)}else one(m.toX,m.toY)};
    proto.pvpWriteContainer=function(id,slots){var self=this;slots=slots||[];this.enqueue(14,1,function(packet){packet.R8(id);packet.R4(0);packet.R4(Math.min(127,slots.length));var texts=[];for(var i=0;i<slots.length&&i<127;i++){var item=slots[i]||emptyItem();packet.R4(item.category|0);packet.R2(((item.id|0)&2047)|(((item.variant|0)&31)<<11));packet.R2(Math.max(0,item.count|0));packet.R2(item.extra|0);if(item.text)texts.push([i,String(item.text)])}packet.R2(texts.length);for(i=0;i<texts.length;i++){packet.R2(texts[i][0]);packet.R9(texts[i][1])}})};
    proto.pvpTradeGuid=function(text,salt){text=String(text||'')+'|'+String(salt||'');function h(seed){var x=seed|0;for(var i=0;i<text.length;i++){x^=text.charCodeAt(i);x=Math.imul(x,16777619)}return x|0}return this.guid(h(2166136261),h(0x6d2b79f5),h(0x1b873593),h(0x85ebca6b))};
    proto.pvpStartTrade=function(m){if(!m||!m.tradeId)return;if(this.pvpTrade)this.pvpCancelTradeLocal('New trade started.');var session=this.pvpTradeGuid(m.tradeId,'session-'+P.connectionId),localId=this.pvpTradeGuid(m.tradeId,'local-'+P.connectionId),remoteId=this.pvpTradeGuid(m.tradeId,'remote-'+P.connectionId);this.pvpTrade={id:m.tradeId,partnerConnectionId:m.partnerConnectionId||'',partnerName:String(m.partnerName||'Player'),sessionGuid:session,localGuid:localId,remoteGuid:remoteId,localSlots:[emptyItem(),emptyItem(),emptyItem()],remoteSlots:[emptyItem(),emptyItem(),emptyItem()],locked:false,localAccepted:false,partnerAccepted:false};var self=this;this.enqueue(168,1,function(packet){packet.R9(self.pvpTrade.partnerName);packet.R8(session);packet.R8(localId);packet.R8(remoteId)});this.pvpWriteContainer(localId,this.pvpTrade.localSlots);this.pvpWriteContainer(remoteId,this.pvpTrade.remoteSlots)};
    proto.pvpTradeOffer=function(){var tr=this.pvpTrade;if(!tr)return;this.pvpWriteContainer(tr.localGuid,tr.localSlots);this.pvpSend({t:'trade-offer',tradeId:tr.id,offer:tr.localSlots.map(itemCopy)})};
    proto.pvpRestoreTradeItems=function(){var tr=this.pvpTrade;if(!tr)return;for(var i=0;i<tr.localSlots.length;i++){var item=tr.localSlots[i];if(item&&item.category&&item.count>0){if(this.addItem(item.category,item.id,item.variant,item.count,item.extra,item.text)<0){var x=l.z39?l.z39.b6/l._44:this.state.x,y=l.z39?l.z39.b7/l._44-.5:this.state.y;this.spawnDrop(item.category,item.id,item.count,x,y,item.text,'trade')}}}this.sendInventory()};
    proto.pvpCloseTradeWindow=function(cancelled){var tr=this.pvpTrade;if(!tr)return;var id=tr.sessionGuid;if(cancelled)this.enqueue(171,1,function(packet){packet.R8(id)});else this.enqueue(172,1,function(packet){packet.R8(id);packet.R9('')})};
    proto.pvpCancelTradeLocal=function(reason){if(!this.pvpTrade)return;this.pvpRestoreTradeItems();this.pvpCloseTradeWindow(true);this.pvpTrade=null;if(reason)this.message('^1Trade cancelled: ^7'+String(reason))};
    proto.pvpCompleteTrade=function(receive){var tr=this.pvpTrade;if(!tr)return;var items=Array.isArray(receive)?receive:[];for(var i=0;i<items.length;i++){var item=itemCopy(items[i]);if(item.category&&item.count>0&&this.addItem(item.category,item.id,item.variant,item.count,item.extra,item.text)<0){var x=l.z39?l.z39.b6/l._44:this.state.x,y=l.z39?l.z39.b7/l._44-.5:this.state.y;this.spawnDrop(item.category,item.id,item.count,x,y,item.text,'trade')}}this.pvpCloseTradeWindow(false);this.pvpTrade=null;this.sendInventory();this.markDirty();this.save(true);this.message('^2Trade complete.')};
    proto.pvpDropKey=function(parts){return Array.isArray(parts)?parts.map(function(v){return v|0}).join(':'):''};
    proto.pvpAddSharedDrop=function(d){if(!d||!Array.isArray(d.guid))return;var guid=this.guidFromParts(d.guid),key=this.pvpGuidKey(guid);if(this.drops[key])return;var drop={guid:guid,category:d.category|0,id:d.id|0,count:Math.max(1,d.count|0),x:+d.x||0,y:+d.y||0,text:String(d.text||''),tier:String(d.tier||'')};this.drops[key]=drop;this.enqueue(15,1,function(packet){packet.R8(guid);packet.R4(drop.category);packet.r8(drop.x);packet.r8(0);packet.r8(drop.y);packet.r8(drop.x);packet.r8(0);packet.r8(drop.y-.35);packet.R2(drop.id);packet.R2(drop.count);packet.R0(0);packet.s0(true);packet.R9(drop.text)})};
    proto.pvpRemoveSharedDrop=function(parts){var guid=this.guidFromParts(parts),key=this.pvpGuidKey(guid),drop=this.drops[key];if(!drop)return;delete this.drops[key];this.removeDrop(drop)};
    proto.pvpApplyRoomState=function(m){var i;if(Array.isArray(m.tiles)){this._pvpApplyingTile=true;try{for(i=0;i<m.tiles.length;i++){var t=m.tiles[i];this.setTile(t.x|0,t.y|0,t.id|0,t.variant|0,t.layer|0)}}finally{this._pvpApplyingTile=false}}if(Array.isArray(m.backgroundTiles)){this._pvpApplyingTile=true;try{for(i=0;i<m.backgroundTiles.length;i++){var bt=m.backgroundTiles[i];this.setTile(bt.x|0,bt.y|0,bt.id|0,bt.variant|0,2)}}finally{this._pvpApplyingTile=false}}if(Array.isArray(m.drops))for(i=0;i<m.drops.length;i++)this.pvpAddSharedDrop(m.drops[i])};
    proto.pvpRemoteHitLine=function(fromX,fromY,toX,toY){var peers=this.pvpEnsurePeers(),vx=toX-fromX,vy=toY-fromY,vv=vx*vx+vy*vy,best=null,bestT=2;for(var k in peers){var peer=peers[k],e=this.pvpEntityForPeer(peer);if(!e||!e.a2)continue;var px=e.b6/l._44,py=e.b7/l._44,t=vv>0?((px-fromX)*vx+(py-fromY)*vy)/vv:0;t=Math.max(0,Math.min(1,t));var cx=fromX+vx*t,cy=fromY+vy*t;if(Math.hypot(px-cx,py-cy)<=.9&&t<bestT){best=peer;bestT=t}}return best};
    proto.adminEffects={god:false,fly:false,noclip:false,invis:false};
    proto.adminModifiers={speed:1,jump:1,size:1,breakSpeed:1};

    // Build 24.0.5: use the supplied original fly behavior instead of the
    // approximate WASD velocity hack.  The original script works by reaching
    // the local character controller (Main.children[7].s38.b33.tBJ), setting
    // its gravity mass while W is held, and switching the animation state.
    // It is gated by the server-authoritative adminEffects.fly flag so a normal
    // player cannot activate it just by pressing W.
    var adminFlyMc7=null,adminFlyTbj=null,adminFlyW=true,adminFlyBound=false;
    function defineAdminFlyController(){
      try{
        var MainRef=window.Main||q;
        adminFlyMc7=MainRef&&MainRef.children?MainRef.children[7]:null;
        if(!adminFlyMc7||adminFlyMc7.s38===null||!adminFlyMc7.s38||!adminFlyMc7.s38.b33||!adminFlyMc7.s38.b33.tBJ){
          setTimeout(defineAdminFlyController,50);
          return;
        }
        adminFlyTbj=adminFlyMc7.s38.b33.tBJ;
      }catch(_e){setTimeout(defineAdminFlyController,50)}
    }
    defineAdminFlyController();
    function adminFlyKey(e){
      if(!e||e.code!=='KeyW')return;
      adminFlyW=e.type==='keydown';
      var Pnow=window.DiggerzPvp22;
      if(!Pnow||!Pnow.service)return;
      var active=!!(Pnow.service.adminEffects&&Pnow.service.adminEffects.fly);
      if(!active)return;
      if(!adminFlyTbj){defineAdminFlyController();return}
      try{
        if(adminFlyW){
          adminFlyTbj.gravMass=-1;
          if(adminFlyMc7&&adminFlyMc7.s38)adminFlyMc7.s38.I32='jump__in';
        }else{
          adminFlyTbj.gravMass=2;
          if(adminFlyMc7&&adminFlyMc7.s38)adminFlyMc7.s38.I32='idle';
        }
      }catch(_e){}
    }
    if(!adminFlyBound){
      adminFlyBound=true;
      window.addEventListener('keydown',adminFlyKey);
      window.addEventListener('keyup',adminFlyKey);
    }
    function adminFlyApplyState(enabled){
      if(!adminFlyTbj){defineAdminFlyController();return}
      try{
        if(enabled&&adminFlyW){
          adminFlyTbj.gravMass=-1;
          if(adminFlyMc7&&adminFlyMc7.s38)adminFlyMc7.s38.I32='jump__in';
        }else{
          adminFlyTbj.gravMass=2;
          if(adminFlyMc7&&adminFlyMc7.s38)adminFlyMc7.s38.I32='idle';
        }
      }catch(_e){}
    }
    proto.adminApplyEffects=function(effects){
      this.adminEffects=Object.assign({god:false,fly:false,noclip:false,invis:false},effects||{});
      var ent=l.z39;if(ent){try{ent.set_alp(this.adminEffects.invis?0:1);ent.set_local_alp(this.adminEffects.invis?0:1)}catch(e){}}
      adminFlyApplyState(!!this.adminEffects.fly);
      adminApplyNoclipRadius(!!this.adminEffects.noclip);
      if(this.adminModifiers)this.adminApplyModifiers(this.adminModifiers);
    };
    function adminClampMod(v,min,max){v=Number(v);return isFinite(v)?Math.max(min,Math.min(max,v)):1}
    function adminApplyNoclipRadius(active){try{var ent=l.z39,body=ent&&ent.b34&&ent.b34.tBJ;if(!body)return;if(body.__diggerzOriginalRadius==null)body.__diggerzOriginalRadius=Number(body.radius)||1;body.radius=active?0:body.__diggerzOriginalRadius}catch(_e){}}
    function installAdminPlayerSizeHook(ent){
      try{
        if(!ent||!ent.i33||ent.i33.__diggerzSizeHook)return;
        var spr=ent.i33,orig=spr.set_local_xScale;
        if(typeof orig!=='function')return;
        spr.__diggerzBaseSetXScale=orig;
        spr.set_local_xScale=function(v){
          var m=Number(ent._diggerzSizeModifier);
          if(!isFinite(m)||m<=0)m=1;
          return orig.call(this,(Number(v)||0)*m);
        };
        spr.__diggerzSizeHook=true;
      }catch(_e){}
    }
    function installAdminPlayerModifierHooks(){
      try{
        var ent=l.z39;
        if(!ent){setTimeout(installAdminPlayerModifierHooks,100);return}
        installAdminPlayerSizeHook(ent);
        if(ent.__diggerzModifierHooks)return;
        var originalK35=ent.k35,originalK36=ent.k36;
        if(typeof originalK35==='function'){
          ent.k35=function(){
            var svc=window.DiggerzPvp22&&window.DiggerzPvp22.service,mod=svc&&svc.adminModifiers,old=this.N39;
            this.N39=adminClampMod(mod&&mod.speed,.1,10);
            try{return originalK35.apply(this,arguments)}finally{this.N39=old}
          };
        }
        if(typeof originalK36==='function'){
          ent.k36=function(){
            var beforeY=0,body=this.b33&&this.b33.tBJ,svc=window.DiggerzPvp22&&window.DiggerzPvp22.service,mod=svc&&svc.adminModifiers,jm=adminClampMod(mod&&mod.jump,.1,10);
            try{if(body&&body.wrap_vel){body.setupVelocity();beforeY=body.wrap_vel.tBJ.y}}catch(_e){}
            var r=originalK36.apply(this,arguments);
            try{if(body&&body.wrap_vel&&jm!==1&&body.wrap_vel.tBJ.y<beforeY-1){body.wrap_vel.tBJ.y=beforeY+(body.wrap_vel.tBJ.y-beforeY)*jm}}catch(_e){}
            return r;
          };
        }
        ent.__diggerzModifierHooks=true;
      }catch(_e){setTimeout(installAdminPlayerModifierHooks,250);return}
    }
    installAdminPlayerModifierHooks();
    proto.adminApplyModifiers=function(mods){
      this.adminModifiers={speed:adminClampMod(mods&&mods.speed,.1,10),jump:adminClampMod(mods&&mods.jump,.1,10),size:adminClampMod(mods&&mods.size,.25,4),breakSpeed:adminClampMod(mods&&mods.breakSpeed,.1,10)};
      var ent=l.z39,sz=this.adminModifiers.size;
      try{if(ent){installAdminPlayerModifierHooks();ent._diggerzSizeModifier=sz;installAdminPlayerSizeHook(ent);if(ent.i33){var face=ent.k33||1;ent.i33.set_local_xScale(face);ent.i33.set_local_yScale(sz)}adminApplyNoclipRadius(!!(this.adminEffects&&this.adminEffects.noclip))}}catch(_e){}
    };
    proto.adminApplyPeerModifiers=function(peer){if(!peer)return;var e=this.pvpEntityForPeer(peer),sz=Number(peer.adminModifiers&&peer.adminModifiers.size)||1;if(e){try{e._diggerzSizeModifier=sz;installAdminPlayerSizeHook(e);if(e.i33){var face=e.k33||1;e.i33.set_local_xScale(face);e.i33.set_local_yScale(sz)}}catch(_e){}}};
    proto.adminApplyPeerEffects=function(peer){if(!peer)return;var e=this.pvpEntityForPeer(peer);if(e){try{e.set_alp(peer.adminEffects&&peer.adminEffects.invis?0:1);e.set_local_alp(peer.adminEffects&&peer.adminEffects.invis?0:1)}catch(_e){}}};
    proto.pvpReceive=function(m){
      if(!m||!window.DiggerzIsMultiplayer(this))return;
      if(m.t==='hello'){var cid=m._serverFrom||'';if(!cid||cid===P.connectionId)return;var peers=this.pvpEnsurePeers(),prev=peers[cid],first=!prev;var fromRoster=!!(prev&&prev._fromRoster);peers[cid]={connectionId:cid,name:String(m.name||m._serverName||'Player'),id:this.guidFromParts(m.id),info:m,_fromRoster:fromRoster,adminEffects:Object.assign({god:false,fly:false,noclip:false,invis:false},m.adminEffects||{}),adminModifiers:Object.assign({speed:1,jump:1,size:1,breakSpeed:1},m.adminModifiers||{})};if(isFinite(+m.x))peers[cid].lastX=+m.x;if(isFinite(+m.y))peers[cid].lastY=+m.y;this.pvpRefreshLegacyPeer();if(!first)this.adminApplyPeerEffects(peers[cid]);
        // Do NOT announce existing roster peers as "joined" on the local joiner.
        // Server sends a single player-joined for everyone else.
        if(P.connected)this.pvpSendNativeSpawn();return}
      if(m.t==='admin-effect'){if(String(m.connectionId||'')===String(P.connectionId||''))this.adminApplyEffects(m.effects||{});else{var ep=this.pvpPeerForConnection(m.connectionId);if(ep){ep.adminEffects=Object.assign({god:false,fly:false,noclip:false,invis:false},m.effects||{});this.adminApplyPeerEffects(ep)}}return}
      if(m.t==='admin-modifiers'){var mods=Object.assign({speed:1,jump:1,size:1,breakSpeed:1},m.modifiers||{});if(String(m.connectionId||'')===String(P.connectionId||'')){this.adminModifiers=mods;this.adminApplyModifiers(mods)}else{var mp=this.pvpPeerForConnection(m.connectionId);if(mp){mp.adminModifiers=mods;this.adminApplyPeerModifiers(mp)}}return}
      if(m.t==='peer-rename'){var rp=this.pvpPeerForConnection(m.connectionId);var renamed=String(m.name||'Player').slice(0,24);if(rp){rp.name=renamed;if(rp.info)rp.info.name=renamed;var re=this.pvpEntityForPeer(rp);if(re){try{re._1=renamed}catch(_e){}try{if(re.J30&&re.J30.E32)re.J30.E32.E37(renamed)}catch(_e){}}}if(String(m.connectionId||'')===String(P.connectionId||'')){this._adminDisplayName=renamed;try{q.thisMain.userName=renamed;q.SaveGlobals()}catch(_e){}try{if(l.z39){l.z39._1=renamed;if(l.z39.J30&&l.z39.J30.E32)l.z39.J30.E32.E37(renamed)}}catch(_e){}try{this.pvpSendHello();if(P.connected)this.pvpSendNativeSpawn()}catch(_e){}}return}
      if(m.t==='admin-rename'){this._adminDisplayName=String(m.name||'Player').slice(0,24);try{q.thisMain.userName=this._adminDisplayName;q.SaveGlobals()}catch(_e){}try{if(l.z39){l.z39._1=this._adminDisplayName;if(l.z39.J30&&l.z39.J30.E32)l.z39.J30.E32.E37(this._adminDisplayName)}}catch(_e){};this.pvpSendHello();if(P.connected)this.pvpSendNativeSpawn();return}
      if(m.t==='admin-pvp-state'){this.adminPvpEnabled=!!m.enabled;try{q.diggerzAdminPvpEnabled=!!m.enabled}catch(_e){};return}
      if(m.t==='admin-background'){this.adminApplyBackgroundLocal(m.background|0);return}
      if(m.t==='admin-fake-leave'){var fp=this.pvpPeerForConnection(m.connectionId);if(fp){fp._adminHidden=true;var fe=this.pvpEntityForPeer(fp);if(fe){try{fe.a2=false}catch(_e){}try{if(fe.J30)fe.J30.a2=false}catch(_e){}try{fe.set_local_alp(0)}catch(_e){}}}else if(String(m.connectionId||'')===String(P.connectionId||'')&&l.z39){try{l.z39.a2=false;if(l.z39.J30)l.z39.J30.a2=false;l.z39.set_local_alp(0)}catch(_e){}}chat('^1'+String(m.name||'Player')+' has exited this area.');return}
      if(m.t==='admin-fake-return'){var fp2=this.pvpPeerForConnection(m.connectionId);if(fp2){fp2._adminHidden=false;var fe2=this.pvpEntityForPeer(fp2);if(fe2){try{fe2.a2=true}catch(_e){}try{if(fe2.J30)fe2.J30.a2=true}catch(_e){}try{fe2.set_local_alp(1)}catch(_e){}}}else if(String(m.connectionId||'')===String(P.connectionId||'')&&l.z39){try{l.z39.a2=true;if(l.z39.J30)l.z39.J30.a2=true;l.z39.set_local_alp(1)}catch(_e){}}chat('^2'+String(m.name||'Player')+'^7 is now here.');return}
      if(m.t==='admin-inventory-request'){this.pvpSend({t:'admin-inventory-data',requestId:String(m.requestId||''),slots:(this.state&&Array.isArray(this.state.slots)?this.state.slots:[]).slice(0,127).map(itemCopy)});return}
      if(m.t==='admin-inventory-action'){var act=String(m.action||''),slot=Math.max(0,Math.min(126,m.slot|0)),qty=Math.max(1,m.count|0),removed=[];if(this.state&&Array.isArray(this.state.slots)){if(act==='clear'){for(var ai=0;ai<this.state.slots.length;ai++){var old=this.state.slots[ai];if(old&&old.category&&old.count>0)removed.push(itemCopy(old));this.state.slots[ai]=emptyItem()}}else if(slot<this.state.slots.length){var cur=this.state.slots[slot];if(cur&&cur.category&&cur.count>0){var take=Math.min(qty,cur.count),part=itemCopy(cur);part.count=take;removed.push(part);if(cur.count<=take)this.state.slots[slot]=emptyItem();else cur.count-=take}}this.sendInventory();this.markDirty();this.save(true)}this.pvpSend({t:'admin-inventory-action-result',requestId:String(m.requestId||''),items:removed});return}
      if(m.t==='admin-inventory-data'){var rows=Array.isArray(m.slots)?m.slots:[],box=document.getElementById('admin-inventory');if(box){box.innerHTML='';for(var ri=0;ri<rows.length;ri++){var it=rows[ri];if(!it||!it.category||!it.count)continue;var row=document.createElement('div');row.style.cssText='padding:4px 0;border-bottom:1px solid rgba(255,255,255,.12)';row.textContent=(ri+1)+'. '+this.itemName(it.category|0,it.id|0)+' × '+(it.count|0);var rem=document.createElement('button');rem.textContent='Remove';rem.style.marginLeft='6px';(function(i,c,self){rem.onclick=function(){var n=prompt('How many?',String(c));if(n)self.adminInventoryAction(document.getElementById('admin-player').value,'remove',i,Math.max(1,parseInt(n,10)||1))}})(ri,it.count|0,this);row.appendChild(rem);var take=document.createElement('button');take.textContent='Take';take.style.marginLeft='4px';(function(i,c,self){take.onclick=function(){var n=prompt('How many?',String(c));if(n)self.adminInventoryAction(document.getElementById('admin-player').value,'take',i,Math.max(1,parseInt(n,10)||1))}})(ri,it.count|0,this);row.appendChild(take);box.appendChild(row)}var clear=document.createElement('button');clear.textContent='Clear Inventory';var self=this;clear.onclick=function(){if(confirm('Clear this inventory?'))self.adminInventoryAction(document.getElementById('admin-player').value,'clear',0,1)};box.appendChild(clear)}return}
      if(m.t==='admin-inventory-action-result'){if(m.action==='take'&&Array.isArray(m.items))for(var ti=0;ti<m.items.length;ti++){var got=m.items[ti];if(got&&got.category&&got.count)this.addItem(got.category|0,got.id|0,got.variant|0,got.count|0,got.extra|0,String(got.text||''));}this.sendInventory();this.markDirty();this.save(true);this.message('^2Inventory action completed.');return}
      if(m.t==='peer-left'){this.pvpRemovePeer(m.connectionId);return}
      if(m.t==='room-state'){
        // Stash the full snapshot so we can re-apply once the local world exists.
        this._pvpPendingRoomState=m;
        this._pvpWorldSynced=false;
        // Seed peer roster BEFORE local spawn so other players exist in the world first.
        try{
          var peerList=Array.isArray(m.peers)?m.peers:(Array.isArray(m.players)?m.players:[]);
          var peers=this.pvpEnsurePeers();
          for(var pi=0;pi<peerList.length;pi++){
            var pr=peerList[pi];
            if(!pr||!pr.connectionId||pr.connectionId===P.connectionId)continue;
            if(pr.fake)continue;
            var existing=peers[pr.connectionId];
            peers[pr.connectionId]={
              connectionId:pr.connectionId,
              name:String(pr.name||'Player'),
              id:existing&&existing.id?existing.id:null,
              info:pr,
              _fromRoster:true,
              adminEffects:Object.assign({god:false,fly:false,noclip:false,invis:false},pr.adminEffects||{}),
              adminModifiers:Object.assign({speed:1,jump:1,size:1,breakSpeed:1},pr.adminModifiers||{}),
              lastX:isFinite(+pr.x)?+pr.x:(existing&&existing.lastX),
              lastY:isFinite(+pr.y)?+pr.y:(existing&&existing.lastY)
            };
          }
          this.pvpRefreshLegacyPeer();
        }catch(_peerSeed){}
        this.pvpApplyRoomState(m);
        if(Number.isFinite(+m.adminBackground))this.adminApplyBackgroundLocal(+m.adminBackground);
        if(m.adminPvpOverride!=null){this.adminPvpEnabled=!!m.adminPvpOverride;try{q.diggerzAdminPvpEnabled=!!m.adminPvpOverride}catch(_e){}}
        // Retry applying the map a few times until the native world is ready.
        var self=this, tries=0;
        function retryWorldSync(){
          tries++;
          try{
            if(m.map&&(self.mode==='pvp'||self.mode==='digtrade'))self.pvpApplyBaseMap(m.map);
            if(Array.isArray(m.tiles)||Array.isArray(m.backgroundTiles)||Array.isArray(m.drops))self.pvpApplyRoomState(m);
            self._pvpWorldSynced=true;
            // Now that the map/items/peers are in, announce ourselves.
            try{if(self.pvpSendHello)self.pvpSendHello()}catch(_h){}
            try{if(P.connected&&self.pvpSendNativeSpawn)self.pvpSendNativeSpawn()}catch(_s){}
          }catch(_retry){
            if(tries<25)setTimeout(retryWorldSync,80);
          }
        }
        setTimeout(retryWorldSync,0);
        return
      }
      if(m.t==='chat'){var chatPeer=this.pvpPeerForConnection(m._serverFrom);if(chatPeer&&chatPeer.id){var id=chatPeer.id;this.enqueue(12,1,function(p){p.R8(id);p.R9(String(m.text||'').slice(0,180))})}return}
      if(m.t==='typing'){var typingPeer=this.pvpPeerForConnection(m._serverFrom);if(typingPeer&&typingPeer.id){var tid=typingPeer.id,active=!!m.active;this.enqueue(49,1,function(p){p.R8(tid);p.s0(active)})}return}
      if(m.t==='peer-state'){var statePeer=this.pvpPeerForConnection(m._serverFrom),se=statePeer&&this.pvpEntityForPeer(statePeer);if(se&&isFinite(+m.x)&&isFinite(+m.y)){var sx=(+m.x)*l._44,sy=(+m.y)*l._44;if(Math.hypot((se.b6-sx)/l._44,(se.b7-sy)/l._44)>1.25){try{se.l38(sx,sy)}catch(_e){se.b6=sx;se.b7=sy}}}return}
      if(m.t==='tile'){
        var tx=m.x|0,ty=m.y|0,tLayer=m.layer|0,tkey=tx+':'+ty+':'+tLayer;
        // Skip echo of our own optimistic placement if still pending.
        if(String(m._serverFrom||'')===String(P.connectionId||'') && this._diggerzPendingPlacements && this._diggerzPendingPlacements[tkey]) return;
        this._pvpApplyingTile=true;
        try{
          // Always force the visual/world update for remote place & mine.
          this.setTile(tx,ty,m.id|0,m.variant|0,tLayer);
          // Keep service state mirrors in sync for late logic.
          try{
            if(this.state&&this.state.tiles&&tLayer!==2){
              var at=tx+ty*128;
              if(at>=0&&at<this.state.tiles.length){
                this.state.tiles[at]=m.id|0;
                if(this.state.variants)this.state.variants[at]=(m.variant|0)&31;
              }
            }
            if(this.state&&this.state.backgroundTiles&&tLayer===2){
              var at2=tx+ty*128;
              if(at2>=0&&at2<this.state.backgroundTiles.length){
                this.state.backgroundTiles[at2]=m.id|0;
                if(this.state.backgroundVariants)this.state.backgroundVariants[at2]=(m.variant|0)&31;
              }
            }
          }catch(_st){}
        }finally{this._pvpApplyingTile=false}
        return
      }
      if(m.t==='drop-spawn'){this.pvpAddSharedDrop(m.drop);return}
      if(m.t==='drop-remove'){this.pvpRemoveSharedDrop(m.guid);return}
      if(m.t==='drop-award'){var d=m.drop||{};if(this.addItem(d.category|0,d.id|0,d.variant|0,Math.max(1,d.count|0),d.extra|0,String(d.text||''))<0){var x=l.z39?l.z39.b6/l._44:this.state.x,y=l.z39?l.z39.b7/l._44-.5:this.state.y;this.spawnDrop(d.category|0,d.id|0,Math.max(1,d.count|0),x,y,String(d.text||''),String(d.tier||''))}else{if(d.tier==='super'){var sn=this.itemName(d.category|0,d.id|0);this.message('^3SUPER RARE! ^7'+this.playerName()+' found '+sn+'!');this.centerMessage('^3SUPER RARE!\n^7'+sn)}else if(d.tier==='rare'){var rn=this.itemName(d.category|0,d.id|0);this.message('^9RARE ITEM! ^7'+this.playerName()+' found '+rn+'!');this.centerMessage('^9RARE ITEM!\n^7'+rn)}this.markDirty()}return}
      if(m.t==='damage'&&(P.mode==='pvp'||(P.mode==='digtrade'&&(this.adminPvpEnabled||(typeof q!=='undefined'&&q.diggerzAdminPvpEnabled))))){this.hurtLocalPlayer(Math.max(1,m.amount|0),m.source||'weapon');return}
      if(m.t==='health'){var hp=this.pvpPeerForConnection(m._serverFrom);if(hp&&hp.id){var hid=hp.id,current=+m.current||0,maximum=+m.maximum||3;this.enqueue(48,1,function(p){p.R8(hid);p.r8(current);p.r8(maximum)})}return}
      if(m.t==='death'){var dp=this.pvpPeerForConnection(m._serverFrom);if(dp&&dp.id){var did=dp.id,dx=+m.x||0,dy=+m.y||0;this.enqueue(46,1,function(p){p.R8(did);p.r8(dx);p.r8(0);p.r8(dy);p.R4(0)})}return}
      if(m.t==='respawn'){var rp=this.pvpPeerForConnection(m._serverFrom);if(rp&&rp.id){var rid=rp.id,rx=+m.x||12,ry=+m.y||16;this.enqueue(47,1,function(p){p.R8(rid);p.r8(rx);p.r8(0);p.r8(ry);p.s0(false)})}return}
      if(m.t==='attack'){this.pvpEchoPeerAttack(m);return}
      if(m.t==='trade-start'){this.pvpStartTrade(m);return}
      if(m.t==='trade-offer'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpTrade.remoteSlots=(Array.isArray(m.offer)?m.offer:[]).slice(0,3).map(itemCopy);while(this.pvpTrade.remoteSlots.length<3)this.pvpTrade.remoteSlots.push(emptyItem());this.pvpWriteContainer(this.pvpTrade.remoteGuid,this.pvpTrade.remoteSlots);return}
      if(m.t==='trade-partner-accepted'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpTrade.partnerAccepted=true;this.pvpTrade.locked=true;var sid=this.pvpTrade.sessionGuid;this.enqueue(169,1,function(p){p.R8(sid)});return}
      if(m.t==='trade-complete'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpCompleteTrade(m.receive);return}
      if(m.t==='trade-cancelled'&&this.pvpTrade&&m.tradeId===this.pvpTrade.id){this.pvpCancelTradeLocal(m.reason||'Cancelled.');return}
      if(m.t==='admin-item'){var ac=m.category|0,ai=m.id|0,cnt=Math.max(1,Math.min(999,m.count|0));if((ac===1||ac===2)&&ai>0){this.addItem(ac,ai,0,cnt,0,'');this.markDirty();this.save(true);this.message('^2Admin gave you '+cnt+' × '+this.itemName(ac,ai)+'.')}return}
      if(m.t==='admin-coins'){var amount=Math.max(1,Math.min(1000000,m.amount|0));this.state.coins=Math.max(0,(this.state.coins||0)+amount);this.sendCoins();this.markDirty();this.save(true);this.message('^2Admin gave you '+amount+' coins.');return}
      if(m.t==='admin-kill'){this.hurtLocalPlayer(999,'admin');return}
    };
    proto.pvpTick=function(){if(!window.DiggerzIsMultiplayer(this)||!P.connected)return;if(!P.service)P.attach(this);if(!l.z39)return;var eff=this.adminEffects||{},mods=this.adminModifiers||{speed:1,jump:1,size:1,breakSpeed:1};if(eff.fly&&!this.localDead){adminFlyApplyState(true)}if(eff.noclip&&!this.localDead&&!eff.fly){var now=Date.now(),dt=Math.min(.05,Math.max(.001,(now-(this._adminNoclipLast||now))/1000));this._adminNoclipLast=now;var dx=0,dy=0;try{if(q.KeyDown(65))dx-=1;if(q.KeyDown(68))dx+=1;if(q.KeyDown(87))dy-=1;if(q.KeyDown(83))dy+=1}catch(e){}if(dx||dy){var len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;try{l.z39.l38(l.z39.b6+dx*7*dt*l._44*(Number(mods.speed)||1),l.z39.b7+dy*7*dt*l._44*(Number(eff.speed)||1))}catch(e){l.z39.b6+=dx*7*dt*l._44;l.z39.b7+=dy*7*dt*l._44}this.state.x=l.z39.b6/l._44;this.state.y=l.z39.b7/l._44}}if(this.ticks%3===0)this.pvpSendNativeMovement()};
    var oldA16=proto.A16;proto.A16=function(){var r=oldA16.call(this);if(window.DiggerzIsMultiplayer(this))this.pvpTick();return r};
    var oldA12=proto.A12;proto.A12=function(){if(window.DiggerzIsMultiplayer(this))P.detach(this);return oldA12.call(this)};
    var oldA17=proto.A17;proto.A17=function(opcode,body,c){
      if(window.DiggerzIsMultiplayer(this)){
        if(opcode===49){var active=false;try{active=!!(body&&body.Q1&&body.Q1.b&&body.Q1.b[0])}catch(e){}this.pvpSend({t:'typing',active:active});return}
        if(opcode===211&&body&&P.mode==='digtrade'){try{var bytes=body.Q1.b,txt='';for(var bi=0;bi<bytes.length;bi++)txt+=String.fromCharCode(bytes[bi]);if(txt.indexOf('trade2:')>=0&&bytes.length>=16){var dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),gid=this.guid(dv.getInt32(0,true),dv.getInt32(4,true),dv.getInt32(8,true),dv.getInt32(12,true)),peer=this.pvpFindPeerByGuid(gid);if(peer){this.pvpSend({t:'trade-request',targetConnectionId:peer.connectionId});return}}}catch(e){}
        }
        if(opcode===170&&this.pvpTrade){if(!this.pvpTrade.localAccepted){this.pvpTrade.localAccepted=true;this.pvpTrade.locked=true;this.pvpSend({t:'trade-accept',tradeId:this.pvpTrade.id})}return}
        if(opcode===171&&this.pvpTrade){this.pvpSend({t:'trade-cancel',tradeId:this.pvpTrade.id});return}
      }
      return oldA17.call(this,opcode,body,c)
    };
    var oldSwap=proto.swap;proto.swap=function(packet){if(!window.DiggerzIsMultiplayer(this)||!this.pvpTrade)return oldSwap.call(this,packet);var start=packet.Q0,fromId=packet.Q6(),from=packet.Q9(),toId=packet.Q6(),to=packet.Q9(),tr=this.pvpTrade;if(tr.locked){this.message('^1Trade is locked after acceptance.');return}var fromPlayer=fromId.q2(this.playerId),toPlayer=toId.q2(this.playerId),fromOffer=fromId.q2(tr.localGuid),toOffer=toId.q2(tr.localGuid);if(!(fromPlayer||fromOffer)||!(toPlayer||toOffer)){packet.Q0=start;return oldSwap.call(this,packet)}var fromArr=fromPlayer?this.state.slots:tr.localSlots,toArr=toPlayer?this.state.slots:tr.localSlots;if(from<0||to<0||from>=fromArr.length||to>=toArr.length)return;if((fromOffer&&from>=3)||(toOffer&&to>=3))return;var hold=fromArr[from]||emptyItem();fromArr[from]=toArr[to]||emptyItem();toArr[to]=hold;this.sendInventory();this.pvpTradeOffer()};
    var oldSave=proto.save;proto.save=function(force){if(window.DiggerzIsMultiplayer(this)&&this.pvpTrade)return false;return oldSave.call(this,force)};
    var oldDropGuid=proto.dropGuid;proto.dropGuid=function(){if(window.DiggerzIsMultiplayer(this)&&this.playerId){var n=this.nextDrop++;return this.guid((this.playerId.P4^0x44525031)|0,n|0,(this.playerId.P6^0x53485244)|0,(this.playerId.P7^n)|0)}return oldDropGuid.call(this)};
    var oldSpawnDrop=proto.spawnDrop;proto.spawnDrop=function(category,id,count,x,y,text,tier){var before={},k;for(k in this.drops)before[k]=1;var r=oldSpawnDrop.call(this,category,id,count,x,y,text,tier);if(window.DiggerzIsMultiplayer(this)&&P.joined&&!this._pvpApplyingDrop){for(k in this.drops)if(!before[k]){var d=this.drops[k];this.pvpSend({t:'drop-spawn',drop:{guid:guidParts(d.guid),category:d.category|0,id:d.id|0,variant:0,count:d.count|0,extra:0,x:+d.x||0,y:+d.y||0,text:String(d.text||''),tier:String(d.tier||'')}})}}return r};
    var oldPickup=proto.pickup;proto.pickup=function(packet){if(window.DiggerzIsMultiplayer(this)&&P.joined){var guid=packet.Q6(),key=this.pvpGuidKey(guid),drop=this.drops[key];if(!drop||this.distanceToPlayer(drop.x,drop.y)>4)return;this.pvpSend({t:'drop-pickup',guid:guidParts(guid)});return}return oldPickup.call(this,packet)};
    var oldSendTest=proto.sendTestNpc;proto.sendTestNpc=function(){if(this.mode==='pvp')return;return oldSendTest.call(this)};
    var oldWorldName=proto.sendWorldName;proto.sendWorldName=function(){if(this.mode!=='pvp')return oldWorldName.call(this);var name=P.mode==='digtrade'?'Free Dig':'Battle Royale';this.enqueue(95,1,function(packet){packet.R9(name)})};
    var oldSendPlayer=proto.sendPlayer;proto.sendPlayer=function(){var r=oldSendPlayer.call(this);if(window.DiggerzIsMultiplayer(this)){P.attach(this);var self=this;setTimeout(function(){self.pvpSendHello()},150);setTimeout(function(){self.pvpSendHello()},1000);setTimeout(function(){self.pvpSendHello();if(P.connected)self.pvpSendNativeSpawn()},2500)}return r};
    var oldPlayerChat=proto.playerChat;proto.playerChat=function(text){var r=oldPlayerChat.call(this,text);if(window.DiggerzIsMultiplayer(this))this.pvpSend({t:'chat',text:String(text||'').slice(0,180)});return r};
    var oldSetTile=proto.setTile;proto.setTile=function(x,y,id,variant,layer){layer=layer==null?0:(layer|0);var r=oldSetTile.call(this,x,y,id,variant,layer);if(window.DiggerzIsMultiplayer(this)&&!this._pvpApplyingTile){var actor=this._diggerzPlacementActor||null;var sentNative=false;try{if(this.buildNativePacket&&P.sendNative){var packed=((id|0)&2047)|(((variant|0)&31)<<11);var packet=this.buildNativePacket(11,1,function(out){out.R0(x|0);out.R0(layer|0);out.R0(y|0);out.R2(packed);});sentNative=!!P.sendNative(packet)}}catch(_nativeTileErr){sentNative=false}if(!sentNative){this.pvpSend({t:'tile',x:x,y:y,id:id,variant:variant||0,layer:layer,px:actor&&isFinite(actor.x)?actor.x:null,py:actor&&isFinite(actor.y)?actor.y:null})}this._diggerzPlacementActor=null}return r};
    var oldDirect=proto.weaponDirectHit;proto.weaponDirectHit=function(fromX,fromY,toX,toY,attackType){var r=oldDirect.call(this,fromX,fromY,toX,toY,attackType);if((this.mode==='pvp'&&P.mode==='pvp')||(this.mode==='digtrade'&&P.mode==='digtrade'&&(this.adminPvpEnabled||(typeof q!=='undefined'&&q.diggerzAdminPvpEnabled)))){var peer=this.pvpRemoteHitLine(fromX,fromY,toX,toY);if(peer)this.pvpSend({t:'damage',targetConnectionId:peer.connectionId,amount:1,source:'weapon'})}return r};
    var oldImpact=proto.weaponImpactDamage;proto.weaponImpactDamage=function(x,y,impactType){var r=oldImpact.call(this,x,y,impactType);if((this.mode==='pvp'&&P.mode==='pvp')||(this.mode==='digtrade'&&P.mode==='digtrade'&&(this.adminPvpEnabled||(typeof q!=='undefined'&&q.diggerzAdminPvpEnabled)))){var peers=this.pvpEnsurePeers();for(var k in peers){var peer=peers[k],e=this.pvpEntityForPeer(peer);if(!e||!e.a2)continue;var px=e.b6/l._44,py=e.b7/l._44,dx=px-x,dy=py-y,hit=false;if(impactType===36)hit=Math.hypot(dx,dy)<=.95;else if(impactType===30)hit=Math.abs(dx)<=.9&&Math.abs(dy)<=.9;else if(impactType===24)hit=Math.abs(dx)<=1.7&&Math.abs(dy)<=1.7;else if(impactType===38)hit=Math.abs(dx)<=2.8&&Math.abs(dy)<=2.8;else if(impactType===40)hit=(Math.abs(dx)<=.8&&dy>=0&&dy<=3.4)||(Math.abs(dx)<=1.7&&Math.abs(dy-3)<=1.7);else hit=Math.hypot(dx,dy)<=2.35;if(hit)this.pvpSend({t:'damage',targetConnectionId:peer.connectionId,amount:1,source:'weapon'})}}return r};
    var oldHurt=proto.hurtLocalPlayer;proto.hurtLocalPlayer=function(amount,source){if(this.adminEffects&&this.adminEffects.god)return;var wasDead=!!this.localDead,r=oldHurt.call(this,amount,source);if(this.mode==='pvp'&&P.mode==='pvp'){var max=l.z39&&l.z39.N34||3,current=this.localHealth==null?(l.z39&&l.z39.N33||max):this.localHealth;this.pvpSend({t:'health',current:current,maximum:max});if(!wasDead&&this.localDead){var x=l.z39?l.z39.b6/l._44:this.state.x,y=l.z39?l.z39.b7/l._44:this.state.y;this.pvpSend({t:'death',x:x,y:y})}}return r};
    var oldRespawn=proto.respawnLocalPlayer;proto.respawnLocalPlayer=function(){var r=oldRespawn.call(this);if(this.mode==='pvp'&&P.mode==='pvp'){var x=l.z39?l.z39.b6/l._44:this.state.x,y=l.z39?l.z39.b7/l._44:this.state.y;this.pvpSend({t:'respawn',x:x,y:y});this.pvpSendHello();if(P.connected)this.pvpSendNativeSpawn()}return r};
    var oldAdminPlayers=proto.adminPlayers;proto.adminPlayers=function(){if(!window.DiggerzIsMultiplayer(this))return oldAdminPlayers.call(this);var out=[{name:this.playerName(),local:true}],seen={};seen[this.playerName()]=1;var peers=this.pvpEnsurePeers();for(var k in peers){var name=String(peers[k].name||'Player');if(!seen[name]){seen[name]=1;out.push({name:name,local:false})}}return out};
    proto.adminSpawnItem=function(category,id,count,targetName){if(!this.adminIsAdminAuthorized()||!window.DiggerzAdminSessionToken)return {ok:false,message:'Server admin authentication required.'};category|=0;id|=0;count=Math.max(1,Math.min(999,count|0));if((category!==1&&category!==2)||id<=0||id>2047)return {ok:false,message:'Invalid item.'};if(!P.joined||!P.connectionId)return {ok:false,message:'Admin item grants require the multiplayer server.'};var name=this.itemName(category,id),targetConnectionId='',displayName=String(targetName||'').trim();if(!displayName||displayName===this.playerName()){targetConnectionId=P.connectionId;displayName=this.playerName()}else{var peer=this.pvpFindPeerByName(displayName);if(!peer)return {ok:false,message:'Player not found.'};targetConnectionId=peer.connectionId}this.pvpSend({t:'admin-item',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:targetConnectionId,category:category,id:id,count:count});return {ok:true,message:'Requested '+count+' × '+name+' for '+displayName+'.'}};
    proto.adminSpawnCoins=function(amount,targetName){if(!this.adminIsAdminAuthorized()||!window.DiggerzAdminSessionToken)return {ok:false,message:'Server admin authentication required.'};amount=Math.max(1,Math.min(1000000,amount|0));if(!P.joined||!P.connectionId)return {ok:false,message:'Admin coin grants require the multiplayer server.'};var targetConnectionId='',displayName=String(targetName||'').trim();if(!displayName||displayName===this.playerName()){targetConnectionId=P.connectionId;displayName=this.playerName()}else{var peer=this.pvpFindPeerByName(displayName);if(!peer)return {ok:false,message:'Player not found.'};targetConnectionId=peer.connectionId}this.pvpSend({t:'admin-coins',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:targetConnectionId,amount:amount});return {ok:true,message:'Requested '+amount+' coins for '+displayName+'.'}};
    var oldAdminKill=proto.adminKillPlayer;proto.adminKillPlayer=function(name){if(!this.adminIsAdminAuthorized()||!window.DiggerzAdminSessionToken)return {ok:false,message:'Server admin authentication required.'};if(!P.joined||!P.connectionId)return {ok:false,message:'Admin kill requires the multiplayer server.'};name=String(name||'').trim();var targetConnectionId='',displayName=name;if(!name||name===this.playerName()){targetConnectionId=P.connectionId;displayName=this.playerName()}else{var peer=this.pvpFindPeerByName(name);if(!peer)return {ok:false,message:'Player not found.'};targetConnectionId=peer.connectionId}this.pvpSend({t:'admin-kill',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:targetConnectionId});return {ok:true,message:'Requested kill for '+displayName+'.'}};
    P.hooksInstalled=true;
    return true
  }
  P.installRuntimeHooks=installRuntimeHooks;
  var hookTimer=setInterval(function(){if(installRuntimeHooks()){clearInterval(hookTimer);if(P.requested&&!P.joined)setStatus('Connecting to '+(P.mode==='pvp'?'Battle':'Dig+Trade')+' server…')}},50);

  function prepareMenu(){
    if(P.menu&&P.menu.d52){q.thisMain.userName=P.menu.d52.q35;q.SaveGlobals()}
  }
  function startGame(){
    if(P.starting)return;
    // Do not gate map entry on WebSocket matchmaking. The first player should be able
    // to enter and play immediately while the server connection establishes behind the scenes.
    installRuntimeHooks();
    if(!P.menu){setStatus('Title-screen menu reference is missing. Return to the title screen and try again.');return}
    P.starting=true;overlay.style.display='none';
    try{
      prepareMenu();
      q.player.l7=!1;
      l.A45=!1;l.A46=(P.mode==='digtrade');l.A47=!1;l.A48=!1;l.A40=null;
      q.diggerzPvpRequested=(P.mode==='pvp');
      q.diggerzPeerMode=P.mode;
      q.diggerzDigTradeRequested=(P.mode==='digtrade');
      q.diggerzShopRequested=!1;
      dbg('MP-005','launch flags mode='+P.mode+' A46='+l.A46+' pvpRequested='+q.diggerzPvpRequested+' digTradeRequested='+q.diggerzDigTradeRequested);
      q.mClicked=!1;
      // Follow the same proven title-screen transition used by Build 21.17.
      P.menu._1='clicked';
      if(P.menu.d52)P.menu.d52.a0=1;
      try{window.document.getElementById('info').style.visibility='visible'}catch(_e){}
      try{window.document.getElementById('changes').style.visibility='visible'}catch(_e){}
      try{window.document.getElementById('diggerz-io_300x250').style.visibility='hidden'}catch(_e){}
      try{P.menu.F6(5,1,0,1000);P.menu.F8(2,1)}catch(_e){}
      P.menu.a0=1;
      q.InitMainGame();
    }catch(e){
      P.starting=false;overlay.style.display='none';
      var msg='Could not enter multiplayer: '+(e&&e.message||e);
      setStatus(msg);
      try{if(P.menu)new vb(P.menu,'',msg,new Cd,vb.F39)}catch(_e){}
      console.error(e)
    }
  }

  window.DiggerzBeginBackgroundMatchmaking=function(mode,menu){if(menu)P.menu=menu;show('auto',mode||P.mode)};
  window.DiggerzOpenPvp22=function(side,mode){show(side,mode||P.mode)};
  document.getElementById('pvp22-close').onclick=function(){P.requested=false;overlay.style.display='none';closeSocket(true)};
  loadServerUrl();setMode('pvp');
}());
