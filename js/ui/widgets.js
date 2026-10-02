/* =========================================================================
 *  RED CRIME - Menü bileşenleri
 *  Buton, kaydırıcı, açma/kapama, seçim listesi + klavye/fare odak yönetimi.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;

  class Widget {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, w: 300, h: 56, label: '', enabled: true, hoverT: 0, pressT: 0 }, o);
    }
    contains(mx, my) {
      return mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
    }
    update(dt, focused) {
      this.hoverT = U.damp(this.hoverT, focused ? 1 : 0, 14, dt);
      if (this.pressT > 0) this.pressT -= dt;
    }
    activate() {}
    adjust() {}
  }

  class Button extends Widget {
    activate() {
      if (!this.enabled) {
        RC.Audio.play('uiError');
        return;
      }
      this.pressT = 0.15;
      RC.Audio.play(this.back ? 'uiBack' : 'uiSelect');
      if (this.onClick) this.onClick();
    }
    draw(ctx, t) {
      const h = this.hoverT;
      const s = 1 + h * 0.04 - (this.pressT > 0 ? 0.03 : 0);
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      ctx.scale(s, s);
      const x = -this.w / 2;
      const y = -this.h / 2;
      const primary = this.primary;
      // Parıltı
      if (h > 0.05) {
        ctx.shadowColor = C.COLORS.red;
        ctx.shadowBlur = 20 * h;
      }
      const g = ctx.createLinearGradient(0, y, 0, y + this.h);
      if (primary) {
        g.addColorStop(0, U.mix('#c4182c', '#e0283c', h));
        g.addColorStop(1, U.mix('#6e0b16', '#8f1020', h));
      } else {
        g.addColorStop(0, U.mix('#23262e', '#2f333d', h));
        g.addColorStop(1, U.mix('#111216', '#181a20', h));
      }
      ctx.fillStyle = g;
      U.fillRoundRect(ctx, x, y, this.w, this.h, 3);
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      ctx.strokeStyle = primary ? 'rgba(255,140,150,0.55)' : `rgba(255,255,255,${0.08 + h * 0.22})`;
      U.strokeRoundRect(ctx, x + 0.5, y + 0.5, this.w - 1, this.h - 1, 3);
      // Seçili: solda kırmızı şerit
      if (h > 0.05 && !primary) {
        ctx.fillStyle = U.rgba(C.COLORS.red, h);
        ctx.fillRect(x, y, 4, this.h);
      }
      // Işık şeridi (hover animasyonu)
      if (h > 0.05) {
        ctx.save();
        ctx.beginPath();
        U.roundRect(ctx, x, y, this.w, this.h, 3);
        ctx.clip();
        const sx = x + ((t * 400) % (this.w + 200)) - 100;
        const lg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)');
        lg.addColorStop(0.5, `rgba(255,255,255,${0.12 * h})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x, y, this.w, this.h);
        ctx.restore();
      }
      const alpha = this.enabled ? 1 : 0.4;
      let tx = 0;
      if (this.icon) {
        D.icon(ctx, this.icon, x + 34, 0, 22, U.rgba('#ffffff', alpha));
        tx = 14;
      }
      D.text(ctx, this.label, tx, 7, {
        size: this.fontSize || 20,
        font: C.FONT_TITLE,
        align: 'center',
        color: U.rgba('#ffffff', alpha),
        shadow: 'rgba(0,0,0,0.4)',
      });
      if (this.sub) D.text(ctx, this.sub, tx, 24, { size: 12, align: 'center', color: 'rgba(255,255,255,0.6)' });
      ctx.restore();
    }
  }

  class Slider extends Widget {
    adjust(dir) {
      const step = this.step || 0.05;
      const v = U.clamp(Math.round((this.get() + dir * step) * 100) / 100, this.min || 0, this.max || 1);
      this.set(v);
      RC.Audio.play('tick', { pitch: 0.8 + v * 0.6 });
    }
    activate() {
      this.adjust(1);
    }
    handleMouse() {
      const m = I.mouse;
      const bx = this.x + this.w * 0.45;
      const bw = this.w * 0.45;
      if (m.down && m.y >= this.y && m.y <= this.y + this.h && m.x >= bx - 10 && m.x <= bx + bw + 10) {
        const v = U.clamp((m.x - bx) / bw, 0, 1);
        const min = this.min || 0;
        const max = this.max || 1;
        this.set(Math.round((min + v * (max - min)) * 100) / 100);
        return true;
      }
      return false;
    }
    draw(ctx) {
      const h = this.hoverT;
      D.panel(ctx, this.x, this.y, this.w, this.h, { r: 10, shadow: false, fill: U.mix('#12162a', '#1d2544', h), fillTop: U.mix('#1a1f3a', '#26305a', h), border: U.rgba('#8fb7ff', 0.15 + h * 0.4) });
      D.text(ctx, this.label, this.x + 18, this.y + this.h / 2 + 6, { size: 17, weight: 'bold' });
      const bx = this.x + this.w * 0.45;
      const bw = this.w * 0.45;
      const by = this.y + this.h / 2 - 5;
      const v = (this.get() - (this.min || 0)) / ((this.max || 1) - (this.min || 0));
      D.bar(ctx, bx, by, bw, 10, v, { from: C.COLORS.red, to: C.COLORS.gold });
      U.circle(ctx, bx + bw * v, by + 5, 10 + h * 2, '#fff');
      U.circle(ctx, bx + bw * v, by + 5, 5, C.COLORS.red);
      D.text(ctx, Math.round(this.get() * 100) + '%', this.x + this.w - 14, this.y + this.h / 2 + 6, { size: 14, align: 'right', color: '#9aa3c7' });
    }
  }

  class Choice extends Widget {
    adjust(dir) {
      const opts = this.options;
      let i = opts.findIndex((o) => o.value === this.get());
      i = (i + dir + opts.length) % opts.length;
      this.set(opts[i].value);
      RC.Audio.play('tick');
    }
    activate() {
      this.adjust(1);
    }
    draw(ctx, t) {
      const h = this.hoverT;
      D.panel(ctx, this.x, this.y, this.w, this.h, { r: 10, shadow: false, fill: U.mix('#12162a', '#1d2544', h), fillTop: U.mix('#1a1f3a', '#26305a', h), border: U.rgba('#8fb7ff', 0.15 + h * 0.4) });
      D.text(ctx, this.label, this.x + 18, this.y + this.h / 2 + 6, { size: 17, weight: 'bold' });
      const cur = this.options.find((o) => o.value === this.get()) || this.options[0];
      const cx = this.x + this.w * 0.675;
      D.text(ctx, cur.label, cx, this.y + this.h / 2 + 6, { size: 17, align: 'center', color: C.COLORS.gold, weight: 'bold' });
      const off = Math.sin(t * 6) * 2 * h;
      D.text(ctx, '◀', this.x + this.w * 0.47 - off, this.y + this.h / 2 + 6, { size: 16, align: 'center', color: '#9aa3c7' });
      D.text(ctx, '▶', this.x + this.w * 0.88 + off, this.y + this.h / 2 + 6, { size: 16, align: 'center', color: '#9aa3c7' });
    }
  }

  class Toggle extends Choice {
    constructor(o) {
      super(o);
      this.options = [
        { value: true, label: 'AÇIK' },
        { value: false, label: 'KAPALI' },
      ];
    }
  }

  /** Odak yöneticisi: klavye ve fare ile gezinme */
  class Menu {
    constructor(widgets = []) {
      this.widgets = widgets;
      this.focus = 0;
      this.lastMouse = { x: -1, y: -1 };
      this.cols = 1;
    }
    set(widgets) {
      this.widgets = widgets;
      this.focus = U.clamp(this.focus, 0, widgets.length - 1);
    }
    update(dt) {
      const ws = this.widgets;
      if (!ws.length) return;
      const m = I.mouse;
      const moved = m.x !== this.lastMouse.x || m.y !== this.lastMouse.y;
      this.lastMouse = { x: m.x, y: m.y };
      if (moved || m.pressed) {
        ws.forEach((w, i) => {
          if (w.contains(m.x, m.y) && this.focus !== i) {
            this.focus = i;
            RC.Audio.play('uiHover');
          }
        });
      }
      const step = (d) => {
        let i = this.focus;
        for (let n = 0; n < ws.length; n++) {
          i = (i + d + ws.length) % ws.length;
          if (!ws[i].skip) break;
        }
        this.focus = i;
        RC.Audio.play('uiHover');
      };
      if (I.actPressed('menuDown')) step(this.cols);
      if (I.actPressed('menuUp')) step(-this.cols);
      const cur = ws[this.focus];
      if (this.cols > 1) {
        if (I.actPressed('menuRight')) step(1);
        if (I.actPressed('menuLeft')) step(-1);
      } else if (cur) {
        if (I.actPressed('menuRight')) cur.adjust(1);
        if (I.actPressed('menuLeft')) cur.adjust(-1);
      }
      if (cur && (I.wasPressed('Enter') || I.wasPressed('Space') || I.wasPressed('NumpadEnter'))) cur.activate();
      if (m.pressed) {
        const hit = ws.find((w) => w.contains(m.x, m.y));
        if (hit && !(hit instanceof Slider)) hit.activate();
      }
      for (const w of ws) if (w instanceof Slider && w.contains(m.x, m.y)) w.handleMouse();
      ws.forEach((w, i) => w.update(dt, i === this.focus));
    }
    draw(ctx, t) {
      for (const w of this.widgets) w.draw(ctx, t);
    }
  }

  RC.UI = { Widget, Button, Slider, Choice, Toggle, Menu };
})(window.RC);
