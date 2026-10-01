/* =========================================================================
 *  RED CRIME - Yardımcı fonksiyonlar
 *  Matematik, rastgelelik, renk, geometri ve metin yardımcıları.
 * ========================================================================= */
window.RC = window.RC || {};

(function (RC) {
  'use strict';

  const U = {};

  /* ---------------------------------------------------------------------
   * Temel matematik
   * ------------------------------------------------------------------- */
  U.TAU = Math.PI * 2;
  U.DEG = Math.PI / 180;

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
  U.remap = (v, a1, b1, a2, b2) => U.lerp(a2, b2, U.clamp01(U.invLerp(a1, b1, v)));
  U.approach = (v, target, delta) => (v < target ? Math.min(v + delta, target) : Math.max(v - delta, target));
  U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  U.sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
  U.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  U.dist2 = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  };
  U.angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  U.wrapAngle = (a) => {
    while (a > Math.PI) a -= U.TAU;
    while (a < -Math.PI) a += U.TAU;
    return a;
  };
  U.angleDiff = (a, b) => U.wrapAngle(b - a);
  U.lerpAngle = (a, b, t) => a + U.angleDiff(a, b) * t;
  U.fract = (v) => v - Math.floor(v);
  U.pingPong = (t, len) => {
    const m = t % (len * 2);
    return m < len ? m : len * 2 - m;
  };
  U.snap = (v, step) => Math.round(v / step) * step;

  /* ---------------------------------------------------------------------
   * Yumuşatma (easing) fonksiyonları
   * ------------------------------------------------------------------- */
  U.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    outBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    inBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    },
    outElastic: (t) => {
      const c4 = U.TAU / 3;
      if (t === 0) return 0;
      if (t === 1) return 1;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    outBounce: (t) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    smoothstep: (t) => t * t * (3 - 2 * t),
  };

  /* ---------------------------------------------------------------------
   * Rastgelelik
   * ------------------------------------------------------------------- */
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  };

  /** Tohumlanabilir rastgele sayı üreteci (mulberry32). */
  class RNG {
    constructor(seed) {
      this.seed = (seed >>> 0) || 1;
      this.state = this.seed;
    }
    next() {
      let t = (this.state += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    float(a = 0, b = 1) {
      return a + this.next() * (b - a);
    }
    int(a, b) {
      return Math.floor(a + this.next() * (b - a + 1));
    }
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
    chance(p) {
      return this.next() < p;
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      return arr;
    }
    /** Ağırlıklı seçim: items = [{w: 3, v: ...}, ...] */
    weighted(items, key = 'w') {
      let total = 0;
      for (const it of items) total += it[key];
      let r = this.next() * total;
      for (const it of items) {
        r -= it[key];
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    }
    gauss(mean = 0, dev = 1) {
      const u = 1 - this.next();
      const v = this.next();
      return mean + dev * Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v);
    }
  }
  U.RNG = RNG;

  U.hashStr = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  /** Basit 1B değer gürültüsü (ateş titremesi, rüzgar vb. için). */
  U.noise1 = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const h = (n) => {
      const s = Math.sin(n * 127.1) * 43758.5453;
      return s - Math.floor(s);
    };
    const a = h(i);
    const b = h(i + 1);
    return U.lerp(a, b, U.ease.smoothstep(f));
  };

  /* ---------------------------------------------------------------------
   * Geometri
   * ------------------------------------------------------------------- */
  U.rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  U.rectsOverlapXYWH = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  U.pointInRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  U.rangeOverlap = (a0, a1, b0, b1) => a0 < b1 && a1 > b0;

  /** Doğru parçası - dikdörtgen kesişimi (Liang-Barsky). */
  U.segmentIntersectsRect = (x1, y1, x2, y2, r) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
    let u1 = 0;
    let u2 = 1;
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return false;
      } else {
        const t = q[i] / p[i];
        if (p[i] < 0) {
          if (t > u2) return false;
          if (t > u1) u1 = t;
        } else {
          if (t < u1) return false;
          if (t < u2) u2 = t;
        }
      }
    }
    return true;
  };

  /** Bir noktanın bir koni (yön + açı + uzunluk) içinde olup olmadığı. */
  U.pointInCone = (px, py, cx, cy, angle, spread, length) => {
    const d = U.dist(cx, cy, px, py);
    if (d > length) return false;
    if (d < 1) return true;
    const a = Math.atan2(py - cy, px - cx);
    return Math.abs(U.angleDiff(angle, a)) <= spread;
  };

  /* ---------------------------------------------------------------------
   * Renk yardımcıları
   * ------------------------------------------------------------------- */
  const colorCache = new Map();
  U.hexToRgb = (hex) => {
    let c = colorCache.get(hex);
    if (c) return c;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    c = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    colorCache.set(hex, c);
    return c;
  };
  U.rgbToHex = (r, g, b) =>
    '#' +
    [r, g, b]
      .map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('');
  U.rgba = (hex, a) => {
    const c = U.hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  };
  /** amt > 0 açar, amt < 0 koyulaştırır (-1..1) */
  U.shade = (hex, amt) => {
    const c = U.hexToRgb(hex);
    if (amt >= 0) {
      return U.rgbToHex(c.r + (255 - c.r) * amt, c.g + (255 - c.g) * amt, c.b + (255 - c.b) * amt);
    }
    const f = 1 + amt;
    return U.rgbToHex(c.r * f, c.g * f, c.b * f);
  };
  U.mix = (h1, h2, t) => {
    const a = U.hexToRgb(h1);
    const b = U.hexToRgb(h2);
    return U.rgbToHex(U.lerp(a.r, b.r, t), U.lerp(a.g, b.g, t), U.lerp(a.b, b.b, t));
  };
  U.hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  /**
   * Önbellek tuvallerinin çözünürlük çarpanı: ekranın gerçek piksel yoğunluğu
   * (dpr × ölçek), grafik kalitesine ve verilen üst sınıra göre kırpılır.
   * Böylece Retina / telefon ekranlarında arka planlar bulanık görünmez.
   */
  U.cacheRes = (max = 2) => {
    const G = RC.Game;
    const q = RC.Save && RC.Save.settings ? RC.Save.settings.quality : 'high';
    const cap = Math.min(max, q === 'low' ? 1 : q === 'medium' ? 1.5 : 2);
    if (!G || !G.dpr || !G.scale) return 1;
    return U.clamp(Math.ceil(G.dpr * G.scale * 4) / 4, 1, cap);
  };

  /* ---------------------------------------------------------------------
   * Çizim yardımcıları
   * ------------------------------------------------------------------- */
  U.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    if (r <= 0) {
      ctx.rect(x, y, w, h);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  U.fillRoundRect = (ctx, x, y, w, h, r, fill) => {
    ctx.beginPath();
    U.roundRect(ctx, x, y, w, h, r);
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  };
  U.strokeRoundRect = (ctx, x, y, w, h, r, stroke, lw) => {
    ctx.beginPath();
    U.roundRect(ctx, x, y, w, h, r);
    if (stroke) ctx.strokeStyle = stroke;
    if (lw) ctx.lineWidth = lw;
    ctx.stroke();
  };
  U.circle = (ctx, x, y, r, fill) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, U.TAU);
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  };
  U.ellipse = (ctx, x, y, rx, ry, rot, fill) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, U.TAU);
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  };
  U.line = (ctx, x1, y1, x2, y2, stroke, lw) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    if (stroke) ctx.strokeStyle = stroke;
    if (lw) ctx.lineWidth = lw;
    ctx.stroke();
  };
  U.poly = (ctx, pts, fill) => {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) ctx.fillStyle = fill;
    ctx.fill();
  };
  U.star = (ctx, x, y, r1, r2, n, rot = -Math.PI / 2) => {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? r1 : r2;
      const a = rot + (i * Math.PI) / n;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

  /* ---------------------------------------------------------------------
   * Metin
   * ------------------------------------------------------------------- */
  // Oyunun tek para birimi ABD dolarıdır (USD).
  U.CURRENCY = '$';
  U.formatMoney = (n) => {
    const v = Math.round(n);
    const s = Math.abs(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '-' : '') + U.CURRENCY + s;
  };
  U.formatShortMoney = (n) => {
    if (n >= 1e6) return U.CURRENCY + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
    if (n >= 1e4) return U.CURRENCY + Math.round(n / 1e3) + 'K';
    return U.formatMoney(n);
  };
  /**
   * Yumuşak tavan: tavana kadar değer aynen kalır, üstünde logaritmik büyür.
   * Nadir eşyalar değerli kalır ama tek başına bölüm hedefini karşılayamaz.
   */
  U.softCap = (v, cap, k = 0.35) => (v <= cap ? v : cap * (1 + k * Math.log(v / cap)));
  U.formatTime = (sec) => {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  };
  U.wrapText = (ctx, text, maxW) => {
    const out = [];
    const paragraphs = String(text).split('\n');
    for (const para of paragraphs) {
      const words = para.split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      out.push(line);
    }
    return out;
  };
  U.upperTR = (s) => String(s).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();

  /* ---------------------------------------------------------------------
   * Dizi / nesne
   * ------------------------------------------------------------------- */
  U.removeFrom = (arr, item) => {
    const i = arr.indexOf(item);
    if (i >= 0) arr.splice(i, 1);
    return i >= 0;
  };
  U.sum = (arr, fn) => arr.reduce((s, v) => s + (fn ? fn(v) : v), 0);
  U.maxBy = (arr, fn) => {
    let best = null;
    let bv = -Infinity;
    for (const v of arr) {
      const s = fn(v);
      if (s > bv) {
        bv = s;
        best = v;
      }
    }
    return best;
  };
  U.minBy = (arr, fn) => {
    let best = null;
    let bv = Infinity;
    for (const v of arr) {
      const s = fn(v);
      if (s < bv) {
        bv = s;
        best = v;
      }
    }
    return best;
  };
  U.deepMerge = (target, src) => {
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        U.deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  };

  /** Basit zamanlayıcı listesi (sahnelerde gecikmeli olaylar için). */
  class Timers {
    constructor() {
      this.list = [];
    }
    after(sec, fn) {
      this.list.push({ t: sec, fn });
    }
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const tm = this.list[i];
        tm.t -= dt;
        if (tm.t <= 0) {
          this.list.splice(i, 1);
          tm.fn();
        }
      }
    }
    clear() {
      this.list.length = 0;
    }
  }
  U.Timers = Timers;

  RC.U = U;
})(window.RC);
