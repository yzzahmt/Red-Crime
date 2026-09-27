/* =========================================================================
 *  RED CRIME - Dokunmatik kontroller (Limbo tarzı, joystick yok)
 *
 *  Oyun sahnesinde (sahne touchGestures() → true döndürdüğünde) ekranın
 *  herhangi bir yerinde:
 *    parmağı sağa/sola kaydır ve tut   → yürü (uzağa kaydırınca koş)
 *    yukarı fırlat                     → zıpla (tutarsan merdivende tırman)
 *    aşağı kaydır ve tut               → çömel (aşağı + yukarı: platformdan in)
 *    dokun                             → bağlama göre al / bırak / yükle / aç
 *    basılı tut                        → eşya tutuluyorsa fırlat, değilse fener
 *    ikinci parmakla dokun             → hareket ederken eylem
 *  Menülerde ve mini oyunlarda dokunuş fare tıklaması gibi davranır; hızlı
 *  kaydırmalar ok tuşu olarak da gönderilir.
 *
 *  Sahneler Input'a sanal tuşlar ('Touch.left' vb.) üzerinden bağlanır, bu
 *  yüzden oyun kodu klavye/dokunmatik farkını bilmez.
 * ========================================================================= */
(function (RC) {
  'use strict';

  // Eşikler CSS pikseli cinsinden (ekran boyundan bağımsız hissettirir)
  const H_ON = 14; // yatay: yürümeye başla
  const H_OFF = 6; // yatay: dur
  const H_CLAMP = 40; // çapa en fazla bu kadar geride kalır → yön değişimi hızlı
  const RUN_DIST = 120; // aynı yönde bu kadar kaydırınca koş
  const UP_ON = 32;
  const UP_OFF = 12;
  const DOWN_ON = 30;
  const DOWN_OFF = 12;
  const V_CLAMP = 44;
  const TAP_MOVE = 12;
  const TAP_TIME = 0.28;
  const LONG_TIME = 0.45;
  const SWIPE_MIN = 40; // menüde ok tuşu sayılacak kaydırma

  const Touch = {
    active: false, // cihazda dokunmatik kullanılıyor mu (etiketler buna göre)
    touches: new Map(),
    primary: null,
    held: Object.create(null),
    lastTouchT: -99,
    downRecentT: -99,

    init(canvas) {
      const I = RC.Input;
      this.I = I;
      this.canvas = canvas;
      try {
        if (window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) this.active = true;
      } catch (e) {
        /* eski tarayıcı */
      }
      if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) this.active = true;

      const opts = { passive: false };
      canvas.addEventListener('touchstart', (e) => this.onStart(e), opts);
      canvas.addEventListener('touchmove', (e) => this.onMove(e), opts);
      canvas.addEventListener('touchend', (e) => this.onEnd(e), opts);
      canvas.addEventListener('touchcancel', (e) => this.onEnd(e, true), opts);
      // Gerçek fare hareketi → klavye/fare etiketlerine dön
      window.addEventListener('mousemove', () => {
        if (this.active && this.now() - this.lastTouchT > 1.5 && !this.touches.size) this.active = false;
      });
      window.addEventListener('keydown', () => {
        if (this.active && this.now() - this.lastTouchT > 1.5) this.active = false;
      });
    },

    now() {
      return performance.now() / 1000;
    },
    cssToLogical(v) {
      return v / (RC.Game ? RC.Game.scale : 1);
    },
    toLogical(t) {
      const rect = this.canvas.getBoundingClientRect();
      const s = RC.Game ? RC.Game.scale : 1;
      return { x: (t.clientX - rect.left) / s, y: (t.clientY - rect.top) / s };
    },
    scene() {
      return RC.Game && RC.Game.current;
    },
    gestures() {
      const sc = this.scene();
      return !!(sc && sc.touchGestures && sc.touchGestures());
    },

    /* ---------------- sanal tuşlar ---------------- */
    hold(name, on) {
      const I = this.I;
      const code = 'Touch.' + name;
      if (on && !I.keys[code]) {
        I.pressed[code] = true;
        I.anyPressed = true;
      }
      if (!on && I.keys[code]) I.released[code] = true;
      I.keys[code] = on;
      this.held[name] = on;
    },
    /** Tek karelik basış (bir sonraki endFrame'de bırakılır) */
    pulse(code) {
      const I = this.I;
      I.pressed[code] = true;
      I.keys[code] = true;
      I.anyPressed = true;
      I.pulses.push(code);
    },

    /* ---------------- olaylar ---------------- */
    onStart(e) {
      e.preventDefault();
      this.active = true;
      this.lastTouchT = this.now();
      RC.Audio && RC.Audio.unlock();
      const I = this.I;
      const gest = this.gestures();
      for (const t of e.changedTouches) {
        const p = this.toLogical(t);
        const tr = {
          id: t.identifier,
          sx: t.clientX,
          sy: t.clientY,
          x: t.clientX,
          y: t.clientY,
          ax: t.clientX, // yatay çapa
          ay: t.clientY, // dikey çapa
          runX: t.clientX,
          t0: this.now(),
          moved: 0,
          gest,
          dir: 0,
          up: false,
          down: false,
          long: false,
          button: null,
        };
        const btn = this.buttonAt(p.x, p.y);
        if (btn) {
          tr.button = btn;
          if (btn.hold) this.hold(btn.name, true);
          else this.pulse(btn.code || 'Touch.' + btn.name);
        } else if (gest) {
          if (this.primary === null) this.primary = t.identifier;
        } else {
          // Menü/mini oyun: fare tıklaması gibi
          I.mouse.x = p.x;
          I.mouse.y = p.y;
          I.mouse.down = true;
          I.mouse.pressed = true;
          I.anyPressed = true;
          this.pulse('Touch.tap');
        }
        this.touches.set(t.identifier, tr);
      }
    },

    onMove(e) {
      e.preventDefault();
      this.lastTouchT = this.now();
      const I = this.I;
      for (const t of e.changedTouches) {
        const tr = this.touches.get(t.identifier);
        if (!tr) continue;
        tr.x = t.clientX;
        tr.y = t.clientY;
        tr.moved = Math.max(tr.moved, Math.hypot(tr.x - tr.sx, tr.y - tr.sy));
        if (tr.button) continue;
        if (!tr.gest) {
          const p = this.toLogical(t);
          I.mouse.x = p.x;
          I.mouse.y = p.y;
          continue;
        }
        if (t.identifier === this.primary) this.steer(tr);
        else if (!tr.up && tr.ay - tr.y > UP_ON) {
          // İkinci parmakla yukarı fırlatma da zıplatır
          tr.up = true;
          this.pulse('Touch.jump');
        }
      }
    },

    /** Birincil parmak: çapaya göre yön/zıplama/çömelme */
    steer(tr) {
      // Yatay
      let dx = tr.x - tr.ax;
      if (dx > H_CLAMP) tr.ax = tr.x - H_CLAMP;
      if (dx < -H_CLAMP) tr.ax = tr.x + H_CLAMP;
      dx = tr.x - tr.ax;
      let dir = tr.dir;
      if (dir === 0 && Math.abs(dx) > H_ON) dir = Math.sign(dx);
      else if (dir !== 0 && (dx * dir < H_OFF)) dir = Math.abs(dx) > H_ON ? Math.sign(dx) : 0;
      if (dir !== tr.dir) {
        tr.dir = dir;
        tr.runX = tr.x;
      }
      this.hold('left', dir < 0);
      this.hold('right', dir > 0);
      this.hold('run', dir !== 0 && Math.abs(tr.x - tr.runX) > RUN_DIST && !tr.down);

      // Dikey
      let dy = tr.y - tr.ay;
      if (dy > V_CLAMP) tr.ay = tr.y - V_CLAMP;
      if (dy < -V_CLAMP) tr.ay = tr.y + V_CLAMP;
      dy = tr.y - tr.ay;
      if (!tr.up && dy < -UP_ON) {
        tr.up = true;
        // Az önce çömeliyorduysa: S + W → platformdan aşağı in
        const wasDown = tr.down || this.now() - this.downRecentT < 0.3;
        tr.down = false;
        this.hold('down', false);
        this.hold('up', true);
        if (wasDown) this.pulse('Touch.down');
      } else if (tr.up && dy > -UP_OFF) {
        tr.up = false;
        this.hold('up', false);
      }
      if (!tr.down && dy > DOWN_ON) {
        tr.down = true;
        if (tr.up) {
          tr.up = false;
          this.hold('up', false);
        }
        this.hold('down', true);
      } else if (tr.down && dy < DOWN_OFF) {
        tr.down = false;
        this.downRecentT = this.now();
        this.hold('down', false);
      }
    },

    onEnd(e, cancel) {
      e.preventDefault();
      this.lastTouchT = this.now();
      const I = this.I;
      for (const t of e.changedTouches) {
        const tr = this.touches.get(t.identifier);
        this.touches.delete(t.identifier);
        if (!tr) continue;
        const dur = this.now() - tr.t0;
        const isTap = !cancel && tr.moved < TAP_MOVE && dur < TAP_TIME;
        if (tr.button) {
          if (tr.button.hold) this.hold(tr.button.name, false);
          continue;
        }
        if (!tr.gest) {
          I.mouse.down = [...this.touches.values()].some((o) => !o.gest);
          I.mouse.released = true;
          // Hızlı kaydırma → ok tuşu (ör. şifre kırma mini oyunu)
          const dx = tr.x - tr.sx;
          const dy = tr.y - tr.sy;
          if (!cancel && dur < 0.6 && Math.max(Math.abs(dx), Math.abs(dy)) > SWIPE_MIN) {
            if (Math.abs(dx) > Math.abs(dy)) this.pulse(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
            else this.pulse(dy > 0 ? 'ArrowDown' : 'ArrowUp');
          }
          continue;
        }
        if (t.identifier === this.primary) {
          this.primary = null;
          if (tr.down) this.downRecentT = this.now();
          for (const k of ['left', 'right', 'run', 'up', 'down']) this.hold(k, false);
        }
        if (isTap && !tr.long) this.action('touchTap', 'grab');
      }
      if (!this.touches.size) this.primary = null;
    },

    /** Sahneden bağlama uygun eylemi isteyip bir karelik bas */
    action(hook, fallback) {
      const sc = this.scene();
      const name = (sc && sc[hook] && sc[hook]()) || fallback;
      if (name) this.pulse('Touch.' + name);
    },

    /** Her kare: basılı tutma algılama */
    update() {
      if (this.primary === null) return;
      const tr = this.touches.get(this.primary);
      if (!tr || tr.long || !tr.gest) return;
      if (tr.moved < TAP_MOVE && this.now() - tr.t0 > LONG_TIME) {
        tr.long = true;
        this.action('touchLongPress', null);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch (e) {
            /* izin yok */
          }
        }
      }
    },

    /** Sahne düğmeleri (duraklat, harita, ekipman) */
    buttons() {
      const sc = this.scene();
      return (sc && sc.touchButtons && sc.touchButtons()) || [];
    },
    buttonAt(x, y) {
      for (const b of this.buttons()) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
      return null;
    },

    /** Oyun sahnesinde parmak izi ve düğmeler (joystick değil, yalnızca geri bildirim) */
    render(ctx) {
      if (!this.active) return;
      const U = RC.U;
      for (const b of this.buttons()) {
        if (!b.draw) continue;
        const cx = b.x + b.w / 2;
        const cy = b.y + b.h / 2;
        const on = b.hold && this.held[b.name];
        ctx.fillStyle = on ? 'rgba(74,168,255,0.35)' : 'rgba(10,12,24,0.55)';
        U.circle(ctx, cx, cy, b.w / 2, ctx.fillStyle);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, b.w / 2 - 1, 0, U.TAU);
        ctx.stroke();
        if (b.draw === 'pause') {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(cx - 8, cy - 10, 6, 20);
          ctx.fillRect(cx + 2, cy - 10, 6, 20);
        } else if (b.draw === 'close') {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 3;
          U.line(ctx, cx - 9, cy - 9, cx + 9, cy + 9);
          U.line(ctx, cx + 9, cy - 9, cx - 9, cy + 9);
        } else RC.Draw.icon(ctx, b.draw, cx, cy, b.w * 0.45, 'rgba(255,255,255,0.85)');
      }
      const tr = this.primary !== null && this.touches.get(this.primary);
      if (tr && tr.gest) {
        const rect = this.canvas.getBoundingClientRect();
        const s = RC.Game.scale;
        const px = (tr.x - rect.left) / s;
        const py = (tr.y - rect.top) / s;
        const ax = (tr.ax - rect.left) / s;
        const ay = (tr.ay - rect.top) / s;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 3;
        U.line(ctx, ax, ay, px, py);
        U.circle(ctx, px, py, 16, 'rgba(255,255,255,0.12)');
      }
    },
  };

  RC.Touch = Touch;
  /** Klavye ya da dokunmatik ipucu metni: RC.T('SPACE: geç', 'Dokun: geç') */
  RC.T = (kb, touch) => (Touch.active ? touch : kb);
})(window.RC);
