/* =========================================================================
 *  RED CRIME - Kamera
 *  Yumuşak takip, ileriye bakma, sınırlar, sarsıntı ve yakınlaştırma.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  class Camera {
    constructor() {
      this.x = 0; // merkez
      this.y = 0;
      this.zoom = 1;
      this.targetZoom = 1;
      this.bounds = null; // {x, y, w, h}
      this.trauma = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      this.lookAhead = 0;
      this.viewW = 1280;
      this.viewH = 720;
      this.time = 0;
      this.followSpeed = 5;
      this.dynZoom = 1; // oynanışa göre ince zoom (koşu, saklanma, tehlike)
      this.aimX = 0; // nişan yönüne kayma
      this.aimY = 0;
      this.sway = 0; // el kamerası salınımı (0..1)
    }

    setView(w, h) {
      this.viewW = w;
      this.viewH = h;
    }

    snapTo(x, y) {
      this.x = x;
      this.y = y;
    }

    /** Ani yakınlaşma vuruşu (önemli anlarda); zoom kendiliğinden geri döner */
    punch(amount) {
      if (RC.Save && !RC.Save.settings.shake) return;
      this.zoom *= 1 + amount;
    }

    shake(amount) {
      if (RC.Save && !RC.Save.settings.shake) return;
      this.trauma = Math.min(1, this.trauma + amount);
    }

    follow(tx, ty, dt, vx = 0, aim = null) {
      this.lookAhead = U.damp(this.lookAhead, U.clamp(vx * 0.35, -140, 140), 2.5, dt);
      // Nişan alınan yöne (el feneri) hafifçe kay
      this.aimX = U.damp(this.aimX, aim ? Math.cos(aim) * 60 : 0, 3, dt);
      this.aimY = U.damp(this.aimY, aim ? Math.sin(aim) * 40 : 0, 3, dt);
      this.x = U.damp(this.x, tx + this.lookAhead + this.aimX, this.followSpeed, dt);
      this.y = U.damp(this.y, ty + this.aimY, this.followSpeed * 0.9, dt);
    }

    update(dt) {
      this.time += dt;
      this.zoom = U.damp(this.zoom, this.targetZoom * this.dynZoom, 4, dt);
      if (this.bounds) {
        const hw = this.viewW / 2 / this.zoom;
        const hh = this.viewH / 2 / this.zoom;
        const b = this.bounds;
        if (b.w < hw * 2) this.x = b.x + b.w / 2;
        else this.x = U.clamp(this.x, b.x + hw, b.x + b.w - hw);
        if (b.h < hh * 2) this.y = b.y + b.h / 2;
        else this.y = U.clamp(this.y, b.y + hh, b.y + b.h - hh);
      }
      this.trauma = Math.max(0, this.trauma - dt * 1.4);
      const s = this.trauma * this.trauma;
      const t = this.time * 40;
      this.shakeX = (U.noise1(t) - 0.5) * 2 * 22 * s;
      this.shakeY = (U.noise1(t + 100) - 0.5) * 2 * 22 * s;
      // El kamerası: yavaş, düşük genlikli salınım (sabit tripod hissini kırar)
      if (this.sway > 0 && !(RC.Save && !RC.Save.settings.shake)) {
        const st = this.time * 0.35;
        this.shakeX += (U.noise1(st + 300) - 0.5) * 2 * 5 * this.sway;
        this.shakeY += (U.noise1(st + 700) - 0.5) * 2 * 3.5 * this.sway;
      }
    }

    /** ctx'e kamera dönüşümünü uygular (çağıran save/restore yapmalı) */
    apply(ctx) {
      ctx.translate(this.viewW / 2, this.viewH / 2);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-Math.round((this.x + this.shakeX) * 100) / 100, -Math.round((this.y + this.shakeY) * 100) / 100);
    }

    get view() {
      const hw = this.viewW / 2 / this.zoom;
      const hh = this.viewH / 2 / this.zoom;
      return { x: this.x - hw, y: this.y - hh, w: hw * 2, h: hh * 2 };
    }

    worldToScreen(wx, wy) {
      return {
        x: (wx - this.x - this.shakeX) * this.zoom + this.viewW / 2,
        y: (wy - this.y - this.shakeY) * this.zoom + this.viewH / 2,
      };
    }

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.viewW / 2) / this.zoom + this.x + this.shakeX,
        y: (sy - this.viewH / 2) / this.zoom + this.y + this.shakeY,
      };
    }

    inView(x, y, w, h, margin = 0) {
      const v = this.view;
      return x + w > v.x - margin && x < v.x + v.w + margin && y + h > v.y - margin && y < v.y + v.h + margin;
    }
  }

  RC.Camera = Camera;
})(window.RC);
