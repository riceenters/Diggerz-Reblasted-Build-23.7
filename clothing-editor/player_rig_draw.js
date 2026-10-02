/**
 * Minimal diggerz player-rig drawer for Wearable Studio.
 * Uses tiles.png regions + player_rig.json (from diggerz_player_rig_editor).
 */
(function (global) {
  "use strict";

  function sample(arr, t, prop, base) {
    if (!arr || !arr.length) return base;
    if (t <= arr[0].time) return arr[0][prop] ?? base;
    if (t >= arr[arr.length - 1].time) return arr[arr.length - 1][prop] ?? base;
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i], b = arr[i + 1];
      if (t >= a.time && t <= b.time) {
        let u = (t - a.time) / (b.time - a.time || 1);
        if (a.curve === "stepped") u = 0;
        return (a[prop] ?? base) + ((b[prop] ?? base) - (a[prop] ?? base)) * u;
      }
    }
    return base;
  }

  function poseAt(rig, animName, t) {
    const a = (rig.animations && rig.animations[animName]) || {};
    const p = {};
    for (const b of rig.bones) {
      const q = (a.bones && a.bones[b.name]) || {};
      p[b.name] = {
        x: (b.x || 0) + sample(q.translate, t, "x", 0),
        y: (b.y || 0) + sample(q.translate, t, "y", 0),
        r: (b.rotation || 0) + sample(q.rotate, t, "angle", 0),
        sx: (b.scaleX ?? 1) * sample(q.scale, t, "x", 1),
        sy: (b.scaleY ?? 1) * sample(q.scale, t, "y", 1),
      };
    }
    return p;
  }

  function worldPose(rig, p) {
    const out = {};
    for (const b of rig.bones) {
      const q = p[b.name];
      const pa = b.parent ? out[b.parent] : null;
      const rad = (q.r * Math.PI) / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      if (!pa) {
        out[b.name] = { a: c * q.sx, b: s * q.sx, c: -s * q.sy, d: c * q.sy, x: q.x, y: q.y };
      } else {
        out[b.name] = {
          a: pa.a * c * q.sx + pa.c * s * q.sx,
          b: pa.b * c * q.sx + pa.d * s * q.sx,
          c: pa.a * (-s) * q.sy + pa.c * c * q.sy,
          d: pa.b * (-s) * q.sy + pa.d * c * q.sy,
          x: pa.a * q.x + pa.c * q.y + pa.x,
          y: pa.b * q.x + pa.d * q.y + pa.y,
        };
      }
    }
    return out;
  }

  function mul(A, B) {
    return {
      a: A.a * B.a + A.c * B.b,
      b: A.b * B.a + A.d * B.b,
      c: A.a * B.c + A.c * B.d,
      d: A.b * B.c + A.d * B.d,
      x: A.a * B.x + A.c * B.y + A.x,
      y: A.b * B.x + A.d * B.y + A.y,
    };
  }

  /**
   * Draw player body from tiles atlas, then optional wear canvas on a bone.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} opts
   */
  function drawPlayerRig(ctx, opts) {
    const {
      rig, regions, sheet, time = 0, animName = "idle",
      wearCanvas = null, wearSlot = 1, wearOx = 0, wearOy = 0,
      mirror = true, showBones = false,
    } = opts;
    if (!rig || !sheet || !regions) return;

    const skin = (rig.skins && (rig.skins.guyskin || rig.skins.default)) || {};
    const p = worldPose(rig, poseAt(rig, animName, time));

    // Slot draw order from rig
    for (const slot of rig.slots) {
      const attName = slot.attachment;
      if (!attName) continue;
      const att = skin[slot.name] && skin[slot.name][attName];
      if (!att) continue;
      const key = att.name || attName;
      const reg = regions[key] || regions[attName];
      if (!reg) continue;
      const wm = p[slot.bone];
      if (!wm) continue;
      const [sx, sy, sw, sh] = reg;
      const r = ((att.rotation || 0) * Math.PI) / 180;
      const c = Math.cos(r), s = Math.sin(r);
      const xs = att.scaleX ?? 1, ys = att.scaleY ?? 1;
      const local = { a: c * xs, b: s * xs, c: s * ys, d: -c * ys, x: att.x || 0, y: att.y || 0 };
      const F = mul(wm, local);
      ctx.save();
      ctx.transform(F.a, F.b, F.c, F.d, F.x, F.y);
      ctx.drawImage(sheet, sx, sy, sw, sh, -att.width / 2, -att.height / 2, att.width, att.height);
      ctx.restore();
    }

    // Custom wear on bone by slot
    if (wearCanvas) {
      const boneMap = {
        0: "head_bone", // hair
        1: "head_bone", // hat
        2: "chest", // shirt
        3: "front_foot_bone", // shoes (approx)
        5: "chest", // back
        6: "head_bone", // face
        7: "hips", // pants
        9: "head_bone",
      };
      const bone = boneMap[wearSlot] || "head_bone";
      const wm = p[bone];
      if (wm) {
        // local offset similar to hat placement on head
        const local = {
          a: 1, b: 0, c: 0, d: -1,
          x: wearOx,
          y: wearOy + (wearSlot === 1 || wearSlot === 0 || wearSlot === 6 ? 18 : 0),
        };
        const F = mul(wm, local);
        ctx.save();
        ctx.transform(F.a, F.b, F.c, F.d, F.x, F.y);
        ctx.drawImage(wearCanvas, -wearCanvas.width / 2, -wearCanvas.height / 2);
        ctx.restore();
      }
    }

    if (showBones) {
      ctx.strokeStyle = "rgba(0,255,255,0.7)";
      ctx.fillStyle = "rgba(0,255,255,0.9)";
      ctx.lineWidth = 0.6;
      for (const b of rig.bones) {
        const w = p[b.name];
        if (!w) continue;
        const len = b.length || 8;
        ctx.beginPath();
        ctx.moveTo(w.x, w.y);
        ctx.lineTo(w.x + w.a * len, w.y + w.b * len);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(w.x, w.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  global.DiggerzDrawPlayerRig = drawPlayerRig;
})(typeof window !== "undefined" ? window : this);
