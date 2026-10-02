/**
 * Diggerz custom wearables — client
 * Hats, pants, shirts, shoes, face, hair, back (any appearance slot).
 * IDs 9000–9999. Applied via h.n7 → DiggerzApplyCustomWearable.
 */
(function (global) {
  "use strict";

  global.DiggerzCustomClothes = global.DiggerzCustomClothes || { byId: {}, list: [] };

  var SLOT_NAMES = { 0: "hair", 1: "hat", 2: "shirt", 3: "shoes", 5: "back", 6: "face", 7: "pants", 9: "face2" };

  function register(item) {
    if (!item || !(item.id | 0)) return;
    var id = item.id | 0;
    if (id < 9000 || id > 9999) return;
    item.slot = item.slot != null ? (item.slot | 0) : 1;
    item.category = 2;
    item.offsetX = item.offsetX != null ? Number(item.offsetX) : 0;
    item.offsetY = item.offsetY != null ? Number(item.offsetY) : (item.slot === 1 ? -20 : 0);
    item.t48 = !!item.t48;
    global.DiggerzCustomClothes.byId[id] = item;
    var list = global.DiggerzCustomClothes.list, found = false, i;
    for (i = 0; i < list.length; i++) {
      if ((list[i].id | 0) === id) { list[i] = item; found = true; break; }
    }
    if (!found) list.push(item);
    preloadSprite(item);
    try { console.log("[CustomWear] registered", id, item.name, SLOT_NAMES[item.slot] || item.slot); } catch (e) {}
  }

  function preloadSprite(item) {
    if (!item || !item.sprite || item.__canvas) return;
    try {
      var img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          var c = document.createElement("canvas");
          c.width = img.width || 1;
          c.height = img.height || 1;
          var ctx = c.getContext("2d");
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0);
          item.__canvas = c;
          item.__w = c.width;
          item.__h = c.height;
          tryBuildBitmap(item);
        } catch (e) {}
      };
      img.src = item.sprite;
      item.__img = img;
    } catch (e2) {}
  }

  function tryBuildBitmap(item) {
    if (!item || !item.__canvas || item.__bd) return;
    try {
      if (typeof Na !== "undefined" && Na.fromCanvas) {
        item.__bd = Na.fromCanvas(item.__canvas, true);
      }
    } catch (e) {}
  }

  global.DiggerzApplyCustomWearable = function (b, id) {
    try {
      id = id | 0;
      var item = global.DiggerzCustomClothes.byId[id];
      if (!item) return false;
      tryBuildBitmap(item);
      var w = item.__w || 64, h = item.__h || 64;
      try {
        if (typeof t !== "undefined" && typeof r === "function") t._5 = new r(0, 0, w, h);
      } catch (eR) {}
      if (item.__bd) {
        try { b.Init(item.__bd); } catch (eI) {
          try { b.Init(function () { return item.__bd; }); } catch (eI2) { return false; }
        }
      } else if (item.__canvas && typeof Na !== "undefined" && Na.fromCanvas) {
        try {
          item.__bd = Na.fromCanvas(item.__canvas, true);
          b.Init(item.__bd);
        } catch (eC) { return false; }
      } else {
        try { if (typeof f !== "undefined" && f.UNKNOWN_BLOCK_PNG) b.Init(f.UNKNOWN_BLOCK_PNG()); } catch (eU) {}
        setTimeout(function () { try { if (item.__canvas) tryBuildBitmap(item); } catch (e) {} }, 200);
      }
      b.a4 = 2;
      b._1 = String(item.name || ("Custom " + id));
      try { b.h44 = id; } catch (eH) {}
      var ox = item.offsetX | 0, oy = item.offsetY | 0, slot = item.slot | 0, t48 = !!item.t48;
      try {
        if (typeof h !== "undefined" && h.O27) h.O27(b, ox, oy, slot, t48);
        else { b.t44 = ox; b.t45 = oy; b.t46 = slot; b.T48 = t48; b.Q36 = 1; }
      } catch (eO) {
        try { b.t44 = ox; b.t45 = oy; b.t46 = slot; b.T48 = t48; } catch (eO2) {}
      }
      if (item.tint) {
        try {
          b.b8 = item.tint.r != null ? Number(item.tint.r) : 1;
          b.b9 = item.tint.g != null ? Number(item.tint.g) : 1;
          b.B0 = item.tint.b != null ? Number(item.tint.b) : 1;
        } catch (eT) {}
      }
      return true;
    } catch (err) {
      try { console.warn("[CustomWear] apply failed", id, err); } catch (e) {}
      return false;
    }
  };

  global.DiggerzGetCustomClothes = function (id) {
    return global.DiggerzCustomClothes.byId[id | 0] || null;
  };

  function injectInventory(items) {
    try {
      if (typeof q === "undefined" || !q.diggerzService || !q.diggerzService.state) return;
      var inv = q.diggerzService.state.inventory;
      if (!Array.isArray(inv)) inv = q.diggerzService.state.inventory = [];
      items.forEach(function (it) {
        var id = it.id | 0;
        var exists = inv.some(function (x) { return x && (x.id | 0) === id && (x.category | 0) === 2; });
        if (!exists) inv.push({ category: 2, id: id, count: 1, variant: 0 });
      });
    } catch (e) {}
  }

  global.DiggerzLoadCustomClothesFromServer = function (base) {
    base = base || "";
    return fetch(base + "/api/custom-clothes", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var items = (data && data.items) || [];
        items.forEach(register);
        injectInventory(items);
        return global.DiggerzCustomClothes;
      })
      .catch(function (err) {
        try { console.warn("[CustomWear] catalog fetch failed", err); } catch (e) {}
        return global.DiggerzCustomClothes;
      });
  };

  global.DiggerzRegisterCustomWearable = function (item) {
    register(item);
    injectInventory([item]);
    return item;
  };

  function boot() {
    try { global.DiggerzLoadCustomClothesFromServer(""); } catch (e) {}
  }
  if (document.readyState === "complete") setTimeout(boot, 1200);
  else window.addEventListener("load", function () { setTimeout(boot, 1200); });
})(typeof window !== "undefined" ? window : this);
