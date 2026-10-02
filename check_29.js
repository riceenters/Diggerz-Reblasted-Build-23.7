
(function(){
  // Primary = existing players (86512). Secondary = backup (87b92) on quota/outage only.
  var FIREBASE_CONFIGS = [
    {
      name: "primary",
      apiKey: "AIzaSyBMsaYJ4UMAQPkJcjG9-Ix4LXoGKppwZpk",
      authDomain: "diggerz-86512.firebaseapp.com",
      projectId: "diggerz-86512",
      storageBucket: "diggerz-86512.firebasestorage.app",
      messagingSenderId: "812494082190",
      appId: "1:812494082190:web:d399176297e8171316f9df",
      measurementId: "G-BPH0E6RM9L"
    },
    {
      name: "secondary",
      apiKey: "AIzaSyBUMaKzU1TofsnOkgnesUjcnPS7lGmidnY",
      authDomain: "diggerz-87b92.firebaseapp.com",
      projectId: "diggerz-87b92",
      storageBucket: "diggerz-87b92.firebasestorage.app",
      messagingSenderId: "982868569912",
      appId: "1:982868569912:web:ba84566059f6423a6ddbcd",
      measurementId: "G-GN79GLWKJR"
    }
  ];
  try {
    if (window.__DIGGERZ_FIREBASE_CONFIGS && window.__DIGGERZ_FIREBASE_CONFIGS.length)
      FIREBASE_CONFIGS = window.__DIGGERZ_FIREBASE_CONFIGS;
    var savedSecondary = localStorage.getItem("diggerz.firebaseConfig.secondary");
    if (savedSecondary) {
      FIREBASE_CONFIGS[1] = Object.assign({ name: "secondary" }, JSON.parse(savedSecondary));
    }
  } catch (e) {}

  var configIndex = 0;
  try {
    var savedIdx = parseInt(localStorage.getItem("diggerz.firebaseConfigIndex") || "0", 10);
    // Prefer primary (0) for existing accounts unless user was already failed-over
    if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < FIREBASE_CONFIGS.length)
      configIndex = savedIdx;
  } catch (e0) {}

  function activeConfig() { return FIREBASE_CONFIGS[configIndex] || FIREBASE_CONFIGS[0]; }
  function configUsable(c) {
    return c && c.apiKey && c.projectId && String(c.apiKey).length > 10 && String(c.projectId).length > 1;
  }

  var state = { authenticated: false, uid: null, email: null, user: null, backend: null };
  var auth = null, db = null, ready = false, switching = false;

  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v == null ? d : v; } catch(e){ return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

  // Permanent random shirt color (guid-based)
  function ensureShirtColor() {
    var key = "diggerz.shirtColor.v1";
    var c = lsGet(key, "");
    if (c === "" || c == null) {
      c = String(Math.floor(Math.random() * 12));
      lsSet(key, c);
    }
    return parseInt(c, 10) || 0;
  }
  function ensureGuid() {
    var key = "diggerz.playerGuid.v1";
    var g = lsGet(key, "");
    if (!g) {
      g = "g" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      lsSet(key, g);
    }
    return g;
  }

  function isQuotaOrConnectError(err) {
    var msg = String((err && (err.code || err.message)) || err || "").toLowerCase();
    return (
      msg.indexOf("quota") >= 0 ||
      msg.indexOf("resource-exhausted") >= 0 ||
      msg.indexOf("too many") >= 0 ||
      msg.indexOf("billing") >= 0 ||
      msg.indexOf("network") >= 0 ||
      msg.indexOf("unavailable") >= 0 ||
      msg.indexOf("failed to fetch") >= 0 ||
      msg.indexOf("auth/network-request-failed") >= 0 ||
      msg.indexOf("deadline-exceeded") >= 0
    );
  }

  function tryFailover(err, reason) {
    if (switching) return Promise.resolve(false);
    if (err && !isQuotaOrConnectError(err) && reason !== "force") return Promise.resolve(false);
    var next = configIndex + 1;
    while (next < FIREBASE_CONFIGS.length && !configUsable(FIREBASE_CONFIGS[next])) next++;
    if (next >= FIREBASE_CONFIGS.length) {
      console.warn("[Diggerz Auth] No secondary Firebase backend available", err || reason);
      return Promise.resolve(false);
    }
    switching = true;
    console.warn("[Diggerz Auth] Failing over", configIndex, "->", next, err || reason);
    configIndex = next;
    try { lsSet("diggerz.firebaseConfigIndex", String(configIndex)); } catch (e) {}
    ready = false;
    auth = null;
    db = null;
    try {
      // Delete default app so we can re-init with new config
      if (firebase.apps && firebase.apps.length) {
        return firebase.app().delete().then(function() {
          switching = false;
          initFirebase();
          return true;
        }).catch(function() {
          switching = false;
          initFirebase();
          return true;
        });
      }
    } catch (e2) {}
    switching = false;
    initFirebase();
    return Promise.resolve(true);
  }

  function initFirebase() {
    try {
      if (typeof firebase === "undefined") {
        console.warn("[Diggerz Auth] Firebase SDK missing");
        return;
      }
      var cfg = activeConfig();
      if (!configUsable(cfg)) {
        console.warn("[Diggerz Auth] Active config missing apiKey/projectId, trying next");
        tryFailover(null, "force");
        return;
      }
      if (!firebase.apps.length) {
        firebase.initializeApp(cfg);
      }
      auth = firebase.auth();
      db = firebase.firestore();
      ready = true;
      state.backend = cfg.projectId || cfg.name || String(configIndex);
      console.log("[Diggerz Auth] Using backend", state.backend, "(index", configIndex + ")");
      auth.onAuthStateChanged(function(user) {
        if (user) {
          state.authenticated = true;
          state.uid = user.uid;
          state.email = user.email || "";
          state.user = user;
          lsSet("diggerz.firebase.auth.v1", JSON.stringify({
            authenticated: true,
            uid: user.uid,
            email: state.email,
            backend: state.backend,
            configIndex: configIndex
          }));
          try {
            if (window.q && q.thisMain) {
              q.thisMain.userPW = "SESSION_AUTHENTICATED";
              q.thisMain.userEmail = state.email;
            }
          } catch (e) {}
          try {
            if (!sessionStorage.getItem("diggerz.authMenuReload") && document.body) {
              sessionStorage.setItem("diggerz.authMenuReload", "1");
              setTimeout(function() {
                if (window.q && q.thisMain && q.thisMain.userPW === "SESSION_AUTHENTICATED")
                  location.reload();
              }, 300);
            }
          } catch (eR) {}
        } else {
          state.authenticated = false;
          state.uid = null;
          state.email = null;
          state.user = null;
          try { localStorage.removeItem("diggerz.firebase.auth.v1"); } catch (e2) {}
          try { sessionStorage.removeItem("diggerz.authMenuReload"); } catch (e3) {}
        }
      });
      // Complete email link sign-in if landing with link
      if (auth.isSignInWithEmailLink(window.location.href)) {
        var email = lsGet("diggerz.emailForSignIn", "") || window.prompt("Confirm your email for sign-in");
        if (email) {
          auth.signInWithEmailLink(email, window.location.href).then(function() {
            lsSet("diggerz.emailForSignIn", "");
            try { history.replaceState(null, "", location.pathname); } catch (e) {}
            location.reload();
          }).catch(function(err) { console.warn("[Diggerz Auth] email link", err); alert("Sign-in link failed: " + (err.message || err)); });
        }
      }
    } catch (e) {
      console.warn("[Diggerz Auth] init", e);
    }
  }

  function collectLocalSave() {
    var inv = null, profile = {};
    try {
      var raw = localStorage.getItem("diggerz.digtrade.v1") || localStorage.getItem("digtrade_save") || "";
      if (raw) inv = raw;
    } catch (e) {}
    try {
      if (window.q && q.player) {
        profile.name = q.player.l7 || q.thisMain && q.thisMain.userName || "";
        profile.country = q.player.L0 != null ? q.player.L0 : "";
        var savedSkin = q.player.skinTone;
        if (savedSkin == null && typeof __currentSkinTone === "function") {
          try { savedSkin = __currentSkinTone(); } catch (eSkin) {}
        }
        if (savedSkin == null || !isFinite(Number(savedSkin))) savedSkin = 90;
        profile.skin = Number(savedSkin);
      }
    } catch (e) {}
    profile.shirtColor = ensureShirtColor();
    profile.menuBg = lsGet("diggerz.menuBg.v1", "0");
    return { inventoryJson: inv, profile: profile, updatedAt: Date.now() };
  }

  function pushCloudSave(force) {
    if (!ready || !auth || !auth.currentUser) return Promise.resolve({ ok: false, reason: "not-logged" });
    var data = collectLocalSave();
    // refuse empty wipe unless force
    var slots = 0;
    try {
      if (data.inventoryJson) {
        var p = JSON.parse(data.inventoryJson);
        slots = (p && p.slots && p.slots.length) || (p && p.items && p.items.length) || 0;
      }
    } catch (e) {}
    var ref = db.collection("users").doc(auth.currentUser.uid);
    return ref.get().then(function(snap) {
      var existing = snap.exists ? snap.data() : null;
      var existingSlots = 0;
      try {
        if (existing && existing.inventoryJson) {
          var ep = JSON.parse(existing.inventoryJson);
          existingSlots = (ep && ep.slots && ep.slots.length) || 0;
        }
      } catch (e) {}
      if (!force && slots === 0 && existingSlots > 0)
        return { ok: false, reason: "refuse-empty-wipe" };
      return ref.set({
        inventoryJson: data.inventoryJson || (existing && existing.inventoryJson) || null,
        profile: data.profile,
        email: auth.currentUser.email || "",
        updatedAt: Date.now(),
        itemCount: slots || existingSlots
      }, { merge: true }).then(function() {
        console.log("[Diggerz Cloud] SAVED ok slots~", slots || existingSlots);
        return { ok: true, slots: slots || existingSlots };
      });
    }).catch(function(err) {
      console.warn("[Diggerz Cloud] push failed", err);
      if (isQuotaOrConnectError(err)) {
        return tryFailover(err).then(function(ok) {
          if (ok) return pushCloudSave(force);
          return { ok: false, error: (err && err.message) || String(err), reason: (err && err.code) || "error" };
        });
      }
      return { ok: false, error: (err && err.message) || String(err), reason: (err && err.code) || "error" };
    });
  }

  function pullCloudSave(apply) {
    if (!ready || !auth || !auth.currentUser) return Promise.resolve(null);
    return db.collection("users").doc(auth.currentUser.uid).get().then(function(snap) {
      if (!snap.exists) return null;
      var data = snap.data();
      if (apply && data) {
        try {
          if (data.inventoryJson) localStorage.setItem("diggerz.digtrade.v1", data.inventoryJson);
          if (data.profile) {
            if (data.profile.shirtColor != null) lsSet("diggerz.shirtColor.v1", String(data.profile.shirtColor));
            if (data.profile.menuBg != null) lsSet("diggerz.menuBg.v1", String(data.profile.menuBg));
          }
        } catch (e) {}
      }
      return data;
    }).catch(function(err) {
      console.warn("[Diggerz Cloud] pull failed", err);
      return null;
    });
  }

  function requestLink(email, name, menu, popup) {
    if (!ready || !auth) return Promise.resolve(false);
    email = String(email || "").trim().toLowerCase();
    if (!email || email.indexOf("@") < 1) return Promise.resolve(false);
    lsSet("diggerz.emailForSignIn", email);
    var actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true
    };
    return auth.sendSignInLinkToEmail(email, actionCodeSettings).then(function() {
      console.log("[Diggerz Auth] link sent to", email);
      return true;
    }).catch(function(err) {
      console.warn("[Diggerz Auth] sendEmailLink failed", err);
      if (isQuotaOrConnectError(err)) {
        return tryFailover(err).then(function(ok) {
          if (ok && auth) {
            return auth.sendSignInLinkToEmail(email, actionCodeSettings).then(function() {
              console.log("[Diggerz Auth] link sent via backup to", email);
              return true;
            });
          }
          throw err;
        });
      }
      throw err;
    });
  }

  function loginWithGoogle() {
    if (!ready || !auth) { alert("Firebase not ready"); return; }
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(function(result) {
      state.authenticated = true;
      state.uid = result.user.uid;
      state.email = result.user.email || "";
      lsSet("diggerz.firebase.auth.v1", JSON.stringify({ authenticated: true, uid: state.uid, email: state.email }));
      try {
        if (q.thisMain) {
          q.thisMain.userPW = "SESSION_AUTHENTICATED";
          q.thisMain.userEmail = state.email;
        }
      } catch (e) {}
      // Load cloud then reload once
      pullCloudSave(true).then(function() {
        location.reload();
      });
    }).catch(function(err) {
      console.warn("[Diggerz Auth] google", err);
      if (isQuotaOrConnectError(err)) {
        tryFailover(err).then(function(ok) {
          if (ok) {
            alert("Switched to backup login server. Please try Google sign-in again.");
          } else {
            alert("Google sign-in failed: " + (err.message || err));
          }
        });
      } else {
        alert("Google sign-in failed: " + (err.message || err));
      }
    });
  }

  function logoutFromMenu(menu) {
    // Save before logout
    var done = function() {
      if (!auth) { location.reload(); return; }
      auth.signOut().then(function() {
        try { localStorage.removeItem("diggerz.firebase.auth.v1"); } catch (e) {}
        try {
          if (q.thisMain) {
            q.thisMain.userPW = "NOPASSWORD";
            q.thisMain.userEmail = "";
          }
        } catch (e2) {}
        location.reload();
      });
    };
    if (state.authenticated) {
      pushCloudSave(true).then(done).catch(done);
    } else done();
  }

  // Dirty save: meaningful events only
  var saveTimer = null;
  function dirtySave(reason) {
    if (!state.authenticated) return;
    console.log("[Diggerz Cloud] dirty:", reason);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() { pushCloudSave(false); }, 800);
  }
  window.DiggerzDirtySave = dirtySave;

  // beforeunload / pagehide → save
  window.addEventListener("pagehide", function() { if (state.authenticated) pushCloudSave(false); });
  window.addEventListener("beforeunload", function() { if (state.authenticated) pushCloudSave(false); });

  // Mobile walk parity + chat enter
  (function mobileFixes() {
    // Feed soft-keyboard Enter into diggerz key state so chat submit (KeyDown(13)) works
    function pulseEnter(down) {
      try {
        if (window.q && q.mKeyDown) {
          q.mKeyDown[13] = !!down;
        }
      } catch (e) {}
    }
    function onKey(e, down) {
      var isEnter = e.key === "Enter" || e.keyCode === 13 || e.which === 13;
      if (!isEnter) return;
      pulseEnter(down);
      // Keep one frame of Enter so the game e0() loop sees it
      if (down) {
        setTimeout(function() { pulseEnter(false); }, 50);
      }
    }
    document.addEventListener("keydown", function(e) { onKey(e, true); }, true);
    document.addEventListener("keyup", function(e) { onKey(e, false); }, true);
    // Some mobile keyboards fire keypress only
    document.addEventListener("keypress", function(e) {
      if (e.key === "Enter" || e.keyCode === 13) pulseEnter(true);
    }, true);
  })();

  // Shirt: apply stored color when possible
  window.DiggerzGetShirtColor = ensureShirtColor;
  window.DiggerzGetGuid = ensureGuid;
  ensureGuid();
  ensureShirtColor();

  window.DiggerzAuth237 = {
    state: state,
    requestLink: requestLink,
    loginWithGoogle: loginWithGoogle,
    logoutFromMenu: logoutFromMenu,
    pushCloudSave: pushCloudSave,
    pullCloudSave: pullCloudSave,
    dirtySave: dirtySave,
    tryFailover: tryFailover,
    getBackend: function() { return state.backend; },
    getConfigIndex: function() { return configIndex; },
    setSecondaryConfig: function(cfg) {
      try {
        FIREBASE_CONFIGS[1] = Object.assign({ name: "secondary" }, cfg);
        lsSet("diggerz.firebaseConfig.secondary", JSON.stringify(FIREBASE_CONFIGS[1]));
        return true;
      } catch (e) { return false; }
    }
  };

  // Real firebase config — user project diggerz-86512
  // Read from a data attribute or use known working keys from prior deploy
  try {
    var el = document.querySelector("meta[name=diggerz-firebase]");
    if (el && el.content) firebaseConfig = JSON.parse(el.content);
  } catch (e) {}

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initFirebase);
  else initFirebase();
  setTimeout(initFirebase, 500);
})();
