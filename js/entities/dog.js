/* =========================================================================
 *  RED CRIME - Bekçi köpeği
 *  Bahçede uyur; sesle uyanır, oyuncuyu görünce havlar (havlaması ev
 *  sahiplerini uyandırır) ve kovalar. Isırırsa oyuncu elindekini düşürür.
 *
 *  Zeki köpek (spec.smart, ör. final konağındaki Doberman):
 *  - Hafif uyur, arada uyanıp bahçede devriye gezer.
 *  - Oyuncunun bahçede bıraktığı koku izini sürer; çalıya saklanmak onu
 *    kandırmaz, yakına gelirse kokudan bulur.
 *  - Fırlatılan eşyaya bir kez kanar; sonrakilerde taze kokuya döner.
 *  - Gözden kaybedince oyuncunun gittiği yönü tahmin eder.
 *  - İz eve giriyorsa dış kapının önüne oturup bekler.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const SCENT_LIFE = 28; // koku izi bu kadar saniye taze kalır

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
      // Zeki köpek
      this.smart = !!spec.smart;
      this.trail = []; // {x, t}: oyuncunun bahçedeki koku izi
      this.trailT = 0;
      this.trackIdx = 0;
      this.fooled = 0; // kaç kez fırlatılan eşyaya kandı
      this.chasingThrow = false;
      this.napT = this.smart ? U.rand(14, 24) : Infinity;
      this.lastSeenX = this.x;
      this.lastSeenVx = 0;
      this.toastT = {};
      this.leap = null; // zeki köpeğin havuz üstünden atlayışı
    }

    /** Aynı bildirimi sık sık göstermemek için */
    note(key, text, col, gap = 12) {
      if ((this.toastT[key] || -1e9) > this.t - gap) return;
      this.toastT[key] = this.t;
      this.scene.toast(RC.L(text, { n: this.name || RC.L('Köpek') }), col);
    }

    /** x'e r px yakın, en yeni ve taze koku noktasının indisi (yoksa -1) */
    scentNear(x, r, maxAge = SCENT_LIFE) {
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const s = this.trail[i];
        if (this.t - s.t > maxAge) break;
        if (Math.abs(s.x - x) < r) return i;
      }
      return -1;
    }

    /** Bahçe sınırı: oyuncu evin içinde mi (kapıdan girmiş) */
    playerIndoors(p) {
      return p.cx > this.range[1] + 60 || p.bottom < -140;
    }

    hear(ev) {
      const d = U.dist(this.x, -20, ev.x, ev.y);
      const radius = (120 + 520 * ev.loud) * (this.smart ? 1.35 : 1);
      if (d > radius || ev.src === 'bark') return;
      const eff = ev.loud * (1 - d / radius);
      const thrown = ev.src === 'item' || ev.src === 'break';
      if (this.state === 'sleep') {
        if (this.knocked > 0) return;
        this.alert += eff * (this.smart ? 150 : 90);
        if (this.alert > 60) this.investigate(ev.x, thrown);
      } else if (this.state !== 'chase' && eff > 0.1) {
        // Zeki köpek aynı numaraya ikinci kez kanmaz: taze koku varsa ona döner
        if (this.smart && thrown && this.fooled >= 1 && this.scentNear(ev.x, 160, 8) < 0) {
          this.facing = Math.sign(ev.x - this.x) || this.facing;
          if (this.trail.length && this.t - this.trail[this.trail.length - 1].t < SCENT_LIFE) this.startTrack();
          this.note('fool', '{n} bu numaraya ikinci kez kanmadı!', '#ff8c2e', 8);
          return;
        }
        this.investigate(ev.x, thrown);
      }
    }

    investigate(x, thrown) {
      this.targetX = x;
      this.chasingThrow = thrown;
      this.setState('alert');
    }

    startTrack() {
      // İzin, köpeğe en yakın taze noktasından başla
      let best = -1;
      let bd = 1e9;
      for (let i = 0; i < this.trail.length; i++) {
        if (this.t - this.trail[i].t > SCENT_LIFE) continue;
        const dd = Math.abs(this.trail[i].x - this.x);
        if (dd < bd) {
          bd = dd;
          best = i;
        }
      }
      if (best < 0) return false;
      this.trackIdx = best;
      this.setState('track');
      this.note('track', '{n} izini sürüyor!', '#ffc83d');
      return true;
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
      } else if (s === 'alert' || s === 'track') {
        this.mark = '?';
      } else if (s === 'guard') {
        this.mark = '!';
      } else {
        this.mark = null;
      }
    }

    canSee(p) {
      const W = this.scene.world;
      if (this.state === 'sleep') return false;
      // Zeki köpek saklanan oyuncuyu burnuyla bulur
      if (p.hidden) return this.smart && Math.abs(p.cx - this.x) < 60 && p.bottom > -60;
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
      if (this.leap) {
        this.updateLeap(dt);
        return;
      }
      const sees = this.canSee(p);
      if (sees) {
        this.lastSeenX = p.cx;
        this.lastSeenVx = p.vx;
      }
      if (this.smart) this.updateScent(p, dt);

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
          // Çok yakından geçilirse uyanır (zeki köpek çömelmişi de sezer)
          if (Math.abs(p.cx - this.x) < (this.smart ? 130 : 70) && p.bottom > -40 && (this.smart || !p.crouch) && !p.hidden) this.alert += (this.smart ? 45 : 60) * dt;
          if (this.alert > 60) this.setState('alert');
          // Hafif uyku: arada kalkıp bahçeyi kolaçan eder
          this.napT -= dt;
          if (this.napT <= 0) {
            this.napT = U.rand(18, 30);
            this.patrolX = U.rand(this.range[0], this.range[1]);
            this.setState('patrol');
          }
          break;
        case 'patrol':
          if (sees) {
            this.setState('chase');
            break;
          }
          if (this.sniffAround()) break;
          if (this.moveTo(this.patrolX, 95, dt)) {
            if (this.stateT > 14) this.setState('return');
            else this.patrolX = U.rand(this.range[0], this.range[1]);
          }
          break;
        case 'alert':
          if (sees) {
            this.setState('chase');
            break;
          }
          if (this.smart && this.sniffAround()) break;
          if (this.moveTo(this.targetX, this.smart ? 150 : 110, dt) && this.chasingThrow && this.stateT > 1.5) {
            // Fırlatılan eşyaya kandı: bir dahakine kanmayacak
            this.chasingThrow = false;
            this.fooled++;
          }
          if (this.stateT > 6) this.setState(this.smart ? 'patrol' : 'return');
          if (this.state === 'patrol') this.patrolX = U.rand(this.range[0], this.range[1]);
          break;
        case 'track':
          this.updateTrack(p, sees, dt);
          break;
        case 'guard':
          // Kapının önünde oturur, çıkmanı bekler
          if (sees) {
            this.setState('chase');
            break;
          }
          this.moveTo(this.range[1] - 10, 160, dt);
          this.facing = 1;
          if (Math.random() < dt * 0.25) RC.Audio.play('growl', { x: this.x, y: this.y, vol: 0.35 });
          if (this.stateT > 28) {
            this.patrolX = U.rand(this.range[0], this.range[1]);
            this.setState('patrol');
          }
          break;
        case 'chase':
          if (sees) {
            this.targetX = p.cx;
            this.lost = 0;
          } else {
            if (!this.lost && this.smart) {
              // Gözden kaybolunca gidilen yönü tahmin et
              this.targetX = this.lastSeenX + U.clamp(this.lastSeenVx, -300, 300) * 1.2;
            }
            this.lost = (this.lost || 0) + dt;
          }
          this.moveTo(this.targetX, this.smart ? 300 : 265, dt);
          this.barkT -= dt;
          if (this.barkT <= 0) {
            this.barkT = 0.75;
            this.bark();
          }
          if (this.lost > (this.smart ? 1.6 : 3.5)) {
            if (this.smart && this.playerIndoors(p)) this.startGuard();
            else if (!(this.smart && this.startTrack())) this.setState('return');
          }
          // Isırma (zeki köpek saklandığın çalıdan da çeker)
          if ((!p.hidden || this.smart) && this.biteCooldown <= 0 && Math.abs(p.cx - this.x) < 34 && p.bottom > -50) {
            if (p.hidden) this.note('found', '{n} seni saklandığın yerde buldu!', '#ff3043', 4);
            p.bitten(this.x);
            this.biteCooldown = 3;
            this.setState('sniff');
          }
          break;
        case 'sniff':
          this.speed = 0;
          if (this.stateT > (this.smart ? 1.4 : 2.5)) this.setState(sees ? 'chase' : 'return');
          break;
        case 'return':
          if (sees) {
            this.setState('chase');
            break;
          }
          if (this.smart && this.sniffAround()) break;
          if (this.moveTo(this.homeX + 60, 90, dt)) {
            this.setState('sleep');
            this.alert = 20;
          }
          break;
      }
    }

    /** Oyuncu bahçede yürürken arkasında koku bırakır */
    updateScent(p, dt) {
      this.trailT -= dt;
      if (this.trailT > 0) return;
      this.trailT = 0.25;
      const inGarden = p.cx > this.range[0] - 80 && p.cx < this.range[1] + 50 && p.bottom > -60;
      const last = this.trail[this.trail.length - 1];
      if (inGarden && (!last || Math.abs(last.x - p.cx) > 12 || this.t - last.t > 2)) this.trail.push({ x: p.cx, t: this.t });
      while (this.trail.length && (this.t - this.trail[0].t > SCENT_LIFE || this.trail.length > 160)) {
        this.trail.shift();
        this.trackIdx = Math.max(0, this.trackIdx - 1);
      }
    }

    /** Uyanıkken burnunun dibinde taze koku varsa ize geçer */
    sniffAround() {
      if (this.scentNear(this.x, 50, 20) < 0) return false;
      return this.startTrack();
    }

    startGuard() {
      this.setState('guard');
      this.note('guard', '{n} kapının önüne oturdu, çıkmanı bekliyor...', '#ff8c2e', 20);
    }

    /** Koku izini eskiden yeniye takip eder; iz eve giriyorsa kapıyı tutar */
    updateTrack(p, sees, dt) {
      if (sees) {
        this.setState('chase');
        return;
      }
      const tr = this.trail;
      if (this.trackIdx >= tr.length) this.trackIdx = tr.length - 1;
      const pt = tr[this.trackIdx];
      if (!pt || this.t - tr[tr.length - 1].t > SCENT_LIFE) {
        this.setState('return');
        return;
      }
      if (this.moveTo(pt.x, 175, dt) || Math.abs(pt.x - this.x) < 14) {
        if (this.trackIdx < tr.length - 1) this.trackIdx++;
        else if (this.playerIndoors(p)) this.startGuard();
        else if (this.stateT > 2) {
          this.patrolX = U.rand(this.range[0], this.range[1]);
          this.setState('patrol');
        }
      }
      // Burun yerde: arada koklama duraklaması
      if (Math.random() < dt * 0.4) this.scene.particles.ring(this.x + this.facing * 30, -8, 24, '#c9b98a', 0.4, 1.5);
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
      // Havuza girmesin; zeki köpek hedef karşı taraftaysa üstünden atlar
      const pool = this.scene.world.pool;
      if (pool && this.x > pool.x0 - 10 && this.x < pool.x1 + 10) {
        this.x = this.facing > 0 ? pool.x0 - 10 : pool.x1 + 10;
        const across = this.facing > 0 ? tx > pool.x1 + 10 : tx < pool.x0 - 10;
        if (this.smart && across) {
          this.leap = { x0: this.x, x1: this.facing > 0 ? pool.x1 + 12 : pool.x0 - 12, t: 0 };
          this.leap.dur = Math.abs(this.leap.x1 - this.leap.x0) / 420 + 0.25;
          RC.Audio.play('whoosh', { x: this.x, y: -30, vol: 0.4, pitch: 1.4 });
          return false;
        }
        return true;
      }
      return false;
    }

    /** Havuzun üstünden yay çizerek atlar; bu sırada başka bir şey yapmaz */
    updateLeap(dt) {
      const L = this.leap;
      L.t += dt;
      const k = U.clamp01(L.t / L.dur);
      this.x = U.lerp(L.x0, L.x1, k);
      this.y = -Math.sin(k * Math.PI) * 80;
      this.speed = 300;
      this.phase += dt * 10;
      if (k >= 1) {
        this.leap = null;
        this.y = 0;
        RC.Audio.play('land', { x: this.x, y: -10, vol: 0.4 });
      }
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
      // Zeki köpek: siyah-kahve Doberman, dik kulaklar, çivili tasma
      const body = this.smart ? '#231c18' : '#e6d3a8';
      const dark = this.smart ? '#a8592a' : '#2a2018';
      // Gölge
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      U.ellipse(ctx, 0, -1, 34, 5, 0);
      if (sleeping) {
        U.ellipse(ctx, 0, -16, 34, 16, 0, body);
        U.ellipse(ctx, 26, -12, 14, 11, 0, body);
        U.ellipse(ctx, 34, -10, 8, 6, 0, dark);
        if (this.smart) this.drawEar(ctx, 22, -22, body);
        else U.ellipse(ctx, 22, -20, 6, 10, 0.6, dark);
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
        ctx.strokeStyle = this.smart ? '#1a1411' : U.shade(body, -0.15);
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        U.line(ctx, lx, -20, lx + s, -3);
        U.ellipse(ctx, lx + s + 2, -3, 4, 2.5, 0, this.smart ? '#a8592a' : dark);
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
      ctx.fillStyle = this.smart ? '#15151a' : '#c23a2b';
      ctx.fillRect(22, -40 + bob, 6, 16);
      if (this.smart) {
        ctx.fillStyle = '#d9dde4';
        for (let k = 0; k < 3; k++) U.circle(ctx, 25, -37 + bob + k * 5, 1.4);
      }
      // Kafa
      const nose = this.state === 'sniff' || this.state === 'track' ? 18 + Math.sin(t * 14) * 2 : 0;
      const hy = -44 + bob + nose;
      U.ellipse(ctx, 34, hy, 15, 13, 0, body);
      U.ellipse(ctx, 46, hy + 4, 10, 7, 0, dark);
      U.circle(ctx, 54, hy + 2, 3, '#111');
      if (this.smart) {
        this.drawEar(ctx, 28, hy - 8, body);
        U.circle(ctx, 38, hy - 6, 2, '#a8592a'); // kaş lekesi
      } else U.ellipse(ctx, 28, hy - 6, 6, 11, 0.5, dark);
      const eye = this.state === 'chase' ? '#ff3043' : this.smart ? '#ffb347' : '#111';
      U.circle(ctx, 38, hy - 3, 2.2, eye);
      if (this.state === 'chase' && Math.sin(t * 12) > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(48, hy + 8, 2, 3);
        ctx.fillRect(52, hy + 8, 2, 3);
        U.ellipse(ctx, 50, hy + 12, 3, 4, 0, '#e8607a');
      }
      ctx.restore();
      this._ov = { x, y: y - 78 };
    }

    /** Doberman'ın dik, sivri kulağı */
    drawEar(ctx, x, y, col) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 4);
      ctx.lineTo(x - 2, y - 14);
      ctx.lineTo(x + 5, y + 2);
      ctx.closePath();
      ctx.fill();
    }

    drawOverlay(ctx, t) {
      if (this.mark && this._ov) RC.Draw.alertMark(ctx, this._ov.x, this._ov.y, this.mark, t, 0.8);
    }
  }

  RC.Dog = Dog;
})(window.RC);
