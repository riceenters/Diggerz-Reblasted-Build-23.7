
(function(){
  'use strict';
  var AUTH_MARKER = 'SESSION_AUTHENTICATED';
  var STORAGE_KEY = 'diggerz.firebase.auth.v1';
  var firebaseConfig = {
    apiKey: "AIzaSyBMsaYJ4UMAQPkJcjG9-Ix4LXoGKppwZpk",
    authDomain: "diggerz-86512.firebaseapp.com",
    projectId: "diggerz-86512",
    storageBucket: "diggerz-86512.firebasestorage.app",
    messagingSenderId: "812494082190",
    appId: "1:812494082190:web:d399176297e8171316f9df",
    measurementId: "G-BPH0E6RM9L"
  };
  var state = { authenticated: false, email: '', username: '', uid: '', busy: false, ready: false };
  var auth = null;
  var db = null;
  var saveTimer = null;
  var lastCloudPush = 0;

  function cleanName(v) {
    v = String(v || '').trim();
    return (!v || v === 'Enter Name') ? 'Player' : v.slice(0, 24);
  }
  function popup(menu, text) {
    try { menu._9.push(new vb(menu, '', String(text), new Cd, vb.F39)); }
    catch (e) { try { alert(String(text).replace(/\^[0-9]/g, '')); } catch (_e) {} }
  }
  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        uid: state.uid, email: state.email, username: state.username, authenticated: state.authenticated
      }));
    } catch (e) {}
  }

  function collectProfile() {
    var profile = {
      userName: '',
      country_flag: 0,
      skin_tone: 1,
      music_volume: 50,
      sound_volume: 50,
      email: state.email || '',
      updatedAt: Date.now()
    };
    try {
      if (window.q && q.thisMain) profile.userName = String(q.thisMain.userName || '');
      if (window.q && q.player) {
        profile.country_flag = q.player.L0 | 0;
        profile.skin_tone = Number(q.player.l9) || 1;
        profile.music_volume = q.player.k7 | 0;
        profile.sound_volume = q.player.k8 | 0;
      }
    } catch (e) {}
    return profile;
  }

  function digtradeStorageKey() {
    try {
      if (window.DiggerzService && DiggerzService.STORAGE_KEY) return DiggerzService.STORAGE_KEY;
    } catch (e) {}
    return 'diggerz.digtrade.rebuild.v3';
  }

  function defaultAppearance() {
    return [0, 247, 0, 0, 326, 0, 0, 0, 0, 0, 0];
  }

  function normalizeSlot(item) {
    if (item == null) return { category: 0, id: 0, variant: 0, count: 0 };
    if (typeof item === 'number') {
      return { category: 0, id: item | 0, variant: 0, count: item ? 1 : 0 };
    }
    return {
      category: Math.max(0, Math.min(6, Number(item.category) || 0)),
      id: Math.max(0, Math.min(2047, Number(item.id) || 0)),
      variant: Math.max(0, Math.min(31, Number(item.variant) || 0)),
      count: Math.max(0, Math.min(65535, Number(item.count) || 0))
    };
  }

  function normalizeInventory(inv) {
    if (!inv) return null;
    var slotsIn = Array.isArray(inv.slots) ? inv.slots : [];
    if (slotsIn.length < 3) {
      // pad to valid length
      while (slotsIn.length < 3) slotsIn.push({ category: 0, id: 0, variant: 0, count: 0 });
    }
    var slots = [];
    for (var i = 0; i < slotsIn.length; i++) slots.push(normalizeSlot(slotsIn[i]));
    var appearance = Array.isArray(inv.appearance) && inv.appearance.length
      ? inv.appearance.map(function(n){ return Number(n) || 0; })
      : defaultAppearance();
    while (appearance.length < 11) appearance.push(0);
    return {
      version: 6,
      slots: slots,
      appearance: appearance,
      appearanceText: String(inv.appearanceText || ''),
      wins: inv.wins | 0,
      coins: inv.coins | 0,
      mined: inv.mined | 0,
      placed: inv.placed | 0,
      starterLoadoutVersion: inv.starterLoadoutVersion | 0,
      x: inv.x,
      y: inv.y
    };
  }

  function collectInventory() {
    try {
      var rawObj = null;
      var svc = window.P && P.service;
      if (svc && svc.state && Array.isArray(svc.state.slots)) {
        rawObj = {
          version: svc.state.version || 6,
          slots: svc.state.slots,
          appearance: svc.state.appearance,
          appearanceText: svc.state.appearanceText || '',
          wins: svc.state.wins | 0,
          coins: svc.state.coins | 0,
          mined: svc.state.mined | 0,
          placed: svc.state.placed | 0,
          starterLoadoutVersion: svc.state.starterLoadoutVersion | 0,
          x: svc.state.x,
          y: svc.state.y
        };
      } else {
        var raw = localStorage.getItem(digtradeStorageKey());
        if (raw) {
          try { rawObj = JSON.parse(raw); } catch (e0) { rawObj = null; }
        }
      }
      var norm = normalizeInventory(rawObj);
      if (norm) console.log('[Diggerz Cloud] collectInventory slots=', norm.slots.length, 'filled=', inventoryScore(norm));
      return norm;
    } catch (e) {
      console.warn('[Diggerz Cloud] collectInventory failed', e);
      return null;
    }
  }

  function applyProfile(data) {
    if (!data) return;
    try {
      if (window.q && q.thisMain && data.userName) {
        q.thisMain.userName = String(data.userName).slice(0, 24);
      }
      if (window.q && q.player) {
        if (data.country_flag != null) q.player.L0 = data.country_flag | 0;
        if (data.skin_tone != null) q.player.l9 = Number(data.skin_tone) || 1;
        if (data.music_volume != null) q.player.k7 = data.music_volume | 0;
        if (data.sound_volume != null) q.player.k8 = data.sound_volume | 0;
      }
      if (typeof q !== 'undefined' && typeof q.SaveGlobals === 'function') q.SaveGlobals();
      try {
        localStorage.setItem('diggerz.profile.v1', JSON.stringify({
          userName: String((q.thisMain && q.thisMain.userName) || ''),
          country_flag: (q.player && q.player.L0) | 0,
          skin_tone: Number(q.player && q.player.l9) || 1,
          music_volume: (q.player && q.player.k7) | 0,
          sound_volume: (q.player && q.player.k8) | 0
        }));
      } catch (e2) {}
    } catch (e) {}
  }

  function applyInventory(inv) {
    var norm = normalizeInventory(inv);
    if (!norm || !Array.isArray(norm.slots)) {
      console.warn('[Diggerz Cloud] applyInventory: invalid inventory', inv);
      return false;
    }
    try {
      var key = digtradeStorageKey();
      // Preserve map fields from existing save if present
      var existing = null;
      try { existing = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
      var merged = existing && typeof existing === 'object' ? existing : {};
      merged.version = 6;
      merged.slots = norm.slots;
      merged.appearance = norm.appearance;
      merged.appearanceText = norm.appearanceText || '';
      merged.wins = norm.wins | 0;
      merged.coins = norm.coins | 0;
      merged.mined = norm.mined | 0;
      merged.placed = norm.placed | 0;
      merged.starterLoadoutVersion = norm.starterLoadoutVersion | 0;
      if (norm.x != null) merged.x = norm.x;
      if (norm.y != null) merged.y = norm.y;
      // Ensure digtrade validState will accept this
      localStorage.setItem(key, JSON.stringify(merged));
      console.log('[Diggerz Cloud] wrote localStorage', key, 'filled~', inventoryScore(norm));

      var svc = window.P && P.service;
      if (svc && svc.state) {
        svc.state.slots = norm.slots;
        svc.state.appearance = norm.appearance;
        svc.state.appearanceText = norm.appearanceText || '';
        svc.state.wins = norm.wins | 0;
        svc.state.coins = norm.coins | 0;
        svc.state.mined = norm.mined | 0;
        svc.state.placed = norm.placed | 0;
        try { if (typeof svc.save === 'function') svc.save(true); } catch (e3) {}
        try { if (typeof svc.applyAppearance === 'function') svc.applyAppearance(); } catch (e4) {}
      }
      return true;
    } catch (e) {
      console.warn('[Diggerz Cloud] applyInventory failed', e);
      return false;
    }
  }

  async function pullCloudSave(force) {
    if (!state.uid || !db) {
      console.warn('[Diggerz Cloud] pull: not ready', !!state.uid, !!db);
      return null;
    }
    try {
      var snap = await db.collection('users').doc(state.uid).get();
      if (!snap.exists) {
        console.log('[Diggerz Cloud] pull: no document for', state.uid);
        return null;
      }
      var data = snap.data() || {};
      // Prefer inventoryJson (Firestore-safe) then inventory object
      var inv = null;
      if (data.inventoryJson) {
        try { inv = JSON.parse(data.inventoryJson); } catch (e0) { inv = null; }
      }
      if (!inv && data.inventory) inv = data.inventory;
      if (!inv && data.digtradeRaw) {
        try { inv = JSON.parse(data.digtradeRaw); } catch (eR) { inv = null; }
      }
      if (data.profileJson && !data.profile) {
        try { data.profile = JSON.parse(data.profileJson); } catch (eP) {}
      }

      var localInv = collectInventory();
      var localScore = inventoryScore(localInv);
      var cloudScore = inventoryScore(inv);
      console.log('[Diggerz Cloud] pull scores local=', localScore, 'cloud=', cloudScore, 'force=', !!force);

      if (data.profile) applyProfile(data.profile);
      else applyProfile(data);

      if (inv) {
        var ok = applyInventory(inv);
        if (!ok) console.warn('[Diggerz Cloud] applyInventory returned false');
      } else {
        console.log('[Diggerz Cloud] no inventory on account');
      }
      return { profile: data.profile || data, inventory: inv, updatedAt: data.updatedAt, itemCount: cloudScore };
    } catch (e) {
      console.warn('[Diggerz Cloud] pull failed', e);
      return null;
    }
  }

  function inventoryScore(inv) {
    if (!inv || !Array.isArray(inv.slots)) return 0;
    var n = 0;
    for (var i = 0; i < inv.slots.length; i++) {
      var s = inv.slots[i];
      if (s == null) continue;
      if (typeof s === 'number' && s > 0) { n++; continue; }
      if (typeof s === 'object') {
        var id = s.id != null ? s.id : 0;
        var count = s.count != null ? s.count : 1;
        if (id && id !== 0 && count !== 0) n++;
      }
    }
    return n;
  }

  function localEditTime() {
    try { return parseInt(localStorage.getItem('diggerz.cloud.localUpdatedAt') || '0', 10) || 0; } catch (e) { return 0; }
  }
  function touchLocalEdit() {
    try { localStorage.setItem('diggerz.cloud.localUpdatedAt', String(Date.now())); } catch (e) {}
  }

  async function pushCloudSave(force) {
    if (!state.authenticated || !state.uid || !db) {
      console.warn('[Diggerz Cloud] push: not logged in or db missing');
      return { ok: false, reason: 'not-logged-in' };
    }
    var now = Date.now();
    if (!force && now - lastCloudPush < 5000) return { ok: false, reason: 'rate' };
    lastCloudPush = now;
    try {
      await initFirebase();
      var profile = collectProfile();
      var inventory = collectInventory();
      var localScore = inventoryScore(inventory);

      var snap = await db.collection('users').doc(state.uid).get();
      var cloud = snap.exists ? (snap.data() || {}) : null;
      var cloudInv = null;
      if (cloud && cloud.inventoryJson) {
        try { cloudInv = JSON.parse(cloud.inventoryJson); } catch (e1) {}
      }
      if (!cloudInv && cloud && cloud.inventory) cloudInv = cloud.inventory;
      var cloudScore = inventoryScore(cloudInv);

      if (localScore === 0 && cloudScore > 0) {
        console.log('[Diggerz Cloud] blocked empty wipe; cloud has', cloudScore);
        return { ok: false, reason: 'refuse-empty-wipe', cloudScore: cloudScore };
      }
      if (!force && cloudScore > localScore + 1) {
        console.log('[Diggerz Cloud] skip auto-save; cloud richer', cloudScore, localScore);
        return { ok: false, reason: 'cloud-richer', cloudScore: cloudScore, localScore: localScore };
      }
      if (localScore === 0 && !force) {
        console.log('[Diggerz Cloud] skip auto-save; nothing to upload');
        return { ok: false, reason: 'nothing' };
      }

      // Separate JSON fields only (Firestore-friendly, no nested array surprises)
      var payload = {
        email: state.email || '',
        updatedAt: now,
        itemCount: localScore,
        profileJson: JSON.stringify(profile || {}),
        inventoryJson: inventory ? JSON.stringify(inventory) : ''
      };
      try {
        var pr = localStorage.getItem('diggerz.profile.v1');
        if (pr) payload.profileJson = pr;
      } catch (eP) {}
      // Cap raw backup size (Firestore doc limit ~1MB)
      try {
        var raw = localStorage.getItem(digtradeStorageKey());
        if (raw && raw.length < 700000) payload.digtradeRaw = raw;
      } catch (e2) {}

      console.log('[Diggerz Cloud] writing users/' + state.uid, 'itemCount=', localScore, 'jsonLen=', (payload.inventoryJson || '').length);
      await db.collection('users').doc(state.uid).set(payload, { merge: true });
      console.log('[Diggerz Cloud] SAVED ok slots~', localScore, force ? 'manual' : 'auto');
      return { ok: true, slots: localScore };
    } catch (e) {
      console.warn('[Diggerz Cloud] push failed', e);
      var code = (e && e.code) ? e.code : '';
      var msg = (e && e.message) ? e.message : String(e);
      if (code === 'permission-denied' || msg.indexOf('Missing or insufficient permissions') >= 0)
        return { ok: false, reason: 'permission-denied', error: 'permission-denied' };
      return { ok: false, reason: 'error', error: (code ? code + ': ' : '') + msg };
    }
  }

  function isInGameForCloud() {
    try {
      if (window.P && P.service && P.service.state && Array.isArray(P.service.state.slots)) return true;
    } catch (e) {}
    try {
      if (window.l && l.z39 && l.a42 && String(l.a42).indexOf('Title') < 0) return true;
    } catch (e2) {}
    return false;
  }

  function scheduleCloudSave() {
    if (!state.authenticated) return;
    if (!isInGameForCloud()) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){ pushCloudSave(false); }, 3000);
  }

  function applySession(user, skipPull) {
    if (user) {
      state.authenticated = true;
      state.uid = user.uid || '';
      state.email = (user.email || '').toLowerCase();
      state.username = cleanName(user.displayName || '');
      saveLocal();
      try {
        if (window.q && q.thisMain) {
          q.thisMain.userPW = AUTH_MARKER;
          q.thisMain.userEmail = state.email;
          if (state.username && state.username !== 'Player') {
            if (!q.thisMain.userName || q.thisMain.userName === 'Enter Name')
              q.thisMain.userName = state.username;
          }
          if (typeof q.SaveGlobals === 'function') q.SaveGlobals();
        }
      } catch (e) {}
      // After login / page load while signed in: load account into this browser.
      // Reload at most ONCE per uid per tab session — never clear the flag (that caused an infinite reload loop).
      if (!skipPull) {
        pullCloudSave(true).then(function(data){
          var hadInv = data && data.inventory && inventoryScore(data.inventory) > 0;
          console.log('[Diggerz Cloud] post-auth pull', hadInv ? 'got items' : 'no items');
          try {
            var flag = 'diggerz.cloud.appliedReload.' + (state.uid || 'anon');
            if (hadInv && sessionStorage.getItem(flag) !== '1') {
              sessionStorage.setItem(flag, '1');
              setTimeout(function(){ location.reload(); }, 400);
            }
          } catch (e2) {}
        });
      }
    } else {
      state.authenticated = false;
      state.uid = '';
      state.email = '';
      state.username = '';
      saveLocal();
      try {
        if (window.q && q.thisMain) {
          q.thisMain.userPW = '';
          q.thisMain.userEmail = '';
        }
      } catch (e) {}
    }
    try { updatePanel(); } catch (e3) {}
  }
  

  function ensureGoogleButton() {
    var el = document.getElementById('diggerz-google-only');
    if (el) return el;
    var style = document.createElement('style');
    style.id = 'diggerz-google-only-style';
    style.textContent = [
      '#diggerz-google-only{display:none;position:fixed;z-index:2147483646;transform:translate(-50%,-50%);pointer-events:auto;',
      'font-family:Roboto,Arial,Helvetica,sans-serif;}',
      '#diggerz-google-only.show{display:block !important;visibility:visible !important;opacity:1 !important;}',
      '#diggerz-google-only .dz-google-official{display:inline-flex;align-items:center;justify-content:center;gap:12px;',
      'height:44px;padding:0 14px 0 12px;min-width:240px;box-sizing:border-box;',
      'background:#fff;border:1px solid #4285F4;border-radius:4px;cursor:pointer;',
      'color:#4285F4;font-size:15px;font-weight:600;',
      'box-shadow:0 1px 3px rgba(0,0,0,.18);}',
      '#diggerz-google-only .dz-google-official:hover{background:#f8f9fa;}',
      '#diggerz-google-only .dz-google-official:disabled{opacity:.65;cursor:wait;}'
    ].join('');
    document.head.appendChild(style);
    el = document.createElement('div');
    el.id = 'diggerz-google-only';
    el.innerHTML = [
      '<button type="button" class="dz-google-official" id="diggerz-login-google">',
      '  <span aria-hidden="true" style="display:inline-flex;width:20px;height:20px">',
      '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">',
      '      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>',
      '      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>',
      '      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>',
      '      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>',
      '    </svg>',
      '  </span>',
      '  <span>Sign in with Google</span>',
      '</button>'
    ].join('');
    document.body.appendChild(el);
    el.querySelector('#diggerz-login-google').onclick = function(){ loginWithGoogle(); };
    return el;
  }
  function positionGoogleButton() {
    var el = ensureGoogleButton();
    if (!el) return;
    var canvas = document.querySelector('canvas');
    var rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    // Center of game canvas — middle of native LOGIN panel body
    el.style.left = Math.round(rect.left + rect.width * 0.5) + 'px';
    el.style.top = Math.round(rect.top + rect.height * 0.50) + 'px';
    el.style.zIndex = '2147483646';
  }
  function showGoogleButton() {
    if (state.authenticated) {
      hideGoogleButton();
      return;
    }
    try {
      var el = ensureGoogleButton();
      positionGoogleButton();
      el.classList.add('show');
      el.style.display = 'block';
      // Re-position a few times as the panel animates in
      setTimeout(positionGoogleButton, 50);
      setTimeout(positionGoogleButton, 200);
      setTimeout(positionGoogleButton, 500);
      if (!window.__diggerzGooglePosTimer) {
        window.__diggerzGooglePosTimer = setInterval(function(){
          var g = document.getElementById('diggerz-google-only');
          if (!g || !g.classList.contains('show')) return;
          positionGoogleButton();
        }, 250);
      }
      console.log('[Diggerz Auth] Google button shown');
    } catch (e) {
      console.warn('[Diggerz Auth] showGoogleButton failed', e);
    }
  }
  function hideGoogleButton() {
    var el = document.getElementById('diggerz-google-only');
    if (el) el.classList.remove('show');
  }
  function ensurePanel() {
    // Back-compat: only the Google overlay (panel is native ja)
    return ensureGoogleButton();
  }
  function updatePanel() {
    var btn = document.getElementById('diggerz-login-google');
    if (state.authenticated) hideGoogleButton();
    if (btn) btn.disabled = !!state.busy;
  }
  function openLoginPanel(menu) {
    // Legacy path — prefer native D55 panel; still show Google overlay
    window.__diggerzLoginMenu = menu || null;
    showGoogleButton();
  }
  function closeLoginPanel() {
    hideGoogleButton();
    try {
      var panel = window.__diggerzLoginPanel;
      if (panel) {
        panel.a0 = 1;
      }
    } catch (e) {}
  }

function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  async function initFirebase() {
    if (auth && db) return auth;
    if (!window.firebase) {
      await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js');
    } else if (!firebase.firestore) {
      await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js');
    }
    if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged(function(user) {
      // During explicit Google login we push local data then reload — skip pull race
      if (state.busy && user) {
        state.authenticated = true;
        state.uid = user.uid || '';
        state.email = (user.email || '').toLowerCase();
        state.username = cleanName(user.displayName || '');
        state.ready = true;
        return;
      }
      applySession(user);
      state.ready = true;
    });
    return auth;
  }

  async function loginWithGoogle() {
    if (state.busy) return;
    state.busy = true;
    var menu = window.__diggerzLoginMenu;
    try {
      if (menu) popup(menu, '^9Opening Google sign-in…');
      await initFirebase();
      var provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      var result = await auth.signInWithPopup(provider);
      // Auth only — does NOT push or pull inventory (use Settings → Save/Load)
      applySession(result.user, true);
      saveLocal();
      try {
        var panel = window.__diggerzLoginPanel;
        if (panel) {
          panel.a0 = 1;
          try { if (window.E && E.u4) E.u4(panel, 0, 300, 1, .5, 0, 1, 0); } catch (eA) {}
        }
      } catch (eClose) {}
      try { hideGoogleButton(); } catch (eH) {}
      var email = (result.user && result.user.email) ? result.user.email : (state.email || 'your account');
      if (menu) popup(menu, '^2Signed in as ^7' + email + '^2 — loading account after reload…');
      try { sessionStorage.setItem('diggerz.cloud.reload', '1'); } catch (e) {}
      setTimeout(function(){ location.reload(); }, 900);
      return;
    } catch (e) {
      console.warn('[Diggerz Auth]', e);
      var msg = (e && e.message) ? e.message : 'Sign-in failed';
      if (e && e.code === 'auth/popup-blocked') msg = 'Popup blocked — allow popups for this site.';
      if (e && e.code === 'auth/unauthorized-domain') msg = 'Domain not authorized in Firebase.';
      if (menu) popup(menu, '^1' + msg);
    } finally {
      state.busy = false;
      try { updatePanel(); } catch (eU) {}
    }
  }

async function logout() {
    try {
      await initFirebase();
      await auth.signOut();
    } catch (e) {}
    applySession(null);
    closeLoginPanel();
  }

  function logoutFromMenu(menu) {
    logout().then(function() {
      try {
        localStorage.removeItem('diggerz.firebase.auth.v1');
        if (window.q && q.thisMain) {
          q.thisMain.userPW = '';
          q.thisMain.userEmail = '';
        }
      } catch (e) {}
      if (menu) popup(menu, '^9Signed out — reloading…');
      setTimeout(function(){ location.reload(); }, 600);
    });
  }

  function requestLink() { openLoginPanel(null); }

  // Hook SaveGlobals + digtrade save → cloud
  function installSaveHooks() {
    try {
      if (window.q && typeof q.SaveGlobals === 'function' && !q.SaveGlobals.__diggerzCloud) {
        var oldG = q.SaveGlobals;
        q.SaveGlobals = function() {
          var r = oldG.apply(this, arguments);
          try { scheduleCloudSave(); } catch (e) {}
          return r;
        };
        q.SaveGlobals.__diggerzCloud = true;
      }
    } catch (e) {}
    try {
      if (window.DiggerzService && DiggerzService.prototype && DiggerzService.prototype.save && !DiggerzService.prototype.save.__diggerzCloud) {
        var oldS = DiggerzService.prototype.save;
        DiggerzService.prototype.save = function(force) {
          var r = oldS.call(this, force);
          try { touchLocalEdit(); } catch (e0) {}
          try { scheduleCloudSave(); } catch (e) {}
          return r;
        };
        DiggerzService.prototype.save.__diggerzCloud = true;
      }
    } catch (e2) {}
  }

  // Boot
  initFirebase().then(function(){ installSaveHooks(); }).catch(function(e){ console.warn('[Diggerz Auth] init failed', e); });
  setInterval(installSaveHooks, 2000);
  // Periodic cloud push only while in-game
  setInterval(function(){
    if (state.authenticated && isInGameForCloud()) pushCloudSave(false);
  }, 45000);


  var EMAIL_LINK_KEY = 'diggerz.emailLink.email';

  async function sendEmailLink(email, menu) {
    email = String(email || '').trim().toLowerCase();
    if (!email || email.indexOf('@') < 0) {
      if (menu) popup(menu, '^1Enter a valid email address.');
      return { ok: false, reason: 'bad-email' };
    }
    if (state.busy) return { ok: false, reason: 'busy' };
    state.busy = true;
    try {
      if (menu) popup(menu, '^9Sending login link to ^7' + email + '^9…');
      await initFirebase();
      var actionCodeSettings = {
        // User returns to this same page; we complete sign-in on load.
        url: window.location.origin + window.location.pathname + (window.location.search || ''),
        handleCodeInApp: true
      };
      await auth.sendSignInLinkToEmail(email, actionCodeSettings);
      try { window.localStorage.setItem(EMAIL_LINK_KEY, email); } catch (e0) {}
      if (menu) popup(menu, '^2Link sent! Check ^7' + email + '^2 and open it on this device.');
      try {
        var panel = window.__diggerzLoginPanel;
        if (panel) { panel.a0 = 1; window.__diggerzLoginPanel = null; }
      } catch (eClose) {}
      return { ok: true };
    } catch (err) {
      console.warn('[Diggerz Auth] sendEmailLink failed', err);
      var msg = (err && err.message) ? err.message : String(err);
      if (String(msg).indexOf('unauthorized-continue-uri') >= 0 || String(msg).indexOf('invalid-continue-uri') >= 0)
        msg = 'Add this site domain in Firebase → Authentication → Settings → Authorized domains.';
      if (menu) popup(menu, '^1Could not send link: ^7' + msg);
      return { ok: false, error: msg };
    } finally {
      state.busy = false;
    }
  }

  async function completeEmailLinkIfPresent() {
    try {
      await initFirebase();
      if (!auth.isSignInWithEmailLink(window.location.href)) return false;
      var email = '';
      try { email = window.localStorage.getItem(EMAIL_LINK_KEY) || ''; } catch (e0) {}
      if (!email) {
        email = window.prompt('Confirm your email to finish sign-in:') || '';
      }
      email = String(email || '').trim().toLowerCase();
      if (!email) return false;
      state.busy = true;
      var result = await auth.signInWithEmailLink(email, window.location.href);
      try { window.localStorage.removeItem(EMAIL_LINK_KEY); } catch (e1) {}
      // Strip firebase link params from the URL so refresh is clean
      try {
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e2) {}
      applySession(result.user, true);
      saveLocal();
      state.busy = false;
      try {
        var data = await pullCloudSave(true);
        var hadInv = data && data.inventory && inventoryScore(data.inventory) > 0;
        var flag = 'diggerz.cloud.appliedReload.' + (state.uid || 'anon');
        if (hadInv && sessionStorage.getItem(flag) !== '1') {
          sessionStorage.setItem(flag, '1');
          setTimeout(function(){ location.reload(); }, 400);
        }
      } catch (e3) {}
      console.log('[Diggerz Auth] email link sign-in ok', state.email);
      return true;
    } catch (err) {
      state.busy = false;
      console.warn('[Diggerz Auth] completeEmailLink failed', err);
      return false;
    }
  }


  window.DiggerzAuth237 = {
    state: state,
    openLoginPanel: openLoginPanel,
    showGoogleButton: showGoogleButton,
    hideGoogleButton: hideGoogleButton,
    positionGoogleButton: positionGoogleButton,
    loginWithGoogle: loginWithGoogle,
    sendEmailLink: sendEmailLink,
    completeEmailLinkIfPresent: completeEmailLinkIfPresent,
    logout: logout,
    logoutFromMenu: logoutFromMenu,
    requestLink: requestLink,
    refresh: function(){ return Promise.resolve(state); },
    pushCloudSave: function(force){ return pushCloudSave(!!force); },
    pullCloudSave: function(force){ return pullCloudSave(!!force); }
  };

  // Auto-complete email magic link when the user opens the link from their inbox
  completeEmailLinkIfPresent().catch(function(e){
    console.warn('[Diggerz Auth] email link boot failed', e);
  });
})();
