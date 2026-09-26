/* =========================================================================
 *  RED CRIME - Girdi yöneticisi
 *  Klavye + fare. Eylem (action) tabanlı eşleme: sahneler tuş kodları yerine
 *  'left', 'jump', 'grab' gibi eylemleri sorgular.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const BINDINGS = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['KeyW', 'ArrowUp'],
    up: ['KeyW', 'ArrowUp'],
    crouch: ['KeyS', 'ArrowDown'],
    down: ['KeyS', 'ArrowDown'],
    grab: ['Space'],
    interact: ['KeyE'],
    run: ['ShiftLeft', 'ShiftRight'],
    throw: ['KeyQ'],
    flashlight: ['KeyF'],
    pause: ['Escape', 'KeyP'],
    map: ['KeyM', 'Tab'],
    confirm: ['Enter', 'Space', 'NumpadEnter'],
    back: ['Escape', 'Backspace'],
    menuUp: ['KeyW', 'ArrowUp'],
    menuDown: ['KeyS', 'ArrowDown'],
    menuLeft: ['KeyA', 'ArrowLeft'],
    menuRight: ['KeyD', 'ArrowRight'],
    skip: ['Enter', 'Space', 'Escape'],
  };

  /** Ekranda gösterilecek tuş adları */
  const KEY_LABELS = {
    left: 'A',
    right: 'D',
    jump: 'W',
    crouch: 'S',
    grab: 'SPACE',
    interact: 'E',
    run: 'SHIFT',
    throw: 'Q',
    flashlight: 'F',
    pause: 'ESC',
    map: 'M',
  };

  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace']);

  const Input = {
    keys: Object.create(null),
    pressed: Object.create(null),
    released: Object.create(null),
    anyPressed: false,
    lastKey: null,
    bindings: BINDINGS,
    labels: KEY_LABELS,
    mouse: {
      x: 0,
      y: 0,
      down: false,
      pressed: false,
      released: false,
      rightDown: false,
      rightPressed: false,
      wheel: 0,
      lastMove: -999,
      inside: false,
    },
    canvas: null,

    init(canvas) {
      this.canvas = canvas;
      window.addEventListener('keydown', (e) => {
        if (PREVENT.has(e.code)) e.preventDefault();
        RC.Audio && RC.Audio.unlock();
        if (!this.keys[e.code]) {
          this.pressed[e.code] = true;
          this.anyPressed = true;
          this.lastKey = e.code;
        }
        this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
        this.released[e.code] = true;
      });
      window.addEventListener('blur', () => {
        for (const k in this.keys) this.keys[k] = false;
        this.mouse.down = false;
      });

      const toLogical = (e) => {
        const rect = canvas.getBoundingClientRect();
        const s = RC.Game ? RC.Game.scale : 1;
        this.mouse.x = (e.clientX - rect.left) / s;
        this.mouse.y = (e.clientY - rect.top) / s;
      };
      canvas.addEventListener('mousemove', (e) => {
        toLogical(e);
        this.mouse.lastMove = RC.Game ? RC.Game.time : 0;
        this.mouse.inside = true;
      });
      canvas.addEventListener('mouseleave', () => {
        this.mouse.inside = false;
      });
      canvas.addEventListener('mousedown', (e) => {
        toLogical(e);
        RC.Audio && RC.Audio.unlock();
        if (e.button === 0) {
          this.mouse.down = true;
          this.mouse.pressed = true;
          this.anyPressed = true;
        } else if (e.button === 2) {
          this.mouse.rightDown = true;
          this.mouse.rightPressed = true;
        }
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.mouse.down = false;
          this.mouse.released = true;
        } else if (e.button === 2) {
          this.mouse.rightDown = false;
        }
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener(
        'wheel',
        (e) => {
          this.mouse.wheel += Math.sign(e.deltaY);
          e.preventDefault();
        },
        { passive: false }
      );
      // Dokunmatik: basit dokunuş = tık
      canvas.addEventListener(
        'touchstart',
        (e) => {
          const t = e.changedTouches[0];
          toLogical(t);
          RC.Audio && RC.Audio.unlock();
          this.mouse.down = true;
          this.mouse.pressed = true;
          this.anyPressed = true;
          e.preventDefault();
        },
        { passive: false }
      );
      canvas.addEventListener('touchend', () => {
        this.mouse.down = false;
        this.mouse.released = true;
      });
    },

    down(code) {
      return !!this.keys[code];
    },
    wasPressed(code) {
      return !!this.pressed[code];
    },
    act(name) {
      const b = BINDINGS[name];
      if (!b) return false;
      for (let i = 0; i < b.length; i++) if (this.keys[b[i]]) return true;
      return false;
    },
    actPressed(name) {
      const b = BINDINGS[name];
      if (!b) return false;
      for (let i = 0; i < b.length; i++) if (this.pressed[b[i]]) return true;
      return false;
    },
    actReleased(name) {
      const b = BINDINGS[name];
      if (!b) return false;
      for (let i = 0; i < b.length; i++) if (this.released[b[i]]) return true;
      return false;
    },
    /** Eksen değeri: -1, 0, 1 */
    axis(neg, pos) {
      return (this.act(pos) ? 1 : 0) - (this.act(neg) ? 1 : 0);
    },
    mouseRecentlyUsed(sec = 3) {
      return this.mouse.inside && RC.Game && RC.Game.time - this.mouse.lastMove < sec;
    },
    /** Belirli bir bölgede fare tıklandı mı? */
    clickedIn(x, y, w, h) {
      const m = this.mouse;
      return m.pressed && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    },
    hover(x, y, w, h) {
      const m = this.mouse;
      return m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    },
    consume(code) {
      this.pressed[code] = false;
    },
    consumeAction(name) {
      const b = BINDINGS[name];
      if (b) for (const c of b) this.pressed[c] = false;
    },
    consumeAll() {
      for (const k in this.pressed) this.pressed[k] = false;
      this.anyPressed = false;
      this.mouse.pressed = false;
    },
    endFrame() {
      for (const k in this.pressed) this.pressed[k] = false;
      for (const k in this.released) this.released[k] = false;
      this.anyPressed = false;
      this.mouse.pressed = false;
      this.mouse.released = false;
      this.mouse.rightPressed = false;
      this.mouse.wheel = 0;
    },
  };

  RC.Input = Input;
})(window.RC);
