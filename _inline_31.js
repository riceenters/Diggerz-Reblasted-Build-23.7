
(function(){
  // When an open native inventory/trade container is rebuilt, q44() creates
  // fresh item X children. Those children begin hidden; q46() is the normal
  // native pass that applies their visible state. Without it the container
  // frame remains while its interactive contents disappear.
  function install(){
    try{
      if(typeof l==='undefined'||!l.z38||typeof l.z38.V37!=='function'){
        setTimeout(install,100); return;
      }
      var proto=Object.getPrototypeOf(l.z38);
      if(!proto||proto.__diggerzUiContainerRefreshFix)return;
      var old=proto.V37;
      function collect(node,out,depth,seen){
        if(!node||depth>6||out.length>64)return;
        if(seen.indexOf(node)>=0)return;
        seen.push(node);
        try{
          if(typeof node.q46==='function'&&node.B30&&node.d34)out.push(node);
        }catch(e0){}
        var kids=node._9;
        if(!kids||!kids.length)return;
        for(var i=0;i<kids.length;i++)collect(kids[i],out,depth+1,seen);
      }
      proto.V37=function(packet){
        var r=old.apply(this,arguments);
        try{
          var list=[],seen=[];
          collect(this,list,0,seen);
          if(l.z39&&l.z39.n38)collect(l.z39.n38,list,0,seen);
          for(var i=0;i<list.length;i++){
            var sc=list[i];
            if(!sc||sc.a0!==0||typeof sc.q46!=='function')continue;
            try{sc.q46(null,!1)}catch(e1){}
          }
        }catch(e2){}
        return r;
      };
      proto.__diggerzUiContainerRefreshFix=true;
    }catch(e){setTimeout(install,250)}
  }
  install();
})();
