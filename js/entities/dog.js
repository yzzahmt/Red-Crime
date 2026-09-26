/* =========================================================================
 *  RED CRIME - Bekçi köpeği
 *  Bahçede uyur; sesle uyanır, oyuncuyu görünce havlar (havlaması ev
 *  sahiplerini uyandırır) ve kovalar. Isırırsa oyuncu elindekini düşürür.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  class Dog {
    constructor(scene, spec) {
      this.scene = scene;
      this.x = spec.x;
      this.homeX = spec.homeX;
      this.y = 0;
      this.range = spec.range;
      this.facing = -1;
      this.state = 'sleep';
      this.stateT = 0;
      this.alert = 0;
      this.barkT = 0;
      this.t = 0;
      this.phase = 0;
      this.speed = 0;
      this.targetX = this.x;
      this.wanderT = 3;
      this.biteCooldown = 0;
      this.mark = null;
    }

    hear(ev) {
      const d = U.dist(this.x, -20, ev.x, ev.y);
      const radius = 120 + 520 * ev.loud;
      if (d > radius || ev.src === 'bark') return;
      const eff = ev.loud * (1 - d / radius);
      if (this.state === 'sleep') {
        this.alert += eff * 90;
        if (this.alert > 60) this.setState('alert');
      } else if (this.state !== 'chase' && eff > 0.1) {
        this.targetX = ev.x;
        this.setState('alert');
      }
    }

    knockOut(sec) {
      this.setState('sleep');
      this.alert = -sec * 6;
      this.knocked = sec;
    }

    setState(s) {
      if (this.state === s) return;
      this.state = s;
      this.stateT = 0;
      if (s === 'chase') {
        this.mark = '!';
        RC.Audio.play('growl', { x: this.x, y: this.y, vol: 1 });
      } else if (s === 'alert') {
        this.mark = '?';
      } else {
        this.mark = null;
      }
    }

    canSee(p) {
      const W = this.scene.world;
      if (p.hidden) return false;
      if (p.cx < this.range[0] - 80 || p.cx > this.range[1] + 80) return false;
      if (p.bottom < -140) return false;
      const d = Math.abs(p.cx - this.x);
      let range = 300;
      if (this.scene.nearOutdoorLight(p.cx, p.cy)) range += 120;
      if (p.flashOn) range += 120;
      if (p.crouch) range *= 0.7;
      if (this.state === 'sleep') return false;
      return d < range && RC.Physics.lineOfSight(W.grid, this.x, -20, p.cx, p.cy);
    }

    bark() {
      RC.Audio.play('bark', { x: this.x, y: this.y, vol: 1, pitch: U.rand(0.9, 1.1), minGap: 0 });
      this.scene.makeNoise(this.x, -30, 0.9, 'bark');
      this.scene.particles.ring(this.x + this.facing * 20, -30, 90, '#ffc83d', 0.5, 3);
    }

    update(dt) {
      const p = this.scene.player;
      this.t += dt;
      this.stateT += dt;
      if (this.biteCooldown > 0) this.biteCooldown -= dt;
      const sees = this.canSee(p);

      switch (this.state) {
        case 'sleep':
          if (this.knocked > 0) {
            this.knocked -= dt;
            this.speed = 0;
            if (Math.random() < dt * 0.6) this.scene.particles.zzz(this.x, this.y - 30);
            break;
          }
          this.alert = Math.max(0, this.alert - 6 * dt);
          this.speed = 0;
          if (Math.random() < dt * 0.3) this.scene.particles.zzz(this.x, this.y - 30);
          // Çok yakından geçilirse uyanır
          if (Math.abs(p.cx - this.x) < 70 && p.bottom > -40 && !p.crouch && !p.hidden) this.alert += 60 * dt;
          if (this.alert > 60) this.setState('alert');
          break;
        case 'alert':
          if (sees) {
            this.setState('chase');
            break;
          }
          this.moveTo(this.targetX, 110, dt);
          if (this.stateT > 6) this.setState('return');
          break;
        case 'chase':
          if (sees) {
            this.targetX = p.cx;
            this.lost = 0;
          } else {
            this.lost = (this.lost || 0) + dt;
          }
          this.moveTo(this.targetX, 265, dt);
          this.barkT -= dt;
          if (this.barkT <= 0) {
            this.barkT = 0.75;
            this.bark();
          }
          if (this.lost > 3.5) this.setState('return');
          // Isırma
          if (!p.hidden && this.biteCooldown <= 0 && Math.abs(p.cx - this.x) < 34 && p.bottom > -50) {
            p.bitten(this.x);
            this.biteCooldown = 3;
            this.setState('sniff');
          }
          break;
        case 'sniff':
          this.speed = 0;
          if (this.stateT > 2.5) this.setState(sees ? 'chase' : 'return');
          break;
        case 'return':
          if (sees) {
            this.setState('chase');
            break;
          }
          if (this.moveTo(this.homeX + 60, 90, dt)) {
            this.setState('sleep');
            this.alert = 20;
          }
          break;
      }
    }

    moveTo(tx, spd, dt) {
      tx = U.clamp(tx, this.range[0], this.range[1]);
      const dx = tx - this.x;
      if (Math.abs(dx) < 6) {
        this.speed = 0;
        return true;
      }
      this.facing = Math.sign(dx);
      const step = Math.min(Math.abs(dx), spd * dt);
      this.x += Math.sign(dx) * step;
      this.speed = spd;
      this.phase += spd * dt * 0.08;
      // Havuza girmesin
      const pool = this.scene.world.pool;
      if (pool && this.x > pool.x0 - 10 && this.x < pool.x1 + 10) {
        this.x = this.facing > 0 ? pool.x0 - 10 : pool.x1 + 10;
        return true;
      }
      return false;
    }

    draw(ctx, t) {
      const x = this.x;
      const y = this.y;
      const f = this.facing;
      const sleeping = this.state === 'sleep';
      const run = this.speed > 150;
      const ph = this.phase;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(f, 1);
      const body = '#e6d3a8';
      const dark = '#2a2018';
      // Gölge
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      U.ellipse(ctx, 0, -1, 34, 5, 0);
      if (sleeping) {
        U.ellipse(ctx, 0, -16, 34, 16, 0, body);
        U.ellipse(ctx, 26, -12, 14, 11, 0, body);
        U.ellipse(ctx, 34, -10, 8, 6, 0, dark);
        U.ellipse(ctx, 22, -20, 6, 10, 0.6, dark);
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        U.line(ctx, 26, -14, 30, -14);
        U.ellipse(ctx, -34, -10, 12, 5, 0.3, body);
        ctx.restore();
        this._ov = { x, y: y - 50 };
        return;
      }
      // Bacaklar
      const legs = [-22, -12, 14, 24];
      legs.forEach((lx, i) => {
        const s = this.speed > 0 ? Math.sin(ph * (run ? 1.6 : 1) + (i % 2 ? Math.PI : 0)) * (run ? 10 : 6) : 0;
        ctx.strokeStyle = U.shade(body, -0.15);
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        U.line(ctx, lx, -20, lx + s, -3);
        U.ellipse(ctx, lx + s + 2, -3, 4, 2.5, 0, dark);
      });
      ctx.lineCap = 'butt';
      // Kuyruk
      const wag = Math.sin(t * (this.state === 'chase' ? 20 : 6)) * 0.5;
      ctx.save();
      ctx.translate(-32, -30);
      ctx.rotate(-0.8 + wag);
      ctx.strokeStyle = body;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-8, -12, 2, -20);
      ctx.stroke();
      ctx.restore();
      // Gövde
      const bob = run ? Math.sin(ph * 3.2) * 2 : 0;
      U.ellipse(ctx, 0, -30 + bob, 34, 14, 0, body);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -30 + bob, 34, 14, 0, 0, U.TAU);
      ctx.stroke();
      // Tasma
      ctx.fillStyle = '#c23a2b';
      ctx.fillRect(22, -40 + bob, 6, 16);
      // Kafa
      const hy = -44 + bob + (this.state === 'sniff' ? 18 : 0);
      U.ellipse(ctx, 34, hy, 15, 13, 0, body);
      U.ellipse(ctx, 46, hy + 4, 10, 7, 0, dark);
      U.circle(ctx, 54, hy + 2, 3, '#111');
      U.ellipse(ctx, 28, hy - 6, 6, 11, 0.5, dark);
      U.circle(ctx, 38, hy - 3, 2.2, this.state === 'chase' ? '#ff3043' : '#111');
      if (this.state === 'chase' && Math.sin(t * 12) > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(48, hy + 8, 2, 3);
        ctx.fillRect(52, hy + 8, 2, 3);
        U.ellipse(ctx, 50, hy + 12, 3, 4, 0, '#e8607a');
      }
      ctx.restore();
      this._ov = { x, y: y - 78 };
    }

    drawOverlay(ctx, t) {
      if (this.mark && this._ov) RC.Draw.alertMark(ctx, this._ov.x, this._ov.y, this.mark, t, 0.8);
    }
  }

  RC.Dog = Dog;
})(window.RC);
