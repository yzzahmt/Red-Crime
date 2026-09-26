/* =========================================================================
 *  RED CRIME - Kamyon çizimi
 *  Köprü altı sahnesi, geçiş sahnesi ve soygun sahnesinde kullanılır.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  /**
   * x,y: sol alt köşe (y = zemin). Kamyonun burnu solda.
   * o: {color, t, doorOpen(0..1), cargo(0..1), wheelRot, headlights, glow, brake, shake}
   */
  function drawTruck(ctx, x, y, o = {}) {
    const W = 340;
    const color = '#1b1c21';
    const t = o.t || 0;
    const shakeY = o.shake ? Math.sin(t * 40) * o.shake : 0;
    ctx.save();
    ctx.translate(x, y + shakeY);

    // Gölge
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    U.ellipse(ctx, W / 2, 0, W * 0.52, 8, 0);

    // Şasi
    ctx.fillStyle = '#1b1c22';
    ctx.fillRect(20, -38, W - 30, 14);

    // Kasa (yük bölümü) — mat siyah, yazısız
    const bx = 96;
    const bw = W - bx;
    const by = -150;
    const bh = 116;
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, '#2a2b31');
    g.addColorStop(0.5, '#17181c');
    g.addColorStop(1, '#0d0e11');
    ctx.fillStyle = g;
    U.fillRoundRect(ctx, bx, by, bw, bh, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 2;
    U.strokeRoundRect(ctx, bx, by, bw, bh, 5);
    // Oluklu sac paneller ve yansımalar
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = bx + 16; i < W - 8; i += 16) U.line(ctx, i, by + 4, i, by + bh - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(bx + 6, by + 6, bw - 12, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(bx + 4, by + bh - 16, bw - 8, 6);
    // Arka kapı
    const door = U.clamp(o.doorOpen || 0, 0, 1);
    if (door > 0) {
      // İç kısım
      ctx.fillStyle = '#15161d';
      ctx.fillRect(W - 8, by + 4, 8, bh - 8);
      // Kapı kanadı
      ctx.save();
      ctx.translate(W, by + 4);
      ctx.scale(U.lerp(1, 0.25, door), 1);
      ctx.fillStyle = '#dcdfe6';
      ctx.fillRect(0, 0, 40, bh - 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(0, 0, 40, bh - 8);
      ctx.fillStyle = '#888';
      ctx.fillRect(6, bh / 2 - 10, 4, 20);
      ctx.restore();
      // Rampa
      ctx.fillStyle = '#6a707c';
      ctx.beginPath();
      ctx.moveTo(W - 4, -34);
      ctx.lineTo(W + 60 * door, 0);
      ctx.lineTo(W + 60 * door, 4);
      ctx.lineTo(W - 4, -28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 5; i++) {
        const k = i / 5;
        U.line(ctx, W - 4 + 64 * door * k, -34 + 34 * k, W - 4 + 64 * door * k, -28 + 32 * k);
      }
    }

    // Yük (kasanın üstündeki yığın göstergesi)
    const cargo = U.clamp(o.cargo || 0, 0, 1);
    if (cargo > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx + 4, by - 70, bw - 8, 70);
      ctx.clip();
      const rng = new U.RNG(99);
      const n = Math.floor(4 + cargo * 26);
      for (let i = 0; i < n; i++) {
        const cx = bx + 14 + rng.float(0, bw - 40);
        const ch = rng.float(10, 26);
        const cw = rng.float(14, 34);
        const cy = by - rng.float(0, 60 * cargo) - ch * 0.4;
        ctx.fillStyle = rng.pick(['#c49a6a', '#8a5a34', '#4aa8ff', '#ffd24a', '#e8283c', '#6a707c', '#3ddc84']);
        U.fillRoundRect(ctx, cx, cy, cw, ch, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.2;
        U.strokeRoundRect(ctx, cx, cy, cw, ch, 3);
      }
      ctx.restore();
      // Branda ipi
      ctx.strokeStyle = '#3a2416';
      ctx.lineWidth = 2;
      U.line(ctx, bx + 10, by, bx + bw / 2, by - 50 * cargo);
      U.line(ctx, bx + bw / 2, by - 50 * cargo, W - 10, by);
    }

    // Kabin
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(100, -30);
    ctx.lineTo(100, -120);
    ctx.lineTo(40, -120);
    ctx.quadraticCurveTo(22, -118, 16, -96);
    ctx.lineTo(6, -64);
    ctx.lineTo(4, -34);
    ctx.quadraticCurveTo(4, -28, 12, -28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Cam
    const glass = ctx.createLinearGradient(20, -114, 90, -70);
    glass.addColorStop(0, '#bfe3ff');
    glass.addColorStop(1, '#4a6a8a');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(92, -112);
    ctx.lineTo(44, -112);
    ctx.quadraticCurveTo(30, -110, 25, -94);
    ctx.lineTo(18, -72);
    ctx.lineTo(92, -72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    U.poly(ctx, [40, -110, 54, -110, 34, -74, 22, -74]);
    // Şoför (Reis'in adamı) silüeti
    if (o.driver !== false) {
      U.circle(ctx, 66, -86, 11, 'rgba(20,20,30,0.85)');
      ctx.fillStyle = 'rgba(20,20,30,0.7)';
      ctx.fillRect(56, -98, 20, 5);
    }
    // Kapı çizgileri
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(46, -70, 50, 38);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(84, -62, 9, 3);
    // Ayna
    ctx.fillStyle = '#1b1c22';
    ctx.fillRect(10, -100, 6, 16);
    // Tampon ve far
    ctx.fillStyle = '#9aa0aa';
    U.fillRoundRect(ctx, 0, -38, 30, 10, 3);
    const hl = o.headlights ? '#fff6c8' : '#e8e0b0';
    U.fillRoundRect(ctx, 2, -60, 10, 12, 3, hl);
    if (o.headlights) {
      const lg = ctx.createRadialGradient(4, -54, 2, 4, -54, 30);
      lg.addColorStop(0, 'rgba(255,245,200,0.9)');
      lg.addColorStop(1, 'rgba(255,245,200,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(-26, -84, 60, 60);
    }
    // Stop lambası
    U.fillRoundRect(ctx, W - 6, -54, 6, 14, 2, o.brake ? '#ff2a3b' : '#8a1b2a');
    if (o.brake) {
      const bg = ctx.createRadialGradient(W, -47, 1, W, -47, 30);
      bg.addColorStop(0, 'rgba(255,40,60,0.6)');
      bg.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(W - 30, -77, 60, 60);
    }

    // Tekerlekler
    const rot = o.wheelRot || 0;
    for (const wx of [64, 250, 292]) wheel(ctx, wx, -18, 20, rot);
    // Çamurluk
    ctx.fillStyle = '#1b1c22';
    ctx.beginPath();
    ctx.arc(64, -18, 25, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(271, -18, 25, Math.PI, 0);
    ctx.rect(246, -43, 50, 8);
    ctx.fill();
    for (const wx of [64, 250, 292]) wheel(ctx, wx, -18, 20, rot);

    // Egzoz
    ctx.fillStyle = '#555';
    ctx.fillRect(W - 40, -30, 16, 5);

    // Işınlanma parıltısı
    if (o.glow) {
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(W / 2, -80, 10, W / 2, -80, 260);
      gg.addColorStop(0, `rgba(120,200,255,${0.6 * o.glow})`);
      gg.addColorStop(1, 'rgba(120,200,255,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(-100, -340, W + 200, 400);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function wheel(ctx, x, y, r, rot) {
    U.circle(ctx, x, y, r, '#15151a');
    U.circle(ctx, x, y, r * 0.55, '#8a909c');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#4a505c';
    for (let i = 0; i < 5; i++) {
      ctx.rotate(U.TAU / 5);
      ctx.fillRect(-1.5, 2, 3, r * 0.4);
    }
    ctx.restore();
    U.circle(ctx, x, y, r * 0.15, '#d9dde4');
  }

  RC.drawTruck = drawTruck;
})(window.RC);
