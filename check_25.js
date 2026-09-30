
(function(){
  function install(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService,q=window.q,l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!q||!l){setTimeout(install,50);return}
    var proto=DS.prototype;if(proto.__admin2406)return;proto.__admin2406=true;
    function authorized(self){return self&&self.adminIsAdminAuthorized&&self.adminIsAdminAuthorized()&&window.DiggerzAdminSessionToken}
    function peerFor(self,name){var n=String(name||'').trim();if(!n)return null;if(n===self.playerName())return {connectionId:P.connectionId,name:n,fake:false};return self.pvpFindPeerByName?n?self.pvpFindPeerByName(n):null:null}
    proto.adminControlStart=function(name){if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};var peer=peerFor(this,name);if(!peer)return {ok:false,message:'Player not found.'};if(peer.connectionId===P.connectionId)return {ok:false,message:'You cannot control yourself.'};this._adminControlRequested=true;this.pvpSend({t:'admin-control-start',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:peer.connectionId});return {ok:true,message:'Control requested for '+peer.name+'.'}};
    proto.adminControlStop=function(){if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};var c=this._adminControl&&this._adminControl.connectionId;this.pvpSend({t:'admin-control-stop',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:c||''});return {ok:true,message:'Control stopped.'}};
    proto.adminChatAs=function(name,text){if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};var peer=peerFor(this,name);if(!peer)return {ok:false,message:'Player not found.'};text=String(text||'').trim().slice(0,180);if(!text)return {ok:false,message:'Message is empty.'};this.pvpSend({t:'admin-chat-as',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:peer.connectionId,text:text});return {ok:true,message:'Message sent as '+peer.name+'.'}};
    proto.adminFakePlayerSpawn=function(name){if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};this.pvpSend({t:'admin-fake-player-spawn',adminToken:window.DiggerzAdminSessionToken,name:String(name||'Fake Player').trim().slice(0,24)});return {ok:true,message:'Fake player spawn requested.'}};
    proto.adminFakePlayerRemove=function(name){if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};var peer=peerFor(this,name);if(!peer||!peer.fake)return {ok:false,message:'Select a fake player first.'};this.pvpSend({t:'admin-fake-player-remove',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:peer.connectionId});return {ok:true,message:'Fake player removed.'}};
    proto.adminFakePlayerRemoveAll=function(){if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};this.pvpSend({t:'admin-fake-player-remove-all',adminToken:window.DiggerzAdminSessionToken});return {ok:true,message:'All fake players removed.'}};
    proto.adminLoadSelectedMap=function(name){
      if(!authorized(this))return {ok:false,message:'Server admin authentication required.'};
      var self=this,room=String(P.room||'').trim().toUpperCase(),token=window.DiggerzAdminSessionToken;
      if(!room)return {ok:false,message:'Join a multiplayer room first.'};
      fetch('/api/admin/maps',{headers:{Authorization:'Bearer '+token},cache:'no-store'}).then(function(r){
        return r.json().then(function(d){
          if(!r.ok||!d.ok)throw new Error(d.error||'map list failed');
          var found=(d.maps||[]).find(function(m){return String(m.name)===String(name)});
          if(!found)throw new Error('Map not found.');
          return fetch('/api/admin/map/apply',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({roomCode:room,map:found.map})});
        });
      }).then(function(r){
        return r.json().then(function(d){
          if(!r.ok||!d.ok)throw new Error(d.error||'map apply failed');
          self.message('^2Loaded '+d.mapName+' for everyone.');
        });
      }).catch(function(e){self.message('^1Map load failed: ^7'+e.message)});
      return {ok:true,message:'Loading '+String(name)+' for everyone…'};
    };
    proto.adminResetMap=function(){return this.adminLoadSelectedMap('Default Map')};

    function setEntityHidden(e,hidden){if(!e)return;try{e.a0=hidden?1:0}catch(_e){}try{e.a2=hidden?false:true}catch(_e){}try{if(e.J30)e.J30.a2=hidden?false:true}catch(_e){}try{if(e.set_alp)e.set_alp(hidden?0:1);if(e.set_local_alp)e.set_local_alp(hidden?0:1)}catch(_e){}}
    function applyRemoteFly(peer){if(!peer)return;var e=proto.pvpEntityForPeer.call(this,peer);if(!e)return;var fly=!!(peer.adminEffects&&peer.adminEffects.fly);try{var body=e.b33&&e.b33.tBJ;if(body){body.gravMass=fly?-1:2;if(fly&&e.i32)e.i32=oa.MODE_JUMPING;else if(!fly&&e.i32)e.i32=oa.MODE_IDLE}}catch(_e){}}
    var oldPeerEffects=proto.adminApplyPeerEffects;proto.adminApplyPeerEffects=function(peer){if(oldPeerEffects)try{oldPeerEffects.call(this,peer)}catch(_e){};var e=this.pvpEntityForPeer(peer);if(e){setEntityHidden(e,!!(peer&&peer.adminEffects&&peer.adminEffects.invis));applyRemoteFly.call(this,peer)}if(peer&&peer._adminHidden&&e)setEntityHidden(e,true)};
    var oldEffects=proto.adminApplyEffects;proto.adminApplyEffects=function(effects){if(oldEffects)oldEffects.call(this,effects);var e=l.z39;if(e&&this.adminEffects){setEntityHidden(e,!!this.adminEffects.invis)}};

    function syncFakeEntity(self,p,e,hard){
      if(!e||!p||!p.fake)return;
      var x=(Number(p.lastX)||0)*l._44, y=(Number(p.lastY)||2)*l._44;
      try{
        var body=e.b33&&e.b33.tBJ;
        if(body){
          body.gravMass=2;
          body.wrap_vel||body.setupVelocity();
          if(body.wrap_vel&&body.wrap_vel.tBJ){
            body.wrap_vel.tBJ.x=(Number(p.vx)||0)*l._44;
            body.wrap_vel.tBJ.y=(Number(p.vy)||0)*l._44;
          }
        }
      }catch(_e){}
      // Server sends authoritative samples, but the native body remains dynamic so the
      // fake player falls and collides like a real player between samples.
      if(hard){try{e.l38(x,y)}catch(_e){try{e.b6=x;e.b7=y}catch(__e){}}}
      try{e.i32=(Number(p.vx)||0)?oa.MODE_WALKING:((Number(p.vy)||0)<-0.1?oa.MODE_JUMPING:oa.MODE_IDLE)}catch(_e){}
    }
    function fakeAdd(self,player){
      if(!player||!player.connectionId)return;
      var peers=self.pvpEnsurePeers(),p=peers[player.connectionId];
      if(!p){
        p={connectionId:String(player.connectionId),name:String(player.name||'Fake Player'),id:self.guidFromParts(player.id||[0,0,0,0]),info:player,fake:true,adminEffects:{god:false,fly:false,noclip:false,invis:false},lastX:+player.x||0,lastY:+player.y||2};
        peers[p.connectionId]=p;
      }else{
        p.name=String(player.name||p.name);p.info=player;p.fake=true;
        p.lastX=Number.isFinite(+player.x)?+player.x:p.lastX;
        p.lastY=Number.isFinite(+player.y)?+player.y:p.lastY;
        if(player.id)p.id=self.guidFromParts(player.id);
      }
      self.pvpRefreshLegacyPeer();
      // The server now sends the exact native opcode-5 spawn packet used for a real
      // player. Do NOT manufacture/inject a second local spawn here; that caused the
      // old fake implementation to create duplicate/invisible entities.
    }
    function fakeRemove(self,cid){var peers=self.pvpEnsurePeers(),p=peers[cid];if(!p)return;try{if(p.id)self.enqueue(3,1,function(out){out.R8(p.id)})}catch(_e){}delete peers[cid];self.pvpRefreshLegacyPeer()}
    var oldRoom=proto.pvpApplyRoomState;proto.pvpApplyRoomState=function(m){var r=oldRoom.call(this,m);if(m&&Array.isArray(m.fakePlayers))for(var i=0;i<m.fakePlayers.length;i++)fakeAdd(this,m.fakePlayers[i]);return r};
    var oldReceive=proto.pvpReceive;proto.pvpReceive=function(m){
      if(!m)return;
      if(m.t==='hello'){var hr=oldReceive.call(this,m);var hp=this.pvpPeerForConnection(m._serverFrom);if(hp){this.adminApplyPeerEffects(hp)}return hr}
      if(m.t==='admin-fake-player-add'){fakeAdd(this,m.player||{});return}
      if(m.t==='admin-fake-player-remove'){fakeRemove(this,String(m.connectionId||''));return}
      if(m.t==='admin-fake-player-state'){var fp=this.pvpPeerForConnection(m.connectionId);if(fp){fp.lastX=Number.isFinite(+m.x)?+m.x:fp.lastX;fp.lastY=Number.isFinite(+m.y)?+m.y:fp.lastY;if(fp.info){fp.info.x=fp.lastX;fp.info.y=fp.lastY;fp.info.vx=Number(m.vx)||0;fp.info.vy=Number(m.vy)||0;}}return}
      if(m.t==='admin-map-replaced'){try{if(m.map)this.pvpApplyBaseMap(m.map)}catch(_e){}return}
      if(m.t==='admin-fake-leave'||m.t==='admin-fake-return'){var fl=this.pvpPeerForConnection(m.connectionId);var fle=fl&&this.pvpEntityForPeer(fl);if(fl){fl._adminHidden=m.t==='admin-fake-leave';setEntityHidden(fle,fl._adminHidden)}if(String(m.connectionId||'')===String(P.connectionId||''))setEntityHidden(l.z39,m.t==='admin-fake-leave');return}
      if(m.t==='admin-being-controlled'){this._beingControlled=true;this.message('^6You are being controlled by '+String(m.controllerName||'an administrator')+'.');return}
      if(m.t==='admin-control-released'){this._beingControlled=false;this.message('^2Control released.');return}
      if(m.t==='admin-control-started'){var cp=this.pvpPeerForConnection(m.connectionId);this._adminControl={connectionId:String(m.connectionId||''),name:String(m.name||'Player'),fake:!!m.fake,x:+m.x||0,y:+m.y||1,vy:0,lastSent:0,jumpLatch:false};this._adminControlRequested=false;function cameraTo(){var ent=cp&&this.pvpEntityForPeer(cp);if(ent&&l.z38){try{l.z38.s38=ent;l.z38.t39=ent.b6;l.z38.T30=ent.b7}catch(_e){}}}cameraTo.call(this);this.message('^6Controlling '+this._adminControl.name+'. WASD to move, W jumps.');return}
      if(m.t==='admin-control-stopped'){this._adminControl=null;this._adminControlRequested=false;try{if(l.z38&&l.z39){l.z38.s38=l.z39;l.z38.t39=l.z39.b6;l.z38.T30=l.z39.b7}}catch(_e){}this.message('^2Stopped controlling player.');return}
      if(m.t==='chat'&&m.systemPresence){try{this.message(String(m.text||''))}catch(_e){}return}
      if(m.t==='admin-peer-visibility'){var vp=this.pvpPeerForConnection(m.connectionId);if(vp){vp._adminHidden=!!m.hidden;var ve=this.pvpEntityForPeer(vp);if(ve)setEntityHidden(ve,!!m.hidden)}return}
      if(m.t==='admin-effect'){var ap=this.pvpPeerForConnection(m.connectionId);if(ap){ap.adminEffects=Object.assign({god:false,fly:false,noclip:false,invis:false},m.effects||{});this.adminApplyPeerEffects(ap)}return oldReceive.call(this,m)}
      return oldReceive.call(this,m)
    };
    // Final movement/control tick. Server is authoritative for controlled players.
    var oldTick=proto.pvpTick;proto.pvpTick=function(){var r=oldTick.call(this);if(!window.DiggerzIsMultiplayer(this)||!P.connected)return r;
      if(this._beingControlled&&l.z39){try{var b=l.z39.b33&&l.z39.b33.tBJ;if(b){b.wrap_vel||b.setupVelocity();b.wrap_vel.tBJ.x=0;b.wrap_vel.tBJ.y=0}}catch(_e){}}
      var c=this._adminControl;if(c){var peer=this.pvpPeerForConnection(c.connectionId),ent=peer&&this.pvpEntityForPeer(peer);if(!ent){return r}var dt=Math.min(.05,Math.max(.001,(Date.now()-(this._adminControlLast||Date.now()))/1000));this._adminControlLast=Date.now();var ax=0;try{if(q.KeyDown(65))ax-=1;if(q.KeyDown(68))ax+=1}catch(_e){}var speed=7;c.x=Number(ent.b6)/l._44;c.y=Number(ent.b7)/l._44;c.x+=ax*speed*dt;var grounded=c.y>=17.5;if(grounded&&c.y<18)c.y=18;if(!c.jumpLatch&&q.KeyDown(87)&&grounded){c.vy=-8;c.jumpLatch=true}if(!q.KeyDown(87))c.jumpLatch=false;c.vy=(Number(c.vy)||0)+18*dt;c.y+=c.vy*dt;if(c.y>34){c.y=1;c.vy=0}if(q.KeyDown(83)&&!grounded)c.vy+=10*dt;c.x=Math.max(1,Math.min((this.state.width||128)-1,c.x));try{ent.l38(c.x*l._44,c.y*l._44)}catch(_e){ent.b6=c.x*l._44;ent.b7=c.y*l._44}try{ent.i32=ax?oa.MODE_WALKING:oa.MODE_IDLE}catch(_e){}try{if(l.z38){l.z38.s38=ent;l.z38.t39=ent.b6;l.z38.T30=ent.b7}}catch(_e){}if(Date.now()-(c.lastSent||0)>50){c.lastSent=Date.now();this.pvpSend({t:'admin-control-state',adminToken:window.DiggerzAdminSessionToken,targetConnectionId:c.connectionId,x:c.x,y:c.y,vx:ax*speed,vy:c.vy})}}
      return r};
    // Keep admin room/token available to the map editor.
    setInterval(function(){try{if(P.room)localStorage.setItem('diggerzAdminRoomCode',String(P.room));if(window.DiggerzAdminSessionToken)localStorage.setItem('diggerzAdminSessionToken',window.DiggerzAdminSessionToken)}catch(e){}},1000);
  }
  install();
}());
