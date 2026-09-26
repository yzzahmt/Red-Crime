/* =========================================================================
 *  RED CRIME - Mini oyunlar
 *  - Kilit kırma (fare): 1) matkapla silindiri del (baskı, ısı, uç sapması),
 *    2) gerdirme teli + maymuncukla pimleri kesme çizgisine tek tek oturt.
 *  - Alarm paneli hackleme: ekranda yanıp sönen ok dizisini sırayla gir.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const L = (s, v) => RC.L(s, v);

  /* =====================================================================
   * KİLİT KIRMA (fare ile iki aşama)
   *  1) MATKAP: sol tuşu basılı tut = matkap döner, baskı artar; bırak = baskı
   *     düşer. Baskıyı yeşil bantta tut; fazla baskı ucu ısıtır ve kırar.
   *     Uç dönerken sapar: fareyle hedef deliğin üstünde tutarak karşıla.
   *  2) GERDİRME + MAYMUNCUK: iki el ayrı kontrol edilir. Fare tekerleği
   *     gerdirme telini ayarlar (el yorulur, gerdirme kendiliğinden kayar;
   *     bantta tut). Sol tuş basılıyken pimin altında yukarı sürükleyerek kaldır.
   *     Yalnızca "sıkışan" pim kesme çizgisinde oturur; fazla kaldırmak düşürür.
   *  Arayüz: update(dt) -> null | 'win' | 'cancel' | 'fail'
   * =================================================================== */
  const DRILL_BAND = [0.5, 0.78]; // ideal baskı aralığı
  const TENSION_BAND = [0.35, 0.65]; // ideal gerdirme aralığı
  const PANEL_W = 640;
  const PANEL_H = 440;

  class LockpickGame {
    /** opts.drill: true = dış kapı (matkap + maymuncuk), false = iç kapı (kısa maymuncuk) */
    constructor(scene, door, opts = {}) {
      this.scene = scene;
      this.door = door;
      const lvl = door.lockLevel || 1;
      const skill = RC.Save.upgradeLevel('safecracker');
      this.lvl = lvl;
      this.withDrill = opts.drill !== false;
      this.stage = this.withDrill ? 'drill' : 'pick';
      this.t = 0;
      this.flash = 0;
      this.flashCol = '#3ddc84';
      this.result = null;
      this.endT = 0;
      this.msg = '';
      this.msgT = 0;

      // Matkap
      this.drill = {
        progress: 0,
        pressure: 0,
        heat: 0,
        bits: 3,
        spin: 0,
        bx: 0, // farenin gecikmeli konumu (hedefe göre px)
        by: 0,
        dx: 0, // tork kaynaklı sapma
        dy: 0,
        ox: 0, // ucun hedefe göre son konumu
        oy: 0,
        driftA: U.rand(0, U.TAU),
        rate: (0.24 - lvl * 0.018) * (scene.drill ? 1.6 : 1), // sn başına ilerleme (tam baskı + tam hizada)
        tol: 16 + skill * 2, // hizalama toleransı (px)
        noiseT: 0,
        cool: 0,
      };

      // Pimler (sıkışma sırası rastgele: gerçek kilitlerde işleme toleransı)
      const n = this.withDrill ? Math.min(6, 3 + lvl) : Math.min(4, 2 + Math.ceil(lvl / 2));
      this.pins = [];
      for (let i = 0; i < n; i++) this.pins.push({ lift: 0, shear: U.rand(0.45, 0.8), set: false, shake: 0, dwell: 0 });
      this.order = U.shuffle(this.pins.map((_, i) => i));
      this.tension = 0.2;
      this.tensionDrift = 0;
      this.lowT = 0;
      this.pinTol = 0.05 + skill * 0.008 + (scene.stethoscope ? 0.02 : 0);
      this.hover = -1;
    }

    get binding() {
      for (const i of this.order) if (!this.pins[i].set) return i;
      return -1;
    }

    say(text, col) {
      this.msg = text;
      this.msgT = 1.6;
      this.flash = 1;
      this.flashCol = col;
    }

    noise(loud, kind) {
      const d = this.door;
      this.scene.makeNoise(d.x, d.y - 90, loud, kind);
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 2.5);
      this.msgT = Math.max(0, this.msgT - dt);
      for (const p of this.pins) p.shake = Math.max(0, p.shake - dt * 3);
      if (this.result) {
        this.endT += dt;
        return this.endT > 0.6 ? this.result : null;
      }
      if (I.actPressed('back')) return 'cancel';
      if (this.stage === 'drill') this.updateDrill(dt);
      else this.updatePick(dt);
      return null;
    }

    /* ---------------- 1. aşama: matkap ---------------- */
    updateDrill(dt) {
      const d = this.drill;
      const m = I.mouse;
      const w = RC.Game.W;
      const h = RC.Game.H;
      const cx = w / 2 - 120;
      const cy = h / 2 + 10;
      d.cool = Math.max(0, d.cool - dt);
      const on = m.down && d.cool <= 0;

      // Baskı: basılıyken yükselir, bırakınca düşer (tüy dokunuşla ayarlanır)
      d.pressure = U.clamp(d.pressure + (on ? 0.55 : -0.9) * dt, 0, 1);
      // Isı: baskının küpüyle artar, bırakınca soğur
      const over = Math.max(0, d.pressure - DRILL_BAND[1]);
      d.heat = U.clamp(d.heat + (on ? Math.pow(d.pressure, 3) * 0.22 + over * 1.6 : 0) * dt - (on ? 0.05 : 0.3) * dt, 0, 1.2);

      // Uç, farenin gösterdiği yere ağır bir kütle gibi gecikmeyle gelir (bx, by).
      // Dönerken bir tork vektörü ucu yürütür (dx, dy): fareyle ters yöne karşıla.
      d.bx = U.damp(d.bx, m.x - cx, 7, dt);
      d.by = U.damp(d.by, m.y - cy, 7, dt);
      if (on) {
        d.driftA += U.rand(-1.5, 1.5) * dt;
        const push = (18 + this.lvl * 6) * d.pressure;
        d.dx += Math.cos(d.driftA) * push * dt;
        d.dy += Math.sin(d.driftA) * push * dt;
        d.spin += dt * (20 + d.pressure * 40);
      }
      const dm = Math.hypot(d.dx, d.dy);
      if (dm > 90) {
        d.dx *= 90 / dm;
        d.dy *= 90 / dm;
      }
      d.ox = d.bx + d.dx;
      d.oy = d.by + d.dy;
      const align = U.clamp(1 - Math.hypot(d.ox, d.oy) / (d.tol * 2.2), 0, 1);

      if (on) {
        const inBand = d.pressure >= DRILL_BAND[0];
        d.progress += (inBand ? d.rate : d.rate * 0.25) * d.pressure * align * align * dt;
        // Matkap sesi: baskıya bağlı, gerçek zamanlı algılanma riski
        d.noiseT -= dt;
        if (d.noiseT <= 0) {
          d.noiseT = 0.45;
          this.noise(0.05 + d.pressure * 0.2, 'drill');
          RC.Audio.play('metal', { vol: 0.15 + d.pressure * 0.3, intensity: 0.2 + d.pressure * 0.5, pitch: 1.6 + d.pressure * 0.6, minGap: 0.05 });
        }
        if (align < 0.3 && Math.random() < dt * 4) this.scene.camera.shake(0.03);
      }

      if (d.heat >= 1) {
        d.bits--;
        d.heat = 0.4;
        d.pressure = 0;
        d.cool = 1.2;
        d.progress = Math.max(0, d.progress - 0.15);
        RC.Audio.play('metal', { vol: 0.9, intensity: 1 });
        this.noise(0.4, 'drill');
        this.scene.camera.shake(0.25);
        if (d.bits <= 0) {
          this.say(L('Son matkap ucu da kırıldı!'), '#ff3043');
          this.result = 'fail';
          return;
        }
        this.say(L('Uç aşırı ısındı ve kırıldı! Kalan uç: {n}', { n: d.bits }), '#ff3043');
      }

      if (d.progress >= 1) {
        this.stage = 'pick';
        this.say(L('Silindir delindi. Şimdi pimleri tek tek oturt.'), '#3ddc84');
        RC.Audio.play('safeGood', { vol: 0.7 });
      }
    }

    /* ---------------- 2. aşama: gerdirme + maymuncuk ---------------- */
    pinLayout() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const n = this.pins.length;
      const cw = 56;
      const x0 = w / 2 - (n * cw) / 2;
      const top = h / 2 - PANEL_H / 2 + 110;
      return { n, cw, x0, top, travel: 120, base: top + 210 };
    }

    updatePick(dt) {
      const m = I.mouse;
      const lay = this.pinLayout();
      // Gerdirme: tekerlek yukarı = artır, aşağı = azalt (W/S yedek). Yorulan el
      // yüzünden gerdirme yavaşça kayar; sürekli düzeltmek gerekir.
      const wheel = -m.wheel * 0.06 + ((I.act('up') ? 1 : 0) - (I.act('down') ? 1 : 0)) * 0.5 * dt;
      this.tensionDrift = U.clamp(this.tensionDrift + U.rand(-0.25, 0.25) * dt, -0.06, 0.06);
      this.tension = U.clamp(this.tension + wheel + this.tensionDrift * dt, 0, 1);
      const inBand = this.tension >= TENSION_BAND[0] && this.tension <= TENSION_BAND[1];
      const tooHigh = this.tension > TENSION_BAND[1];

      // Hangi pimin altındayız, maymuncuk ne kadar kaldırıyor
      const i = Math.floor((m.x - lay.x0) / lay.cw);
      this.hover = i >= 0 && i < lay.n ? i : -1;
      const pickLift = U.clamp((lay.base - m.y) / lay.travel, 0, 1.1);
      const bind = this.binding;

      for (let k = 0; k < this.pins.length; k++) {
        const p = this.pins[k];
        if (p.set) continue;
        const engaged = k === this.hover && m.down;
        // Fazla gerdirmede pimler sıkışır, zor hareket eder
        const stiff = tooHigh ? 2 : 14;
        const target = engaged ? pickLift : 0;
        p.lift = U.damp(p.lift, target, target > p.lift ? stiff : 10, dt);

        if (k === bind && inBand && Math.abs(p.lift - p.shear) <= this.pinTol) {
          p.dwell += dt;
          if (p.dwell >= 0.18) {
            p.set = true;
            p.lift = p.shear;
            RC.Audio.play('safeClick', { vol: 1, pitch: 0.8 + this.pins.filter((q) => q.set).length * 0.08 });
            this.flash = 0.6;
            this.flashCol = '#3ddc84';
          }
        } else {
          p.dwell = 0;
        }
        // Fazla kaldırma (overset): sıkışan pim kesme çizgisini geçerse düşer
        if (k === bind && inBand && p.lift > p.shear + this.pinTol * 2.5) {
          p.lift = 0;
          p.shake = 1;
          this.tension = Math.max(0, this.tension - 0.25);
          RC.Audio.play('metal', { vol: 0.45, intensity: 0.3 });
          this.noise(0.14, 'lock');
          this.say(L('Pim fazla kalktı ve düştü.'), '#ff8c2e');
        }
      }

      // Gerdirme bırakılırsa en son oturan pim düşer
      if (this.tension < TENSION_BAND[0] * 0.5) {
        this.lowT += dt;
        if (this.lowT > 0.35) {
          this.lowT = 0;
          const setOnes = this.order.filter((k) => this.pins[k].set);
          if (setOnes.length) {
            const last = this.pins[setOnes[setOnes.length - 1]];
            last.set = false;
            last.lift = 0;
            last.shake = 1;
            RC.Audio.play('tick', { vol: 0.6, pitch: 0.7 });
            this.say(L('Gerdirme gevşedi: bir pim düştü.'), '#ff8c2e');
          }
        }
      } else {
        this.lowT = 0;
      }

      if (this.pins.every((p) => p.set)) {
        this.result = 'win';
        RC.Audio.play('safeGood', { vol: 0.9 });
        this.say(L('Kilit döndü!'), '#3ddc84');
      }
    }

    /* ---------------- Çizim ---------------- */
    draw(ctx, w, h, t) {
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, w, h);
      const px = w / 2 - PANEL_W / 2;
      const py = h / 2 - PANEL_H / 2;
      D.panel(ctx, px, py, PANEL_W, PANEL_H, { accent: C.COLORS.gold });
      D.text(ctx, L('KİLİDİ KIR'), w / 2, py + 38, { size: 26, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold });
      const drill = this.stage === 'drill';
      const stageTxt = !this.withDrill ? 'MAYMUNCUK' : drill ? '1/2 · MATKAP' : '2/2 · GERDİRME + MAYMUNCUK';
      D.text(ctx, L(stageTxt), px + 20, py + 38, { size: 13, weight: 'bold', color: '#9aa3c7' });
      if (drill) this.drawDrill(ctx, w, h, t, px, py);
      else this.drawPick(ctx, w, h, t, px, py);
      if (this.msgT > 0) D.text(ctx, this.msg, w / 2, py + PANEL_H - 56, { size: 15, align: 'center', weight: 'bold', color: this.flashCol, alpha: Math.min(1, this.msgT * 2) });
      D.text(ctx, L('Her ses kapıdan duyulur · ESC: vazgeç'), w / 2, py + PANEL_H - 20, { size: 13, align: 'center', color: '#ff8c2e' });
      if (this.flash > 0) {
        ctx.strokeStyle = U.rgba(this.flashCol, this.flash);
        ctx.lineWidth = 6;
        U.strokeRoundRect(ctx, px + 4, py + 4, PANEL_W - 8, PANEL_H - 8, 12);
      }
    }

    gauge(ctx, x, y, hgt, v, band, label, col) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      U.fillRoundRect(ctx, x, y, 22, hgt, 6);
      if (band) {
        ctx.fillStyle = 'rgba(61,220,132,0.28)';
        ctx.fillRect(x, y + hgt * (1 - band[1]), 22, hgt * (band[1] - band[0]));
      }
      const vv = U.clamp01(v);
      ctx.fillStyle = col;
      U.fillRoundRect(ctx, x + 3, y + hgt * (1 - vv), 16, hgt * vv, 4);
      D.text(ctx, label, x + 11, y + hgt + 18, { size: 11, align: 'center', weight: 'bold', color: '#9aa3c7' });
    }

    drawDrill(ctx, w, h, t, px, py) {
      const d = this.drill;
      const cx = w / 2 - 120;
      const cy = h / 2 + 10;
      // Kilit yüzü
      const g = ctx.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, 120);
      g.addColorStop(0, '#c9a24a');
      g.addColorStop(1, '#6a4f1e');
      U.circle(ctx, cx, cy, 110, g);
      U.circle(ctx, cx, cy, 70, '#8a6a2a');
      ctx.fillStyle = '#2a1e10';
      U.fillRoundRect(ctx, cx - 6, cy - 44, 12, 60, 5);
      // Hedef ve tolerans halkası
      ctx.strokeStyle = 'rgba(61,220,132,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, d.tol, 0, U.TAU);
      ctx.stroke();
      // İlerleme halkası
      ctx.strokeStyle = C.COLORS.gold;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 124, -Math.PI / 2, -Math.PI / 2 + U.TAU * U.clamp01(d.progress));
      ctx.stroke();
      // Matkap ucu (sapmayla birlikte)
      const bx = cx + d.ox;
      const by = cy + d.oy;
      const hot = U.clamp01(d.heat);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(d.spin);
      ctx.strokeStyle = `rgb(${200 + hot * 55},${200 - hot * 140},${200 - hot * 180})`;
      ctx.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        ctx.rotate(U.TAU / 3);
        U.line(ctx, 0, 0, 14, 0);
      }
      ctx.restore();
      U.circle(ctx, bx, by, 4, '#fff');
      if (I.mouse.down && d.cool <= 0 && Math.random() < 0.6) {
        ctx.fillStyle = '#ffb347';
        ctx.fillRect(bx + U.rand(-10, 10), by + U.rand(-10, 10), 2, 2);
      }
      // Göstergeler
      const gx = w / 2 + 70;
      const gy = py + 90;
      this.gauge(ctx, gx, gy, 220, d.pressure, DRILL_BAND, L('BASKI'), '#4aa8ff');
      this.gauge(ctx, gx + 50, gy, 220, d.heat, null, L('ISI'), hot > 0.75 ? '#ff3043' : '#ff8c2e');
      // Uçlar
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k < d.bits ? '#d9dde4' : 'rgba(255,255,255,0.15)';
        U.fillRoundRect(ctx, gx + 110, gy + k * 34, 10, 26, 3);
      }
      D.text(ctx, L('UÇ'), gx + 115, gy + 120, { size: 11, align: 'center', weight: 'bold', color: '#9aa3c7' });
      D.text(ctx, L('Sol tuşu basılı tut: del · Baskıyı yeşil bantta tut'), w / 2 + 170, gy + 170, { size: 12, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Uç kayar: fareyle yeşil halkada tut'), w / 2 + 170, gy + 190, { size: 12, align: 'center', color: '#dfe3f5' });
      D.text(ctx, Math.round(U.clamp01(d.progress) * 100) + '%', cx, cy + 150, { size: 16, align: 'center', weight: 'bold', color: C.COLORS.gold });
    }

    drawPick(ctx, w, h, t, px, py) {
      const lay = this.pinLayout();
      const { n, cw, x0, top, travel, base } = lay;
      // Silindir gövdesi
      ctx.fillStyle = '#b8903a';
      U.fillRoundRect(ctx, x0 - 24, top, n * cw + 48, 240, 12);
      // Kesme çizgileri pim başına farklıdır (işleme toleransı)
      for (let i = 0; i < n; i++) {
        const p = this.pins[i];
        const x = x0 + i * cw + cw / 2 + (p.shake > 0 ? Math.sin(t * 60) * 3 * p.shake : 0);
        const shearY = base - p.shear * travel;
        ctx.fillStyle = '#2a1e10';
        ctx.fillRect(x - 12, top + 10, 24, 220);
        ctx.strokeStyle = 'rgba(61,220,132,0.55)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 2;
        U.line(ctx, x - 16, shearY, x + 16, shearY);
        ctx.setLineDash([]);
        const pinY = base - p.lift * travel;
        // Üst pim + yay
        ctx.strokeStyle = '#c0c4cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let y = top + 12; y < pinY - 40; y += 6) {
          ctx.moveTo(x - 8, y);
          ctx.lineTo(x + 8, y + 3);
        }
        ctx.stroke();
        U.fillRoundRect(ctx, x - 9, pinY - 38, 18, 34, 4, p.set ? '#3ddc84' : '#d9dde4');
        U.fillRoundRect(ctx, x - 9, pinY - 2, 18, 30, 4, i === this.hover ? '#ffc83d' : '#9aa0aa');
      }
      // Maymuncuk (fare konumunda)
      const m = I.mouse;
      const tipX = U.clamp(m.x, x0 - 10, x0 + n * cw + 10);
      const tipY = U.clamp(m.y, base - travel * 1.1, base + 40);
      ctx.strokeStyle = '#e6e8ee';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + 24, base + 60);
      ctx.lineTo(tipX - 14, tipY + 30);
      ctx.lineTo(tipX, tipY + 26);
      ctx.stroke();
      ctx.lineCap = 'butt';
      // Gerdirme göstergesi
      const gx = px + PANEL_W - 56;
      this.gauge(ctx, gx, top, 220, this.tension, TENSION_BAND, L('GERDİRME'), this.tension > TENSION_BAND[1] ? '#ff3043' : '#4aa8ff');
      D.text(ctx, `${this.pins.filter((p) => p.set).length}/${n}`, px + PANEL_W - 20, py + 38, { size: 16, align: 'right', color: '#9aa3c7', weight: 'bold' });
      D.text(ctx, L('Tekerlek (veya W/S) = gerdirme · Sol tuşla pimin altında yukarı sürükle'), w / 2, top + 266, { size: 13, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Önce sıkışan pim oturur; hangisi olduğunu hisset'), w / 2, top + 284, { size: 12, align: 'center', color: '#9aa3c7' });
    }
  }

  /* =====================================================================
   * ALARM PANELİ HACKLEME
   * =================================================================== */
  const ARROWS = [
    { code: ['KeyW', 'ArrowUp'], sym: '▲' },
    { code: ['KeyS', 'ArrowDown'], sym: '▼' },
    { code: ['KeyA', 'ArrowLeft'], sym: '◀' },
    { code: ['KeyD', 'ArrowRight'], sym: '▶' },
  ];

  class HackGame {
    constructor(scene, panel) {
      this.scene = scene;
      this.panel = panel;
      this.round = 0;
      this.rounds = 3;
      this.fails = 0;
      this.maxFails = 3;
      this.t = 0;
      this.result = null;
      this.endT = 0;
      this.newRound();
    }

    newRound() {
      const len = 4 + this.round + Math.floor(this.scene.levelIndex / 4);
      this.seq = [];
      for (let i = 0; i < len; i++) this.seq.push(U.randInt(0, 3));
      this.input = 0;
      this.showT = 0;
      this.showing = true;
      this.showStep = 0.5 - Math.min(0.2, this.scene.levelIndex * 0.02);
      this.timeLeft = 5 + len * 0.6;
      this.flash = 0;
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 3);
      if (this.result) {
        this.endT += dt;
        return this.endT > 0.6 ? this.result : null;
      }
      if (I.actPressed('back')) return 'cancel';
      if (this.showing) {
        const before = Math.floor(this.showT / this.showStep);
        this.showT += dt;
        const now = Math.floor(this.showT / this.showStep);
        if (now !== before && now <= this.seq.length) RC.Audio.play('blip', { pitch: 0.8 + (this.seq[now - 1] || 0) * 0.15 });
        if (this.showT > this.seq.length * this.showStep + 0.4) this.showing = false;
        return null;
      }
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) return this.fail();
      for (let a = 0; a < 4; a++) {
        if (ARROWS[a].code.some((c) => I.wasPressed(c))) {
          if (a === this.seq[this.input]) {
            this.input++;
            RC.Audio.play('tick', { pitch: 1 + this.input * 0.1 });
            if (this.input >= this.seq.length) {
              this.round++;
              this.flash = 1;
              RC.Audio.play('safeGood', { vol: 0.8 });
              if (this.round >= this.rounds) {
                this.result = 'win';
              } else this.newRound();
            }
          } else {
            return this.fail();
          }
          break;
        }
      }
      return null;
    }

    fail() {
      this.fails++;
      RC.Audio.play('uiError', { vol: 1 });
      this.scene.makeNoise(this.panel.x, this.panel.y, 0.25, 'panel');
      this.scene.camera.shake(0.15);
      if (this.fails >= this.maxFails) {
        this.result = 'alarm';
        return null;
      }
      this.newRound();
      return null;
    }

    draw(ctx, w, h, t) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, w, h);
      const pw = 560;
      const ph = 360;
      const px = w / 2 - pw / 2;
      const py = h / 2 - ph / 2;
      ctx.fillStyle = '#04120a';
      U.fillRoundRect(ctx, px, py, pw, ph, 14);
      ctx.strokeStyle = '#3ddc84';
      ctx.lineWidth = 2;
      U.strokeRoundRect(ctx, px + 1, py + 1, pw - 2, ph - 2, 14);
      // Tarama çizgileri
      ctx.fillStyle = 'rgba(61,220,132,0.05)';
      for (let y = py + 4; y < py + ph; y += 4) ctx.fillRect(px + 2, y, pw - 4, 1);
      const mono = C.FONT_MONO;
      D.text(ctx, L('> ALARM PANELİ // BYPASS'), px + 24, py + 40, { size: 18, font: mono, color: '#3ddc84' });
      D.text(ctx, L('Tur {r}/{n}   Hata {f}/{m}', { r: Math.min(this.round + 1, this.rounds), n: this.rounds, f: this.fails, m: this.maxFails }), px + pw - 24, py + 40, { size: 14, font: mono, align: 'right', color: this.fails ? '#ff5060' : '#3ddc84' });
      const n = this.seq.length;
      const bw = 56;
      const sx = w / 2 - (n * (bw + 8)) / 2 + 4;
      for (let i = 0; i < n; i++) {
        const x = sx + i * (bw + 8);
        const y = py + 120;
        let lit = false;
        if (this.showing) {
          const step = Math.floor(this.showT / this.showStep);
          lit = step === i + 1 || (step > i + 1 && false);
        }
        const done = !this.showing && i < this.input;
        ctx.fillStyle = done ? '#1f6a3a' : lit ? '#3ddc84' : '#0e2a1a';
        U.fillRoundRect(ctx, x, y, bw, bw, 8);
        ctx.strokeStyle = '#3ddc84';
        ctx.lineWidth = 1.5;
        U.strokeRoundRect(ctx, x, y, bw, bw, 8);
        const show = lit || done || (!this.showing && false);
        if (show) D.text(ctx, ARROWS[this.seq[i]].sym, x + bw / 2, y + bw / 2 + 9, { size: 26, align: 'center', color: done ? '#9fffc4' : '#04120a' });
        else D.text(ctx, '?', x + bw / 2, y + bw / 2 + 8, { size: 22, font: mono, align: 'center', color: 'rgba(61,220,132,0.35)' });
      }
      if (this.showing) {
        D.text(ctx, L('Diziyi ezberle...'), w / 2, py + 230, { size: 18, font: mono, align: 'center', color: '#3ddc84', alpha: 0.6 + Math.sin(t * 8) * 0.4 });
      } else if (!this.result) {
        D.text(ctx, L('Diziyi yön tuşlarıyla (W A S D / oklar) gir'), w / 2, py + 230, { size: 16, font: mono, align: 'center', color: '#9fffc4' });
        D.bar(ctx, px + 60, py + 256, pw - 120, 8, this.timeLeft / (5 + n * 0.6), { from: '#ff3043', to: '#3ddc84' });
      } else {
        D.text(ctx, this.result === 'win' ? L('ERİŞİM SAĞLANDI') : L('ERİŞİM REDDEDİLDİ'), w / 2, py + 240, { size: 26, font: mono, align: 'center', color: this.result === 'win' ? '#3ddc84' : '#ff3043' });
      }
      D.text(ctx, L('3 hatada alarm çalar · ESC: vazgeç'), w / 2, py + ph - 24, { size: 13, font: mono, align: 'center', color: '#ff8c2e' });
      if (this.flash > 0) {
        ctx.strokeStyle = `rgba(61,220,132,${this.flash})`;
        ctx.lineWidth = 6;
        U.strokeRoundRect(ctx, px + 4, py + 4, pw - 8, ph - 8, 12);
      }
    }
  }

  RC.Minigames = { LockpickGame, HackGame };
})(window.RC);
