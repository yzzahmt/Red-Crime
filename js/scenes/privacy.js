/* =========================================================================
 *  RED CRIME - Gizlilik / KVKK onay ekranı
 *  İlk açılışta (dil seçiminden sonra) gösterilir; kabul edilmeden oyuna
 *  geçilemez. Ayarlar'dan tekrar okunabilir ve rıza geri çekilebilir.
 *  Metin: js/core/privacy.js
 *
 *  params: { next: 'splash' }            → zorunlu onay
 *          { review: true, back, backParams } → Ayarlar'dan okuma
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const UI = RC.UI;
  const L = (s, v) => RC.L(s, v);

  const PAD = 26;
  const BODY = 15;
  const LINE = 21;

  RC.Scenes.privacy = {
    enter(params) {
      this.params = params || {};
      this.review = !!this.params.review;
      this.t = 0;
      this.scroll = 0;
      this.reachedEnd = this.review;
      this.declined = false;
      this.confirmWithdraw = 0;
      this.dragY = null;
      this.build();
    },
    onResize() {
      this.lines = null;
      this.build();
    },

    box() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const bw = Math.min(980, w - 60);
      return { x: w / 2 - bw / 2, y: 96, w: bw, h: h - 96 - 100 };
    },

    /** Metni kutu genişliğine göre satırlara böl (bir kez) */
    layout(ctx) {
      const P = RC.Privacy.text;
      const b = this.box();
      const maxW = b.w - PAD * 2 - 14;
      const out = [];
      const para = (text, o = {}) => {
        const bullet = text.startsWith('• ');
        const body = bullet ? text.slice(2) : text;
        ctx.font = `${o.bold ? 'bold ' : ''}${o.size || BODY}px ${C.FONT_UI}`;
        const lines = U.wrapText(ctx, body, maxW - (bullet ? 22 : 0));
        lines.forEach((ln, i) => out.push({ text: ln, x: bullet ? 22 : 0, bullet: bullet && i === 0, ...o }));
        out.push({ gap: o.gapAfter != null ? o.gapAfter : 6 });
      };
      para(P.updated, { color: '#9aa3c7', size: 13 });
      para(P.intro, { gapAfter: 14 });
      for (const s of P.sections) {
        para(s.h, { bold: true, size: 18, color: C.COLORS.gold, gapAfter: 4 });
        for (const p of s.p) para(p, { color: /^https?:|: https?:/.test(p) ? '#8fb7ff' : '#dfe3f5' });
        out.push({ gap: 10 });
      }
      para(P.accept, { bold: true, color: '#fff' });
      let y = 0;
      for (const l of out) {
        l.y = y;
        y += l.gap != null ? l.gap : l.size === 18 ? 26 : LINE;
      }
      this.contentH = y;
      this.lines = out;
    },

    maxScroll() {
      return Math.max(0, (this.contentH || 0) - (this.box().h - PAD * 2));
    },

    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const by = h - 80;
      const items = [];
      if (this.review) {
        items.push(
          new UI.Button({
            x: w / 2 - 320,
            y: by,
            w: 300,
            h: 56,
            label: this.confirmWithdraw > 0 ? 'EMİN MİSİN?' : 'RIZAMI GERİ ÇEK',
            icon: 'cross',
            fontSize: 16,
            onClick: () => this.withdraw(),
          })
        );
        items.push(new UI.Button({ x: w / 2 + 20, y: by, w: 300, h: 56, label: 'GERİ', icon: 'back', back: true, primary: true, onClick: () => this.leave() }));
      } else {
        this.btnDecline = new UI.Button({ x: w / 2 - 340, y: by, w: 300, h: 56, label: 'KABUL ETMİYORUM', icon: 'cross', fontSize: 16, onClick: () => this.decline() });
        this.btnAccept = new UI.Button({ x: w / 2 + 40, y: by, w: 300, h: 56, label: 'KABUL EDİYORUM', icon: 'check', primary: true, fontSize: 17, onClick: () => this.accept() });
        items.push(this.btnDecline, this.btnAccept);
      }
      const focus = this.menu ? this.menu.focus : items.length - 1;
      this.menu = new UI.Menu(items);
      this.menu.focus = Math.min(focus, items.length - 1);
    },

    accept() {
      if (!this.reachedEnd) {
        RC.Audio.play('uiError');
        this.hintT = 2.5;
        return;
      }
      RC.Save.setSetting('privacyAccepted', RC.Privacy.VERSION);
      RC.Save.setSetting('privacyAcceptedAt', new Date().toISOString());
      // Onaydan önce reklam başlatılmaz (bkz. RC.initMonetization)
      if (RC.Ads) RC.Ads.resume().catch(() => {});
      RC.Game.go(this.params.next || 'splash');
    },
    decline() {
      this.declined = true;
      RC.Audio.play('uiBack');
    },
    withdraw() {
      if (this.confirmWithdraw <= 0) {
        this.confirmWithdraw = 3;
        this.build();
        return;
      }
      RC.Save.setSetting('privacyAccepted', '');
      if (RC.Ads) RC.Ads.disableAll();
      RC.Game.go('privacy', { next: 'menu' });
    },
    leave() {
      RC.Game.go(this.params.back || 'menu', this.params.backParams || {});
    },

    update(dt) {
      this.t += dt;
      RC.MenuBG.update(dt);
      if (this.hintT > 0) this.hintT -= dt;
      if (this.confirmWithdraw > 0) {
        this.confirmWithdraw -= dt;
        if (this.confirmWithdraw <= 0) this.build();
      }
      if (this.declined) {
        // Uyarı kutusu: tekrar oku ya da çık
        if (I.mouse.pressed || I.actPressed('confirm') || I.actPressed('back')) {
          I.consumeAll();
          this.declined = false;
        }
        return;
      }
      if (this.review && I.actPressed('back')) {
        RC.Audio.play('uiBack');
        this.leave();
        return;
      }
      // Kaydırma: tekerlek, sürükleme (dokunmatik), ok tuşları / W-S
      const b = this.box();
      const max = this.maxScroll();
      if (I.mouse.wheel) {
        this.scroll += I.mouse.wheel * 60;
        I.mouse.wheel = 0;
      }
      if (I.act('menuDown')) this.scroll += 420 * dt;
      if (I.act('menuUp')) this.scroll -= 420 * dt;
      if (I.wasPressed('PageDown')) this.scroll += b.h * 0.8;
      if (I.wasPressed('PageUp')) this.scroll -= b.h * 0.8;
      const inBox = I.hover(b.x, b.y, b.w, b.h);
      if (I.mouse.pressed && inBox) this.dragY = I.mouse.y;
      if (this.dragY != null) {
        if (I.mouse.down) {
          this.scroll -= I.mouse.y - this.dragY;
          this.dragY = I.mouse.y;
        } else this.dragY = null;
      }
      this.scroll = U.clamp(this.scroll, 0, max);
      if (this.lines && this.scroll >= max - 4) this.reachedEnd = true;
      this.menu.update(dt);
    },

    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const P = RC.Privacy.text;
      if (!this.lines) this.layout(ctx);
      RC.MenuBG.render(ctx, { noHero: true });
      ctx.fillStyle = 'rgba(5,6,15,0.78)';
      ctx.fillRect(0, 0, w, h);
      D.icon(ctx, 'lock', w / 2 - 20 - Math.min(360, w * 0.3), 50, 26, C.COLORS.gold);
      D.text(ctx, P.title, w / 2, 58, { size: 26, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      D.text(ctx, RC.Privacy.CONTACT.app + ' · ' + RC.Privacy.CONTACT.email, w / 2, 82, { size: 13, align: 'center', color: '#9aa3c7' });

      // Metin kutusu
      const b = this.box();
      D.panel(ctx, b.x, b.y, b.w, b.h, { accent: C.COLORS.gold });
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x + 4, b.y + 8, b.w - 8, b.h - 16);
      ctx.clip();
      const ox = b.x + PAD;
      const oy = b.y + PAD + 14 - this.scroll;
      for (const l of this.lines) {
        if (l.gap != null) continue;
        const y = oy + l.y;
        if (y < b.y - 20 || y > b.y + b.h + 20) continue;
        if (l.bullet) U.circle(ctx, ox + 8, y - 5, 3, C.COLORS.gold);
        D.text(ctx, l.text, ox + l.x, y, { size: l.size || BODY, weight: l.bold ? 'bold' : 'normal', color: l.color || '#dfe3f5' });
      }
      ctx.restore();
      // Kaydırma çubuğu
      const max = this.maxScroll();
      if (max > 0) {
        const th = Math.max(40, (b.h - 20) * ((b.h - PAD * 2) / this.contentH));
        const ty = b.y + 10 + (b.h - 20 - th) * (this.scroll / max);
        U.fillRoundRect(ctx, b.x + b.w - 12, b.y + 10, 5, b.h - 20, 3, 'rgba(255,255,255,0.08)');
        U.fillRoundRect(ctx, b.x + b.w - 12, ty, 5, th, 3, U.rgba(C.COLORS.gold, 0.7));
      }

      // Buton durumu: sonuna kadar okunmadan kabul soluk
      if (this.btnAccept) this.btnAccept.enabled = true;
      this.menu.draw(ctx, t);
      if (!this.review && !this.reachedEnd) {
        ctx.fillStyle = 'rgba(5,6,15,0.55)';
        U.fillRoundRect(ctx, this.btnAccept.x, this.btnAccept.y, this.btnAccept.w, this.btnAccept.h, 12);
        const a = this.hintT > 0 ? 1 : 0.6 + Math.sin(t * 4) * 0.3;
        D.text(ctx, L('Kabul etmek için metni sonuna kadar kaydır ▼'), w / 2, b.y + b.h + 20, { size: 14, weight: 'bold', align: 'center', color: this.hintT > 0 ? '#ff8c2e' : '#9aa3c7', alpha: a });
      }

      if (this.declined) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, w, h);
        const pw = Math.min(620, w - 60);
        const ph = 200;
        const px = w / 2 - pw / 2;
        const py = h / 2 - ph / 2;
        D.panel(ctx, px, py, pw, ph, { accent: '#ff8c2e' });
        D.text(ctx, L('Oyunu oynamak için onay gerekli'), w / 2, py + 50, { size: 22, font: C.FONT_TITLE, align: 'center', color: '#ff8c2e' });
        ctx.font = `15px ${C.FONT_UI}`;
        U.wrapText(ctx, L('Gizlilik Politikası ve KVKK metnini kabul etmeden Red Crime oynanamaz. Metni tekrar okuyabilir ya da uygulamayı kapatabilirsin. Soruların için bize e-posta gönder.'), pw - 60).forEach((ln, i) =>
          D.text(ctx, ln, w / 2, py + 90 + i * 21, { size: 15, align: 'center', color: '#dfe3f5' })
        );
        D.text(ctx, L('Devam etmek için dokun'), w / 2, py + ph - 18, { size: 13, align: 'center', color: '#9aa3c7', alpha: 0.6 + Math.sin(t * 4) * 0.4 });
      }
    },
  };
})(window.RC);
