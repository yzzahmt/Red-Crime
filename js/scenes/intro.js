/* =========================================================================
 *  RED CRIME - Açılış
 *  0) Dil seçimi (yalnızca ilk açılışta): Türkçe / English
 *  1) Splash: "Başlamak için tıkla" (tarayıcı sesi açmak için etkileşim ister)
 *  2) Sinematik açılış: yağmurlu şehir, şimşek, çatıda koşan Red Crime,
 *     polis projektörü, harf harf düşen RED CRIME logosu, glitch efektleri.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;

  RC.Scenes = RC.Scenes || {};

  /* =====================================================================
   * Uygulama simgesi (assets/logo.png): açılış ve dil ekranında
   * =================================================================== */
  const APP_ICON = typeof Image !== 'undefined' ? new Image() : null;
  if (APP_ICON) APP_ICON.src = 'assets/logo.png';
  RC.drawAppIcon = function (ctx, cx, cy, size, alpha = 1) {
    const x = cx - size / 2;
    const y = cy - size / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Gölge + parıltı
    ctx.shadowColor = 'rgba(232,40,60,0.45)';
    ctx.shadowBlur = size * 0.12;
    ctx.fillStyle = '#12060a';
    U.fillRoundRect(ctx, x, y, size, size, size * 0.14);
    ctx.shadowBlur = 0;
    if (APP_ICON && APP_ICON.complete && APP_ICON.naturalWidth) {
      ctx.beginPath();
      U.roundRect(ctx, x, y, size, size, size * 0.14);
      ctx.clip();
      ctx.drawImage(APP_ICON, x, y, size, size);
    } else {
      D.text(ctx, 'RC', cx, cy + size * 0.12, { size: size * 0.4, font: C.FONT_TITLE, align: 'center', color: C.COLORS.red });
    }
    ctx.restore();
  };

  /* =====================================================================
   * DİL SEÇİMİ (ilk açılış)
   * =================================================================== */
  const LANGS = [
    { id: 'tr', label: 'TÜRKÇE', sub: 'Türkçe' },
    { id: 'en', label: 'ENGLISH', sub: 'English' },
  ];

  function drawFlag(ctx, id, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (id === 'tr') {
      ctx.fillStyle = '#e30a17';
      ctx.fillRect(x, y, w, h);
      const cx = x + w * 0.36;
      const cy = y + h / 2;
      U.circle(ctx, cx, cy, h * 0.25, '#ffffff');
      U.circle(ctx, cx + h * 0.0625, cy, h * 0.2, '#e30a17');
      // Yıldız
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const sx = cx + h * 0.29;
      const r1 = h * 0.125;
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? r1 * 0.4 : r1;
        const a = Math.PI + (k * Math.PI) / 5;
        ctx.lineTo(sx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Birleşik Krallık (sadeleştirilmiş)
      ctx.fillStyle = '#012169';
      ctx.fillRect(x, y, w, h);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = h * 0.2;
      U.line(ctx, x, y, x + w, y + h);
      U.line(ctx, x + w, y, x, y + h);
      ctx.strokeStyle = '#c8102e';
      ctx.lineWidth = h * 0.07;
      U.line(ctx, x, y, x + w, y + h);
      U.line(ctx, x + w, y, x, y + h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h);
      ctx.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
      ctx.fillStyle = '#c8102e';
      ctx.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h);
      ctx.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  RC.Scenes.language = {
    enter() {
      this.t = 0;
      this.sel = RC.I18N.lang === 'en' ? 1 : 0;
      this.done = false;
      // Tarayıcı dili İngilizce ise varsayılan seçim English
      try {
        if (!RC.Save.settings.langChosen && navigator.language && !/^tr/i.test(navigator.language)) this.sel = 1;
      } catch (e) {
        /* yok */
      }
    },
    cards() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const cw = 260;
      const ch = 150;
      const gap = 40;
      const y = h * 0.62 - ch / 2;
      return LANGS.map((l, i) => ({ ...l, x: w / 2 - cw - gap / 2 + i * (cw + gap), y, w: cw, h: ch }));
    },
    choose(i) {
      if (this.done) return;
      this.done = true;
      const lang = LANGS[i].id;
      RC.Audio.unlock();
      RC.setLang(lang);
      RC.Save.setSetting('langChosen', true);
      document.title = 'Red Crime';
      const sub = document.querySelector('#loader .sub');
      if (sub) sub.textContent = RC.L('Yükleniyor...');
      RC.Audio.play('uiSelect');
      RC.Game.go('splash');
    },
    update(dt) {
      this.t += dt;
      const cards = this.cards();
      if (I.actPressed('menuLeft')) this.sel = 0;
      if (I.actPressed('menuRight')) this.sel = 1;
      cards.forEach((c, i) => {
        if (I.hover(c.x, c.y, c.w, c.h)) {
          if (I.mouseRecentlyUsed(1)) this.sel = i;
          if (I.mouse.pressed) this.choose(i);
        }
      });
      if (this.t > 0.3 && (I.actPressed('confirm') || I.wasPressed('Space'))) this.choose(this.sel);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const g = ctx.createRadialGradient(w / 2, h * 0.35, 20, w / 2, h * 0.4, Math.max(w, h) * 0.75);
      g.addColorStop(0, '#2a0a12');
      g.addColorStop(1, '#05060f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const k = U.ease.outBack(U.clamp01(t / 0.6));
      RC.drawAppIcon(ctx, w / 2, h * 0.27, Math.min(200, h * 0.3) * k, U.clamp01(t * 3));
      // Her iki dilde başlık (seçim yapılmadan önce)
      D.text(ctx, 'DİL SEÇİN  ·  CHOOSE LANGUAGE', w / 2, h * 0.46, { size: 22, font: C.FONT_TITLE, align: 'center', color: '#f2f4ff' });
      this.cards().forEach((c, i) => {
        const on = i === this.sel;
        const lift = on ? -4 + Math.sin(t * 4) * 1.5 : 0;
        D.panel(ctx, c.x, c.y + lift, c.w, c.h, { accent: on ? C.COLORS.red : '#3a3f58' });
        drawFlag(ctx, c.id, c.x + c.w / 2 - 45, c.y + lift + 22, 90, 60);
        D.text(ctx, c.label, c.x + c.w / 2, c.y + lift + 118, { size: 24, font: C.FONT_TITLE, align: 'center', color: on ? '#fff' : '#9aa3c7' });
        if (on) {
          ctx.strokeStyle = U.rgba(C.COLORS.red, 0.6 + Math.sin(t * 5) * 0.3);
          ctx.lineWidth = 3;
          U.strokeRoundRect(ctx, c.x - 4, c.y + lift - 4, c.w + 8, c.h + 8, 14);
        }
      });
      if (!RC.Touch.active) D.text(ctx, '←  →  ·  ENTER', w / 2, h * 0.62 + 110, { size: 15, align: 'center', color: '#6a7294' });
      D.text(ctx, 'Daha sonra Ayarlar’dan değiştirebilirsin  ·  You can change this later in Settings', w / 2, h - 30, { size: 13, align: 'center', color: '#5a6284' });
    },
  };

  /* =====================================================================
   * Ortak: logo çizimi
   * =================================================================== */
  RC.drawLogo = function (ctx, x, y, size, t, opts = {}) {
    const word1 = 'RED';
    const word2 = 'CRIME';
    const appear = opts.appear == null ? 1 : opts.appear; // 0..1 harf animasyonu
    const glitch = opts.glitch || 0;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = `${size}px ${C.FONT_TITLE}`;
    const w1 = ctx.measureText(word1 + ' ').width;
    const w2 = ctx.measureText(word2).width;
    const total = w1 + w2;
    let cx = x - total / 2;
    const letters = [];
    for (const ch of word1 + ' ') letters.push({ ch, red: true });
    for (const ch of word2) letters.push({ ch, red: false });
    const n = letters.length;
    letters.forEach((L, i) => {
      const lw = ctx.measureText(L.ch).width;
      const start = (i / n) * 0.6;
      const k = U.clamp01((appear - start) / 0.4);
      if (k <= 0) {
        cx += lw;
        return;
      }
      const e = U.ease.outElastic(k);
      const dy = (1 - e) * -160;
      const rot = (1 - e) * (i % 2 ? 0.4 : -0.4);
      const wob = Math.sin(t * 2 + i * 0.6) * size * 0.02;
      ctx.save();
      ctx.translate(cx + lw / 2, y + dy + wob);
      ctx.rotate(rot);
      ctx.globalAlpha = Math.min(1, k * 3);
      // Glitch: RGB kayması
      if (glitch > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,0,60,0.7)';
        ctx.fillText(L.ch, -lw / 2 - glitch * 6, 0);
        ctx.fillStyle = 'rgba(0,200,255,0.7)';
        ctx.fillText(L.ch, -lw / 2 + glitch * 6, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
      // Gölge + kontur
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(L.ch, -lw / 2 + size * 0.05, size * 0.06);
      ctx.lineWidth = size * 0.08;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0a0b12';
      ctx.strokeText(L.ch, -lw / 2, 0);
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      if (L.red) {
        g.addColorStop(0, '#ff6a78');
        g.addColorStop(0.5, '#e8283c');
        g.addColorStop(1, '#8f1020');
      } else {
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.55, '#e6e9f5');
        g.addColorStop(1, '#9aa3c7');
      }
      ctx.fillStyle = g;
      ctx.fillText(L.ch, -lw / 2, 0);
      // Parlama
      ctx.save();
      ctx.beginPath();
      ctx.rect(-lw / 2, -size / 2, lw, size * 0.42);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillText(L.ch, -lw / 2, 0);
      ctx.restore();
      ctx.restore();
      cx += lw;
    });
    // Kırmızı kesik çizgi (slash)
    if (opts.slash != null && opts.slash > 0) {
      const s = U.ease.outCubic(U.clamp01(opts.slash));
      const sx0 = x - total / 2 - 40;
      const sx1 = sx0 + (total + 80) * s;
      ctx.strokeStyle = '#e8283c';
      ctx.lineWidth = size * 0.07;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff3043';
      ctx.shadowBlur = 20;
      U.line(ctx, sx0, y + size * 0.52, sx1, y + size * 0.42);
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';
    }
    ctx.restore();
    return total;
  };

  /* =====================================================================
   * SPLASH
   * =================================================================== */
  RC.Scenes.splash = {
    enter() {
      this.t = 0;
    },
    update(dt) {
      this.t += dt;
      if (this.t > 0.3 && (I.anyPressed || I.mouse.pressed)) {
        RC.Audio.unlock();
        RC.Audio.play('uiSelect');
        RC.Game.go(RC.Save.settings.skipIntro ? 'menu' : 'intro');
      }
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, w, h);
      const t = this.t;
      // Uygulama simgesi (hafif nabız)
      const s = 1 + Math.sin(t * 3) * 0.02;
      const size = Math.min(300, h * 0.46) * s;
      RC.drawAppIcon(ctx, w / 2, h / 2 - 50, size, U.clamp01(t * 2.5));
      D.text(ctx, RC.T('Başlamak için tıkla ya da bir tuşa bas', 'Başlamak için dokun'), w / 2, h / 2 + size / 2 + 10, { size: 18, align: 'center', color: '#9aa3c7', alpha: 0.5 + Math.sin(t * 4) * 0.5 });
      D.text(ctx, '🎧 Kulaklıkla oynaman önerilir', w / 2, h - 40, { size: 14, align: 'center', color: '#5a6284' });
    },
  };

  /* =====================================================================
   * SİNEMATİK AÇILIŞ
   * =================================================================== */
  RC.Scenes.intro = {
    enter() {
      this.t = 0;
      this.slashSnd = false;
      this.rain = new RC.BG.Rain(340);
      this.rain.wind = -220;
      this.skyA = new RC.BG.Skyline({ seed: 5, color: '#0b0e22', minH: 180, maxH: 420, width: 1900, windowChance: 0.2 });
      this.skyB = new RC.BG.Skyline({ seed: 9, color: '#11152e', minH: 100, maxH: 260, width: 1700, windowChance: 0.28 });
      this.particles = new RC.Particles(600);
      this.flash = 0;
      this.thundered = false;
      this.logoShown = false;
      this.done = false;
      this.caption = '';
      RC.Audio.rainLoop();
      RC.Audio.setLoop('rain', { vol: 1.2 });
      RC.Audio.playMusic('menu');
    },
    exit() {
      RC.Audio.stopLoop('rain');
    },
    update(dt) {
      const t = (this.t += dt);
      this.rain.update(dt, RC.Game.W, RC.Game.H);
      this.particles.update(dt);
      if (t > 0.9 && !this.thundered) {
        this.thundered = true;
        this.flash = 1;
        RC.Audio.play('thunder');
      }
      if (t > 6.2 && !this.thunder2) {
        this.thunder2 = true;
        this.flash = 0.8;
        RC.Audio.play('thunder', { vol: 0.6 });
      }
      this.flash = Math.max(0, this.flash - dt * 2.5);
      // Altyazı (daktilo)
      // Önce çevir, sonra harf harf kes (kesilmiş metin sözlükte eşleşmez)
      const cap = RC.L('Bir gece... şehrin en sessiz hırsızı işbaşında.');
      const k = U.clamp01((t - 1.6) / 2.2);
      const n = Math.floor(cap.length * k);
      if (n > this.caption.length && t < 5) RC.Audio.play('typewriter', { vol: 0.5 });
      this.caption = cap.slice(0, n);

      // Logo
      if (t > 6.3 && !this.logoShown) {
        this.logoShown = true;
        RC.Audio.play('flash');
        RC.Audio.play('whoosh');
        this.particles.sparks(RC.Game.W / 2, RC.Game.H * 0.42, 60, '#ff5060', 600);
      }
      if (t > 7.1 && !this.slashSnd) {
        this.slashSnd = true;
        RC.Audio.play('punch');
      }
      if (this.logoShown && Math.random() < dt * 20) this.particles.embers(U.rand(0, RC.Game.W), RC.Game.H + 10, 1);

      if ((t > 0.6 && (I.anyPressed || I.mouse.pressed)) || t > 12.5) {
        if (!this.done) {
          this.done = true;
          RC.Game.go('menu', { fromIntro: true });
        }
      }
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const pan = t * 60;
      RC.BG.sky(ctx, w, h, t, { moonX: w * 0.82, moonY: h * 0.2, moonR: 50, parallaxX: pan * 10 });
      RC.BG.clouds(ctx, w, h, t, { speed: 3, color: 'rgba(25,30,60,0.85)', count: 10 });
      // Şimşek
      if (this.flash > 0.3 && Math.random() < 0.6) {
        ctx.strokeStyle = `rgba(220,230,255,${this.flash})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        let lx = w * 0.3;
        let ly = 0;
        ctx.moveTo(lx, ly);
        while (ly < h * 0.5) {
          lx += U.rand(-40, 40);
          ly += U.rand(20, 50);
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
      this.skyA.render(ctx, pan * 0.3, h * 0.78, w, t);
      this.skyB.render(ctx, pan * 0.6, h * 0.86, w, t);

      // Çatı (ön plan)
      const roofY = h * 0.8;
      ctx.fillStyle = '#07080f';
      ctx.fillRect(0, roofY, w, h - roofY);
      ctx.fillStyle = '#12142a';
      ctx.fillRect(0, roofY, w, 6);
      // Çatı detayları
      ctx.fillStyle = '#07080f';
      ctx.fillRect(w * 0.15, roofY - 70, 60, 70);
      ctx.fillRect(w * 0.15 - 8, roofY - 78, 76, 10);
      ctx.fillRect(w * 0.7, roofY - 40, 120, 40);
      for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.72 + i * 28, roofY - 60, 6, 20);
      // Anten
      ctx.fillRect(w * 0.88, roofY - 140, 4, 140);
      ctx.fillRect(w * 0.88 - 30, roofY - 120, 64, 3);
      ctx.fillRect(w * 0.88 - 20, roofY - 100, 44, 3);
      if (Math.sin(t * 3) > 0) U.circle(ctx, w * 0.88 + 2, roofY - 142, 3, '#ff3b3b');

      // Polis ışıkları (aşağıdan)
      const pk = Math.floor(t * 5) % 2;
      const pg = ctx.createLinearGradient(0, h, 0, h * 0.6);
      pg.addColorStop(0, pk ? 'rgba(255,30,60,0.35)' : 'rgba(30,90,255,0.35)');
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pg;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      // Projektör
      if (t > 3) {
        const sa = -Math.PI / 2 + Math.sin((t - 3) * 0.9) * 0.6;
        const sx = w * 0.5;
        const sy = h + 40;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, h * 1.2);
        sg.addColorStop(0, 'rgba(200,220,255,0.35)');
        sg.addColorStop(1, 'rgba(200,220,255,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, h * 1.2, sa - 0.09, sa + 0.09);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Red Crime: sahneye yuvarlanır, zıplar, göz kırpar
      if (t > 2.4) {
        const k = U.clamp01((t - 2.4) / 2);
        let hx = U.lerp(-80, w * 0.42, U.ease.outCubic(k));
        let hy = roofY - 30;
        const jump = t > 4.6 && t < 5.4 ? Math.sin(((t - 4.6) / 0.8) * Math.PI) * 90 : 0;
        hy -= jump;
        const rolling = k < 1;
        const tilt = rolling ? t * 8 : 0;
        const wink = t > 5.6 && t < 6.1;
        ctx.save();
        ctx.translate(hx, hy);
        if (rolling) ctx.rotate(tilt * 0.05);
        D.character(ctx, {
          x: 0,
          y: 0,
          r: 30,
          body: '#e8283c',
          facing: 1,
          balaclava: '#1c1d26',
          eyes: 'open',
          blink: wink ? 1 : 0,
          mouth: t > 5.4 ? 'grin' : 'smile',
          arms: jump > 0 ? [{ x: -40, y: -20 }, { x: 40, y: -20 }] : [{ x: -34 - Math.sin(t * 12) * 8, y: 20 }, { x: 34 + Math.sin(t * 12) * 8, y: 20 }],
          sleeve: '#1d1f29',
          glove: '#2a2d3e',
          t,
        });
        ctx.restore();
        // Elinde elmas
        if (t > 4.6) {
          const gy = hy - 56 + Math.sin(t * 4) * 3;
          ctx.save();
          ctx.translate(hx, gy);
          ctx.rotate(Math.sin(t * 2) * 0.2);
          RC.Items.DRAW.gem(ctx, 24, 24, ['#e8f5ff']);
          ctx.restore();
          if (Math.random() < 0.2) this.particles.glint(hx + U.rand(-10, 30), gy + U.rand(-5, 25), '#fff');
        }
      }

      // Yağmur
      this.rain.render(ctx, 0.4);

      // Logo
      if (t > 6.3) {
        const appear = U.clamp01((t - 6.3) / 1.2);
        const glitch = Math.random() < 0.08 ? U.rand(0.5, 1.5) : t < 7 ? 1 - (t - 6.3) / 0.7 : 0;
        ctx.fillStyle = `rgba(0,0,0,${Math.min(0.45, (t - 6.3) * 0.6)})`;
        ctx.fillRect(0, 0, w, h);
        RC.drawLogo(ctx, w / 2, h * 0.42, Math.min(130, w * 0.1), t, { appear, glitch, slash: (t - 7.1) / 0.4 });
        if (t > 7.8) {
          const a = U.clamp01((t - 7.8) / 0.6);
          D.text(ctx, 'SESSİZ  ·  HIZLI  ·  TEMİZ', w / 2, h * 0.42 + 100, { size: 22, align: 'center', color: '#dfe3f5', alpha: a, weight: 'bold' });
        }
        if (t > 8.6) D.text(ctx, RC.T('Devam etmek için bir tuşa bas', 'Devam etmek için dokun'), w / 2, h * 0.86, { size: 18, align: 'center', color: '#9aa3c7', alpha: 0.5 + Math.sin(t * 4) * 0.5 });
      }

      this.particles.render(ctx, null);

      // Altyazı
      if (t < 6.3 && this.caption) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, h - 90, w, 60);
        D.text(ctx, this.caption + (Math.floor(t * 3) % 2 ? '_' : ''), w / 2, h - 52, { size: 22, align: 'center', color: '#f2f4ff' });
      }
      // Sinema şeritleri
      const bar = t < 6.3 ? 60 : Math.max(0, 60 - (t - 6.3) * 80);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, bar);
      ctx.fillRect(0, h - bar, w, bar);
      // Şimşek beyazlığı
      if (this.flash > 0) {
        ctx.fillStyle = `rgba(230,235,255,${this.flash * 0.6})`;
        ctx.fillRect(0, 0, w, h);
      }
      D.vignette(ctx, w, h, 0.7);
      if (t > 0.6 && t < 6) D.text(ctx, 'Geç: herhangi bir tuş', w - 20, h - bar - 14 + (bar > 0 ? 0 : 0), { size: 12, align: 'right', color: '#5a6284' });
    },
  };
})(window.RC);
