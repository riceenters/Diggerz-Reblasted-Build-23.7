
(function(){
  window.DiggerzMenuBgList = [
    { name: "Default (clear)", key: "title", alpha: 0 },
    { name: "Grey", key: "grey", alpha: 1 },
    { name: "Space", key: "space", alpha: 1 }
  ];
  function bgAsset(key) {
    try {
      if (key === "grey" && sa.GREY_BKND_PNG) return sa.GREY_BKND_PNG();
      if (key === "space" && sa.SPACE_BKND_PNG) return sa.SPACE_BKND_PNG();
      if (sa.TITLE_BKND_PNG) return sa.TITLE_BKND_PNG();
    } catch (e) {}
    return null;
  }
  window.DiggerzApplyMenuBackground = function() {
    try {
      var list = window.DiggerzMenuBgList;
      var idx = Math.max(0, Math.min(list.length - 1, parseInt(localStorage.getItem("diggerz.menuBg.v1") || "0", 10) || 0));
      var entry = list[idx];
      var ov = window.__diggerzMenuBgOverlay;
      if (!ov) return; // never reload
      var img = bgAsset(entry.key);
      if (img) {
        try { ov.Init(img); } catch (e2) {}
        try {
          ov.set_local_xScale(2 * q.SCREENWIDTH / ov._5.width);
          ov.set_local_yScale(2 * q.SCREENHEIGHT / ov._5.height);
        } catch (e3) {}
      }
      try { ov.set_local_alp(entry.alpha); } catch (e4) { try { ov.set_alp(entry.alpha); } catch (e5) {} }
    } catch (e) {}
  };
})();
