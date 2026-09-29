/* =========================================================================
 *  RED CRIME - MAĞAZA (gerçek parayla oyun parası ve premium)
 *  Satın alma RC.IAP üzerinden Google Play / App Store ile yapılır.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const UI = RC.UI;
  const M = C.MONETIZATION;
  const L = (s, v) => RC.L(s, v);

  const PERKS = [
    ['cross', 'Reklamsız oyun'],
    ['clock', 'Her soygunda +60 saniye'],
    ['bag', 'Çuvalda +10 yuva'],
    ['money', 'Her gün {v} hediye'],
  ];

  RC.Scenes.store = {
    enter(params) {
      this.params = params || {};
      this.t = 0;
      this.msg = null;
      this.particles = new RC.Particles(400);
      this.build();
    },
    onResize() {
      this.build();
    },
    back() {
      RC.Game.go(this.params.back || 'menu', this.params.backParams || {});
    },
    say(text, color) {
      this.msg = { text, color: color || '#dfe3f5', t: 3 };
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const items = [];
      // Premium kartı (solda, büyük)
      const pw = Math.min(420, w * 0.4);
      const cw = Math.min(360, w * 0.36);
      const gap = 30;
      const x0 = w / 2 - (pw + gap + cw) / 2;
      const y0 = 140;
      const prem = new UI.Widget({ x: x0, y: y0, w: pw, h: 380 });
      prem.activate = () => this.buyPremium(prem);
      prem.draw = (ctx, t) => this.drawPremium(ctx, prem, t);
      items.push(prem);
      // Para paketleri (sağda, alt alta)
      const ch = 112;
      M.CASH_PACKS.forEach((pack, i) => {
        const b = new UI.Widget({ x: x0 + pw + gap, y: y0 + i * (ch + 22), w: cw, h: ch, pack, idx: i });
        b.activate = () => this.buyCash(pack, b);
        b.draw = (ctx, t) => this.drawPack(ctx, b, t);
        items.push(b);
      });
      const by = h - 84;
      items.push(new UI.Button({ x: w / 2 - 320, y: by, w: 300, h: 56, label: 'GERİ YÜKLE', icon: 'retry', fontSize: 17, onClick: () => this.restore() }));
      items.push(new UI.Button({ x: w / 2 + 20, y: by, w: 300, h: 56, label: 'GERİ', icon: 'back', back: true, primary: true, onClick: () => this.back() }));
      this.menu = new UI.Menu(items);
      this.menu.focus = 0;
    },

    unavailable() {
      if (RC.IAP.available) return false;
      RC.Audio.play('uiError');
      this.say(L('Mağaza yalnızca Android / iOS uygulamasında açık.'), '#ff8c2e');
      return true;
    },
    async buyCash(pack, b) {
      if (this.unavailable()) return;
      this.say(L('Ödeme ekranı açılıyor...'));
      const r = await RC.IAP.buyCash(pack);
      this.result(r, b, L('{m} hesabına eklendi!', { m: U.formatMoney(pack.money) }));
    },
    async buyPremium(b) {
      if (RC.Premium.active) {
        this.say(L('Premium zaten açık.'), '#3ddc84');
        return;
      }
      if (this.unavailable()) return;
      this.say(L('Ödeme ekranı açılıyor...'));
      const r = await RC.IAP.buyPremium();
      this.result(r, b, L('Premium açıldı! Reklamlar kaldırıldı.'));
      if (r === 'ok') {
        const d = RC.IAP.claimDaily();
        if (d) this.say(L('Premium açıldı! Günlük hediye: {m}', { m: U.formatMoney(d) }), C.COLORS.gold);
      }
    },
    result(r, b, okText) {
      if (r === 'ok') {
        RC.Audio.play('bigcash');
        RC.Audio.play('win');
        this.particles.confetti(b.x + b.w / 2, b.y + 20, 80, b.w);
        this.say(okText, C.COLORS.gold);
      } else if (r === 'pending') {
        this.say(L('Ödeme onay bekliyor. Tamamlanınca oyunu yeniden aç.'), '#ffc83d');
      } else if (r === 'cancel') {
        this.say(L('Satın alma iptal edildi.'), '#9aa3c7');
      } else {
        RC.Audio.play('uiError');
        this.say(L('Satın alma tamamlanamadı. Tekrar dene.'), '#ff5060');
      }
    },
    async restore() {
      if (this.unavailable()) return;
      this.say(L('Satın alımlar kontrol ediliyor...'));
      const found = await RC.IAP.restore();
      this.say(found ? L('Premium geri yüklendi!') : L('Geri yüklenecek satın alım bulunamadı.'), found ? '#3ddc84' : '#9aa3c7');
    },

    drawPremium(ctx, b, t) {
      const hv = b.hoverT;
      const owned = RC.Premium.active;
      D.panel(ctx, b.x, b.y, b.w, b.h, { accent: C.COLORS.gold, border: U.rgba('#ffc83d', 0.3 + hv * 0.6) });
      // Parıltı
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 120);
      g.addColorStop(0, 'rgba(255,200,61,0.22)');
      g.addColorStop(1, 'rgba(255,200,61,0)');
      ctx.fillStyle = g;
      U.fillRoundRect(ctx, b.x + 2, b.y + 2, b.w - 4, 120, 12);
      const bob = Math.sin(t * 2.4) * 3;
      D.icon(ctx, 'star', b.x + b.w / 2, b.y + 54 + bob, 54, C.COLORS.gold);
      D.text(ctx, 'PREMIUM', b.x + b.w / 2, b.y + 118, { size: 34, font: C.FONT_TITLE, align: 'center', color: C.COLORS.gold, stroke: '#000', strokeW: 5 });
      PERKS.forEach((pk, i) => {
        const y = b.y + 156 + i * 40;
        U.circle(ctx, b.x + 44, y, 15, 'rgba(255,255,255,0.08)');
        D.icon(ctx, pk[0], b.x + 44, y, 18, '#fff');
        D.text(ctx, L(pk[1], { v: U.formatMoney(M.DAILY_BONUS) }), b.x + 72, y + 6, { size: 17, weight: 'bold', color: '#f2f4ff' });
      });
      // Fiyat / düğme
      const bw = b.w - 60;
      const bx = b.x + 30;
      const by = b.y + b.h - 70;
      ctx.fillStyle = owned ? 'rgba(61,220,132,0.2)' : U.mix('#b01828', '#e8283c', hv);
      U.fillRoundRect(ctx, bx, by, bw, 50, 12);
      const label = owned ? L('SAHİPSİN') + ' ✓' : L('SATIN AL · {p}', { p: RC.IAP.price(M.PREMIUM.id, M.PREMIUM.price) });
      D.text(ctx, label, b.x + b.w / 2, by + 33, { size: 20, font: C.FONT_TITLE, align: 'center', color: owned ? '#3ddc84' : '#fff' });
      D.text(ctx, L('Tek seferlik ödeme'), b.x + b.w / 2, b.y + b.h - 8, { size: 12, align: 'center', color: '#9aa3c7' });
    },

    drawPack(ctx, b, t) {
      const hv = b.hoverT;
      const pack = b.pack;
      const best = b.idx === M.CASH_PACKS.length - 1;
      D.panel(ctx, b.x, b.y, b.w, b.h, { accent: best ? C.COLORS.gold : '#3ddc84', border: U.rgba('#8fb7ff', 0.15 + hv * 0.6) });
      // Para destesi
      const n = b.idx + 1;
      for (let i = 0; i < n + 1; i++) {
        const sx = b.x + 30 + i * 9;
        const sy = b.y + b.h / 2 - 10 - i * 5;
        U.fillRoundRect(ctx, sx, sy, 50, 26, 4, i % 2 ? '#4f9a5a' : '#63b36f');
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        U.strokeRoundRect(ctx, sx, sy, 50, 26, 4);
        U.circle(ctx, sx + 25, sy + 13, 7, 'rgba(255,255,255,0.35)');
      }
      D.text(ctx, U.formatMoney(pack.money), b.x + 118, b.y + 50, { size: 26, font: C.FONT_TITLE, color: C.COLORS.gold, stroke: '#000', strokeW: 4 });
      D.text(ctx, L('oyun parası'), b.x + 118, b.y + 72, { size: 13, color: '#9aa3c7' });
      if (best) D.text(ctx, L('EN İYİ TEKLİF'), b.x + b.w - 14, b.y + 22, { size: 12, weight: 'bold', align: 'right', color: C.COLORS.gold, alpha: 0.7 + Math.sin(t * 5) * 0.3 });
      const price = RC.IAP.price(pack.id, pack.price);
      const pw = 110;
      const px = b.x + b.w - pw - 14;
      const py = b.y + b.h - 46;
      U.fillRoundRect(ctx, px, py, pw, 34, 9, U.mix('#b01828', '#e8283c', hv));
      D.text(ctx, price, px + pw / 2, py + 24, { size: 17, font: C.FONT_TITLE, align: 'center', color: '#fff' });
    },

    update(dt) {
      this.t += dt;
      RC.MenuBG.update(dt);
      this.particles.update(dt);
      if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        this.back();
        return;
      }
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      RC.MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.65)';
      ctx.fillRect(0, 0, w, h);
      D.text(ctx, 'MAĞAZA', w / 2, 72, { size: 44, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      D.text(ctx, 'Ekipman parası ya da premium: soygunu kolaylaştır.', w / 2, 104, { size: 15, align: 'center', color: '#9aa3c7' });
      D.panel(ctx, w - 260, 36, 230, 48, { r: 10 });
      D.icon(ctx, 'money', w - 236, 60, 22, C.COLORS.gold);
      D.text(ctx, U.formatMoney(RC.Save.progress.wallet), w - 216, 68, { size: 20, font: C.FONT_TITLE, color: C.COLORS.gold });
      this.menu.draw(ctx, this.t);
      if (this.msg) {
        const a = Math.min(1, this.msg.t * 2);
        D.text(ctx, this.msg.text, w / 2, h - 104, { size: 17, weight: 'bold', align: 'center', color: this.msg.color, alpha: a, stroke: 'rgba(0,0,0,0.8)', strokeW: 4 });
      }
      this.particles.render(ctx, null);
    },
  };
})(window.RC);
