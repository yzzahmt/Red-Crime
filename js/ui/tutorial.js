/* =========================================================================
 *  RED CRIME - Oyun içi öğretici
 *  Oyun ilk kez oynandığında 1. bölümde adım adım kontrolleri öğretir.
 *  Her adım, oyuncu o hareketi gerçekten yapınca tamamlanır.
 *  Dış mekân adımları sürerken süre işlemez.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;

  const STEPS = [
    { keys: ['A', 'D'], text: 'Sola ve sağa yürü.', done: (s) => s.moved > 220 },
    { keys: ['SHIFT'], text: 'SHIFT basılı tutarak koş. Koşmak hızlıdır ama ÇOK gürültü yapar!', done: (s) => s.runT > 0.8 },
    { keys: ['W'], text: 'Zıpla. Rafların ve mobilyaların üstüne böyle çıkarsın.', done: (s) => s.jumps > 0 },
    { keys: ['S'], text: 'Çömelerek yürü. Çömelirken neredeyse hiç ses çıkarmazsın.', done: (s) => s.crouchT > 0.7 },
    { keys: ['F'], text: 'El fenerini kapat, sonra tekrar aç.', done: (s) => s.flashToggles >= 2 },
    { keys: ['SPACE'], text: 'Eve gir ve bir eşyanın yanında SPACE ile al. Küçük eşyalar çuvala girer.', done: (s) => s.pickups > 0, indoor: true },
    { keys: ['SPACE'], text: 'Ganimeti kamyonun arkasına götür ve SPACE ile yükle. Sadece kamyondakiler sayılır.', done: (s) => s.loaded > 0, indoor: true },
    { keys: ['E'], text: "Kapalı bir kapının önünde E'ye basarak aç. Kilitliyse maymuncukla açarsın.", done: (s) => s.doors > 0, indoor: true },
    { keys: ['S'], text: 'Saklan: perde ya da dolap önünde hareketsiz dur, kanepe ya da yatak arkasında çömel.', done: (s) => s.hides > 0, indoor: true },
  ];

  class Tutorial {
    constructor(scene) {
      this.scene = scene;
      this.step = 0;
      this.t = 0;
      this.doneT = 0; // tamamlandı animasyonu
      this.finished = false;
      this.finalT = 0;
      this.stats = { moved: 0, runT: 0, jumps: 0, crouchT: 0, flashToggles: 0, pickups: 0, loaded: 0, hides: 0, doors: 0 };
      this.lastX = scene.player.cx;
      this.lastFlash = scene.player.flashOn;
      this.wasGround = true;
    }

    /** Süre işlesin mi? */
    get timerPaused() {
      return !this.finished && this.step < 5;
    }
    get active() {
      return !this.finished || this.finalT < 6;
    }

    update(dt) {
      const s = this.stats;
      const p = this.scene.player;
      this.t += dt;
      s.moved += Math.abs(p.cx - this.lastX);
      this.lastX = p.cx;
      if (p.running && Math.abs(p.vx) > 180) s.runT += dt;
      if (p.crouch && Math.abs(p.vx) > 30) s.crouchT += dt;
      if (this.wasGround && !p.onGround && p.vy < -200) s.jumps++;
      this.wasGround = p.onGround;
      if (p.flashOn !== this.lastFlash) {
        s.flashToggles++;
        this.lastFlash = p.flashOn;
      }
      s.loaded = this.scene.loadedValue;

      if (I.wasPressed('Enter') && !this.finished) {
        this.skip();
        return;
      }
      if (this.finished) {
        this.finalT += dt;
        return;
      }
      if (this.doneT > 0) {
        this.doneT -= dt;
        if (this.doneT <= 0) {
          this.step++;
          this.t = 0;
          if (this.step >= STEPS.length) this.finish();
        }
        return;
      }
      if (STEPS[this.step].done(s)) {
        this.doneT = 0.8;
        RC.Audio.play('safeGood', { vol: 0.6 });
      }
    }

    skip() {
      this.finish();
      this.finalT = 6;
      RC.Audio.play('uiBack');
    }

    finish() {
      this.finished = true;
      this.finalT = 0;
      RC.Save.progress.tutorialDone = true;
      RC.Save.save();
      RC.Audio.play('star');
    }

    render(ctx, w) {
      if (!this.active) return;
      const pw = Math.min(620, w - 40);
      const px = w / 2 - pw / 2;
      const py = 96;
      if (this.finished) {
        const a = Math.min(1, this.finalT * 3, (6 - this.finalT) / 0.5);
        if (a <= 0) return;
        ctx.globalAlpha = U.clamp01(a);
        D.panel(ctx, px, py, pw, 84, { accent: '#3ddc84' });
        D.text(ctx, 'HAZIRSIN!', w / 2, py + 32, { size: 20, font: C.FONT_TITLE, align: 'center', color: '#3ddc84' });
        D.text(ctx, 'Emekli Öğretmen üst kattaki yatak odasında uyuyor. Kasa anahtarını bul,', w / 2, py + 54, { size: 14, align: 'center', color: '#dfe3f5' });
        D.text(ctx, 'ganimeti kamyona yükle ve süre bitmeden E ile kaç.', w / 2, py + 72, { size: 14, align: 'center', color: '#dfe3f5' });
        ctx.globalAlpha = 1;
        return;
      }
      const st = STEPS[this.step];
      const appear = U.ease.outBack(U.clamp01(this.t / 0.35));
      ctx.save();
      ctx.translate(0, (1 - appear) * -30);
      ctx.globalAlpha = U.clamp01(this.t / 0.2);
      const ph = 92;
      D.panel(ctx, px, py, pw, ph, { accent: this.doneT > 0 ? '#3ddc84' : '#4aa8ff' });
      D.text(ctx, RC.L('ÖĞRETİCİ {a}/{b}', { a: this.step + 1, b: STEPS.length }), px + 16, py + 24, { size: 12, weight: 'bold', color: '#8fb7ff' });
      D.text(ctx, 'ENTER: öğreticiyi atla', px + pw - 16, py + 24, { size: 12, align: 'right', color: '#5a6284' });
      // Tuşlar
      let kx = px + 16;
      st.keys.forEach((k, i) => {
        if (i > 0) {
          D.text(ctx, '/', kx + 2, py + 60, { size: 16, color: '#9aa3c7' });
          kx += 14;
        }
        kx += D.key(ctx, k, kx, py + 38, 34, { pressed: Math.sin(this.t * 5) > 0.6 }) + 6;
      });
      ctx.font = `bold 15px ${C.FONT_UI}`;
      const lines = U.wrapText(ctx, RC.L(st.text), pw - (kx - px) - 30);
      lines.slice(0, 2).forEach((ln, i) => D.text(ctx, ln, kx + 10, py + 52 + i * 19 - (lines.length > 1 ? 9 : 0), { size: 15, weight: 'bold', color: '#f2f4ff' }));
      // İlerleme noktaları
      for (let i = 0; i < STEPS.length; i++) {
        U.circle(ctx, px + pw / 2 - (STEPS.length - 1) * 7 + i * 14, py + ph - 8, 3.5, i < this.step || (i === this.step && this.doneT > 0) ? '#3ddc84' : 'rgba(255,255,255,0.2)');
      }
      if (this.doneT > 0) {
        const k = 1 - this.doneT / 0.8;
        D.icon(ctx, 'check', px + pw - 36, py + 56, 26 + Math.sin(k * Math.PI) * 8, '#3ddc84');
      }
      if (st.indoor === undefined && this.step === 4) {
        // Fener adımı
      }
      ctx.restore();
    }
  }

  Tutorial.STEPS = STEPS;
  RC.Tutorial = Tutorial;
})(window.RC);
