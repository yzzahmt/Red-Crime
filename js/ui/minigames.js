/* =========================================================================
 *  RED CRIME - Mini oyunlar
 *  - Dış kapı (fare/dokunmatik): 1) matkabı kesme çizgisine (anahtar yuvasının
 *    hemen üstü) daya ve pimleri tek tek del (baskı, ısı, uç sapması, sertleştirilmiş
 *    pimler), 2) deliğe tornavidayı sok ve silindiri çevir (kırık pim parçası takılır).
 *  - İç kapı: gerdirme teli + maymuncukla pimleri kesme çizgisine tek tek oturt.
 *  - Kasa: şifre kadranı; stetoskopla tıkları dinle, doğru rakamda yön değiştir.
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
   *  1) MATKAP (dış kapı): sol tuşu basılı tut = matkap döner, baskı artar; bırak =
   *     baskı düşer. Hedef, göbeğin ortası değil kesme çizgisidir (pimlerin geçtiği
   *     yer). Uç her pime gelince zorlanır: baskıyı azalt. Sertleştirilmiş çelik
   *     pim çok çabuk ısıtır: kesik kesik (bas-bırak) del. Uç dönerken sapar.
   *  2) TORNAVİDA (dış kapı): basılı tutup kilidin çevresinde saat yönünde
   *     döndür (ya da D). Kırık pim parçası takılırsa biraz geri çevir, sonra ileri.
   *  MAYMUNCUK (iç kapı): sol tuş basılıyken pimin altında yukarı sürükle; pim kesme
   *     çizgisine gelince oturur. Fazla kaldırmak pimi düşürür.
   *  Arayüz: update(dt) -> null | 'win' | 'cancel' | 'fail'
   * =================================================================== */
  const DRILL_BAND = [0.5, 0.78]; // ideal baskı aralığı (pimler arası)
  const PIN_BAND = [0.3, 0.55]; // pimi delerken
  const HARD_BAND = [0.22, 0.45]; // sertleştirilmiş pim
  const SHEAR_Y = -40; // kesme çizgisi: göbek merkezinin 40 px üstü
  const TURN_GOAL = Math.PI / 2; // kam 90° dönünce dil çekilir
  const PANEL_W = 640;
  const PANEL_H = 440;

  class LockpickGame {
    /** opts.drill: true = dış kapı (matkap + tornavida), false = iç kapı (maymuncuk) */
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
        rate: (0.8 - lvl * 0.05) * (scene.drill ? 1.5 : 1), // sn başına ilerleme (tam baskı + tam hizada)
        tol: 16 + skill * 2, // hizalama toleransı (px)
        noiseT: 0,
        cool: 0,
        shake: 0,
        snapT: 0,
      };
      this.chips = [];

      // Delinecek pimler (silindir boyunca). Üst bölümlerde bazıları sertleştirilmiş çelik.
      const dn = Math.min(6, 4 + Math.floor(lvl / 2));
      const hard = Math.min(dn - 1, Math.max(0, lvl - 1));
      this.dpins = [];
      for (let i = 0; i < dn; i++) this.dpins.push({ at: (i + 0.8) / (dn + 0.4), hard: false, cut: false });
      U.shuffle(this.dpins.slice(1)).slice(0, hard).forEach((q) => (q.hard = true));
      this.band = DRILL_BAND;

      // Tornavida
      this.turn = { a: 0, prev: null, jamAt: U.rand(0.35, 0.95), jam: true, back: 0, strain: 0, slip: 0 };

      // Pimler (iç kapı maymuncuğu; sıkışma sırası rastgele)
      const n = Math.min(3, 1 + Math.ceil(lvl / 2));
      this.pins = [];
      for (let i = 0; i < n; i++) this.pins.push({ lift: 0, shear: U.rand(0.45, 0.8), set: false, shake: 0, dwell: 0 });
      this.pinTol = 0.08 + skill * 0.01 + (scene.stethoscope ? 0.03 : 0);
      this.hover = -1;
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
      else if (this.stage === 'turn') this.updateTurn(dt);
      else this.updatePick(dt);
      return null;
    }

    /* ---------------- 1. aşama: matkap ---------------- */
    /** Kilit yüzünün merkezi (ekran px): güncelleme ve çizim aynı noktayı kullanır */
    lockCenter() {
      return { cx: RC.Game.W / 2 - 170, cy: RC.Game.H / 2 + 20 };
    }

    /** Matkabın ucundaki pim (yoksa null) */
    pinAtBit() {
      const pr = this.drill.progress;
      return this.dpins.find((q) => !q.cut && pr > q.at - 0.06 && pr < q.at + 0.03) || null;
    }

    updateDrill(dt) {
      const d = this.drill;
      const m = I.mouse;
      const { cx } = this.lockCenter();
      const cy = this.lockCenter().cy + SHEAR_Y; // hedef: kesme çizgisi
      this.updateChips(dt);
      d.cool = Math.max(0, d.cool - dt);
      const on = m.down && d.cool <= 0;
      const pin = this.pinAtBit();
      this.band = pin ? (pin.hard ? HARD_BAND : PIN_BAND) : DRILL_BAND;
      const band = this.band;

      // Baskı: basılıyken yükselir, bırakınca düşer (tüy dokunuşla ayarlanır)
      d.pressure = U.clamp(d.pressure + (on ? 1.1 : -1.4) * dt, 0, 1);
      // Isı: baskının küpüyle artar, bırakınca soğur. Pim, özellikle sertleştirilmiş
      // çelik pim, ucu çok daha çabuk ısıtır: kesik kesik delmek gerekir.
      const over = Math.max(0, d.pressure - band[1]);
      const pinHeat = pin ? (pin.hard ? 3.2 : 1.6) : 1;
      d.heat = U.clamp(d.heat + (on ? (Math.pow(d.pressure, 3) * 0.22 + over * 1.6) * pinHeat : 0) * dt - (on ? 0.05 : 0.45) * dt, 0, 1.2);

      // Uç, farenin gösterdiği yere ağır bir kütle gibi gecikmeyle gelir (bx, by).
      // Dönerken bir tork vektörü ucu yürütür (dx, dy): fareyle ters yöne karşıla.
      d.bx = U.damp(d.bx, m.x - cx, 7, dt);
      d.by = U.damp(d.by, m.y - cy, 7, dt);
      if (on) {
        d.driftA += U.rand(-1.5, 1.5) * dt;
        const push = (10 + this.lvl * 3) * d.pressure;
        d.dx += Math.cos(d.driftA) * push * dt;
        d.dy += Math.sin(d.driftA) * push * dt;
        d.spin += dt * (20 + d.pressure * 40);
        d.shake = d.pressure;
      } else {
        d.shake = 0;
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
        const inBand = d.pressure >= band[0];
        const resist = pin ? (pin.hard ? 0.4 : 0.6) : 1;
        d.progress += (inBand ? d.rate : d.rate * 0.25) * resist * Math.max(d.pressure, 0.5) * align * align * dt;
        // Uç pime girince "tutar": ani tork, matkap yana çeker
        if (pin && !pin.bite) {
          pin.bite = true;
          d.driftA = U.rand(0, U.TAU);
          d.dx += Math.cos(d.driftA) * 14;
          d.dy += Math.sin(d.driftA) * 14;
          this.scene.camera.shake(0.08);
          this.say(L(pin.hard ? 'Sertleştirilmiş çelik pim! Kesik kesik del.' : 'Pime geldin: baskıyı azalt.'), pin.hard ? '#4aa8ff' : '#ffc83d');
        }
        for (const q of this.dpins) {
          if (!q.cut && d.progress >= q.at + 0.03) {
            q.cut = true;
            RC.Audio.play('metal', { vol: 0.5, intensity: 0.6, pitch: 1.1 });
            for (let k = 0; k < 6; k++) this.spawnChip(cx + d.ox, cy + d.oy, false);
          }
        }
        // Talaş (hizadayken metal kıvrımı, ısınınca kıvılcım); hiza bozuksa uç kayar
        const n = Math.random() < dt * 40 * d.pressure ? 1 + (align > 0.5 ? 1 : 0) : 0;
        for (let k = 0; k < n; k++) this.spawnChip(cx + d.ox, cy + d.oy, d.heat > 0.55 || align < 0.4);
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
        d.snapT = 0.8; // kırık uç parçası animasyonu
        for (let k = 0; k < 14; k++) this.spawnChip(cx + d.ox, cy + d.oy, true);
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
        this.stage = 'turn';
        this.band = DRILL_BAND;
        this.say(L('Pimler kesildi! Tornavidayı sok ve silindiri çevir.'), '#3ddc84');
        RC.Audio.play('safeGood', { vol: 0.7 });
      }
    }

    /* ---------------- 2. aşama (dış kapı): tornavidayla çevir ---------------- */
    updateTurn(dt) {
      const tu = this.turn;
      const m = I.mouse;
      const { cx, cy } = this.lockCenter();
      this.updateChips(dt);
      tu.slip = Math.max(0, tu.slip - dt);
      // Girdi: basılıyken kilidin çevresinde döndür (fare/parmak) ya da A/D
      let delta = 0;
      if (m.down) {
        const a = Math.atan2(m.y - cy, m.x - cx);
        if (tu.prev != null) delta = U.clamp(U.angleDiff(tu.prev, a), -0.25, 0.25);
        tu.prev = a;
      } else tu.prev = null;
      if (I.act('right')) delta += 1.6 * dt;
      if (I.act('left')) delta -= 1.6 * dt;
      if (tu.slip > 0) delta = 0;

      if (tu.jam && tu.a >= tu.jamAt) {
        tu.contact = true;
        // Kırık pim parçası takıldı: zorlamak tornavidayı kaydırır
        if (delta > 0) {
          tu.strain += delta * 4;
          delta = 0;
          if (tu.strain > 1) {
            tu.strain = 0;
            tu.slip = 0.5;
            RC.Audio.play('metal', { vol: 0.6, intensity: 0.5, pitch: 2 });
            this.noise(0.18, 'lock');
            this.scene.camera.shake(0.12);
            this.say(L('Tornavida kaydı! Biraz geri çevir, parçayı düşür.'), '#ff8c2e');
          }
        }
        if (!tu.warned) {
          tu.warned = true;
          this.say(L('Takıldı: kırık bir pim parçası var.'), '#ffc83d');
        }
      }
      // Takıldıktan sonra biraz geri çevirmek parçayı düşürür
      if (tu.jam && tu.contact && delta < 0) {
        tu.back -= delta;
        if (tu.back > 0.18) {
          tu.jam = false;
          RC.Audio.play('safeClick', { vol: 0.9, pitch: 0.7 });
          this.say(L('Parça düştü. Şimdi çevir!'), '#3ddc84');
        }
      }
      tu.a = U.clamp(tu.a + delta, 0, TURN_GOAL);
      if (tu.jam && tu.a > tu.jamAt) tu.a = tu.jamAt;
      if (delta > 0.002 && Math.random() < dt * 8) RC.Audio.play('safeClick', { vol: 0.25, pitch: 1.4 + tu.a });

      if (tu.a >= TURN_GOAL) {
        this.result = 'win';
        RC.Audio.play('safeGood', { vol: 0.9 });
        this.noise(0.1, 'lock');
        this.say(L('Kam döndü, kapı açıldı!'), '#3ddc84');
      }
    }

    spawnChip(x, y, spark) {
      if (this.chips.length > 80) this.chips.shift();
      this.chips.push({
        x,
        y,
        vx: U.rand(-40, 160),
        vy: U.rand(-160, 20),
        life: spark ? U.rand(0.2, 0.45) : U.rand(0.6, 1.2),
        max: 1,
        spark,
        rot: U.rand(0, U.TAU),
        spin: U.rand(-12, 12),
        size: spark ? U.rand(1, 2.2) : U.rand(2, 4),
      });
      const c = this.chips[this.chips.length - 1];
      c.max = c.life;
    }

    updateChips(dt) {
      const d = this.drill;
      if (d.snapT > 0) d.snapT -= dt;
      for (let i = this.chips.length - 1; i >= 0; i--) {
        const c = this.chips[i];
        c.life -= dt;
        if (c.life <= 0) {
          this.chips.splice(i, 1);
          continue;
        }
        c.vy += (c.spark ? 300 : 700) * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.spin * dt;
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
      // Hangi pimin altındayız, maymuncuk ne kadar kaldırıyor
      const i = Math.floor((m.x - lay.x0) / lay.cw);
      this.hover = i >= 0 && i < lay.n ? i : -1;
      const pickLift = U.clamp((lay.base - m.y) / lay.travel, 0, 1.1);

      for (let k = 0; k < this.pins.length; k++) {
        const p = this.pins[k];
        if (p.set) continue;
        const target = k === this.hover && m.down ? pickLift : 0;
        p.lift = U.damp(p.lift, target, target > p.lift ? 16 : 10, dt);

        if (Math.abs(p.lift - p.shear) <= this.pinTol) {
          p.dwell += dt;
          if (p.dwell >= 0.08) {
            p.set = true;
            p.lift = p.shear;
            RC.Audio.play('safeClick', { vol: 1, pitch: 0.8 + this.pins.filter((q) => q.set).length * 0.08 });
            this.flash = 0.6;
            this.flashCol = '#3ddc84';
          }
        } else {
          p.dwell = 0;
        }
        // Fazla kaldırma: pim kesme çizgisini geçerse düşer ve tıkırdar
        if (p.lift > p.shear + this.pinTol * 2.5) {
          p.lift = 0;
          p.shake = 1;
          RC.Audio.play('metal', { vol: 0.45, intensity: 0.3 });
          this.noise(0.12, 'lock');
          this.say(L('Pim fazla kalktı ve düştü.'), '#ff8c2e');
        }
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
      const drill = this.stage === 'drill' || this.stage === 'turn';
      const stageTxt = !this.withDrill ? 'MAYMUNCUK' : this.stage === 'drill' ? '1/2 · MATKAP' : '2/2 · TORNAVİDA';
      D.text(ctx, L(stageTxt), px + 20, py + 38, { size: 13, weight: 'bold', color: '#9aa3c7' });
      if (this.stage === 'drill') this.drawDrill(ctx, w, h, t, px, py);
      else if (this.stage === 'turn') this.drawTurn(ctx, w, h, t, px, py);
      else this.drawPick(ctx, w, h, t, px, py);
      if (this.msgT > 0) D.text(ctx, this.msg, w / 2, py + (drill ? PANEL_H - 42 : 70), { size: 15, align: 'center', weight: 'bold', color: this.flashCol, alpha: Math.min(1, this.msgT * 2) });
      D.text(ctx, L(RC.T('Her ses kapıdan duyulur · ESC: vazgeç', 'Her ses kapıdan duyulur · X: vazgeç')), w / 2, py + PANEL_H - 20, { size: 13, align: 'center', color: '#ff8c2e' });
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

    /** Kapı aynası üzerinde Avrupa tipi silindir: gövde, göbek, anahtar yuvası */
    drawCylinderFace(ctx, cx, cy, rot) {
      // Kapı aynası (paslanmaz levha)
      const pl = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
      pl.addColorStop(0, '#8a8f98');
      pl.addColorStop(0.5, '#d4d8de');
      pl.addColorStop(1, '#7a7f88');
      ctx.fillStyle = pl;
      U.fillRoundRect(ctx, cx - 62, cy - 150, 124, 290, 18);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      U.strokeRoundRect(ctx, cx - 62, cy - 150, 124, 290, 18);
      for (const vy of [cy - 130, cy + 120]) {
        U.circle(ctx, cx, vy, 6, '#6a6f78');
        ctx.strokeStyle = '#3a3d44';
        U.line(ctx, cx - 4, vy, cx + 4, vy);
      }
      // Silindir gövdesi (pirinç): yuvarlak üst + dil kısmı
      const g = ctx.createRadialGradient(cx - 18, cy - 18, 6, cx, cy, 70);
      g.addColorStop(0, '#e6c46a');
      g.addColorStop(1, '#6e5220');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, 52, Math.PI, 0);
      ctx.lineTo(cx + 22, cy + 96);
      ctx.quadraticCurveTo(cx, cy + 108, cx - 22, cy + 96);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.stroke();
      // Göbek (dönen kısım)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot || 0);
      U.circle(ctx, 0, 0, 40, '#a8843a');
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, U.TAU);
      ctx.stroke();
      // Anahtar yuvası (dalgalı profil)
      ctx.fillStyle = '#1a1208';
      ctx.beginPath();
      ctx.moveTo(-4, -30);
      ctx.lineTo(4, -30);
      ctx.lineTo(2, -18);
      ctx.lineTo(6, -8);
      ctx.lineTo(2, 4);
      ctx.lineTo(5, 16);
      ctx.lineTo(3, 30);
      ctx.lineTo(-3, 30);
      ctx.lineTo(-5, 16);
      ctx.lineTo(-2, 4);
      ctx.lineTo(-6, -8);
      ctx.lineTo(-2, -18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    /** Kesit görünümü: silindir boyunca pimler ve ilerleyen matkap ucu */
    drawCutaway(ctx, x, y, cw, t) {
      const d = this.drill;
      const ch = 70;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      U.fillRoundRect(ctx, x - 8, y - 22, cw + 16, ch + 34, 8);
      D.text(ctx, L('KESİT'), x, y - 8, { size: 10, weight: 'bold', color: '#9aa3c7' });
      // Gövde (üst) ve göbek (alt), aralarında kesme çizgisi
      const sy = y + ch * 0.45;
      ctx.fillStyle = '#8a6a2a';
      ctx.fillRect(x, y, cw, sy - y);
      ctx.fillStyle = '#b8903a';
      ctx.fillRect(x, sy, cw, y + ch - sy);
      ctx.strokeStyle = 'rgba(61,220,132,0.9)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      U.line(ctx, x, sy, x + cw, sy);
      ctx.setLineDash([]);
      // Pimler
      for (const q of this.dpins) {
        const px = x + q.at * cw;
        const col = q.hard ? '#6f8fb8' : '#d9dde4';
        if (!q.cut) {
          ctx.fillStyle = col;
          U.fillRoundRect(ctx, px - 5, y + 6, 10, sy - y - 4, 3);
          U.fillRoundRect(ctx, px - 5, sy + 1, 10, 22, 3);
          ctx.strokeStyle = '#c0c4cc';
          ctx.lineWidth = 1;
          for (let yy = y + 2; yy < y + 8; yy += 3) U.line(ctx, px - 4, yy, px + 4, yy + 1);
        } else {
          // Kesilmiş pim: kesme çizgisinde kopuk
          ctx.fillStyle = U.rgba(col, 0.45);
          U.fillRoundRect(ctx, px - 5, y + 6, 10, sy - y - 14, 3);
          U.fillRoundRect(ctx, px - 5, sy + 8, 10, 16, 3);
        }
        if (q.hard) D.text(ctx, '⬢', px, y + ch + 12, { size: 10, align: 'center', color: '#6f8fb8' });
      }
      // Matkap ucu: kesme çizgisi boyunca ilerler
      const len = U.clamp01(d.progress) * cw;
      ctx.fillStyle = '#0d0a06';
      ctx.fillRect(x, sy - 5, len, 10);
      ctx.fillStyle = '#c8ccd4';
      ctx.beginPath();
      ctx.moveTo(x - 30, sy - 4);
      ctx.lineTo(x + len - 6, sy - 4);
      ctx.lineTo(x + len, sy);
      ctx.lineTo(x + len - 6, sy + 4);
      ctx.lineTo(x - 30, sy + 4);
      ctx.closePath();
      ctx.fill();
      const pin = this.pinAtBit();
      if (pin && I.mouse.down) U.circle(ctx, x + len, sy, 3 + Math.random() * 3, U.rgba('#ffb347', 0.8));
    }

    drawDrill(ctx, w, h, t, px, py) {
      const d = this.drill;
      const { cx } = this.lockCenter();
      const fy = this.lockCenter().cy;
      const cy = fy + SHEAR_Y;
      this.drawCylinderFace(ctx, cx, fy, 0);
      // Delinen delik: ilerledikçe büyür, kenarları parlak metal
      const hole = 2 + U.clamp01(d.progress) * 5;
      U.circle(ctx, cx, cy, hole + 2, 'rgba(230,230,235,0.55)');
      U.circle(ctx, cx, cy, hole, '#0d0a06');
      // Hedef (kesme çizgisi) ve tolerans halkası
      ctx.strokeStyle = 'rgba(61,220,132,0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, d.tol, 0, U.TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      D.text(ctx, L('kesme çizgisi'), cx - 64, cy + 4, { size: 10, align: 'right', color: 'rgba(61,220,132,0.9)' });
      // İlerleme halkası
      ctx.strokeStyle = C.COLORS.gold;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, fy, 64, -Math.PI / 2, -Math.PI / 2 + U.TAU * U.clamp01(d.progress));
      ctx.stroke();
      this.drawCutaway(ctx, w / 2 - 20, py + 80, 170, t);

      // Matkap (uç, sapmayla birlikte hedefin üstünde)
      const on = I.mouse.down && d.cool <= 0;
      const jit = d.shake * 1.6;
      const bx = cx + d.ox + (jit ? U.rand(-jit, jit) : 0);
      const by = cy + d.oy + (jit ? U.rand(-jit, jit) : 0);
      this.drawDrillTool(ctx, bx, by, t, on);

      // Talaş ve kıvılcımlar
      for (const c of this.chips) {
        const a = U.clamp01(c.life / c.max);
        if (c.spark) {
          ctx.strokeStyle = `rgba(255,${170 + Math.round(a * 80)},80,${a})`;
          ctx.lineWidth = c.size;
          U.line(ctx, c.x, c.y, c.x - c.vx * 0.03, c.y - c.vy * 0.03);
        } else {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.strokeStyle = `rgba(210,212,220,${a})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, c.size, 0, Math.PI * 1.3);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Göstergeler (sağ kenar)
      const hot = U.clamp01(d.heat);
      const gx = w / 2 + 170;
      const gy = py + 76;
      this.gauge(ctx, gx, gy, 200, d.pressure, this.band, L('BASKI'), '#4aa8ff');
      this.gauge(ctx, gx + 46, gy, 200, d.heat, null, L('ISI'), hot > 0.75 ? '#ff3043' : '#ff8c2e');
      // Yedek uçlar
      for (let k = 0; k < 3; k++) this.drawSpareBit(ctx, gx + 104, gy + 8 + k * 56, k < d.bits);
      D.text(ctx, L('UÇ'), gx + 104, gy + 218, { size: 11, align: 'center', weight: 'bold', color: '#9aa3c7' });
      D.text(ctx, Math.round(U.clamp01(d.progress) * 100) + '%', gx + 50, gy + 246, { size: 18, align: 'center', weight: 'bold', color: C.COLORS.gold });
      const cut = this.dpins.filter((q) => q.cut).length;
      D.text(ctx, L('Pim {a}/{b}', { a: cut, b: this.dpins.length }), gx + 50, gy + 266, { size: 12, align: 'center', weight: 'bold', color: '#9aa3c7' });
      D.text(ctx, L(RC.T('Sol tuşu basılı tut: del · Baskıyı yeşil bantta tut', 'Ekrana basılı tut: del · Baskıyı yeşil bantta tut')), w / 2 + 80, py + PANEL_H - 78, { size: 12, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Pimde baskıyı azalt · Mavi pim: kesik kesik del'), w / 2 + 80, py + PANEL_H - 62, { size: 12, align: 'center', color: '#dfe3f5' });
    }

    drawTurn(ctx, w, h, t, px, py) {
      const tu = this.turn;
      const { cx, cy } = this.lockCenter();
      this.drawCylinderFace(ctx, cx, cy, tu.a);
      // Delik ve içindeki tornavida (göbekle birlikte döner)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tu.a);
      U.circle(ctx, 0, SHEAR_Y, 7, '#0d0a06');
      const jig = tu.slip > 0 ? Math.sin(t * 80) * 3 : 0;
      ctx.translate(jig, 0);
      // Uç ve şaft
      ctx.fillStyle = '#c8ccd4';
      ctx.fillRect(-3, SHEAR_Y - 70, 6, 70);
      // Sap
      const hg = ctx.createLinearGradient(-12, 0, 12, 0);
      hg.addColorStop(0, '#b8141f');
      hg.addColorStop(0.5, '#ff4a55');
      hg.addColorStop(1, '#8a0f18');
      ctx.fillStyle = hg;
      U.fillRoundRect(ctx, -12, SHEAR_Y - 150, 24, 84, 10);
      ctx.fillStyle = '#1c1d22';
      U.fillRoundRect(ctx, -13, SHEAR_Y - 110, 26, 30, 6);
      ctx.restore();
      // Açı ölçeği ve hedef
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 120, -Math.PI / 2, -Math.PI / 2 + TURN_GOAL);
      ctx.stroke();
      ctx.strokeStyle = tu.jam && tu.a >= tu.jamAt - 0.01 ? '#ff8c2e' : C.COLORS.gold;
      ctx.beginPath();
      ctx.arc(cx, cy, 120, -Math.PI / 2, -Math.PI / 2 + tu.a);
      ctx.stroke();
      if (tu.jam) {
        const ja = -Math.PI / 2 + tu.jamAt;
        U.circle(ctx, cx + Math.cos(ja) * 120, cy + Math.sin(ja) * 120, 5, tu.a >= tu.jamAt - 0.01 ? '#ff8c2e' : 'rgba(255,140,46,0.25)');
      }
      // Kilit dili (kam dönünce içeri çekilir)
      const k = U.clamp01(tu.a / TURN_GOAL);
      const bx = w / 2 + 40;
      const by = py + 110;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      U.fillRoundRect(ctx, bx - 10, by - 20, 240, 110, 8);
      D.text(ctx, L('KİLİT DİLİ'), bx, by - 4, { size: 10, weight: 'bold', color: '#9aa3c7' });
      ctx.fillStyle = '#6a6f78';
      ctx.fillRect(bx + 150, by + 10, 60, 60); // kasa karşılığı
      const tip = bx + 200 - k * 70; // dilin ucu: 0°'de karşılığın içinde, 90°'de dışarıda
      ctx.fillStyle = '#d4d8de';
      ctx.fillRect(tip - 110, by + 26, 110, 28);
      ctx.fillStyle = '#9aa0aa';
      ctx.fillRect(tip - 10, by + 26, 10, 28);
      D.text(ctx, Math.round(k * 90) + '°', bx + 110, by + 104, { size: 18, align: 'center', weight: 'bold', color: C.COLORS.gold });
      D.text(ctx, L(RC.T('Basılı tutup kilidin çevresinde saat yönünde döndür (ya da D)', 'Parmağını kilidin çevresinde saat yönünde döndür')), w / 2 + 80, py + PANEL_H - 78, { size: 12, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Takılırsa zorlama: biraz geri çevir, sonra ileri'), w / 2 + 80, py + PANEL_H - 62, { size: 12, align: 'center', color: '#dfe3f5' });
    }

    /**
     * Akülü matkap, yandan görünüm. (tx, ty) matkap ucunun ucu; gövde sağa uzanır.
     * Dönen helezon, ısınan uç, basılı tetik, titreşim ve akü göstergesi.
     */
    drawDrillTool(ctx, tx, ty, t, on) {
      const d = this.drill;
      const hot = U.clamp01(d.heat);
      const S = 0.64;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(0.06);
      ctx.scale(S, S);

      // Gölge
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(170, 160, 110, 14, 0, 0, U.TAU);
      ctx.fill();

      // --- Matkap ucu (0..74): kırıldıysa kısa kalır ---
      const bitLen = d.snapT > 0 ? 30 : 74;
      const steel = ctx.createLinearGradient(0, -5, 0, 5);
      steel.addColorStop(0, '#f2f4f8');
      steel.addColorStop(0.5, '#9aa0aa');
      steel.addColorStop(1, '#5a606a');
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.moveTo(74, -5);
      ctx.lineTo(10, -5);
      ctx.lineTo(0, 0);
      ctx.lineTo(10, 5);
      ctx.lineTo(74, 5);
      ctx.closePath();
      if (d.snapT > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(74 - bitLen, -8, bitLen, 16);
        ctx.clip();
        ctx.fillStyle = steel;
        ctx.fillRect(74 - bitLen, -5, bitLen, 10);
        ctx.restore();
      } else {
        ctx.fill();
        // Helezon kanalları (dönüşle kayar)
        ctx.save();
        ctx.beginPath();
        ctx.rect(4, -5, 70, 10);
        ctx.clip();
        ctx.strokeStyle = 'rgba(40,44,52,0.75)';
        ctx.lineWidth = 2;
        const off = (d.spin * 9) % 12;
        for (let x = -12 + off; x < 80; x += 12) U.line(ctx, x, 6, x + 7, -6);
        ctx.restore();
        // Isınan uç (maviden kırmızıya tav rengi)
        if (hot > 0.05) {
          const hg = ctx.createLinearGradient(0, 0, 40, 0);
          hg.addColorStop(0, `rgba(255,${Math.round(120 - hot * 90)},40,${0.25 + hot * 0.65})`);
          hg.addColorStop(1, 'rgba(255,120,40,0)');
          ctx.fillStyle = hg;
          ctx.fillRect(0, -6, 40, 12);
        }
      }

      // --- Mandren (74..112): tırtıllı gövde ---
      const chuck = ctx.createLinearGradient(0, -16, 0, 16);
      chuck.addColorStop(0, '#3a3d44');
      chuck.addColorStop(0.35, '#6a6e78');
      chuck.addColorStop(1, '#1a1c20');
      ctx.fillStyle = chuck;
      ctx.beginPath();
      ctx.moveTo(74, -9);
      ctx.lineTo(84, -15);
      ctx.lineTo(112, -17);
      ctx.lineTo(112, 17);
      ctx.lineTo(84, 15);
      ctx.lineTo(74, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      const koff = (d.spin * 5) % 5;
      for (let x = 86 + koff; x < 111; x += 5) U.line(ctx, x, -15, x, 15);
      // Tork ayar halkası
      ctx.fillStyle = '#26282e';
      U.fillRoundRect(ctx, 112, -21, 14, 42, 3);
      ctx.fillStyle = '#e6e8ee';
      for (let k = 0; k < 4; k++) ctx.fillRect(117, -16 + k * 10, 4, 2);

      // --- Motor gövdesi (126..262): kırmızı kasa, siyah kauçuk kaplama ---
      const body = ctx.createLinearGradient(0, -30, 0, 30);
      body.addColorStop(0, '#ff5a5f');
      body.addColorStop(0.3, '#d8232f');
      body.addColorStop(1, '#7a0f18');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(126, -24);
      ctx.quadraticCurveTo(140, -32, 170, -32);
      ctx.lineTo(236, -32);
      ctx.quadraticCurveTo(264, -32, 264, -6);
      ctx.quadraticCurveTo(264, 24, 238, 26);
      ctx.lineTo(140, 26);
      ctx.quadraticCurveTo(126, 24, 126, 12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Parlama
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      U.fillRoundRect(ctx, 150, -28, 84, 5, 2);
      // Kauçuk yan panel
      ctx.fillStyle = '#1c1d22';
      U.fillRoundRect(ctx, 146, -8, 70, 22, 8);
      // Havalandırma yarıkları (motor dönerken içte kıvılcım parıltısı)
      for (let k = 0; k < 5; k++) {
        const vx = 224 + k * 7;
        ctx.fillStyle = '#16171b';
        U.fillRoundRect(ctx, vx, -20, 3, 22, 1.5);
        if (on && Math.random() < 0.35) {
          ctx.fillStyle = 'rgba(120,180,255,0.7)';
          ctx.fillRect(vx, -12 + Math.random() * 8, 3, 2);
        }
      }
      // İleri/geri anahtarı
      ctx.fillStyle = '#2a2c32';
      U.fillRoundRect(ctx, 186, 22, 14, 8, 2);

      // --- Tabanca kabzası ---
      ctx.fillStyle = '#1c1d22';
      ctx.beginPath();
      ctx.moveTo(196, 24);
      ctx.lineTo(240, 24);
      ctx.lineTo(234, 124);
      ctx.lineTo(196, 124);
      ctx.quadraticCurveTo(186, 70, 196, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let y = 44; y < 118; y += 8) U.line(ctx, 200, y, 230, y - 3);
      // Tetik (basılıyken içeri girer)
      const tr = on ? 5 : 0;
      ctx.fillStyle = '#d8232f';
      ctx.beginPath();
      ctx.moveTo(186 + tr, 34);
      ctx.quadraticCurveTo(176 + tr, 46, 184 + tr, 62);
      ctx.lineTo(194, 60);
      ctx.lineTo(194, 34);
      ctx.closePath();
      ctx.fill();

      // --- Akü ---
      const bat = ctx.createLinearGradient(0, 120, 0, 156);
      bat.addColorStop(0, '#2a2c32');
      bat.addColorStop(1, '#0e0f12');
      ctx.fillStyle = bat;
      U.fillRoundRect(ctx, 172, 120, 92, 36, 6);
      ctx.fillStyle = '#d8232f';
      ctx.fillRect(172, 128, 92, 4);
      // Şarj ledleri: ısı arttıkça akü "zorlanır"
      for (let k = 0; k < 4; k++) {
        const lit = k < 4 - Math.floor(hot * 3);
        U.circle(ctx, 232 + k * 7, 144, 2.2, lit ? (on ? '#3ddc84' : '#2a8a54') : '#3a3d44');
      }

      // Motor ısısı: gövdeden duman
      if (hot > 0.7 && Math.random() < 0.5) {
        ctx.fillStyle = `rgba(200,200,210,${(hot - 0.7) * 0.9})`;
        U.circle(ctx, U.rand(150, 250), -40 - Math.random() * 30, U.rand(6, 14), ctx.fillStyle);
      }
      ctx.restore();
    }

    /** Göstergede yedek matkap ucu simgesi */
    drawSpareBit(ctx, x, y, ok) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = ok ? 1 : 0.2;
      ctx.fillStyle = '#9aa0aa';
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(4, 0);
      ctx.lineTo(4, 40);
      ctx.lineTo(-4, 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,32,38,0.8)';
      ctx.lineWidth = 1.5;
      for (let k = 2; k < 36; k += 6) U.line(ctx, -4, k + 4, 4, k);
      ctx.fillStyle = '#3a3d44';
      ctx.fillRect(-5, 34, 10, 10);
      ctx.restore();
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
      D.text(ctx, `${this.pins.filter((p) => p.set).length}/${n}`, px + PANEL_W - 20, py + 38, { size: 16, align: 'right', color: '#9aa3c7', weight: 'bold' });
      D.text(ctx, L(RC.T('Sol tuşla pimin altında yukarı sürükle: yeşil çizgide oturur', 'Parmağınla pimin altından yukarı sürükle: yeşil çizgide oturur')), w / 2, top + 266, { size: 13, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Fazla kaldırırsan pim düşer ve ses çıkar'), w / 2, top + 284, { size: 12, align: 'center', color: '#9aa3c7' });
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
      // Dokunmatik / fare: ekrandaki ok düğmeleri
      let padHit = -1;
      if (I.mouse.pressed && this.padRects) {
        const r = this.padRects.find((b) => I.hover(b.x, b.y, b.w, b.h));
        if (r) {
          padHit = r.a;
          I.mouse.pressed = false;
        }
      }
      for (let a = 0; a < 4; a++) {
        if (a === padHit || ARROWS[a].code.some((c) => I.wasPressed(c))) {
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
        D.text(ctx, L(RC.T('Diziyi yön tuşlarıyla (W A S D / oklar) gir', 'Diziyi aşağıdaki oklara dokunarak gir')), w / 2, py + 230, { size: 16, font: mono, align: 'center', color: '#9fffc4' });
        D.bar(ctx, px + 60, py + 256, pw - 120, 8, this.timeLeft / (5 + n * 0.6), { from: '#ff3043', to: '#3ddc84' });
        this.drawPad(ctx, w / 2, py + 272);
      } else {
        D.text(ctx, this.result === 'win' ? L('ERİŞİM SAĞLANDI') : L('ERİŞİM REDDEDİLDİ'), w / 2, py + 240, { size: 26, font: mono, align: 'center', color: this.result === 'win' ? '#3ddc84' : '#ff3043' });
      }
      D.text(ctx, L(RC.T('3 hatada alarm çalar · ESC: vazgeç', '3 hatada alarm çalar · X: vazgeç')), w / 2, py + ph - 24, { size: 13, font: mono, align: 'center', color: '#ff8c2e' });
      if (this.flash > 0) {
        ctx.strokeStyle = `rgba(61,220,132,${this.flash})`;
        ctx.lineWidth = 6;
        U.strokeRoundRect(ctx, px + 4, py + 4, pw - 8, ph - 8, 12);
      }
    }

    /** Dokunmatikte dört ok düğmesi (klavyede gizli) */
    drawPad(ctx, cx, y) {
      if (!RC.Touch.active) {
        this.padRects = null;
        return;
      }
      const bw = 96;
      const bh = 48;
      const gap = 14;
      const order = [2, 0, 1, 3]; // ◀ ▲ ▼ ▶
      const x0 = cx - (order.length * (bw + gap) - gap) / 2;
      this.padRects = order.map((a, i) => ({ a, x: x0 + i * (bw + gap), y, w: bw, h: bh }));
      for (const r of this.padRects) {
        const on = I.mouse.down && I.hover(r.x, r.y, r.w, r.h);
        ctx.fillStyle = on ? '#1f6a3a' : '#0e2a1a';
        U.fillRoundRect(ctx, r.x, r.y, r.w, r.h, 10);
        ctx.strokeStyle = '#3ddc84';
        ctx.lineWidth = 1.5;
        U.strokeRoundRect(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 10);
        D.text(ctx, ARROWS[r.a].sym, r.x + r.w / 2, r.y + r.h / 2 + 9, { size: 26, align: 'center', color: '#9fffc4' });
      }
    }
  }

  /* =====================================================================
   * KASA: ŞİFRE KADRANI
   *  Gerçek kasa gibi 0-99 arası kadran ve 3 (bankada 4) diskli şifre.
   *  Her disk için kadranı istenen yönde (SAĞA / SOLA) çevir; doğru rakamın
   *  üstünden geçerken tık sesi güçlenir, stetoskop ekranında sivri bir tepe
   *  çıkar ve kadran hafifçe takılır. Doğru rakamda durup YÖN DEĞİŞTİR: disk
   *  oturur. Yanlış yerde dönersen kadran boşa döner ve ses çıkar.
   *  Anahtar önce kilidi açar (bulunması gerekir), şifre kadranı sonra gelir.
   *  Girdi: fareyle/parmakla kadranı tutup çevir, ya da A/D (SHIFT: hızlı).
   * =================================================================== */
  const DIAL_N = 100;

  class SafeGame {
    constructor(scene, safe) {
      this.scene = scene;
      this.safe = safe;
      const skill = RC.Save.upgradeLevel('safecracker');
      const li = scene.levelIndex || 0;
      const bank = scene.cfg.kind === 'bank';
      this.steth = !!scene.stethoscope;
      this.thermal = !!scene.drill; // termik matkap: disk yuvaları görünür ama gürültülü
      const n = bank ? 4 : 3;
      this.wheels = [];
      for (let i = 0; i < n; i++) {
        let v;
        do v = U.randInt(0, DIAL_N - 1);
        while (this.wheels.some((w) => this.dist(w.v, v) < 12) || this.dist(v, 0) < 6);
        this.wheels.push({ v, dir: i % 2 === 0 ? -1 : 1, set: false });
      }
      this.k = 0; // sıradaki disk
      this.tol = 1.4 + skill * 0.3 + (this.steth ? 0.9 : 0);
      this.noiseAmp = U.clamp(0.12 + li * 0.025 - (this.steth ? 0.08 : 0), 0.04, 0.45);
      // Üst bölümlerde sahte tepeler (yanıltıcı temas noktaları)
      this.decoys = [];
      const dn = li >= 8 ? 2 : li >= 5 ? 1 : 0;
      for (let i = 0; i < dn; i++) this.decoys.push(U.randInt(0, DIAL_N - 1));
      this.pos = 0; // kadran okuması (ondalıklı)
      this.dir = 0; // şu anki dönüş yönü
      this.travel = 0; // bu yönde kat edilen yol
      this.turnPt = 0; // yön değiştirmeden önceki uç nokta
      this.rev = 0; // ters yönde birikmiş hareket
      this.grabA = null;
      this.lastTick = 0;
      this.scope = new Array(120).fill(0);
      this.t = 0;
      this.flash = 0;
      this.flashCol = '#3ddc84';
      this.msg = '';
      this.msgT = 0;
      this.result = null;
      this.endT = 0;
      this.handle = 0;
      this.say(L('Anahtar döndü. Şimdi şifre kadranı.'), '#ffd24a');
    }

    say(text, col) {
      this.msg = text;
      this.msgT = 2;
      this.flash = 0.8;
      this.flashCol = col;
    }

    center() {
      return { cx: RC.Game.W / 2 - 130, cy: RC.Game.H / 2 - 4 };
    }

    /** Kadran okumasının hedefe dairesel uzaklığı */
    dist(a, b) {
      const d = Math.abs((((a - b) % DIAL_N) + DIAL_N) % DIAL_N);
      return Math.min(d, DIAL_N - d);
    }

    /** Stetoskop sinyali: doğru rakamda sivri tepe, sahtelerde zayıf tepe */
    signal(pos) {
      const w = this.wheels[this.k];
      if (!w) return 0;
      let s = Math.exp(-Math.pow(this.dist(pos, w.v) / 2.2, 2));
      for (const dv of this.decoys) s = Math.max(s, 0.55 * Math.exp(-Math.pow(this.dist(pos, dv) / 1.8, 2)));
      return s;
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 2);
      this.msgT = Math.max(0, this.msgT - dt);
      if (this.result) {
        this.endT += dt;
        this.handle = Math.min(1, this.handle + dt * 2);
        return this.endT > 1 ? this.result : null;
      }
      if (I.actPressed('back')) return 'cancel';

      // Girdi: kadranı tutup çevir ya da tuşlarla
      const { cx, cy } = this.center();
      const m = I.mouse;
      let dp = 0;
      if (m.down) {
        const a = Math.atan2(m.y - cy, m.x - cx);
        // Merkeze çok yakın parmak açıyı zıplatır: tek karede en fazla 8 rakam
        if (this.grabA != null) dp = U.clamp((-U.angleDiff(this.grabA, a) / U.TAU) * DIAL_N, -8, 8);
        this.grabA = a;
      } else this.grabA = null;
      const kspd = I.act('run') ? 26 : 9;
      if (I.act('right')) dp -= kspd * dt;
      if (I.act('left')) dp += kspd * dt;
      // Temas noktasında kadran hafifçe takılır (elde hissedilir)
      const w = this.wheels[this.k];
      if (w && Math.sign(dp) === w.dir && this.dist(this.pos, w.v) < this.tol) dp *= 0.55;
      if (dp) this.move(dp);

      // Stetoskop ekranı
      const sig = this.signal(this.pos);
      const moving = Math.abs(dp) > 0.001;
      const amp = moving ? sig * (this.steth ? 1 : 0.7) : 0;
      this.scope.push(amp * (0.6 + Math.random() * 0.4) + (Math.random() - 0.5) * this.noiseAmp * (moving ? 1 : 0.3));
      this.scope.shift();
      return null;
    }

    move(dp) {
      const s = Math.sign(dp);
      this.pos += dp;
      // Her rakam geçişinde tık: doğru rakama yaklaştıkça güçlenir
      const cell = Math.floor(this.pos);
      if (cell !== this.lastTick) {
        this.lastTick = cell;
        const sig = this.signal(this.pos);
        const w = this.wheels[this.k];
        const right = w && s === w.dir;
        const loud = 0.12 + (right ? sig : sig * 0.3) * (this.steth ? 0.9 : 0.6);
        RC.Audio.play('safeClick', { vol: loud, pitch: 1.25 - sig * 0.45, minGap: 0.015 });
      }
      if (this.dir === 0) {
        this.dir = s;
        this.travel = Math.abs(dp);
        this.turnPt = this.pos;
        return;
      }
      if (s === this.dir) {
        this.travel += Math.abs(dp) + this.rev;
        this.rev = 0;
        this.turnPt = this.pos;
        return;
      }
      // Ters yön: kısa titremeleri yok say, gerçek dönüşte değerlendir
      this.rev += Math.abs(dp);
      if (this.rev < 1.2) return;
      this.onReverse(this.dir, this.travel, this.turnPt);
      this.dir = s;
      this.travel = this.rev;
      this.rev = 0;
    }

    /** Yön değiştirildi: dönüş noktası sıradaki diskin rakamı mı? */
    onReverse(dir, travel, at) {
      const w = this.wheels[this.k];
      if (!w || dir !== w.dir || travel < 15) return; // sadece konumlanma
      const sc = this.safe;
      if (this.dist(at, w.v) <= this.tol) {
        w.set = true;
        this.k++;
        RC.Audio.play('safeGood', { vol: 0.8 });
        RC.Audio.play('metal', { vol: 0.35, intensity: 0.3, pitch: 0.6 });
        if (this.thermal) {
          RC.Audio.play('metal', { vol: 0.8, intensity: 0.8 });
          this.scene.particles.sparks(sc.x + sc.w / 2, sc.y + sc.h / 2, 16, '#ffb347', 260);
          this.scene.makeNoise(sc.x + sc.w / 2, sc.y + 20, 0.35, 'drill');
        }
        if (this.k >= this.wheels.length) {
          this.result = 'win';
          this.say(L('Şifre tamam! Kolu çeviriyorsun...'), '#3ddc84');
          return;
        }
        this.say(L('{i}. disk oturdu!', { i: this.k }), '#3ddc84');
      } else {
        RC.Audio.play('safeBad', { vol: 0.6 });
        this.scene.makeNoise(sc.x + sc.w / 2, sc.y + 20, this.steth ? 0.12 : 0.22, 'safe');
        this.scene.camera.shake(0.1);
        this.say(L('Kadran boşa döndü. Tık sesinin en güçlü olduğu yerde dön.'), '#ff8c2e');
      }
    }

    draw(ctx, w, h, t) {
      ctx.fillStyle = 'rgba(0,0,0,0.66)';
      ctx.fillRect(0, 0, w, h);
      const pw = PANEL_W;
      const ph = PANEL_H + 20;
      const px = w / 2 - pw / 2;
      const py = h / 2 - ph / 2;
      D.panel(ctx, px, py, pw, ph, { accent: C.COLORS.gold });
      D.text(ctx, L('KASAYI AÇ'), w / 2, py + 38, { size: 26, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold });
      const { cx, cy } = this.center();
      this.drawDial(ctx, cx, cy, t);

      // Sağ taraf: diskler, yön, stetoskop
      const rx = w / 2 + 50;
      let ry = py + 84;
      D.text(ctx, L('DİSKLER'), rx, ry, { size: 11, weight: 'bold', color: '#9aa3c7' });
      this.wheels.forEach((wh, i) => {
        const x = rx + i * 58;
        const cur = i === this.k && !this.result;
        ctx.fillStyle = wh.set ? '#1f6a3a' : cur ? 'rgba(255,210,74,0.18)' : 'rgba(255,255,255,0.06)';
        U.fillRoundRect(ctx, x, ry + 8, 50, 44, 8);
        if (cur) {
          ctx.strokeStyle = C.COLORS.gold;
          ctx.lineWidth = 2;
          U.strokeRoundRect(ctx, x, ry + 8, 50, 44, 8);
        }
        D.text(ctx, wh.set ? String(wh.v).padStart(2, '0') : '??', x + 25, ry + 36, { size: 18, font: C.FONT_MONO, align: 'center', color: wh.set ? '#9fffc4' : '#dfe3f5' });
        D.text(ctx, L(wh.dir < 0 ? 'SAĞ' : 'SOL'), x + 25, ry + 68, { size: 11, align: 'center', weight: 'bold', color: cur ? C.COLORS.gold : '#6a7090' });
      });
      ry += 96;
      const wh = this.wheels[this.k];
      if (wh && !this.result) {
        const txt = wh.dir < 0 ? L('SAĞA çevir (saat yönü)') : L('SOLA çevir (saat yönünün tersi)');
        D.text(ctx, txt, rx, ry, { size: 14, weight: 'bold', color: C.COLORS.gold });
      }
      ry += 16;
      // Stetoskop ekranı
      const sw = 240;
      const sh = 90;
      ctx.fillStyle = '#04120a';
      U.fillRoundRect(ctx, rx, ry, sw, sh, 8);
      ctx.strokeStyle = 'rgba(61,220,132,0.5)';
      ctx.lineWidth = 1;
      U.strokeRoundRect(ctx, rx + 0.5, ry + 0.5, sw - 1, sh - 1, 8);
      ctx.strokeStyle = '#3ddc84';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      this.scope.forEach((v, i) => {
        const x = rx + 4 + (i / (this.scope.length - 1)) * (sw - 8);
        const y = ry + sh - 12 - U.clamp(v, -0.1, 1) * (sh - 24);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.stroke();
      D.text(ctx, L(this.steth ? 'STETOSKOP' : 'KULAK (stetoskop yok)'), rx + 8, ry + 14, { size: 10, weight: 'bold', color: 'rgba(61,220,132,0.7)' });

      const by = py + ph - 64;
      D.text(ctx, L(RC.T('Kadranı fareyle tutup çevir ya da A / D (SHIFT: hızlı)', 'Kadranı parmağınla tutup çevir')), w / 2, by, { size: 12, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Tık en güçlüyken dur ve ters yöne dön: disk oturur'), w / 2, by + 16, { size: 12, align: 'center', color: '#dfe3f5' });
      if (this.msgT > 0) D.text(ctx, this.msg, w / 2, py + 62, { size: 14, align: 'center', weight: 'bold', color: this.flashCol, alpha: Math.min(1, this.msgT * 2) });
      D.text(ctx, L(RC.T('Yanlış dönüş ses çıkarır · ESC: vazgeç', 'Yanlış dönüş ses çıkarır · X: vazgeç')), w / 2, py + ph - 20, { size: 13, align: 'center', color: '#ff8c2e' });
      if (this.flash > 0) {
        ctx.strokeStyle = U.rgba(this.flashCol, this.flash);
        ctx.lineWidth = 6;
        U.strokeRoundRect(ctx, px + 4, py + 4, pw - 8, ph - 8, 12);
      }
    }

    drawDial(ctx, cx, cy, t) {
      const R = 120;
      // Kasa kapağı
      ctx.fillStyle = '#2a2e36';
      U.fillRoundRect(ctx, cx - 150, cy - 150, 300, 300, 16);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      U.strokeRoundRect(ctx, cx - 144, cy - 144, 288, 288, 12);
      // Dış bilezik (sabit)
      const g = ctx.createRadialGradient(cx - 40, cy - 40, 10, cx, cy, R + 20);
      g.addColorStop(0, '#c9ced6');
      g.addColorStop(1, '#4a4f5a');
      U.circle(ctx, cx, cy, R + 14, g);
      // Kadran (döner): rakamlar ve çentikler
      const rot = (-this.pos / DIAL_N) * U.TAU;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      U.circle(ctx, 0, 0, R, '#1a1c22');
      for (let i = 0; i < DIAL_N; i++) {
        const a = (i / DIAL_N) * U.TAU - Math.PI / 2;
        const big = i % 10 === 0;
        const mid = i % 5 === 0;
        ctx.strokeStyle = big ? '#f2f4f8' : '#9aa0aa';
        ctx.lineWidth = big ? 2.4 : 1.2;
        const r1 = big ? R - 18 : mid ? R - 13 : R - 9;
        U.line(ctx, Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * (R - 3), Math.sin(a) * (R - 3));
        if (big) {
          ctx.save();
          ctx.translate(Math.cos(a) * (R - 32), Math.sin(a) * (R - 32));
          ctx.rotate(a + Math.PI / 2);
          D.text(ctx, String(i), 0, 5, { size: 14, align: 'center', weight: 'bold', color: '#f2f4f8' });
          ctx.restore();
        }
      }
      // Termik matkapla delinmiş gözetleme deliği: sıradaki diskin yuvası görünür
      const wh = this.wheels[this.k];
      if (this.thermal && wh && !this.result) {
        const a = (wh.v / DIAL_N) * U.TAU - Math.PI / 2;
        U.circle(ctx, Math.cos(a) * (R - 6), Math.sin(a) * (R - 6), 4, U.rgba('#ffb347', 0.5 + Math.sin(t * 6) * 0.3));
      }
      // Tutamak (kadranın göbeği)
      const kg = ctx.createRadialGradient(-12, -12, 4, 0, 0, 60);
      kg.addColorStop(0, '#8a909c');
      kg.addColorStop(1, '#2a2e36');
      U.circle(ctx, 0, 0, 56, kg);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * U.TAU;
        U.line(ctx, Math.cos(a) * 48, Math.sin(a) * 48, Math.cos(a) * 56, Math.sin(a) * 56);
      }
      ctx.restore();
      // Okuma çizgisi (sabit, üstte)
      ctx.fillStyle = '#ff3043';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - R - 20);
      ctx.lineTo(cx + 8, cy - R - 20);
      ctx.lineTo(cx, cy - R - 4);
      ctx.closePath();
      ctx.fill();
      const read = ((Math.round(this.pos) % DIAL_N) + DIAL_N) % DIAL_N;
      D.text(ctx, String(read).padStart(2, '0'), cx, cy + 8, { size: 22, font: C.FONT_MONO, align: 'center', weight: 'bold', color: '#f2f4f8' });
      // Kol: şifre tamamlanınca döner
      ctx.save();
      ctx.translate(cx + 110, cy + 110);
      ctx.rotate(this.handle * Math.PI * 0.5);
      ctx.fillStyle = '#9aa0aa';
      U.fillRoundRect(ctx, -6, -34, 12, 68, 6);
      U.circle(ctx, 0, 0, 12, '#6a6f78');
      ctx.restore();
    }
  }

  RC.Minigames = { LockpickGame, HackGame, SafeGame };
})(window.RC);
