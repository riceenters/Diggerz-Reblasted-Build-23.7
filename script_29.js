
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
                if (!(window.q && q.thisMain && q.thisMain.userPW === "SESSION_AUTHENTICATED")) return;
                var localStamp = Number(lsGet("diggerz.localSaveUpdatedAt.v1", "0")) || 0;
                pullCloudSave(false).then(function(cloud) {
                  var cloudStamp = Number(cloud && cloud.updatedAt) || 0;
                  if (cloud && localStamp > cloudStamp) {
                    return pushCloudSave(true).then(function() { location.reload(); });
                  }
                  if (cloud) applyCloudData(cloud);
                  location.reload();
                }).catch(function() { location.reload(); });
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

  function safeObject(value) {
    if (value === undefined) return undefined;
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return isFinite(value) ? value : null;
    if (Array.isArray(value)) {
      var arr = [];
      for (var i = 0; i < value.length; i++) {
        var v = safeObject(value[i]);
        arr.push(v === undefined ? null : v);
      }
      return arr;
    }
    if (typeof value === "object") {
      var out = {};
      Object.keys(value).forEach(function(k) {
        var v = safeObject(value[k]);
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    return undefined;
  }

  function localInventoryCandidate() {
    var keys = [
      "diggerz.digtrade.rebuild.v3",
      "diggerz.digtrade.v1",
      "diggerz.inventory.v1",
      "digtrade_save"
    ];
    var best = null, bestScore = -1, bestKey = "";
    keys.forEach(function(key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return;
        var score = 0;
        var slots = Array.isArray(parsed.slots) ? parsed.slots : [];
        for (var i = 0; i < slots.length; i++) {
          if (slots[i] && (Number(slots[i].id) || 0) && (Number(slots[i].count) || 0)) score++;
        }
        if (parsed.appearance) score += 1;
        // Prefer the richest save, then the modern rebuild key on ties.
        if (score > bestScore || (score === bestScore && key === keys[0])) {
          best = raw; bestScore = score; bestKey = key;
        }
      } catch (e) {}
    });
    return { raw: best, score: bestScore, key: bestKey };
  }

  function collectLocalState() {
    var state = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key) continue;
        // Only sync game state/preferences; never auth/session/admin secrets.
        if (/^(diggerz\.(digtrade|inventory|shirtColor|menuBg|player|pet|clothes|appearance|progress|settings)|digtrade_save$)/i.test(key)) {
          if (/^(diggerz\.(digtrade|inventory)|digtrade_save$)/i.test(key)) continue;
          if (/firebase|auth|email|admin|session|token|resurrection|boundEmail/i.test(key)) continue;
          var value = localStorage.getItem(key);
          if (value != null && value.length < 900000) state[key] = value;
        }
      }
    } catch (e) {}
    return state;
  }

  function collectLocalSave() {
    var inv = localInventoryCandidate().raw, profile = {};
    try {
      if (window.q && q.player) {
        var name = q.player.l7 || (q.thisMain && q.thisMain.userName);
        var country = q.player.L0;
        var skin = q.player.skinTone;
        if (name !== undefined && name !== null) profile.name = String(name);
        if (country !== undefined && country !== null) profile.country = country;
        if (skin !== undefined && skin !== null && isFinite(Number(skin))) profile.skin = Number(skin);
      }
    } catch (e) {}
    profile.shirtColor = ensureShirtColor();
    profile.menuBg = lsGet("diggerz.menuBg.v1", "0");
    profile = safeObject(profile) || {};
    return {
      inventoryJson: inv,
      localState: collectLocalState(),
      profile: profile,
      updatedAt: Date.now(),
      schemaVersion: 2
    };
  }

  function inventorySlotCount(raw) {
    try {
      var p = typeof raw === "string" ? JSON.parse(raw) : raw;
      var slots = (p && Array.isArray(p.slots)) ? p.slots : [];
      var n = 0;
      for (var i = 0; i < slots.length; i++) if (slots[i] && (Number(slots[i].id)||0) && (Number(slots[i].count)||0)) n++;
      return n;
    } catch (e) { return 0; }
  }

  function pushCloudSave(force) {
    if (!ready || !auth || !auth.currentUser) return Promise.resolve({ ok: false, reason: "not-logged" });
    var data = collectLocalSave();
    var slots = inventorySlotCount(data.inventoryJson);
    var ref = db.collection("users").doc(auth.currentUser.uid);
    return ref.get().then(function(snap) {
      var existing = snap.exists ? snap.data() : null;
      var existingSlots = inventorySlotCount(existing && existing.inventoryJson);
      if (!force && slots === 0 && existingSlots > 0)
        return { ok: false, reason: "refuse-empty-wipe" };
      // Omit absent fields instead of sending undefined to Firestore.
      var payload = {
        email: auth.currentUser.email || "",
        updatedAt: Date.now(),
        itemCount: slots || existingSlots,
        schemaVersion: 2
      };
      if (data.inventoryJson) payload.inventoryJson = data.inventoryJson;
      else if (existing && existing.inventoryJson) payload.inventoryJson = existing.inventoryJson;
      if (data.localState && Object.keys(data.localState).length) payload.localState = data.localState;
      if (data.profile && Object.keys(data.profile).length) payload.profile = data.profile;
      payload = safeObject(payload);
      return ref.set(payload, { merge: true }).then(function() {
        lsSet("diggerz.cloudLocalUpdatedAt.v1", String(payload.updatedAt));
        console.log("[Diggerz Cloud] SAVED ok slots~", slots || existingSlots);
        return { ok: true, slots: slots || existingSlots, updatedAt: payload.updatedAt };
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

  function applyCloudData(data) {
    if (!data) return;
    try {
      if (data.inventoryJson) {
        ["diggerz.digtrade.rebuild.v3", "diggerz.digtrade.v1", "diggerz.inventory.v1", "digtrade_save"].forEach(function(key) {
          try { localStorage.setItem(key, data.inventoryJson); } catch (e) {}
        });
      }
      if (data.localState && typeof data.localState === "object") {
        Object.keys(data.localState).forEach(function(key) {
          if (!/^(diggerz\.(digtrade|inventory|shirtColor|menuBg|player|pet|clothes|appearance|progress|settings)|digtrade_save$)/i.test(key)) return;
          if (/^(diggerz\.(digtrade|inventory)|digtrade_save$)/i.test(key)) return;
          if (/firebase|auth|email|admin|session|token|resurrection|boundEmail/i.test(key)) return;
          if (typeof data.localState[key] === "string") {
            try { localStorage.setItem(key, data.localState[key]); } catch (e) {}
          }
        });
      }
      if (data.profile) {
        if (data.profile.shirtColor != null) lsSet("diggerz.shirtColor.v1", String(data.profile.shirtColor));
        if (data.profile.menuBg != null) lsSet("diggerz.menuBg.v1", String(data.profile.menuBg));
      }
      if (data.updatedAt) lsSet("diggerz.cloudLocalUpdatedAt.v1", String(data.updatedAt));
    } catch (e) {}
  }

  function pullCloudSave(apply) {
    if (!ready || !auth || !auth.currentUser) return Promise.resolve(null);
    return db.collection("users").doc(auth.currentUser.uid).get().then(function(snap) {
      if (!snap.exists) return null;
      var data = snap.data();
      if (apply && data) applyCloudData(data);
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
    lsSet("diggerz.localSaveUpdatedAt.v1", String(Date.now()));
    console.log("[Diggerz Cloud] dirty:", reason);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() { pushCloudSave(false); }, 800);
  }
  window.DiggerzDirtySave = dirtySave;

  // beforeunload / pagehide → save
  window.addEventListener("pagehide", function() { if (state.authenticated) pushCloudSave(false); });
  window.addEventListener("beforeunload", function() { if (state.authenticated) pushCloudSave(false); });
  // Periodic background sync protects progress if the player closes the tab unexpectedly.
  setInterval(function() {
    if (!state.authenticated || !ready || !auth || !auth.currentUser) return;
    pushCloudSave(false).then(function(r) {
      if (r && r.ok) lsSet("diggerz.lastSuccessfulCloudSave.v1", String(Date.now()));
    });
  }, 30000);

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
