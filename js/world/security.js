/* =========================================================================
 *  RED CRIME - Kapılar ve güvenlik sistemleri
 *  - Oda kapıları: kapalı / açık / kilitli; hareket ve görüşü engeller
 *  - Dönen güvenlik kameraları (görürse alarm)
 *  - Lazer ışınları (alçak: zıpla, yüksek: eğil; bazıları yanıp söner)
 *  - Alarm paneli (hacklenirse sistem kapanır)
 *  - Alarm: siren, kırmızı ışıklar, herkes uyanır, polis gelir
 *  - Gadget etkileri: sis bulutu, uyku gazı, kamera karıştırıcı
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const L = (s, v) => RC.L(s, v);

  /* =====================================================================
   * KAPILAR
   * =================================================================== */
  const Doors = {
    /** Kapıyı aç (oyuncu ya da ev sahibi) */
    open(scene, door, by) {
      if (!door.closed) return;
      door.closed = false;
      door.locked = false;
      door.body.type = 'none';
      door.swing = by && by.x != null ? (by.x < door.x ? 1 : -1) : 1;
      const quiet = by === scene.player && scene.player.crouch;
      if (by === scene.player && scene.tutorial) scene.tutorial.stats.doors++;
      RC.Audio.play('creak', { x: door.x, y: door.y - 100, vol: quiet ? 0.4 : 0.8, pitch: U.rand(0.8, 1.1) });
      scene.makeNoise(door.x, door.y - 60, quiet ? 0.06 : by === scene.player ? 0.16 : 0.3, 'door');
    },

    close(scene, door, by) {
      if (door.closed) return;
      // Kapının içinde biri varsa kapanmaz
      const p = scene.player;
      if (p.x < door.x + 8 && p.x + p.w > door.x - 8 && p.bottom > door.y - door.h && p.y < door.y) return false;
      door.closed = true;
      door.body.type = 'solid';
      RC.Audio.play('wood', { x: door.x, y: door.y - 100, vol: 0.6, pitch: 0.8 });
      const quiet = by === p && p.crouch;
      scene.makeNoise(door.x, door.y - 60, quiet ? 0.05 : 0.14, 'door');
      return true;
    },

    /** Aynı kattaki iki x arasında kalan kapalı kapılar */
    closedBetween(W, k, x1, x2) {
      const a = Math.min(x1, x2);
      const b = Math.max(x1, x2);
      let n = 0;
      for (const d of W.doors) if (d.k === k && d.closed && d.x > a && d.x < b) n++;
      return n;
    },

    /** Yürüme yönünde, en yakın kapalı kapı */
    nextClosed(W, k, fromX, toX) {
      let best = null;
      const dir = Math.sign(toX - fromX);
      for (const d of W.doors) {
        if (d.k !== k || !d.closed) continue;
        const rel = (d.x - fromX) * dir;
        if (rel > -2 && (d.x - toX) * dir < 0) {
          if (!best || Math.abs(d.x - fromX) < Math.abs(best.x - fromX)) best = d;
        }
      }
      return best;
    },

    nearPlayer(scene) {
      const p = scene.player;
      let best = null;
      let bd = 60;
      for (const d of scene.world.doors) {
        if (Math.abs(p.bottom - d.y) > 12) continue;
        const dd = Math.abs(p.cx - d.x);
        if (dd < bd) {
          bd = dd;
          best = d;
        }
      }
      return best;
    },

    update(scene, dt) {
      for (const d of scene.world.doors) {
        d.openT = U.approach(d.openT, d.closed ? 0 : 1, dt * 5);
      }
    },

    draw(ctx, scene, view, t) {
      const p = scene.player;
      for (const d of scene.world.doors) {
        if (d.x < view.x - 100 || d.x > view.x + view.w + 100 || d.y - d.h > view.y + view.h || d.y < view.y) continue;
        const wood = scene.world.theme.wood[0];
        const top = d.y - d.h;
        const k = U.ease.inOutQuad(d.openT);
        // Kasa
        ctx.fillStyle = '#e4dccb';
        ctx.fillRect(d.x - 12, top - 10, 24, 10);
        ctx.fillRect(d.x - 12, top, 5, d.h);
        ctx.fillRect(d.x + 7, top, 5, d.h);
        // Kanat: kapalıyken tam genişlik, açıkken perspektifle daralır
        const w = U.lerp(64, 12, k);
        const dir = d.swing || 1;
        const x0 = k > 0.5 ? d.x - 6 * dir : d.x - w / 2;
        ctx.save();
        const g = ctx.createLinearGradient(x0, 0, x0 + w * (k > 0.5 ? dir : 1), 0);
        g.addColorStop(0, U.shade(wood, 0.12));
        g.addColorStop(1, U.shade(wood, -0.12));
        ctx.fillStyle = g;
        ctx.beginPath();
        if (k > 0.5) {
          const skew = 10 * k;
          ctx.moveTo(d.x, top);
          ctx.lineTo(d.x + dir * w, top + skew);
          ctx.lineTo(d.x + dir * w, d.y - skew * 0.6);
          ctx.lineTo(d.x, d.y);
        } else {
          ctx.rect(d.x - w / 2, top, w, d.h);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (k <= 0.5) {
          // Paneller
          ctx.strokeStyle = 'rgba(0,0,0,0.22)';
          ctx.lineWidth = 2;
          ctx.strokeRect(d.x - w / 2 + 8, top + 14, w - 16, d.h * 0.36);
          ctx.strokeRect(d.x - w / 2 + 8, top + d.h * 0.46, w - 16, d.h * 0.46);
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(d.x - w / 2 + 4, top + 4, 4, d.h - 8);
          // Kol ve kilit
          const hx = d.x + w / 2 - 12;
          const hy = d.y - 96;
          U.fillRoundRect(ctx, hx - 3, hy - 3, 12, 5, 2, '#d9b04a');
          U.circle(ctx, hx, hy + 12, 3, '#2a2a30');
          ctx.fillStyle = '#2a2a30';
          ctx.fillRect(hx - 1, hy + 12, 2, 5);
        }
        ctx.restore();
        // Kilit rozeti (yakındaysa)
        if (d.closed && U.dist(p.cx, p.bottom, d.x, d.y) < 260) {
          const a = 0.6 + Math.sin(t * 4) * 0.2;
          ctx.globalAlpha = a;
          D.icon(ctx, d.locked ? 'lock' : 'door', d.x, top - 22, 18, d.locked ? '#ffc83d' : '#dfe3f5');
          ctx.globalAlpha = 1;
        }
      }
    },
  };

  /* =====================================================================
   * GÜVENLİK
   * =================================================================== */
  const Security = {
    init(scene) {
      scene.alarm = false;
      scene.alarmT = 0;
      scene.secDisabled = false;
      scene.jamT = 0;
      scene.clouds = [];
    },

    systemOnline(scene) {
      return !scene.secDisabled;
    },

    laserOn(l, t) {
      if (l.disabled) return false;
      if (!l.blink) return true;
      const m = (t + l.phase) % (l.period + l.offT);
      return m < l.period;
    },

    /** Oyuncu duman bulutunun içinde mi / görüş hattı buluttan geçiyor mu */
    inCloud(scene, x, y) {
      for (const c of scene.clouds) if (c.type === 'smoke' && U.dist(x, y, c.x, c.y) < c.r * c.life01) return true;
      return false;
    },
    lineThroughCloud(scene, x1, y1, x2, y2) {
      for (const c of scene.clouds) {
        if (c.type !== 'smoke') continue;
        const r = c.r * c.life01;
        // Noktanın doğru parçasına uzaklığı
        const dx = x2 - x1;
        const dy = y2 - y1;
        const l2 = dx * dx + dy * dy || 1;
        const tt = U.clamp(((c.x - x1) * dx + (c.y - y1) * dy) / l2, 0, 1);
        if (U.dist(c.x, c.y, x1 + dx * tt, y1 + dy * tt) < r * 0.8) return true;
      }
      return false;
    },

    update(scene, dt) {
      const W = scene.world;
      const p = scene.player;
      const t = scene.time;
      if (scene.jamT > 0) scene.jamT -= dt;
      const online = this.systemOnline(scene);

      // Kameralar
      for (const cam of W.cameras) {
        cam.blink += dt;
        if (!online || scene.jamT > 0 || cam.disabled) {
          cam.detect = Math.max(0, cam.detect - dt);
          continue;
        }
        // Gerilim yükseldikçe kameralar hızlanır, uçlardaki bekleme kısalır:
        // kör nokta pencereleri daralır.
        const camMul = scene.heatFx ? scene.heatFx.cam : 1;
        if (cam.pause > 0) cam.pause -= dt;
        else {
          cam.angle += cam.sweep * cam.speed * camMul * dt;
          if (cam.angle > cam.a1) {
            cam.angle = cam.a1;
            cam.sweep = -1;
            cam.pause = 1.1 / camMul;
          } else if (cam.angle < cam.a0) {
            cam.angle = cam.a0;
            cam.sweep = 1;
            cam.pause = 1.1 / camMul;
          }
        }
        let sees = false;
        if (!p.hidden && !p.hiddenInTruck) {
          const inCone = U.pointInCone(p.cx, p.cy, cam.x, cam.y, cam.angle, cam.spread, cam.range * (p.crouch ? 0.8 : 1));
          if (inCone && RC.Physics.lineOfSight(W.grid, cam.x, cam.y + 6, p.cx, p.cy) && !this.lineThroughCloud(scene, cam.x, cam.y, p.cx, p.cy)) sees = true;
        }
        cam.sees = sees;
        if (sees) {
          const before = cam.detect;
          cam.detect += dt * (1.3 + Math.min(scene.levelIndex, 18) * 0.06);
          if (before === 0) RC.Audio.play('beep', { x: cam.x, y: cam.y, vol: 0.8, pitch: 1.4 });
          if (Math.floor(before * 6) !== Math.floor(cam.detect * 6)) RC.Audio.play('beep', { x: cam.x, y: cam.y, vol: 0.6, pitch: 1.2 + cam.detect });
          if (cam.detect >= 1) {
            cam.detect = 1;
            this.trigger(scene, p.cx, p.cy, L('Kamera seni gördü!'));
          }
        } else {
          cam.detect = Math.max(0, cam.detect - dt * 0.5);
        }
      }

      // Lazerler
      for (const l of W.lasers) {
        const on = online && this.laserOn(l, t);
        if (on !== l.wasOn && l.blink) RC.Audio.play('tick', { x: (l.x0 + l.x1) / 2, y: l.y, vol: 0.3, pitch: on ? 1.3 : 0.8 });
        l.wasOn = on;
        if (!on || p.hiddenInTruck || p.climbing) continue;
        if (p.x < l.x1 && p.x + p.w > l.x0 && p.y < l.y && p.y + p.h > l.y) {
          this.trigger(scene, p.cx, l.y, L('Lazer ışınına değdin!'));
          l.hitT = 1;
        }
        if (l.hitT > 0) l.hitT -= dt;
      }

      // Hareket sensörleri
      for (const m of W.motions || []) {
        m.blink += dt;
        if (!online || m.disabled || scene.jamT > 0) {
          m.acc = 0;
          continue;
        }
        const inZone = p.cx > m.zx0 && p.cx < m.zx1 && Math.abs(p.bottom - m.floorY) < 8 && !p.hiddenInTruck;
        const moving = Math.abs(p.vx) > 40 && !p.crouch;
        if (inZone && moving) {
          if (m.acc === 0) RC.Audio.play('beep', { x: m.x, y: m.y, vol: 0.7, pitch: 1.8 });
          m.acc += dt;
          if (m.acc > 0.45) this.trigger(scene, p.cx, p.cy, L('Hareket sensörü seni algıladı!'));
        } else m.acc = Math.max(0, m.acc - dt * 0.6);
        m.active = inZone;
      }
      // Basınç plakaları
      for (const pl of W.plates || []) {
        if (!online || pl.disabled) continue;
        const on = p.onGround && Math.abs(p.bottom - pl.y) < 3 && p.x + p.w > pl.x0 + 4 && p.x < pl.x1 - 4 && !p.climbing;
        if (on) {
          pl.pressT = 1;
          RC.Audio.play('metal', { x: (pl.x0 + pl.x1) / 2, y: pl.y, vol: 0.5, intensity: 0.2, minGap: 1 });
          this.trigger(scene, p.cx, pl.y, L('Basınç plakasına bastın!'));
        } else pl.pressT = Math.max(0, pl.pressT - dt);
      }
      // Tarayan lazerler
      for (const sw of W.sweepers || []) {
        if (!online || sw.disabled) continue;
        sw.x += sw.dir * sw.speed * dt;
        if (sw.x > sw.x1) {
          sw.x = sw.x1;
          sw.dir = -1;
        } else if (sw.x < sw.x0) {
          sw.x = sw.x0;
          sw.dir = 1;
        }
        if (!p.hiddenInTruck && p.x < sw.x + 2 && p.x + p.w > sw.x - 2 && p.y < sw.y && p.y + p.h > sw.top) {
          this.trigger(scene, p.cx, p.cy, L('Tarayan lazere yakalandın!'));
        }
      }

      // Bulutlar (sis / uyku gazı)
      for (let i = scene.clouds.length - 1; i >= 0; i--) {
        const c = scene.clouds[i];
        c.t += dt;
        const k = c.t / c.dur;
        c.life01 = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
        if (Math.random() < dt * 14) {
          scene.particles.smoke(c.x + U.rand(-c.r, c.r) * 0.6, c.y + U.rand(-c.r, c.r) * 0.3, 1, c.type === 'gas' ? '#9ad08a' : '#9aa0aa', 26);
        }
        if (c.type === 'gas') {
          for (const r of scene.residents) {
            if (r.state !== 'sleep' && r.state !== 'knocked' && U.dist(r.x, r.y - 30, c.x, c.y) < c.r * c.life01) r.knockOut(25);
            if (r.state === 'sleep') r.wake = Math.max(0, r.wake - 40 * dt);
          }
          if (scene.dog && U.dist(scene.dog.x, -20, c.x, c.y) < c.r * c.life01) scene.dog.knockOut(25);
        }
        if (c.t >= c.dur) scene.clouds.splice(i, 1);
      }

      if (scene.alarm) {
        scene.alarmT += dt;
        if (Math.floor(scene.alarmT / 0.9) !== Math.floor((scene.alarmT - dt) / 0.9)) RC.Audio.play('alarm', { vol: 0.55 });
      }
    },

    /** Alarmı başlat */
    trigger(scene, x, y, reason) {
      if (scene.alarm || scene.secDisabled || scene.secGraceT > 0) return;
      // İlk ihlal izlenen sistemde sessiz alarmdır; aynı sensör bir sonraki
      // karede sesli alarmı tetiklemesin diye kısa bir ek süre tanınır.
      if (scene.heat && scene.heat.trySilentAlarm(reason)) {
        scene.secGraceT = 5;
        return;
      }
      scene.alarm = true;
      scene.alarmT = 0;
      scene.stats.alarms = (scene.stats.alarms || 0) + 1;
      scene.toast(reason + ' ' + L('ALARM ÇALIYOR!'), '#ff3043');
      RC.Audio.play('alarm', { vol: 1 });
      RC.Audio.play('siren', { vol: 0.8 });
      scene.camera.shake(0.4);
      if (!(scene.mods && scene.mods.blackout)) scene.lightsOn = true;
      const k = scene.floorOf(y);
      for (const r of scene.residents) {
        if (r.state === 'sleep') r.wakeUp(x, k);
        else if (r.state !== 'chase' && r.state !== 'knocked') r.investigate(x, k);
        if (r.speechCooldown()) r.say(U.pick(C.LINES.alarm), 1.6);
      }
      if (scene.dog && scene.dog.state === 'sleep') scene.dog.setState('alert');
      if (!scene.policeCalled) scene.callPolice(null, 60);
      else scene.policeT = Math.min(scene.policeT, 60);
    },

    /** Alarm sistemini kapat (panel veya EMP) */
    disable(scene, emp) {
      if (scene.secDisabled) return;
      scene.secDisabled = true;
      for (const c of scene.world.cameras) c.disabled = true;
      for (const l of scene.world.lasers) l.disabled = true;
      for (const m of scene.world.motions || []) m.disabled = true;
      for (const pl of scene.world.plates || []) pl.disabled = true;
      for (const sw of scene.world.sweepers || []) sw.disabled = true;
      if (scene.world.panel) scene.world.panel.disabled = true;
      if (emp) {
        scene.particles.ring(scene.player.cx, scene.player.cy, 900, '#8fd6ff', 1, 6);
        scene.particles.sparks(scene.player.cx, scene.player.cy, 40, '#8fd6ff', 500);
        RC.Audio.play('flash', { vol: 0.8 });
      }
      if (scene.alarm) {
        scene.alarm = false;
        scene.toast(L('Siren sustu... ama polis hâlâ yolda!'), '#ffc83d');
      } else {
        scene.toast(L('Güvenlik sistemi devre dışı!'), '#3ddc84');
      }
      RC.Audio.play('safeOpen', { vol: 0.5 });
    },

    /* ------------------------- Çizim (dünya) ------------------------- */
    drawWorld(ctx, scene, view, t) {
      const W = scene.world;
      // Alarm paneli
      const pn = W.panel;
      if (pn) {
        U.fillRoundRect(ctx, pn.x - pn.w / 2, pn.y, pn.w, pn.h, 4, '#2a2e36');
        ctx.fillStyle = pn.disabled ? '#1a3a2a' : scene.alarm ? (Math.floor(t * 6) % 2 ? '#ff3043' : '#5a1018') : '#0e2a1a';
        ctx.fillRect(pn.x - pn.w / 2 + 5, pn.y + 5, pn.w - 10, 12);
        ctx.fillStyle = '#9aa0aa';
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(pn.x - 10 + c * 8, pn.y + 21 + r * 7, 5, 5);
        U.circle(ctx, pn.x + pn.w / 2 - 5, pn.y + 4, 2, pn.disabled ? '#3ddc84' : Math.sin(t * 4) > 0 ? '#ff3043' : '#5a1018');
      }
      // Hareket sensörleri
      for (const m of W.motions || []) {
        if (m.x < view.x - 60 || m.x > view.x + view.w + 60) continue;
        U.fillRoundRect(ctx, m.x - 10, m.y - 8, 20, 16, 5, '#f0f0f2');
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        U.ellipse(ctx, m.x, m.y + 2, 6, 5, 0);
        const off = m.disabled || scene.secDisabled;
        U.circle(ctx, m.x + 6, m.y - 4, 2, off ? '#333' : m.acc > 0 ? '#ff3043' : Math.sin(m.blink * 2) > 0.7 ? '#3ddc84' : '#1f6a3a');
      }
      // Basınç plakaları
      for (const pl of W.plates || []) {
        if (pl.x1 < view.x - 20 || pl.x0 > view.x + view.w + 20) continue;
        ctx.fillStyle = pl.disabled || scene.secDisabled ? '#4a4f58' : '#8a909c';
        ctx.fillRect(pl.x0, pl.y - 3, pl.x1 - pl.x0, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let x = pl.x0 + 6; x < pl.x1 - 4; x += 10) ctx.fillRect(x, pl.y - 3, 2, 4);
        U.circle(ctx, pl.x0 + 5, pl.y - 1, 1.5, pl.disabled || scene.secDisabled ? '#333' : '#ff3043');
      }
      // Kameralar (gövde)
      for (const cam of W.cameras) {
        if (cam.x < view.x - 60 || cam.x > view.x + view.w + 60) continue;
        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.fillStyle = '#3a3f4a';
        ctx.fillRect(-4 - (cam.dir > 0 ? 18 : -14), -14, 8, 14);
        ctx.fillRect(cam.dir > 0 ? -18 : 10, -16, 8, 4);
        ctx.rotate(cam.angle);
        U.fillRoundRect(ctx, -8, -7, 26, 14, 4, '#e8e8ec');
        ctx.fillStyle = '#1a1a1e';
        ctx.fillRect(16, -5, 5, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(-8, 3, 26, 4);
        ctx.restore();
        const off = cam.disabled || scene.secDisabled;
        const jam = scene.jamT > 0;
        const col = off ? '#333' : jam ? (Math.floor(t * 10) % 2 ? '#4aa8ff' : '#222') : cam.detect > 0 ? '#ff3043' : Math.sin(cam.blink * 3) > 0.6 ? '#ff3043' : '#5a1018';
        U.circle(ctx, cam.x + Math.cos(cam.angle) * 4, cam.y - 4, 2.5, col);
      }
      // Lazer yayıcıları
      for (const l of W.lasers) {
        if (l.x1 < view.x - 40 || l.x0 > view.x + view.w + 40) continue;
        for (const ex of [l.x0, l.x1]) {
          ctx.fillStyle = '#2a2e36';
          ctx.fillRect(ex - 4, l.y - 8, 8, l.floorY - l.y + 8);
          U.fillRoundRect(ctx, ex - 7, l.y - 10, 14, 14, 3, '#3a3f4a');
          U.circle(ctx, ex, l.y - 3, 3, this.laserOn(l, t) && !scene.secDisabled ? '#ff2a3b' : '#401018');
          ctx.fillStyle = '#1a1a1e';
          ctx.fillRect(ex - 8, l.floorY - 4, 16, 4);
        }
      }
    },

    /** Karanlığın üstünde görünen katman: ışınlar, koniler, bulutlar */
    drawOverlay(ctx, scene, view, t) {
      const W = scene.world;
      const online = !scene.secDisabled;
      // Kamera konileri
      for (const cam of W.cameras) {
        if (!online || cam.disabled) continue;
        if (cam.x < view.x - 600 || cam.x > view.x + view.w + 600) continue;
        const jam = scene.jamT > 0;
        const col = jam ? '#4aa8ff' : cam.detect > 0 ? '#ff3043' : '#ffe08a';
        const a = jam ? 0.05 : 0.1 + cam.detect * 0.18;
        const g = ctx.createRadialGradient(cam.x, cam.y, 6, cam.x, cam.y, cam.range);
        g.addColorStop(0, U.rgba(col, a * 2));
        g.addColorStop(1, U.rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cam.x, cam.y);
        ctx.arc(cam.x, cam.y, cam.range, cam.angle - cam.spread, cam.angle + cam.spread);
        ctx.closePath();
        ctx.fill();
        if (cam.detect > 0) {
          const w = 44;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          U.fillRoundRect(ctx, cam.x - w / 2 - 2, cam.y - 34, w + 4, 9, 4);
          ctx.fillStyle = '#ff3043';
          U.fillRoundRect(ctx, cam.x - w / 2, cam.y - 32, w * cam.detect, 5, 3);
        }
      }
      // Hareket sensörü bölgeleri
      for (const m of W.motions || []) {
        if (!online || m.disabled || scene.jamT > 0) continue;
        if (m.zx1 < view.x || m.zx0 > view.x + view.w) continue;
        const a = m.acc > 0 ? 0.22 : m.active ? 0.12 : 0.06;
        const g = ctx.createLinearGradient(0, m.y, 0, m.floorY);
        g.addColorStop(0, `rgba(61,220,132,${a})`);
        g.addColorStop(1, `rgba(61,220,132,${a * 0.3})`);
        ctx.fillStyle = m.acc > 0 ? `rgba(255,48,67,${a})` : g;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.zx0, m.floorY);
        ctx.lineTo(m.zx1, m.floorY);
        ctx.closePath();
        ctx.fill();
      }
      // Tarayan lazerler
      for (const sw of W.sweepers || []) {
        if (!online || sw.disabled) continue;
        if (sw.x < view.x - 20 || sw.x > view.x + view.w + 20) continue;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255,40,60,0.25)';
        ctx.lineWidth = 9;
        U.line(ctx, sw.x, sw.top, sw.x, sw.y);
        ctx.strokeStyle = 'rgba(255,140,150,0.95)';
        ctx.lineWidth = 2;
        U.line(ctx, sw.x, sw.top, sw.x, sw.y);
        ctx.restore();
        U.fillRoundRect(ctx, sw.x - 8, sw.top - 10, 16, 10, 3, '#3a3f4a');
        ctx.fillStyle = '#2a2e36';
        ctx.fillRect(sw.x0 - 4, sw.top - 6, sw.x1 - sw.x0 + 8, 3);
      }
      // Lazer ışınları
      for (const l of W.lasers) {
        if (l.x1 < view.x - 40 || l.x0 > view.x + view.w + 40) continue;
        if (!online || !this.laserOn(l, t)) continue;
        const flick = 0.75 + Math.sin(t * 40 + l.x0) * 0.1;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,40,60,${0.25 * flick})`;
        ctx.lineWidth = 8;
        U.line(ctx, l.x0, l.y - 3, l.x1, l.y - 3);
        ctx.strokeStyle = `rgba(255,120,130,${0.95 * flick})`;
        ctx.lineWidth = 2;
        U.line(ctx, l.x0, l.y - 3, l.x1, l.y - 3);
        ctx.restore();
        // Toz parçacıklarında görünen ışın noktaları
        for (let i = 0; i < 4; i++) {
          const x = l.x0 + ((t * 30 + i * 53 + l.x0) % (l.x1 - l.x0));
          U.circle(ctx, x, l.y - 3, 1.3, 'rgba(255,200,200,0.8)');
        }
      }
      // Bulutlar
      for (const c of scene.clouds) {
        const r = c.r * c.life01;
        const g = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r);
        const col = c.type === 'gas' ? '#9ad08a' : '#b4b8c4';
        g.addColorStop(0, U.rgba(col, 0.55 * c.life01));
        g.addColorStop(1, U.rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, r, r * 0.7, 0, 0, U.TAU);
        ctx.fill();
      }
      // Alarm: kırmızı dönen ışık
      if (scene.alarm) {
        const H = W.house;
        const a = 0.12 + Math.max(0, Math.sin(t * 8)) * 0.14;
        ctx.fillStyle = `rgba(255,20,40,${a})`;
        ctx.fillRect(H.x, H.topY, H.w, (H.basement ? C.FLOOR_H : 0) - H.topY);
      }
    },
  };

  RC.Doors = Doors;
  RC.Security = Security;
})(window.RC);
