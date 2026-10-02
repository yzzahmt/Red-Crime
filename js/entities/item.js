/* =========================================================================
 *  RED CRIME - Eşya varlığı
 *  Durumlar: 'rest' (yerinde), 'wall' (duvarda asılı), 'held' (elde),
 *            'bag' (çuvalda), 'falling' (düşüyor / fırlatıldı),
 *            'loaded' (kamyonda), 'broken' (kırıldı)
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;

  const MAT_SOUND = {
    glass: 'glass',
    ceramic: 'ceramic',
    metal: 'metal',
    wood: 'wood',
    stone: 'thud',
    electronic: 'thud',
    plastic: 'wood',
    paper: 'soft',
    soft: 'soft',
  };
  const MAT_LOUD = {
    glass: 1.0,
    ceramic: 1.0,
    metal: 1.05,
    wood: 0.8,
    stone: 1.1,
    electronic: 0.9,
    plastic: 0.6,
    paper: 0.25,
    soft: 0.2,
  };

  // Malzeme fiziği: sekme katsayısı (restitution) ve zemin sürtünmesi (1/sn)
  const MAT_BOUNCE = {
    glass: 0.18,
    ceramic: 0.15,
    metal: 0.32,
    wood: 0.28,
    stone: 0.08,
    electronic: 0.14,
    plastic: 0.42,
    paper: 0.05,
    soft: 0.1,
  };
  const MAT_FRICTION = {
    glass: 5,
    ceramic: 6,
    metal: 5.5,
    wood: 9,
    stone: 12,
    electronic: 8,
    plastic: 7,
    paper: 14,
    soft: 16,
  };

  let NEXT_ID = 1;

  class Item {
    constructor(def, x, y, rng, opts = {}) {
      this.id = NEXT_ID++;
      this.def = def;
      this.x = x;
      this.y = y;
      this.restX = x; // dünya dışına düşerse dönülecek son güvenli konum
      this.restY = y;
      this.w = def.w;
      this.h = def.h;
      this.vx = 0;
      this.vy = 0;
      this.angle = 0;
      this.spin = 0;
      this.onGround = true;
      this.dropThrough = 0;
      this.variant = rng ? rng.int(0, 7) : 0;
      this.room = opts.room || null;
      this.k = 0;
      this.wall = !!opts.wall;
      this.state = this.wall ? 'wall' : 'rest';
      this.isKey = !!def.isKey;
      this.small = def.small;
      this.kg = def.kg;
      this.glintT = rng ? rng.float(0, 5) : 0;

      // Nadirlik
      this.rarity = C.RARITY[0];
      if (!this.isKey && rng) {
        const boost = opts.rarityBoost || 1;
        const roll = rng.next();
        let acc = 0;
        const rs = C.RARITY.slice(1).reverse();
        for (const r of rs) {
          acc += r.chance * boost;
          if (roll < acc) {
            this.rarity = r;
            break;
          }
        }
      }
      // Ekspertiz: aynı model eşyanın kondisyonu/belgesi fiyatı oynatır (0.6x - 1.9x,
      // düşük değerler daha olası). Piyasa değerli eşyalarda nadirlik bu çarpandan türetilir.
      this.appraisal = def.appraise && rng ? Math.round((0.6 + Math.pow(rng.next(), 1.7) * 1.3) * 100) / 100 : 1;
      if (def.market) {
        const a = this.appraisal;
        this.rarity = C.RARITY[a >= 1.6 ? 3 : a >= 1.3 ? 2 : a >= 1.05 ? 1 : 0];
      }
      const base = rng ? rng.float(def.val[0], def.val[1]) : def.val[0];
      const mul = def.market ? this.appraisal : (opts.valueMul || 1) * this.rarity.mult * this.appraisal;
      let v = base * mul;
      if (opts.valueCap) v = U.softCap(v, opts.valueCap);
      this.value = this.isKey ? 0 : Math.max(5, Math.round(v / 10) * 10);
      this.sprite = RC.Items.getSprite(def, this.variant);
    }

    get name() {
      return RC.L(this.def.name);
    }
    get cx() {
      return this.x + this.w / 2;
    }
    get cy() {
      return this.y + this.h / 2;
    }
    get rarityIndex() {
      return C.RARITY.indexOf(this.rarity);
    }

    /** Düşmeye / fırlatılmaya başla */
    release(vx, vy, gentle = false) {
      this.state = 'falling';
      this.vx = vx;
      this.vy = vy;
      this.gentle = gentle;
      // Hafif eşyalar daha hızlı döner; biraz rastgelelik fırlatışı doğal gösterir
      this.spin = gentle ? 0 : U.clamp((vx * 0.022) / (1 + this.kg * 0.08) + U.rand(-1.5, 1.5), -12, 12);
      this.onGround = false;
      this.airTime = 0;
      this.bounces = 0;
    }

    update(dt, scene) {
      if (this.state !== 'falling') return;
      const W = scene.world;
      const mat = this.def.mat;
      this.airTime += dt;
      this.vy = Math.min(this.vy + C.GRAVITY * dt, 1600);
      // Hava sürtünmesi: hafif ve geniş eşyalar (kâğıt, kumaş) yavaşlar
      if (!this.onGround) {
        const drag = mat === 'paper' || mat === 'soft' ? 1.6 : 0.15 / (1 + this.kg * 0.2);
        this.vx *= Math.exp(-drag * dt);
      }
      const vxBefore = this.vx;
      const wasGround = this.onGround;
      const res = RC.Physics.moveBody(this, dt, W.grid, { stepUp: 0 });
      if (res.hitWall) {
        // Duvardan malzemeye göre sek; dönüş yönü değişir
        this.vx = -vxBefore * (0.25 + (MAT_BOUNCE[mat] || 0.2));
        this.spin = -this.spin * 0.6;
        const loud = U.clamp(Math.abs(vxBefore) / 700, 0, 0.6);
        if (loud > 0.15) {
          scene.makeNoise(this.cx, this.cy, loud * (MAT_LOUD[mat] || 1), 'item');
          RC.Audio.play(MAT_SOUND[mat] === 'glass' || MAT_SOUND[mat] === 'ceramic' ? 'place' : MAT_SOUND[mat] || 'thud', { x: this.cx, y: this.cy, vol: loud, intensity: loud, minGap: 0.05 });
        }
      }
      // Zeminde dururken motor her karede "indi" der; yalnızca gerçek inişi say
      if (res.landed && !wasGround) {
        this.onImpact(res.impact, scene);
        if (this.state === 'broken') return;
        // Havada attığı turları sil: yaylı sallanma en yakın eşdeğer açıdan başlasın
        this.angle = Math.atan2(Math.sin(this.angle), Math.cos(this.angle));
        // Sekme: yeterince sert düştüyse malzemeye göre geri zıplar
        const bounce = res.impact * (MAT_BOUNCE[mat] || 0.2) * (this.gentle ? 0.3 : 1);
        if (bounce > 70 && this.bounces < 4) {
          this.bounces++;
          this.vy = -bounce;
          this.onGround = false;
          // Yere çarpınca dönüş, yatay hıza aktarılır (top gibi yuvarlanma hissi)
          this.vx += U.clamp(this.spin * 6, -60, 60);
          this.spin = this.spin * 0.5 + this.vx * 0.01;
        } else {
          // Yerine otururken açıyı en yakın dik konuma çeken yaylı sallanma
          this.rock = this.spin * 0.5;
        }
      }
      if (this.onGround) {
        this.vx *= Math.exp(-(MAT_FRICTION[mat] || 9) * dt);
        // Açısal yay: k = sertlik, c = sönüm → birkaç kez sallanıp durur
        const k = 520;
        const c = 12;
        this.rock = (this.rock || 0) + (-k * this.angle - c * (this.rock || 0)) * dt;
        this.angle += this.rock * dt;
        this.spin = 0;
        if (Math.abs(this.vx) < 8 && Math.abs(this.angle) < 0.01 && Math.abs(this.rock) < 0.2) {
          this.vx = 0;
          this.state = 'rest';
          this.angle = 0;
          this.rock = 0;
          this.gentle = false;
        }
      } else {
        this.angle += this.spin * dt;
      }
      // Dünyanın dışına düştüyse son durduğu yere geri al (kamyon yanına değil)
      if (this.y > W.bounds.y + W.bounds.h + 400) {
        this.x = this.restX != null ? this.restX : this.x;
        this.y = this.restY != null ? this.restY - 2 : W.spawn.y;
        this.vx = 0;
        this.vy = 0;
      }
      if (this.state === 'rest') {
        this.restX = this.x;
        this.restY = this.y;
      }
      W.itemGrid.update(this);
      // Havuza düştü mü?
      if (W.pool && this.cx > W.pool.x0 && this.cx < W.pool.x1 && this.y + this.h > W.pool.y0 && !this.splashed) {
        this.splashed = true;
        scene.particles.splash(this.cx, W.pool.y0);
        RC.Audio.play('splash', { x: this.cx, y: this.cy, vol: 0.7 });
        scene.makeNoise(this.cx, this.cy, 0.6, 'splash');
      }
    }

    onImpact(speed, scene) {
      const def = this.def;
      const mat = def.mat;
      const heavy = U.clamp(this.kg / 10, 0, 1);
      let loud = U.clamp((speed - 120) / 900, 0, 1.2) * (MAT_LOUD[mat] || 0.8) * (0.7 + heavy * 0.6);
      if (this.gentle) loud *= 0.25;

      // Kırılma
      const breakThreshold = this.gentle ? 520 : 330;
      if (def.fragile > 0 && speed > breakThreshold) {
        const p = def.fragile * U.clamp((speed - breakThreshold) / 350 + 0.35, 0, 1);
        if (Math.random() < p) {
          this.breakApart(scene, speed);
          return;
        }
      }
      if (loud > 0.03) {
        const snd = MAT_SOUND[mat] || 'thud';
        RC.Audio.play(snd === 'glass' || snd === 'ceramic' ? 'place' : snd, {
          x: this.cx,
          y: this.cy,
          vol: U.clamp(loud * 1.4, 0.15, 1),
          intensity: loud,
          minGap: 0.01,
        });
        scene.makeNoise(this.cx, this.y + this.h, loud, 'item');
        if (loud > 0.35) {
          scene.particles.dust(this.cx, this.y + this.h, 5 + Math.round(loud * 6));
          scene.camera.shake(loud * 0.12);
        }
      }
    }

    breakApart(scene, speed) {
      const def = this.def;
      this.state = 'broken';
      scene.world.itemGrid.remove(this);
      const cols = def.pal[this.variant % def.pal.length].filter((c) => typeof c === 'string' && c.startsWith('#'));
      scene.particles.shards(this.cx, this.cy, 14 + Math.round(this.w / 3), cols.length ? cols : ['#ddd'], this.y + this.h, 240);
      const snd = def.mat === 'glass' ? 'glass' : 'ceramic';
      RC.Audio.play(snd, { x: this.cx, y: this.cy, vol: 1, intensity: U.clamp(speed / 700, 0.4, 1.4), minGap: 0 });
      const loud = U.clamp(0.75 + this.kg / 12, 0.75, 1.35);
      scene.makeNoise(this.cx, this.cy, loud, 'break');
      scene.camera.shake(0.25);
      scene.onItemBroken(this);
    }

    /** Duvar / raf / kamyon dışındaki durumlarda çizilir */
    draw(ctx, t, highlight) {
      const sp = this.sprite;
      const pad = sp.pad;
      const S = RC.Items.SCALE;
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      if (this.angle) ctx.rotate(this.angle);
      if (highlight) {
        ctx.shadowColor = highlight;
        ctx.shadowBlur = 14;
      }
      ctx.drawImage(sp, -this.w / 2 - pad, -this.h / 2 - pad, sp.width / S, sp.height / S);
      ctx.restore();
      // Epik ve efsanevi eşyalar hafifçe parlar
      const ri = this.rarityIndex;
      if ((ri >= 2 || this.isKey) && this.state !== 'held') {
        this.glintT += 0.016;
        const k = Math.sin(this.glintT * 2.2);
        if (k > 0.92) {
          const col = this.isKey ? '#fff6c0' : this.rarity.color;
          ctx.fillStyle = col;
          ctx.globalAlpha = (k - 0.92) / 0.08;
          const gx = this.x + this.w * 0.75;
          const gy = this.y + this.h * 0.2;
          const s = 5;
          ctx.beginPath();
          ctx.moveTo(gx, gy - s);
          ctx.lineTo(gx + 1.2, gy - 1.2);
          ctx.lineTo(gx + s, gy);
          ctx.lineTo(gx + 1.2, gy + 1.2);
          ctx.lineTo(gx, gy + s);
          ctx.lineTo(gx - 1.2, gy + 1.2);
          ctx.lineTo(gx - s, gy);
          ctx.lineTo(gx - 1.2, gy - 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    /** Belirli bir noktada (elde / ikonda) çizim */
    drawAt(ctx, cx, cy, scale = 1, angle = 0) {
      const sp = this.sprite;
      const pad = sp.pad;
      const S = RC.Items.SCALE;
      ctx.save();
      ctx.translate(cx, cy);
      if (angle) ctx.rotate(angle);
      ctx.scale(scale, scale);
      ctx.drawImage(sp, -this.w / 2 - pad, -this.h / 2 - pad, sp.width / S, sp.height / S);
      ctx.restore();
    }
  }

  Item.MAT_LOUD = MAT_LOUD;
  RC.Item = Item;
})(window.RC);
