/* =========================================================================
 *  RED CRIME - Kamyon yolculuğu ve ışınlanma geçişi
 *  Paralaks şehir, sokak lambaları, yol çizgileri; ardından kamyon enerji
 *  halkalarıyla parlar, hız çizgileri, beyaz flaş → evin önüne ışınlanma.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;

  RC.Scenes.truckride = {
    enter(params) {
      this.level = params.level || 0;
      this.plan = params.plan || null;
      this.pworld = params.world || null;
      this.cfg = C.LEVELS[this.level];
      this.t = 0;
      this.dist = 0;
      this.speed = 0;
      this.flash = 0;
      this.done = false;
      this.particles = new RC.Particles(600);
      this.far = new RC.BG.Skyline({ seed: 41 + this.level, color: '#0c0f26', minH: 160, maxH: 380, width: 2000, windowChance: 0.22 });
      this.mid = new RC.BG.Skyline({ seed: 51 + this.level, color: '#141836', minH: 80, maxH: 220, width: 1700, windowChance: 0.35 });
      this.rain = new RC.BG.Rain(260);
      this.rain.wind = 600;
      RC.Audio.engineLoop();
      RC.Audio.setLoop('engine', { rpm: 0.5, vol: 1 });
      RC.Audio.playMusic('heist');
      this.teleSnd = false;
    },
    exit() {
      RC.Audio.stopLoop('engine');
    },
    update(dt) {
      const t = (this.t += dt);
      this.speed = U.damp(this.speed, t < 4.2 ? 900 : 2400, 2, dt);
      this.dist += this.speed * dt;
      RC.Audio.setLoop('engine', { rpm: U.clamp(this.speed / 2400, 0.3, 1), vol: 1 });
      this.rain.update(dt, RC.Game.W, RC.Game.H);
      this.particles.update(dt);
      const w = RC.Game.W;
      const h = RC.Game.H;
      const tx = w * 0.42;
      const ty = h * 0.78;
      if (Math.random() < dt * 8) {
        this.particles.smoke(tx + 330, ty - 28, 1, '#555', 8);
        const last = this.particles.list[this.particles.list.length - 1];
        if (last) last.vx = 260;
      }
      if (t > 4.2 && !this.teleSnd) {
        this.teleSnd = true;
        RC.Audio.play('teleport');
      }
      if (t > 4.2) {
        // Enerji halkaları
        if (Math.random() < dt * 8) this.particles.ring(tx + 170, ty - 80, 260, '#8fd6ff', 0.6, 4);
        if (Math.random() < dt * 40) this.particles.sparks(tx + U.rand(0, 340), ty - U.rand(0, 150), 2, '#bfe8ff', 300);
      }
      if (t > 5.6 && this.flash === 0) {
        this.flash = 1;
        RC.Audio.play('flash');
      }
      if ((t > 6 || (t > 0.8 && I.actPressed('skip'))) && !this.done) {
        this.done = true;
        RC.Game.fade.speed = t > 6 ? 6 : 3;
        RC.Game.go('heist', { level: this.level, plan: this.plan, world: this.pworld });
        setTimeout(() => (RC.Game.fade.speed = 3), 800);
      }
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const d = this.dist;
      RC.BG.sky(ctx, w, h, t, { moonX: w * 0.8, moonY: h * 0.18, parallaxX: -d * 2 });
      RC.BG.clouds(ctx, w, h, t, { parallaxX: -d * 5, color: 'rgba(30,36,70,0.55)' });
      this.far.render(ctx, -d * 0.15, h * 0.72, w, t);
      this.mid.render(ctx, -d * 0.4, h * 0.8, w, t);
      // Yol
      const roadY = h * 0.78;
      ctx.fillStyle = '#1c1e26';
      ctx.fillRect(0, roadY, w, h - roadY);
      ctx.fillStyle = '#2a2d38';
      ctx.fillRect(0, roadY, w, 8);
      ctx.fillStyle = '#e8e0b0';
      const off = d % 160;
      for (let x = off - 160; x < w; x += 160) ctx.fillRect(x, roadY + 40, 80, 5);
      // Sokak lambaları
      const loff = d % 520;
      for (let x = loff - 520; x < w + 520; x += 520) RC.BG.streetLamp(ctx, x, roadY, 240, true, t, -1);

      // Hız çizgileri
      if (t > 4.2) {
        const k = U.clamp01((t - 4.2) / 1.2);
        ctx.strokeStyle = `rgba(190,230,255,${0.5 * k})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 40; i++) {
          const y = (i * 53 + t * 900) % h;
          const x = ((i * 197 + d * 3) % (w + 400) + w + 400) % (w + 400) - 200;
          U.line(ctx, x, y, x + 180 * k, y);
        }
      }

      // Kamyon
      const tx = w * 0.42;
      const glow = t > 4.2 ? U.clamp01((t - 4.2) / 1.4) : 0;
      RC.drawTruck(ctx, tx + Math.sin(t * 2) * 6, roadY, {
        color: this.cfg.truckColor,
        t,
        headlights: true,
        wheelRot: -d / 20,
        shake: 1,
        glow,
      });
      this.rain.render(ctx, 0.25);
      this.particles.render(ctx, null);

      // Başlık kartı
      if (t > 0.6 && t < 4.4) {
        const a = Math.min(1, (t - 0.6) / 0.4, (4.4 - t) / 0.4);
        const sl = (1 - U.ease.outCubic(Math.min(1, (t - 0.6) / 0.5))) * -80;
        ctx.globalAlpha = a;
        D.panel(ctx, 40 + sl, 60, 520, 120, { accent: C.COLORS.red });
        D.text(ctx, 'HEDEF', 64 + sl, 94, { size: 14, color: C.COLORS.red, weight: 'bold' });
        D.text(ctx, RC.L(this.cfg.name).toLocaleUpperCase(RC.I18N.lang === 'en' ? 'en-US' : 'tr-TR'), 64 + sl, 128, { size: 24, font: C.FONT_TITLE, color: '#fff' });
        D.text(ctx, RC.L('{s} · Hedef {v}', { s: RC.L(this.cfg.short), v: U.formatShortMoney(this.cfg.target) }), 64 + sl, 158, { size: 15, color: '#9aa3c7' });
        ctx.globalAlpha = 1;
      }
      if (t > 4.2 && t < 5.8) {
        D.text(ctx, 'IŞINLANIYOR...', w / 2, h * 0.3, { size: 42, font: C.FONT_TITLE, align: 'center', color: '#bfe8ff', stroke: '#0a1a33', strokeW: 6, alpha: 0.6 + Math.sin(t * 20) * 0.4 });
      }
      // Beyaz flaş
      if (t > 5.2) {
        const k = U.clamp01((t - 5.2) / 0.5);
        ctx.fillStyle = `rgba(230,245,255,${k})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, 44);
      ctx.fillRect(0, h - 44, w, 44);
      D.text(ctx, 'SPACE: geç', w - 20, h - 16, { size: 13, align: 'right', color: '#5a6284' });
    },
  };
})(window.RC);
