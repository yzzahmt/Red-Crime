/* =========================================================================
 *  RED CRIME - Ev sahibi ve bekçi yapay zekâsı
 *  Durumlar:
 *   sleep       → horlar, sesleri "uyanma" göstergesine ekler
 *   waking      → yatakta doğrulur, ışıkları açar
 *   investigate → sesin geldiği yere gider (katlar arası yol bulma, kapıları açar)
 *   search      → etrafa bakınır, yakın noktaları kontrol eder
 *   sweep       → BÜTÜN EVİ oda oda gezer
 *   chase       → oyuncuyu gördü, peşinden koşar
 *   return      → pes eder, yatağına döner, kapısını kapatıp tekrar uyur
 *   patrol      → (bekçi) sabit bir rota boyunca el feneriyle devriye
 *   knocked     → uyku gazıyla bayıldı
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const L = (s, v) => RC.L(s, v);
  const R = 25;

  class Resident {
    constructor(scene, cfg, bedSpot, index, guard = false) {
      this.scene = scene;
      this.cfg = cfg;
      this.index = index;
      this.isGuard = guard;
      this.name = cfg.name;
      this.color = cfg.color;
      this.bed = bedSpot.furn;
      this.room = bedSpot.room;
      this.k = bedSpot.k != null ? bedSpot.k : this.room.k;
      this.bedX = this.bed ? this.bed.x + 150 : bedSpot.x;
      this.x = this.bedX;
      this.y = scene.world.floorY(this.k);
      this.facing = -1;
      this.state = guard ? 'patrol' : 'sleep';
      this.stateT = 0;
      this.wake = 0;
      this.sleepDepth = cfg.sleepDepth || 1;
      this.alertness = 1;
      this.timesWoken = 0;
      this.suspicion = 0;
      this.target = null;
      this.path = [];
      this.seg = null;
      this.speech = null;
      this.mark = null;
      this.markT = 0;
      this.lastSeen = null;
      this.lostT = 0;
      this.searchT = 0;
      this.lookT = 0;
      this.stirT = 0;
      this.snoreT = U.rand(0, 2);
      this.snoreInhale = true;
      this.walkPhase = 0;
      this.t = U.rand(0, 10);
      this.seesPlayer = false;
      this.sawHideAt = null;
      this.bob = 0;
      this.coneAlpha = 0;
      this.doorT = 0;
      this.doorWait = null;
      this.sweepRoute = null;
      this.sweepDone = false;
      this.knockT = 0;
      this.patrolIdx = 0;
      this.patrolWait = 0;
      this.chatT = U.rand(8, 16);
      if (guard) this.buildPatrol();
    }

    /** Zorluk ayarı x gerilim aşaması çarpanları (bkz. RC.Heat) */
    get diff() {
      return this.scene.diffEff || this.scene.diff;
    }
    get headY() {
      return this.state === 'sleep' && this.bed ? this.bed.y + 16 : this.y - R * 2 + 6;
    }
    get awake() {
      return this.state !== 'sleep' && this.state !== 'knocked';
    }
    get cx() {
      return this.x;
    }
    get displayName() {
      return L(this.name);
    }

    /* ==================================================================
     * DUYMA
     * ================================================================ */
    hear(ev) {
      if (this.state === 'waking' || this.state === 'knocked') return;
      const W = this.scene.world;
      const evK = this.scene.floorOf(ev.y);
      const df = Math.abs(evK - this.k);
      const d = U.dist(this.x, this.headY, ev.x, ev.y);
      const radius = 160 + 860 * ev.loud;
      if (d > radius) return;
      let atten = Math.pow(this.state === 'sleep' ? 0.3 : 0.45, df);
      // Kapalı kapılar sesi boğar
      if (df === 0) atten *= Math.pow(0.5, RC.Doors.closedBetween(W, this.k, ev.x, this.x));
      const evOut = ev.x < W.house.x || ev.x > W.house.r;
      const meOut = this.x < W.house.x || this.x > W.house.r;
      if (evOut !== meOut) atten *= 0.55;
      if (this.scene.weather === 'rain') atten *= 0.85;
      if (this.isGuard) atten *= 1.25;
      const eff = ev.loud * (1 - d / radius) * atten * this.diff.hearing * this.alertness;
      if (eff < 0.02) return;

      if (this.state === 'sleep') {
        if (eff < 0.028) return;
        const add = (eff * 80) / this.sleepDepth;
        this.wake += add;
        if (add > 4) this.scene.onResidentStir(this, add);
        if (this.wake >= 100) {
          this.wakeUp(ev.x, evK);
        } else if (this.wake > 45 && this.stirT <= 0) {
          this.stirT = 4;
          this.say(U.pick(C.LINES.stir), 1.6);
          this.setMark('?', 1.5);
          RC.Audio.play('mumble', { x: this.x, y: this.headY, vol: 0.7 });
        }
        return;
      }
      if (this.state === 'chase') return;
      if (eff > (this.isGuard ? 0.05 : 0.07)) {
        const changed = !this.target || Math.abs(this.target.x - ev.x) > 60 || this.target.k !== evK || this.state === 'patrol' || this.state === 'sweep';
        if (changed) {
          this.investigate(ev.x, evK);
          if (this.speechCooldown() && ev.src !== 'bark') this.say(U.pick(C.LINES.investigate), 1.6);
        }
      }
    }

    speechCooldown() {
      return !this.speech || this.speech.t > this.speech.dur - 0.2;
    }

    /* ==================================================================
     * DURUM GEÇİŞLERİ
     * ================================================================ */
    wakeUp(x, k) {
      if (this.isGuard) {
        this.investigate(x, k);
        return;
      }
      this.state = 'waking';
      this.stateT = 0;
      this.timesWoken++;
      this.wake = 100;
      this.sweepDone = false;
      this.pending = { x, k };
      this.say(U.pick(C.LINES.wake), 2);
      this.setMark('!', 2);
      RC.Audio.play('gasp', { x: this.x, y: this.headY, vol: 1 });
      this.scene.onResidentWake(this);
    }

    investigate(x, k) {
      this.state = 'investigate';
      this.stateT = 0;
      this.setTarget(k, x);
      this.setMark('?', 2);
    }

    startSearch() {
      this.state = 'search';
      this.stateT = 0;
      this.searchT = U.rand(5, 7);
      this.lookT = 0.8;
      this.path = [];
      this.seg = null;
    }

    /** Bütün evi oda oda gez */
    startSweep() {
      const W = this.scene.world;
      const rooms = W.rooms.slice();
      // Önce bulunduğu kat, sonra yakın katlar; kat içinde yakınlığa göre
      rooms.sort((a, b) => {
        const da = Math.abs(a.k - this.k) * 100000 + Math.abs((a.x0 + a.x1) / 2 - this.x);
        const db = Math.abs(b.k - this.k) * 100000 + Math.abs((b.x0 + b.x1) / 2 - this.x);
        return da - db;
      });
      this.sweepRoute = rooms.map((r) => ({ k: r.k, x: (r.x0 + r.x1) / 2 + U.rand(-80, 80), name: r.name }));
      if (W.garden && this.scene.cfg.garden > 800) this.sweepRoute.push({ k: 0, x: (W.garden.x0 + W.garden.x1) / 2 });
      this.state = 'sweep';
      this.stateT = 0;
      this.sweepWait = 0;
      this.nextSweep();
      if (this.speechCooldown()) this.say(U.pick(C.LINES.sweep), 2);
      this.setMark('?', 3);
    }

    nextSweep() {
      const n = this.sweepRoute.shift();
      if (!n) {
        this.sweepDone = true;
        this.giveUp();
        return;
      }
      this.setTarget(n.k, n.x);
    }

    /** Hırsızlığı fark etti: durur, telefonu çıkarır ve 911'i arar */
    beginCall(thenChase, reason) {
      if (this.state === 'calling') return;
      this.state = 'calling';
      this.stateT = 0;
      this.callThenChase = thenChase;
      this.path = [];
      this.seg = null;
      this.calledOut = false;
      this.say(reason || 'HIRSIZ!', 1.4);
      this.setMark('!', 4);
      RC.Audio.play('shout', { x: this.x, y: this.headY, vol: 1 });
      if (thenChase) this.scene.onSpotted(this);
    }

    /** Oda içinde hırsızlık izi var mı? (alınan eşyalar, açık çekmece, açık kasa, kırıklar) */
    checkEvidence() {
      if (this.isGuard || this.scene.policeCalled || this.evidenceT > 0) return;
      const room = this.scene.roomAt(this.k, this.x);
      if (!room) return;
      const W = this.scene.world;
      const safeOpen = W.safe && W.safe.state.open && W.safeRoom === room;
      if ((room.stolen || 0) >= 3 || (room.opened || 0) >= 1 || safeOpen || (room.broken || 0) >= 1) {
        this.evidenceT = 999;
        this.beginCall(false, safeOpen ? 'Kasam açılmış!' : 'Soyulmuşuz!');
      }
    }

    /** Silah sesi: korkup kaçar ve saklanır */
    scare(fromX) {
      if (this.state === 'sleep') this.wakeUp(fromX, this.k);
      this.state = 'flee';
      this.stateT = 0;
      this.fleeT = 18;
      const f = this.scene.world.floorByK[this.k];
      const far = Math.abs(f.walk[0] - fromX) > Math.abs(f.walk[1] - fromX) ? f.walk[0] : f.walk[1];
      this.setTarget(this.k, far);
      this.setMark('!', 3);
      this.say('Silah var! Kaçın!', 1.8);
    }

    startChase() {
      const p = this.scene.player;
      if (!this.isGuard && !this.scene.policeCalled && this.state !== 'chase') {
        this.lastSeen = { x: p.cx, k: this.scene.floorOf(p.bottom - 2) };
        this.beginCall(true);
        return;
      }
      if (this.state !== 'chase') {
        this.say(U.pick(C.LINES.spot), 1.8);
        RC.Audio.play('shout', { x: this.x, y: this.headY, vol: 1 });
        this.scene.onSpotted(this);
      }
      this.state = 'chase';
      this.stateT = 0;
      this.lostT = 0;
      this.setMark('!', 99);
      this.lastSeen = { x: p.cx, k: this.scene.floorOf(p.bottom - 2) };
      this.setTarget(this.lastSeen.k, this.lastSeen.x);
    }

    giveUp() {
      if (this.isGuard) {
        this.state = 'patrol';
        this.stateT = 0;
        this.setMark(null);
        this.say(U.pick(C.LINES.guard), 1.8);
        this.gotoPatrol();
        return;
      }
      this.state = 'return';
      this.stateT = 0;
      this.say(U.pick(C.LINES.giveUp), 2.2);
      this.setMark(null);
      this.setTarget(this.room.k, this.bedX);
    }

    goToSleep() {
      this.state = 'sleep';
      this.stateT = 0;
      this.x = this.bedX;
      this.wake = Math.min(50, 10 + this.timesWoken * 10);
      this.alertness = Math.min(1.8, this.alertness * 1.15);
      this.suspicion = 0;
      this.setMark(null);
      this.path = [];
      this.seg = null;
      // Yatak odasının kapılarını kapat
      for (const d of this.scene.world.doors) if (d.bedroom && (d.left === this.room || d.right === this.room)) RC.Doors.close(this.scene, d, this);
      this.scene.onResidentSleep(this);
    }

    /** Uyku gazı */
    knockOut(sec) {
      if (this.state === 'knocked') return;
      this.prevState = this.state;
      this.state = 'knocked';
      this.knockT = sec;
      this.path = [];
      this.seg = null;
      this.setMark(null);
      this.say(U.pick(C.LINES.gas), 1.5);
      if (this.climbing) this.climbing = false;
    }

    say(text, dur = 1.8) {
      this.speech = { text: L(text), t: 0, dur };
    }
    setMark(m, dur = 1.5) {
      this.mark = m;
      this.markT = dur;
    }

    /* ==================================================================
     * BEKÇİ DEVRİYESİ
     * ================================================================ */
    buildPatrol() {
      const W = this.scene.world;
      const pts = [];
      const floors = W.floors.filter((f) => f.k >= 0 && f.k <= 1);
      for (const f of floors) for (const r of f.rooms) pts.push({ k: f.k, x: (r.x0 + r.x1) / 2 });
      if (W.garden && this.scene.cfg.garden > 500) pts.push({ k: 0, x: W.garden.x0 + 200 + Math.random() * (W.garden.x1 - W.garden.x0 - 400) });
      U.shuffle(pts);
      this.patrol = pts;
      this.patrolIdx = 0;
    }

    gotoPatrol() {
      if (!this.patrol || !this.patrol.length) return;
      const p = this.patrol[this.patrolIdx % this.patrol.length];
      this.setTarget(p.k, p.x);
    }

    /* ==================================================================
     * YOL BULMA (katlar arası)
     * ================================================================ */
    setTarget(k, x) {
      this.target = { k, x };
      this.path = this.planPath(this.k, k, x);
      this.seg = null;
    }

    clampWalk(k, x) {
      const f = this.scene.world.floorByK[k];
      if (!f || !f.walk) return x;
      return U.clamp(x, f.walk[0], f.walk[1]);
    }

    planPath(fromK, toK, toX) {
      const W = this.scene.world;
      const path = [];
      let cur = fromK;
      let guard = 0;
      while (cur !== toK && guard++ < 10) {
        if (toK > cur) {
          if (cur === -1) {
            const l = W.ladders[0];
            if (!l) break;
            path.push({ type: 'walk', k: cur, x: l.x });
            path.push({ type: 'ladder', ladder: l, dir: -1, fromK: cur, toK: cur + 1 });
          } else {
            const st = W.stairs.find((s) => s.k === cur);
            if (!st) break;
            path.push({ type: 'walk', k: cur, x: st.bottom.x });
            path.push({ type: 'stair', stair: st, dir: 1, fromK: cur, toK: cur + 1 });
          }
          cur++;
        } else {
          if (cur === 0 && toK === -1) {
            const l = W.ladders[0];
            if (!l) break;
            path.push({ type: 'walk', k: cur, x: l.x });
            path.push({ type: 'ladder', ladder: l, dir: 1, fromK: cur, toK: cur - 1 });
          } else {
            const st = W.stairs.find((s) => s.k === cur - 1);
            if (!st) break;
            path.push({ type: 'walk', k: cur, x: st.top.x });
            path.push({ type: 'stair', stair: st, dir: -1, fromK: cur, toK: cur - 1 });
          }
          cur--;
        }
      }
      path.push({ type: 'walk', k: cur, x: this.clampWalk(cur, toX) });
      return path;
    }

    /** Yolu takip eder; hedefe varınca true döner */
    followPath(dt, speed) {
      if (this.doorT > 0) {
        this.doorT -= dt;
        if (this.doorT <= 0 && this.doorWait) {
          RC.Doors.open(this.scene, this.doorWait, this);
          if (this.state !== 'chase' && U.chance(0.3) && this.speechCooldown()) this.say(U.pick(C.LINES.door), 1.4);
          this.doorWait = null;
        }
        return false;
      }
      if (!this.seg) {
        if (!this.path.length) return true;
        this.seg = this.path.shift();
        this.seg.t = 0;
      }
      const s = this.seg;
      const W = this.scene.world;
      if (s.type === 'walk') {
        const tx = this.clampWalk(s.k, s.x);
        const dx = tx - this.x;
        if (Math.abs(dx) < 4) {
          this.x = tx;
          this.seg = null;
          return !this.path.length;
        }
        // Önünde kapalı kapı var mı?
        const door = RC.Doors.nextClosed(W, this.k, this.x, tx);
        if (door && Math.abs(door.x - this.x) < 30) {
          this.facing = Math.sign(dx);
          this.doorWait = door;
          this.doorT = door.locked ? 1.1 : 0.55;
          if (door.locked) RC.Audio.play('key', { x: door.x, y: door.y - 100, vol: 0.5 });
          return false;
        }
        this.facing = Math.sign(dx);
        let step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
        if (door) {
          const lim = door.x - Math.sign(dx) * 28;
          if ((this.x + step - lim) * Math.sign(dx) > 0) step = lim - this.x;
        }
        this.x += step;
        this.y = W.floorY(this.k);
        this.walkPhase += speed * dt * 0.06;
        this.footsteps(dt, speed);
      } else if (s.type === 'stair') {
        const st = s.stair;
        const a = s.dir > 0 ? st.bottom : st.top;
        const b = s.dir > 0 ? st.top : st.bottom;
        const len = U.dist(a.x, a.y, b.x, b.y);
        s.t += (speed * 0.75 * dt) / len;
        const t = Math.min(1, s.t);
        this.x = U.lerp(a.x, b.x, t);
        this.y = U.lerp(a.y, b.y, t);
        this.facing = Math.sign(b.x - a.x) || this.facing;
        this.walkPhase += speed * dt * 0.06;
        this.footsteps(dt, speed * 0.8);
        if (s.t >= 1) {
          this.k = s.toK;
          this.y = W.floorY(this.k);
          this.seg = null;
        }
      } else if (s.type === 'ladder') {
        const l = s.ladder;
        const a = s.dir > 0 ? W.floorY(0) : W.floorY(-1);
        const b = s.dir > 0 ? W.floorY(-1) : W.floorY(0);
        s.t += (110 * dt) / Math.abs(b - a);
        const t = Math.min(1, s.t);
        this.x = l.x;
        this.y = U.lerp(a, b, t);
        this.climbing = true;
        if (s.t >= 1) {
          this.k = s.toK;
          this.y = W.floorY(this.k);
          this.climbing = false;
          this.seg = null;
        }
      }
      return false;
    }

    footsteps(dt, speed) {
      this.stepAcc = (this.stepAcc || 0) + speed * dt;
      if (this.stepAcc > 52) {
        this.stepAcc = 0;
        RC.Audio.play('step', { x: this.x, y: this.y, vol: 0.9, pitch: 0.75, heavy: 0.7, minGap: 0 });
      }
    }

    /* ==================================================================
     * GÖRME
     * ================================================================ */
    canSee(p) {
      const scene = this.scene;
      const W = scene.world;
      if (!this.awake || this.state === 'waking' || this.climbing) return false;
      if (p.hiddenInTruck) return false;
      const pcx = p.cx;
      const pcy = p.cy;
      const eyeY = this.y - R * 1.3;
      const d = U.dist(this.x, eyeY, pcx, pcy);
      if (p.hidden) {
        if (this.state === 'chase' && this.sawHideAt && d < 70) return true;
        return false;
      }
      if (RC.Security.inCloud(scene, pcx, pcy) || RC.Security.lineThroughCloud(scene, this.x, eyeY, pcx, pcy)) return false;
      const floorY = W.floorY(this.k);
      if (pcy > floorY + 20 || pcy < floorY - C.FLOOR_H + 10) {
        if (Math.abs(pcy - eyeY) > 140) return false;
      }
      const dx = pcx - this.x;
      if (dx * this.facing < -20 && d > 50) return false;
      const outdoors = pcx < W.house.x || pcx > W.house.r;
      let range = (scene.lightsOn && !outdoors ? 620 : outdoors ? 300 : 240) * this.diff.sight;
      if (outdoors && scene.nearOutdoorLight(pcx, pcy)) range += 140;
      if (p.flashOn) range += 200;
      if (this.isGuard) range += 200; // el feneri
      if (p.crouch) range *= 0.7;
      if (this.state === 'chase') range *= 1.3;
      if (d > range) return false;
      if (Math.abs(pcy - eyeY) > Math.abs(dx) + 90) return false;
      return RC.Physics.lineOfSight(W.grid, this.x, eyeY, pcx, pcy);
    }

    /* ==================================================================
     * GÜNCELLEME
     * ================================================================ */
    update(dt) {
      const scene = this.scene;
      const p = scene.player;
      this.t += dt;
      this.stateT += dt;
      if (this.stirT > 0) this.stirT -= dt;
      if (this.speech) {
        this.speech.t += dt;
        if (this.speech.t > this.speech.dur) this.speech = null;
      }
      if (this.markT > 0) {
        this.markT -= dt;
        if (this.markT <= 0 && this.state !== 'chase') this.mark = null;
      }
      const spd = this.diff.speed * (this.isGuard ? 1.08 : 1);

      switch (this.state) {
        case 'sleep': {
          this.wake = Math.max(0, this.wake - 4.5 * this.diff.decay * dt);
          this.snoreT -= dt;
          if (this.snoreT <= 0) {
            this.snoreT = this.snoreInhale ? 1.1 : 1.6;
            RC.Audio.play('snore', { x: this.x, y: this.headY, vol: 0.9, inhale: this.snoreInhale, minGap: 0 });
            if (!this.snoreInhale) scene.particles.zzz(this.bed.x + 40, this.bed.y);
            this.snoreInhale = !this.snoreInhale;
          }
          if (p.flashOn && scene.flashlightHits(this.bed.x + 40, this.bed.y + 16)) {
            this.wake += 18 * dt * this.alertness * this.diff.sight;
            if (this.wake >= 100) this.wakeUp(p.cx, scene.floorOf(p.bottom - 2));
            else if (this.stirT <= 0 && this.wake > 50) {
              this.stirT = 3;
              this.say('Işık mı var...?', 1.5);
              this.setMark('?', 1.5);
            }
          }
          break;
        }
        case 'waking': {
          if (this.stateT > 1.5) {
            this.x = this.bed.x + this.bed.w + 20;
            this.investigate(this.pending.x, this.pending.k);
          }
          break;
        }
        case 'investigate': {
          const arrived = this.followPath(dt, 125 * spd);
          if (arrived) this.startSearch();
          break;
        }
        case 'search': {
          this.searchT -= dt;
          this.lookT -= dt;
          if (this.seg || this.path.length || this.doorT > 0) {
            this.followPath(dt, 95 * spd);
          } else if (this.lookT <= 0) {
            this.lookT = U.rand(0.9, 1.6);
            if (U.chance(0.5)) this.facing *= -1;
            else this.setTarget(this.k, this.x + U.rand(-260, 260));
            if (U.chance(0.25) && this.speechCooldown()) this.say(U.pick(C.LINES.search), 1.4);
          }
          if (this.searchT <= 0) {
            if (!this.sweepDone && !this.isGuard) this.startSweep();
            else this.giveUp();
          }
          break;
        }
        case 'sweep': {
          if (this.sweepWait > 0) {
            this.sweepWait -= dt;
            if (Math.floor(this.sweepWait * 2) !== Math.floor((this.sweepWait + dt) * 2)) this.facing *= -1;
            if (this.sweepWait <= 0) this.nextSweep();
          } else {
            const arrived = this.followPath(dt, 110 * spd);
            if (arrived) this.sweepWait = U.rand(1.2, 2);
          }
          break;
        }
        case 'patrol': {
          if (this.decoyT > 0) {
            this.decoyT -= dt;
            if (this.seg || this.path.length || this.doorT > 0) this.followPath(dt, 150 * spd);
            else if (Math.random() < dt * 0.4) this.facing *= -1;
            if (this.decoyT <= 0) {
              this.say('Asılsız ihbar... Geri dönüyorum.', 1.8);
              this.gotoPatrol();
            }
            break;
          }
          if (this.patrolWait > 0) {
            this.patrolWait -= dt;
            if (this.patrolWait < 0.6 && this.patrolWait + dt >= 0.6) this.facing *= -1;
            if (this.patrolWait <= 0) {
              this.patrolIdx++;
              this.gotoPatrol();
            }
          } else {
            if (!this.target) this.gotoPatrol();
            const arrived = this.followPath(dt, 85 * spd);
            if (arrived) this.patrolWait = U.rand(1.5, 3);
          }
          this.chatT -= dt;
          if (this.chatT <= 0) {
            this.chatT = U.rand(12, 22);
            this.say(U.pick(C.LINES.guard), 1.8);
            RC.Audio.play('mumble', { x: this.x, y: this.headY, vol: 0.5, pitch: 0.8 });
          }
          break;
        }
        case 'chase': {
          const sees = this.canSee(p);
          if (sees) {
            this.lostT = 0;
            this.lastSeen = { x: p.cx, k: scene.floorOf(p.bottom - 2) };
            if (!this.seg || this.stateT % 0.4 < dt || this.target.k !== this.lastSeen.k) this.setTarget(this.lastSeen.k, this.lastSeen.x);
          } else {
            this.lostT += dt;
          }
          const arrived = this.followPath(dt, (this.isGuard ? 225 : 205) * spd);
          if (arrived && !sees) this.lostT += dt * 2;
          if (this.lostT > 2.6) {
            this.say(U.pick(C.LINES.lost), 1.5);
            this.setMark('?', 3);
            this.sawHideAt = null;
            this.investigate(this.lastSeen.x, this.lastSeen.k);
          }
          break;
        }
        case 'return': {
          const arrived = this.followPath(dt, 90 * spd);
          if (arrived && this.k === this.room.k && Math.abs(this.x - this.bedX) < 8) this.goToSleep();
          else if (arrived) this.setTarget(this.room.k, this.bedX);
          break;
        }
        case 'calling': {
          if (this.callThenChase) this.facing = Math.sign(p.cx - this.x) || this.facing;
          if (this.stateT > 1.1 && !this.saidPhone) {
            this.saidPhone = true;
            this.say(U.pick(C.LINES.police), 1.8);
            RC.Audio.play('beep', { x: this.x, y: this.headY, vol: 0.6, pitch: 1.6 });
          }
          if (this.stateT > 2.6 && !this.calledOut) {
            this.calledOut = true;
            this.saidPhone = false;
            scene.callPolice(this, 60);
            if (this.callThenChase) {
              this.state = 'chase';
              this.stateT = 0;
              this.lostT = this.canSee(p) ? 0 : 1.5;
              this.setMark('!', 99);
              if (this.lastSeen) this.setTarget(this.lastSeen.k, this.lastSeen.x);
            } else {
              this.startSweep();
            }
          }
          break;
        }
        case 'flee': {
          this.fleeT -= dt;
          if (this.seg || this.path.length) this.followPath(dt, 170 * spd);
          else if (Math.random() < dt * 0.5) this.facing *= -1;
          if (this.fleeT <= 0) {
            if (this.isGuard) {
              this.state = 'patrol';
              this.gotoPatrol();
            } else this.startSearch();
          }
          break;
        }
        case 'knocked': {
          this.knockT -= dt;
          if (Math.random() < dt * 0.8) scene.particles.zzz(this.x, this.y - 30);
          if (this.knockT <= 0) {
            this.say('Ne oldu bana...?', 1.6);
            if (this.isGuard) {
              this.state = 'patrol';
              this.gotoPatrol();
            } else this.startSearch();
          }
          break;
        }
      }

      /* -------- Görsel algı -------- */
      if (this.evidenceT > 0 && this.evidenceT < 999) this.evidenceT -= dt;
      if (['investigate', 'search', 'sweep'].includes(this.state)) this.checkEvidence();
      const canPerceive = ['investigate', 'search', 'return', 'sweep', 'patrol'].includes(this.state);
      if (canPerceive) {
        const sees = this.canSee(p);
        this.seesPlayer = sees;
        if (sees) {
          const d = U.dist(this.x, this.y - 40, p.cx, p.cy);
          const lit = scene.lightsOn ? 1.6 : 1;
          const rate = (90 + 260 * U.clamp(1 - d / 500, 0, 1)) * lit * this.diff.sight * (p.crouch ? 0.6 : 1) * (this.isGuard ? 1.3 : 1);
          this.suspicion += rate * dt;
          if (d < 90) this.suspicion += 200 * dt;
          this.facing = Math.sign(p.cx - this.x) || this.facing;
          if (this.suspicion > 30) this.setMark('?', 0.5);
          if (this.suspicion >= 100) this.startChase();
        } else {
          this.suspicion = Math.max(0, this.suspicion - 25 * dt);
        }
      } else if (this.state === 'chase') {
        this.suspicion = 100;
        this.seesPlayer = this.lostT === 0;
      } else {
        this.seesPlayer = false;
        this.suspicion = Math.max(0, this.suspicion - 40 * dt);
      }

      if (this.state === 'chase' && p.hidden && !this.sawHideAt && this.lostT < 0.3) {
        if (Math.abs(p.cx - this.x) < 110) this.sawHideAt = { x: p.cx };
      }

      /* -------- Yakalama -------- */
      if (['chase', 'investigate', 'search', 'sweep', 'patrol'].includes(this.state) && !p.hiddenInTruck) {
        if (!p.hidden || (this.state === 'chase' && this.sawHideAt)) {
          const floorY = scene.world.floorY(this.k);
          const onStair = this.seg && this.seg.type === 'stair';
          const touching = Math.abs(p.bottom - floorY) < 46 && Math.abs(p.cx - this.x) < R + 14;
          if (touching && !this.climbing && !onStair && (this.state === 'chase' || this.seesPlayer || this.canSee(p))) scene.caught(this);
        }
      }

      this.coneAlpha = U.damp(this.coneAlpha, this.awake && this.state !== 'waking' ? 1 : 0, 4, dt);
    }

    /* ==================================================================
     * ÇİZİM
     * ================================================================ */
    draw(ctx, t) {
      if (!this.isGuard && (this.state === 'sleep' || (this.state === 'waking' && this.stateT < 0.9))) {
        this.drawInBed(ctx, t);
        return;
      }
      if (this.state === 'knocked') {
        this.drawKnocked(ctx, t);
        return;
      }
      const moving = !!this.seg && this.doorT <= 0;
      const f = this.facing;
      const chase = this.state === 'chase';
      const L = this.lookData();
      const run = moving && (chase || this.state === 'flee');
      const s = Math.sin(this.t * 8);
      // Eller: gövdeye göre (ayak = 0,0), sağa bakış normunda
      let hands = null;
      if (this.climbing) hands = { front: { x: 7, y: -98 + s * 6 }, back: { x: -1, y: -98 - s * 6 } };
      else if (this.state === 'calling') hands = { front: { x: 5, y: -82 } };
      else if (this.state === 'flee') hands = { front: { x: 8, y: -102 }, back: { x: -4, y: -100 } };
      else if (this.doorT > 0) hands = { front: { x: 24, y: -60 } };
      else if (this.isGuard) hands = { front: { x: 22, y: -64 } };
      else if (chase) hands = { front: { x: 12, y: -96 + Math.sin(this.t * 10) * 3 } };
      else if (this.state === 'search' || this.state === 'sweep') hands = { front: { x: 14, y: -54 }, back: { x: 2, y: -50 } };
      if (hands && !hands.back && moving) {
        const k = Math.sin(this.walkPhase * 1.2);
        hands.back = { x: -1 - k * 8, y: -39 };
      }

      const p = this.scene.player;
      const lookY = this.seesPlayer ? U.clamp((p.cy - (this.y - 80)) / 120, -1, 1) : 0;
      const box = { x0: this.x - 60, y0: this.y - 124, x1: this.x + 60, y1: this.y + 4 };
      const res = RC.Draw.shaded(ctx, box, f, (ctx) => RC.Draw.human(ctx, {
        x: this.x,
        y: this.y,
        facing: f,
        look: L,
        pose: run ? 'run' : moving ? 'walk' : 'stand',
        phase: this.walkPhase * 1.2,
        hands,
        eyes: chase ? 'angry' : this.state === 'return' ? 'sleepy' : this.suspicion > 30 || this.state === 'calling' || this.state === 'flee' ? 'wide' : 'open',
        mouth: chase ? 'angry' : this.state === 'return' ? 'flat' : this.suspicion > 30 ? 'o' : this.isGuard ? 'flat' : 'frown',
        lookY,
        shadow: false,
        t,
      }));
      const hf = res.hands.front;

      // Aksesuarlar: telefon, el feneri, oklava
      if (this.state === 'calling') {
        ctx.save();
        ctx.translate(hf.x, hf.y);
        U.fillRoundRect(ctx, -2.5, -7, 5, 11, 1.5, '#15161d');
        ctx.fillStyle = Math.floor(this.t * 6) % 2 ? '#4aa8ff' : '#9fd6ff';
        ctx.fillRect(-1.8, -5.5, 3.6, 7);
        ctx.restore();
      } else if (this.isGuard) {
        ctx.save();
        ctx.translate(hf.x, hf.y);
        ctx.scale(f, 1);
        U.fillRoundRect(ctx, -3, -3, 17, 6, 2, '#2a2d3e');
        U.fillRoundRect(ctx, 12, -4, 4, 8, 1, '#3a3d4e');
        ctx.fillStyle = '#fff7c8';
        ctx.fillRect(15.5, -3.5, 1.5, 7);
        ctx.restore();
      } else if (chase) {
        ctx.save();
        ctx.translate(hf.x, hf.y);
        ctx.scale(f, 1);
        ctx.rotate(-0.9 + Math.sin(this.t * 10) * 0.35);
        const g = ctx.createLinearGradient(0, -3, 0, 3);
        g.addColorStop(0, '#d8a868');
        g.addColorStop(1, '#8a5e30');
        ctx.fillStyle = g;
        U.fillRoundRect(ctx, -4, -2.5, 40, 5, 2.5, g);
        ctx.fillStyle = '#6a4424';
        U.fillRoundRect(ctx, -9, -1.8, 7, 3.6, 1.5, '#6a4424');
        U.fillRoundRect(ctx, 35, -1.8, 7, 3.6, 1.5, '#6a4424');
        ctx.restore();
      }
      this._ov = { x: this.x, y: res.headTop.y };
    }

    /** Görünüm verisi (yapılandırmadaki look + varsayılanlar), bir kez hesaplanır */
    lookData() {
      if (!this._look) this._look = RC.Human.lookFor(this.cfg, this.isGuard);
      return this._look;
    }

    drawKnocked(ctx, t) {
      // Yerde baygın yatar: baş bakış yönünde
      const f = this.facing;
      RC.Draw.human(ctx, {
        x: this.x - f * 44,
        y: this.y - 8,
        rotate: f * (Math.PI / 2),
        facing: 1,
        look: this.lookData(),
        pose: 'lie',
        hands: { front: { x: 10, y: -46 }, back: { x: -6, y: -46 } },
        eyes: 'closed',
        mouth: 'snore',
        shadow: false,
        t: this.t,
      });
      this._ov = { x: this.x + f * 36, y: this.y - 30 };
    }

    drawInBed(ctx, t) {
      const b = this.bed;
      const sitting = this.state === 'waking';
      const L = this.lookData();
      if (sitting) {
        // Yatakta doğrulmuş: bacaklar yorganın altında
        RC.Draw.human(ctx, {
          x: b.x + 46,
          y: b.y + b.h * 0.34 + 42,
          facing: 1,
          look: L,
          pose: 'sit',
          hands: { front: { x: 12, y: -52 }, back: { x: -6, y: -46 } },
          eyes: 'wide',
          mouth: 'open',
          shadow: false,
          t: this.t,
        });
        this._ov = { x: b.x + 48, y: b.y + b.h * 0.34 - 64 };
        return;
      }
      // Sırtüstü uyur: baş yastıkta, gövde yorganın altında (yorgan sonra çizilir)
      const breathe = Math.sin(this.t * 1.6) * 0.8;
      const headY = b.y + b.h * 0.26; // baş yastıkta, gövde yorgan çizgisinin altında
      RC.Draw.human(ctx, {
        x: b.x + 38 + 80,
        y: headY + breathe * 0.4,
        rotate: -Math.PI / 2,
        facing: 1,
        look: L,
        pose: 'lie',
        hands: { front: { x: 3, y: -40 }, back: { x: -1, y: -40 } },
        eyes: 'closed',
        mouth: this.wake > 40 ? 'frown' : 'snore',
        shadow: false,
        t: this.t,
      });
      this._ov = { x: b.x + 42, y: b.y - 14 };
    }

    drawOverlay(ctx, t, x, topY) {
      if (this.mark) RC.Draw.alertMark(ctx, x, topY - 22, this.mark, t, 0.9);
      if (this.speech) {
        const s = this.speech;
        const a = s.t < 0.15 ? s.t / 0.15 : s.t > s.dur - 0.3 ? (s.dur - s.t) / 0.3 : 1;
        RC.Draw.speech(ctx, x, topY - (this.mark ? 40 : 10), s.text, { alpha: U.clamp(a, 0, 1), size: 14 });
      }
      if (this.state === 'sleep' && this.wake > 5) {
        const w = 60;
        const bx = x - w / 2;
        const by = topY - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        U.fillRoundRect(ctx, bx - 2, by - 2, w + 4, 9, 4);
        const k = U.clamp01(this.wake / 100);
        ctx.fillStyle = k > 0.7 ? '#ff3043' : k > 0.4 ? '#ffc83d' : '#8fb7ff';
        U.fillRoundRect(ctx, bx, by, w * k, 5, 3);
      }
      if (this.state === 'knocked') {
        const w = 60;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        U.fillRoundRect(ctx, x - w / 2 - 2, topY - 10, w + 4, 9, 4);
        ctx.fillStyle = '#9ad08a';
        U.fillRoundRect(ctx, x - w / 2, topY - 8, w * U.clamp01(this.knockT / 25), 5, 3);
      }
    }

    /** Görüş konisi (yerde, yarı saydam) */
    drawCone(ctx) {
      if (this.coneAlpha < 0.02 || this.climbing || this.state === 'knocked') return;
      const scene = this.scene;
      const range = (scene.lightsOn ? 520 : 240) * this.diff.sight * (this.state === 'chase' ? 1.2 : 1) + (this.isGuard ? 180 : 0);
      const ex = this.x;
      const ey = this.y - R * 1.3;
      const a0 = this.facing > 0 ? 0 : Math.PI;
      const col = this.state === 'chase' ? '#ff3043' : this.suspicion > 30 ? '#ffc83d' : this.isGuard ? '#fff2b0' : '#ffffff';
      const g = ctx.createRadialGradient(ex, ey, 10, ex, ey, range);
      g.addColorStop(0, U.rgba(col, (this.isGuard ? 0.22 : 0.16) * this.coneAlpha));
      g.addColorStop(1, U.rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.arc(ex, ey, range, a0 - 0.42, a0 + 0.42);
      ctx.closePath();
      ctx.fill();
    }
  }

  Resident.R = R;
  RC.Resident = Resident;
})(window.RC);
