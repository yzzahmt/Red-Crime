/* =========================================================================
 *  RED CRIME - SOYGUN PLANLAMA (banka işleri)
 *  Bina planı (kat kesiti): odalar, kameralar, lazerler, sensörler, bekçiler,
 *  kasa dairesi. Oyuncu giriş noktasını, ekibin görevlerini ve kasa
 *  ekipmanını seçer. Seçimler soygunu doğrudan etkiler.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const L = (s, v) => RC.L(s, v);

  const BLUE = '#0b2a4a';
  const LINE = '#8fd0ff';

  RC.Scenes.planning = {
    enter(params) {
      this.level = params.level || 0;
      this.cfg = C.LEVELS[this.level];
      this.t = 0;
      this.world = RC.LevelGen.generate(this.level, this.cfg.seed + Math.floor(Math.random() * 5) * 101);
      this.choice = {};
      for (const row of C.PLAN) this.choice[row.id] = 0;
      this.row = 0;
      this.bubble = null;
      this.pulse = 0;
      RC.Audio.playMusic('bridge');
      RC.Audio.setMusicDuck(0.6);
      this.say('lookout', 'Plan masası hazır. Her şeyi bir kez daha gözden geçir.');
    },
    exit() {
      RC.Audio.setMusicDuck(1);
    },

    say(crewId, text) {
      const cm = C.CREW.find((c) => c.id === crewId) || C.CREW[0];
      this.bubble = { crew: cm, text: L(text), t: 0 };
    },

    currentPlan() {
      const plan = {};
      for (const row of C.PLAN) plan[row.id] = row.options[this.choice[row.id]].id;
      return plan;
    },

    confirm() {
      RC.Audio.play('uiSelect');
      RC.Audio.play('safeGood');
      RC.Game.go('truckride', { level: this.level, plan: this.currentPlan(), world: this.world });
    },

    update(dt) {
      this.t += dt;
      if (this.bubble) this.bubble.t += dt;
      const rows = C.PLAN.length;
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        RC.Game.go('levelselect', { select: this.level });
        return;
      }
      if (I.actPressed('menuDown')) {
        this.row = (this.row + 1) % (rows + 1);
        RC.Audio.play('uiHover');
      }
      if (I.actPressed('menuUp')) {
        this.row = (this.row + rows) % (rows + 1);
        RC.Audio.play('uiHover');
      }
      if (this.row < rows) {
        const row = C.PLAN[this.row];
        let dir = 0;
        if (I.actPressed('menuRight')) dir = 1;
        if (I.actPressed('menuLeft')) dir = -1;
        if (dir) {
          const n = row.options.length;
          this.choice[row.id] = (this.choice[row.id] + dir + n) % n;
          RC.Audio.play('tick');
          const opt = row.options[this.choice[row.id]];
          if (row.crew) this.say(row.crew, L('Tamamdır: {o}.', { o: L(opt.name) }) + ' ' + L(opt.desc));
        }
      } else if (I.wasPressed('Enter') || I.wasPressed('Space')) {
        this.confirm();
        return;
      }
      if (I.wasPressed('Enter') && this.row < rows) this.row = rows;
      // Fare
      if (I.mouse.pressed && this.rects) {
        for (const r of this.rects) {
          if (I.hover(r.x, r.y, r.w, r.h)) {
            if (r.kind === 'confirm') return this.confirm();
            this.row = r.row;
            const row = C.PLAN[r.row];
            if (r.kind === 'next' || r.kind === 'prev') {
              const n = row.options.length;
              this.choice[row.id] = (this.choice[row.id] + (r.kind === 'next' ? 1 : -1) + n) % n;
              RC.Audio.play('tick');
            }
          }
        }
      }
    },

    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      // Mavi kopya zemin
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(143,208,255,0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) U.line(ctx, x, 0, x, h);
      for (let y = 0; y < h; y += 24) U.line(ctx, 0, y, w, y);
      ctx.strokeStyle = 'rgba(143,208,255,0.16)';
      for (let x = 0; x < w; x += 120) U.line(ctx, x, 0, x, h);
      for (let y = 0; y < h; y += 120) U.line(ctx, 0, y, w, y);

      D.text(ctx, L('SOYGUN PLANI'), 30, 50, { size: 34, font: C.FONT_TITLE, color: '#e8f4ff' });
      D.text(ctx, L(this.cfg.name), 30, 76, { size: 16, color: LINE });
      if (this.cfg.final) {
        const left = C.FINAL_ATTEMPTS - (RC.Save.progress.finalAttempts || 0);
        D.text(ctx, L('KALAN HAK: {n}/{m}', { n: left, m: C.FINAL_ATTEMPTS }), w - 30, 50, { size: 22, font: C.FONT_TITLE, align: 'right', color: left <= 1 ? '#ff5060' : '#ffc83d', alpha: left <= 1 ? 0.7 + Math.sin(t * 6) * 0.3 : 1 });
      }
      D.text(ctx, L('Hedef: {v}', { v: U.formatMoney(this.cfg.target) }), w - 30, 76, { size: 16, align: 'right', color: '#ffd24a' });

      const mapW = w - 470;
      this.drawBlueprint(ctx, 24, 96, mapW, h - 240, t);
      this.drawPlanPanel(ctx, w - 430, 96, 406, h - 120, t);
      this.drawCrewBubble(ctx, 24, h - 130, mapW, 110, t);
    },

    drawBlueprint(ctx, x, y, bw, bh, t) {
      const W = this.world;
      const H = W.house;
      const plan = this.currentPlan();
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, bw, bh);
      ctx.setLineDash([]);
      // Çizim alanı: sokak + bina + arka sokak
      const x0 = W.street.x1 - 520;
      const x1 = W.backyard.x1;
      const y0 = H.topY - 160;
      const y1 = H.basement ? C.FLOOR_H + 40 : 60;
      const sc = Math.min((bw - 40) / (x1 - x0), (bh - 40) / (y1 - y0));
      const ox = x + 20 + ((bw - 40) - (x1 - x0) * sc) / 2;
      const oy = y + 20;
      const tx = (v) => ox + (v - x0) * sc;
      const ty = (v) => oy + (v - y0) * sc;
      // Zemin
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 2;
      U.line(ctx, tx(x0), ty(0), tx(x1), ty(0));
      // Odalar
      for (const r of W.rooms) {
        ctx.fillStyle = r === W.safeRoom ? 'rgba(255,210,74,0.12)' : 'rgba(143,208,255,0.05)';
        ctx.fillRect(tx(r.x0), ty(r.y0), (r.x1 - r.x0) * sc, (r.y1 - r.y0) * sc);
        ctx.strokeStyle = 'rgba(143,208,255,0.6)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(tx(r.x0), ty(r.y0), (r.x1 - r.x0) * sc, (r.y1 - r.y0) * sc);
        D.text(ctx, L(r.name).toLocaleUpperCase(RC.I18N.lang === 'en' ? 'en-US' : 'tr-TR'), tx((r.x0 + r.x1) / 2), ty(r.y0) + 13, { size: 9, align: 'center', color: 'rgba(200,232,255,0.8)', font: C.FONT_MONO });
      }
      // Duvarlar ve döşemeler
      ctx.fillStyle = '#cfe8ff';
      for (const s of W.solids) {
        if (s.kind === 'slab' || s.kind === 'wall' || s.kind === 'roof') ctx.fillRect(tx(s.x), ty(s.y), Math.max(1, s.w * sc), Math.max(1, s.h * sc));
      }
      // Kapılar
      for (const d of W.doors) {
        ctx.fillStyle = d.locked ? '#ffc83d' : d.closed ? '#e8f4ff' : 'rgba(143,208,255,0.3)';
        ctx.fillRect(tx(d.x) - 1.5, ty(d.y - d.h), 3, d.h * sc);
      }
      // Merdivenler
      ctx.strokeStyle = 'rgba(200,232,255,0.8)';
      for (const st of W.stairs) U.line(ctx, tx(st.bottom.x), ty(st.bottom.y), tx(st.top.x), ty(st.top.y));
      for (const l of W.ladders) U.line(ctx, tx(l.x), ty(l.yTop), tx(l.x), ty(l.yBottom));
      // Güvenlik
      const blink = Math.sin(t * 5) > 0;
      const hackerOn = (id) => plan.hacker === id;
      for (const c of W.cameras) {
        const off = hackerOn('cams');
        ctx.fillStyle = off ? 'rgba(143,208,255,0.3)' : 'rgba(255,48,67,0.2)';
        ctx.beginPath();
        ctx.moveTo(tx(c.x), ty(c.y));
        ctx.arc(tx(c.x), ty(c.y), c.range * sc, (c.a0 + c.a1) / 2 - 0.6, (c.a0 + c.a1) / 2 + 0.6);
        ctx.closePath();
        ctx.fill();
        D.icon(ctx, 'camera', tx(c.x), ty(c.y), 12, off ? '#8fd0ff' : '#ff5060');
      }
      for (const l of W.lasers) {
        ctx.strokeStyle = hackerOn('lasers') ? 'rgba(143,208,255,0.4)' : '#ff3043';
        ctx.lineWidth = 2;
        U.line(ctx, tx(l.x0), ty(l.y), tx(l.x1), ty(l.y));
      }
      for (const sw of W.sweepers || []) {
        ctx.strokeStyle = hackerOn('lasers') ? 'rgba(143,208,255,0.4)' : '#ff8090';
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(tx(sw.x0), ty(sw.top), (sw.x1 - sw.x0) * sc, (sw.y - sw.top) * sc);
        ctx.setLineDash([]);
      }
      for (const m of W.motions || []) {
        ctx.fillStyle = 'rgba(61,220,132,0.2)';
        ctx.beginPath();
        ctx.moveTo(tx(m.x), ty(m.y));
        ctx.lineTo(tx(m.zx0), ty(m.floorY));
        ctx.lineTo(tx(m.zx1), ty(m.floorY));
        ctx.closePath();
        ctx.fill();
      }
      for (const pl of W.plates || []) {
        ctx.fillStyle = hackerOn('lasers') ? 'rgba(143,208,255,0.4)' : '#ffc83d';
        ctx.fillRect(tx(pl.x0), ty(pl.y) - 3, (pl.x1 - pl.x0) * sc, 3);
      }
      // Bekçiler ve uyuyanlar
      for (const g of W.guardSpawns || []) {
        const gx = plan.decoy === 'call' ? W.street.x1 - 150 : g.x;
        U.circle(ctx, tx(gx), ty(W.floorY(g.k) - 25), 6, '#ff8c2e');
        D.text(ctx, 'G', tx(gx), ty(W.floorY(g.k) - 25) + 4, { size: 9, align: 'center', color: '#0b2a4a', weight: 'bold' });
      }
      for (const b of W.bedSpots) {
        U.circle(ctx, tx(b.furn.x + 40), ty(b.furn.y + 10), 6, '#8fb7ff');
        D.text(ctx, 'z', tx(b.furn.x + 40), ty(b.furn.y + 10) + 4, { size: 10, align: 'center', color: '#0b2a4a', weight: 'bold' });
      }
      // Kasa
      if (W.safe) {
        const s = W.safe;
        ctx.strokeStyle = '#ffd24a';
        ctx.lineWidth = 2;
        ctx.strokeRect(tx(s.x) - 3, ty(s.y) - 3, s.w * sc + 6, s.h * sc + 6);
        D.text(ctx, L('KASA'), tx(s.x + s.w / 2), ty(s.y) - 8, { size: 10, align: 'center', color: '#ffd24a', weight: 'bold' });
      }
      // Kamyon konumu
      const truckX = plan.driver === 'back' ? H.r + 40 : W.truck.x;
      ctx.fillStyle = '#e8f4ff';
      ctx.fillRect(tx(truckX), ty(-150), 340 * sc, 150 * sc);
      D.text(ctx, L('KAMYON'), tx(truckX + 170), ty(-75) + 4, { size: 10, align: 'center', color: BLUE, weight: 'bold' });
      // Giriş noktası
      let ex;
      let ey;
      if (plan.entry === 'roof') {
        ex = H.innerL + 150;
        ey = H.topY - 10;
      } else if (plan.entry === 'sewer' && H.basement) {
        ex = H.innerL + 100;
        ey = C.FLOOR_H - 20;
      } else {
        ex = H.x - 40;
        ey = -40;
      }
      const pr = 10 + (blink ? 3 : 0);
      ctx.strokeStyle = '#3ddc84';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(tx(ex), ty(ey), pr, 0, U.TAU);
      ctx.stroke();
      D.text(ctx, L('GİRİŞ'), tx(ex), ty(ey) - 16, { size: 11, align: 'center', color: '#3ddc84', weight: 'bold' });
      // Lejant
      const lg = [
        ['camera', '#ff5060', 'Kamera'],
        ['laser', '#ff3043', 'Lazer'],
        ['eye', '#3ddc84', 'Sensör'],
        ['lock', '#ffc83d', 'Kilitli kapı'],
      ];
      let lx = x + 14;
      for (const [ic, col, nm] of lg) {
        D.icon(ctx, ic, lx + 8, y + bh - 14, 14, col);
        lx += D.text(ctx, L(nm), lx + 20, y + bh - 9, { size: 12, color: '#cfe8ff' }) + 40;
      }
    },

    drawPlanPanel(ctx, x, y, pw, ph, t) {
      D.panel(ctx, x, y, pw, ph, { accent: '#3ddc84', fill: 'rgba(6,20,36,0.95)', fillTop: 'rgba(12,36,60,0.95)' });
      this.rects = [];
      const rowH = 74;
      C.PLAN.forEach((row, i) => {
        const ry = y + 14 + i * rowH;
        const sel = this.row === i;
        ctx.fillStyle = sel ? 'rgba(61,220,132,0.12)' : 'rgba(255,255,255,0.03)';
        U.fillRoundRect(ctx, x + 10, ry, pw - 20, rowH - 8, 8);
        if (sel) {
          ctx.strokeStyle = 'rgba(61,220,132,0.7)';
          ctx.lineWidth = 1.5;
          U.strokeRoundRect(ctx, x + 10, ry, pw - 20, rowH - 8, 8);
        }
        let tx = x + 22;
        if (row.crew) {
          const cm = C.CREW.find((c) => c.id === row.crew);
          D.character(ctx, { x: x + 38, y: ry + 32, r: 16, body: cm.color, facing: 1, hat: cm.hat, hatColor: cm.hatColor, sunglasses: cm.id === 'hacker', mouth: 'smile', noArms: true, shadow: false, t });
          tx = x + 64;
        } else {
          D.icon(ctx, row.id === 'entry' ? 'door' : 'safe', x + 38, ry + 32, 22, '#8fd0ff');
          tx = x + 64;
        }
        const opt = row.options[this.choice[row.id]];
        D.text(ctx, L(row.title), tx, ry + 20, { size: 12, color: '#8fd0ff', weight: 'bold' });
        D.text(ctx, L(opt.name), tx, ry + 40, { size: 16, color: '#e8f4ff', weight: 'bold' });
        ctx.font = `11px ${C.FONT_UI}`;
        const dl = U.wrapText(ctx, L(opt.desc), pw - (tx - x) - 70);
        D.text(ctx, dl[0] + (dl.length > 1 ? '…' : ''), tx, ry + 57, { size: 11, color: '#9fc4e0' });
        // Oklar
        const ax = x + pw - 56;
        D.text(ctx, '◀', ax, ry + 38, { size: 16, align: 'center', color: sel ? '#3ddc84' : '#5a7a9a' });
        D.text(ctx, '▶', ax + 30, ry + 38, { size: 16, align: 'center', color: sel ? '#3ddc84' : '#5a7a9a' });
        this.rects.push({ x: ax - 14, y: ry + 20, w: 28, h: 28, row: i, kind: 'prev' });
        this.rects.push({ x: ax + 16, y: ry + 20, w: 28, h: 28, row: i, kind: 'next' });
        this.rects.push({ x: x + 10, y: ry, w: pw - 90, h: rowH - 8, row: i, kind: 'row' });
        // Seçenek noktaları
        row.options.forEach((o, k) => U.circle(ctx, ax - 6 + k * 12 + (3 - row.options.length) * 6, ry + 56, 3, k === this.choice[row.id] ? '#3ddc84' : 'rgba(143,208,255,0.3)'));
      });
      // Onay
      const by = y + 14 + C.PLAN.length * rowH + 6;
      const sel = this.row === C.PLAN.length;
      ctx.save();
      if (sel) {
        ctx.shadowColor = '#3ddc84';
        ctx.shadowBlur = 18;
      }
      ctx.fillStyle = sel ? '#2a9a5a' : '#1a5a3a';
      U.fillRoundRect(ctx, x + 10, by, pw - 20, 50, 10);
      ctx.restore();
      D.text(ctx, L('PLANI ONAYLA · YOLA ÇIK'), x + pw / 2, by + 32, { size: 18, font: C.FONT_TITLE, align: 'center', color: '#e8fff0' });
      this.rects.push({ x: x + 10, y: by, w: pw - 20, h: 50, kind: 'confirm' });
      D.text(ctx, L('↑↓ seç · ←→ değiştir · ENTER onayla · ESC geri'), x + pw / 2, y + ph - 10, { size: 11, align: 'center', color: '#5a7a9a' });
    },

    drawCrewBubble(ctx, x, y, bw, bh, t) {
      const b = this.bubble;
      // Ekip dizilişi
      C.CREW.forEach((cm, i) => {
        const cx = x + 46 + i * 70;
        const cy = y + 50;
        const talking = b && b.crew === cm && b.t < 2.5;
        D.character(ctx, {
          x: cx,
          y: cy + (talking ? Math.sin(t * 12) * 2 : 0),
          r: 24,
          body: cm.color,
          facing: 1,
          hat: cm.hat,
          hatColor: cm.hatColor,
          sunglasses: cm.id === 'hacker',
          mouth: talking && Math.floor(t * 10) % 2 ? 'open' : 'smile',
          arms: [{ x: -26, y: 16 }, { x: 26, y: 16 }],
          sleeve: '#1d1f29',
          t,
        });
        D.text(ctx, L(cm.name), cx, cy + 44, { size: 12, align: 'center', color: '#e8f4ff', weight: 'bold' });
        D.text(ctx, L(cm.role), cx, cy + 58, { size: 10, align: 'center', color: '#8fd0ff' });
      });
      if (b) {
        const bx = x + 46 + 4 * 70 - 10;
        const pw = bw - (bx - x) - 10;
        D.panel(ctx, bx, y + 10, pw, bh - 30, { r: 10, fill: 'rgba(6,20,36,0.95)', fillTop: 'rgba(12,36,60,0.95)', accent: b.crew.color });
        D.text(ctx, L(b.crew.name) + ':', bx + 14, y + 34, { size: 13, color: b.crew.color, weight: 'bold' });
        ctx.font = `14px ${C.FONT_UI}`;
        const lines = U.wrapText(ctx, b.text.slice(0, Math.floor(b.t * 60)), pw - 28);
        lines.slice(0, 3).forEach((ln, i) => D.text(ctx, ln, bx + 14, y + 54 + i * 18, { size: 14, color: '#e8f4ff' }));
      }
    },
  };
})(window.RC);
