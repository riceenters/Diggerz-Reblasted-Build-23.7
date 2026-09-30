
(function(){
  function install(){
    var P=window.DiggerzPvp22,DS=window.DiggerzService;
    if(!P||!DS||!DS.prototype||!P.hooksInstalled){setTimeout(install,50);return}
    if(P.__build235Net)return;P.__build235Net=true;
    var rawNative=P.sendNative,lastNativeAt=0;
    P.sendNative=function(packet){
      var s=P.socket;if(!s||s.readyState!==1)return false;
      var op=0;try{op=new DataView(packet.Q1.b.buffer,packet.Q1.b.byteOffset,packet.Q1.b.byteLength).getUint16(0,true)}catch(e){}
      if(op===6){var now=Date.now();if(now-lastNativeAt<66)return true;lastNativeAt=now;if((s.bufferedAmount||0)>131072)return true}
      else if((s.bufferedAmount||0)>524288)return false;
      return rawNative(packet)
    };
    var rawSend=P.send,lastAimAt=0;
    P.send=function(m){var s=P.socket;if(s&&s.readyState===1&&(s.bufferedAmount||0)>262144&&m&&(m.t==='state'||m.t==='aim'))return true;if(m&&m.t==='aim'){var now=Date.now();if(now-lastAimAt<120)return true;lastAimAt=now}return rawSend(m)};
  }
  install();
}());
