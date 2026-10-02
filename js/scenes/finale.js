/* =========================================================================
 *  RED CRIME - Final sahneleri
 *  - execution: 15. bölümde iki hak da kaybedilirse köprü altında son.
 *    Tüm ilerleme silinir, oyun 1. bölümden yeniden başlar.
 *  - ending: 15. bölüm başarıyla biterse mutlu son, jenerik, teşekkür
 *    ve bir sonraki oyun için %80 indirim kodu.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const L = (s, v) => RC.L(s, v);

  /** Ortak: yazı makinesi diyalog kutusu */
  function dialogBox(ctx, w, h, who, text, shown, t) {
    const pw = Math.min(900, w - 60);
    const px = w / 2 - pw / 2;
    const py = h - 170;
    D.panel(ctx, px, py, pw, 140, { accent: who === 'boss' ? '#ffc83d' : C.COLORS.red });
    D.text(ctx, who === 'boss' ? L('REİS') : 'RED CRIME', px + 24, py + 36, { size: 18, font: C.FONT_TITLE, color: who === 'boss' ? '#ffc83d' : C.COLORS.red });
    ctx.font = `19px ${C.FONT_UI}`;
    const lines = U.wrapText(ctx, text.slice(0, Math.floor(shown)), pw - 48);
    lines.slice(0, 3).forEach((ln, i) => D.text(ctx, ln, px + 24, py + 70 + i * 26, { size: 19, color: '#f2f4ff' }));
    if (shown >= text.length) D.text(ctx, '▼', px + pw - 26, py + 124 + Math.sin(t * 6) * 3, { size: 14, align: 'center', color: '#9aa3c7' });
  }

  function bridgeBackdrop(ctx, w, h, t, fireLight) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05060f');
    g.addColorStop(1, '#141020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Köprü
    ctx.fillStyle = '#1e1e26';
    ctx.fillRect(0, 60, w, 70);
    ctx.fillStyle = '#26262e';
    for (const x of [w * 0.12, w * 0.88]) ctx.fillRect(x - 50, 130, 100, h - 230);
    ctx.fillStyle = '#18181e';
    ctx.fillRect(0, h - 100, w, 100);
    // Ateş
    const bx = w * 0.5;
    const by = h - 100;
    ctx.fillStyle = '#4a2a1a';
    ctx.fillRect(bx - 28, by - 72, 56, 72);
    for (let i = 0; i < 6; i++) {
      const fx = bx - 20 + i * 8;
      const fh = 26 + Math.sin(t * 10 + i * 1.3) * 10 + (i === 2 || i === 3 ? 14 : 0);
      const fg = ctx.createLinearGradient(0, by - 72 - fh, 0, by - 72);
      fg.addColorStop(0, 'rgba(255,220,120,0)');
      fg.addColorStop(0.4, 'rgba(255,150,40,0.95)');
      fg.addColorStop(1, 'rgba(230,60,20,1)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(fx - 7, by - 70);
      ctx.quadraticCurveTo(fx - 5, by - 72 - fh * 0.6, fx + Math.sin(t * 8 + i) * 3, by - 72 - fh);
      ctx.quadraticCurveTo(fx + 5, by - 72 - fh * 0.6, fx + 7, by - 70);
      ctx.fill();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(bx, by - 90, 10, bx, by - 90, 420 * fireLight);
    lg.addColorStop(0, 'rgba(255,140,50,0.35)');
    lg.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* =====================================================================
   * İKİ HAK DA GİTTİ
   * =================================================================== */
  const EXEC_LINES = [
    { who: 'boss', text: 'İki kez... İki kez her şeyi mahvettin, Red Crime.' },
    { who: 'hero', text: 'Reis... Bir şans daha ver. Bu sefer olacak, yemin ederim...' },
    { who: 'boss', text: 'Tefeci\'nin adamları yolda. Borcu ödeyemedim. Sen de, ben de bittik.' },
    { who: 'boss', text: 'Sana güvenmiştim evlat. En iyi adamım demiştim...' },
    { who: 'boss', text: 'Beceriksiz herif.' },
  ];

  RC.Scenes.execution = {
    enter() {
      this.t = 0;
      this.wiped = false;
      this.idx = 0;
      this.shown = 0;
      this.phase = 'talk';
      this.phaseT = 0;
      RC.Audio.stopAllLoops();
      RC.Audio.playMusic('busted');
      RC.Audio.fireLoop();
    },
    exit() {
      RC.Audio.stopLoop('fire');
    },
    update(dt) {
      this.t += dt;
      this.phaseT += dt;
      if (this.phase === 'talk') {
        const line = L(EXEC_LINES[this.idx].text);
        const before = Math.floor(this.shown);
        this.shown = Math.min(line.length, this.shown + dt * 30);
        if (Math.floor(this.shown) > before && Math.floor(this.shown) % 2 === 0) RC.Audio.play('blip', { pitch: EXEC_LINES[this.idx].who === 'boss' ? 0.6 : 1.3, minGap: 0.03 });
        if (I.actPressed('confirm') || I.actPressed('interact') || I.mouse.pressed) {
          if (this.shown < line.length) this.shown = line.length;
          else {
            this.idx++;
            this.shown = 0;
            if (this.idx >= EXEC_LINES.length) {
              this.phase = 'aim';
              this.phaseT = 0;
              RC.Audio.stopMusic();
              RC.Audio.play('metal', { vol: 0.4, intensity: 0.2 });
            }
          }
        }
      } else if (this.phase === 'aim') {
        if (this.phaseT > 1.6) {
          this.phase = 'shot';
          this.phaseT = 0;
          RC.Audio.play('gunshot', { vol: 1 });
          RC.Audio.stopLoop('fire', 0.05);
        }
      } else if (this.phase === 'shot') {
        if (this.phaseT > 2.2 && !this.wiped) {
          this.wiped = true;
          RC.Save.reset();
          RC.Audio.playMusic('busted');
        }
        if (this.phaseT > 3.5 && (I.anyPressed || I.mouse.pressed)) RC.Game.go('menu');
      }
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      if (this.phase === 'shot') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        if (this.phaseT < 0.08) {
          ctx.fillStyle = 'rgba(255,240,220,0.9)';
          ctx.fillRect(0, 0, w, h);
        }
        if (this.phaseT > 2.2) {
          const a = U.clamp01((this.phaseT - 2.2) / 1);
          D.text(ctx, L('OYUN BİTTİ'), w / 2, h / 2 - 20, { size: 64, font: C.FONT_TITLE, align: 'center', color: '#e8283c', alpha: a });
          D.text(ctx, L('Tefeci\'ye olan borç hiç ödenmedi. Tüm ilerleme silindi.'), w / 2, h / 2 + 30, { size: 18, align: 'center', color: '#9aa3c7', alpha: a });
          D.text(ctx, L('Her şey 1. bölümden, köprü altından yeniden başlıyor.'), w / 2, h / 2 + 58, { size: 18, align: 'center', color: '#9aa3c7', alpha: a });
          if (this.phaseT > 3.5) D.text(ctx, L(RC.T('Devam etmek için bir tuşa bas', 'Devam etmek için dokun')), w / 2, h - 60, { size: 16, align: 'center', color: '#5a6284', alpha: 0.5 + Math.sin(t * 4) * 0.5 });
        }
        return;
      }
      bridgeBackdrop(ctx, w, h, t, 1);
      const gy = h - 100;
      // Red Crime diz çökmüş
      D.character(ctx, {
        x: w * 0.38,
        y: gy - 18,
        r: 22,
        sx: 1.15,
        sy: 0.8,
        body: '#e8283c',
        facing: 1,
        balaclava: '#1c1d26', operator: true,
        eyes: this.phase === 'aim' ? 'wide' : 'open',
        mouth: 'worried',
        arms: [{ x: -14, y: -26 }, { x: 14, y: -26 }],
        sleeve: '#1d1f29',
        glove: '#2a2d3e',
        t,
      });
      // Reis
      const aim = this.phase === 'aim';
      const bossArm = aim ? { x: -50, y: -4 } : { x: -40, y: 14 };
      D.character(ctx, {
        x: w * 0.62,
        y: gy - 36,
        r: 36,
        body: '#5a4a7a',
        facing: -1,
        eyes: 'angry',
        sunglasses: false,
        mouth: 'angry',
        hat: 'fedora',
        hatColor: '#1c1c24',
        cigar: true,
        chain: true,
        arms: [bossArm, { x: 40, y: 14 }],
        sleeve: '#2a2438',
        glove: '#1a1a1a',
        armThick: 9,
        t,
      });
      if (aim) {
        ctx.save();
        ctx.translate(w * 0.62 - 50, gy - 40);
        ctx.scale(-1, 1);
        D.icon(ctx, 'gun', 0, 0, 30, '#15151a');
        ctx.restore();
        ctx.fillStyle = `rgba(0,0,0,${U.clamp01(this.phaseT / 1.6) * 0.6})`;
        ctx.fillRect(0, 0, w, h);
      }
      D.vignette(ctx, w, h, 0.8);
      if (this.phase === 'talk') {
        const ln = EXEC_LINES[this.idx];
        dialogBox(ctx, w, h, ln.who, L(ln.text), this.shown, t);
      }
    },
  };

  /* =====================================================================
   * MUTLU SON + JENERİK + İNDİRİM KODU
   * =================================================================== */
  const END_LINES = [
    { who: 'boss', text: 'Red Crime... Başardın. Tefeci\'nin borcu kapandı. Artık kimseye borcumuz yok.' },
    { who: 'hero', text: 'Köprü altından Boğaz\'a, Reis. Kim inanırdı?' },
    { who: 'boss', text: 'Ben inandım evlat. İlk günden beri. Sessiz, hızlı, temiz.' },
    { who: 'hero', text: 'Sessiz, hızlı, temiz.' },
  ];

  function makeCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = 'RC80-';
    for (let i = 0; i < 8; i++) {
      if (i === 4) s += '-';
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  }

  RC.Scenes.ending = {
    enter() {
      this.t = 0;
      this.idx = 0;
      this.shown = 0;
      this.phase = 'talk';
      this.phaseT = 0;
      this.particles = new RC.Particles(1200);
      const p = RC.Save.progress;
      p.gameCompleted = true;
      if (!p.discountCode) p.discountCode = makeCode();
      RC.Save.save();
      this.code = p.discountCode;
      RC.Audio.stopAllLoops();
      RC.Audio.playMusic('results');
      this.copied = false;
    },
    update(dt) {
      this.t += dt;
      this.phaseT += dt;
      this.particles.update(dt);
      const w = RC.Game.W;
      if (Math.random() < dt * 3) {
        const fx = U.rand(w * 0.1, w * 0.9);
        this.particles.sparks(fx, U.rand(80, 260), 40, U.pick(['#ff5060', '#ffd24a', '#4aa8ff', '#3ddc84', '#b467ff']), 260);
        RC.Audio.play('thud', { vol: 0.25, intensity: 0.3, minGap: 0.2 });
      }
      if (this.phase === 'talk') {
        const line = L(END_LINES[this.idx].text);
        const before = Math.floor(this.shown);
        this.shown = Math.min(line.length, this.shown + dt * 40);
        if (Math.floor(this.shown) > before && Math.floor(this.shown) % 2 === 0) RC.Audio.play('blip', { pitch: END_LINES[this.idx].who === 'boss' ? 0.7 : 1.3, minGap: 0.03 });
        if (I.actPressed('confirm') || I.actPressed('interact') || I.mouse.pressed) {
          if (this.shown < line.length) this.shown = line.length;
          else {
            this.idx++;
            this.shown = 0;
            if (this.idx >= END_LINES.length) {
              this.phase = 'credits';
              this.phaseT = 0;
              RC.Audio.play('win');
            }
          }
        }
      } else if (this.phase === 'credits') {
        if (this.phaseT > 18 || (this.phaseT > 1 && (I.actPressed('confirm') || I.mouse.pressed))) {
          this.phase = 'gift';
          this.phaseT = 0;
          RC.Audio.play('star');
          RC.Audio.play('bigcash');
          this.particles.confetti(w / 2, 120, 160, w);
        }
      } else if (this.phase === 'gift') {
        // Kod kutusu: ekranın ortasının 30 px üstünde, 400x64 (render ile aynı)
        const onCode = I.mouse.pressed && I.hover(w / 2 - 200, RC.Game.H / 2 - 36, 400, 64);
        if ((I.wasPressed('KeyC') || onCode) && navigator.clipboard) {
          navigator.clipboard.writeText(this.code).then(
            () => (this.copied = true),
            () => {}
          );
        }
        if (this.phaseT > 1.5 && (I.wasPressed('Enter') || I.wasPressed('Escape') || (I.mouse.pressed && !onCode))) RC.Game.go('menu');
      }
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      // Gündoğumunda Boğaz
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a1440');
      g.addColorStop(0.45, '#8a3a5a');
      g.addColorStop(0.7, '#f0a060');
      g.addColorStop(1, '#2a3a6a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      U.circle(ctx, w * 0.72, h * 0.62, 70, 'rgba(255,220,150,0.9)');
      // Karşı kıyı ve köprü
      ctx.fillStyle = '#2a2040';
      ctx.fillRect(0, h * 0.6, w, 20);
      ctx.strokeStyle = '#3a2a50';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55);
      ctx.quadraticCurveTo(w / 2, h * 0.7, w, h * 0.55);
      ctx.stroke();
      for (let i = 0; i < 20; i++) U.line(ctx, (w * i) / 20, h * 0.55 + Math.sin((i / 20) * Math.PI) * h * 0.08, (w * i) / 20, h * 0.6);
      // Deniz
      const sea = ctx.createLinearGradient(0, h * 0.62, 0, h);
      sea.addColorStop(0, '#3a4a8a');
      sea.addColorStop(1, '#1a2040');
      ctx.fillStyle = sea;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      ctx.fillStyle = 'rgba(255,220,150,0.35)';
      for (let i = 0; i < 12; i++) ctx.fillRect(w * 0.72 - 60 + Math.sin(t * 2 + i) * 20, h * 0.66 + i * 12, 120 - i * 8, 2);
      // Yalı balkonu
      const by = h * 0.72;
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(w * 0.08, by - 220, w * 0.42, 220);
      ctx.fillStyle = '#5a2a22';
      U.poly(ctx, [w * 0.05, by - 220, w * 0.29, by - 300, w * 0.53, by - 220]);
      ctx.fillStyle = '#6b3f22';
      ctx.fillRect(w * 0.08, by - 6, w * 0.42, 10);
      for (let x = w * 0.09; x < w * 0.5; x += 14) ctx.fillRect(x, by - 40, 4, 36);
      ctx.fillRect(w * 0.08, by - 44, w * 0.42, 6);
      // Karakterler
      D.character(ctx, { x: w * 0.22, y: by - 64, r: 36, body: '#5a4a7a', facing: 1, sunglasses: true, mouth: 'grin', hat: 'fedora', hatColor: '#1c1c24', cigar: true, chain: true, arms: [{ x: -40, y: 14 }, { x: 44, y: -20 }], sleeve: '#2a2438', glove: '#1a1a1a', armThick: 9, t });
      D.character(ctx, { x: w * 0.36, y: by - 50, r: 24, body: '#e8283c', facing: -1, balaclava: '#1c1d26', operator: true, mouth: 'grin', arms: [{ x: -30, y: -30 }, { x: 30, y: -30 }], sleeve: '#1d1f29', glove: '#2a2d3e', t });
      this.particles.render(ctx, null);

      if (this.phase === 'talk') {
        const ln = END_LINES[this.idx];
        dialogBox(ctx, w, h, ln.who, L(ln.text), this.shown, t);
        return;
      }
      ctx.fillStyle = 'rgba(5,6,15,0.7)';
      ctx.fillRect(0, 0, w, h);
      if (this.phase === 'credits') {
        const credits = [
          ['title', L('TEBRİKLER! OYUNU KAZANDIN!')],
          ['text', L('Red Crime ve Reis köprü altından Boğaz\'daki yalıya taşındı.')],
          ['gap', ''],
          ['logo', ''],
          ['gap', ''],
          ['head', L('GELİŞTİRİCİ')],
          ['text', C.DEVELOPER],
          ['head', L('OYUN TASARIMI · PROGRAMLAMA · GRAFİK · SES')],
          ['text', C.DEVELOPER],
          ['head', L('BAŞROLDE')],
          ['text', L('Red Crime — sessiz, hızlı, temiz')],
          ['text', L('Reis — köprünün efendisi')],
          ['text', L('Hacker · Gözcü · Şoför · Dikkat Dağıtıcı')],
          ['gap', ''],
          ['title2', L('Oyunumuzu oynadığınız için teşekkür ederiz!')],
        ];
        let y = h + 40 - this.phaseT * 70;
        for (const [kind, txt] of credits) {
          if (kind === 'gap') {
            y += 40;
            continue;
          }
          if (kind === 'logo') {
            RC.drawLogo(ctx, w / 2, y, 70, t, { appear: 1, slash: 1 });
            y += 90;
            continue;
          }
          const size = kind === 'title' ? 38 : kind === 'title2' ? 28 : kind === 'head' ? 14 : 20;
          D.text(ctx, txt, w / 2, y, { size, font: kind.startsWith('title') ? C.FONT_TITLE : C.FONT_UI, align: 'center', color: kind === 'head' ? '#ffc83d' : '#ffffff', weight: kind === 'head' ? 'bold' : '' });
          y += size + 22;
        }
        D.text(ctx, L(RC.T('ENTER: geç', 'Dokun: geç')), w - 20, h - 16, { size: 12, align: 'right', color: '#9aa3c7' });
        return;
      }
      // Hediye
      const k = U.ease.outBack(U.clamp01(this.phaseT / 0.8));
      ctx.save();
      ctx.translate(w / 2, h / 2 - 30);
      ctx.scale(k, k);
      D.panel(ctx, -330, -170, 660, 340, { accent: '#ffd24a' });
      D.text(ctx, L('Oyunumuzu oynadığınız için teşekkür ederiz!'), 0, -120, { size: 22, font: C.FONT_TITLE, align: 'center', color: '#ffffff' });
      D.text(ctx, L('Oyunumuzu bitirdiğiniz için bir sonraki oyunumuzda'), 0, -76, { size: 17, align: 'center', color: '#dfe3f5' });
      D.text(ctx, L('%80 İNDİRİM KAZANDINIZ!'), 0, -34, { size: 36, font: C.FONT_TITLE, align: 'center', color: '#ffd24a', stroke: '#000', strokeW: 5 });
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      U.fillRoundRect(ctx, -200, -6, 400, 64, 10);
      ctx.strokeStyle = '#ffd24a';
      ctx.setLineDash([8, 5]);
      ctx.lineWidth = 2;
      U.strokeRoundRect(ctx, -200, -6, 400, 64, 10);
      ctx.setLineDash([]);
      D.text(ctx, this.code, 0, 36, { size: 30, font: C.FONT_MONO, align: 'center', color: '#3ddc84' });
      D.text(ctx, L('İndirim kodunu kaybetmeyin!'), 0, 94, { size: 17, align: 'center', color: '#ff8c2e', weight: 'bold' });
      D.text(ctx, this.copied ? L('Kopyalandı ✓') : L(RC.T('C: kodu kopyala · ENTER: ana menü', 'Koda dokun: kopyala · Başka yere dokun: ana menü')), 0, 132, { size: 13, align: 'center', color: '#9aa3c7' });
      ctx.restore();
      this.particles.render(ctx, null);
    },
  };
})(window.RC);
