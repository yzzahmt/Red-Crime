/* =========================================================================
 *  RED CRIME - Bölüme özel zorluklar (cfg.mods)
 *   storm     → şimşek her yeri aydınlatır (görülürsün), gök gürültüsü sesi bastırır
 *   heli      → polis helikopteri dış alanı ışıldakla tarar; ışıkta kalırsan polis
 *   insomniac → bazı sakinler (cfg.insomniac) ara ara kalkıp evi dolaşır
 *   blackout  → elektrik yok: ışıklar yanmaz, uyanan sakin telefon feneriyle arar
 *   fragile   → kırılan her eşya sigorta alarmını (polisi) tetikler
 *   tight     → soygun süresi kısalır
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;

  const MOD_INFO = {
    storm: { icon: 'sound', color: '#8fb7ff', name: 'Fırtına', desc: 'Gök gürlerken sesin duyulmaz, şimşekte görünürsün.' },
    heli: { icon: 'police', color: '#4aa8ff', name: 'Helikopter', desc: 'Işıldak dış alanı tarar. Dışarıda yakalanma.' },
    insomniac: { icon: 'eye', color: '#ffc83d', name: 'Uykusuz Sakin', desc: 'Gece boyunca kalkıp evi dolaşır.' },
    blackout: { icon: 'flashlight', color: '#b467ff', name: 'Elektrik Kesintisi', desc: 'Işıklar yanmaz; uyanan fenerle arar.' },
    fragile: { icon: 'lock', color: '#ff8fa3', name: 'Hassas Sigorta', desc: 'Kırılan her eşya polisi çağırır.' },
    tight: { icon: 'clock', color: '#ff8c2e', name: 'Dar Süre', desc: 'Soygun süresi kısa.' },
  };
  const ORDER = ['tight', 'heli', 'storm', 'blackout', 'insomniac', 'fragile'];

  const Hazards = {
    MOD_INFO,

    /** Bölümün etkin zorlukları (sıralı): [{id, icon, color, name, desc}] */
    list(cfg) {
      const m = (cfg && cfg.mods) || {};
      return ORDER.filter((k) => m[k]).map((k) => Object.assign({ id: k }, MOD_INFO[k]));
    },

    init(scene) {
      const m = scene.cfg.mods || {};
      scene.mods = m;
      scene.lightning = 0;
      scene.thunderMask = 0;
      scene.storm = m.storm ? { t: U.rand(5, 9), thunderAt: -1, told: false } : null;
      scene.heli = m.heli ? { state: 'idle', t: U.rand(14, 22), dir: 1, spot: 0, x0: 0, x1: 0, speed: 0, vol: 0, track: 0, warned: false } : null;
      scene.insomniacTold = false;
      if (m.insomniac) for (const r of scene.residents) if (r.cfg && r.cfg.insomniac) r.strollT = U.rand(18, 30);
    },

    update(scene, dt) {
      if (!scene.mods) return;
      this.updateStorm(scene, dt);
      this.updateHeli(scene, dt);
      // Uykusuz sakinler
      if (scene.mods.insomniac && !scene.policeCalled) {
        for (const r of scene.residents) {
          if (r.strollT == null || r.state !== 'sleep') continue;
          r.strollT -= dt;
          if (r.strollT <= 0) {
            r.strollT = U.rand(32, 50);
            r.nightWalk();
            if (!scene.insomniacTold) {
              scene.insomniacTold = true;
              scene.toast(RC.L('{n} uykusuz, evi dolaşıyor! Karşısına çıkma.', { n: r.displayName }), '#ffc83d');
            }
          }
        }
      }
    },

    updateStorm(scene, dt) {
      const s = scene.storm;
      if (!s) return;
      // Şimşek: hızlı sönüm + titreşim
      if (scene.lightning > 0) {
        scene.lightning = Math.max(0, scene.lightning - dt * 2.4);
        if (scene.lightning > 0.3 && Math.random() < 0.08) scene.lightning *= 0.5;
      }
      if (scene.thunderMask > 0) scene.thunderMask = Math.max(0, scene.thunderMask - dt);
      s.t -= dt;
      if (s.t <= 0) {
        s.t = U.rand(9, 16);
        scene.lightning = 1;
        s.thunderAt = U.rand(0.25, 0.9);
        if (!s.told) {
          s.told = true;
          scene.toast('Şimşek! Işıkta görünürsün. Gök gürlerken sesin duyulmaz.', '#8fb7ff');
        }
      }
      if (s.thunderAt > 0) {
        s.thunderAt -= dt;
        if (s.thunderAt <= 0) {
          s.thunderAt = -1;
          RC.Audio.play('thunder', { vol: 1 });
          scene.thunderMask = 2.2;
          scene.camera.shake(0.12);
        }
      }
    },

    updateHeli(scene, dt) {
      const h = scene.heli;
      if (!h) return;
      const W = scene.world;
      const p = scene.player;
      h.t -= dt;
      switch (h.state) {
        case 'idle':
          h.vol = Math.max(0, h.vol - dt * 0.5);
          if (h.t <= 0) {
            h.state = 'approach';
            h.t = 3.5;
            h.dir = Math.random() < 0.5 ? 1 : -1;
            h.x0 = W.bounds.x + 120;
            h.x1 = W.bounds.x + W.bounds.w - 120;
            h.spot = h.dir > 0 ? h.x0 - 400 : h.x1 + 400;
            h.speed = (h.x1 - h.x0) / 10;
            RC.Audio.heliLoop();
            scene.toast(h.warned ? 'Helikopter geliyor!' : 'Helikopter geliyor! Dışarıdaysan içeri gir ya da saklan.', '#4aa8ff');
            h.warned = true;
          }
          break;
        case 'approach':
          h.vol = Math.min(1, h.vol + dt * 0.4);
          h.spot += h.dir * h.speed * 0.6 * dt;
          if (h.t <= 0) {
            h.state = 'sweep';
            h.spot = h.dir > 0 ? h.x0 : h.x1;
          }
          break;
        case 'sweep':
          h.vol = 1;
          h.spot += h.dir * h.speed * dt;
          if (this.heliSees(scene)) {
            h.state = 'track';
            h.t = 4;
            scene.onHeliSpotted();
          } else if ((h.dir > 0 && h.spot > h.x1) || (h.dir < 0 && h.spot < h.x0)) {
            h.state = 'leave';
            h.t = 3;
          }
          break;
        case 'track':
          // Gördüğü hırsızı bir süre ışıkta tutar
          h.spot = U.damp(h.spot, p.cx, 3, dt);
          if (h.t <= 0) {
            h.state = 'leave';
            h.t = 3;
          }
          break;
        case 'leave':
          h.vol = Math.max(0, h.vol - dt * 0.35);
          h.spot += h.dir * h.speed * 0.8 * dt;
          if (h.t <= 0) {
            h.state = 'idle';
            h.t = U.rand(20, 32);
            RC.Audio.stopLoop('heli', 1.5);
          }
          break;
      }
      if (h.state !== 'idle') RC.Audio.setLoop('heli', { vol: h.vol });
    },

    /** Işıldak dairesi dışarıdaki oyuncunun üstünde mi? */
    heliSees(scene) {
      const h = scene.heli;
      const p = scene.player;
      const W = scene.world;
      if (p.hidden || p.hiddenInTruck) return false;
      const outside = p.cx < W.house.x || p.cx > W.house.r;
      if (!outside || p.bottom < -260) return false;
      return Math.abs(p.cx - h.spot) < 92;
    },

    /** Işıldak açık mı ve ışığın düştüğü yer */
    heliBeam(scene) {
      const h = scene.heli;
      if (!h || h.state === 'idle') return null;
      const on = h.state === 'sweep' || h.state === 'track' || (h.state === 'approach' && h.t < 1.2) || (h.state === 'leave' && h.t > 1.5);
      return on ? { x: h.spot, y: -6, r: 120 } : null;
    },

    /** Karanlık katmanından oyulacak ışıklar (dünya koordinatı, destination-out bağlamı) */
    cutDarkness(ctx, scene, radial) {
      const b = this.heliBeam(scene);
      if (b) radial(ctx, b.x, b.y - 30, b.r * 1.6, 0.95);
    },

    /** Gökyüzündeki helikopter ve ışık huzmesi (aydınlatmadan sonra, dünya koordinatı) */
    renderWorld(ctx, scene, t) {
      const h = scene.heli;
      if (!h || h.state === 'idle') return;
      const view = scene.camera.view;
      const hx = h.spot - h.dir * 140;
      const hy = view.y + 70 + Math.sin(t * 1.3) * 6;
      const beam = this.heliBeam(scene);
      ctx.save();
      if (beam) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(hx, hy, beam.x, beam.y);
        g.addColorStop(0, 'rgba(220,235,255,0.22)');
        g.addColorStop(1, 'rgba(220,235,255,0.08)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(hx - 6, hy + 10);
        ctx.lineTo(hx + 6, hy + 10);
        ctx.lineTo(beam.x + beam.r, beam.y);
        ctx.lineTo(beam.x - beam.r, beam.y);
        ctx.closePath();
        ctx.fill();
        const sg = ctx.createRadialGradient(beam.x, beam.y, 0, beam.x, beam.y, beam.r);
        sg.addColorStop(0, h.state === 'track' ? 'rgba(255,120,120,0.4)' : 'rgba(235,245,255,0.35)');
        sg.addColorStop(1, 'rgba(235,245,255,0)');
        ctx.fillStyle = sg;
        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.scale(1, 0.28);
        ctx.beginPath();
        ctx.arc(0, 0, beam.r, 0, U.TAU);
        ctx.restore();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      // Işıldağın kaynağında parlama (helikopteri gökyüzünde belli eder)
      if (beam) {
        ctx.globalCompositeOperation = 'lighter';
        const lg = ctx.createRadialGradient(hx, hy + 12, 0, hx, hy + 12, 46);
        lg.addColorStop(0, 'rgba(255,255,255,0.75)');
        lg.addColorStop(0.3, 'rgba(220,235,255,0.25)');
        lg.addColorStop(1, 'rgba(220,235,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(hx - 46, hy - 34, 92, 92);
        ctx.globalCompositeOperation = 'source-over';
      }
      // Gövde silueti
      ctx.translate(hx, hy);
      ctx.scale(h.dir, 1);
      ctx.fillStyle = '#171a21';
      U.ellipse(ctx, 0, 0, 34, 14, 0);
      // Ay ışığı kenar çizgisi
      ctx.strokeStyle = 'rgba(150,175,215,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 14, 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      ctx.fillStyle = '#171a21';
      ctx.fillRect(-78, -4, 50, 6);
      ctx.fillRect(-84, -14, 8, 16);
      ctx.fillRect(-14, 12, 32, 3);
      ctx.fillRect(-6, 8, 3, 6);
      ctx.fillRect(10, 8, 3, 6);
      ctx.fillStyle = 'rgba(140,180,220,0.35)';
      U.ellipse(ctx, 18, -3, 12, 7, 0);
      // Rotor bulanıklığı
      ctx.fillStyle = 'rgba(30,32,40,0.55)';
      U.ellipse(ctx, 0, -18, 70 + Math.sin(t * 40) * 4, 2.5, 0);
      ctx.fillRect(-2, -18, 4, 6);
      // Seyir ışıkları
      if (Math.floor(t * 2) % 2 === 0) U.circle(ctx, -82, -14, 2.5, '#ff3043');
      if (Math.floor(t * 2 + 0.5) % 2 === 0) U.circle(ctx, 30, 6, 2.2, '#ffffff');
      ctx.restore();
    },
  };

  RC.Hazards = Hazards;
})(window.RC);
