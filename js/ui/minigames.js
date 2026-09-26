/* =========================================================================
 *  RED CRIME - Mini oyunlar
 *  - Kilit açma (maymuncuk): yaylı pimler inip çıkar; pim kesme çizgisine
 *    geldiğinde SPACE ile sabitlenir. Hata pimi düşürür ve tıkırtı yapar.
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
   * KİLİT AÇMA
   * =================================================================== */
  class LockpickGame {
    constructor(scene, door) {
      this.scene = scene;
      this.door = door;
      const lvl = door.lockLevel || 1;
      const skill = RC.Save.upgradeLevel('safecracker');
      this.pins = [];
      const n = Math.min(7, 3 + lvl);
      for (let i = 0; i < n; i++) {
        this.pins.push({ phase: U.rand(0, U.TAU), speed: U.rand(2.2, 3.4) + lvl * 0.35, set: false, pos: 0, shake: 0 });
      }
      this.cur = 0;
      this.zone = 0.8 - skill * 0.05; // üst eşik
      this.t = 0;
      this.flash = 0;
      this.flashCol = '#3ddc84';
      this.result = null;
      this.endT = 0;
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 2.5);
      for (const [i, p] of this.pins.entries()) {
        if (p.set) {
          p.pos = U.damp(p.pos, 1, 14, dt);
        } else if (i === this.cur) {
          p.pos = (Math.sin(this.t * p.speed + p.phase) + 1) / 2;
        } else {
          p.pos = U.damp(p.pos, 0.05, 8, dt);
        }
        p.shake = Math.max(0, p.shake - dt * 3);
      }
      if (this.result) {
        this.endT += dt;
        return this.endT > 0.5 ? this.result : null;
      }
      if (I.actPressed('back')) return 'cancel';
      if (I.actPressed('grab') || I.mouse.pressed) {
        const p = this.pins[this.cur];
        if (p.pos >= this.zone) {
          p.set = true;
          this.cur++;
          this.flash = 1;
          this.flashCol = '#3ddc84';
          RC.Audio.play('safeClick', { vol: 1, pitch: 0.8 + this.cur * 0.08 });
          if (this.cur >= this.pins.length) {
            this.result = 'win';
            RC.Audio.play('safeGood', { vol: 0.9 });
          }
        } else {
          this.flash = 1;
          this.flashCol = '#ff3043';
          p.shake = 1;
          RC.Audio.play('metal', { vol: 0.5, intensity: 0.3 });
          const d = this.door;
          this.scene.makeNoise(d.x, d.y - 90, 0.2, 'lock');
          if (this.cur > 0) {
            this.cur--;
            this.pins[this.cur].set = false;
          }
        }
      }
      return null;
    }

    draw(ctx, w, h, t) {
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(0, 0, w, h);
      const pw = 520;
      const ph = 380;
      const px = w / 2 - pw / 2;
      const py = h / 2 - ph / 2;
      D.panel(ctx, px, py, pw, ph, { accent: C.COLORS.gold });
      D.text(ctx, L('KİLİDİ AÇ'), w / 2, py + 40, { size: 26, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold });
      // Silindir
      const n = this.pins.length;
      const cw = 52;
      const total = n * cw;
      const cx0 = w / 2 - total / 2;
      const top = py + 80;
      const lineY = top + 62;
      ctx.fillStyle = '#b8903a';
      U.fillRoundRect(ctx, cx0 - 24, top, total + 48, 190, 12);
      ctx.fillStyle = '#8a6a2a';
      U.fillRoundRect(ctx, cx0 - 10, lineY + 4, total + 20, 110, 10);
      // Kesme çizgisi
      ctx.strokeStyle = '#3ddc84';
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      U.line(ctx, cx0 - 20, lineY, cx0 + total + 20, lineY);
      ctx.setLineDash([]);
      for (let i = 0; i < n; i++) {
        const p = this.pins[i];
        const x = cx0 + i * cw + cw / 2 + (p.shake > 0 ? Math.sin(t * 60) * 3 * p.shake : 0);
        // Yay yuvası
        ctx.fillStyle = '#2a1e10';
        ctx.fillRect(x - 11, top + 10, 22, 170);
        const pinTop = top + 150 - p.pos * 96;
        // Yay
        ctx.strokeStyle = '#c0c4cc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let y = top + 12; y < pinTop - 36; y += 6) {
          ctx.moveTo(x - 8, y);
          ctx.lineTo(x + 8, y + 3);
        }
        ctx.stroke();
        // Üst pim ve alt pim
        U.fillRoundRect(ctx, x - 9, pinTop - 36, 18, 34, 4, p.set ? '#3ddc84' : '#d9dde4');
        U.fillRoundRect(ctx, x - 9, pinTop, 18, 44, 4, i === this.cur ? '#ffc83d' : '#9aa0aa');
        if (i === this.cur && !this.result) {
          ctx.strokeStyle = 'rgba(255,200,61,0.8)';
          ctx.lineWidth = 2;
          U.strokeRoundRect(ctx, x - 13, top + 6, 26, 178, 6);
        }
      }
      // Maymuncuk
      const lp = cx0 + Math.min(this.cur, n - 1) * cw + cw / 2;
      ctx.strokeStyle = '#d9dde4';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + 20, top + 230);
      ctx.lineTo(lp, top + 230);
      ctx.lineTo(lp + 6, top + 196);
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (this.flash > 0) {
        ctx.strokeStyle = U.rgba(this.flashCol, this.flash);
        ctx.lineWidth = 6;
        U.strokeRoundRect(ctx, px + 4, py + 4, pw - 8, ph - 8, 12);
      }
      D.text(ctx, L('Sarı pim yeşil çizgiye değdiğinde SPACE bas'), w / 2, py + ph - 44, { size: 15, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('Hatalı deneme tıkırtı yapar · ESC: vazgeç'), w / 2, py + ph - 22, { size: 13, align: 'center', color: '#ff8c2e' });
      D.text(ctx, `${this.pins.filter((p) => p.set).length}/${n}`, px + pw - 20, py + 40, { size: 16, align: 'right', color: '#9aa3c7', weight: 'bold' });
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
