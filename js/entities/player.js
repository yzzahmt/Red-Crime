/* =========================================================================
 *  RED CRIME - Oyuncu: Red Crime
 *  Kırmızı top gövde, hırsız maskesi, bere ve insan benzeri kollar.
 *  Yürüme / koşma / çömelme / zıplama / el merdiveni / saklanma /
 *  eşya tutma, çuvala atma, yavaşça bırakma, düşürme, fırlatma, el feneri.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const I = RC.Input;

  const R = 21; // gövde yarıçapı
  const STAND_H = 44;
  const CROUCH_H = 30;

  class Player {
    constructor(scene, x, y) {
      this.scene = scene;
      this.w = 34;
      this.h = STAND_H;
      this.x = x - this.w / 2;
      this.y = y - this.h;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.onGround = false;
      this.dropThrough = 0;
      this.canStep = true;
      this.snap = true;
      this.crouch = false;
      this.running = false;
      this.ignoreOneway = false;

      this.held = null;
      this.bag = [];
      this.hasKey = false;
      this.hidden = false;
      this.hideSpot = null;
      this.hideAlpha = 1;
      this.climbing = false;
      this.ladder = null;
      this.flashOn = true;
      this.aim = 0;
      this.stun = 0;
      this.inWater = false;
      this.stepAcc = 0;
      this.noiseLevel = 0; // HUD için son gürültü
      this.grabCandidate = null;
      this.escapeConfirmT = 0;
      this.hideWarnT = 0;

      this.anim = { phase: 0, t: 0, squashX: 1, squashY: 1, blink: 0, blinkT: 2, land: 0, throwT: 0 };
      this.applyUpgrades();
    }

    applyUpgrades() {
      const up = (id) => RC.Save.upgradeLevel(id);
      this.bagCap = 8 + up('bag') * 4;
      this.shoeMul = 1 - up('shoes') * 0.18;
      this.strength = up('strength');
      this.runMul = 1 + up('lungs') * 0.08;
      this.flashRange = 360 * (1 + up('flashlight') * 0.2);
      this.flashSpread = 0.42 + up('flashlight') * 0.06;
    }

    get cx() {
      return this.x + this.w / 2;
    }
    get cy() {
      return this.y + this.h / 2;
    }
    get bottom() {
      return this.y + this.h;
    }
    /** Topun merkezi (çizim) */
    get bodyY() {
      return this.y + this.h - R * this.anim.squashY;
    }
    get handPos() {
      return { x: this.cx + Math.cos(this.aim) * 26, y: this.bodyY + Math.sin(this.aim) * 26 + 2 };
    }

    get carriedKg() {
      let kg = this.held ? this.held.kg : 0;
      if (this.dragItem) kg += this.dragItem.kg;
      for (const it of this.bag) kg += it.kg * 0.25;
      return kg;
    }
    get bagValue() {
      return U.sum(this.bag, (it) => it.value);
    }
    get speedMul() {
      const kg = this.carriedKg;
      const pen = 0.028 * (1 - this.strength * 0.15);
      let m = U.clamp(1 - kg * pen, 0.42, 1);
      if (this.inWater) m *= 0.5;
      return m;
    }

    /* ==================================================================
     * GÜNCELLEME
     * ================================================================ */
    update(dt) {
      const scene = this.scene;
      const W = scene.world;
      const inputOn = !scene.inputLocked && this.stun <= 0;
      this.anim.t += dt;
      if (this.stun > 0) this.stun -= dt;
      if (this.escapeConfirmT > 0) this.escapeConfirmT -= dt;
      if (this.hideWarnT > 0) this.hideWarnT -= dt;

      const left = inputOn && I.act('left');
      const right = inputOn && I.act('right');
      const crouchHeld = inputOn && I.act('crouch');
      const jumpPressed = inputOn && I.actPressed('jump');
      this.running = inputOn && I.act('run') && !this.crouch;

      /* ---------------- El merdiveni ---------------- */
      if (!this.climbing && inputOn) {
        const lad = this.ladderAt();
        if (lad) {
          const atTop = Math.abs(this.bottom - lad.yTop - 8) < 14 && this.onGround;
          const atBottom = this.bottom > lad.yBottom - 20;
          if ((atTop && crouchHeld) || (!atTop && I.act('up') && (atBottom || !this.onGround))) {
            this.startClimb(lad);
          }
        }
      }
      if (this.climbing) {
        this.updateClimb(dt, inputOn);
        this.updateAnim(dt);
        return;
      }

      /* ---------------- Merdiven yardımcısı ---------------- */
      if (!this.stairAssist && inputOn && this.onGround) {
        const sa = this.stairAt();
        if (sa && sa.where === 'top' && I.actPressed('down')) this.stairAssist = { dir: sa.down, until: sa.st.bottom.y, t: 0 };
        else if (sa && sa.where === 'bottom' && I.actPressed('up')) this.stairAssist = { dir: -sa.down, until: sa.st.top.y, t: 0, up: true };
      }
      let assistDir = 0;
      if (this.stairAssist) {
        const a = this.stairAssist;
        a.t += dt;
        assistDir = a.dir;
        const reached = a.up ? this.bottom <= a.until + 1 && this.onGround : this.bottom >= a.until - 1 && this.onGround;
        if (reached || a.t > 4 || (left && a.dir > 0) || (right && a.dir < 0)) {
          this.stairAssist = null;
          assistDir = 0;
        }
      }

      /* ---------------- Çömelme ---------------- */
      const wantCrouch = crouchHeld && this.onGround && !this.stairAssist;
      if (wantCrouch && !this.crouch) this.setCrouch(true);
      else if (!crouchHeld && this.crouch) this.setCrouch(false);

      /* ---------------- Yatay hareket ---------------- */
      const dir = assistDir || (right ? 1 : 0) - (left ? 1 : 0);
      let maxSpeed = this.crouch ? 95 : this.running ? 300 * this.runMul : 200;
      maxSpeed *= this.speedMul;
      const accel = this.onGround ? 2300 : 1300;
      if (dir !== 0) {
        this.vx = U.approach(this.vx, dir * maxSpeed, accel * dt);
        this.facing = dir;
      } else {
        this.vx = U.approach(this.vx, 0, (this.onGround ? 2600 : 600) * dt);
      }

      /* ---------------- Zıplama / aşağı inme ---------------- */
      if (jumpPressed && this.onGround && !this.stairAssist && !(this.stairAt() && this.stairAt().where === 'bottom')) {
        if (crouchHeld && this.ground && this.ground.type === 'oneway' && !this.ground.trapdoor) {
          this.dropThrough = 0.25;
          this.vy = 60;
          this.onGround = false;
        } else if (!this.crouch || this.canStand()) {
          if (this.crouch) this.setCrouch(false);
          const kg = this.held ? this.held.kg : 0;
          this.vy = -670 * U.clamp(1 - kg * 0.011, 0.7, 1) * (this.inWater ? 0.9 : 1);
          this.onGround = false;
          this.anim.squashX = 0.8;
          this.anim.squashY = 1.2;
          RC.Audio.play('jump', { vol: 0.6 });
        }
      }
      // Değişken zıplama yüksekliği
      if (!this.onGround && this.vy < 0 && !(inputOn && I.act('jump'))) this.vy += C.GRAVITY * 0.9 * dt;

      /* ---------------- Yerçekimi ---------------- */
      this.vy = Math.min(this.vy + C.GRAVITY * dt, 1300);
      const wasGround = this.onGround;
      const res = RC.Physics.moveBody(this, dt, W.grid, { stepUp: C.STEP_UP, snap: 24 });

      /* ---------------- İniş ---------------- */
      if (res.landed && !wasGround) {
        const imp = res.impact;
        this.anim.squashX = 1 + U.clamp(imp / 1600, 0, 0.35);
        this.anim.squashY = 1 - U.clamp(imp / 1600, 0, 0.35);
        if (imp > 430) {
          let loud = (imp - 430) / 900 + this.carriedKg * 0.02;
          if (this.crouch || crouchHeld) loud *= 0.5;
          loud *= this.shoeMul;
          loud = U.clamp(loud, 0, 1.1);
          RC.Audio.play('land', { vol: U.clamp(0.3 + loud, 0, 1), intensity: loud });
          scene.makeNoise(this.cx, this.bottom, loud, 'land');
          scene.particles.dust(this.cx, this.bottom, 6 + Math.round(loud * 8));
          if (loud > 0.4) scene.camera.shake(loud * 0.25);
        } else if (imp > 150) {
          RC.Audio.play('step', { vol: 0.35 });
        }
      }

      /* ---------------- Ayak sesleri ---------------- */
      if (this.onGround && Math.abs(this.vx) > 25) {
        this.stepAcc += Math.abs(this.vx) * dt;
        const stride = this.crouch ? 36 : this.running ? 60 : 46;
        if (this.stepAcc >= stride) {
          this.stepAcc = 0;
          this.footstep();
        }
      } else {
        this.stepAcc = Math.min(this.stepAcc, 20);
      }

      /* ---------------- Su (havuz) ---------------- */
      const pool = W.pool;
      const inPool = pool && this.cx > pool.x0 && this.cx < pool.x1 && this.bottom > pool.y0 + 4;
      if (inPool && !this.inWater) {
        scene.particles.splash(this.cx, pool.y0, 26);
        RC.Audio.play('splash', { vol: 1 });
        scene.makeNoise(this.cx, pool.y0, 0.85, 'splash');
        scene.toast('Şapırtı! Havuza düştün!', '#4aa8ff');
      }
      this.inWater = !!inPool;

      /* ---------------- Nişan / el feneri ---------------- */
      this.updateAim(dt);
      if (inputOn && I.actPressed('flashlight')) {
        this.flashOn = !this.flashOn;
        RC.Audio.play('flashlight');
      }

      /* ---------------- Eylemler ---------------- */
      if (inputOn) this.handleActions();

      /* ---------------- Saklanma ---------------- */
      this.updateHiding(dt);

      this.updateAnim(dt);

      // Dünya sınırları
      const b = W.bounds;
      if (this.x < b.x + 10) {
        this.x = b.x + 10;
        this.vx = 0;
      }
      if (this.x + this.w > b.x + b.w - 10) {
        this.x = b.x + b.w - 10 - this.w;
        this.vx = 0;
      }
      // Güvenlik ağı: son sağlam zemine geri al. Eşik dünya sınırlarından
      // türetilir, böylece bodrum (y > 0) gibi geçerli yeraltı koordinatları
      // asla tetiklemez. Kamyon yanındaki doğma noktasına ışınlamak ganimet
      // taşıma açığı yaratıyordu.
      if (this.onGround && this.ground && this.ground.type === 'solid' && !this.climbing) {
        this.lastSafeX = this.x;
        this.lastSafeY = this.y;
      }
      if (this.y > b.y + b.h + 400) {
        const safe = this.lastSafeX != null;
        this.x = safe ? this.lastSafeX : W.spawn.x - this.w / 2;
        this.y = safe ? this.lastSafeY : W.spawn.y;
        this.vx = 0;
        this.vy = 0;
        this.dropThrough = 0;
        console.warn('[Red Crime] Oyuncu dünya dışına düştü; son sağlam zemine alındı.');
      }
    }

    footstep() {
      const scene = this.scene;
      let loud = this.crouch ? 0.02 : this.running ? 0.5 : 0.1;
      loud += this.carriedKg * 0.012;
      loud *= this.shoeMul;
      let creaky = false;
      if (!this.crouch) {
        for (const c of scene.world.creaky) {
          if (this.cx > c.x0 && this.cx < c.x1 && Math.abs(this.bottom - c.y) < 3) {
            creaky = true;
            break;
          }
        }
      }
      if (creaky) {
        loud += 0.3;
        RC.Audio.play('creak', { vol: 0.9, pitch: U.rand(0.85, 1.2) });
        scene.creakFlash = 0.4;
      }
      if (this.inWater) {
        loud += 0.25;
        RC.Audio.play('splash', { vol: 0.25 });
      }
      RC.Audio.play('step', { vol: U.clamp(loud * 1.8 + 0.1, 0.05, 1), pitch: this.running ? U.rand(1.1, 1.25) : U.rand(0.9, 1.1), heavy: this.running ? 0.8 : U.clamp(this.carriedKg / 15, 0, 1) });
      if (this.running) {
        this.scene.camera.shake(0.015);
        RC.Audio.play('thud', { vol: 0.25, intensity: 0.2, minGap: 0.05 });
      }
      if (loud > 0.04) scene.makeNoise(this.cx, this.bottom, loud, creaky ? 'creak' : 'step');
      if (this.running) scene.particles.dust(this.cx - this.facing * 10, this.bottom, 4);
    }

    setCrouch(on) {
      if (on === this.crouch) return;
      if (on) {
        this.y += STAND_H - CROUCH_H;
        this.h = CROUCH_H;
        this.crouch = true;
      } else {
        if (!this.canStand()) return;
        this.y -= STAND_H - CROUCH_H;
        this.h = STAND_H;
        this.crouch = false;
      }
    }

    canStand() {
      return RC.Physics.spaceFree(this.x, this.y - (STAND_H - CROUCH_H), this.w, STAND_H - 1, this.scene.world.grid);
    }

    /** Merdivenin tepesinde ya da dibinde mi? */
    stairAt() {
      for (const st of this.scene.world.stairs) {
        const down = st.end === 'R' ? 1 : -1; // tepeden inerken yürüme yönü
        if (Math.abs(this.bottom - st.top.y) < 4 && Math.abs(this.cx - (st.top.x - down * 30)) < 60) return { st, where: 'top', down };
        if (Math.abs(this.bottom - st.bottom.y) < 4 && Math.abs(this.cx - (st.xb + down * 10)) < 50) return { st, where: 'bottom', down };
      }
      return null;
    }

    ladderAt() {
      for (const l of this.scene.world.ladders) {
        if (Math.abs(this.cx - l.x) < 26 && this.bottom >= l.yTop - 30 && this.y <= l.yBottom) return l;
      }
      return null;
    }

    startClimb(l) {
      this.climbing = true;
      this.ladder = l;
      this.ignoreOneway = true;
      if (this.crouch) this.setCrouch(false);
      this.vx = 0;
      this.vy = 0;
      this.x = l.x - this.w / 2;
    }

    updateClimb(dt, inputOn) {
      const l = this.ladder;
      const up = inputOn && I.act('up');
      const down = inputOn && I.act('down');
      this.vy = up ? -150 : down ? 150 : 0;
      this.vx = 0;
      this.x = U.damp(this.x, l.x - this.w / 2, 20, dt);
      this.y += this.vy * dt;
      if (Math.abs(this.vy) > 0) {
        this.stepAcc += Math.abs(this.vy) * dt;
        if (this.stepAcc > 40) {
          this.stepAcc = 0;
          RC.Audio.play('wood', { vol: 0.25, pitch: U.rand(0.9, 1.2) });
          this.scene.makeNoise(this.cx, this.cy, 0.06 * this.shoeMul, 'ladder');
        }
      }
      this.anim.phase += Math.abs(this.vy) * dt * 0.08;
      // Üstten çıkış
      if (this.bottom <= l.yTop + 8 && up) {
        this.y = l.yTop + 8 - this.h - 0.5;
        this.endClimb();
        this.y = -this.h - 0.01;
        return;
      }
      // Alttan çıkış
      if (this.bottom >= l.yBottom) {
        this.y = l.yBottom - this.h;
        this.endClimb();
        return;
      }
      // Yandan atlama
      if (inputOn && (I.act('left') || I.act('right')) && I.actPressed('jump')) {
        this.endClimb();
        this.vy = -400;
        this.vx = (I.act('left') ? -1 : 1) * 180;
      }
      this.updateAim(dt);
      if (inputOn && I.actPressed('flashlight')) this.flashOn = !this.flashOn;
      this.hidden = false;
    }

    endClimb() {
      this.climbing = false;
      this.ignoreOneway = false;
      this.ladder = null;
      this.vy = 0;
      this.onGround = true;
    }

    updateAim(dt) {
      const scene = this.scene;
      let target;
      if (RC.Save.settings.mouseAim && I.mouseRecentlyUsed(4)) {
        const wpos = scene.camera.screenToWorld(I.mouse.x, I.mouse.y);
        target = Math.atan2(wpos.y - this.bodyY, wpos.x - this.cx);
        if (!this.held && Math.abs(this.vx) < 5) this.facing = Math.cos(target) >= 0 ? 1 : -1;
      } else {
        target = this.facing > 0 ? 0.12 : Math.PI - 0.12;
        if (this.crouch) target = this.facing > 0 ? 0.3 : Math.PI - 0.3;
      }
      this.aim = U.lerpAngle(this.aim, target, 1 - Math.exp(-14 * dt));
    }

    /* ==================================================================
     * EYLEMLER: tut / bırak / yükle / fırlat / etkileşim
     * ================================================================ */
    handleActions() {
      const scene = this.scene;
      const W = scene.world;
      const inTruck = scene.inTruckZone(this);

      // Alınacak eşya: fare kullanılıyorsa imlecin altındaki (RC.DragLoot.hover),
      // değilse en yakındaki. SPACE ve tıklama aynı eşyayı hedefler.
      this.grabCandidate = this.held ? null : RC.DragLoot.hover || this.findGrabbable();

      if (I.actPressed('grab')) {
        if (this.held) {
          if (inTruck) {
            scene.loadItem(this.held);
            this.held = null;
          } else if (this.crouch) {
            this.placeHeld(true);
          } else {
            this.placeHeld(false);
          }
        } else if (this.grabCandidate) {
          this.pickUp(this.grabCandidate);
        } else if (inTruck && this.bag.length) {
          scene.unloadBag();
        } else if (inTruck) {
          scene.toast('Kamyona yüklenecek bir şey yok.', '#9aa3c7');
        }
      }

      if (I.actPressed('throw') && this.held) {
        const it = this.held;
        this.held = null;
        it.x = this.cx - it.w / 2;
        it.y = this.bodyY - R - it.h - 4;
        const dirx = Math.cos(this.aim);
        const diry = Math.sin(this.aim);
        const power = 560 * U.clamp(1 - it.kg * 0.02, 0.45, 1);
        it.release(dirx * power + this.vx * 0.4, Math.min(-120, diry * power - 220), false);
        W.itemGrid.insert(it);
        this.anim.throwT = 0.3;
        RC.Audio.play('throwIt', { vol: 0.6 });
        scene.onThrow(it);
      }

      if (I.actPressed('interact') && !(W.safe && !W.safe.state.open && this.near(W.safe, 30)) && scene.tryInteract && scene.tryInteract()) {
        // kapı / panel etkileşimi yapıldı
      } else if (I.actPressed('interact')) {
        const safe = W.safe;
        if (safe && !safe.state.open && this.near(safe, 30)) {
          if (this.hasKey) scene.startSafeMinigame();
          else {
            scene.toast('Kasa kilitli! Önce anahtarı bul.', '#ff8c2e');
            RC.Audio.play('uiError', { vol: 0.5 });
          }
        } else if (scene.nearTruck(this)) {
          if (this.escapeConfirmT > 0) {
            scene.escape();
          } else {
            this.escapeConfirmT = 2.5;
            scene.toast('Kaçmak için tekrar E bas! (Kamyondaki ganimetle)', '#ffc83d');
          }
        }
      }
    }

    near(obj, margin = 0) {
      return this.x + this.w > obj.x - margin && this.x < obj.x + obj.w + margin && this.y + this.h > obj.y - margin && this.y < obj.y + obj.h + margin;
    }

    findGrabbable() {
      const W = this.scene.world;
      const reach = 58;
      const cx = this.cx;
      const cy = this.bodyY - 8;
      const list = W.itemGrid.query(cx - reach, cy - reach - 30, reach * 2, reach * 2 + 40, []);
      let best = null;
      let bestScore = Infinity;
      for (const it of list) {
        if (it.state !== 'rest' && it.state !== 'wall' && !(it.state === 'falling' && Math.abs(it.vy) < 120)) continue;
        const ix = U.clamp(cx, it.x, it.x + it.w);
        const iy = U.clamp(cy, it.y, it.y + it.h);
        const d = U.dist(cx, cy, ix, iy);
        if (d > reach) continue;
        // Bakılan yöndekiler öncelikli; değerli olanlar da biraz öncelikli
        const facingBonus = (it.cx - cx) * this.facing > -6 ? 0 : 18;
        const score = d + facingBonus - Math.min(12, Math.log10(it.value + 10) * 2) - (it.isKey ? 30 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = it;
        }
      }
      return best;
    }

    pickUp(it) {
      const scene = this.scene;
      const W = scene.world;
      scene.releaseAbove(it);
      W.itemGrid.remove(it);
      if (it.isKey) {
        it.state = 'bag';
        this.hasKey = true;
        RC.Audio.play('key');
        scene.particles.sparks(it.cx, it.cy, 16, '#ffd24a', 200);
        scene.toast('Kasa anahtarını buldun! 🔑', '#ffd24a');
        scene.onKeyFound();
        return;
      }
      const wasWall = it.state === 'wall';
      if (it.small && this.bag.length < this.bagCap) {
        it.state = 'bag';
        this.bag.push(it);
        RC.Audio.play('bag', { vol: 0.8 });
        scene.particles.text(it.cx, it.y - 6, '+' + U.formatMoney(it.value), { color: it.rarity.color, size: 15, life: 1 });
        scene.makeNoise(this.cx, this.cy, 0.04 * this.shoeMul, 'grab');
      } else {
        if (it.small && this.bag.length >= this.bagCap && !this.bagFullWarned) {
          this.bagFullWarned = true;
          scene.toast('Çuval dolu! Kamyona boşalt.', '#ff8c2e');
        }
        it.state = 'held';
        this.held = it;
        RC.Audio.play('pickup', { vol: 0.7 });
        scene.makeNoise(this.cx, this.cy, (wasWall ? 0.1 : 0.06) + it.kg * 0.006, 'grab');
      }
      it.angle = 0;
      scene.onPickup(it);
    }

    /** gentle=true: çömelerek yavaşça bırakma */
    placeHeld(gentle) {
      const it = this.held;
      if (!it) return;
      const scene = this.scene;
      this.held = null;
      if (gentle) {
        it.x = this.cx - it.w / 2 + this.facing * 16;
        it.y = this.bottom - it.h - 2;
        // Duvar içine girmesin
        if (!RC.Physics.spaceFree(it.x, it.y, it.w, it.h, scene.world.grid)) it.x = this.cx - it.w / 2;
        it.release(0, 0, true);
        RC.Audio.play('place', { vol: 0.4 });
      } else {
        it.x = this.cx - it.w / 2;
        it.y = this.bodyY - R - it.h - 4;
        if (!RC.Physics.spaceFree(it.x, it.y, it.w, it.h, scene.world.grid)) it.y = this.y;
        it.release(this.vx * 0.5, -40, false);
      }
      scene.world.itemGrid.insert(it);
    }

    dropEverything(reason) {
      if (this.held) {
        this.placeHeld(false);
        if (reason) this.scene.toast(reason, '#ff3043');
      }
    }

    bitten(fromX) {
      this.dropEverything('Köpek ısırdı! Elindekini düşürdün!');
      this.stun = 0.9;
      this.vx = (this.cx < fromX ? -1 : 1) * 380;
      this.vy = -300;
      this.onGround = false;
      this.scene.camera.shake(0.4);
      RC.Audio.play('punch', { vol: 0.8 });
    }

    /* ==================================================================
     * SAKLANMA
     * ================================================================ */
    updateHiding(dt) {
      const W = this.scene.world;
      let spot = null;
      const still = Math.abs(this.vx) < 30 && this.onGround;
      if (still && !this.climbing) {
        for (const f of W.hideSpots) {
          if (this.cx < f.x + 6 || this.cx > f.x + f.w - 6) continue;
          if (this.bottom < f.y + 10 || this.bottom > f.y + f.h + 8) continue;
          if (f.hide === 'crouch' && !this.crouch) continue;
          spot = f;
          break;
        }
      }
      if (spot && this.held && this.held.w > 46) {
        if (this.hideWarnT <= 0) {
          this.scene.toast('Elindeki eşya çok büyük, saklanamazsın!', '#ff8c2e');
          this.hideWarnT = 4;
        }
        spot = null;
      }
      const was = this.hidden;
      this.hidden = !!spot;
      this.hideSpot = spot;
      if (this.hidden && !was) this.scene.onHide(spot);
      this.hideAlpha = U.damp(this.hideAlpha, this.hidden ? 0.4 : 1, 10, dt);
    }

    /* ==================================================================
     * ANİMASYON & ÇİZİM
     * ================================================================ */
    updateAnim(dt) {
      const a = this.anim;
      a.squashX = U.damp(a.squashX, this.crouch ? 1.18 : 1, 12, dt);
      a.squashY = U.damp(a.squashY, this.crouch ? 0.72 : 1, 12, dt);
      if (this.onGround && Math.abs(this.vx) > 10) a.phase += Math.abs(this.vx) * dt * 0.055;
      a.blinkT -= dt;
      if (a.blinkT <= 0) {
        a.blink = 0.12;
        a.blinkT = U.rand(2, 5);
      }
      if (a.blink > 0) a.blink -= dt;
      if (a.throwT > 0) a.throwT -= dt;
    }

    handTargets() {
      const a = this.anim;
      const f = this.facing;
      const sx = a.squashX;
      const sy = a.squashY;
      const t = a.t;
      // Taşıma: iki el başın üstünde
      if (this.held) {
        const it = this.held;
        const top = -R * sy - it.h - 2;
        const hy = top + it.h * 0.55;
        return [
          { x: -(it.w / 2 + 3), y: hy },
          { x: it.w / 2 + 3, y: hy },
        ];
      }
      if (this.climbing) {
        const s = Math.sin(a.phase * 3);
        return [
          { x: -R * 0.55, y: -R * 1.2 + s * 8 },
          { x: R * 0.55, y: -R * 1.2 - s * 8 },
        ];
      }
      if (!this.onGround) {
        return [
          { x: -R * 1.25, y: -R * 0.6 },
          { x: R * 1.25, y: -R * 0.6 },
        ];
      }
      if (a.throwT > 0) {
        return [
          { x: -R * 1.1, y: R * 0.4 },
          { x: f * R * 1.8, y: -R * 0.8 },
        ];
      }
      const moving = Math.abs(this.vx) > 10;
      const swing = moving ? Math.sin(a.phase * 2) * R * (this.running ? 0.9 : 0.6) : 0;
      const breathe = Math.sin(t * 2.2) * 1.5;
      let back = { x: -f * R * 1.05 - swing * f * 0.4, y: R * 0.62 * sy + breathe + Math.abs(swing) * 0.2 };
      let front = { x: f * R * 1.05 + swing * f * 0.6, y: R * 0.62 * sy + breathe - Math.abs(swing) * 0.2 };
      if (this.crouch) {
        back = { x: -f * R * 0.9, y: R * 0.55 };
        front = { x: f * R * 1.35, y: R * 0.45 };
      }
      // El feneri tutan ön el
      if (this.flashOn) {
        front = { x: Math.cos(this.aim) * R * 1.3, y: Math.sin(this.aim) * R * 1.3 + 4 };
      }
      return f > 0 ? [back, front] : [front, back];
    }

    draw(ctx, t) {
      const a = this.anim;
      const cx = this.cx;
      const cy = this.bodyY;
      const alpha = this.hideAlpha * (this.stun > 0 && Math.floor(t * 20) % 2 ? 0.5 : 1);
      const hands = this.handTargets();

      // Tutulan eşya (başın üstünde)
      if (this.held) {
        const it = this.held;
        const bob = Math.sin(a.phase * 2) * 2;
        ctx.globalAlpha = alpha;
        it.drawAt(ctx, cx, cy - R * a.squashY - it.h / 2 - 2 + bob, 1, Math.sin(a.phase) * 0.04);
        ctx.globalAlpha = 1;
      }

      const lookX = Math.cos(this.aim);
      const lookY = Math.sin(this.aim);
      RC.Draw.character(ctx, {
        x: cx,
        y: cy,
        r: R,
        body: '#e8283c',
        sx: a.squashX,
        sy: a.squashY,
        facing: this.facing,
        look: { x: lookX, y: lookY },
        eyes: this.stun > 0 ? 'closed' : this.scene.dangerLevel > 0.7 ? 'wide' : 'open',
        mouth: this.stun > 0 ? 'o' : this.held && this.held.kg > 8 ? 'worried' : this.scene.dangerLevel > 0.6 ? 'o' : 'smile',
        blink: a.blink > 0 ? 1 : 0,
        balaclava: '#1c1d26',
        arms: hands,
        sleeve: '#1d1f29',
        skin: '#f1c7a1',
        glove: '#2a2d3e',
        alpha,
        t,
        shadow: this.onGround && !this.climbing,
      });

      // El feneri
      if (this.flashOn && !this.held && !this.climbing) {
        const hx = cx + hands[this.facing > 0 ? 1 : 0].x;
        const hy = cy + hands[this.facing > 0 ? 1 : 0].y;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(hx, hy);
        ctx.rotate(this.aim);
        ctx.fillStyle = '#2a2d3e';
        U.fillRoundRect(ctx, -6, -3.5, 16, 7, 2);
        ctx.fillStyle = '#9aa0aa';
        ctx.fillRect(9, -4.5, 4, 9);
        ctx.fillStyle = '#fff7c8';
        ctx.fillRect(12.5, -3.5, 1.5, 7);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Çuval (sırtta)
      if (this.bag.length) {
        const bx = cx - this.facing * R * 0.95;
        const by = cy + 2;
        const s = 0.7 + Math.min(1, this.bag.length / this.bagCap) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bx, by);
        ctx.scale(s, s);
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath();
        ctx.moveTo(-9, -8);
        ctx.quadraticCurveTo(-15, 12, 0, 13);
        ctx.quadraticCurveTo(15, 12, 9, -8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#5b3a24';
        ctx.fillRect(-7, -11, 14, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 7);
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // Saklanma göstergesi
      if (this.hidden) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        RC.Draw.icon(ctx, 'eye', cx, cy - R - 18, 18, '#3ddc84');
        ctx.strokeStyle = '#3ddc84';
        ctx.lineWidth = 2.5;
        U.line(ctx, cx - 9, cy - R - 26, cx + 9, cy - R - 10);
        ctx.restore();
      }
    }
  }

  Player.R = R;
  RC.Player = Player;
})(window.RC);
