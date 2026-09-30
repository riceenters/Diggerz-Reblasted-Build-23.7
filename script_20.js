
(function(){
  function install(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService,l=window.l;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled||!l){setTimeout(install,50);return}
    var proto=DS.prototype;
    if(proto.__build233StabilityHotfix)return;
    proto.__build233StabilityHotfix=true;

    // High-player-count stability: native movement remains the smooth primary
    // path. JSON state is only a repair fallback, and aim is only useful while
    // a real weapon (j35) is equipped. This removes redundant traffic that
    // multiplied badly once several players shared a room.
    if(!P.__trafficHotfix233){
      P.__trafficHotfix233=true;
      var rawSend=P.send,lastStateAt=0,lastAimAt=0;
      P.send=function(m){
        if(!m||!m.t)return rawSend(m);
        var now=Date.now();
        if(m.t==='state'){
          if(now-lastStateAt<250)return true;
          lastStateAt=now;
        }else if(m.t==='aim'){
          var weapon=!!(l.z39&&l.z39.j35);
          if(!weapon)return true;
          if(now-lastAimAt<90)return true;
          lastAimAt=now;
          m=Object.assign({},m,{weapon:true});
        }
        return rawSend(m)
      };
    }

    // Roster reconciliation: if a disconnect packet gets lost or a socket dies
    // uncleanly, the server's authoritative room snapshot removes stale peers.
    var previousReceive=proto.pvpReceive;
    proto.pvpReceive=function(m){
      if(m&&m.t==='room-roster'&&Array.isArray(m.players)){
        var live={},selfId=String(P.connectionId||'');
        for(var i=0;i<m.players.length;i++){
          var cid=String(m.players[i]&&m.players[i].connectionId||'');
          if(cid)live[cid]=true;
        }
        var peers=this.pvpEnsurePeers?this.pvpEnsurePeers():{};
        for(var key in peers){
          if(key!==selfId&&!live[key]){
            try{this.pvpRemovePeer(key)}catch(e){}
          }
        }
        return;
      }
      // Only weapon-tagged cursor aim should rotate another player's arm.
      if(m&&m.t==='aim'&&m.weapon!==true)return;
      return previousReceive.call(this,m)
    };
  }
  install();
}());
