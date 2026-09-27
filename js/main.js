/* =========================================================================
 *  RED CRIME - Oyun döngüsü ve sahne yöneticisi
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;

  const Game = {
    canvas: null,
    ctx: null,
    W: 1280,
    H: 720,
    scale: 1,
    dpr: 1,
    time: 0,
    fps: 60,
    current: null,
    currentName: '',
    fade: { a: 1, dir: -1, next: null, params: null, speed: 3 },
    frames: 0,
    fpsT: 0,
    last: 0,
    timers: [],
    renderErrors: 0,

    init() {
      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext('2d');
      RC.Save.load();
      RC.Input.init(this.canvas);
      this.resize();
      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.currentName === 'heist' && RC.Scenes.heist.state === 'play') RC.Scenes.heist.openPause();
      });
      const start = () => {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hide');
        // Geliştirici kısayolu: ?scene=heist&level=2
        const q = new URLSearchParams(location.search);
        if (q.get('scene') && RC.Scenes[q.get('scene')]) {
          this.fade.a = 0;
          this.fade.dir = 0;
          this.switchTo(q.get('scene'), { level: Number(q.get('level') || 0) });
          const skip = Number(q.get('t') || 0);
          for (let i = 0; i < skip * 60; i++) this.current.update(1 / 60);
        } else {
          // İlk açılış: önce dil sorulur, seçilen dil kaydedilir
          this.switchTo(RC.Save.settings.langChosen ? 'splash' : 'language', {});
        }
        this.last = performance.now();
        requestAnimationFrame((ts) => this.loop(ts));
      };
      // Yazı tiplerini bekle (en fazla 2 sn)
      const fontsReady = document.fonts && document.fonts.load
        ? Promise.all([document.fonts.load('40px "Bungee"'), document.fonts.load('16px "Rubik"'), document.fonts.load('bold 16px "Rubik"')])
        : Promise.resolve();
      Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2000))]).then(start, start);
    },

    resize() {
      const css = getComputedStyle(document.documentElement);
      const inset = (k) => parseFloat(css.getPropertyValue(k)) || 0;
      const sl = inset('--sal');
      const st = inset('--sat');
      const cw = window.innerWidth - sl - inset('--sar');
      const ch = window.innerHeight - st - inset('--sab');
      this.canvas.style.left = sl + 'px';
      this.canvas.style.top = st + 'px';
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(cw * this.dpr);
      this.canvas.height = Math.floor(ch * this.dpr);
      this.canvas.style.width = cw + 'px';
      this.canvas.style.height = ch + 'px';
      // Mantıksal çözünürlük: yükseklik 720 (dar ekranlarda genişlik en az 960)
      let scale = ch / C.VIEW_H;
      if (cw / scale < C.MIN_VIEW_W) scale = cw / C.MIN_VIEW_W;
      this.scale = scale;
      this.W = cw / scale;
      this.H = ch / scale;
      if (this.current && this.current.onResize) this.current.onResize();
      const h = RC.Scenes.heist;
      if (h && h.lighting) h.lighting.resize(this.W, this.H, RC.Save.settings.quality);
    },

    /** Sahne geçişi (kararma ile) */
    go(name, params = {}, keepCurrent = false) {
      if (this.fade.next) return;
      this.fade.next = name;
      this.fade.params = params;
      this.fade.keep = keepCurrent;
      this.fade.dir = 1;
    },

    switchTo(name, params) {
      const sc = RC.Scenes[name];
      if (!sc) {
        console.error('Sahne yok:', name);
        return;
      }
      const prev = this.current;
      if (prev && !this.fade.keep) {
        // Eski sahnenin zamanlayıcıları ve kaynakları: yeni sahne girmeden önce temizlenir
        this.clearTimers(prev);
        if (prev.exit) {
          try {
            prev.exit();
          } catch (e) {
            console.error('Sahne çıkışı başarısız:', this.currentName, e);
          }
        }
      }
      this.fade.keep = false;
      this.current = sc;
      this.currentName = name;
      RC.Input.consumeAll();
      try {
        sc.enter(params || {});
      } catch (e) {
        // Yarım kurulmuş bir sahne her karede hata fırlatır; menüye güvenli dönüş
        console.error('Sahne girişi başarısız:', name, e);
        this.clearTimers(sc);
        if (sc.exit) {
          try {
            sc.exit();
          } catch (e2) {
            /* zaten bozuk */
          }
        }
        if (name !== 'menu' && RC.Scenes.menu) this.switchTo('menu', {});
      }
    },

    /**
     * Sahneye bağlı zamanlayıcı (setTimeout yerine). owner=null: sahneden bağımsız.
     * Oyun zamanıyla ilerler, sahne duraklatılınca bekler ve sahneden
     * çıkılınca iptal edilir; böylece geri çağrım yok edilmiş dünyaya dokunamaz.
     */
    later(sec, fn, owner = this.current) {
      const tm = { t: sec, fn, owner };
      this.timers.push(tm);
      return tm;
    },

    clearTimers(owner) {
      if (!owner) this.timers.length = 0;
      else this.timers = this.timers.filter((tm) => tm.owner !== owner);
    },

    tickTimers(dt) {
      const sc = this.current;
      if (!this.timers.length) return;
      const paused = sc && sc.state === 'paused';
      const due = [];
      for (const tm of this.timers) {
        // owner === null: sahneden bağımsız (ör. geçiş hızı), her zaman işler
        if (tm.owner !== null && (tm.owner !== sc || paused)) continue;
        tm.t -= dt;
        if (tm.t <= 0) due.push(tm);
      }
      if (!due.length) return;
      this.timers = this.timers.filter((tm) => !due.includes(tm));
      for (const tm of due) {
        try {
          tm.fn();
        } catch (e) {
          console.error(e);
        }
      }
    },

    loop(ts) {
      let dt = (ts - this.last) / 1000;
      this.last = ts;
      if (!(dt > 0)) dt = 1 / 60;
      dt = Math.min(dt, 1 / 20);
      this.time += dt;

      // FPS
      this.frames++;
      this.fpsT += dt;
      if (this.fpsT >= 0.5) {
        this.fps = Math.round(this.frames / this.fpsT);
        this.frames = 0;
        this.fpsT = 0;
      }

      // Geçiş
      const f = this.fade;
      if (f.dir !== 0) {
        f.a += f.dir * dt * f.speed;
        if (f.dir > 0 && f.a >= 1) {
          f.a = 1;
          const n = f.next;
          f.next = null;
          this.switchTo(n, f.params);
          f.dir = -1;
        } else if (f.dir < 0 && f.a <= 0) {
          f.a = 0;
          f.dir = 0;
        }
      }

      try {
        if (this.current && !(f.dir > 0 && f.a > 0.98)) {
          RC.Touch.update();
          this.current.update(dt);
          this.tickTimers(dt);
        }
      } catch (e) {
        console.error(e);
      }

      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#05060f';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
      try {
        if (this.current) this.current.render(ctx);
      } catch (e) {
        // Yarıda kalan çizim save() yığınını dengesiz bırakır: bağlamı sıfırla
        if (this.renderErrors++ < 5) console.error(e);
        if (ctx.reset) ctx.reset();
        else this.canvas.width = this.canvas.width;
      }
      ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0);
      try {
        RC.Touch.render(ctx);
      } catch (e) {
        /* yalnızca görsel geri bildirim */
      }
      if (f.a > 0) {
        ctx.fillStyle = `rgba(5,6,15,${U.ease.inOutQuad(U.clamp01(f.a))})`;
        ctx.fillRect(0, 0, this.W, this.H);
      }
      RC.Input.endFrame();
      requestAnimationFrame((t2) => this.loop(t2));
    },

    toggleFullscreen() {
      if (window.RCDesktop) return window.RCDesktop.toggleFullscreen();
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      } catch (e) {
        /* desteklenmiyor */
      }
    },
  };

  RC.Game = Game;
  window.addEventListener('load', () => Game.init());
})(window.RC);
