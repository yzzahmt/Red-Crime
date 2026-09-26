/* =========================================================================
 *  RED CRIME - KARANLIK AĞ
 *  Terminal görünümlü gizli pazar: pahalı ve özel hırsızlık ekipmanları.
 *  Tüketilebilir ekipmanlar soygunda 1-5 tuşlarıyla kullanılır.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;
  const UI = RC.UI;
  const L = (s, v) => RC.L(s, v);

  const GREEN = '#3ddc84';
  const DIM = '#1f6a3a';
  const BG = '#030a06';

  RC.Scenes.darkweb = {
    enter(params) {
      this.params = params || {};
      this.t = 0;
      this.log = [];
      this.boot = 0;
      this.particles = new RC.Particles(300);
      this.rain = [];
      for (let i = 0; i < 60; i++) this.rain.push({ x: Math.random(), y: Math.random(), v: U.rand(0.1, 0.4), ch: '' });
      this.build();
      RC.Audio.playMusic('alert');
      RC.Audio.setMusicDuck(0.4);
      this.say(L('> tor bağlantısı kuruluyor...'));
      this.say(L('> şifreli kanal: AÇIK'));
      this.say(L('> hoş geldin, Red Crime. Bakiyeni kontrol et, soru sorma.'));
    },
    exit() {
      RC.Audio.setMusicDuck(1);
    },
    say(line) {
      this.log.push({ text: line, t: this.t });
      if (this.log.length > 6) this.log.shift();
    },
    onResize() {
      this.build();
    },
    build() {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const list = C.DARKWEB;
      const cols = 2;
      const cw = Math.min(520, (w - 100) / 2);
      const ch = 92;
      const x0 = w / 2 - (cols * cw + 20) / 2;
      const y0 = 150;
      const items = list.map((def, i) => {
        const wdg = new UI.Widget({ x: x0 + (i % cols) * (cw + 20), y: y0 + Math.floor(i / cols) * (ch + 12), w: cw, h: ch, def });
        wdg.activate = () => this.buy(def, wdg);
        wdg.draw = (ctx, t) => this.drawItem(ctx, wdg, t);
        return wdg;
      });
      items.push(new UI.Button({ x: w / 2 - 150, y: h - 78, w: 300, h: 52, label: 'BAĞLANTIYI KES', icon: 'back', back: true, onClick: () => RC.Game.go('levelselect', { select: this.params.select }) }));
      this.menu = new UI.Menu(items);
    },
    buy(def, wdg) {
      const owned = def.perm && RC.Save.hasPerm(def.id);
      if (owned) {
        RC.Audio.play('uiError');
        this.say(L('> zaten sahipsin: {n}', { n: L(def.name) }));
        return;
      }
      if (RC.Save.buyDark(def)) {
        RC.Audio.play('bigcash');
        RC.Audio.play('safeGood');
        this.particles.sparks(wdg.x + wdg.w / 2, wdg.y + wdg.h / 2, 30, GREEN, 300);
        this.say(L('> satın alındı: {n} — kargo kamyonda', { n: L(def.name) }));
      } else {
        RC.Audio.play('uiError');
        wdg.shake = 0.4;
        this.say(L('> YETERSİZ BAKİYE. Önce biraz daha çal.'));
      }
    },
    drawItem(ctx, b, t) {
      const def = b.def;
      const hv = b.hoverT;
      const owned = def.perm ? RC.Save.hasPerm(def.id) : false;
      const count = def.perm ? 0 : RC.Save.gadgetCount(def.id);
      const afford = RC.Save.progress.wallet >= def.price;
      if (b.shake > 0) b.shake -= 0.016;
      const sx = b.shake > 0 ? Math.sin(t * 60) * 5 * b.shake : 0;
      ctx.save();
      ctx.translate(sx, 0);
      ctx.fillStyle = hv > 0.5 ? '#0a2a16' : '#06160c';
      U.fillRoundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.strokeStyle = U.rgba(GREEN, 0.3 + hv * 0.6);
      ctx.lineWidth = 1.5;
      U.strokeRoundRect(ctx, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 6);
      const mono = C.FONT_MONO;
      D.icon(ctx, def.icon, b.x + 34, b.y + 36, 26, owned ? DIM : GREEN);
      if (!def.perm) D.text(ctx, '[' + def.key + ']', b.x + 34, b.y + 74, { size: 13, font: mono, align: 'center', color: DIM });
      D.text(ctx, L(def.name).toLocaleUpperCase(RC.I18N.lang === 'en' ? 'en-US' : 'tr-TR'), b.x + 66, b.y + 28, { size: 16, font: mono, color: owned ? DIM : '#b8ffd6' });
      ctx.font = `13px ${mono}`;
      const lines = U.wrapText(ctx, L(def.desc), b.w - 190);
      lines.slice(0, 2).forEach((ln, i) => D.text(ctx, ln, b.x + 66, b.y + 50 + i * 16, { size: 13, font: mono, color: '#6ac894' }));
      const tag = owned ? L('SAHİPSİN') : def.perm ? L('KALICI') : L('x{n} paket · elde: {c}', { n: def.pack, c: count });
      D.text(ctx, tag, b.x + 66, b.y + b.h - 8, { size: 12, font: mono, color: owned ? GREEN : '#4a9a6a' });
      D.text(ctx, owned ? '—' : U.formatMoney(def.price), b.x + b.w - 14, b.y + 30, { size: 18, font: mono, align: 'right', color: owned ? DIM : afford ? '#ffd24a' : '#ff5060' });
      if (hv > 0.5 && !owned) D.text(ctx, L('[ENTER] SATIN AL'), b.x + b.w - 14, b.y + b.h - 10, { size: 12, font: mono, align: 'right', color: GREEN, alpha: 0.6 + Math.sin(t * 8) * 0.4 });
      ctx.restore();
    },
    update(dt) {
      this.t += dt;
      this.boot = Math.min(1, this.boot + dt * 1.5);
      this.particles.update(dt);
      for (const r of this.rain) {
        r.y += r.v * dt;
        if (r.y > 1) {
          r.y = 0;
          r.x = Math.random();
        }
        if (Math.random() < 0.1) r.ch = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
      }
      if (I.actPressed('back')) {
        RC.Audio.play('uiBack');
        RC.Game.go('levelselect', { select: this.params.select });
        return;
      }
      this.menu.update(dt);
    },
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const mono = C.FONT_MONO;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      // Matris yağmuru
      ctx.font = `16px ${mono}`;
      for (const r of this.rain) {
        ctx.fillStyle = 'rgba(61,220,132,0.12)';
        ctx.fillText(r.ch || '0', r.x * w, r.y * h);
        ctx.fillStyle = 'rgba(61,220,132,0.05)';
        ctx.fillText(r.ch || '1', r.x * w, r.y * h - 18);
      }
      // Başlık
      const glitch = Math.random() < 0.04 ? U.rand(-4, 4) : 0;
      D.text(ctx, L('// KARANLIK AĞ //'), w / 2 + glitch, 62, { size: 36, font: mono, align: 'center', color: GREEN });
      D.text(ctx, L('anonim pazar · kripto ödeme · iade yok'), w / 2, 88, { size: 14, font: mono, align: 'center', color: DIM });
      D.icon(ctx, 'skull', 40, 56, 30, DIM);
      // Bakiye
      D.text(ctx, L('BAKİYE:') + ' ' + U.formatMoney(RC.Save.progress.wallet), w - 30, 62, { size: 18, font: mono, align: 'right', color: '#ffd24a' });
      // Log
      const ly = 112;
      this.log.slice(-2).forEach((l, i) => {
        const k = Math.min(l.text.length, Math.floor((t - l.t) * 60));
        D.text(ctx, l.text.slice(0, k) + (i === 1 && Math.floor(t * 3) % 2 ? '_' : ''), 40, ly + i * 18, { size: 13, font: mono, color: '#6ac894' });
      });
      ctx.globalAlpha = this.boot;
      this.menu.draw(ctx, t);
      ctx.globalAlpha = 1;
      this.particles.render(ctx, null);
      // Tarama çizgileri + vinyet
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      D.vignette(ctx, w, h, 0.8);
      D.text(ctx, L('Ekipmanlar soygunda 1-5 tuşlarıyla kullanılır. Kalıcı ekipmanlar otomatik çalışır.'), w / 2, h - 12, { size: 12, font: mono, align: 'center', color: DIM });
    },
  };
})(window.RC);
