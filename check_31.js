
(function(){
  // MENU-ONLY BKND SELECTOR
  // The title screen's own Cf class owns the real backdrop as title.d34.
  // We replace that exact native object instead of creating a second overlay.
  // This keeps T31()/h2()/render ordering using the game's normal BKND path.
  window.DiggerzLocalBkndData = {
    atlas: "assets/bknd.png",
    version: 1,
    themes: [
      {id:0,name:"Mountains"},
      {id:1,name:"Grey"},
      {id:2,name:"Sunset"},
      {id:3,name:"Moon"},
      {id:4,name:"Icy Mountains"},
      {id:5,name:"Clouds"},
      {id:6,name:"Background 6"},
      {id:7,name:"Background 7"},
      {id:8,name:"Green Screen"},
      {id:9,name:"Beta Bknd"}
    ]
  };
  window.DiggerzMenuBgList = window.DiggerzLocalBkndData.themes.map(function(x){
    return {name:x.name,theme:x.id};
  });

  window.DiggerzGetMenuBgIndex=function(){
    try{
      var n=parseInt(localStorage.getItem("diggerz.menuBg.v1")||"0",10);
      if(!isFinite(n)||n<0||n>=window.DiggerzMenuBgList.length)n=0;
      return n;
    }catch(e){return 0;}
  };

  function findTitle(){
    try{
      if(window.q&&q.GetChildByType&&window.v&&v.C55){
        var a=q.GetChildByType(v.C55); if(a)return a;
      }
    }catch(e){}
    try{
      if(window.q&&q.children)for(var i=0;i<q.children.length;i++){
        var c=q.children[i];
        if(c&&c._1==="title_screen")return c;
      }
    }catch(e){}
    return null;
  }

  function ensureBkndAtlas(){
    // The game already preloads this atlas. The local file is also shipped as
    // a fallback so this customization never depends on a server request.
    try{
      if(typeof $c!=="undefined" && $c.getBitmapData){
        var bmp=$c.getBitmapData(window.DiggerzLocalBkndData.atlas,false);
        if(bmp && typeof sa!=="undefined") sa.bmd=bmp;
      }
    }catch(e){}
  }

  window.DiggerzApplyMenuBackground=function(forceIdx){
    try{
      var list=window.DiggerzMenuBgList||[];
      if(!list.length)return false;
      var idx=forceIdx==null?window.DiggerzGetMenuBgIndex():forceIdx|0;
      idx=Math.max(0,Math.min(list.length-1,idx));
      localStorage.setItem("diggerz.menuBg.v1",String(idx));
      window.__diggerzMenuBgIdx=idx;

      // Never touch the multiplayer/world BKND.
      try{if(typeof l!=="undefined"&&l&&l.z38)return false;}catch(eWorld){}

      var title=findTitle();
      if(!title||typeof cg!=="function"){
        setTimeout(function(){window.DiggerzApplyMenuBackground(idx)},200);
        return false;
      }

      ensureBkndAtlas();

      // If this exact native d34 is already selected, leave it alone.
      if(title.d34 && title.d34._diggerzMenuTheme===idx && !title.d34.a0){
        return true;
      }

      // IMPORTANT: Cf/T31 uses title.d34 and f4(cg). Replace that exact field.
      // Do not create a parallel overlay; the old v40 approach could leave the
      // original cg(0) as the backdrop T31() continued to find.
      var old=title.d34;
      if(old){
        try{old.a0=1;}catch(e1){}
        try{var oi=title._9.indexOf(old);if(oi>=0)title._9.splice(oi,1);}catch(e2){}
      }

      var fresh=new cg(idx);
      fresh._diggerzMenuTheme=idx;
      fresh._1="diggerz_menu_bknd";
      fresh.D7(title);
      fresh.A7=q.CENTERX;
      fresh.A8=q.CENTERY;
      fresh.a0=0;

      title.d34=fresh;
      if(title._9){
        title._9.unshift(fresh);
      }

      // Match the native title resize/layout path.
      try{if(typeof fresh.h2==="function")fresh.h2();}catch(e3){}
      window.__diggerzMenuCg=fresh;
      window.__diggerzMenuCgTheme=idx;
      return true;
    }catch(e){
      try{console.warn("[Menu BKND]",e);}catch(x){}
      return false;
    }
  };

  window.DiggerzCycleMenuBackground=function(){
    var list=window.DiggerzMenuBgList||[];
    if(!list.length)return 0;
    var n=(window.DiggerzGetMenuBgIndex()+1)%list.length;
    window.DiggerzApplyMenuBackground(n);
    return n;
  };

  // Initial selection. The retry is only for startup ordering.
  [150,700,1500,3000].forEach(function(ms){
    setTimeout(function(){window.DiggerzApplyMenuBackground();},ms);
  });
})();
