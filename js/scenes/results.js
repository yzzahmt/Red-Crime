/* =========================================================================
 *  RED CRIME - Sonuç ekranı ve Yakalanma ekranı
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const UI = RC.UI;

  /* =====================================================================
   * SONUÇ
   * =================================================================== */
  RC.Scenes.results = {
    enter(p) {
      this.p = p;
      this.cfg = C.LEVELS[p.level];
      this.t = 0;
      this.countDone = false;
      this.celebrated = false;
      this.counter = 0;
      this.starsShown = 0;
      this.doubled = false;
      this.watching = false;
      this.leaving = false;
      this.particles = new RC.Particles(800);
      this.res = RC.Save.recordHeist(p.level, p.value, p.stars, p.items.length, p.stats.safeOpened);
      // Soygun notu: en iyisi kaydedilir, ilk S'de ödül
      this.rank = RC.Rank.compute(p);
      this.rankRes = this.rank.grade ? RC.Rank.record(p.level, this.rank.idx) : { newBest: false, reward: 0 };
      this.stampAt = -1;
      this.sorted = p.items.slice().sort((a, b) => b.value - a.value);
      this.final = !!this.cfg.final && p.stars > 0;
      this.finalFail = !!this.cfg.final && p.stars === 0;
      if (this.finalFail) {
        RC.Save.progress.finalAttempts = (RC.Save.progress.finalAttempts || 0) + 1;
        RC.Save.save();
        this.attemptsLeft = C.FINAL_ATTEMPTS - RC.Save.progress.finalAttempts;
      }
      RC.Audio.playMusic(p.stars > 0 ? 'results' : 'busted');
      this.build();
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const y = h - 84;
      const hasNext = this.p.level + 1 < C.LEVELS.length && RC.Save.progress.unlocked > this.p.level + 1;
      if (this.final || (this.finalFail && this.attemptsLeft <= 0)) {
        const fin = this.final;
        this.menu = new UI.Menu([
          new UI.Button({ x: w / 2 - 170, y, w: 340, h: 56, label: fin ? 'FİNALİ İZLE' : '...', icon: 'play', primary: true, onClick: () => RC.Game.go(fin ? 'ending' : 'execution') }),
        ]);
        return;
      }
      const btns = [];
      this.btnDouble = null;
      // Sonuç ekranından çıkarken ara sıra tam ekran reklam (premium'da yok)
      const leave = (fn) => () => {
        if (this.leaving) return;
        this.leaving = true;
        // Az önce ödüllü reklam izlediyse üstüne bir de tam ekran reklam gösterme
        if (this.doubled) fn();
        else RC.Ads.maybeInterstitial().then(fn, fn);
      };
      btns.push(new UI.Button({ x: w / 2 - 470, y, w: 290, h: 56, label: 'BÖLÜM SEÇ', icon: 'map', onClick: leave(() => RC.Game.go('levelselect', { select: this.p.level })) }));
      btns.push(new UI.Button({ x: w / 2 - 145, y, w: 290, h: 56, label: 'TEKRAR OYNA', icon: 'retry', onClick: leave(() => RC.Game.go('briefing', { level: this.p.level })) }));
      btns.push(
        new UI.Button({
          x: w / 2 + 180,
          y,
          w: 290,
          h: 56,
          label: hasNext ? 'SONRAKİ BÖLÜM' : 'ANA MENÜ',
          icon: hasNext ? 'play' : 'home',
          primary: true,
          onClick: leave(() => (hasNext ? RC.Game.go('briefing', { level: this.p.level + 1 }) : RC.Game.go('menu'))),
        })
      );
      // Ödüllü reklam: izle, bu soygunun parasını ikiye katla (bir kez)
      if (this.p.value > 0 && !this.doubled && RC.Ads.canReward()) {
        this.btnDouble = new UI.Button({
          x: w / 2 - 170,
          y: y - 66,
          w: 340,
          h: 54,
          label: RC.L('2X PARA · REKLAM İZLE'),
          sub: '+' + U.formatMoney(this.p.value),
          icon: 'play',
          fontSize: 17,
          onClick: () => this.watchDouble(),
        });
        btns.push(this.btnDouble);
      }
      this.menu = new UI.Menu(btns);
      this.menu.focus = 2;
    },
    async watchDouble() {
      if (this.doubled || this.watching) return;
      this.watching = true;
      const ok = await RC.Ads.showRewarded();
      this.watching = false;
      if (!ok) {
        RC.Audio.play('uiError');
        return;
      }
      this.doubled = true;
      RC.Save.progress.wallet += this.p.value;
      RC.Save.save();
      RC.Audio.play('bigcash');
      this.particles.confetti(RC.Game.W / 2, 200, 80, 400);
      this.build();
    },
    update(dt) {
      this.t += dt;
      RC.MenuBG.update(dt);
      this.particles.update(dt);
      const p = this.p;
      // Para sayacı
      if (this.t > 0.8) {
        const before = this.counter;
        this.counter = Math.min(p.value, this.counter + Math.max(p.value * dt * 0.6, 900 * dt));
        if (Math.floor(before / 500) !== Math.floor(this.counter / 500)) RC.Audio.play('coin', { vol: 0.35, minGap: 0.05 });
        if (this.counter >= p.value && !this.countDone) {
          this.countDone = true;
          this.countDoneT = this.t;
          RC.Audio.play('cash');
        }
      }
      // Yıldızlar
      // Not mührü: yıldızlardan sonra "vurulur"
      if (this.countDone && this.rank.grade && this.stampAt < 0 && this.starsShown >= p.stars && this.t - this.countDoneT > 0.55 + p.stars * 0.45) {
        this.stampAt = this.t;
        RC.Audio.play('thud', { vol: 1, intensity: 0.8 });
        if (this.rank.grade === 'S') {
          RC.Audio.play('win', { vol: 0.7 });
          this.particles.confetti(RC.Game.W / 2 + 330, 120, 60, 200);
        } else RC.Audio.play('star', { pitch: 0.8 });
      }
      if (this.countDone && this.starsShown < p.stars && this.t - this.countDoneT > 0.3 + this.starsShown * 0.45) {
        this.starsShown++;
        RC.Audio.play('star', { pitch: 1 + this.starsShown * 0.12 });
        this.particles.confetti(RC.Game.W / 2, 200, 40, 300);
      }
      if (this.countDone && this.starsShown >= p.stars && !this.celebrated && p.stars > 0) {
        this.celebrated = true;
        if (this.final) {
          RC.Audio.play('win');
          this.particles.confetti(RC.Game.W / 2, 100, 150, RC.Game.W);
        }
      }
      // Ödüllü reklam sonradan yüklendiyse düğmeyi ekle
      if (!this.btnDouble && !this.doubled && this.p.value > 0 && this.menu && this.menu.widgets.length === 3 && RC.Ads.canReward()) this.build();
      if (I.anyPressed && !this.countDone) {
        this.counter = p.value;
      }
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const p = this.p;
      RC.MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.7)';
      ctx.fillRect(0, 0, w, h);
      const ok = p.stars > 0;
      const title = p.leftBehind ? 'KAMYON SENSİZ GİTTİ!' : ok ? 'SOYGUN BAŞARILI!' : 'SÖZLEŞME FESHEDİLDİ';
      const k = U.ease.outBack(U.clamp01(t / 0.6));
      ctx.save();
      ctx.translate(w / 2, 70);
      ctx.scale(k, k);
      D.text(ctx, title, 0, 0, { size: 44, font: C.FONT_TITLE, align: 'center', color: ok ? C.COLORS.gold : '#ff5060', stroke: '#000', strokeW: 7 });
      ctx.restore();
      D.text(ctx, RC.L(this.cfg.name), w / 2, 100, { size: 16, align: 'center', color: '#9aa3c7' });
      // Yıldızlar
      for (let i = 0; i < 3; i++) {
        const sx = w / 2 + (i - 1) * 76;
        const got = i < this.starsShown;
        const big = got ? 1 + Math.max(0, 0.4 - (t - this.countDoneT - 0.3 - i * 0.45)) : 1;
        D.icon(ctx, got ? 'star' : 'starEmpty', sx, 150 - (i === 1 ? 10 : 0), 56 * big, got ? C.COLORS.gold : 'rgba(255,255,255,0.25)');
      }
      // Para
      D.text(ctx, U.formatMoney(this.counter), w / 2, 238, { size: 52, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold, stroke: '#000', strokeW: 6 });
      if (this.doubled) D.text(ctx, RC.L('2X PARA!'), w / 2 - 230, 214, { size: 18, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold });
      if (this.res.newBest && this.countDone) {
        const a = 0.7 + Math.sin(t * 6) * 0.3;
        D.text(ctx, 'YENİ REKOR!', w / 2 + 230, 214, { size: 18, font: C.FONT_TITLE, align: 'center', color: '#3ddc84', alpha: a });
      }
      // Not mührü + kriterler
      if (this.rank.grade && this.stampAt >= 0) {
        const g = this.rank.grade;
        const col = RC.Rank.COLORS[g];
        const k = U.clamp01((t - this.stampAt) / 0.22);
        const sc = 2.6 - 1.6 * U.ease.outCubic(k);
        const rx = w / 2 + 330;
        const ry = 118;
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(-0.12);
        ctx.scale(sc, sc);
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 42, 0, U.TAU);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, U.TAU);
        ctx.stroke();
        ctx.fillStyle = U.rgba(col, 0.12);
        ctx.fill();
        D.text(ctx, g, 0, 22, { size: 64, font: C.FONT_TITLE, align: 'center', color: col, stroke: '#000', strokeW: 4 });
        ctx.restore();
        const a = U.clamp01((t - this.stampAt - 0.3) / 0.4);
        ctx.globalAlpha = a;
        D.text(ctx, RC.L('NOT · {s}/100', { s: this.rank.score }), rx, ry + 62, { size: 13, align: 'center', color: '#9aa3c7', weight: 'bold' });
        this.rank.checks.forEach((c, i) => {
          const cy = ry + 82 + i * 16;
          D.text(ctx, c.ok ? '✓' : '✗', rx - 92, cy, { size: 13, color: c.ok ? '#3ddc84' : '#ff5060', weight: 'bold' });
          D.text(ctx, RC.L(c.label), rx - 78, cy, { size: 12, color: c.ok ? '#dfe3f5' : '#7a829e' });
        });
        if (this.rankRes.reward) {
          const pa = 0.75 + Math.sin(t * 6) * 0.25;
          D.text(ctx, RC.L('İLK S ÖDÜLÜ +{v}', { v: U.formatShortMoney(this.rankRes.reward) }), w / 2 - 330, 128, { size: 20, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold, alpha: pa * a });
        } else if (this.rankRes.newBest && RC.Rank.best(p.level) !== 'D') {
          D.text(ctx, RC.L('YENİ EN İYİ NOT'), w / 2 - 330, 128, { size: 18, font: C.FONT_TITLE, align: 'center', color: col, alpha: a });
        }
        ctx.globalAlpha = 1;
      }
      // Eşeyler listesi
      const lw = Math.min(520, w * 0.44);
      const lx = w / 2 - lw - 20;
      const ly = 272;
      const lh = h - ly - 110;
      D.panel(ctx, lx, ly, lw, lh, { accent: C.COLORS.gold });
      D.text(ctx, RC.L('KAMYONDAKİ GANİMET ({n} parça)', { n: p.items.length }), lx + 16, ly + 28, { size: 15, weight: 'bold', color: '#dfe3f5' });
      const rows = Math.floor((lh - 48) / 32);
      this.sorted.slice(0, rows).forEach((it, i) => {
        const ry = ly + 44 + i * 32;
        const appear = U.clamp01((t - 0.6 - i * 0.08) / 0.3);
        ctx.globalAlpha = appear;
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(lx + 8, ry, lw - 16, 30);
        const sc = Math.min(1, 24 / Math.max(it.w, it.h));
        it.drawAt(ctx, lx + 28, ry + 15, sc);
        D.text(ctx, it.name, lx + 50, ry + 20, { size: 14, color: it.rarity.color, weight: 'bold' });
        D.text(ctx, U.formatMoney(it.value), lx + lw - 18, ry + 20, { size: 14, align: 'right', color: C.COLORS.gold, weight: 'bold' });
        ctx.globalAlpha = 1;
      });
      if (!p.items.length) D.text(ctx, 'Kamyon bomboş... Reis hiç memnun olmayacak.', lx + lw / 2, ly + lh / 2, { size: 15, align: 'center', color: '#9aa3c7' });
      if (p.items.length > rows) D.text(ctx, RC.L('+{n} eşya daha', { n: p.items.length - rows }), lx + lw - 18, ly + lh - 10, { size: 12, align: 'right', color: '#9aa3c7' });

      // İstatistikler
      const sx = w / 2 + 20;
      D.panel(ctx, sx, ly, lw, lh, { accent: '#4aa8ff' });
      D.text(ctx, 'İSTATİSTİKLER', sx + 16, ly + 28, { size: 15, weight: 'bold', color: '#dfe3f5' });
      const st = p.stats;
      const stats = [
        ['clock', 'Geçen süre', U.formatTime(p.timeUsed)],
        ['trophy', 'Hedef', U.formatMoney(this.cfg.target)],
        ['money', 'Evdeki toplam değer', U.formatShortMoney(p.total)],
        ['safe', 'Kasa', st.safeOpened ? 'AÇILDI ✓' : st.keyFound ? 'Anahtar bulundu' : 'Açılmadı'],
        ['zzz', 'Uyandırma sayısı', String(st.woken)],
        ['eye', 'Görülme', String(st.spotted)],
        ['star', 'En iyi kombo', st.bestCombo > 1 ? 'x' + st.bestCombo + (st.comboBonus ? ' (+' + U.formatShortMoney(st.comboBonus) + ')' : '') : '—'],
        ['fragile', 'Kırılan eşya', st.broken ? `${st.broken} (-${U.formatShortMoney(st.brokenValue)})` : RC.L('Yok ✓')],
        ['bag', 'Geride kalan', p.lostValue ? U.formatMoney(p.lostValue) : p.bagValue ? U.formatMoney(p.bagValue) + ' (çuvalda)' : '—'],
      ];
      stats.forEach((s, i) => {
        const ry = ly + 58 + i * Math.min(34, (lh - 70) / stats.length);
        D.icon(ctx, s[0], sx + 28, ry - 5, 18, '#8fb7ff');
        D.text(ctx, s[1], sx + 48, ry, { size: 14, color: '#9aa3c7' });
        D.text(ctx, s[2], sx + lw - 18, ry, { size: 14, align: 'right', color: '#f2f4ff', weight: 'bold' });
      });
      if (this.res.unlockedNext && this.countDone) {
        D.text(ctx, '🔓 Yeni bölüm açıldı!', sx + lw / 2, ly + lh - 14, { size: 15, align: 'center', color: '#3ddc84', weight: 'bold' });
      }
      if (this.final && this.celebrated) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, h / 2 - 50, w, 100);
        D.text(ctx, 'TEBRİKLER! Köprü altından yalıya taşındınız!', w / 2, h / 2 + 10, { size: 26, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold, stroke: '#000', strokeW: 5, alpha: U.clamp01((t - this.countDoneT - 1.5) / 0.5) });
      }
      if (!ok) {
        const msg = p.leftBehind && !(this.finalFail && this.attemptsLeft <= 0)
          ? RC.L('Reis: "Kamyonu kaçırdın Red Crime. Ekip kimseyi beklemez; bu iş sayılmaz."')
          : this.finalFail
          ? this.attemptsLeft > 0
            ? RC.L('Reis: "Hedefi tutturamadın. Bir hakkın kaldı Red Crime. SON hakkın."')
            : RC.L('Reis: "İkinci kez... Köprü altına gel. Konuşacağız."')
          : RC.L('Reis: "En az {v} demiştim. Bu işin parası yatmaz, sözleşme feshedildi."', { v: U.formatMoney(this.cfg.target) });
        D.text(ctx, msg, w / 2, h - 104, { size: 15, align: 'center', color: '#ff8c2e', weight: 'bold' });
      }
      this.particles.render(ctx, null);
      this.menu.draw(ctx, t);
    },
  };

  /* =====================================================================
   * YAKALANDIN
   * =================================================================== */
  RC.Scenes.busted = {
    enter(p) {
      this.p = p;
      this.t = 0;
      this.cfg = C.LEVELS[p.level];
      this.finalFail = !!this.cfg.final;
      if (this.finalFail) {
        RC.Save.progress.finalAttempts = (RC.Save.progress.finalAttempts || 0) + 1;
        RC.Save.save();
        this.attemptsLeft = C.FINAL_ATTEMPTS - RC.Save.progress.finalAttempts;
      }
      RC.Audio.playMusic('busted');
      RC.Audio.play('siren', { vol: 0.7 });
      this.sirenT = 1.2;
      this.build();
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const y = h - 90;
      if (this.finalFail && this.attemptsLeft <= 0) {
        this.menu = new UI.Menu([new UI.Button({ x: w / 2 - 170, y, w: 340, h: 56, label: '...', icon: 'play', primary: true, onClick: () => RC.Game.go('execution') })]);
        return;
      }
      this.menu = new UI.Menu([
        new UI.Button({ x: w / 2 - 470, y, w: 290, h: 56, label: 'ANA MENÜ', icon: 'home', onClick: () => RC.Game.go('menu') }),
        new UI.Button({ x: w / 2 - 145, y, w: 290, h: 56, label: 'BÖLÜM SEÇ', icon: 'map', onClick: () => RC.Game.go('levelselect', { select: this.p.level }) }),
        new UI.Button({ x: w / 2 + 180, y, w: 290, h: 56, label: 'TEKRAR DENE', icon: 'retry', primary: true, onClick: () => RC.Game.go(this.cfg.planning ? 'planning' : 'heist', { level: this.p.level }) }),
      ]);
      this.menu.focus = 2;
    },
    update(dt) {
      this.t += dt;
      this.sirenT -= dt;
      if (this.sirenT <= 0 && this.t < 6) {
        this.sirenT = 1.2;
        RC.Audio.play('siren', { vol: 0.4 });
      }
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      // Polis ışıkları
      const k = Math.floor(t * 4) % 2;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, k ? '#3a0a14' : '#0a1440');
      g.addColorStop(0.5, '#07080f');
      g.addColorStop(1, k ? '#0a1440' : '#3a0a14');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Parmaklıklar arkasında Red Crime
      const cx = w / 2;
      const cy = h * 0.46;
      D.character(ctx, {
        x: cx,
        y: cy,
        r: 60,
        body: '#e8283c',
        facing: 1,
        balaclava: '#1c1d26', operator: true,
        eyes: 'open',
        mouth: 'worried',
        look: { x: Math.sin(t) * 0.4, y: 0.3 },
        arms: [{ x: -50, y: -20 }, { x: 50, y: -20 }],
        sleeve: '#1d1f29',
        glove: '#2a2d3e',
        t,
      });
      // Parmaklıklar (düşerek gelir)
      const drop = U.ease.outBounce(U.clamp01(t / 0.9));
      const by = -h + drop * h;
      ctx.fillStyle = '#6a707c';
      for (let i = -4; i <= 4; i++) {
        const x = cx + i * 34;
        ctx.fillRect(x - 5, by + cy - 150, 10, 300);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x - 4, by + cy - 150, 3, 300);
        ctx.fillStyle = '#6a707c';
      }
      ctx.fillRect(cx - 160, by + cy - 160, 320, 16);
      ctx.fillRect(cx - 160, by + cy + 140, 320, 16);
      if (t > 0.8 && t < 0.95) RC.Audio.play('metal', { intensity: 1, minGap: 1 });
      D.text(ctx, 'YAKALANDIN!', w / 2, 90, { size: 60, font: C.FONT_TITLE, align: 'center', color: '#ff3043', stroke: '#000', strokeW: 8 });
      const reason = this.p.police ? RC.L('Polis kapıya dayandı!') : RC.L('{n} seni suçüstü yakaladı!', { n: RC.L(this.p.by) });
      D.text(ctx, reason, w / 2, 130, { size: 20, align: 'center', color: '#dfe3f5' });
      if (this.p.value > 0) D.text(ctx, RC.L('Kamyondaki {v} de el konuldu...', { v: U.formatMoney(this.p.value) }), w / 2, h * 0.46 + 190, { size: 17, align: 'center', color: '#9aa3c7' });
      D.text(ctx, RC.Config.HINTS[Math.floor(t / 4) % RC.Config.HINTS.length], w / 2, h * 0.46 + 222, { size: 15, align: 'center', color: '#8fb7ff' });
      if (this.finalFail) {
        D.text(ctx, this.attemptsLeft > 0 ? RC.L('Son hakkın kaldı. Reis sabırsızlanıyor...') : RC.L('Hiç hakkın kalmadı. Reis seni köprü altında bekliyor.'), w / 2, h * 0.46 + 250, { size: 18, align: 'center', color: '#ff5060', weight: 'bold' });
      }
      D.vignette(ctx, w, h, 0.7);
      this.menu.draw(ctx, t);
    },
  };
})(window.RC);
