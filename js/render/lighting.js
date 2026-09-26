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
      ctx.fillStyle = `rgba(3,4,14,${darkness})`;
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
      if (p.flashOn) {
        const clipped2 = clipFloor(mainCtx);
        const hp = p.handPos;
        const g = mainCtx.createRadialGradient(hp.x, hp.y, 4, hp.x, hp.y, p.flashRange);
        g.addColorStop(0, 'rgba(255,240,190,0.16)');
        g.addColorStop(1, 'rgba(255,240,190,0)');
        mainCtx.fillStyle = g;
        mainCtx.beginPath();
        mainCtx.moveTo(hp.x, hp.y);
        mainCtx.arc(hp.x, hp.y, p.flashRange, p.aim - p.flashSpread, p.aim + p.flashSpread);
        mainCtx.closePath();
        mainCtx.fill();
        if (clipped2) mainCtx.restore();
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
        }
      }
      for (const lamp of W.lamps) {
        if (lamp.kind === 'ceiling') continue;
        if (lamp.x + lamp.r < view.x || lamp.x - lamp.r > view.x + view.w) continue;
        const g = mainCtx.createRadialGradient(lamp.x, lamp.y, 2, lamp.x, lamp.y, lamp.r * 0.6);
        g.addColorStop(0, U.rgba(lamp.color, 0.12));
        g.addColorStop(1, U.rgba(lamp.color, 0));
        mainCtx.fillStyle = g;
        mainCtx.fillRect(lamp.x - lamp.r, lamp.y - lamp.r, lamp.r * 2, lamp.r * 2);
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

  function radial(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  RC.Lighting = Lighting;
})(window.RC);
