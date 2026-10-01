/* =========================================================================
 *  RED CRIME - Aydınlatma
 *  Ekran boyutunda karanlık katmanı; ışık kaynakları "destination-out" ile
 *  karanlıktan oyulur. El feneri konisi, tavan lambaları (ev sahibi uyanınca),
 *  sokak/bahçe lambaları, pencerelerden ay ışığı, şömine.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;

  class Lighting {
    constructor() {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.scale = 0.5;
      this.w = 0;
      this.h = 0;
      this.houseLight = 0; // 0..1 ışıkların açıklık animasyonu
      this.flicker = 0;
    }

    resize(w, h, quality) {
      this.scale = quality === 'low' ? 0.35 : quality === 'medium' ? 0.5 : 0.65;
      const cw = Math.max(1, Math.ceil(w * this.scale));
      const ch = Math.max(1, Math.ceil(h * this.scale));
      if (cw !== this.canvas.width || ch !== this.canvas.height) {
        this.canvas.width = cw;
        this.canvas.height = ch;
      }
      this.w = w;
      this.h = h;
    }

    update(dt, scene) {
      const target = scene.lightsOn ? 1 : 0;
      if (target > this.houseLight) {
        // Floresan gibi titreyerek yanma
        this.flicker += dt;
        this.houseLight = Math.min(1, this.houseLight + dt * 1.6);
      } else {
        this.houseLight = Math.max(0, this.houseLight - dt * 0.8);
        this.flicker = 0;
      }
    }

    render(mainCtx, scene) {
      const ctx = this.ctx;
      const cam = scene.camera;
      const W = scene.world;
      const s = this.scale;
      const t = scene.time;
      const p = scene.player;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const darkness = scene.weather === 'fog' ? 0.86 : 0.87;
      // Gece mavisi karanlık (gri yerine ay ışığı tonu)
      ctx.fillStyle = `rgba(4,7,24,${darkness})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Dünya dönüşümü
      ctx.setTransform(s, 0, 0, s, 0, 0);
      cam.apply(ctx);
      ctx.globalCompositeOperation = 'destination-out';
      const view = cam.view;

      // Dışarısı (ay ışığı) — ev dışını hafif aydınlat
      const H = W.house;
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(view.x - 10, view.y - 10, H.x - (view.x - 10), view.h + 20);
      ctx.fillRect(H.r, view.y - 10, view.x + view.w + 10 - H.r, view.h + 20);
      ctx.fillRect(H.x, view.y - 10, H.w, H.topY - 190 - (view.y - 10));

      // Ev ışıkları
      const hl = this.houseLight;
      if (hl > 0) {
        let a = hl;
        if (hl < 1) a *= Math.random() < 0.3 ? 0.3 : 1; // titreşim
        for (const room of W.rooms) {
          if (room.x1 < view.x || room.x0 > view.x + view.w || room.y1 < view.y || room.y0 > view.y + view.h) continue;
          ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
          ctx.fillRect(room.x0, room.y0, room.x1 - room.x0, room.y1 - room.y0 + 4);
          const l = room.lamp;
          const r = Math.max(260, (room.x1 - room.x0) * 0.7);
          radial(ctx, l.x, l.y + 20, r, 0.4 * a);
        }
      }

      // Pencerelerden ay ışığı (ışıklar kapalıyken)
      if (hl < 1) {
        for (const win of W.windows) {
          if (win.x + win.w < view.x - 200 || win.x > view.x + view.w + 200) continue;
          const g = ctx.createLinearGradient(win.x, win.y, win.x + 60, win.y + 260);
          g.addColorStop(0, `rgba(0,0,0,${0.5 * (1 - hl)})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(win.x, win.y);
          ctx.lineTo(win.x + win.w, win.y);
          ctx.lineTo(win.x + win.w + 90, win.y + 236);
          ctx.lineTo(win.x + 70, win.y + 236);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - hl)})`;
          ctx.fillRect(win.x, win.y, win.w, win.h);
        }
      }

      // Lambalar (sokak, bahçe, şömine)
      for (const lamp of W.lamps) {
        if (lamp.kind === 'ceiling') continue;
        if (lamp.x + lamp.r < view.x || lamp.x - lamp.r > view.x + view.w) continue;
        const fl = 0.85 + Math.sin(t * 7 + lamp.x) * 0.05;
        radial(ctx, lamp.x, lamp.y, lamp.r, 0.8 * fl);
      }

      // Kamyon farları
      const tr = W.truck;
      if (tr) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.moveTo(tr.x + 6, tr.y - 54);
        ctx.lineTo(tr.x - 400, tr.y - 120);
        ctx.lineTo(tr.x - 400, tr.y + 20);
        ctx.closePath();
        ctx.fill();
        radial(ctx, tr.x + tr.w + 40, tr.y - 60, 170, 0.55);
      }

      // Oyuncunun çevre ışığı
      radial(ctx, p.cx, p.cy, 95, 0.55);

      // El feneri (bulunulan katla sınırlı — döşemeden geçmez)
      const clipFloor = (c) => {
        const H = W.house;
        if (p.cx < H.x || p.cx > H.r) return false;
        const k = scene.floorOf(p.bottom - 4);
        const fy = W.floorY(k);
        c.save();
        c.beginPath();
        c.rect(H.x - 2000, fy - C.FLOOR_H + C.SLAB, H.w + 4000, C.FLOOR_H - C.SLAB + 2);
        c.clip();
        return true;
      };
      if (p.flashOn) {
        const clipped = clipFloor(ctx);
        const hp = p.handPos;
        const range = p.flashRange;
        const spread = p.flashSpread;
        const g = ctx.createRadialGradient(hp.x, hp.y, 4, hp.x, hp.y, range);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.85)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(hp.x, hp.y);
        ctx.arc(hp.x, hp.y, range, p.aim - spread, p.aim + spread);
        ctx.closePath();
        ctx.fill();
        if (clipped) ctx.restore();
      }

      // Ev sahiplerinin çevresi (uyanıkken görünmeleri için hafif) + bekçi fenerleri
      for (const r of scene.residents) {
        if (r.state !== 'sleep') radial(ctx, r.x, r.y - 30, 70, 0.35);
        if (r.isGuard && r.state !== 'knocked') {
          const gx = r.x + r.facing * 34;
          const gy = r.y - 25;
          const a0 = r.facing > 0 ? 0.05 : Math.PI - 0.05;
          const g = ctx.createRadialGradient(gx, gy, 4, gx, gy, 460);
          g.addColorStop(0, 'rgba(0,0,0,0.95)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.arc(gx, gy, 460, a0 - 0.3, a0 + 0.3);
          ctx.closePath();
          ctx.fill();
        }
      }
      // Gece görüş gözlüğü
      if (RC.Save.hasPerm('nightvision')) radial(ctx, p.cx, p.cy, 330, 0.7);

      // Kasa (açıksa altın parıltısı)
      if (W.safe && W.safe.state.open) radial(ctx, W.safe.x + W.safe.w / 2, W.safe.y + 30, 90, 0.5);

      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Ana tuvale bindir
      mainCtx.save();
      mainCtx.setTransform(RC.Game.dpr * RC.Game.scale, 0, 0, RC.Game.dpr * RC.Game.scale, 0, 0);
      mainCtx.imageSmoothingEnabled = true;
      mainCtx.drawImage(this.canvas, 0, 0, this.w, this.h);
      mainCtx.restore();

      // Sıcak ışık tonları (additive)
      mainCtx.save();
      mainCtx.globalCompositeOperation = 'lighter';
      cam.apply(mainCtx);
      const q = RC.Save.settings.quality;
      // Pencerelerden giren soğuk ay ışığı huzmeleri
      if (hl < 1 && q !== 'low') {
        const k = 1 - hl;
        for (const win of W.windows) {
          if (win.x + win.w < view.x - 200 || win.x > view.x + view.w + 200) continue;
          const g = mainCtx.createLinearGradient(win.x, win.y, win.x + 60, win.y + 250);
          g.addColorStop(0, `rgba(130,160,255,${0.11 * k})`);
          g.addColorStop(1, 'rgba(130,160,255,0)');
          mainCtx.fillStyle = g;
          mainCtx.beginPath();
          mainCtx.moveTo(win.x, win.y);
          mainCtx.lineTo(win.x + win.w, win.y);
          mainCtx.lineTo(win.x + win.w + 90, win.y + 236);
          mainCtx.lineTo(win.x + 70, win.y + 236);
          mainCtx.closePath();
          mainCtx.fill();
          mainCtx.fillStyle = `rgba(120,150,255,${0.08 * k})`;
          mainCtx.fillRect(win.x, win.y, win.w, win.h);
        }
      }
      if (p.flashOn) {
        const clipped2 = clipFloor(mainCtx);
        const hp = p.handPos;
        const range = p.flashRange;
        const g = mainCtx.createRadialGradient(hp.x, hp.y, 4, hp.x, hp.y, range);
        g.addColorStop(0, 'rgba(255,236,190,0.26)');
        g.addColorStop(0.3, 'rgba(255,228,170,0.16)');
        g.addColorStop(0.75, 'rgba(255,214,150,0.05)');
        g.addColorStop(1, 'rgba(255,214,150,0)');
        mainCtx.fillStyle = g;
        mainCtx.beginPath();
        mainCtx.moveTo(hp.x, hp.y);
        mainCtx.arc(hp.x, hp.y, range, p.aim - p.flashSpread, p.aim + p.flashSpread);
        mainCtx.closePath();
        mainCtx.fill();
        // Huzme içinde süzülen toz zerreleri
        const motes = q === 'high' ? 46 : q === 'medium' ? 22 : 0;
        for (let i = 0; i < motes; i++) {
          const h1 = hash(i * 12.9898);
          const h2 = hash(i * 78.233);
          const h3 = hash(i * 39.425);
          const d = range * (0.12 + 0.82 * ((h1 + t * (0.01 + h3 * 0.02)) % 1));
          const a = p.aim + p.flashSpread * (h2 * 2 - 1) * 0.9 + Math.sin(t * 0.7 + i) * 0.02;
          const x = hp.x + Math.cos(a) * d;
          const y = hp.y + Math.sin(a) * d + Math.sin(t * (0.6 + h3) + i * 2) * 6;
          const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + h1 * 2) + i);
          const al = (1 - d / range) * 0.55 * tw;
          mainCtx.fillStyle = `rgba(255,240,210,${al})`;
          mainCtx.fillRect(x, y, 1.6 + h3 * 1.4, 1.6 + h3 * 1.4);
        }
        // Fenerin ağzındaki parlama
        const sg = mainCtx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 22);
        sg.addColorStop(0, 'rgba(255,250,230,0.55)');
        sg.addColorStop(1, 'rgba(255,250,230,0)');
        mainCtx.fillStyle = sg;
        mainCtx.fillRect(hp.x - 22, hp.y - 22, 44, 44);
        if (clipped2) mainCtx.restore();
      }
      // Bekçi fenerleri: soğuk beyaz huzme
      for (const r of scene.residents) {
        if (!r.isGuard || r.state === 'knocked') continue;
        const gx = r.x + r.facing * 34;
        const gy = r.y - 25;
        const a0 = r.facing > 0 ? 0.05 : Math.PI - 0.05;
        const g = mainCtx.createRadialGradient(gx, gy, 4, gx, gy, 460);
        g.addColorStop(0, 'rgba(220,235,255,0.2)');
        g.addColorStop(1, 'rgba(220,235,255,0)');
        mainCtx.fillStyle = g;
        mainCtx.beginPath();
        mainCtx.moveTo(gx, gy);
        mainCtx.arc(gx, gy, 460, a0 - 0.3, a0 + 0.3);
        mainCtx.closePath();
        mainCtx.fill();
      }
      if (hl > 0) {
        for (const room of W.rooms) {
          if (room.x1 < view.x || room.x0 > view.x + view.w || room.y1 < view.y || room.y0 > view.y + view.h) continue;
          const l = room.lamp;
          const g = mainCtx.createRadialGradient(l.x, l.y + 16, 4, l.x, l.y + 16, 220);
          g.addColorStop(0, `rgba(255,220,150,${0.14 * hl})`);
          g.addColorStop(1, 'rgba(255,220,150,0)');
          mainCtx.fillStyle = g;
          mainCtx.fillRect(l.x - 220, l.y - 204, 440, 440);
          // Abajurdan aşağı inen sıcak ışık konisi
          const fy = room.y1;
          const cg = mainCtx.createLinearGradient(0, l.y + 20, 0, fy);
          cg.addColorStop(0, `rgba(255,214,140,${0.12 * hl})`);
          cg.addColorStop(1, 'rgba(255,214,140,0)');
          mainCtx.fillStyle = cg;
          mainCtx.beginPath();
          mainCtx.moveTo(l.x - 18, l.y + 20);
          mainCtx.lineTo(l.x + 18, l.y + 20);
          mainCtx.lineTo(l.x + 200, fy);
          mainCtx.lineTo(l.x - 200, fy);
          mainCtx.closePath();
          mainCtx.fill();
        }
      }
      for (const lamp of W.lamps) {
        if (lamp.kind === 'ceiling') continue;
        if (lamp.x + lamp.r < view.x || lamp.x - lamp.r > view.x + view.w) continue;
        const g = mainCtx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, lamp.r * 0.6);
        g.addColorStop(0, U.rgba(lamp.color, 0.16));
        g.addColorStop(1, U.rgba(lamp.color, 0));
        mainCtx.fillStyle = g;
        mainCtx.fillRect(lamp.x - lamp.r, lamp.y - lamp.r, lamp.r * 2, lamp.r * 2);
        // Ampul parlaması (bloom)
        const fl = 0.9 + Math.sin(t * 7 + lamp.x) * 0.06;
        const bg = mainCtx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, 34);
        bg.addColorStop(0, U.rgba(lamp.color, 0.55 * fl));
        bg.addColorStop(0.35, U.rgba(lamp.color, 0.18 * fl));
        bg.addColorStop(1, U.rgba(lamp.color, 0));
        mainCtx.fillStyle = bg;
        mainCtx.fillRect(lamp.x - 34, lamp.y - 34, 68, 68);
      }
      if (RC.Save.hasPerm('nightvision') && !p.flashOn) {
        const nv = mainCtx.createRadialGradient(p.cx, p.cy, 10, p.cx, p.cy, 330);
        nv.addColorStop(0, 'rgba(60,255,120,0.10)');
        nv.addColorStop(1, 'rgba(60,255,120,0)');
        mainCtx.fillStyle = nv;
        mainCtx.fillRect(p.cx - 330, p.cy - 330, 660, 660);
      }
      mainCtx.restore();
    }
  }

  /** Sinematik son işlem: renk tonlaması, vinyet, film greni (HUD'dan önce) */
  Lighting.prototype.post = function (ctx, scene, w, h) {
    const q = RC.Save.settings.quality;
    const t = scene.time;
    ctx.save();
    if (q === 'high') {
      // Gölgelerde soğuk mavi, ışıklarda sıcak ton (soft-light)
      ctx.globalCompositeOperation = 'soft-light';
      const cg = ctx.createLinearGradient(0, 0, 0, h);
      cg.addColorStop(0, 'rgba(40,70,150,0.3)');
      cg.addColorStop(1, 'rgba(255,170,110,0.16)');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, w, h);
    }
    // Vinyet
    ctx.globalCompositeOperation = 'source-over';
    const r = Math.hypot(w, h) / 2;
    const vg = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r * 1.02);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(0,0,6,0.22)');
    vg.addColorStop(1, 'rgba(0,0,6,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    // Film greni
    if (q === 'high') {
      if (!this.grain) this.grain = makeGrain();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.07;
      const ox = Math.floor(hash(Math.floor(t * 24)) * 128);
      const oy = Math.floor(hash(Math.floor(t * 24) + 7.3) * 128);
      ctx.translate(-ox, -oy);
      ctx.fillStyle = ctx.createPattern(this.grain, 'repeat');
      ctx.fillRect(0, 0, w + 128, h + 128);
    }
    ctx.restore();
  };

  function makeGrain() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /** 0..1 arası kararlı sözde rastgele */
  function hash(n) {
    const x = Math.sin(n) * 43758.5453;
    return x - Math.floor(x);
  }

  function radial(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  RC.Lighting = Lighting;
})(window.RC);
