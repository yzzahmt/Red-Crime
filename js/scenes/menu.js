/* =========================================================================
 *  RED CRIME - Ana menü, Ayarlar, Nasıl Oynanır
 *  Ortak animasyonlu menü arka planı: gece şehri, çatıda el feneriyle
 *  etrafı tarayan Red Crime, projektörler, yağmur, közler.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const UI = RC.UI;

  /* =====================================================================
   * Menü arka planı
   * =================================================================== */
  const MenuBG = {
    inited: false,
    init() {
      if (this.inited) return;
      this.inited = true;
      this.t = 0;
      this.skyA = new RC.BG.Skyline({ seed: 71, color: '#0b0e22', minH: 160, maxH: 380, width: 2000, windowChance: 0.2 });
      this.skyB = new RC.BG.Skyline({ seed: 72, color: '#12162e', minH: 90, maxH: 240, width: 1800, windowChance: 0.3 });
      this.rain = new RC.BG.Rain(200);
      this.particles = new RC.Particles(300);
    },
    update(dt) {
      this.init();
      this.t += dt;
      this.rain.update(dt, RC.Game.W, RC.Game.H);
      this.particles.update(dt);
      if (Math.random() < dt * 6) this.particles.embers(U.rand(0, RC.Game.W), RC.Game.H + 10, 1);
    },
    render(ctx, opts = {}) {
      this.init();
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const pan = t * 12;
      RC.BG.sky(ctx, w, h, t, { moonX: w * 0.85, moonY: h * 0.17, moonR: 44, parallaxX: pan * 20 });
      RC.BG.clouds(ctx, w, h, t, { color: 'rgba(30,36,70,0.6)', count: 8 });
      // Projektörler
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const sx = w * (0.25 + i * 0.5);
        const a = -Math.PI / 2 + Math.sin(t * 0.5 + i * 2) * 0.5;
        const g = ctx.createRadialGradient(sx, h, 10, sx, h, h * 1.3);
        g.addColorStop(0, 'rgba(160,190,255,0.16)');
        g.addColorStop(1, 'rgba(160,190,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(sx, h);
        ctx.arc(sx, h, h * 1.3, a - 0.07, a + 0.07);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      this.skyA.render(ctx, pan * 0.4, h * 0.8, w, t);
      this.skyB.render(ctx, pan, h * 0.9, w, t);
      // Çatı
      const roofY = h * 0.9;
      ctx.fillStyle = '#07080f';
      ctx.fillRect(0, roofY, w, h - roofY);
      ctx.fillStyle = '#161a33';
      ctx.fillRect(0, roofY, w, 4);
      if (!opts.noHero) {
        // Red Crime çatı kenarında oturuyor, el feneriyle tarıyor
        const hx = w * 0.14;
        const hy = roofY - 26;
        const aim = -0.4 + Math.sin(t * 0.8) * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const fg = ctx.createRadialGradient(hx + 30, hy, 5, hx + 30, hy, 380);
        fg.addColorStop(0, 'rgba(255,240,190,0.3)');
        fg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(hx + 30, hy);
        ctx.arc(hx + 30, hy, 380, aim - 0.3, aim + 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        D.character(ctx, {
          x: hx,
          y: hy,
          r: 26,
          body: '#e8283c',
          facing: 1,
          balaclava: '#1c1d26', operator: true,
          look: { x: Math.cos(aim), y: Math.sin(aim) },
          mouth: 'smile',
          blink: Math.sin(t * 1.3) > 0.98 ? 1 : 0,
          arms: [{ x: -30, y: 18 }, { x: Math.cos(aim) * 34, y: Math.sin(aim) * 34 + 4 }],
          sleeve: '#1d1f29',
          glove: '#2a2d3e',
          t,
        });
        // Çuval
        ctx.fillStyle = '#8a6a3a';
        U.ellipse(ctx, hx - 50, roofY - 18, 20, 18, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', hx - 50, roofY - 12);
      }
      this.rain.render(ctx, 0.25);
      this.particles.render(ctx, null);
      // Oyun içiyle aynı sinematik ton: daha az doygun, daha koyu, soğuk gölgeler
      if (RC.Save.settings.quality !== 'low') {
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = 'rgba(128,128,128,0.35)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(70,76,96,0.35)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      D.vignette(ctx, w, h, 0.85);
    },
  };
  RC.MenuBG = MenuBG;

  /* =====================================================================
   * "Diğer ürünlerimiz" kartı: yazify.net'i sistem tarayıcısında açar.
   * Cam görünümlü koyu kart, renk dolaşan kenarlık, uygulama ızgarası simgesi.
   * =================================================================== */
  const PRODUCTS_URL = 'https://www.yazify.net';

  class ProductsButton extends UI.Widget {
    activate() {
      this.pressT = 0.15;
      RC.Audio.play('uiSelect');
      RC.Platform.openURL(PRODUCTS_URL);
    }
    draw(ctx, t) {
      const h = this.hoverT;
      const s = 1 + h * 0.035 - (this.pressT > 0 ? 0.03 : 0);
      const W = this.w;
      const H = this.h;
      ctx.save();
      ctx.translate(this.x + W / 2, this.y + H / 2);
      ctx.scale(s, s);
      const x = -W / 2;
      const y = -H / 2;
      const r = H / 2;
      // Parıltı
      ctx.shadowColor = U.mix('#ff3043', '#ffc83d', 0.5 + Math.sin(t * 2) * 0.5);
      ctx.shadowBlur = 10 + h * 22;
      const bg = ctx.createLinearGradient(x, y, x + W, y + H);
      bg.addColorStop(0, U.mix('#1d1533', '#2a1d48', h));
      bg.addColorStop(1, U.mix('#0b0a18', '#140f28', h));
      ctx.fillStyle = bg;
      U.fillRoundRect(ctx, x, y, W, H, r);
      ctx.shadowBlur = 0;
      // Renk dolaşan kenarlık
      const off = (t * 0.35) % 1;
      const bd = ctx.createLinearGradient(x - W, 0, x + W * 2, 0);
      const cols = ['#ff3043', '#ffc83d', '#a46bff', '#ff3043'];
      for (let k = 0; k < 4; k++) bd.addColorStop(U.clamp01(k / 3 * 0.66 + off * 0.34), cols[k]);
      ctx.strokeStyle = bd;
      ctx.lineWidth = 2 + h;
      U.strokeRoundRect(ctx, x + 1, y + 1, W - 2, H - 2, r - 1);
      // Işık süpürmesi: ara sıra kendiliğinden, üzerine gelince sürekli
      const cyc = h > 0.05 ? (t * 1.4) % 1.6 : (t % 4.5) / 1.2;
      if (cyc < 1.3) {
        ctx.save();
        ctx.beginPath();
        U.roundRect(ctx, x, y, W, H, r);
        ctx.clip();
        const sx = x - 80 + cyc * (W + 160);
        const lg = ctx.createLinearGradient(sx - 50, 0, sx + 50, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, 'rgba(255,255,255,0.16)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x, y, W, H);
        ctx.restore();
      }
      // Uygulama ızgarası simgesi
      const ix = x + 14;
      const iy = -18;
      const tile = ctx.createLinearGradient(ix, iy, ix + 36, iy + 36);
      tile.addColorStop(0, '#ff4458');
      tile.addColorStop(1, '#8a0f2a');
      ctx.fillStyle = tile;
      U.fillRoundRect(ctx, ix, iy, 36, 36, 10);
      const dots = ['#ffffff', '#ffc83d', '#ffc83d', '#ffffff'];
      for (let k = 0; k < 4; k++) {
        const pulse = 1 + Math.max(0, Math.sin(t * 3 - k * 0.8)) * 0.18 * (0.4 + h);
        const dx = ix + 11 + (k % 2) * 14;
        const dy = iy + 11 + Math.floor(k / 2) * 14;
        const z = 5 * pulse;
        U.fillRoundRect(ctx, dx - z, dy - z, z * 2, z * 2, 3, dots[k]);
      }
      // Yazılar
      D.text(ctx, RC.L('DİĞER ÜRÜNLERİMİZ'), x + 62, -2, { size: 15, font: C.FONT_TITLE, color: '#ffffff', shadow: 'rgba(0,0,0,0.5)' });
      D.text(ctx, 'yazify.net', x + 62, 15, { size: 12, weight: 'bold', color: U.mix('#c9a24a', '#ffc83d', h) });
      // Ok (↗): üzerine gelince dışarı fırlar
      const ax = x + W - 26 + h * 3;
      const ay = 0 - h * 3;
      U.circle(ctx, x + W - 26, 0, 15, U.rgba('#ffffff', 0.08 + h * 0.12));
      ctx.strokeStyle = U.mix('#dfe3f5', '#ffc83d', h);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax - 5, ay + 5);
      ctx.lineTo(ax + 5, ay - 5);
      ctx.moveTo(ax - 2, ay - 5);
      ctx.lineTo(ax + 5, ay - 5);
      ctx.lineTo(ax + 5, ay + 2);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.restore();
    }
  }

  /* =====================================================================
   * ANA MENÜ
   * =================================================================== */
  RC.Scenes.menu = {
    enter() {
      MenuBG.init();
      this.t = 0;
      RC.Audio.playMusic('menu');
      this.build();
      // Premium günlük hediye
      const bonus = RC.IAP ? RC.IAP.claimDaily() : 0;
      this.notice = bonus ? { text: RC.L('Premium günlük hediye: +{m}', { m: U.formatMoney(bonus) }), t: 5 } : null;
      if (bonus) RC.Audio.play('bigcash');
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const bw = 360;
      const x = w / 2 - bw / 2;
      let y = h * 0.44;
      const mk = (label, icon, fn, o = {}) => {
        const b = new UI.Button({ x, y, w: bw, h: 52, label, icon, onClick: fn, ...o });
        y += 62;
        return b;
      };
      const focus = this.menu ? this.menu.focus : 0;
      this.menu = new UI.Menu([
        mk('OYUNA BAŞLA', 'play', () => RC.Game.go('levelselect'), { primary: true, fontSize: 22 }),
        // Mağaza yalnızca Android / iOS'ta (Steam / tarayıcıda gizli)
        ...(RC.IAP && RC.IAP.supported ? [mk('MAĞAZA', 'money', () => RC.Game.go('store', { back: 'menu' }))] : []),
        mk('AYARLAR', 'gear', () => RC.Game.go('settings', { back: 'menu' })),
        mk('NASIL OYNANIR', 'info', () => RC.Game.go('howto')),
        mk(RC.I18N.lang === 'en' ? 'LANGUAGE: ENGLISH' : 'DİL: TÜRKÇE', 'globe', () => {
          RC.setLang(RC.I18N.lang === 'en' ? 'tr' : 'en');
          this.build();
          this.menu.focus = RC.IAP && RC.IAP.supported ? 4 : 3;
        }),
        ...(RC.Platform.canQuit ? [mk('ÇIKIŞ', 'cross', () => RC.Platform.quit())] : []),
        new ProductsButton({ x: w - 300, y: h - 82, w: 280, h: 60 }),
      ]);
      this.menu.focus = focus;
    },
    update(dt) {
      this.t += dt;
      MenuBG.update(dt);
      if (this.notice && (this.notice.t -= dt) <= 0) this.notice = null;
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      MenuBG.render(ctx);
      const appear = U.clamp01(t / 1.2);
      RC.drawLogo(ctx, w / 2, h * 0.26, Math.min(120, w * 0.095), t, { appear: 0.4 + appear * 0.6, slash: appear * 1.5, glitch: Math.random() < 0.02 ? 1 : 0 });
      D.text(ctx, 'SESSİZ  ·  HIZLI  ·  TEMİZ', w / 2, h * 0.26 + 88, { size: 18, align: 'center', color: '#b8c0e0', weight: 'bold', alpha: appear });
      this.menu.draw(ctx, t);
      if (this.notice) D.text(ctx, this.notice.text, w / 2, h * 0.44 - 18, { size: 18, weight: 'bold', align: 'center', color: C.COLORS.gold, alpha: Math.min(1, this.notice.t), stroke: 'rgba(0,0,0,0.8)', strokeW: 4 });
      // Alt bilgi
      const p = RC.Save.progress;
      D.panel(ctx, 20, h - 64, 280, 46, { r: 10 });
      D.icon(ctx, 'money', 44, h - 41, 22, C.COLORS.gold);
      D.text(ctx, U.formatMoney(p.wallet), 64, h - 34, { size: 20, font: C.FONT_TITLE, color: C.COLORS.gold });
      D.text(ctx, 'v1.4 · ' + ({ win32: 'Windows', darwin: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS' }[RC.Platform.os] || 'Web'), w - 24, h - 92, { size: 12, align: 'right', color: '#5a6284' });
      if (!RC.Touch.active) D.text(ctx, '↑↓ seç · ENTER onayla', w / 2, h - 24, { size: 13, align: 'center', color: '#5a6284' });
    },
  };

  /* =====================================================================
   * AYARLAR
   * =================================================================== */
  RC.Scenes.settings = {
    enter(params) {
      MenuBG.init();
      this.back = params.back || 'menu';
      this.backParams = params.backParams || {};
      this.t = 0;
      this.confirmReset = 0;
      this.build();
    },
    onResize() {
      this.build();
    },
    build() {
      const S = RC.Save;
      const s = () => S.settings;
      const w = RC.Game.W;
      const h = RC.Game.H;
      const colW = Math.min(440, (w - 120) / 2);
      const x1 = w / 2 - colW - 12;
      const x2 = w / 2 + 12;
      const top = 150;
      const rowH = 62;
      const set = (k) => (v) => S.setSetting(k, v);
      const items = [];
      let y = top;
      const L = (o) => {
        o.x = x1;
        o.y = y;
        o.w = colW;
        o.h = 52;
        y += rowH;
        return o;
      };
      items.push(new UI.Slider(L({ label: 'Ana Ses', get: () => s().master, set: set('master') })));
      items.push(new UI.Slider(L({ label: 'Müzik', get: () => s().music, set: set('music') })));
      items.push(new UI.Slider(L({ label: 'Efektler', get: () => s().sfx, set: set('sfx') })));
      items.push(
        new UI.Choice(
          L({
            label: 'Zorluk',
            get: () => s().difficulty,
            set: set('difficulty'),
            options: [
              { value: 'easy', label: 'Kolay' },
              { value: 'normal', label: 'Normal' },
              { value: 'hard', label: 'Zor' },
            ],
          })
        )
      );
      items.push(new UI.Toggle(L({ label: 'İpuçları', get: () => s().hints, set: set('hints') })));
      items.push(new UI.Toggle(L({ label: 'Öğretici', get: () => !RC.Save.progress.tutorialDone, set: (v) => { RC.Save.progress.tutorialDone = !v; RC.Save.save(); } })));
      y = top;
      const R = (o) => {
        o.x = x2;
        o.y = y;
        o.w = colW;
        o.h = 52;
        y += rowH;
        return o;
      };
      items.push(
        new UI.Choice(
          R({
            label: 'Grafik',
            get: () => s().quality,
            set: (v) => {
              S.setSetting('quality', v);
              const hs = RC.Scenes.heist;
              if (hs && hs.lighting) hs.lighting.resize(RC.Game.W, RC.Game.H, v);
            },
            options: [
              { value: 'low', label: 'Düşük' },
              { value: 'medium', label: 'Orta' },
              { value: 'high', label: 'Yüksek' },
            ],
          })
        )
      );
      items.push(new UI.Toggle(R({ label: 'Ekran Sarsıntısı', get: () => s().shake, set: set('shake') })));
      items.push(new UI.Toggle(R({ label: 'Fareyle Nişan', get: () => s().mouseAim, set: set('mouseAim') })));
      items.push(new UI.Toggle(R({ label: 'Ses Halkaları', get: () => s().noiseRings, set: set('noiseRings') })));
      items.push(new UI.Toggle(R({ label: 'FPS Göster', get: () => s().showFps, set: set('showFps') })));
      // Dil: seçenekler her dilde kendi adıyla görünür. Metinler çizimde çevrildiği
      // için değişiklik anında bütün arayüze (duraklatılmış soygun dahil) yansır.
      items.push(
        new UI.Choice(
          R({
            label: 'Dil',
            get: () => RC.I18N.lang,
            set: (v) => {
              RC.setLang(v);
              S.setSetting('langChosen', true);
            },
            options: [
              { value: 'tr', label: 'Türkçe' },
              { value: 'en', label: 'English' },
            ],
          })
        )
      );
      const by = top + rowH * 6 + 12;
      items.push(new UI.Button({ x: x1, y: by, w: colW, h: 52, label: 'TAM EKRAN', icon: 'play', onClick: () => RC.Game.toggleFullscreen(), fontSize: 17 }));
      const resetBtn = new UI.Button({
        x: x2,
        y: by,
        w: colW,
        h: 52,
        label: 'İLERLEMEYİ SIFIRLA',
        icon: 'retry',
        fontSize: 17,
        onClick: () => {
          if (this.confirmReset > 0) {
            S.reset();
            this.confirmReset = 0;
            resetBtn.label = 'SIFIRLANDI ✓';
          } else {
            this.confirmReset = 3;
            resetBtn.label = 'EMİN MİSİN? TEKRAR BAS';
          }
        },
      });
      this.resetBtn = resetBtn;
      items.push(resetBtn);
      items.push(new UI.Toggle({ x: x1, y: by + 64, w: colW, h: 52, label: 'Açılışı Atla', get: () => s().skipIntro, set: set('skipIntro') }));
      items.push(new UI.Button({ x: x1, y: by + 64, w: colW, h: 52, label: 'GİZLİLİK / KVKK', icon: 'lock', fontSize: 17, onClick: () => RC.Game.go('privacy', { review: true, back: 'settings', backParams: { back: this.back, backParams: this.backParams } }) }));
      items.push(new UI.Button({ x: x2, y: by + 64, w: colW, h: 52, label: 'GERİ', icon: 'back', back: true, primary: true, onClick: () => this.goBack() }));
      this.menu = new UI.Menu(items);
    },
    goBack() {
      RC.Game.go(this.back, this.backParams);
    },
    update(dt) {
      this.t += dt;
      MenuBG.update(dt);
      if (this.confirmReset > 0) {
        this.confirmReset -= dt;
        if (this.confirmReset <= 0) this.resetBtn.label = 'İLERLEMEYİ SIFIRLA';
      }
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        this.goBack();
        return;
      }
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.55)';
      ctx.fillRect(0, 0, w, RC.Game.H);
      D.text(ctx, 'AYARLAR', w / 2, 96, { size: 48, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      this.menu.draw(ctx, this.t);
      if (!RC.Touch.active) D.text(ctx, '←→ değiştir · ↑↓ gez · ESC geri', w / 2, RC.Game.H - 24, { size: 13, align: 'center', color: '#5a6284' });
      if (!RC.Save.available) D.text(ctx, 'Uyarı: tarayıcı kayda izin vermiyor, ilerleme kaydedilmeyecek.', w / 2, RC.Game.H - 48, { size: 13, align: 'center', color: '#ff8c2e' });
    },
  };

  /* =====================================================================
   * NASIL OYNANIR
   * =================================================================== */
  RC.Scenes.howto = {
    enter() {
      this.t = 0;
      this.page = 0;
      this.build();
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      this.menu = new UI.Menu([
        new UI.Button({ x: w / 2 - 350, y: h - 90, w: 220, h: 52, label: '◀ ÖNCEKİ', onClick: () => (this.page = (this.page + 2) % 3), fontSize: 17 }),
        new UI.Button({ x: w / 2 - 110, y: h - 90, w: 220, h: 52, label: 'GERİ', back: true, primary: true, onClick: () => RC.Game.go('menu') }),
        new UI.Button({ x: w / 2 + 130, y: h - 90, w: 220, h: 52, label: 'SONRAKİ ▶', onClick: () => (this.page = (this.page + 1) % 3), fontSize: 17 }),
      ]);
      this.menu.focus = 1;
    },
    update(dt) {
      this.t += dt;
      MenuBG.update(dt);
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        RC.Game.go('menu');
        return;
      }
      if (I.actPressed('menuLeft')) this.page = (this.page + 2) % 3;
      if (I.actPressed('menuRight')) this.page = (this.page + 1) % 3;
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.6)';
      ctx.fillRect(0, 0, w, h);
      D.text(ctx, 'NASIL OYNANIR', w / 2, 80, { size: 44, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      const pw = Math.min(1000, w - 80);
      const px = w / 2 - pw / 2;
      const py = 110;
      const ph = h - 220;
      D.panel(ctx, px, py, pw, ph, { accent: C.COLORS.red });
      const titles = ['KONTROLLER', 'GİZLİLİK', 'GANİMET'];
      D.text(ctx, `${this.page + 1}/3 · ${RC.L(titles[this.page])}`, w / 2, py + 40, { size: 22, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold });
      if (this.page === 0) {
        const rows = RC.Touch.active ? [
          [['◀ KAYDIR', 'KAYDIR ▶'], 'Kaydırıp tut: yürü'],
          [['▲ KAYDIR'], 'Zıpla (el merdiveninde tut: tırman)'],
          [['▼ KAYDIR'], 'Çömel — sessiz yürür, saklanırsın'],
          [['▼ KAYDIR', '▲ KAYDIR'], 'Rafın / platformun üstünden aşağı in'],
          [['UZUN KAYDIR'], 'Koş (daha hızlı ama gürültülü)'],
          [['DOKUN'], 'Al / çuvala at / bırak / yükle / aç / kaç'],
          [['DOKUN'], 'Kapıya / kasaya dokun: aç'],
          [['▼ KAYDIR', 'DOKUN'], 'Çömel, ikinci parmakla dokun: SESSİZCE koy'],
          [['BASILI TUT'], 'Eşya elindeyken: fırlat'],
          [['BASILI TUT'], 'Elin boşken: el fenerini aç / kapat'],
          [['HARİTA'], 'Mini haritaya basılı tut: büyük harita'],
          [['II'], 'Duraklat (sağ üstteki düğme)'],
        ] : [
          [['A', 'D'], 'Sola / sağa yürü'],
          [['W'], 'Zıpla (el merdiveninde: tırman)'],
          [['S'], 'Çömel — sessiz yürür, saklanırsın'],
          [['S', 'W'], 'Rafın / platformun üstünden aşağı in'],
          [['SHIFT'], 'Koş (daha hızlı ama gürültülü)'],
          [['SPACE'], 'Eşyayı tut / çuvala at / bırak / kamyona yükle'],
          [['S', 'SPACE'], 'Eşyayı çömelerek SESSİZCE yere koy'],
          [['Q'], 'Eşyayı fırlat (dikkat dağıtmak için)'],
          [['E'], 'Kasayı aç · kamyonla kaç'],
          [['F'], 'El fenerini aç / kapat (fareyle nişan al)'],
          [['M'], 'Harita (basılı tut)'],
          [['ESC'], 'Duraklat'],
        ];
        const colW = pw / 2;
        rows.forEach((r, i) => {
          const cx = px + 40 + (i % 2) * colW;
          const cy = py + 76 + Math.floor(i / 2) * 60;
          let kx = cx;
          r[0].forEach((k, j) => {
            if (j > 0) {
              D.text(ctx, '+', kx + 4, cy + 21, { size: 16, color: '#9aa3c7' });
              kx += 18;
            }
            kx += D.key(ctx, k, kx, cy, 34, { pressed: Math.sin(t * 3 + i) > 0.9 }) + 6;
          });
          D.text(ctx, r[1], cx + 150, cy + 23, { size: 16, color: '#dfe3f5' });
        });
      } else if (this.page === 1) {
        const lines = [
          ['ear', 'Her adım, düşen eşya, kırılan vazo SES çıkarır. Ses halkaları ne kadar gürültü yaptığını gösterir.'],
          ['zzz', 'Uyuyan ev sahibinin "uyanma" çubuğu seslerle dolar. Dolduğunda uyanır ve IŞIKLARI AÇAR.'],
          ['eye', 'Uyanık ev sahibi seni görürse şüphelenir; şüphe dolarsa KOVALAR ve POLİSİ ARAR.'],
          ['home', 'Dolap, perde, çalı arkasında hareketsiz dur; kanepe, yatak, sandık arkasında ÇÖMEL.'],
          ['flashlight', 'El feneri çok işe yarar ama uyanık birine yerini belli eder. Uyuyan birinin yüzüne tutma!'],
          ['police', 'Polis çağrılınca süre azalır. Polis gelmeden kamyona ulaş!'],
          ['dog', 'Bekçi köpeği seni görürse havlar; havlaması herkesi uyandırır. Isırırsa elindekini düşürürsün.'],
        ];
        lines.forEach((l, i) => {
          const cy = py + 90 + i * 58;
          U.circle(ctx, px + 60, cy, 22, 'rgba(255,255,255,0.08)');
          D.icon(ctx, l[0], px + 60, cy, 24, '#fff');
          const wrapped = U.wrapText((ctx.font = `16px ${C.FONT_UI}`, ctx), RC.L(l[1]), pw - 140);
          wrapped.slice(0, 2).forEach((ln, j) => D.text(ctx, ln, px + 100, cy - 2 + j * 20 - (wrapped.length > 1 ? 8 : -6), { size: 16, color: '#dfe3f5' }));
        });
      } else {
        const lines = [
          ['bag', RC.T('Küçük eşyalar doğrudan ÇUVALA girer. Çuvaldaki eşyaya tıkla (G: sonuncusu) ve çıkar. Dolunca kamyona boşalt.', 'Küçük eşyalar doğrudan ÇUVALA girer. Çuvaldaki eşyaya dokunarak çıkar. Dolunca kamyona boşalt.')],
          ['hand', 'Büyük eşyaları başının üstünde taşırsın. Ağır eşyalar seni yavaşlatır ve daha sesli yürütür.'],
          ['truck', RC.T('Sadece KAMYONA yüklenen ganimet sayılır! Kamyonun arkasında SPACE ile yükle.', 'Sadece KAMYONA yüklenen ganimet sayılır! Kamyonun arkasında ekrana dokunarak yükle.')],
          ['star', 'Nadirlik: Sıradan · Nadir (mavi) · Epik (mor) · Efsanevi (altın). Parlayan eşyaları kaçırma.'],
          ['safe', RC.T('Her evde bir KASA var. Anahtarını bul, kasanın önünde E\'ye bas ve şifre kadranını çöz.', 'Her evde bir KASA var. Anahtarını bul, kasaya dokun ve şifre kadranını çöz.')],
          ['fragile', 'Vazo, cam, ayna, porselen KIRILIR. Kırılan eşya hem değer kaybı hem büyük gürültü demek.'],
          ['shop', 'Kazandığın parayla dükkândan sessiz ayakkabı, büyük çuval, güçlü fener gibi geliştirmeler al.'],
        ];
        lines.forEach((l, i) => {
          const cy = py + 90 + i * 58;
          U.circle(ctx, px + 60, cy, 22, 'rgba(255,255,255,0.08)');
          D.icon(ctx, l[0], px + 60, cy, 24, C.COLORS.gold);
          ctx.font = `16px ${C.FONT_UI}`;
          const wrapped = U.wrapText(ctx, RC.L(l[1]), pw - 140);
          wrapped.slice(0, 2).forEach((ln, j) => D.text(ctx, ln, px + 100, cy - 2 + j * 20 - (wrapped.length > 1 ? 8 : -6), { size: 16, color: '#dfe3f5' }));
        });
      }
      this.menu.draw(ctx, t);
    },
  };
})(window.RC);
