
(function(){
  function install(){
    try{
      if(typeof l==='undefined'||!l.z38){setTimeout(install,100);return}
      if(window.__diggerzNativeUiVisibilityFix)return;
      window.__diggerzNativeUiVisibilityFix=true;
      function walk(node,seen){
        if(!node||seen.indexOf(node)>=0)return;
        seen.push(node);
        var kids=node._9;
        if(kids&&kids.length){
          for(var i=0;i<kids.length;i++){
            var c=kids[i];
            if(!c)continue;
            try{
              // Native radial/shop/trade item nodes are X objects: category 2,
              // with a real image and a live UI container parent.
              if(c.a4===2 && c._5 && !c.T40 && !c.t47){
                var p=c._2;
                var activeParent=!!(p&&p.d34&&p.B30);
                if(activeParent && p.a0===0 && p.a2!==false)c.a2=true;
              }
            }catch(e0){}
            walk(c,seen);
          }
        }
      }
      function tick(){
        try{
          var seen=[];
          if(l.z38&&l.z38._9){
            for(var i=0;i<l.z38._9.length;i++)walk(l.z38._9[i],seen);
          }
        }catch(e){}
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }catch(e){setTimeout(install,250)}
  }
  install();
})();
