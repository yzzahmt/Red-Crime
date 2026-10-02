/* =========================================================================
 *  RED CRIME - Parçacık sistemi
 *  Toz, kıvılcım, cam kırığı, duman, para, ses halkaları, yüzen yazılar...
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  class Particles {
    constructor(max = 1500) {
      this.max = max;
      this.list = [];
      this.texts = [];
      this.rings = [];
      this.qualityMul = 1;
    }

    setQuality(q) {
      this.qualityMul = q === 'low' ? 0.35 : q === 'medium' ? 0.65 : 1;
    }

    clear() {
      this.list.length = 0;
      this.texts.length = 0;
      this.rings.length = 0;
    }

    add(p) {
      if (this.list.length >= this.max) this.list.shift();
      p.life = p.life || 1;
      p.t = 0;
      p.vx = p.vx || 0;
      p.vy = p.vy || 0;
      p.g = p.g || 0;
      p.drag = p.drag == null ? 0 : p.drag;
      p.size = p.size || 3;
      p.rot = p.rot || 0;
      p.vr = p.vr || 0;
      p.alpha = p.alpha == null ? 1 : p.alpha;
      this.list.push(p);
      return p;
    }

    count(n) {
      return Math.max(1, Math.round(n * this.qualityMul));
    }

    /* ----------------------- Hazır efektler --------------------------- */

    dust(x, y, n = 6, color = '#c9bfae', spread = 1) {
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'circle',
          x: x + U.rand(-8, 8) * spread,
          y: y + U.rand(-2, 2),
          vx: U.rand(-60, 60) * spread,
          vy: U.rand(-60, -10),
          drag: 3,
          size: U.rand(2, 5),
          grow: 6,
          color,
          alpha: 0.5,
          life: U.rand(0.4, 0.8),
        });
      }
    }

    sparks(x, y, n = 12, color = '#ffd36b', speed = 300) {
      for (let i = 0; i < this.count(n); i++) {
        const a = U.rand(0, U.TAU);
        const s = U.rand(0.3, 1) * speed;
        this.add({
          type: 'spark',
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          g: 600,
          drag: 1.5,
          size: U.rand(1.5, 3),
          color,
          life: U.rand(0.3, 0.7),
        });
      }
    }

    shards(x, y, n, colors, floorY, speed = 260) {
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'shard',
          x: x + U.rand(-6, 6),
          y: y + U.rand(-6, 6),
          vx: U.rand(-1, 1) * speed,
          vy: U.rand(-1.2, -0.2) * speed,
          g: 1400,
          size: U.rand(3, 8),
          rot: U.rand(0, U.TAU),
          vr: U.rand(-12, 12),
          color: U.pick(colors),
          // Kırık parçalar bir süre yerde enkaz olarak kalır
          life: U.rand(6, 10),
          floorY,
          bounce: 0.3,
        });
      }
    }

    smoke(x, y, n = 3, color = '#777', size = 10) {
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'circle',
          x: x + U.rand(-4, 4),
          y: y + U.rand(-4, 4),
          vx: U.rand(-15, 15),
          vy: U.rand(-50, -20),
          drag: 0.8,
          size: size * U.rand(0.6, 1.1),
          grow: size * 1.5,
          color,
          alpha: 0.35,
          life: U.rand(1, 2),
        });
      }
    }

    embers(x, y, n = 1) {
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'spark',
          x: x + U.rand(-14, 14),
          y,
          vx: U.rand(-20, 20),
          vy: U.rand(-140, -60),
          g: -20,
          drag: 0.5,
          size: U.rand(1, 2.5),
          color: U.pick(['#ffb347', '#ff7b2e', '#ffd36b']),
          life: U.rand(0.8, 1.6),
          wobble: U.rand(2, 5),
        });
      }
    }

    cash(x, y, n = 8) {
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'bill',
          x,
          y,
          vx: U.rand(-160, 160),
          vy: U.rand(-380, -160),
          g: 500,
          drag: 1.8,
          size: U.rand(8, 12),
          rot: U.rand(0, U.TAU),
          vr: U.rand(-8, 8),
          color: '#5fbf6a',
          life: U.rand(1, 1.6),
          wobble: U.rand(3, 7),
        });
      }
    }

    confetti(x, y, n = 40, spread = 400) {
      const cols = ['#e8283c', '#ffc83d', '#4aa8ff', '#3ddc84', '#b467ff', '#ffffff'];
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'rect',
          x: x + U.rand(-spread / 2, spread / 2),
          y: y + U.rand(-20, 20),
          vx: U.rand(-100, 100),
          vy: U.rand(-500, -200),
          g: 500,
          drag: 1.2,
          size: U.rand(4, 8),
          rot: U.rand(0, U.TAU),
          vr: U.rand(-10, 10),
          color: U.pick(cols),
          life: U.rand(1.5, 3),
          wobble: U.rand(3, 8),
        });
      }
    }

    splash(x, y, n = 18) {
      for (let i = 0; i < this.count(n); i++) {
        this.add({
          type: 'circle',
          x: x + U.rand(-10, 10),
          y,
          vx: U.rand(-160, 160),
          vy: U.rand(-420, -150),
          g: 1300,
          size: U.rand(2, 4),
          color: '#9fd6ff',
          alpha: 0.8,
          life: U.rand(0.5, 0.9),
        });
      }
    }

    glint(x, y, color = '#fff') {
      this.add({ type: 'glint', x, y, size: U.rand(5, 9), color, life: 0.6 });
    }

    ring(x, y, radius, color = '#ffffff', life = 0.8, width = 3) {
      this.rings.push({ x, y, r: 0, maxR: radius, color, life, t: 0, width });
    }

    zzz(x, y) {
      this.add({ type: 'z', x, y, vx: U.rand(10, 25), vy: -30, size: U.rand(10, 16), color: '#cfe0ff', life: 2, wobble: 3 });
    }

    text(x, y, str, opts = {}) {
      this.texts.push({
        x,
        y,
        str,
        color: opts.color || '#fff',
        size: opts.size || 18,
        life: opts.life || 1.3,
        t: 0,
        vy: opts.vy == null ? -60 : opts.vy,
        font: opts.font || RC.Config.FONT_TITLE,
        stroke: opts.stroke == null ? '#000' : opts.stroke,
        pop: opts.pop == null ? true : opts.pop,
      });
    }

    /* ----------------------- Güncelleme ------------------------------- */

    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.t += dt;
        if (p.t >= p.life) {
          L.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        if (p.drag) {
          const f = Math.exp(-p.drag * dt);
          p.vx *= f;
          p.vy *= f;
        }
        p.x += p.vx * dt;
        if (p.wobble) p.x += Math.sin(p.t * p.wobble * 2) * 0.6;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.grow) p.size += p.grow * dt;
        if (p.floorY != null && p.y > p.floorY) {
          p.y = p.floorY;
          p.vy *= -(p.bounce || 0);
          p.vx *= 0.6;
          p.vr *= 0.5;
          if (Math.abs(p.vy) < 30) {
            p.vy = 0;
            p.g = 0;
            p.vx *= 0.8;
            p.resting = true;
          }
        }
        // Yerde duran parçalar sürtünmeyle durur (buz üstünde kayar gibi gitmesin)
        if (p.resting) {
          const f = Math.exp(-9 * dt);
          p.vx *= f;
          p.vr *= f;
        }
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.t += dt;
        t.y += t.vy * dt;
        t.vy *= Math.exp(-2 * dt);
        if (t.t >= t.life) this.texts.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.t += dt;
        r.r = r.maxR * U.ease.outCubic(Math.min(1, r.t / r.life));
        if (r.t >= r.life) this.rings.splice(i, 1);
      }
    }

    /* ----------------------- Çizim ------------------------------------ */

    renderRings(ctx, view) {
      for (const r of this.rings) {
        if (view && (r.x + r.maxR < view.x || r.x - r.maxR > view.x + view.w)) continue;
        const a = 1 - r.t / r.life;
        ctx.strokeStyle = U.rgba(r.color, a * 0.6);
        ctx.lineWidth = r.width * a + 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, U.TAU);
        ctx.stroke();
      }
    }

    render(ctx, view, withOverlay = true) {
      if (withOverlay) this.renderRings(ctx, view);
      for (const p of this.list) {
        if (view && (p.x < view.x - 40 || p.x > view.x + view.w + 40 || p.y < view.y - 40 || p.y > view.y + view.h + 40)) continue;
        const lifeT = p.t / p.life;
        const a = p.alpha * (1 - lifeT * lifeT);
        ctx.globalAlpha = U.clamp(a, 0, 1);
        switch (p.type) {
          case 'circle':
            U.circle(ctx, p.x, p.y, p.size, p.color);
            break;
          case 'spark':
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
            ctx.stroke();
            break;
          case 'shard':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(-p.size / 2, -p.size / 3);
            ctx.lineTo(p.size / 2, 0);
            ctx.lineTo(-p.size / 4, p.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
          case 'rect':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, Math.cos(p.t * 8));
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
            break;
          case 'bill':
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.scale(1, Math.cos(p.t * 6) * 0.8 + 0.2);
            ctx.fillStyle = '#5fbf6a';
            ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
            ctx.strokeStyle = '#2f7a3a';
            ctx.lineWidth = 1;
            ctx.strokeRect(-p.size + 1.5, -p.size / 2 + 1.5, p.size * 2 - 3, p.size - 3);
            U.circle(ctx, 0, 0, p.size / 3, '#2f7a3a');
            ctx.restore();
            break;
          case 'glint': {
            const s = p.size * Math.sin(lifeT * Math.PI);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - s);
            ctx.lineTo(p.x + s * 0.2, p.y - s * 0.2);
            ctx.lineTo(p.x + s, p.y);
            ctx.lineTo(p.x + s * 0.2, p.y + s * 0.2);
            ctx.lineTo(p.x, p.y + s);
            ctx.lineTo(p.x - s * 0.2, p.y + s * 0.2);
            ctx.lineTo(p.x - s, p.y);
            ctx.lineTo(p.x - s * 0.2, p.y - s * 0.2);
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'z':
            ctx.fillStyle = p.color;
            ctx.font = `bold ${Math.round(p.size)}px ${RC.Config.FONT_UI}`;
            ctx.textAlign = 'center';
            ctx.fillText('Z', p.x, p.y);
            break;
          default:
            U.circle(ctx, p.x, p.y, p.size, p.color);
        }
      }
      ctx.globalAlpha = 1;
      ctx.lineCap = 'butt';
      if (withOverlay) this.renderTexts(ctx);
    }

    renderTexts(ctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const t of this.texts) {
        const k = t.t / t.life;
        const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        const s = t.pop ? (k < 0.15 ? U.ease.outBack(k / 0.15) : 1) : 1;
        ctx.globalAlpha = a;
        ctx.font = `${Math.round(t.size * s)}px ${t.font}`;
        if (t.stroke) {
          ctx.lineWidth = 4;
          ctx.strokeStyle = t.stroke;
          ctx.lineJoin = 'round';
          ctx.strokeText(t.str, t.x, t.y);
        }
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }

  RC.Particles = Particles;
})(window.RC);
