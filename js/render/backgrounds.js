/* =========================================================================
 *  RED CRIME - Arka plan / manzara çizimleri
 *  Gece göğü, yıldızlar, ay, bulutlar, şehir silüetleri (paralaks),
 *  yağmur, sis, sokak lambaları, ağaçlar, çalılar.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const BG = {};

  /* ---------------------------------------------------------------------
   * Gökyüzü
   * ------------------------------------------------------------------- */
  const STARS = [];
  (function makeStars() {
    const rng = new U.RNG(777);
    for (let i = 0; i < 260; i++) {
      STARS.push({ x: rng.float(), y: rng.float() * 0.75, s: rng.float(0.4, 1.8), tw: rng.float(0.5, 3), ph: rng.float(0, 6) });
    }
  })();

  BG.sky = (ctx, w, h, t, o = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, o.top || '#05060f');
    g.addColorStop(0.55, o.mid || '#111634');
    g.addColorStop(1, o.bottom || '#2a1f3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const px = o.parallaxX || 0;
    const starAlpha = o.starAlpha == null ? 1 : o.starAlpha;
    for (const s of STARS) {
      const a = (0.45 + 0.55 * Math.sin(t * s.tw + s.ph)) * starAlpha;
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      const sx = U.fract(s.x - px * 0.00002) * w;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sx, s.y * h, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    if (o.moon !== false) BG.moon(ctx, o.moonX == null ? w * 0.8 : o.moonX, o.moonY == null ? h * 0.18 : o.moonY, o.moonR || 38);
  };

  BG.moon = (ctx, x, y, r) => {
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4);
    glow.addColorStop(0, 'rgba(255,245,210,0.35)');
    glow.addColorStop(1, 'rgba(255,245,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
    g.addColorStop(0, '#fffbe8');
    g.addColorStop(1, '#e3d9b5');
    U.circle(ctx, x, y, r, g);
    ctx.fillStyle = 'rgba(160,150,120,0.35)';
    U.circle(ctx, x - r * 0.3, y - r * 0.15, r * 0.18);
    U.circle(ctx, x + r * 0.25, y + r * 0.3, r * 0.24);
    U.circle(ctx, x + r * 0.35, y - r * 0.35, r * 0.1);
  };

  /* ---------------------------------------------------------------------
   * Bulutlar
   * ------------------------------------------------------------------- */
  BG.clouds = (ctx, w, h, t, o = {}) => {
    const n = o.count || 7;
    const rng = new U.RNG(o.seed || 42);
    ctx.fillStyle = o.color || 'rgba(40,46,80,0.55)';
    for (let i = 0; i < n; i++) {
      const baseX = rng.float(0, 1);
      const y = rng.float(0.05, 0.4) * h;
      const s = rng.float(0.6, 1.4);
      const speed = rng.float(4, 14) * (o.speed || 1);
      const x = U.fract(baseX + (t * speed) / (w + 400) - (o.parallaxX || 0) * 0.00005) * (w + 400) - 200;
      for (let k = 0; k < 5; k++) {
        U.ellipse(ctx, x + k * 34 * s, y + Math.sin(k * 1.7) * 8 * s, 42 * s, 18 * s, 0);
      }
    }
  };

  /* ---------------------------------------------------------------------
   * Şehir silüeti (önbelleğe alınmış, tekrar eden şerit)
   * ------------------------------------------------------------------- */
  class Skyline {
    constructor(o) {
      this.seed = o.seed || 1;
      this.color = o.color || '#161a33';
      this.minH = o.minH || 80;
      this.maxH = o.maxH || 260;
      this.width = o.width || 1600;
      this.windowColor = o.windowColor || '#ffd98a';
      this.windowChance = o.windowChance == null ? 0.25 : o.windowChance;
      this.canvas = null;
      this.build();
    }
    build() {
      const rng = new U.RNG(this.seed);
      const h = this.maxH + 40;
      const c = document.createElement('canvas');
      c.width = this.width;
      c.height = h;
      const ctx = c.getContext('2d');
      let x = 0;
      this.blinkers = [];
      while (x < this.width) {
        const bw = rng.int(50, 140);
        const bh = rng.int(this.minH, this.maxH);
        const top = h - bh;
        ctx.fillStyle = this.color;
        ctx.fillRect(x, top, bw, bh);
        // Çatı detayları
        const roof = rng.int(0, 4);
        if (roof === 0) {
          ctx.fillRect(x + bw * 0.4, top - 18, bw * 0.2, 18);
          ctx.fillRect(x + bw * 0.48, top - 34, 3, 16);
          this.blinkers.push({ x: x + bw * 0.48 + 1.5, y: top - 34 });
        } else if (roof === 1) {
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x + bw / 2, top - 30);
          ctx.lineTo(x + bw, top);
          ctx.fill();
        } else if (roof === 2) {
          ctx.fillRect(x + 6, top - 10, bw * 0.3, 10);
          ctx.fillRect(x + bw * 0.6, top - 14, bw * 0.25, 14);
        } else if (roof === 3) {
          ctx.beginPath();
          ctx.arc(x + bw / 2, top, bw * 0.3, Math.PI, 0);
          ctx.fill();
        }
        // Pencereler
        const cols = Math.floor((bw - 10) / 14);
        const rows = Math.floor((bh - 16) / 18);
        for (let cy = 0; cy < rows; cy++) {
          for (let cx = 0; cx < cols; cx++) {
            if (rng.chance(this.windowChance)) {
              ctx.fillStyle = rng.chance(0.8) ? this.windowColor : '#9fd4ff';
              ctx.globalAlpha = rng.float(0.35, 0.95);
              ctx.fillRect(x + 7 + cx * 14, top + 10 + cy * 18, 7, 9);
              ctx.globalAlpha = 1;
            }
          }
        }
        x += bw + rng.int(0, 16);
      }
      this.canvas = c;
      this.h = h;
    }
    /** offsetX: kaydırma, baseY: zemin çizgisi (ekran koordinatı) */
    render(ctx, offsetX, baseY, viewW, t) {
      const w = this.width;
      let sx = -U.fract(offsetX / w) * w;
      while (sx < viewW) {
        ctx.drawImage(this.canvas, Math.floor(sx), Math.floor(baseY - this.h));
        for (const b of this.blinkers) {
          if (Math.sin(t * 3 + b.x) > 0.6) {
            U.circle(ctx, sx + b.x, baseY - this.h + b.y, 2.2, '#ff3b3b');
          }
        }
        sx += w;
      }
    }
  }
  BG.Skyline = Skyline;

  /* ---------------------------------------------------------------------
   * Yağmur (ekran uzayı)
   * ------------------------------------------------------------------- */
  class Rain {
    constructor(count = 260) {
      this.drops = [];
      this.count = count;
      this.wind = -120;
      this.intensity = 1;
      for (let i = 0; i < count; i++) this.drops.push(this.spawn(true));
    }
    spawn(any) {
      return {
        x: U.rand(-100, 2200),
        y: any ? U.rand(-50, 900) : U.rand(-80, -10),
        l: U.rand(10, 24),
        v: U.rand(700, 1100),
        z: U.rand(0.4, 1),
      };
    }
    update(dt, w, h) {
      for (const d of this.drops) {
        d.y += d.v * d.z * dt;
        d.x += this.wind * d.z * dt;
        if (d.y > h + 20 || d.x < -120) {
          Object.assign(d, this.spawn(false));
          d.x = U.rand(-50, w + 200);
        }
      }
    }
    render(ctx, alpha = 0.35) {
      ctx.strokeStyle = `rgba(170,190,255,${alpha * this.intensity})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const k = this.wind / 1000;
      const lim = Math.floor(this.drops.length * this.intensity);
      for (let i = 0; i < lim; i++) {
        const d = this.drops[i];
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + k * d.l * 2, d.y - d.l * d.z);
      }
      ctx.stroke();
    }
  }
  BG.Rain = Rain;

  /* ---------------------------------------------------------------------
   * Sis katmanı
   * ------------------------------------------------------------------- */
  BG.fog = (ctx, w, h, t, alpha = 0.25) => {
    for (let i = 0; i < 4; i++) {
      const y = h * (0.45 + i * 0.13);
      const off = (t * (10 + i * 6)) % (w + 600);
      const g = ctx.createLinearGradient(0, y - 60, 0, y + 60);
      g.addColorStop(0, 'rgba(180,190,220,0)');
      g.addColorStop(0.5, `rgba(180,190,220,${alpha * (0.5 + i * 0.15)})`);
      g.addColorStop(1, 'rgba(180,190,220,0)');
      ctx.fillStyle = g;
      for (let k = -1; k < 3; k++) {
        U.ellipse(ctx, off + k * 700 - 300, y, 420, 50, 0);
      }
    }
  };

  /* ---------------------------------------------------------------------
   * Sokak lambası
   * ------------------------------------------------------------------- */
  BG.streetLamp = (ctx, x, y, h = 220, on = true, t = 0, dir = 1) => {
    ctx.fillStyle = '#1c1f2b';
    ctx.fillRect(x - 4, y - h, 8, h);
    ctx.fillRect(x - 10, y - 12, 20, 12);
    ctx.fillRect(x - 3, y - h, 40 * dir, 5);
    ctx.fillStyle = '#2a2e3d';
    U.poly(ctx, [x + 30 * dir, y - h + 3, x + 50 * dir, y - h + 3, x + 46 * dir, y - h + 14, x + 34 * dir, y - h + 14]);
    if (on) {
      const flick = 0.9 + Math.sin(t * 17) * 0.03 + (Math.sin(t * 3.1) > 0.995 ? -0.5 : 0);
      const lx = x + 40 * dir;
      const ly = y - h + 14;
      const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 90);
      g.addColorStop(0, `rgba(255,225,150,${0.55 * flick})`);
      g.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 90, ly - 90, 180, 180);
      // Işık konisi
      const g2 = ctx.createLinearGradient(lx, ly, lx, y);
      g2.addColorStop(0, `rgba(255,225,150,${0.22 * flick})`);
      g2.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = g2;
      U.poly(ctx, [lx - 7, ly, lx + 7, ly, lx + 80, y, lx - 80, y]);
      U.ellipse(ctx, lx, ly + 1, 7, 3, 0, '#fff4c8');
    }
  };

  /* ---------------------------------------------------------------------
   * Ağaç, çalı, çit
   * ------------------------------------------------------------------- */
  BG.tree = (ctx, x, y, s = 1, seed = 1, t = 0, dark = false) => {
    const rng = new U.RNG(seed);
    const trunk = dark ? '#1a1410' : '#4a3222';
    const leaf = dark ? '#0d1a14' : rng.pick(['#1f4a2c', '#255e34', '#2d5a26', '#1d4e3a']);
    ctx.fillStyle = trunk;
    U.poly(ctx, [x - 10 * s, y, x - 6 * s, y - 110 * s, x + 6 * s, y - 110 * s, x + 12 * s, y]);
    ctx.strokeStyle = trunk;
    ctx.lineWidth = 5 * s;
    U.line(ctx, x, y - 80 * s, x - 30 * s, y - 120 * s);
    U.line(ctx, x, y - 90 * s, x + 28 * s, y - 130 * s);
    const sway = Math.sin(t * 0.8 + seed) * 3 * s;
    const blobs = 7;
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * U.TAU;
      const bx = x + Math.cos(a) * 45 * s + sway;
      const by = y - 150 * s + Math.sin(a) * 30 * s;
      U.circle(ctx, bx, by, rng.float(32, 46) * s, U.shade(leaf, rng.float(-0.15, 0.1)));
    }
    U.circle(ctx, x + sway, y - 160 * s, 48 * s, leaf);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    U.circle(ctx, x - 18 * s + sway, y - 185 * s, 26 * s);
  };

  BG.bush = (ctx, x, y, w, h, seed = 1, color = '#24502f') => {
    const rng = new U.RNG(seed);
    const n = Math.max(3, Math.floor(w / 26));
    for (let i = 0; i < n; i++) {
      const bx = x + (i + 0.5) * (w / n);
      const r = rng.float(0.45, 0.62) * h;
      U.circle(ctx, bx, y + h - r * 0.9, r, U.shade(color, rng.float(-0.2, 0.08)));
    }
    ctx.fillStyle = U.shade(color, -0.25);
    ctx.fillRect(x + 4, y + h - 8, w - 8, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < n; i++) {
      U.circle(ctx, x + (i + 0.35) * (w / n), y + h * 0.35, h * 0.14);
    }
  };

  BG.fence = (ctx, x, y, w, h = 70, color = '#e8e2d2') => {
    ctx.fillStyle = U.shade(color, -0.2);
    ctx.fillRect(x, y - h * 0.75, w, 6);
    ctx.fillRect(x, y - h * 0.3, w, 6);
    ctx.fillStyle = color;
    for (let px = x; px < x + w; px += 22) {
      U.poly(ctx, [px, y, px, y - h + 8, px + 7, y - h, px + 14, y - h + 8, px + 14, y]);
    }
  };

  BG.brickWall = (ctx, x, y, w, h, color = '#6b3a2e', mortar = '#3a1f18') => {
    ctx.fillStyle = mortar;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    const bh = 14;
    const bw = 34;
    for (let row = 0; row * bh < h; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let bx = -off; bx < w; bx += bw) {
        const rx = Math.max(x, x + bx + 1);
        const rw = Math.min(x + bx + bw - 1, x + w) - rx;
        if (rw > 0) {
          const shadeAmt = ((row * 7 + Math.floor(bx)) % 5) * 0.03 - 0.06;
          ctx.fillStyle = U.shade(color, shadeAmt);
          ctx.fillRect(rx, y + row * bh + 1, rw, Math.min(bh - 2, y + h - (y + row * bh + 1)));
        }
      }
    }
  };

  RC.BG = BG;
})(window.RC);
