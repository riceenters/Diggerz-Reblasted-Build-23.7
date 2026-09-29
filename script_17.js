
(function(){
  function install(){
    var P=window.DiggerzPvp22, DS=window.DiggerzService, q=window.q, l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!q||!l){setTimeout(install,50);return}
    var proto=DS.prototype;
    if(proto.__bugfix232)return; proto.__bugfix232=true;

    // Keepalive: background tabs still ping + send a movement snapshot so the server does not idle-kick.
    if(!P.__keepaliveInstalled){
      P.__keepaliveInstalled=true;
      setInterval(function(){
        try{
          if(!P.requested||!P.joined||!P.socket||P.socket.readyState!==1)return;
          P.send({t:'ping',ts:Date.now()});
          if(P.service&&P.service.pvpSendNativeMovement)P.service.pvpSendNativeMovement();
        }catch(e){}
      },4000);
      document.addEventListener('visibilitychange',function(){
        try{
          if(document.hidden){
            if(P.joined&&P.socket&&P.socket.readyState===1)P.send({t:'ping',ts:Date.now(),hidden:true});
          }else if(P.joined&&P.service){
            if(P.service.pvpSendHello)P.service.pvpSendHello();
            if(P.service.pvpSendNativeMovement)P.service.pvpSendNativeMovement();
            if(P.service.pvpSendNativeSpawn)P.service.pvpSendNativeSpawn();
          }
        }catch(e){}
      });
    }

    // Battle barrier is drawn by install230 renderBorders (slides after shrink countdown).
    // Do not strip those elements — previous builds hid them and made shrink look broken.
    var dead=document.getElementById('diggerz-nofriend-border-style');
    if(dead) try{dead.remove()}catch(e){}

    // Remember last known positions for off-screen teleport + extra leave cleanup.
    var prevRecv=proto.pvpReceive;
    proto.pvpReceive=function(m){
      if(m&&m.t==='hello'&&m._serverFrom){
        var peers=this.pvpEnsurePeers(), peer=peers[m._serverFrom];
        if(peer){
          peer.info=m;
          if(isFinite(+m.x))peer.lastX=+m.x;
          if(isFinite(+m.y))peer.lastY=+m.y;
        }
      }
      if(m&&m.t==='peer-left'){
        // UI-safe peer removal. The normal peer bookkeeping path handles the peer;
        // do not directly destroy native display objects here because that can
        // corrupt the shared native UI tree (inventory/shop/trade contents).
      }
      return prevRecv.call(this,m);
    };

    // Case-insensitive peer name lookup for admin tools.
    var prevFind=proto.pvpFindPeerByName;
    proto.pvpFindPeerByName=function(name){
      name=String(name||'').trim();
      if(!name)return null;
      var exact=prevFind?prevFind.call(this,name):null;
      if(exact)return exact;
      var lower=name.toLowerCase(), peers=this.pvpEnsurePeers();
      for(var k in peers){ var p=peers[k]; if(p&&String(p.name||'').toLowerCase()===lower)return p; }
      return null;
    };

    // Stick admin PvP flag on both service + global.
    var prevSet=proto.adminSetPvp;
    if(typeof prevSet==='function'){
      proto.adminSetPvp=function(enabled){
        var r=prevSet.call(this,enabled);
        this.adminPvpEnabled=!!enabled;
        try{q.diggerzAdminPvpEnabled=!!enabled}catch(e){}
        return r;
      };
    }
  }
  install();
}());
