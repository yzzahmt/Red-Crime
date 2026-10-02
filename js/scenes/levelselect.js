/* =========================================================================
 *  RED CRIME - Bölüm seçimi ve Dükkân
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const UI = RC.UI;

  /** Bölüm kartındaki ev silüeti */
  function drawHouseIcon(ctx, cfg, x, y, w, h, t, locked) {
    const floors = cfg.floors;
    const garden = cfg.garden > 1500;
    const hw = garden ? w * 0.5 : w * 0.7;
    const hx = garden ? x + w * 0.46 : x + (w - hw) / 2;
    const fh = Math.min((h * 0.62) / (floors + (cfg.basement ? 0.6 : 0)), 34);
    const groundY = y + h - (cfg.basement ? fh * 0.7 : 6);
    ctx.save();
    if (locked) ctx.globalAlpha = 0.35;
    // Zemin
    ctx.fillStyle = '#1f3a22';
    ctx.fillRect(x, groundY, w, 6);
    // Bodrum
    if (cfg.basement) {
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(hx, groundY, hw, fh * 0.65);
    }
    // Katlar
    for (let i = 0; i < floors; i++) {
      const fy = groundY - (i + 1) * fh;
      ctx.fillStyle = U.shade(cfg.facade, -0.1 * (i % 2));
      ctx.fillRect(hx, fy, hw, fh);
      const nWin = Math.max(2, Math.floor(hw / 26));
      for (let k = 0; k < nWin; k++) {
        const lit = Math.sin(t * 0.7 + i * 3 + k * 1.7) > 0.4;
        ctx.fillStyle = lit ? '#ffd98a' : '#1a2240';
        ctx.fillRect(hx + 8 + k * ((hw - 16) / nWin), fy + fh * 0.25, (hw - 16) / nWin - 8, fh * 0.45);
      }
    }
    // Çatı
    const topY = groundY - floors * fh;
    ctx.fillStyle = cfg.roof;
    if (cfg.kind) {
      ctx.fillRect(hx - 4, topY - 8, hw + 8, 8);
      ctx.fillStyle = '#15161d';
      ctx.fillRect(hx + hw * 0.15, topY - 26, hw * 0.7, 16);
      ctx.fillStyle = cfg.kind === 'bank' ? '#bfe3ff' : cfg.kind === 'museum' ? '#fff2c0' : '#ffd0f4';
      ctx.font = `9px ${RC.Config.FONT_TITLE}`;
      ctx.textAlign = 'center';
      ctx.fillText(RC.L(cfg.sign || '').slice(0, 16), hx + hw / 2, topY - 14);
    } else {
      U.poly(ctx, [hx - 8, topY, hx + hw * 0.15, topY - fh * 0.9, hx + hw * 0.85, topY - fh * 0.9, hx + hw + 8, topY]);
    }
    // Bahçe öğeleri
    if (garden) {
      RC.BG.tree(ctx, x + w * 0.12, groundY, 0.32, 3, t);
      RC.BG.tree(ctx, x + w * 0.3, groundY, 0.26, 8, t);
      ctx.fillStyle = '#3a8fd0';
      ctx.fillRect(x + w * 0.18, groundY, w * 0.14, 5);
    } else {
      RC.BG.tree(ctx, x + w * 0.1, groundY, 0.22, cfg.id, t);
    }
    ctx.restore();
  }

  /* =====================================================================
   * BÖLÜM SEÇİMİ
   * =================================================================== */
  RC.Scenes.levelselect = {
    enter(params) {
      RC.MenuBG.init();
      this.t = 0;
      const p = RC.Save.progress;
      this.sel = params && params.select != null ? params.select : Math.min(p.unlocked - 1, C.LEVELS.length - 1);
      this.slide = this.sel;
      RC.Audio.playMusic('menu');
      this.build();
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const y = h - 96;
      const self = this;
      this.btnStart = new UI.Button({
        x: w / 2 - 60,
        y,
        w: 300,
        h: 60,
        label: 'SOYGUNA BAŞLA',
        icon: 'play',
        primary: true,
        fontSize: 20,
        onClick: () => self.start(),
      });
      this.menu = new UI.Menu([
        new UI.Button({ x: w / 2 - 470, y, w: 190, h: 60, label: 'GERİ', icon: 'back', back: true, fontSize: 17, onClick: () => RC.Game.go('menu') }),
        new UI.Button({ x: w / 2 - 270, y, w: 200, h: 60, label: 'DÜKKÂN', icon: 'shop', fontSize: 17, onClick: () => this.openStore('shop', C.SHOP_UNLOCK) }),
        this.btnStart,
        new UI.Button({ x: w / 2 + 250, y, w: 220, h: 60, label: 'KARANLIK AĞ', icon: 'skull', fontSize: 16, onClick: () => this.openStore('darkweb', C.DARKWEB_UNLOCK) }),
      ]);
      this.menu.focus = 2;
    },
    /** Karaborsa / Karanlık Ağ: belirli sayıda bölüm bitirilince açılır */
    storeOpen(need) {
      const pr = RC.Save.progress;
      return pr.gameCompleted || pr.stars[need - 1] > 0;
    },
    openStore(scene, need) {
      if (this.storeOpen(need)) {
        RC.Game.go(scene, { select: this.sel });
        return;
      }
      RC.Audio.play('uiError');
      this.lockMsg = { text: RC.L('Kilitli: önce {n}. bölümü bitir.', { n: need }), t: 2.5 };
    },
    locked(i) {
      return i + 1 > RC.Save.progress.unlocked;
    },
    start() {
      if (this.locked(this.sel)) {
        RC.Audio.play('uiError');
        return;
      }
      RC.Game.go('briefing', { level: this.sel });
    },
    update(dt) {
      this.t += dt;
      RC.MenuBG.update(dt);
      if (this.lockMsg && (this.lockMsg.t -= dt) <= 0) this.lockMsg = null;
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        RC.Game.go('menu');
        return;
      }
      // Kart seçimi: A/D ile
      const before = this.sel;
      if (I.actPressed('menuLeft')) this.sel = Math.max(0, this.sel - 1);
      if (I.actPressed('menuRight')) this.sel = Math.min(C.LEVELS.length - 1, this.sel + 1);
      // Fareyle kart seçimi
      if (I.mouse.pressed && this.cardRects) {
        this.cardRects.forEach((r, i) => {
          if (I.hover(r.x, r.y, r.w, r.h)) {
            if (this.sel === i && !this.locked(i)) this.start();
            this.sel = i;
          }
        });
      }
      if (before !== this.sel) RC.Audio.play('uiHover');
      this.slide = U.damp(this.slide, this.sel, 10, dt);
      this.btnStart.enabled = !this.locked(this.sel);
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      RC.MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.5)';
      ctx.fillRect(0, 0, w, h);
      D.text(ctx, 'HEDEF SEÇ', w / 2, 70, { size: 44, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      const p = RC.Save.progress;
      D.icon(ctx, 'money', w - 200, 56, 22, C.COLORS.gold);
      D.text(ctx, U.formatMoney(p.wallet), w - 180, 64, { size: 20, font: C.FONT_TITLE, color: C.COLORS.gold });

      // Kartlar (karusel)
      const cw = 250;
      const ch = 300;
      const gap = 30;
      const cy = 110;
      this.cardRects = [];
      C.LEVELS.forEach((cfg, i) => {
        const off = i - this.slide;
        const cx = w / 2 + off * (cw + gap) - cw / 2;
        const selected = i === this.sel;
        const s = selected ? 1 : 0.86;
        const locked = this.locked(i);
        const rx = cx + (cw - cw * s) / 2;
        const ry = cy + (ch - ch * s) / 2;
        this.cardRects.push({ x: rx, y: ry, w: cw * s, h: ch * s });
        if (cx > w + 20 || cx + cw < -20) return; // ekran dışı kartı çizme (30 bölüm)
        ctx.save();
        ctx.translate(cx + cw / 2, cy + ch / 2);
        ctx.scale(s, s);
        ctx.globalAlpha = U.clamp(1 - Math.abs(off) * 0.25, 0.25, 1);
        if (selected) {
          ctx.shadowColor = C.COLORS.red;
          ctx.shadowBlur = 30;
        }
        D.panel(ctx, -cw / 2, -ch / 2, cw, ch, { accent: selected ? C.COLORS.red : '#4a5480', border: selected ? 'rgba(255,120,130,0.6)' : undefined });
        ctx.shadowBlur = 0;
        // Gökyüzü + ev
        ctx.save();
        ctx.beginPath();
        U.roundRect(ctx, -cw / 2 + 10, -ch / 2 + 14, cw - 20, 150, 8);
        ctx.clip();
        const g = ctx.createLinearGradient(0, -ch / 2, 0, -ch / 2 + 160);
        g.addColorStop(0, '#0a0e22');
        g.addColorStop(1, '#2a2446');
        ctx.fillStyle = g;
        ctx.fillRect(-cw / 2, -ch / 2, cw, 170);
        U.circle(ctx, cw / 2 - 40, -ch / 2 + 40, 12, '#f5ecc8');
        drawHouseIcon(ctx, cfg, -cw / 2 + 10, -ch / 2 + 24, cw - 20, 140, t, locked);
        ctx.restore();
        D.text(ctx, RC.L('BÖLÜM {n}', { n: cfg.id }), 0, -ch / 2 + 190, { size: 13, align: 'center', color: C.COLORS.red, weight: 'bold' });
        ctx.font = `16px ${C.FONT_TITLE}`;
        const nameLines = U.wrapText(ctx, RC.L(cfg.name).toLocaleUpperCase(RC.I18N.lang === 'en' ? 'en-US' : 'tr-TR'), cw - 30);
        nameLines.slice(0, 2).forEach((ln, j) => D.text(ctx, ln, 0, -ch / 2 + 214 + j * 20, { size: 16, font: C.FONT_TITLE, align: 'center', color: '#fff' }));
        D.text(ctx, cfg.short, 0, -ch / 2 + 258, { size: 13, align: 'center', color: '#9aa3c7' });
        D.stars(ctx, 0, ch / 2 - 22, p.stars[i], 3, 20);
        // En iyi soygun notu rozeti
        const best = !locked && RC.Rank.best(i);
        if (best) {
          const col = RC.Rank.COLORS[best];
          const bx = -cw / 2 + 32;
          const by = -ch / 2 + 40;
          U.circle(ctx, bx, by, 19, 'rgba(0,0,0,0.75)');
          ctx.strokeStyle = col;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(bx, by, 17, 0, U.TAU);
          ctx.stroke();
          D.text(ctx, best, bx, by + 10, { size: 26, font: C.FONT_TITLE, align: 'center', color: col });
        }
        if (locked) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          U.fillRoundRect(ctx, -cw / 2, -ch / 2, cw, ch, 12);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          U.fillRoundRect(ctx, -cw / 2, -ch / 2 + 180, cw, ch - 180, 12);
          D.icon(ctx, 'lock', 0, -ch / 2 + 88, 46, '#dfe3f5');
          D.text(ctx, 'Önceki bölümü tamamla', 0, -ch / 2 + 135, { size: 13, align: 'center', color: '#dfe3f5', stroke: 'rgba(0,0,0,0.8)', strokeW: 4 });
        }
        ctx.restore();
      });

      // Ayrıntı paneli
      const cfg = C.LEVELS[this.sel];
      const pw = Math.min(900, w - 80);
      const px = w / 2 - pw / 2;
      const py = cy + ch + 20;
      const ph = h - py - 112;
      D.panel(ctx, px, py, pw, ph, { r: 12 });
      ctx.font = `15px ${C.FONT_UI}`;
      const desc = U.wrapText(ctx, RC.L(cfg.desc), pw * 0.58);
      desc.slice(0, 4).forEach((ln, j) => D.text(ctx, ln, px + 20, py + 30 + j * 21, { size: 15, color: '#dfe3f5' }));
      const ix = px + pw * 0.64;
      const info = [
        ['home', RC.L('{n} kat', { n: cfg.floors }) + (cfg.basement ? RC.L(' + bodrum') : '') + (cfg.garden > 1500 ? RC.L(' + dev bahçe') : '')],
        ['zzz', cfg.residents.map((r) => RC.L(r.name)).join(', ') + (cfg.dog ? RC.L(' + köpek') : '')],
        ['star', RC.L('Hedef: {v}', { v: U.formatShortMoney(cfg.target) })],
        ['trophy', RC.L('Rekor: {v}', { v: p.best[this.sel] ? U.formatMoney(p.best[this.sel]) : '—' })],
      ];
      info.forEach((r, j) => {
        D.icon(ctx, r[0], ix, py + 25 + j * 24, 16, C.COLORS.gold);
        D.text(ctx, r[1], ix + 16, py + 30 + j * 24, { size: 14, color: '#f2f4ff' });
      });
      // Özel zorluklar: renkli etiketler (açıklamanın altında)
      const mods = RC.Hazards.list(cfg);
      if (mods.length) {
        let mx = px + 20;
        const my = py + ph - 34;
        D.text(ctx, RC.L('ÖZEL ZORLUK'), mx, my + 17, { size: 12, color: '#9aa3c7', weight: 'bold' });
        mx += 86;
        ctx.font = `bold 13px ${C.FONT_UI}`;
        for (const m of mods) {
          const label = RC.L(m.name).toUpperCase();
          const tw = ctx.measureText(label).width + 34;
          ctx.fillStyle = U.rgba(m.color, 0.14);
          ctx.fillRect(mx, my, tw, 24);
          ctx.fillStyle = m.color;
          ctx.fillRect(mx, my, 3, 24);
          D.icon(ctx, m.icon, mx + 14, my + 12, 13, m.color);
          D.text(ctx, label, mx + 24, my + 17, { size: 13, color: m.color, weight: 'bold' });
          mx += tw + 8;
        }
      }
      this.menu.draw(ctx, t);
      if (this.lockMsg) {
        const a = Math.min(1, this.lockMsg.t * 2);
        D.text(ctx, this.lockMsg.text, w / 2, h - 116, { size: 16, weight: 'bold', align: 'center', color: '#ff8c2e', alpha: a, stroke: 'rgba(0,0,0,0.8)', strokeW: 4 });
      }
      if (!RC.Touch.active) D.text(ctx, '←→ bölüm · ↑↓ düğme · ENTER onayla · ESC geri', w / 2, h - 16, { size: 12, align: 'center', color: '#5a6284' });
    },
  };

  /* =====================================================================
   * DÜKKÂN
   * =================================================================== */
  RC.Scenes.shop = {
    enter(params) {
      this.t = 0;
      this.back = params || {};
      this.particles = new RC.Particles(300);
      this.build();
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const cols = 3;
      const cw = Math.min(330, (w - 120) / 3);
      const chh = 190;
      const gx = 20;
      const gy = 20;
      const total = cols * cw + (cols - 1) * gx;
      const x0 = w / 2 - total / 2;
      const y0 = 130;
      const items = C.UPGRADES.map((u, i) => {
        const b = new UI.Widget({ x: x0 + (i % cols) * (cw + gx), y: y0 + Math.floor(i / cols) * (chh + gy), w: cw, h: chh, up: u });
        b.activate = () => this.buy(u, b);
        b.draw = (ctx, t) => this.drawCard(ctx, b, t);
        return b;
      });
      items.push(new UI.Button({ x: w / 2 - 150, y: h - 86, w: 300, h: 56, label: 'GERİ', icon: 'back', back: true, primary: true, onClick: () => RC.Game.go('levelselect', { select: this.back.select }) }));
      this.menu = new UI.Menu(items);
      this.menu.cols = 1;
    },
    buy(u, card) {
      const lvl = RC.Save.upgradeLevel(u.id);
      if (lvl >= u.costs.length) {
        RC.Audio.play('uiError');
        return;
      }
      if (RC.Save.buyUpgrade(u.id)) {
        RC.Audio.play('bigcash');
        RC.Audio.play('star');
        this.particles.confetti(card.x + card.w / 2, card.y + card.h / 2, 40, card.w);
        card.pressT = 0.3;
      } else {
        RC.Audio.play('uiError');
        card.shake = 0.4;
      }
    },
    drawCard(ctx, b, t) {
      const u = b.up;
      const lvl = RC.Save.upgradeLevel(u.id);
      const max = u.costs.length;
      const done = lvl >= max;
      const cost = done ? 0 : u.costs[lvl];
      const afford = RC.Save.progress.wallet >= cost;
      const hv = b.hoverT;
      if (b.shake > 0) b.shake -= 0.016;
      const sx = b.shake > 0 ? Math.sin(t * 60) * 5 * b.shake : 0;
      ctx.save();
      ctx.translate(sx, -hv * 4);
      D.panel(ctx, b.x, b.y, b.w, b.h, { accent: done ? '#3ddc84' : afford ? C.COLORS.gold : '#4a5480', border: U.rgba('#8fb7ff', 0.15 + hv * 0.5) });
      U.circle(ctx, b.x + 44, b.y + 50, 28, 'rgba(255,255,255,0.07)');
      D.icon(ctx, u.icon, b.x + 44, b.y + 50, 30, done ? '#3ddc84' : C.COLORS.gold);
      D.text(ctx, u.name, b.x + 84, b.y + 40, { size: 17, weight: 'bold' });
      ctx.font = `13px ${C.FONT_UI}`;
      const lines = U.wrapText(ctx, RC.L(u.desc), b.w - 100);
      lines.slice(0, 2).forEach((ln, j) => D.text(ctx, ln, b.x + 84, b.y + 60 + j * 17, { size: 13, color: '#9aa3c7' }));
      // Seviye noktaları
      for (let i = 0; i < max; i++) {
        U.fillRoundRect(ctx, b.x + 20 + i * 34, b.y + 104, 28, 8, 4, i < lvl ? '#3ddc84' : 'rgba(255,255,255,0.15)');
      }
      D.text(ctx, lvl > 0 ? RC.L('Şu an: {e}', { e: u.effect(lvl) }) : RC.L('Henüz yok'), b.x + 20, b.y + 132, { size: 13, color: '#dfe3f5' });
      if (!done) D.text(ctx, RC.L('Sonraki: {e}', { e: u.effect(lvl + 1) }), b.x + 20, b.y + 150, { size: 13, color: '#8fb7ff' });
      // Fiyat
      const label = done ? 'MAKSİMUM' : U.formatMoney(cost);
      D.text(ctx, label, b.x + b.w - 16, b.y + b.h - 16, { size: 17, font: C.FONT_TITLE, align: 'right', color: done ? '#3ddc84' : afford ? C.COLORS.gold : '#ff5060' });
      ctx.restore();
    },
    update(dt) {
      this.t += dt;
      RC.MenuBG.update(dt);
      this.particles.update(dt);
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        RC.Game.go('levelselect', { select: this.back.select });
        return;
      }
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      RC.MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.6)';
      ctx.fillRect(0, 0, w, h);
      D.text(ctx, 'KARABORSA DÜKKÂNI', w / 2, 72, { size: 40, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      D.text(ctx, 'Reis\'in tedarikçisinin tezgâhı. "Sorma nereden buldum."', w / 2, 100, { size: 14, align: 'center', color: '#9aa3c7' });
      D.panel(ctx, w - 260, 36, 230, 48, { r: 10 });
      D.icon(ctx, 'money', w - 236, 60, 22, C.COLORS.gold);
      D.text(ctx, U.formatMoney(RC.Save.progress.wallet), w - 216, 68, { size: 20, font: C.FONT_TITLE, color: C.COLORS.gold });
      this.menu.draw(ctx, this.t);
      this.particles.render(ctx, null);
    },
  };
})(window.RC);
