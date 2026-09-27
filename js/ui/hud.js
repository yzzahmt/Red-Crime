/* =========================================================================
 *  RED CRIME - Soygun arayüzü (HUD)
 *  Süre, kamyondaki ganimet, hedef çubuğu, ev sahiplerinin durumu,
 *  gürültü ölçer, eldeki eşya kartı, çuval, anahtar, bağlamsal ipuçları,
 *  bildirimler, mini harita, tehlike vinyeti.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;

  const STATE_TXT = {
    sleep: { t: 'Uyuyor', c: '#8fb7ff', icon: 'zzz' },
    waking: { t: 'UYANDI!', c: '#ff8c2e', icon: 'exclaim' },
    investigate: { t: 'Araştırıyor', c: '#ffc83d', icon: 'question' },
    search: { t: 'Arıyor', c: '#ffc83d', icon: 'eye' },
    chase: { t: 'KOVALIYOR!', c: '#ff3043', icon: 'exclaim' },
    return: { t: 'Yatağa dönüyor', c: '#9aa3c7', icon: 'home' },
    sweep: { t: 'EVİ ARIYOR!', c: '#ff8c2e', icon: 'eye' },
    patrol: { t: 'Devriyede', c: '#8fb7ff', icon: 'flashlight' },
    knocked: { t: 'Baygın', c: '#9ad08a', icon: 'zzz' },
  };

  const HUD = {
    toasts: [],
    noiseShown: 0,
    noisePeak: 0,
    valueShown: 0,

    reset() {
      this.toasts.length = 0;
      this.noiseShown = 0;
      this.noisePeak = 0;
      this.valueShown = 0;
    },

    toast(text, color = '#ffffff', dur = 2.6) {
      text = RC.Lx(text);
      // Aynı mesaj üst üste gelmesin
      const same = this.toasts.find((t) => t.text === text);
      if (same) {
        same.t = 0;
        return;
      }
      this.toasts.unshift({ text, color, t: 0, dur });
      if (this.toasts.length > 5) this.toasts.pop();
    },

    update(dt, scene) {
      for (let i = this.toasts.length - 1; i >= 0; i--) {
        this.toasts[i].t += dt;
        if (this.toasts[i].t > this.toasts[i].dur) this.toasts.splice(i, 1);
      }
      this.noiseShown = U.damp(this.noiseShown, scene.playerNoise, 10, dt);
      this.noisePeak = Math.max(this.noisePeak - dt * 0.4, this.noiseShown);
      this.valueShown = U.damp(this.valueShown, scene.loadedValue, 6, dt);
      if (Math.abs(this.valueShown - scene.loadedValue) < 1) this.valueShown = scene.loadedValue;
    },

    render(ctx, scene, w, h) {
      const t = scene.time;
      this.drawDanger(ctx, scene, w, h, t);
      this.drawTimer(ctx, scene, 18, 16, t);
      this.drawLoot(ctx, scene, w, t);
      this.drawResidents(ctx, scene, w - 18, 16, t);
      this.drawNoise(ctx, scene, 22, h / 2 - 90);
      this.drawCarry(ctx, scene, 18, h - 18, t);
      this.drawGadgets(ctx, scene, w, h, t);
      this.drawSecurity(ctx, scene, 18, t);
      this.drawPrompts(ctx, scene, w, h, t);
      this.drawToasts(ctx, w, t);
      RC.Minimap.render(ctx, scene, w - 18, h - 18, false);
      if (scene.player.hidden) {
        D.text(ctx, 'SAKLANIYORSUN', w / 2, h - 132, {
          size: 16,
          font: C.FONT_TITLE,
          align: 'center',
          color: '#3ddc84',
          stroke: 'rgba(0,0,0,0.7)',
          strokeW: 4,
          alpha: 0.75 + Math.sin(t * 4) * 0.25,
        });
      }
      if (RC.Save.settings.showFps) {
        D.text(ctx, RC.Game.fps + ' FPS', w - 18, h - 150, { size: 12, align: 'right', color: '#9aa3c7' });
      }
    },

    /* ------------------------------------------------------------------ */
    drawDanger(ctx, scene, w, h, t) {
      const d = scene.dangerLevel;
      if (d > 0.05) {
        const pulse = 0.6 + Math.sin(t * (d > 0.8 ? 10 : 4)) * 0.4;
        D.vignette(ctx, w, h, 0.55 * d * pulse, '#c0101e');
      }
      if (scene.policeCalled) {
        const k = Math.floor(t * 4) % 2;
        const g1 = ctx.createLinearGradient(0, 0, 160, 0);
        g1.addColorStop(0, k ? 'rgba(255,40,60,0.35)' : 'rgba(40,100,255,0.35)');
        g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, 160, h);
        const g2 = ctx.createLinearGradient(w, 0, w - 160, 0);
        g2.addColorStop(0, k ? 'rgba(40,100,255,0.35)' : 'rgba(255,40,60,0.35)');
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(w - 160, 0, 160, h);
      }
    },

    drawTimer(ctx, scene, x, y, t) {
      const time = scene.timeLeft;
      const low = time < 30;
      const pw = 190;
      const ph = scene.policeCalled ? 92 : 62;
      D.panel(ctx, x, y, pw, ph, { accent: low ? '#ff3043' : C.COLORS.red });
      const pulse = low ? 1 + Math.sin(t * 12) * 0.06 : 1;
      D.icon(ctx, 'clock', x + 30, y + 34, 26, low ? '#ff3043' : '#f2f4ff');
      ctx.save();
      ctx.translate(x + 112, y + 46);
      ctx.scale(pulse, pulse);
      D.text(ctx, U.formatTime(time), 0, 0, { size: 34, font: C.FONT_TITLE, align: 'center', color: low ? '#ff3043' : '#f2f4ff', shadow: true });
      ctx.restore();
      if (scene.policeCalled) {
        const pc = Math.max(0, scene.policeT);
        D.icon(ctx, 'police', x + 26, y + 74, 20);
        D.text(ctx, RC.L('POLİS: {t}', { t: U.formatTime(pc) }), x + 44, y + 80, { size: 15, weight: 'bold', color: Math.floor(t * 4) % 2 ? '#ff5060' : '#6aa0ff' });
      }
      // Gerilim aşaması
      if (scene.heat) {
        const info = scene.heat.info;
        const hy = y + ph + 6;
        const fl = scene.heat.flash;
        ctx.fillStyle = 'rgba(8,10,20,0.82)';
        U.fillRoundRect(ctx, x, hy, pw, 24, 6);
        ctx.fillStyle = U.rgba(info.color, 0.25 + fl * 0.5);
        U.fillRoundRect(ctx, x, hy, 8 + (pw - 8) * ((scene.heat.stage + 1) / 4), 24, 6);
        D.text(ctx, RC.L(info.name), x + pw / 2, hy + 17, { size: 12, weight: 'bold', align: 'center', color: info.color });
      }
    },

    drawLoot(ctx, scene, w, t) {
      const cfg = scene.world.cfg;
      const pw = Math.min(460, w - 520);
      const x = w / 2 - pw / 2;
      const y = 16;
      D.panel(ctx, x, y, pw, 66, { accent: C.COLORS.gold });
      D.icon(ctx, 'truck', x + 26, y + 26, 24, C.COLORS.gold);
      D.text(ctx, 'KAMYONDA', x + 46, y + 24, { size: 12, weight: 'bold', color: '#9aa3c7' });
      D.text(ctx, U.formatMoney(this.valueShown), x + 46, y + 44, { size: 22, font: C.FONT_TITLE, color: C.COLORS.gold, shadow: true });
      const bagV = scene.player.bagValue + (scene.player.held ? scene.player.held.value : 0);
      if (bagV > 0) D.text(ctx, RC.L('+ {v} üzerinde', { v: U.formatMoney(bagV) }), x + pw - 14, y + 24, { size: 12, align: 'right', color: '#9aa3c7' });
      // Hedef çubuğu (3 yıldız eşiği)
      const bx = x + 14;
      const bw = pw - 28;
      const by = y + 52;
      const maxV = cfg.stars[2];
      D.bar(ctx, bx, by, bw, 8, this.valueShown / maxV, { from: '#ff8c2e', to: '#ffc83d' });
      cfg.stars.forEach((sv, i) => {
        const sx = bx + (sv / maxV) * bw;
        const got = scene.loadedValue >= sv;
        D.icon(ctx, got ? 'star' : 'starEmpty', Math.min(sx, bx + bw - 6), by + 4, 14, got ? C.COLORS.gold : 'rgba(255,255,255,0.5)');
      });
      D.text(ctx, RC.L('Hedef {v}', { v: U.formatShortMoney(cfg.target) }), x + pw - 14, y + 44, { size: 12, align: 'right', color: scene.loadedValue >= cfg.target ? '#3ddc84' : '#f2f4ff' });
    },

    drawResidents(ctx, scene, xr, y, t) {
      const list = scene.residents;
      const pw = 230;
      const rowH = 44;
      const ph = 12 + list.length * rowH + (scene.dog ? 30 : 0);
      const x = xr - pw;
      this.residentsBottom = y + ph;
      D.panel(ctx, x, y, pw, ph, { accent: '#8fb7ff' });
      list.forEach((r, i) => {
        const ry = y + 10 + i * rowH;
        const st = STATE_TXT[r.state] || STATE_TXT.sleep;
        U.circle(ctx, x + 22, ry + 18, 13, r.color);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + 22, ry + 18, 13, 0, U.TAU);
        ctx.stroke();
        D.icon(ctx, st.icon, x + 22, ry + 18, 14, '#fff');
        D.text(ctx, r.displayName, x + 42, ry + 13, { size: 13, weight: 'bold' });
        const blink = r.state === 'chase' && Math.floor(t * 6) % 2;
        D.text(ctx, st.t, x + 42, ry + 30, { size: 12, color: blink ? '#fff' : st.c, weight: 'bold' });
        // Uyanma / şüphe çubuğu
        const val = r.state === 'sleep' ? r.wake / 100 : r.state === 'knocked' ? r.knockT / 25 : r.suspicion / 100;
        D.bar(ctx, x + 150, ry + 12, 66, 8, val, { from: r.state === 'sleep' ? '#4aa8ff' : '#ffc83d', to: '#ff3043' });
        D.icon(ctx, r.state === 'sleep' ? 'ear' : 'eye', x + 140, ry + 16, 12, '#9aa3c7');
      });
      if (scene.dog) {
        const dy = y + 10 + list.length * rowH;
        const d = scene.dog;
        D.icon(ctx, 'dog', x + 22, dy + 10, 18, '#e6d3a8');
        const nm = d.name || 'Bekçi Köpeği';
        const dt = d.state === 'sleep' ? RC.L('{n} uyuyor', { n: nm }) : d.state === 'chase' ? RC.L('{n} HAVLIYOR!', { n: nm.toLocaleUpperCase('tr-TR') }) : RC.L('{n} tetikte', { n: nm });
        D.text(ctx, dt, x + 42, dy + 15, { size: 12, weight: 'bold', color: d.state === 'chase' ? '#ff3043' : d.state === 'sleep' ? '#8fb7ff' : '#ffc83d' });
      }
    },

    /** Karanlık ağ ekipman çubuğu (1-5) */
    drawGadgets(ctx, scene, w, h, t) {
      const list = C.DARKWEB.filter((g) => g.key);
      const owned = list.filter((g) => RC.Save.gadgetCount(g.id) > 0);
      this.gadgetRects = [];
      if (!owned.length) return;
      const sz = 46;
      const gap = 6;
      const total = list.length * (sz + gap) - gap;
      const x0 = w / 2 + 130;
      const y = h - sz - 20;
      list.forEach((g, i) => {
        const n = RC.Save.gadgetCount(g.id);
        const x = x0 + i * (sz + gap);
        if (n) this.gadgetRects.push({ x, y, w: sz, h: sz, key: g.key });
        ctx.globalAlpha = n ? 1 : 0.35;
        ctx.fillStyle = 'rgba(4,18,10,0.88)';
        U.fillRoundRect(ctx, x, y, sz, sz, 8);
        ctx.strokeStyle = n ? '#3ddc84' : '#1f6a3a';
        ctx.lineWidth = 1.5;
        U.strokeRoundRect(ctx, x + 0.5, y + 0.5, sz - 1, sz - 1, 8);
        D.icon(ctx, g.icon, x + sz / 2, y + sz / 2 - 2, 22, '#3ddc84');
        D.text(ctx, g.key, x + 6, y + 14, { size: 11, font: C.FONT_MONO, color: '#9fffc4' });
        D.text(ctx, 'x' + n, x + sz - 5, y + sz - 5, { size: 12, font: C.FONT_MONO, align: 'right', color: '#ffd24a' });
        ctx.globalAlpha = 1;
      });
      if (scene.jamT > 0) D.text(ctx, RC.L('Kameralar kör: {s} sn', { s: Math.ceil(scene.jamT) }), x0 + total / 2, y - 8, { size: 12, align: 'center', color: '#4aa8ff', weight: 'bold' });
    },

    /** Güvenlik sistemi durumu */
    drawSecurity(ctx, scene, x, t) {
      const W = scene.world;
      if (!W.cameras.length && !W.lasers.length && !W.panel && !(W.motions || []).length && !(W.plates || []).length) return;
      const y = (scene.policeCalled ? 116 : 86) + (scene.heat ? 30 : 0);
      const pw = 190;
      D.panel(ctx, x, y, pw, 40, { r: 10, accent: scene.alarm ? '#ff3043' : scene.secDisabled ? '#3ddc84' : '#ffc83d' });
      let txt;
      let col;
      if (scene.alarm) {
        txt = RC.L('ALARM ÇALIYOR!');
        col = Math.floor(t * 6) % 2 ? '#ff3043' : '#ffffff';
      } else if (scene.secDisabled) {
        txt = RC.L('Güvenlik kapalı');
        col = '#3ddc84';
      } else {
        txt = RC.L('Güvenlik aktif');
        col = '#ffc83d';
      }
      D.icon(ctx, 'camera', x + 20, y + 22, 18, col);
      D.text(ctx, txt, x + 36, y + 20, { size: 13, weight: 'bold', color: col });
      D.text(ctx, RC.L('{c} kamera · {l} lazer · {m} sensör', { c: W.cameras.length, l: W.lasers.length + (W.sweepers || []).length, m: (W.motions || []).length + (W.plates || []).length }), x + 36, y + 34, { size: 11, color: '#9aa3c7' });
    },

    drawNoise(ctx, scene, x, y) {
      const h = 180;
      const w = 18;
      D.panel(ctx, x - 8, y - 30, w + 16, h + 46, { r: 10 });
      D.icon(ctx, 'sound', x + w / 2, y - 14, 16, '#9aa3c7');
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      U.fillRoundRect(ctx, x, y, w, h, 6);
      const v = U.clamp01(this.noiseShown);
      const g = ctx.createLinearGradient(0, y + h, 0, y);
      g.addColorStop(0, '#3ddc84');
      g.addColorStop(0.5, '#ffc83d');
      g.addColorStop(1, '#ff3043');
      ctx.fillStyle = g;
      U.fillRoundRect(ctx, x, y + h * (1 - v), w, h * v, 6);
      // Tepe işareti
      const pk = U.clamp01(this.noisePeak);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 2, y + h * (1 - pk) - 1, w + 4, 2);
      for (let i = 1; i < 4; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x, y + (h * i) / 4, w, 1);
      }
    },

    drawCarry(ctx, scene, x, yb, t) {
      const p = scene.player;
      const slots = p.bagCap;
      const cols = 6;
      const rows = Math.ceil(slots / cols);
      const slot = 30;
      const bw = cols * (slot + 4) + 16;
      const bh = rows * (slot + 4) + 40;
      let y = yb - bh;
      // Fareyle sürüklenen ganimetin bırakılacağı hedef (bkz. RC.DragLoot)
      this.bagRect = { x, y, w: bw, h: bh };
      const dragging = scene.drag && I.hover(x, y, bw, bh);
      D.panel(ctx, x, y, bw, bh, { accent: dragging ? C.COLORS.gold : '#8a6a3a' });
      D.icon(ctx, 'bag', x + 18, y + 18, 18, '#c49a6a');
      D.text(ctx, RC.L('ÇUVAL {a}/{b}', { a: p.bag.length, b: slots }), x + 34, y + 23, { size: 12, weight: 'bold', color: p.bag.length >= slots ? '#ff8c2e' : '#f2f4ff' });
      D.text(ctx, U.formatMoney(p.bagValue), x + bw - 12, y + 23, { size: 12, align: 'right', color: C.COLORS.gold, weight: 'bold' });
      for (let i = 0; i < slots; i++) {
        const cx = x + 8 + (i % cols) * (slot + 4);
        const cy = y + 32 + Math.floor(i / cols) * (slot + 4);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        U.fillRoundRect(ctx, cx, cy, slot, slot, 5);
        const it = p.bag[i];
        if (it) {
          ctx.strokeStyle = it.rarity.color;
          ctx.lineWidth = 1.5;
          U.strokeRoundRect(ctx, cx + 1, cy + 1, slot - 2, slot - 2, 5);
          const sc = Math.min(1, (slot - 8) / Math.max(it.w, it.h));
          it.drawAt(ctx, cx + slot / 2, cy + slot / 2, sc);
        }
      }
      // Anahtar
      if (p.hasKey) {
        const kx = x + bw + 12;
        D.panel(ctx, kx, yb - 50, 50, 50, { accent: C.COLORS.gold });
        D.icon(ctx, 'key', kx + 25, yb - 24, 26, C.COLORS.gold);
      }
      // Eldeki eşya kartı
      if (p.held) {
        const it = p.held;
        const cw = 250;
        const ch = 92;
        const cx = x;
        const cy = y - ch - 10;
        D.panel(ctx, cx, cy, cw, ch, { accent: it.rarity.color });
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        U.fillRoundRect(ctx, cx + 10, cy + 14, 68, 68, 8);
        const sc = Math.min(1.6, 56 / Math.max(it.w, it.h));
        it.drawAt(ctx, cx + 44, cy + 48, sc);
        D.text(ctx, it.name, cx + 88, cy + 30, { size: 15, weight: 'bold' });
        D.text(ctx, RC.L(it.rarity.name), cx + 88, cy + 48, { size: 12, color: it.rarity.color, weight: 'bold' });
        D.text(ctx, U.formatMoney(it.value), cx + 88, cy + 74, { size: 20, font: C.FONT_TITLE, color: C.COLORS.gold });
        D.icon(ctx, 'weight', cx + cw - 50, cy + 44, 14, '#9aa3c7');
        D.text(ctx, it.kg + ' kg', cx + cw - 40, cy + 49, { size: 12, color: it.kg > 8 ? '#ff8c2e' : '#9aa3c7' });
        if (it.def.fragile > 0.4) {
          D.icon(ctx, 'fragile', cx + cw - 50, cy + 66, 14, '#ff8fa3');
          D.text(ctx, 'Kırılır', cx + cw - 40, cy + 71, { size: 12, color: '#ff8fa3' });
        }
      }
    },

    drawPrompts(ctx, scene, w, h, t) {
      const prompts = scene.prompts;
      if (!prompts.length) return;
      let y = h - 90;
      for (const pr of prompts) {
        ctx.font = `bold 15px ${C.FONT_UI}`;
        pr.text = RC.Lx(pr.text);
        const tw = ctx.measureText(pr.text).width;
        ctx.font = `bold 14px ${C.FONT_UI}`;
        const kw = Math.max(30, ctx.measureText(RC.Input.keyText(pr.key)).width + 18);
        ctx.font = `bold 15px ${C.FONT_UI}`;
        const total = kw + 10 + tw + 24;
        const x = w / 2 - total / 2;
        D.panel(ctx, x - 6, y - 6, total + 12, 42, { r: 10, shadow: false, fill: 'rgba(10,12,24,0.85)', fillTop: 'rgba(20,24,44,0.85)' });
        D.key(ctx, pr.key, x + 4, y, 30);
        D.text(ctx, pr.text, x + kw + 16, y + 21, { size: 15, weight: 'bold', color: pr.color || '#f2f4ff' });
        y -= 48;
      }
    },

    drawToasts(ctx, w, t) {
      let y = this.toastY || 104;
      for (const ts of this.toasts) {
        const a = ts.t < 0.2 ? ts.t / 0.2 : ts.t > ts.dur - 0.5 ? (ts.dur - ts.t) / 0.5 : 1;
        const slide = ts.t < 0.2 ? (1 - ts.t / 0.2) * -20 : 0;
        ctx.font = `bold 16px ${C.FONT_UI}`;
        const tw = ctx.measureText(ts.text).width;
        ctx.globalAlpha = U.clamp01(a);
        D.panel(ctx, w / 2 - tw / 2 - 16, y + slide, tw + 32, 32, { r: 16, shadow: false, fill: 'rgba(10,12,24,0.88)', fillTop: 'rgba(20,24,44,0.88)', border: U.rgba(ts.color, 0.6) });
        D.text(ctx, ts.text, w / 2, y + 21 + slide, { size: 16, weight: 'bold', align: 'center', color: ts.color });
        ctx.globalAlpha = 1;
        y += 38;
      }
    },
  };

  /* =====================================================================
   * MİNİ HARİTA
   * =================================================================== */
  const Minimap = {
    render(ctx, scene, xr, yb, big) {
      const W = scene.world;
      const b = W.bounds;
      const pw = big ? Math.min(RC.Game.W - 120, 1100) : 270;
      const phMax = big ? RC.Game.H - 160 : 120;
      const sc = Math.min((pw - 20) / b.w, (phMax - 20) / b.h);
      const ph = b.h * sc + 20;
      const x = big ? RC.Game.W / 2 - pw / 2 : xr - pw;
      const y = big ? RC.Game.H / 2 - ph / 2 : yb - ph;
      if (!big) this.rect = { x, y, w: pw, h: ph };
      D.panel(ctx, x, y, pw, ph, { accent: '#4aa8ff', r: 10 });
      const ox = x + 10 + (pw - 20 - b.w * sc) / 2;
      const oy = y + 10;
      const tx = (wx) => ox + (wx - b.x) * sc;
      const ty = (wy) => oy + (wy - b.y) * sc;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 4, y + 4, pw - 8, ph - 8);
      ctx.clip();
      // Zemin çizgisi
      ctx.fillStyle = 'rgba(60,90,60,0.5)';
      ctx.fillRect(tx(b.x), ty(0), b.w * sc, 3);
      // Odalar
      for (const r of W.rooms) {
        ctx.fillStyle = r === W.safeRoom ? 'rgba(255,200,60,0.18)' : 'rgba(140,160,220,0.14)';
        ctx.fillRect(tx(r.x0), ty(r.y0), (r.x1 - r.x0) * sc, (r.y1 - r.y0) * sc);
        ctx.strokeStyle = 'rgba(140,160,220,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx(r.x0), ty(r.y0), (r.x1 - r.x0) * sc, (r.y1 - r.y0) * sc);
        if (big) {
          D.text(ctx, RC.L(r.name), tx((r.x0 + r.x1) / 2), ty(r.y0) + 14, { size: 11, align: 'center', color: 'rgba(220,230,255,0.6)' });
        }
      }
      // Döşemeler / duvarlar
      ctx.fillStyle = 'rgba(220,230,255,0.55)';
      for (const s of W.solids) {
        if (s.kind === 'slab' || s.kind === 'wall' || s.kind === 'roof') {
          ctx.fillRect(tx(s.x), ty(s.y), Math.max(1, s.w * sc), Math.max(1, s.h * sc));
        }
      }
      // Merdivenler
      ctx.strokeStyle = 'rgba(255,220,150,0.7)';
      ctx.lineWidth = 1.5;
      for (const st of W.stairs) U.line(ctx, tx(st.bottom.x), ty(st.bottom.y), tx(st.top.x), ty(st.top.y));
      for (const l of W.ladders) U.line(ctx, tx(l.x), ty(l.yTop), tx(l.x), ty(l.yBottom));
      // Havuz
      if (W.pool) {
        ctx.fillStyle = 'rgba(80,170,255,0.6)';
        ctx.fillRect(tx(W.pool.x0), ty(0), (W.pool.x1 - W.pool.x0) * sc, W.pool.y1 * sc);
      }
      // Kamyon
      const tr = W.truck;
      ctx.fillStyle = C.COLORS.gold;
      ctx.fillRect(tx(tr.x), ty(-tr.h), tr.w * sc, tr.h * sc);
      // Kasa
      if (W.safe) {
        ctx.fillStyle = W.safe.state.open ? '#3ddc84' : '#ffc83d';
        const s = W.safe;
        ctx.fillRect(tx(s.x) - 1, ty(s.y) - 1, Math.max(4, s.w * sc) + 2, Math.max(4, s.h * sc) + 2);
      }
      // Ev sahipleri
      for (const r of scene.residents) {
        const col = r.state === 'sleep' ? '#8fb7ff' : r.state === 'chase' ? '#ff3043' : '#ffc83d';
        const rx = r.state === 'sleep' ? r.bed.x + 40 : r.x;
        const ry = r.state === 'sleep' ? r.bed.y + 10 : r.y - 20;
        U.circle(ctx, tx(rx), ty(ry), big ? 6 : 3.5, col);
      }
      if (scene.dog) U.circle(ctx, tx(scene.dog.x), ty(-15), big ? 5 : 3, '#e6d3a8');
      // Oyuncu
      const p = scene.player;
      const blink = 0.6 + Math.sin(scene.time * 8) * 0.4;
      U.circle(ctx, tx(p.cx), ty(p.cy), (big ? 7 : 4) + blink, '#e8283c');
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx(p.cx), ty(p.cy), (big ? 7 : 4) + blink, 0, U.TAU);
      ctx.stroke();
      // Görüş alanı
      const v = scene.camera.view;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx(v.x), ty(v.y), v.w * sc, v.h * sc);
      ctx.restore();

      if (big) {
        D.text(ctx, 'HARİTA', x + 16, y - 10, { size: 18, font: C.FONT_TITLE, color: '#fff', stroke: '#000' });
        const legend = [
          ['#e8283c', 'Sen'],
          ['#8fb7ff', 'Uyuyan'],
          ['#ffc83d', 'Uyanık'],
          ['#ff3043', 'Kovalıyor'],
          [C.COLORS.gold, 'Kamyon / Kasa'],
        ];
        let lx = x + 120;
        for (const [c, n] of legend) {
          U.circle(ctx, lx, y - 16, 5, c);
          const tw = D.text(ctx, n, lx + 10, y - 11, { size: 13, color: '#dfe3f5' });
          lx += tw + 30;
        }
      }
    },
  };

  RC.HUD = HUD;
  RC.Minimap = Minimap;
})(window.RC);
