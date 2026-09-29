
(function(){
  var panelRef = null;
  var LIME_URL = 'https://ko-fi.com/limeguy314';
  var HEU_URL = 'https://cash.app/$Houstonswallet';

  function closePanel() {
    try {
      if (panelRef) {
        try { panelRef.a0 = 1; } catch (e0) {}
        panelRef = null;
      }
    } catch (e2) {}
  }

  function openDonateNative(menu) {
    var UI = window.DiggerzNativeUI;
    if (!UI || !UI.ja || !UI.xa || !UI.ob || !UI.q) {
      if (window.DiggerzSupport239) window.DiggerzSupport239.open();
      return;
    }
    closePanel();
    try {
      // Parent must be the TITLE MENU (same as LOGIN D55), not the button.
      var root = null;
      try {
        if (menu && menu._9 && typeof menu.D55 === 'function') root = menu;
      } catch (e0) {}
      try {
        if (!root && UI.q && UI.q.thisMain && UI.q.thisMain._9) root = UI.q.thisMain;
      } catch (e1) {}
      try {
        if (!root && menu && menu._9) root = menu;
      } catch (e2) {}

      var panel = new UI.ja(440, 360, !0);
      panel._1 = 'diggerz_donate_panel';
      panel.c0 = !0;
      panel.a0 = 0;
      panel.E7 = function() { return !0; };
      panel.C39 = function() {
        try {
          if (null == this._8 || null == this._8[3]) closePanel();
        } catch (eC) { closePanel(); }
      };
      // Exact same centering as LOGIN / Game Settings
      panel.A7 = UI.q.CENTERX;
      panel.A8 = UI.q.CENTERY;
      panel.B8 = 8;

      var title = new UI.xa(0, -120, '^9Donate', UI.q.MAIN_FONT_BIG);
      title.D7(panel, !0);
      try { title.set_local_xScale(title.set_local_yScale(1.05)); } catch (eT) {}
      panel._9.push(title);

      var lime = new UI.ob(0, -40, '^2Lime', UI.q.MAIN_FONT_BIG);
      lime.D7(panel, !0);
      try { lime.set_local_xScale(lime.set_local_yScale(0.95)); } catch (eL) {}
      lime.C33 = function() {
        try { window.open(LIME_URL, '_blank', 'noopener,noreferrer'); } catch (e) { location.href = LIME_URL; }
      };
      panel._9.push(lime);

      var heu = new UI.ob(0, 30, '^3Heu', UI.q.MAIN_FONT_BIG);
      heu.D7(panel, !0);
      try { heu.set_local_xScale(heu.set_local_yScale(0.95)); } catch (eH) {}
      heu.C33 = function() {
        try { window.open(HEU_URL, '_blank', 'noopener,noreferrer'); } catch (e) { location.href = HEU_URL; }
      };
      panel._9.push(heu);

      var closeLbl = new UI.ob(0, 100, '^1Close', UI.q.MAIN_FONT_BIG);
      closeLbl.D7(panel, !0);
      try { closeLbl.set_local_xScale(closeLbl.set_local_yScale(0.9)); } catch (eC) {}
      closeLbl.C33 = function() { closePanel(); };
      panel._9.push(closeLbl);

      if (root && root._9) {
        root._9.push(panel);
        panel._2 = root;
      }
      panelRef = panel;
    } catch (err) {
      console.warn('[Diggerz Donate] native panel failed', err);
      if (window.DiggerzSupport239) window.DiggerzSupport239.open();
    }
  }

  window.DiggerzOpenDonateNative = openDonateNative;
})();
