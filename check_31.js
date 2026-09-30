
(function(){
  // Hook common save points after game boots
  function tryHook() {
    try {
      if (!window.q || !window.DiggerzDirtySave) return;
      // Volume changes already in settings via sliders — mark dirty when settings close
      var _orig = null;
    } catch (e) {}
  }
  setInterval(function(){
    try {
      if (!window.DiggerzDirtySave || !window.q) return;
      // detect inventory localStorage changes
      var cur = localStorage.getItem("diggerz.digtrade.v1") || "";
      if (window.__dzInvSnap === undefined) window.__dzInvSnap = cur;
      if (cur !== window.__dzInvSnap) {
        window.__dzInvSnap = cur;
        window.DiggerzDirtySave("inventory");
      }
    } catch (e) {}
  }, 3000);
})();
