/* =========================================================================
 *  RED CRIME - Eşya kataloğu ve eşya çizimleri
 *  Her eşya: isim, boyut, değer aralığı, ağırlık, kırılganlık, malzeme,
 *  yerleşim (raf / masa / yer / duvar / bahçe) ve hangi odalarda çıktığı.
 *  Çizimler vektörel olup önbelleğe alınmış sprite'lara dönüştürülür.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  /* ---------------------------------------------------------------------
   * Çizim yardımcıları
   * ------------------------------------------------------------------- */
  const OUT = 'rgba(0,0,0,0.55)';
  function box(ctx, x, y, w, h, fill, r = 2) {
    ctx.beginPath();
    U.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  function oval(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, U.TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  function shine(ctx, x, y, w, h, a = 0.3) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, w, h);
  }
  function pathFill(ctx, fill, stroke = true) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = OUT;
      ctx.stroke();
    }
  }
  function gem(ctx, cx, cy, r, color) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.9, cy - r * 0.2);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r * 0.9, cy - r * 0.2);
    ctx.closePath();
    pathFill(ctx, color);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r * 0.4, cy - r * 0.2);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - r * 0.4, cy - r * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------------------------------------------------------------------
   * Çizim fonksiyonları: (ctx, w, h, c) — c: renk paleti [ana, ikincil, vurgu]
   * Kutunun altı zemine oturur.
   * ------------------------------------------------------------------- */
  const DRAW = {
    ring(ctx, w, h, c) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = c[0];
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.65, w * 0.32, h * 0.3, 0, 0, U.TAU);
      ctx.stroke();
      gem(ctx, w / 2, h * 0.28, h * 0.24, c[1]);
    },
    necklace(ctx, w, h, c) {
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.35, w * 0.42, h * 0.32, 0, 0, Math.PI);
      ctx.stroke();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI;
        U.circle(ctx, w / 2 + Math.cos(a) * w * 0.42, h * 0.35 + Math.sin(a) * h * 0.32, 1.8, c[2] || '#fff');
      }
      gem(ctx, w / 2, h * 0.78, h * 0.18, c[1]);
    },
    watch(ctx, w, h, c) {
      box(ctx, w * 0.3, 0, w * 0.4, h, c[1], 2);
      oval(ctx, w / 2, h / 2, w * 0.36, h * 0.3, c[0]);
      oval(ctx, w / 2, h / 2, w * 0.27, h * 0.22, '#f5f3ea');
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      U.line(ctx, w / 2, h / 2, w / 2, h * 0.34);
      U.line(ctx, w / 2, h / 2, w * 0.62, h / 2);
    },
    earrings(ctx, w, h, c) {
      for (const x of [w * 0.28, w * 0.72]) {
        ctx.strokeStyle = c[0];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, h * 0.2, h * 0.14, 0, U.TAU);
        ctx.stroke();
        gem(ctx, x, h * 0.62, h * 0.26, c[1]);
      }
    },
    bracelet(ctx, w, h, c) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = c[0];
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.36, 0, 0, U.TAU);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU;
        U.circle(ctx, w / 2 + Math.cos(a) * w * 0.4, h / 2 + Math.sin(a) * h * 0.36, 1.8, c[1]);
      }
    },
    goldbar(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.15, 0);
      ctx.lineTo(w * 0.85, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      shine(ctx, w * 0.2, h * 0.15, w * 0.6, h * 0.15, 0.5);
      ctx.fillStyle = U.shade(c[0], -0.35);
      ctx.font = `bold ${Math.round(h * 0.4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('999', w / 2, h * 0.8);
    },
    coinbag(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.35, h * 0.25);
      ctx.quadraticCurveTo(0, h * 0.5, w * 0.12, h);
      ctx.lineTo(w * 0.88, h);
      ctx.quadraticCurveTo(w, h * 0.5, w * 0.65, h * 0.25);
      ctx.closePath();
      pathFill(ctx, c[0]);
      box(ctx, w * 0.3, h * 0.12, w * 0.4, h * 0.14, U.shade(c[0], -0.3), 2);
      ctx.fillStyle = c[1];
      ctx.font = `bold ${Math.round(h * 0.38)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('$', w / 2, h * 0.82);
    },
    coins(ctx, w, h, c) {
      const n = 4;
      for (let i = 0; i < n; i++) {
        oval(ctx, w / 2 + (i % 2) * 2 - 1, h - 3 - i * (h / (n + 1)), w * 0.45, h * 0.14, i % 2 ? c[0] : U.shade(c[0], -0.1));
      }
    },
    wallet(ctx, w, h, c) {
      box(ctx, 0, h * 0.1, w, h * 0.9, c[0], 3);
      box(ctx, w * 0.55, h * 0.35, w * 0.45, h * 0.35, U.shade(c[0], -0.2), 2);
      U.circle(ctx, w * 0.75, h * 0.52, 2, c[1]);
      ctx.fillStyle = '#6fbf73';
      ctx.fillRect(w * 0.1, 0, w * 0.5, h * 0.18);
    },
    phone(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 3);
      ctx.fillStyle = '#0d1b2e';
      ctx.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.78);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, c[1]);
      g.addColorStop(1, c[2]);
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.78);
      ctx.globalAlpha = 1;
      U.circle(ctx, w / 2, h * 0.94, 1, '#000');
    },
    earbuds(ctx, w, h, c) {
      box(ctx, 0, h * 0.2, w, h * 0.8, c[0], h * 0.35);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(1, h * 0.45, w - 2, 1.5);
      U.circle(ctx, w / 2, h * 0.7, 1.5, '#3ddc84');
    },
    perfume(ctx, w, h, c) {
      box(ctx, w * 0.35, 0, w * 0.3, h * 0.25, c[1], 2);
      box(ctx, 0, h * 0.25, w, h * 0.75, U.rgba(c[0], 0.85), 4);
      shine(ctx, w * 0.15, h * 0.35, w * 0.12, h * 0.5, 0.45);
      box(ctx, w * 0.25, h * 0.5, w * 0.5, h * 0.25, '#f5ecd5', 1);
    },
    makeup(ctx, w, h, c) {
      box(ctx, 0, h * 0.35, w, h * 0.65, c[0], 3);
      for (let i = 0; i < 4; i++) oval(ctx, w * (0.17 + i * 0.22), h * 0.6, w * 0.08, h * 0.12, [c[1], c[2], '#e8a0b4', '#9b6b4e'][i]);
      box(ctx, w * 0.75, 0, w * 0.12, h * 0.4, '#c23a55', 1);
    },
    glasses(ctx, w, h, c) {
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2;
      oval(ctx, w * 0.26, h * 0.55, w * 0.2, h * 0.35, U.rgba(c[1], 0.6));
      oval(ctx, w * 0.74, h * 0.55, w * 0.2, h * 0.35, U.rgba(c[1], 0.6));
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2;
      U.line(ctx, w * 0.44, h * 0.45, w * 0.56, h * 0.45);
    },
    pen(ctx, w, h, c) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.3);
      box(ctx, -w * 0.45, -2.5, w * 0.8, 5, c[0], 2);
      ctx.fillStyle = c[1];
      ctx.fillRect(-w * 0.1, -2.5, w * 0.08, 5);
      ctx.beginPath();
      ctx.moveTo(w * 0.35, -2.5);
      ctx.lineTo(w * 0.48, 0);
      ctx.lineTo(w * 0.35, 2.5);
      pathFill(ctx, c[1]);
      ctx.restore();
    },
    lighter(ctx, w, h, c) {
      box(ctx, 0, h * 0.3, w, h * 0.7, c[0], 2);
      box(ctx, w * 0.1, 0, w * 0.8, h * 0.32, '#c9c9c9', 1);
      shine(ctx, w * 0.15, h * 0.4, w * 0.15, h * 0.5, 0.4);
    },
    medal(ctx, w, h, c) {
      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0);
      ctx.lineTo(w * 0.45, h * 0.5);
      ctx.lineTo(w * 0.55, h * 0.5);
      ctx.lineTo(w * 0.75, 0);
      ctx.closePath();
      ctx.fill();
      oval(ctx, w / 2, h * 0.7, w * 0.3, h * 0.28, c[0]);
      U.star(ctx, w / 2, h * 0.7, h * 0.16, h * 0.07, 5);
      ctx.fillStyle = U.shade(c[0], -0.3);
      ctx.fill();
    },
    stamps(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, '#efe6cf', 2);
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          box(ctx, 3 + i * (w / 2 - 1), 3 + j * (h / 2 - 1), w / 2 - 5, h / 2 - 5, [c[0], c[1], c[2], '#7a5ab8'][i * 2 + j], 0);
        }
      }
    },
    gem(ctx, w, h, c) {
      gem(ctx, w / 2, h / 2, Math.min(w, h) * 0.48, c[0]);
    },
    cash(ctx, w, h, c) {
      for (let i = 0; i < 3; i++) box(ctx, 0, h * 0.2 + i * (h * 0.26), w, h * 0.3, i === 2 ? c[0] : U.shade(c[0], -0.1 * i), 1);
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.4, h * 0.15, w * 0.2, h * 0.85);
      ctx.fillStyle = U.shade(c[0], -0.45);
      ctx.font = `bold ${Math.round(h * 0.35)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(c[2] || '$', w * 0.2, h * 0.92);
    },
    cigarbox(ctx, w, h, c) {
      box(ctx, 0, h * 0.25, w, h * 0.75, c[0], 2);
      box(ctx, -1, h * 0.12, w + 2, h * 0.2, U.shade(c[0], 0.1), 2);
      box(ctx, w * 0.3, h * 0.45, w * 0.4, h * 0.3, c[1], 1);
    },
    cartridge(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 2);
      box(ctx, w * 0.15, h * 0.15, w * 0.7, h * 0.5, c[1], 1);
      ctx.fillStyle = '#d6b14a';
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.15 + i * w * 0.14, h * 0.82, w * 0.08, h * 0.18);
    },
    figurine(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.85, w * 0.8, h * 0.15, '#333', 1);
      oval(ctx, w / 2, h * 0.58, w * 0.3, h * 0.28, c[0]);
      oval(ctx, w / 2, h * 0.22, w * 0.24, h * 0.2, c[1]);
      U.circle(ctx, w * 0.44, h * 0.2, 1.2, '#000');
      U.circle(ctx, w * 0.56, h * 0.2, 1.2, '#000');
    },
    beads(ctx, w, h, c) {
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 1.6 + Math.PI * 0.7;
        U.circle(ctx, w / 2 + Math.cos(a) * w * 0.38, h * 0.45 + Math.sin(a) * h * 0.38, w * 0.08, c[0]);
      }
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.45, h * 0.75, w * 0.1, h * 0.25);
      U.circle(ctx, w / 2, h * 0.95, w * 0.07, c[1]);
    },
    evileye(ctx, w, h) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, '#1c4fd1');
      oval(ctx, w / 2, h / 2, w * 0.33, h * 0.33, '#ffffff');
      oval(ctx, w / 2, h / 2, w * 0.2, h * 0.2, '#58b7ff');
      U.circle(ctx, w / 2, h / 2, w * 0.1, '#0b0b16');
    },
    keyitem(ctx, w, h) {
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w * 0.25, h / 2, h * 0.32, 0, U.TAU);
      ctx.stroke();
      U.line(ctx, w * 0.45, h / 2, w * 0.95, h / 2);
      U.line(ctx, w * 0.8, h / 2, w * 0.8, h * 0.85);
      U.line(ctx, w * 0.92, h / 2, w * 0.92, h * 0.8);
    },

    /* ---------------- Elektronik ---------------- */
    laptop(ctx, w, h, c) {
      box(ctx, w * 0.08, 0, w * 0.84, h * 0.78, c[0], 2);
      ctx.fillStyle = '#12213a';
      ctx.fillRect(w * 0.13, h * 0.08, w * 0.74, h * 0.6);
      ctx.fillStyle = U.rgba(c[1], 0.7);
      ctx.fillRect(w * 0.13, h * 0.08, w * 0.74, h * 0.6);
      box(ctx, 0, h * 0.78, w, h * 0.22, U.shade(c[0], -0.15), 2);
    },
    tablet(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 3);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, c[1]);
      g.addColorStop(1, '#10162e');
      ctx.fillStyle = g;
      ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
    },
    console(ctx, w, h, c) {
      box(ctx, 0, h * 0.25, w, h * 0.75, c[0], 4);
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.08, h * 0.55, w * 0.84, 2);
      U.circle(ctx, w * 0.85, h * 0.4, 2, '#3ddc84');
      box(ctx, w * 0.1, 0, w * 0.35, h * 0.3, c[0], 3);
    },
    gamepad(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.1);
      ctx.lineTo(w * 0.8, h * 0.1);
      ctx.quadraticCurveTo(w, h * 0.2, w, h * 0.8);
      ctx.quadraticCurveTo(w * 0.85, h, w * 0.7, h * 0.7);
      ctx.lineTo(w * 0.3, h * 0.7);
      ctx.quadraticCurveTo(w * 0.15, h, 0, h * 0.8);
      ctx.quadraticCurveTo(0, h * 0.2, w * 0.2, h * 0.1);
      pathFill(ctx, c[0]);
      ctx.fillStyle = '#222';
      ctx.fillRect(w * 0.18, h * 0.38, w * 0.16, h * 0.08);
      ctx.fillRect(w * 0.22, h * 0.28, w * 0.08, h * 0.28);
      U.circle(ctx, w * 0.72, h * 0.32, 2, '#e8283c');
      U.circle(ctx, w * 0.8, h * 0.44, 2, '#3ddc84');
      U.circle(ctx, w * 0.64, h * 0.44, 2, '#4aa8ff');
    },
    camera(ctx, w, h, c) {
      box(ctx, 0, h * 0.25, w, h * 0.75, c[0], 3);
      box(ctx, w * 0.15, h * 0.08, w * 0.25, h * 0.2, c[0], 2);
      oval(ctx, w * 0.55, h * 0.62, w * 0.25, h * 0.28, '#222');
      oval(ctx, w * 0.55, h * 0.62, w * 0.15, h * 0.17, U.rgba(c[1], 0.9));
      shine(ctx, w * 0.5, h * 0.5, 2, 3, 0.8);
      U.circle(ctx, w * 0.85, h * 0.36, 2, '#e8283c');
    },
    drone(ctx, w, h, c) {
      box(ctx, w * 0.3, h * 0.45, w * 0.4, h * 0.35, c[0], 3);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2;
      U.line(ctx, w * 0.1, h * 0.35, w * 0.9, h * 0.35);
      for (const x of [w * 0.1, w * 0.9]) {
        ctx.fillStyle = 'rgba(200,200,200,0.7)';
        U.ellipse(ctx, x, h * 0.25, w * 0.12, h * 0.05, 0);
        box(ctx, x - 2, h * 0.25, 4, h * 0.15, '#222', 1);
      }
      U.circle(ctx, w / 2, h * 0.7, 2, '#4aa8ff');
    },
    speaker(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 3);
      oval(ctx, w / 2, h * 0.3, w * 0.25, w * 0.25, '#1a1a1a');
      oval(ctx, w / 2, h * 0.7, w * 0.35, w * 0.35, '#1a1a1a');
      U.circle(ctx, w / 2, h * 0.7, w * 0.12, c[1]);
    },
    radio(ctx, w, h, c) {
      box(ctx, 0, h * 0.2, w, h * 0.8, c[0], 4);
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1.5;
      U.line(ctx, w * 0.8, h * 0.2, w * 0.95, 0);
      box(ctx, w * 0.08, h * 0.35, w * 0.45, h * 0.5, '#3a3024', 2);
      ctx.fillStyle = '#6b5a44';
      for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.1, h * (0.42 + i * 0.1), w * 0.41, 1.5);
      U.circle(ctx, w * 0.72, h * 0.5, w * 0.08, c[1]);
      U.circle(ctx, w * 0.72, h * 0.75, w * 0.06, c[1]);
    },
    turntable(ctx, w, h, c) {
      box(ctx, 0, h * 0.35, w, h * 0.65, c[0], 3);
      oval(ctx, w * 0.4, h * 0.35, w * 0.32, h * 0.12, '#111');
      oval(ctx, w * 0.4, h * 0.35, w * 0.08, h * 0.04, '#c23a2b');
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2;
      U.line(ctx, w * 0.85, h * 0.4, w * 0.62, h * 0.3);
    },
    record(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 1);
      oval(ctx, w * 0.55, h / 2, w * 0.32, h * 0.32, '#141414');
      oval(ctx, w * 0.55, h / 2, w * 0.1, h * 0.1, c[1]);
    },
    tv(ctx, w, h, c) {
      box(ctx, 0, 0, w, h * 0.86, c[0], 3);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#1b2440');
      g.addColorStop(1, '#070a14');
      ctx.fillStyle = g;
      ctx.fillRect(w * 0.05, h * 0.07, w * 0.9, h * 0.72);
      shine(ctx, w * 0.1, h * 0.1, w * 0.3, h * 0.05, 0.12);
      box(ctx, w * 0.4, h * 0.86, w * 0.2, h * 0.14, c[0], 1);
    },
    monitor(ctx, w, h, c) {
      box(ctx, 0, 0, w, h * 0.72, c[0], 2);
      ctx.fillStyle = U.rgba(c[1], 0.6);
      ctx.fillRect(w * 0.06, h * 0.07, w * 0.88, h * 0.56);
      box(ctx, w * 0.45, h * 0.72, w * 0.1, h * 0.18, c[0], 0);
      box(ctx, w * 0.3, h * 0.9, w * 0.4, h * 0.1, c[0], 2);
    },
    pctower(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 3);
      ctx.fillStyle = U.rgba(c[1], 0.8);
      ctx.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.5);
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = c[2];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(w / 2, h * (0.22 + i * 0.15), w * 0.14, 0, U.TAU);
        ctx.stroke();
      }
      U.circle(ctx, w / 2, h * 0.85, 2.5, '#4aa8ff');
    },
    keyboard(ctx, w, h, c) {
      box(ctx, 0, h * 0.3, w, h * 0.7, c[0], 2);
      ctx.fillStyle = c[1];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 10; i++) ctx.fillRect(3 + i * ((w - 6) / 10), h * 0.38 + r * h * 0.18, (w - 6) / 10 - 1.5, h * 0.13);
    },
    microwave(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 3);
      box(ctx, w * 0.06, h * 0.12, w * 0.62, h * 0.76, '#1a1f26', 2);
      ctx.fillStyle = 'rgba(255,200,100,0.12)';
      ctx.fillRect(w * 0.1, h * 0.18, w * 0.54, h * 0.64);
      for (let i = 0; i < 4; i++) U.circle(ctx, w * 0.84, h * (0.25 + i * 0.16), 2.5, '#555');
    },
    toaster(ctx, w, h, c) {
      box(ctx, 0, h * 0.2, w, h * 0.8, c[0], 6);
      ctx.fillStyle = '#222';
      ctx.fillRect(w * 0.2, h * 0.2, w * 0.2, 3);
      ctx.fillRect(w * 0.6, h * 0.2, w * 0.2, 3);
      ctx.fillStyle = '#d9a35a';
      ctx.fillRect(w * 0.22, h * 0.05, w * 0.16, h * 0.16);
      shine(ctx, w * 0.1, h * 0.35, w * 0.08, h * 0.45, 0.35);
    },
    coffee(ctx, w, h, c) {
      box(ctx, 0, 0, w, h * 0.25, c[0], 3);
      box(ctx, 0, 0, w * 0.35, h, c[0], 3);
      box(ctx, 0, h * 0.85, w, h * 0.15, c[0], 2);
      oval(ctx, w * 0.65, h * 0.68, w * 0.18, h * 0.16, U.rgba('#c9e3ff', 0.6));
      U.circle(ctx, w * 0.17, h * 0.4, 2.5, '#e8283c');
    },
    blender(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.72, w * 0.8, h * 0.28, c[0], 3);
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.08);
      ctx.lineTo(w * 0.85, h * 0.08);
      ctx.lineTo(w * 0.72, h * 0.72);
      ctx.lineTo(w * 0.28, h * 0.72);
      ctx.closePath();
      pathFill(ctx, U.rgba('#cfe8ff', 0.5));
      box(ctx, w * 0.12, 0, w * 0.76, h * 0.1, '#333', 2);
      ctx.fillStyle = c[1];
      ctx.globalAlpha = 0.7;
      ctx.fillRect(w * 0.3, h * 0.45, w * 0.4, h * 0.26);
      ctx.globalAlpha = 1;
    },
    hairdryer(ctx, w, h, c) {
      box(ctx, 0, 0, w * 0.75, h * 0.45, c[0], h * 0.2);
      box(ctx, w * 0.6, h * 0.05, w * 0.4, h * 0.35, U.shade(c[0], -0.2), 3);
      box(ctx, w * 0.2, h * 0.4, w * 0.2, h * 0.6, c[0], 3);
    },
    vr(ctx, w, h, c) {
      box(ctx, 0, h * 0.2, w, h * 0.7, c[0], h * 0.25);
      box(ctx, w * 0.1, h * 0.3, w * 0.8, h * 0.45, '#111', h * 0.15);
      shine(ctx, w * 0.15, h * 0.35, w * 0.3, h * 0.08, 0.2);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 3;
      U.line(ctx, 0, h * 0.45, -2, h * 0.1);
    },
    projector(ctx, w, h, c) {
      box(ctx, 0, h * 0.3, w, h * 0.7, c[0], 3);
      oval(ctx, w * 0.25, h * 0.62, w * 0.16, h * 0.24, '#222');
      oval(ctx, w * 0.25, h * 0.62, w * 0.08, h * 0.12, '#4aa8ff');
      ctx.fillStyle = '#555';
      for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.55, h * (0.45 + i * 0.1), w * 0.35, 2);
    },

    /* ---------------- Dekor ---------------- */
    vase(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.35, 0);
      ctx.lineTo(w * 0.65, 0);
      ctx.quadraticCurveTo(w * 0.6, h * 0.15, w * 0.62, h * 0.2);
      ctx.bezierCurveTo(w * 1.05, h * 0.35, w * 1.0, h * 0.85, w * 0.7, h);
      ctx.lineTo(w * 0.3, h);
      ctx.bezierCurveTo(0, h * 0.85, -0.05 * w, h * 0.35, w * 0.38, h * 0.2);
      ctx.quadraticCurveTo(w * 0.4, h * 0.15, w * 0.35, 0);
      ctx.closePath();
      pathFill(ctx, c[0]);
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = c[1];
      ctx.lineWidth = Math.max(2, h * 0.05);
      for (let i = 0; i < 3; i++) U.line(ctx, 0, h * (0.4 + i * 0.16), w, h * (0.4 + i * 0.16));
      ctx.fillStyle = c[2];
      for (let i = 0; i < 4; i++) U.circle(ctx, w * (0.2 + i * 0.2), h * 0.55, h * 0.04);
      ctx.restore();
      shine(ctx, w * 0.25, h * 0.35, w * 0.08, h * 0.4, 0.3);
    },
    potplant(ctx, w, h, c) {
      // Saksı
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.55);
      ctx.lineTo(w * 0.88, h * 0.55);
      ctx.lineTo(w * 0.75, h);
      ctx.lineTo(w * 0.25, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      box(ctx, w * 0.08, h * 0.5, w * 0.84, h * 0.1, U.shade(c[0], 0.1), 1);
      // Yapraklar
      const leaf = c[1];
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.38;
        ctx.save();
        ctx.translate(w / 2, h * 0.52);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(0, -h * 0.22, w * 0.1, h * 0.24, 0, 0, U.TAU);
        pathFill(ctx, U.shade(leaf, (i % 3) * 0.08 - 0.08));
        ctx.restore();
      }
      if (c[2]) {
        U.circle(ctx, w * 0.35, h * 0.12, w * 0.07, c[2]);
        U.circle(ctx, w * 0.62, h * 0.08, w * 0.07, c[2]);
      }
    },
    cactus(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.62);
      ctx.lineTo(w * 0.85, h * 0.62);
      ctx.lineTo(w * 0.75, h);
      ctx.lineTo(w * 0.25, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      box(ctx, w * 0.35, h * 0.05, w * 0.3, h * 0.6, c[1], w * 0.14);
      box(ctx, w * 0.12, h * 0.25, w * 0.18, h * 0.25, c[1], w * 0.08);
      box(ctx, w * 0.7, h * 0.18, w * 0.18, h * 0.22, c[1], w * 0.08);
      U.circle(ctx, w / 2, h * 0.06, w * 0.08, c[2] || '#ff6fae');
    },
    bonsai(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.78, w * 0.8, h * 0.22, c[0], 2);
      ctx.strokeStyle = '#5b3a24';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.8);
      ctx.quadraticCurveTo(w * 0.3, h * 0.55, w * 0.55, h * 0.4);
      ctx.stroke();
      oval(ctx, w * 0.35, h * 0.35, w * 0.22, h * 0.14, c[1]);
      oval(ctx, w * 0.65, h * 0.28, w * 0.25, h * 0.15, U.shade(c[1], 0.1));
      oval(ctx, w * 0.5, h * 0.16, w * 0.2, h * 0.12, U.shade(c[1], -0.1));
    },
    bust(ctx, w, h, c) {
      box(ctx, w * 0.2, h * 0.82, w * 0.6, h * 0.18, U.shade(c[0], -0.2), 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.82);
      ctx.quadraticCurveTo(w * 0.1, h * 0.52, w * 0.5, h * 0.5);
      ctx.quadraticCurveTo(w * 0.9, h * 0.52, w * 0.95, h * 0.82);
      ctx.closePath();
      pathFill(ctx, c[0]);
      oval(ctx, w / 2, h * 0.28, w * 0.24, h * 0.26, c[0]);
      ctx.fillStyle = U.shade(c[0], -0.25);
      U.ellipse(ctx, w * 0.42, h * 0.26, 1.8, 1.2, 0);
      U.ellipse(ctx, w * 0.58, h * 0.26, 1.8, 1.2, 0);
      shine(ctx, w * 0.35, h * 0.1, w * 0.08, h * 0.2, 0.3);
    },
    painting(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 1);
      const pad = Math.min(w, h) * 0.1;
      const ix = pad;
      const iy = pad;
      const iw = w - pad * 2;
      const ih = h - pad * 2;
      const style = c[3] || 'landscape';
      ctx.save();
      ctx.beginPath();
      ctx.rect(ix, iy, iw, ih);
      ctx.clip();
      if (style === 'landscape') {
        const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
        g.addColorStop(0, c[1]);
        g.addColorStop(1, '#f0d9a8');
        ctx.fillStyle = g;
        ctx.fillRect(ix, iy, iw, ih);
        ctx.fillStyle = c[2];
        U.poly(ctx, [ix, iy + ih, ix + iw * 0.3, iy + ih * 0.45, ix + iw * 0.55, iy + ih * 0.75, ix + iw * 0.8, iy + ih * 0.35, ix + iw, iy + ih * 0.7, ix + iw, iy + ih]);
        U.circle(ctx, ix + iw * 0.78, iy + ih * 0.2, ih * 0.1, '#fff2b0');
      } else if (style === 'portrait') {
        ctx.fillStyle = c[1];
        ctx.fillRect(ix, iy, iw, ih);
        oval(ctx, ix + iw / 2, iy + ih * 0.4, iw * 0.2, ih * 0.22, '#e8c19a');
        ctx.fillStyle = c[2];
        U.poly(ctx, [ix + iw * 0.2, iy + ih, ix + iw * 0.3, iy + ih * 0.65, ix + iw * 0.7, iy + ih * 0.65, ix + iw * 0.8, iy + ih]);
        ctx.fillStyle = '#3b2a1e';
        U.ellipse(ctx, ix + iw / 2, iy + ih * 0.24, iw * 0.22, ih * 0.1, 0);
      } else {
        ctx.fillStyle = '#f2efe6';
        ctx.fillRect(ix, iy, iw, ih);
        ctx.fillStyle = c[1];
        ctx.fillRect(ix, iy, iw * 0.45, ih * 0.6);
        ctx.fillStyle = c[2];
        ctx.fillRect(ix + iw * 0.55, iy + ih * 0.4, iw * 0.45, ih * 0.6);
        ctx.fillStyle = '#1b1b1b';
        ctx.fillRect(ix + iw * 0.45, iy, iw * 0.06, ih);
        ctx.fillRect(ix, iy + ih * 0.6, iw, ih * 0.05);
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(ix + iw * 0.1, iy + ih * 0.7, iw * 0.25, ih * 0.25);
      }
      ctx.restore();
      ctx.strokeStyle = U.shade(c[0], 0.3);
      ctx.lineWidth = 1;
      ctx.strokeRect(pad * 0.5, pad * 0.5, w - pad, h - pad);
    },
    clock(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, c[0]);
      oval(ctx, w / 2, h / 2, w * 0.4, h * 0.4, '#f7f3e6');
      ctx.fillStyle = '#222';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * U.TAU;
        U.circle(ctx, w / 2 + Math.cos(a) * w * 0.33, h / 2 + Math.sin(a) * h * 0.33, 1);
      }
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.8;
      U.line(ctx, w / 2, h / 2, w / 2, h * 0.22);
      U.line(ctx, w / 2, h / 2, w * 0.7, h * 0.58);
    },
    deskclock(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.4);
      ctx.quadraticCurveTo(w / 2, -h * 0.15, w, h * 0.4);
      ctx.lineTo(w, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      oval(ctx, w / 2, h * 0.5, w * 0.28, h * 0.25, '#f7f3e6');
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.2;
      U.line(ctx, w / 2, h * 0.5, w / 2, h * 0.32);
      U.line(ctx, w / 2, h * 0.5, w * 0.64, h * 0.52);
    },
    candlestick(ctx, w, h, c) {
      box(ctx, w * 0.2, h * 0.88, w * 0.6, h * 0.12, c[0], 2);
      box(ctx, w * 0.42, h * 0.35, w * 0.16, h * 0.55, c[0], 2);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.3);
      ctx.quadraticCurveTo(w * 0.1, h * 0.55, w * 0.5, h * 0.55);
      ctx.quadraticCurveTo(w * 0.9, h * 0.55, w * 0.9, h * 0.3);
      ctx.stroke();
      for (const x of [w * 0.1, w * 0.5, w * 0.9]) {
        box(ctx, x - 2.5, h * 0.12, 5, h * 0.2, '#f5efe0', 1);
        U.ellipse(ctx, x, h * 0.08, 2, 4, 0, '#ffb347');
      }
    },
    lamp(ctx, w, h, c) {
      box(ctx, w * 0.3, h * 0.9, w * 0.4, h * 0.1, c[0], 2);
      box(ctx, w * 0.46, h * 0.45, w * 0.08, h * 0.47, c[0], 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.25, 0);
      ctx.lineTo(w * 0.75, 0);
      ctx.lineTo(w, h * 0.45);
      ctx.lineTo(0, h * 0.45);
      ctx.closePath();
      pathFill(ctx, c[1]);
      shine(ctx, w * 0.3, h * 0.05, w * 0.1, h * 0.35, 0.25);
    },
    trophy(ctx, w, h, c) {
      box(ctx, w * 0.2, h * 0.82, w * 0.6, h * 0.18, '#4a3222', 1);
      box(ctx, w * 0.42, h * 0.6, w * 0.16, h * 0.22, c[0], 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.15, 0);
      ctx.lineTo(w * 0.85, 0);
      ctx.quadraticCurveTo(w * 0.85, h * 0.6, w * 0.5, h * 0.62);
      ctx.quadraticCurveTo(w * 0.15, h * 0.6, w * 0.15, 0);
      pathFill(ctx, c[0]);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w * 0.12, h * 0.2, w * 0.1, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.88, h * 0.2, w * 0.1, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      shine(ctx, w * 0.3, h * 0.08, w * 0.08, h * 0.35, 0.45);
    },
    teacup(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.9, w * 0.48, h * 0.1, c[0]);
      ctx.beginPath();
      ctx.moveTo(w * 0.12, h * 0.2);
      ctx.lineTo(w * 0.8, h * 0.2);
      ctx.quadraticCurveTo(w * 0.78, h * 0.85, w * 0.46, h * 0.85);
      ctx.quadraticCurveTo(w * 0.14, h * 0.85, w * 0.12, h * 0.2);
      pathFill(ctx, c[0]);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w * 0.84, h * 0.45, h * 0.15, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.15, h * 0.35, w * 0.62, h * 0.08);
    },
    plate(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, c[0]);
      oval(ctx, w / 2, h / 2, w * 0.3, h * 0.3, U.shade(c[0], -0.06));
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.4, 0, 0, U.TAU);
      ctx.stroke();
      ctx.fillStyle = c[2] || c[1];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * U.TAU;
        U.circle(ctx, w / 2 + Math.cos(a) * w * 0.18, h / 2 + Math.sin(a) * h * 0.18, w * 0.05);
      }
    },
    tray(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.6, w * 0.5, h * 0.4, c[0]);
      oval(ctx, w / 2, h * 0.55, w * 0.42, h * 0.3, U.shade(c[0], 0.15));
      shine(ctx, w * 0.2, h * 0.4, w * 0.3, h * 0.08, 0.5);
    },
    glass(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1, 0);
      ctx.lineTo(w * 0.9, 0);
      ctx.quadraticCurveTo(w * 0.9, h * 0.5, w * 0.55, h * 0.55);
      ctx.lineTo(w * 0.55, h * 0.9);
      ctx.lineTo(w * 0.8, h * 0.95);
      ctx.lineTo(w * 0.8, h);
      ctx.lineTo(w * 0.2, h);
      ctx.lineTo(w * 0.2, h * 0.95);
      ctx.lineTo(w * 0.45, h * 0.9);
      ctx.lineTo(w * 0.45, h * 0.55);
      ctx.quadraticCurveTo(w * 0.1, h * 0.5, w * 0.1, 0);
      pathFill(ctx, U.rgba(c[0], 0.55));
      if (c[1]) {
        ctx.fillStyle = U.rgba(c[1], 0.8);
        ctx.beginPath();
        ctx.moveTo(w * 0.14, h * 0.2);
        ctx.lineTo(w * 0.86, h * 0.2);
        ctx.quadraticCurveTo(w * 0.85, h * 0.48, w * 0.5, h * 0.5);
        ctx.quadraticCurveTo(w * 0.15, h * 0.48, w * 0.14, h * 0.2);
        ctx.fill();
      }
      shine(ctx, w * 0.2, h * 0.05, w * 0.1, h * 0.3, 0.6);
    },
    bottle(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.38, 0);
      ctx.lineTo(w * 0.62, 0);
      ctx.lineTo(w * 0.62, h * 0.3);
      ctx.quadraticCurveTo(w * 0.95, h * 0.38, w * 0.95, h * 0.5);
      ctx.lineTo(w * 0.95, h);
      ctx.lineTo(w * 0.05, h);
      ctx.lineTo(w * 0.05, h * 0.5);
      ctx.quadraticCurveTo(w * 0.05, h * 0.38, w * 0.38, h * 0.3);
      ctx.closePath();
      pathFill(ctx, c[0]);
      box(ctx, w * 0.36, 0, w * 0.28, h * 0.08, c[2] || '#b8861a', 1);
      box(ctx, w * 0.12, h * 0.55, w * 0.76, h * 0.3, c[1], 1);
      shine(ctx, w * 0.15, h * 0.45, w * 0.1, h * 0.45, 0.3);
    },
    book(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 1);
      ctx.fillStyle = c[1];
      ctx.fillRect(0, h * 0.12, w, h * 0.06);
      ctx.fillRect(0, h * 0.82, w, h * 0.06);
      ctx.fillRect(w * 0.25, h * 0.35, w * 0.5, h * 0.25);
    },
    bookset(ctx, w, h, c) {
      const n = 5;
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        const bh = h * (0.8 + ((i * 37) % 20) / 100);
        box(ctx, i * bw, h - bh, bw - 0.5, bh, [c[0], c[1], c[2], U.shade(c[0], -0.2), U.shade(c[1], 0.2)][i], 1);
        ctx.fillStyle = '#e8d9a8';
        ctx.fillRect(i * bw + 1, h - bh + bh * 0.2, bw - 2.5, 2);
      }
    },
    rug(ctx, w, h, c) {
      box(ctx, 0, h * 0.1, w, h * 0.9, c[0], h * 0.45);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) U.line(ctx, (w * i) / 5, h * 0.15, (w * i) / 5, h * 0.95);
      oval(ctx, w - h * 0.45, h * 0.55, h * 0.4, h * 0.42, U.shade(c[0], -0.15));
      ctx.strokeStyle = c[2];
      ctx.beginPath();
      ctx.arc(w - h * 0.45, h * 0.55, h * 0.25, 0, U.TAU);
      ctx.stroke();
    },
    guitar(ctx, w, h, c) {
      box(ctx, w * 0.42, 0, w * 0.16, h * 0.08, '#2a1a10', 1);
      box(ctx, w * 0.45, h * 0.06, w * 0.1, h * 0.45, '#5b3a24', 1);
      oval(ctx, w / 2, h * 0.58, w * 0.34, h * 0.14, c[0]);
      oval(ctx, w / 2, h * 0.8, w * 0.46, h * 0.2, c[0]);
      U.circle(ctx, w / 2, h * 0.64, w * 0.1, '#1b120b');
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.3, h * 0.84, w * 0.4, h * 0.03);
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.6;
      for (let i = -1; i <= 1; i++) U.line(ctx, w / 2 + i * 1.5, h * 0.05, w / 2 + i * 1.5, h * 0.85);
    },
    violin(ctx, w, h, c) {
      box(ctx, w * 0.44, 0, w * 0.12, h * 0.4, '#2a1a10', 1);
      oval(ctx, w / 2, h * 0.52, w * 0.36, h * 0.16, c[0]);
      oval(ctx, w / 2, h * 0.8, w * 0.45, h * 0.2, c[0]);
      ctx.fillStyle = '#1b120b';
      ctx.fillRect(w * 0.3, h * 0.62, 2, h * 0.1);
      ctx.fillRect(w * 0.68, h * 0.62, 2, h * 0.1);
    },
    sax(ctx, w, h, c) {
      ctx.strokeStyle = c[0];
      ctx.lineWidth = w * 0.22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.05);
      ctx.lineTo(w * 0.35, h * 0.7);
      ctx.quadraticCurveTo(w * 0.4, h * 0.95, w * 0.65, h * 0.85);
      ctx.lineTo(w * 0.75, h * 0.55);
      ctx.stroke();
      ctx.lineCap = 'butt';
      oval(ctx, w * 0.78, h * 0.5, w * 0.2, h * 0.07, U.shade(c[0], 0.2));
      for (let i = 0; i < 4; i++) U.circle(ctx, w * 0.36, h * (0.25 + i * 0.12), 2, '#e8e8e8');
    },
    trumpet(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.4, w * 0.6, h * 0.18, c[0], 2);
      ctx.beginPath();
      ctx.moveTo(w * 0.68, h * 0.4);
      ctx.lineTo(w, h * 0.1);
      ctx.lineTo(w, h * 0.9);
      ctx.lineTo(w * 0.68, h * 0.58);
      ctx.closePath();
      pathFill(ctx, c[0]);
      for (let i = 0; i < 3; i++) box(ctx, w * (0.3 + i * 0.1), h * 0.15, w * 0.06, h * 0.28, U.shade(c[0], -0.2), 1);
      box(ctx, w * 0.2, h * 0.58, w * 0.4, h * 0.25, 'rgba(0,0,0,0)', 6);
    },
    drum(ctx, w, h, c) {
      box(ctx, 0, h * 0.15, w, h * 0.85, c[0], 3);
      oval(ctx, w / 2, h * 0.15, w / 2, h * 0.14, '#f0ece0');
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) U.line(ctx, (w * (i + 0.5)) / 6, h * 0.2, (w * (i + 0.5)) / 6, h);
      box(ctx, 0, h * 0.88, w, h * 0.12, c[1], 1);
    },
    teddy(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.68, w * 0.36, h * 0.3, c[0]);
      oval(ctx, w / 2, h * 0.3, w * 0.28, h * 0.24, c[0]);
      U.circle(ctx, w * 0.26, h * 0.1, w * 0.1, c[0]);
      U.circle(ctx, w * 0.74, h * 0.1, w * 0.1, c[0]);
      oval(ctx, w / 2, h * 0.36, w * 0.1, h * 0.07, U.shade(c[0], 0.3));
      U.circle(ctx, w * 0.42, h * 0.26, 1.5, '#111');
      U.circle(ctx, w * 0.58, h * 0.26, 1.5, '#111');
      U.circle(ctx, w / 2, h * 0.34, 1.5, '#111');
      ctx.fillStyle = c[1];
      U.poly(ctx, [w * 0.4, h * 0.5, w * 0.5, h * 0.55, w * 0.6, h * 0.5, w * 0.6, h * 0.6, w * 0.5, h * 0.55, w * 0.4, h * 0.6]);
    },
    toycar(ctx, w, h, c) {
      box(ctx, 0, h * 0.4, w, h * 0.4, c[0], 3);
      box(ctx, w * 0.2, h * 0.1, w * 0.55, h * 0.35, c[0], 3);
      ctx.fillStyle = '#bfe3ff';
      ctx.fillRect(w * 0.26, h * 0.16, w * 0.2, h * 0.22);
      ctx.fillRect(w * 0.5, h * 0.16, w * 0.2, h * 0.22);
      U.circle(ctx, w * 0.25, h * 0.82, h * 0.18, '#222');
      U.circle(ctx, w * 0.75, h * 0.82, h * 0.18, '#222');
    },
    bricks(ctx, w, h, c) {
      const cols = [c[0], c[1], c[2], '#ffd24a'];
      let k = 0;
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 2; i++) {
          const bx = i * (w / 2) + (r % 2 ? w * 0.1 : 0);
          box(ctx, Math.min(bx, w / 2), h - (r + 1) * (h / 3), w / 2 - 1, h / 3 - 1, cols[k++ % 4], 1);
        }
      }
    },
    robot(ctx, w, h, c) {
      box(ctx, w * 0.2, h * 0.4, w * 0.6, h * 0.45, c[0], 3);
      box(ctx, w * 0.25, h * 0.08, w * 0.5, h * 0.32, c[0], 3);
      U.circle(ctx, w * 0.4, h * 0.22, 2.5, c[1]);
      U.circle(ctx, w * 0.6, h * 0.22, 2.5, c[1]);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      U.line(ctx, w / 2, h * 0.08, w / 2, 0);
      U.circle(ctx, w / 2, 0, 2, '#e8283c');
      box(ctx, w * 0.25, h * 0.85, w * 0.18, h * 0.15, '#444', 1);
      box(ctx, w * 0.57, h * 0.85, w * 0.18, h * 0.15, '#444', 1);
      box(ctx, 0, h * 0.45, w * 0.18, h * 0.1, '#777', 1);
      box(ctx, w * 0.82, h * 0.45, w * 0.18, h * 0.1, '#777', 1);
    },
    globe(ctx, w, h, c) {
      box(ctx, w * 0.25, h * 0.9, w * 0.5, h * 0.1, '#4a3222', 1);
      box(ctx, w * 0.46, h * 0.72, w * 0.08, h * 0.2, '#b8861a', 0);
      oval(ctx, w / 2, h * 0.4, w * 0.4, h * 0.38, c[0]);
      ctx.fillStyle = c[1];
      U.ellipse(ctx, w * 0.4, h * 0.3, w * 0.12, h * 0.1, 0.4);
      U.ellipse(ctx, w * 0.6, h * 0.5, w * 0.1, h * 0.14, -0.3);
      ctx.strokeStyle = '#b8861a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.4, w * 0.46, -Math.PI * 0.8, Math.PI * 0.6);
      ctx.stroke();
    },
    telescope(ctx, w, h, c) {
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 2;
      U.line(ctx, w * 0.5, h * 0.5, w * 0.2, h);
      U.line(ctx, w * 0.5, h * 0.5, w * 0.8, h);
      U.line(ctx, w * 0.5, h * 0.5, w * 0.5, h);
      ctx.save();
      ctx.translate(w * 0.5, h * 0.42);
      ctx.rotate(-0.6);
      box(ctx, -w * 0.45, -h * 0.08, w * 0.9, h * 0.16, c[0], 2);
      box(ctx, w * 0.3, -h * 0.11, w * 0.18, h * 0.22, c[1], 2);
      ctx.restore();
    },
    typewriter(ctx, w, h, c) {
      box(ctx, 0, h * 0.35, w, h * 0.65, c[0], 4);
      box(ctx, w * 0.1, h * 0.15, w * 0.8, h * 0.18, '#222', 3);
      box(ctx, w * 0.25, 0, w * 0.5, h * 0.2, '#f5f0e0', 0);
      ctx.fillStyle = '#eee';
      for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) U.circle(ctx, w * (0.15 + i * 0.12) + r * 2, h * (0.52 + r * 0.14), 2);
    },
    gramophone(ctx, w, h, c) {
      box(ctx, 0, h * 0.7, w, h * 0.3, c[0], 2);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 3;
      U.line(ctx, w * 0.5, h * 0.7, w * 0.45, h * 0.45);
      ctx.beginPath();
      ctx.moveTo(w * 0.42, h * 0.5);
      ctx.lineTo(w, 0);
      ctx.lineTo(w * 0.9, h * 0.35);
      ctx.lineTo(w * 1.0, h * 0.7);
      ctx.closePath();
      ctx.moveTo(w * 0.42, h * 0.5);
      ctx.quadraticCurveTo(w * 0.1, h * 0.1, w * 0.35, 0);
      pathFill(ctx, c[1]);
      oval(ctx, w * 0.3, h * 0.7, w * 0.25, h * 0.04, '#111');
    },
    jewelbox(ctx, w, h, c) {
      box(ctx, 0, h * 0.35, w, h * 0.65, c[0], 3);
      ctx.beginPath();
      ctx.moveTo(0, h * 0.38);
      ctx.quadraticCurveTo(w / 2, -h * 0.05, w, h * 0.38);
      ctx.closePath();
      pathFill(ctx, U.shade(c[0], 0.1));
      box(ctx, w * 0.42, h * 0.4, w * 0.16, h * 0.2, c[1], 1);
      ctx.fillStyle = c[1];
      ctx.fillRect(0, h * 0.62, w, 2);
      gem(ctx, w / 2, h * 0.18, h * 0.1, c[2]);
    },
    musicbox(ctx, w, h, c) {
      box(ctx, 0, h * 0.3, w, h * 0.7, c[0], 2);
      box(ctx, 0, h * 0.2, w, h * 0.14, U.shade(c[0], 0.15), 2);
      oval(ctx, w / 2, h * 0.12, w * 0.08, h * 0.12, c[1]);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 1.5;
      U.line(ctx, w * 0.9, h * 0.6, w * 1.05, h * 0.6);
      U.line(ctx, w * 1.05, h * 0.5, w * 1.05, h * 0.7);
    },
    mirror(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, c[0]);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#dff1ff');
      g.addColorStop(0.5, '#8fb3cc');
      g.addColorStop(1, '#cfe6f5');
      oval(ctx, w / 2, h / 2, w * 0.38, h * 0.4, g);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      U.line(ctx, w * 0.3, h * 0.35, w * 0.45, h * 0.2);
      U.line(ctx, w * 0.35, h * 0.5, w * 0.55, h * 0.28);
    },
    sword(ctx, w, h, c) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.15);
      ctx.beginPath();
      ctx.moveTo(-w * 0.45, -2);
      ctx.quadraticCurveTo(w * 0.2, -5, w * 0.48, -h * 0.35);
      ctx.quadraticCurveTo(w * 0.25, 2, -w * 0.45, 3);
      ctx.closePath();
      pathFill(ctx, c[0]);
      box(ctx, -w * 0.3, -h * 0.25, 4, h * 0.5, c[1], 1);
      box(ctx, -w * 0.48, -2.5, w * 0.18, 5, '#3a2416', 2);
      ctx.restore();
    },
    mask(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.1);
      ctx.quadraticCurveTo(w / 2, -h * 0.05, w * 0.9, h * 0.1);
      ctx.quadraticCurveTo(w * 0.95, h * 0.7, w / 2, h);
      ctx.quadraticCurveTo(w * 0.05, h * 0.7, w * 0.1, h * 0.1);
      pathFill(ctx, c[0]);
      ctx.fillStyle = '#111';
      U.ellipse(ctx, w * 0.33, h * 0.35, w * 0.1, h * 0.07, 0.2);
      U.ellipse(ctx, w * 0.67, h * 0.35, w * 0.1, h * 0.07, -0.2);
      U.ellipse(ctx, w / 2, h * 0.72, w * 0.12, h * 0.05, 0);
      ctx.fillStyle = c[1];
      for (let i = 0; i < 5; i++) U.circle(ctx, w * (0.2 + i * 0.15), h * 0.15, 2);
    },
    elephant(ctx, w, h, c) {
      oval(ctx, w * 0.45, h * 0.5, w * 0.36, h * 0.28, c[0]);
      oval(ctx, w * 0.8, h * 0.35, w * 0.18, h * 0.2, c[0]);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w * 0.9, h * 0.45);
      ctx.quadraticCurveTo(w * 1.0, h * 0.8, w * 0.92, h * 0.9);
      ctx.stroke();
      for (const x of [0.2, 0.35, 0.55, 0.68]) box(ctx, w * x, h * 0.65, w * 0.1, h * 0.35, c[0], 1);
      oval(ctx, w * 0.72, h * 0.35, w * 0.1, h * 0.14, U.shade(c[0], -0.1));
      U.circle(ctx, w * 0.84, h * 0.3, 1.5, '#111');
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.25, h * 0.3, w * 0.4, h * 0.06);
    },
    catstatue(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.88, w * 0.8, h * 0.12, c[1], 1);
      oval(ctx, w / 2, h * 0.62, w * 0.3, h * 0.28, c[0]);
      oval(ctx, w / 2, h * 0.25, w * 0.22, h * 0.18, c[0]);
      U.poly(ctx, [w * 0.3, h * 0.2, w * 0.32, 0, w * 0.45, h * 0.12], c[0]);
      U.poly(ctx, [w * 0.7, h * 0.2, w * 0.68, 0, w * 0.55, h * 0.12], c[0]);
      ctx.fillStyle = '#ffd24a';
      U.ellipse(ctx, w * 0.42, h * 0.24, 2, 1.4, 0);
      U.ellipse(ctx, w * 0.58, h * 0.24, 2, 1.4, 0);
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.3, h * 0.42, w * 0.4, h * 0.05);
    },
    matryoshka(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.65, w * 0.46, h * 0.35, c[0]);
      oval(ctx, w / 2, h * 0.28, w * 0.34, h * 0.26, c[0]);
      oval(ctx, w / 2, h * 0.3, w * 0.2, h * 0.15, '#f5dcc5');
      U.circle(ctx, w * 0.43, h * 0.28, 1.3, '#111');
      U.circle(ctx, w * 0.57, h * 0.28, 1.3, '#111');
      U.circle(ctx, w * 0.4, h * 0.35, 2, '#ff8fa3');
      U.circle(ctx, w * 0.6, h * 0.35, 2, '#ff8fa3');
      oval(ctx, w / 2, h * 0.7, w * 0.22, h * 0.16, c[1]);
      U.circle(ctx, w / 2, h * 0.7, w * 0.08, c[2]);
    },
    fishbowl(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.55, w * 0.48, h * 0.45, U.rgba('#9fd6ff', 0.4));
      ctx.fillStyle = U.rgba('#4aa8ff', 0.35);
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.6, w * 0.45, h * 0.35, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = c[0];
      U.ellipse(ctx, w * 0.45, h * 0.62, w * 0.12, h * 0.07, 0);
      U.poly(ctx, [w * 0.55, h * 0.62, w * 0.66, h * 0.55, w * 0.66, h * 0.69], c[0]);
      box(ctx, w * 0.15, h * 0.05, w * 0.7, h * 0.08, U.rgba('#cfe8ff', 0.6), 3);
    },
    birdcage(ctx, w, h, c) {
      box(ctx, 0, h * 0.9, w, h * 0.1, c[0], 1);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 6; i++) {
        const x = (w * i) / 6;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.9);
        ctx.lineTo(x, h * 0.35);
        ctx.quadraticCurveTo(w / 2, -h * 0.05, w / 2, h * 0.05);
        ctx.stroke();
      }
      oval(ctx, w / 2, h * 0.6, w * 0.13, h * 0.1, c[1]);
      U.poly(ctx, [w * 0.62, h * 0.58, w * 0.7, h * 0.6, w * 0.62, h * 0.63], '#ffb347');
    },
    ballsport(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, c[0]);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.48, 0.5, 2.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w * 0.48, 3.6, 5.8);
      ctx.stroke();
    },
    bowling(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, c[0]);
      U.circle(ctx, w * 0.4, h * 0.35, 2, '#111');
      U.circle(ctx, w * 0.55, h * 0.32, 2, '#111');
      U.circle(ctx, w * 0.5, h * 0.48, 2.3, '#111');
      shine(ctx, w * 0.2, h * 0.25, w * 0.12, h * 0.12, 0.4);
    },
    racket(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.32, w * 0.44, h * 0.3, 'rgba(0,0,0,0)');
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.32, w * 0.42, h * 0.3, 0, 0, U.TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.8;
      for (let i = -3; i <= 3; i++) {
        U.line(ctx, w / 2 + i * w * 0.1, h * 0.06, w / 2 + i * w * 0.1, h * 0.58);
        U.line(ctx, w * 0.1, h * 0.32 + i * h * 0.07, w * 0.9, h * 0.32 + i * h * 0.07);
      }
      box(ctx, w * 0.44, h * 0.6, w * 0.12, h * 0.4, c[1], 2);
    },
    skateboard(ctx, w, h, c) {
      box(ctx, 0, h * 0.2, w, h * 0.35, c[0], h * 0.17);
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.3, h * 0.28, w * 0.4, h * 0.15);
      U.circle(ctx, w * 0.2, h * 0.8, h * 0.18, '#f0e0a0');
      U.circle(ctx, w * 0.8, h * 0.8, h * 0.18, '#f0e0a0');
    },
    bicycle(ctx, w, h, c) {
      ctx.strokeStyle = '#1b1b1b';
      ctx.lineWidth = 3;
      for (const x of [w * 0.2, w * 0.8]) {
        ctx.beginPath();
        ctx.arc(x, h * 0.72, h * 0.26, 0, U.TAU);
        ctx.stroke();
      }
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.72);
      ctx.lineTo(w * 0.45, h * 0.72);
      ctx.lineTo(w * 0.7, h * 0.35);
      ctx.lineTo(w * 0.38, h * 0.35);
      ctx.lineTo(w * 0.2, h * 0.72);
      ctx.moveTo(w * 0.45, h * 0.72);
      ctx.lineTo(w * 0.36, h * 0.25);
      ctx.moveTo(w * 0.7, h * 0.35);
      ctx.lineTo(w * 0.8, h * 0.72);
      ctx.moveTo(w * 0.7, h * 0.35);
      ctx.lineTo(w * 0.68, h * 0.18);
      ctx.stroke();
      box(ctx, w * 0.3, h * 0.2, w * 0.14, h * 0.06, '#222', 2);
      box(ctx, w * 0.62, h * 0.14, w * 0.14, h * 0.05, '#222', 2);
    },
    drill(ctx, w, h, c) {
      box(ctx, 0, 0, w * 0.75, h * 0.4, c[0], 4);
      box(ctx, w * 0.75, h * 0.14, w * 0.25, h * 0.1, '#999', 1);
      box(ctx, w * 0.22, h * 0.38, w * 0.26, h * 0.5, c[0], 3);
      box(ctx, w * 0.15, h * 0.82, w * 0.4, h * 0.18, '#222', 2);
    },
    toolbox(ctx, w, h, c) {
      box(ctx, 0, h * 0.3, w, h * 0.7, c[0], 3);
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.3);
      ctx.lineTo(w * 0.3, h * 0.08);
      ctx.lineTo(w * 0.7, h * 0.08);
      ctx.lineTo(w * 0.7, h * 0.3);
      ctx.stroke();
      ctx.fillStyle = U.shade(c[0], -0.3);
      ctx.fillRect(0, h * 0.5, w, 2);
      box(ctx, w * 0.44, h * 0.44, w * 0.12, h * 0.12, '#bbb', 1);
    },
    mower(ctx, w, h, c) {
      box(ctx, 0, h * 0.5, w * 0.75, h * 0.35, c[0], 4);
      U.circle(ctx, w * 0.12, h * 0.88, h * 0.12, '#222');
      U.circle(ctx, w * 0.65, h * 0.88, h * 0.12, '#222');
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      U.line(ctx, w * 0.6, h * 0.55, w, 0);
      box(ctx, w * 0.2, h * 0.35, w * 0.3, h * 0.18, '#444', 2);
    },
    gnome(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.75, w * 0.4, h * 0.25, c[1]);
      oval(ctx, w / 2, h * 0.5, w * 0.25, h * 0.14, '#f5d1b5');
      ctx.fillStyle = '#f5f5f5';
      U.poly(ctx, [w * 0.25, h * 0.52, w * 0.75, h * 0.52, w / 2, h * 0.85]);
      U.poly(ctx, [w * 0.2, h * 0.45, w * 0.8, h * 0.45, w * 0.55, 0], c[0]);
      U.circle(ctx, w * 0.42, h * 0.48, 1.3, '#111');
      U.circle(ctx, w * 0.58, h * 0.48, 1.3, '#111');
      U.circle(ctx, w / 2, h * 0.53, 2, '#ff9a8a');
    },
    angel(ctx, w, h, c) {
      box(ctx, w * 0.15, h * 0.85, w * 0.7, h * 0.15, U.shade(c[0], -0.2), 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.85);
      ctx.lineTo(w * 0.38, h * 0.3);
      ctx.lineTo(w * 0.62, h * 0.3);
      ctx.lineTo(w * 0.7, h * 0.85);
      ctx.closePath();
      pathFill(ctx, c[0]);
      oval(ctx, w / 2, h * 0.2, w * 0.13, h * 0.1, c[0]);
      ctx.beginPath();
      ctx.moveTo(w * 0.4, h * 0.35);
      ctx.quadraticCurveTo(0, h * 0.2, w * 0.05, h * 0.6);
      ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.4, h * 0.5);
      pathFill(ctx, U.shade(c[0], 0.1));
      ctx.beginPath();
      ctx.moveTo(w * 0.6, h * 0.35);
      ctx.quadraticCurveTo(w, h * 0.2, w * 0.95, h * 0.6);
      ctx.quadraticCurveTo(w * 0.7, h * 0.5, w * 0.6, h * 0.5);
      pathFill(ctx, U.shade(c[0], 0.1));
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.06, w * 0.12, h * 0.025, 0, 0, U.TAU);
      ctx.stroke();
    },
    grill(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.lineTo(w, h * 0.2);
      ctx.quadraticCurveTo(w, h * 0.6, w / 2, h * 0.6);
      ctx.quadraticCurveTo(0, h * 0.6, 0, h * 0.2);
      pathFill(ctx, c[0]);
      box(ctx, -2, h * 0.15, w + 4, h * 0.07, '#555', 1);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      U.line(ctx, w * 0.25, h * 0.55, w * 0.1, h);
      U.line(ctx, w * 0.75, h * 0.55, w * 0.9, h);
      U.line(ctx, w * 0.5, h * 0.6, w * 0.5, h);
    },
    barrel(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1, 0);
      ctx.quadraticCurveTo(-w * 0.05, h / 2, w * 0.1, h);
      ctx.lineTo(w * 0.9, h);
      ctx.quadraticCurveTo(w * 1.05, h / 2, w * 0.9, 0);
      ctx.closePath();
      pathFill(ctx, c[0]);
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(0, h * 0.18, w, 3);
      ctx.fillRect(0, h * 0.8, w, 3);
      ctx.strokeStyle = U.shade(c[0], -0.25);
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) U.line(ctx, (w * i) / 5, 2, (w * i) / 5, h - 2);
    },
    can(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 2);
      box(ctx, 0, h * 0.25, w, h * 0.5, c[1], 0);
      ctx.fillStyle = '#ccc';
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, h - 2, w, 2);
    },
    jar(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.15, w * 0.8, h * 0.85, U.rgba('#dff0ff', 0.45), 4);
      ctx.fillStyle = c[0];
      ctx.fillRect(w * 0.14, h * 0.3, w * 0.72, h * 0.66);
      box(ctx, w * 0.05, 0, w * 0.9, h * 0.18, c[1], 2);
      box(ctx, w * 0.25, h * 0.45, w * 0.5, h * 0.25, '#f5ecd5', 1);
    },
    bread(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.5);
      ctx.quadraticCurveTo(w / 2, -h * 0.3, w, h * 0.5);
      ctx.lineTo(w, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      ctx.strokeStyle = U.shade(c[0], -0.3);
      ctx.lineWidth = 1.5;
      for (let i = 1; i < 4; i++) U.line(ctx, (w * i) / 4 - 4, h * 0.3, (w * i) / 4 + 4, h * 0.45);
    },
    cheese(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.75, w * 0.5, h * 0.25, U.shade(c[0], -0.1));
      box(ctx, 0, h * 0.25, w, h * 0.5, c[0], 0);
      oval(ctx, w / 2, h * 0.25, w * 0.5, h * 0.25, U.shade(c[0], 0.1));
      ctx.fillStyle = U.shade(c[0], -0.2);
      U.circle(ctx, w * 0.3, h * 0.55, 2);
      U.circle(ctx, w * 0.7, h * 0.5, 1.5);
    },
    pot(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.25, w * 0.8, h * 0.75, c[0], 3);
      box(ctx, w * 0.05, h * 0.15, w * 0.9, h * 0.12, U.shade(c[0], 0.15), 2);
      box(ctx, w * 0.42, 0, w * 0.16, h * 0.15, '#222', 2);
      box(ctx, -2, h * 0.35, w * 0.12, h * 0.1, '#222', 1);
      box(ctx, w * 0.9, h * 0.35, w * 0.12, h * 0.1, '#222', 1);
      shine(ctx, w * 0.2, h * 0.35, w * 0.06, h * 0.5, 0.3);
    },
    pan(ctx, w, h, c) {
      box(ctx, 0, h * 0.4, w * 0.6, h * 0.6, c[0], h * 0.3);
      box(ctx, w * 0.55, h * 0.55, w * 0.45, h * 0.2, '#222', 3);
    },
    knifeblock(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.3);
      ctx.lineTo(w * 0.7, h * 0.2);
      ctx.lineTo(w * 0.9, h);
      ctx.lineTo(w * 0.1, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      for (let i = 0; i < 4; i++) box(ctx, w * (0.15 + i * 0.13), h * (0.05 + i * 0.02), w * 0.08, h * 0.25, '#222', 1);
    },
    teapot(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.62, w * 0.36, h * 0.35, c[0]);
      box(ctx, w * 0.38, h * 0.14, w * 0.24, h * 0.14, U.shade(c[0], 0.1), 3);
      U.circle(ctx, w / 2, h * 0.1, w * 0.06, c[1]);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.82, h * 0.6);
      ctx.lineTo(w, h * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.12, h * 0.6, h * 0.16, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.2, h * 0.6, w * 0.6, h * 0.06);
    },
    samovar(ctx, w, h, c) {
      box(ctx, w * 0.25, h * 0.88, w * 0.5, h * 0.12, c[0], 2);
      oval(ctx, w / 2, h * 0.55, w * 0.4, h * 0.3, c[0]);
      box(ctx, w * 0.35, h * 0.12, w * 0.3, h * 0.2, c[0], 2);
      oval(ctx, w / 2, h * 0.1, w * 0.2, h * 0.08, U.shade(c[0], 0.2));
      box(ctx, w * 0.82, h * 0.6, w * 0.16, h * 0.05, c[0], 1);
      ctx.strokeStyle = U.shade(c[0], -0.3);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) U.line(ctx, w * (0.25 + i * 0.16), h * 0.4, w * (0.25 + i * 0.16), h * 0.7);
      shine(ctx, w * 0.25, h * 0.4, w * 0.06, h * 0.25, 0.4);
    },
    lokum(ctx, w, h, c) {
      box(ctx, 0, h * 0.3, w, h * 0.7, c[0], 2);
      box(ctx, -1, h * 0.2, w + 2, h * 0.2, U.shade(c[0], 0.15), 2);
      for (let i = 0; i < 3; i++) box(ctx, w * (0.12 + i * 0.28), h * 0.5, w * 0.2, h * 0.3, i % 2 ? '#f7c1d5' : '#fff2cf', 1);
    },
    cezve(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.2);
      ctx.lineTo(w * 0.5, h * 0.2);
      ctx.lineTo(w * 0.45, h * 0.5);
      ctx.quadraticCurveTo(w * 0.55, h, w * 0.3, h);
      ctx.lineTo(w * 0.2, h);
      ctx.quadraticCurveTo(-w * 0.05, h, w * 0.1, h * 0.5);
      ctx.closePath();
      pathFill(ctx, c[0]);
      box(ctx, w * 0.45, h * 0.3, w * 0.55, h * 0.1, '#3a2416', 2);
    },
    hookah(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.8, w * 0.35, h * 0.2, U.rgba(c[0], 0.8));
      box(ctx, w * 0.44, h * 0.2, w * 0.12, h * 0.45, c[1], 1);
      oval(ctx, w / 2, h * 0.14, w * 0.18, h * 0.08, '#a0522d');
      oval(ctx, w / 2, h * 0.35, w * 0.2, h * 0.04, c[1]);
      ctx.strokeStyle = '#2a4d8f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.56, h * 0.55);
      ctx.quadraticCurveTo(w, h * 0.5, w * 0.9, h * 0.95);
      ctx.stroke();
    },
    saz(ctx, w, h, c) {
      box(ctx, w * 0.45, 0, w * 0.1, h * 0.6, '#3a2416', 1);
      for (let i = 0; i < 5; i++) U.circle(ctx, w * 0.5 + (i % 2 ? 4 : -4), h * (0.04 + i * 0.03), 1.5, '#e8e0c8');
      ctx.beginPath();
      ctx.moveTo(w / 2, h * 0.55);
      ctx.quadraticCurveTo(w * 1.02, h * 0.6, w * 0.8, h);
      ctx.lineTo(w * 0.2, h);
      ctx.quadraticCurveTo(-w * 0.02, h * 0.6, w / 2, h * 0.55);
      pathFill(ctx, c[0]);
      ctx.strokeStyle = U.shade(c[0], -0.3);
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) U.line(ctx, w * (0.2 + i * 0.12), h * 0.62, w * (0.2 + i * 0.12), h * 0.98);
    },
    darbuka(ctx, w, h, c) {
      oval(ctx, w / 2, h * 0.12, w * 0.45, h * 0.1, '#f0e8d0');
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.12);
      ctx.quadraticCurveTo(w * 0.05, h * 0.5, w * 0.35, h * 0.6);
      ctx.lineTo(w * 0.25, h);
      ctx.lineTo(w * 0.75, h);
      ctx.lineTo(w * 0.65, h * 0.6);
      ctx.quadraticCurveTo(w * 0.95, h * 0.5, w * 0.95, h * 0.12);
      ctx.closePath();
      pathFill(ctx, c[0]);
      ctx.fillStyle = c[1];
      for (let i = 0; i < 5; i++) U.circle(ctx, w * (0.2 + i * 0.15), h * 0.3, 2);
    },
    tileplate(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.48, '#f7f7fb');
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.4, h * 0.4, 0, 0, U.TAU);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * U.TAU;
        ctx.fillStyle = i % 2 ? c[0] : c[1];
        U.ellipse(ctx, w / 2 + Math.cos(a) * w * 0.22, h / 2 + Math.sin(a) * h * 0.22, w * 0.07, h * 0.04, a);
      }
      U.circle(ctx, w / 2, h / 2, w * 0.08, c[1]);
    },
    chessset(ctx, w, h, c) {
      box(ctx, 0, h * 0.6, w, h * 0.4, '#5b3a24', 2);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#efe2c6' : '#2a1a10';
        ctx.fillRect(w * (0.05 + i * 0.15), h * 0.64, w * 0.15, h * 0.1);
      }
      oval(ctx, w * 0.25, h * 0.45, w * 0.07, h * 0.15, c[0]);
      oval(ctx, w * 0.5, h * 0.4, w * 0.08, h * 0.2, c[1]);
      oval(ctx, w * 0.72, h * 0.47, w * 0.06, h * 0.13, c[0]);
    },
    diploma(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 1);
      box(ctx, w * 0.1, h * 0.1, w * 0.8, h * 0.8, '#f7f0dc', 0);
      ctx.fillStyle = '#555';
      for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.2, h * (0.25 + i * 0.12), w * 0.6, 1.5);
      U.circle(ctx, w * 0.7, h * 0.72, w * 0.08, '#c23a2b');
    },
    horn(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.8);
      ctx.quadraticCurveTo(w * 0.3, h * 0.1, w, 0);
      ctx.lineTo(w, h * 0.3);
      ctx.quadraticCurveTo(w * 0.4, h * 0.4, w * 0.2, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
    },
    medkit(ctx, w, h, c) {
      box(ctx, 0, h * 0.2, w, h * 0.8, c[0], 3);
      box(ctx, w * 0.35, 0, w * 0.3, h * 0.24, '#555', 2);
      ctx.fillStyle = '#e8283c';
      ctx.fillRect(w * 0.42, h * 0.35, w * 0.16, h * 0.5);
      ctx.fillRect(w * 0.3, h * 0.52, w * 0.4, h * 0.16);
    },
    stethoscope(ctx, w, h, c) {
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, 0);
      ctx.quadraticCurveTo(w * 0.1, h * 0.6, w * 0.5, h * 0.6);
      ctx.quadraticCurveTo(w * 0.9, h * 0.6, w * 0.8, 0);
      ctx.moveTo(w * 0.5, h * 0.6);
      ctx.lineTo(w * 0.5, h * 0.8);
      ctx.stroke();
      oval(ctx, w * 0.5, h * 0.88, w * 0.15, h * 0.1, '#c9c9c9');
    },
    microscope(ctx, w, h, c) {
      box(ctx, w * 0.1, h * 0.88, w * 0.8, h * 0.12, c[0], 2);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(w * 0.7, h * 0.88);
      ctx.quadraticCurveTo(w * 0.85, h * 0.4, w * 0.55, h * 0.3);
      ctx.stroke();
      ctx.save();
      ctx.translate(w * 0.45, h * 0.35);
      ctx.rotate(-0.4);
      box(ctx, -w * 0.08, -h * 0.35, w * 0.16, h * 0.5, '#e8e8e8', 2);
      ctx.restore();
      box(ctx, w * 0.2, h * 0.55, w * 0.5, h * 0.06, '#333', 1);
    },
    jersey(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, '#5b3a24', 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.3, h * 0.12);
      ctx.lineTo(w * 0.12, h * 0.24);
      ctx.lineTo(w * 0.18, h * 0.42);
      ctx.lineTo(w * 0.28, h * 0.38);
      ctx.lineTo(w * 0.28, h * 0.9);
      ctx.lineTo(w * 0.72, h * 0.9);
      ctx.lineTo(w * 0.72, h * 0.38);
      ctx.lineTo(w * 0.82, h * 0.42);
      ctx.lineTo(w * 0.88, h * 0.24);
      ctx.lineTo(w * 0.7, h * 0.12);
      ctx.quadraticCurveTo(w / 2, h * 0.24, w * 0.3, h * 0.12);
      pathFill(ctx, c[0]);
      ctx.fillStyle = c[1];
      ctx.font = `bold ${Math.round(h * 0.28)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(c[2] || '10', w / 2, h * 0.68);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.36, h * 0.78);
      ctx.bezierCurveTo(w * 0.45, h * 0.7, w * 0.5, h * 0.86, w * 0.64, h * 0.74);
      ctx.stroke();
    },
    goldenball(ctx, w, h, c) {
      box(ctx, w * 0.2, h * 0.82, w * 0.6, h * 0.18, '#2a2a30', 1);
      box(ctx, w * 0.38, h * 0.62, w * 0.24, h * 0.22, c[0], 1);
      oval(ctx, w / 2, h * 0.36, w * 0.44, h * 0.3, c[0]);
      ctx.strokeStyle = U.shade(c[0], -0.3);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.36, w * 0.3, 0, U.TAU);
      ctx.stroke();
      U.line(ctx, w * 0.06, h * 0.36, w * 0.94, h * 0.36);
      shine(ctx, w * 0.28, h * 0.14, w * 0.12, h * 0.12, 0.6);
    },
    sculpture(ctx, w, h, c) {
      box(ctx, w * 0.15, h * 0.86, w * 0.7, h * 0.14, '#2a2a30', 1);
      ctx.beginPath();
      ctx.moveTo(w * 0.45, h * 0.86);
      ctx.bezierCurveTo(-w * 0.1, h * 0.55, w * 1.1, h * 0.4, w * 0.3, h * 0.05);
      ctx.bezierCurveTo(w * 0.9, h * 0.2, w * 0.2, h * 0.6, w * 0.6, h * 0.86);
      ctx.closePath();
      pathFill(ctx, c[0]);
      U.circle(ctx, w * 0.62, h * 0.3, w * 0.12, c[1]);
      shine(ctx, w * 0.4, h * 0.2, w * 0.06, h * 0.3, 0.3);
    },
    egg(ctx, w, h, c) {
      box(ctx, w * 0.25, h * 0.85, w * 0.5, h * 0.15, c[1], 1);
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.48, w * 0.42, h * 0.42, 0, 0, U.TAU);
      pathFill(ctx, c[0]);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.48, w * 0.42, h * 0.12, 0, 0, U.TAU);
      ctx.stroke();
      U.line(ctx, w / 2, h * 0.06, w / 2, h * 0.9);
      for (let i = 0; i < 5; i++) U.circle(ctx, w * (0.2 + i * 0.15), h * 0.48, 1.3, c[2]);
      shine(ctx, w * 0.3, h * 0.18, w * 0.1, h * 0.2, 0.5);
    },
    icon(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 2);
      ctx.fillStyle = c[1];
      ctx.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.8);
      U.circle(ctx, w / 2, h * 0.34, w * 0.26, '#ffd24a');
      oval(ctx, w / 2, h * 0.36, w * 0.14, h * 0.12, c[2]);
      ctx.fillStyle = U.shade(c[1], -0.3);
      U.poly(ctx, [w * 0.25, h * 0.88, w * 0.35, h * 0.5, w * 0.65, h * 0.5, w * 0.75, h * 0.88]);
    },
    dumbbell(ctx, w, h, c) {
      box(ctx, w * 0.2, h * 0.4, w * 0.6, h * 0.2, c[0], 2);
      box(ctx, 0, 0, w * 0.22, h, c[1], 3);
      box(ctx, w * 0.78, 0, w * 0.22, h, c[1], 3);
    },
    hdd(ctx, w, h, c) {
      box(ctx, 0, 0, w, h, c[0], 2);
      U.circle(ctx, w * 0.8, h * 0.5, 1.6, c[1]);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(w * 0.1, h * 0.3, w * 0.5, h * 0.12);
    },
    goldmask(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.2);
      ctx.quadraticCurveTo(w / 2, -h * 0.05, w * 0.9, h * 0.2);
      ctx.lineTo(w, h * 0.7);
      ctx.lineTo(w * 0.75, h);
      ctx.lineTo(w * 0.25, h);
      ctx.lineTo(0, h * 0.7);
      ctx.closePath();
      pathFill(ctx, c[1]);
      oval(ctx, w / 2, h * 0.42, w * 0.3, h * 0.3, c[0]);
      ctx.fillStyle = c[0];
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.1 + i * w * 0.17, h * 0.2, w * 0.08, h * 0.6);
      ctx.fillStyle = '#1a1a1a';
      U.ellipse(ctx, w * 0.4, h * 0.38, 2.2, 1.4, 0);
      U.ellipse(ctx, w * 0.6, h * 0.38, 2.2, 1.4, 0);
      box(ctx, w * 0.45, h * 0.72, w * 0.1, h * 0.26, c[0], 1);
      shine(ctx, w * 0.3, h * 0.2, w * 0.1, h * 0.25, 0.5);
    },
    crown(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.25);
      ctx.lineTo(w * 0.25, h * 0.55);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(w * 0.75, h * 0.55);
      ctx.lineTo(w, h * 0.25);
      ctx.lineTo(w, h);
      ctx.closePath();
      pathFill(ctx, c[0]);
      gem(ctx, w / 2, h * 0.7, h * 0.16, c[1]);
      gem(ctx, w * 0.2, h * 0.78, h * 0.1, c[2]);
      gem(ctx, w * 0.8, h * 0.78, h * 0.1, c[2]);
      shine(ctx, w * 0.1, h * 0.6, w * 0.8, h * 0.06, 0.4);
    },
    amphora(ctx, w, h, c) {
      ctx.beginPath();
      ctx.moveTo(w * 0.38, 0);
      ctx.lineTo(w * 0.62, 0);
      ctx.lineTo(w * 0.6, h * 0.2);
      ctx.bezierCurveTo(w, h * 0.3, w * 0.9, h * 0.8, w / 2, h);
      ctx.bezierCurveTo(w * 0.1, h * 0.8, 0, h * 0.3, w * 0.4, h * 0.2);
      ctx.closePath();
      pathFill(ctx, c[0]);
      ctx.strokeStyle = c[0];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(w * 0.28, h * 0.2, w * 0.12, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.2, w * 0.12, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.fillStyle = c[1];
      U.poly(ctx, [w * 0.3, h * 0.5, w * 0.42, h * 0.4, w * 0.5, h * 0.55, w * 0.62, h * 0.42, w * 0.7, h * 0.52, w * 0.66, h * 0.6, w * 0.34, h * 0.6]);
    },
    fossil(ctx, w, h, c) {
      oval(ctx, w / 2, h / 2, w * 0.48, h * 0.46, c[0]);
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let a = 0; a < 12; a += 0.2) {
        const r = a * 0.7;
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r * 0.9;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    safeloot(ctx, w, h, c) {
      DRAW.cash(ctx, w, h, c);
    },
  };

  /* ---------------------------------------------------------------------
   * Paletler
   * ------------------------------------------------------------------- */
  const P = {
    gold: [['#ffd24a', '#e8283c', '#fff'], ['#ffd24a', '#4aa8ff', '#fff'], ['#ffd24a', '#3ddc84', '#fff'], ['#e6e6e6', '#b467ff', '#fff']],
    silver: [['#d9dde6', '#4aa8ff', '#fff'], ['#c0c4cc', '#e8283c', '#fff']],
    watch: [['#ffd24a', '#5b3a24'], ['#d9dde6', '#1a1a1a'], ['#d9dde6', '#2a4d8f'], ['#ffd24a', '#1a1a1a']],
    leather: [['#5b3a24', '#ffd24a'], ['#1a1a1a', '#c0c0c0'], ['#8a3a2a', '#ffd24a']],
    phone: [['#1a1a1a', '#4aa8ff', '#b467ff'], ['#e6e6e6', '#ff8c2e', '#e8283c'], ['#2a2d3e', '#3ddc84', '#4aa8ff']],
    plastic: [['#e6e6e6', '#4aa8ff', '#e8283c'], ['#1a1a1a', '#e8283c', '#4aa8ff'], ['#e8283c', '#fff', '#222']],
    tech: [['#2a2d3e', '#4aa8ff', '#3ddc84'], ['#c0c4cc', '#b467ff', '#4aa8ff'], ['#1a1a1a', '#e8283c', '#ff8c2e']],
    appliance: [['#e8e8e8', '#555'], ['#c0c4cc', '#222'], ['#e8283c', '#fff'], ['#2a2d3e', '#4aa8ff']],
    vase: [
      ['#2a5db0', '#ffffff', '#ffd24a'],
      ['#c23a2b', '#1a1a1a', '#ffd24a'],
      ['#3a8f6a', '#e8d9a8', '#c23a2b'],
      ['#f0ece0', '#2a5db0', '#2a5db0'],
      ['#6b3cc2', '#ffd24a', '#fff'],
    ],
    pot: [['#b8643c', '#2d7a3e', '#ff6fae'], ['#c9c0b0', '#3a8f4a', null], ['#2a4d8f', '#4a9a3e', '#ffd24a'], ['#e8e0c8', '#2d6a3e', '#e8283c']],
    stone: [['#d8d4cc', '#b8b4ac'], ['#bfb8a8', '#8a8478'], ['#e8e4dc', '#c8c0b0']],
    bronze: [['#b87333', '#8a5020'], ['#9a8a5a', '#6a5a3a']],
    painting: [
      ['#b8861a', '#7fb3e8', '#3a6b3a', 'landscape'],
      ['#5b3a24', '#e8c49a', '#2d5a26', 'landscape'],
      ['#b8861a', '#3b2a4a', '#6a1b2a', 'portrait'],
      ['#1a1a1a', '#e8283c', '#2a5db0', 'modern'],
      ['#e6e6e6', '#ffd24a', '#2a5db0', 'modern'],
      ['#8a6a2a', '#2a3a5a', '#8a2a3a', 'portrait'],
    ],
    wood: [['#8a5a34', '#5b3a24'], ['#b07a4a', '#6b4a2a'], ['#5b3a24', '#2a1a10']],
    ceramic: [['#f7f7fb', '#2a5db0', '#e8283c'], ['#f0e8d0', '#c23a2b', '#ffd24a'], ['#e8f0f5', '#3a8f6a', '#2a5db0']],
    glass: [['#cfe8ff', '#8a1b2a'], ['#e0f5ff', '#f5d76a'], ['#dff0ff', null]],
    wine: [['#2a4a2a', '#f0e8d0', '#8a1b2a'], ['#3a1a1a', '#e8d9a8', '#b8861a'], ['#1a3a2a', '#1a1a1a', '#ffd24a'], ['#8a5a1a', '#f0e8d0', '#b8861a']],
    book: [['#8a1b2a', '#ffd24a'], ['#1b3a8a', '#e8e0c8'], ['#2d5a26', '#ffd24a'], ['#5b3a24', '#e8d9a8'], ['#3a1b5a', '#e8e0c8'], ['#1a1a1a', '#b8861a']],
    books: [['#8a1b2a', '#1b3a8a', '#2d5a26'], ['#5b3a24', '#3a1b5a', '#b8861a'], ['#1a1a1a', '#8a1b2a', '#e8e0c8']],
    rug: [['#8a1b2a', '#ffd24a', '#1b3a8a'], ['#1b3a8a', '#e8e0c8', '#8a1b2a'], ['#5b3a24', '#e8d9a8', '#2d5a26']],
    instrument: [['#c46a2a', '#1a1a1a'], ['#8a3a1a', '#e8e0c8'], ['#1a1a1a', '#e8e8e8'], ['#e8283c', '#fff']],
    brass: [['#e0b040', '#b8861a'], ['#c0c4cc', '#8a8a8a']],
    toy: [['#e8283c', '#4aa8ff', '#ffd24a'], ['#3ddc84', '#b467ff', '#ff8c2e'], ['#4aa8ff', '#ffd24a', '#e8283c']],
    teddy: [['#a0703a', '#e8283c'], ['#e8d0b0', '#4aa8ff'], ['#e8a0c0', '#fff']],
    metal: [['#8a8f99', '#555'], ['#c0c4cc', '#222'], ['#e8283c', '#222'], ['#ffd24a', '#222']],
    food: [['#d9a35a'], ['#c98a3a'], ['#e8b870']],
    jar: [['#c23a2b', '#e8e0c8'], ['#ff8c2e', '#2d5a26'], ['#6b3cc2', '#ffd24a'], ['#3a8f4a', '#c23a2b']],
    copper: [['#c9733a', '#8a4a20'], ['#b8864a', '#6a4a20']],
    cheese: [['#ffd24a'], ['#f5e0a0']],
    garden: [['#e8283c', '#4a7ad0'], ['#2a5db0', '#3a8f4a'], ['#ff8c2e', '#6b3cc2']],
    cash: [['#5fbf6a', '#e8e0c8', '$'], ['#5fa86a', '#e8e0c8', '$'], ['#4f8f5a', '#e8e0c8', '$']],
    fur: [['#8a1b2a', '#ffd24a', '#2a5db0'], ['#2a5db0', '#ffd24a', '#e8283c'], ['#2d7a3e', '#ffd24a', '#e8283c']],
    tile: [['#1c4fd1', '#c23a2b'], ['#1c8a8a', '#1c4fd1'], ['#c23a2b', '#2d7a3e']],
    white: [['#f5f5f5', '#c23a2b'], ['#f5f5f5', '#2a5db0']],
    black: [['#1a1a1a', '#c0c0c0']],
    gems: [['#e8283c'], ['#3ddc84'], ['#4aa8ff'], ['#e8f5ff'], ['#b467ff']],
    fish: [['#ff8c2e'], ['#ffd24a'], ['#e8283c']],
    birds: [['#5b3a24', '#ffd24a'], ['#c0c4cc', '#3ddc84'], ['#b8861a', '#4aa8ff']],
  };

  /* ---------------------------------------------------------------------
   * KATALOG
   * place: 'shelf' | 'table' | 'floor' | 'wall' | 'garden'
   * rooms: '*' = her oda
   * mat: kırılma ve düşme sesi türü
   * ------------------------------------------------------------------- */
  const LIV = ['living', 'hall', 'dining'];
  const BED = ['bedroom', 'master', 'dressing'];
  const KIT = ['kitchen', 'dining'];
  const STU = ['study', 'library'];
  const BASE = ['storage', 'workshop', 'wine'];

  const ITEMS = [
    // --- Mücevher / küçük değerliler (çuvala girer) ---
    { id: 'gold_ring', name: 'Altın Yüzük', draw: 'ring', w: 14, h: 16, val: [900, 2200], kg: 0.1, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...BED, 'bathroom', 'treasure', 'showroom'], pal: P.gold, w8: 3 },
    { id: 'diamond_ring', name: 'Pırlanta Yüzük', draw: 'ring', w: 14, h: 16, val: [4000, 9000], kg: 0.1, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: ['master', 'dressing', 'treasure', 'showroom'], pal: [['#e6e6e6', '#e8f5ff', '#fff']], w8: 1 },
    { id: 'pearl_necklace', name: 'İnci Kolye', draw: 'necklace', w: 22, h: 18, val: [2500, 6000], kg: 0.2, mat: 'soft', small: true, place: ['shelf', 'table'], rooms: [...BED, 'treasure', 'showroom'], pal: [['#f5f0e8', '#f5f0e8', '#fff']], w8: 1.5 },
    { id: 'gold_necklace', name: 'Altın Kolye', draw: 'necklace', w: 22, h: 18, val: [1800, 4500], kg: 0.2, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...BED, 'treasure', 'showroom', 'vault'], pal: P.gold, w8: 2 },
    { id: 'watch', name: 'Kol Saati', draw: 'watch', w: 14, h: 20, val: [600, 1800], kg: 0.15, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...BED, 'study', 'bathroom', 'trophy', 'showroom', 'office'], pal: P.watch, w8: 3 },
    { id: 'lux_watch', name: 'İsviçre Saati', draw: 'watch', w: 14, h: 20, val: [5000, 14000], kg: 0.15, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: ['master', 'dressing', 'study', 'treasure', 'trophy', 'showroom', 'vault'], pal: [['#ffd24a', '#1a1a1a']], w8: 0.8 },
    { id: 'earrings', name: 'Küpe Seti', draw: 'earrings', w: 18, h: 16, val: [700, 2400], kg: 0.05, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...BED, 'bathroom', 'showroom'], pal: P.gold, w8: 2 },
    { id: 'bracelet', name: 'Altın Bilezik', draw: 'bracelet', w: 18, h: 16, val: [1500, 3500], kg: 0.1, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...BED, 'treasure', 'showroom'], pal: P.gold, w8: 2 },
    { id: 'gold_bar', name: 'Külçe Altın', draw: 'goldbar', w: 26, h: 12, val: [12000, 18000], kg: 1, mat: 'metal', small: true, place: ['shelf'], rooms: ['treasure', 'study', 'showroom', 'vault'], pal: [['#ffd24a']], w8: 0.35 },
    { id: 'coin_bag', name: 'Bozuk Para Kesesi', draw: 'coinbag', w: 18, h: 20, val: [80, 300], kg: 0.6, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: '*', pal: [['#b08a5a', '#ffd24a'], ['#8a5a3a', '#e6e6e6']], w8: 2 },
    { id: 'coins', name: 'Madeni Para', draw: 'coins', w: 14, h: 12, val: [10, 60], kg: 0.1, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: '*', pal: [['#d9b04a'], ['#c0c4cc'], ['#c9733a']], w8: 5 },
    { id: 'antique_coin', name: 'Osmanlı Sikkesi', draw: 'coins', w: 14, h: 12, val: [1200, 3000], kg: 0.05, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...STU, 'treasure', 'living', 'showroom', 'vault', 'exhibit'], pal: [['#ffd24a']], w8: 0.8 },
    { id: 'wallet', name: 'Cüzdan', draw: 'wallet', w: 20, h: 14, val: [150, 900], kg: 0.2, mat: 'soft', small: true, place: ['shelf', 'table'], rooms: [...BED, ...LIV, 'study', 'hall', 'office', 'security'], pal: P.leather, w8: 2.5 },
    { id: 'phone', name: 'Akıllı Telefon', draw: 'phone', w: 12, h: 22, val: [1500, 4500], kg: 0.2, mat: 'glass', small: true, place: ['shelf', 'table'], rooms: '*', pal: P.phone, w8: 2 },
    { id: 'old_phone', name: 'Tuşlu Telefon', draw: 'phone', w: 11, h: 20, val: [40, 150], kg: 0.15, mat: 'plastic', small: true, place: ['shelf', 'table'], rooms: '*', pal: [['#555', '#9fd08a', '#3a8f4a']], w8: 2 },
    { id: 'earbuds', name: 'Kablosuz Kulaklık', draw: 'earbuds', w: 16, h: 12, val: [600, 1800], kg: 0.1, mat: 'plastic', small: true, place: ['shelf', 'table'], rooms: [...BED, 'kids', 'study', 'game', 'living', 'techshow'], pal: [['#f5f5f5'], ['#1a1a1a']], w8: 2 },
    { id: 'perfume', name: 'Parfüm', draw: 'perfume', w: 14, h: 22, val: [500, 2500], kg: 0.3, mat: 'glass', small: true, fragile: 0.8, place: ['shelf', 'table'], rooms: [...BED, 'bathroom'], pal: [['#f5c1d8', '#ffd24a'], ['#8fd6ff', '#c0c4cc'], ['#ffd24a', '#1a1a1a'], ['#b467ff', '#ffd24a']], w8: 3 },
    { id: 'makeup', name: 'Makyaj Seti', draw: 'makeup', w: 22, h: 14, val: [200, 900], kg: 0.3, mat: 'plastic', small: true, place: ['shelf', 'table'], rooms: [...BED, 'bathroom'], pal: [['#1a1a1a', '#e8a0b4', '#c23a55'], ['#e8c0d0', '#9b6b4e', '#e8283c']], w8: 2 },
    { id: 'glasses', name: 'Güneş Gözlüğü', draw: 'glasses', w: 22, h: 10, val: [300, 2000], kg: 0.05, mat: 'glass', small: true, place: ['shelf', 'table'], rooms: [...BED, 'hall', 'living'], pal: [['#1a1a1a', '#333'], ['#ffd24a', '#4a6a8a']], w8: 2 },
    { id: 'pen', name: 'Dolma Kalem', draw: 'pen', w: 20, h: 10, val: [200, 1600], kg: 0.05, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...STU, 'master', 'office', 'cashier'], pal: [['#1a1a1a', '#ffd24a'], ['#8a1b2a', '#ffd24a'], ['#1b3a8a', '#c0c4cc']], w8: 2 },
    { id: 'lighter', name: 'Zippo Çakmak', draw: 'lighter', w: 10, h: 16, val: [150, 600], kg: 0.1, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: [...LIV, 'study', 'master', 'office', 'security'], pal: [['#c0c4cc'], ['#ffd24a'], ['#1a1a1a']], w8: 1.5 },
    { id: 'medal', name: 'Madalya', draw: 'medal', w: 14, h: 22, val: [300, 2500], kg: 0.15, mat: 'metal', small: true, place: ['shelf'], rooms: [...STU, 'living', 'hall', 'trophy', 'office'], pal: [['#ffd24a', '#e8283c'], ['#c0c4cc', '#2a5db0'], ['#c9733a', '#3a8f4a']], w8: 1.2 },
    { id: 'stamps', name: 'Pul Koleksiyonu', draw: 'stamps', w: 20, h: 16, val: [400, 3500], kg: 0.1, mat: 'paper', small: true, place: ['shelf'], rooms: [...STU, 'vault'], pal: [['#e8283c', '#2a5db0', '#3a8f4a']], w8: 1 },
    { id: 'ruby', name: 'Yakut', draw: 'gem', w: 12, h: 12, val: [3000, 7000], kg: 0.02, mat: 'glass', small: true, place: ['shelf', 'table'], rooms: ['treasure', 'master', 'study', 'showroom', 'vault'], pal: [['#e8283c']], w8: 0.6 },
    { id: 'emerald', name: 'Zümrüt', draw: 'gem', w: 12, h: 12, val: [3000, 7500], kg: 0.02, mat: 'glass', small: true, place: ['shelf', 'table'], rooms: ['treasure', 'master', 'study', 'showroom', 'vault'], pal: [['#3ddc84']], w8: 0.6 },
    { id: 'sapphire', name: 'Safir', draw: 'gem', w: 12, h: 12, val: [3000, 7000], kg: 0.02, mat: 'glass', small: true, place: ['shelf', 'table'], rooms: ['treasure', 'master', 'study', 'showroom', 'vault'], pal: [['#4aa8ff']], w8: 0.6 },
    { id: 'diamond', name: 'Elmas', draw: 'gem', w: 12, h: 12, val: [8000, 16000], kg: 0.02, mat: 'glass', small: true, place: ['shelf'], rooms: ['treasure', 'showroom', 'vault'], pal: [['#e8f5ff']], w8: 0.4 },
    { id: 'cash_tl', name: 'Tomar Nakit', draw: 'cash', w: 22, h: 14, val: [500, 3000], kg: 0.2, mat: 'paper', small: true, place: ['shelf', 'table'], rooms: [...BED, 'study', 'kitchen', 'treasure', 'vault', 'office', 'cashier'], pal: [P.cash[0]], w8: 1.5 },
    { id: 'cash_usd', name: 'Dolar Destesi', draw: 'cash', w: 22, h: 14, val: [2500, 7000], kg: 0.2, mat: 'paper', small: true, place: ['shelf'], rooms: ['master', 'study', 'treasure', 'vault', 'cashier'], pal: [P.cash[1]], w8: 0.8 },
    { id: 'cash_eur', name: 'Euro Destesi', draw: 'cash', w: 22, h: 14, val: [2500, 7500], kg: 0.2, mat: 'paper', small: true, place: ['shelf'], rooms: ['master', 'study', 'treasure', 'vault', 'cashier'], pal: [P.cash[2]], w8: 0.8 },
    { id: 'cigar_box', name: 'Puro Kutusu', draw: 'cigarbox', w: 24, h: 14, val: [600, 2400], kg: 0.6, mat: 'wood', small: true, place: ['shelf', 'table'], rooms: [...STU, 'living', 'game', 'office'], pal: [['#8a5a34', '#ffd24a'], ['#5b3a24', '#e8283c']], w8: 1 },
    { id: 'cartridge', name: 'Retro Oyun Kartuşu', draw: 'cartridge', w: 16, h: 18, val: [100, 1500], kg: 0.1, mat: 'plastic', small: true, place: ['shelf'], rooms: ['kids', 'game', 'bedroom', 'techshow'], pal: [['#8a8f99', '#e8283c'], ['#2a2d3e', '#ffd24a'], ['#c0c4cc', '#4aa8ff']], w8: 2 },
    { id: 'figurine', name: 'Koleksiyon Figürü', draw: 'figurine', w: 14, h: 22, val: [100, 1200], kg: 0.2, mat: 'plastic', small: true, place: ['shelf'], rooms: ['kids', 'game', 'bedroom', 'study', 'trophy'], pal: P.toy, w8: 3 },
    { id: 'prayer_beads', name: 'Kehribar Tespih', draw: 'beads', w: 16, h: 20, val: [400, 3000], kg: 0.1, mat: 'soft', small: true, place: ['shelf', 'table'], rooms: [...LIV, 'study', 'master', 'showroom'], pal: [['#e0902a', '#8a1b2a'], ['#3a1a1a', '#ffd24a'], ['#2a5db0', '#c0c4cc']], w8: 1.5 },
    { id: 'evil_eye', name: 'Nazar Boncuğu', draw: 'evileye', w: 14, h: 14, val: [15, 60], kg: 0.05, mat: 'glass', small: true, fragile: 0.6, place: ['shelf', 'table', 'wall'], rooms: '*', pal: [['#1c4fd1']], w8: 2 },
    { id: 'car_key', name: 'Araba Anahtarı', draw: 'keyitem', w: 18, h: 10, val: [300, 800], kg: 0.05, mat: 'metal', small: true, place: ['table', 'shelf'], rooms: ['hall', 'living', 'kitchen'], pal: [['#c0c4cc']], w8: 1 },

    // --- Elektronik ---
    { id: 'laptop', name: 'Dizüstü Bilgisayar', draw: 'laptop', w: 34, h: 24, val: [3000, 9000], kg: 2, mat: 'electronic', place: ['table', 'shelf'], rooms: [...STU, 'bedroom', 'kids', 'living', 'master', 'office', 'security', 'techshow'], pal: [['#c0c4cc', '#4aa8ff'], ['#2a2d3e', '#b467ff'], ['#e6e6e6', '#3ddc84']], w8: 2 },
    { id: 'tablet', name: 'Tablet', draw: 'tablet', w: 22, h: 28, val: [1500, 4500], kg: 0.5, mat: 'glass', small: true, place: ['table', 'shelf'], rooms: [...BED, 'kids', 'living', 'study', 'techshow'], pal: [['#1a1a1a', '#4aa8ff'], ['#c0c4cc', '#b467ff']], w8: 2 },
    { id: 'console', name: 'Oyun Konsolu', draw: 'console', w: 34, h: 22, val: [2500, 6500], kg: 3, mat: 'electronic', place: ['table', 'shelf', 'floor'], rooms: ['living', 'kids', 'game', 'bedroom', 'trophy', 'techshow'], pal: [['#1a1a1a', '#4aa8ff'], ['#f5f5f5', '#1a1a1a']], w8: 1.5 },
    { id: 'gamepad', name: 'Oyun Kolu', draw: 'gamepad', w: 22, h: 14, val: [300, 900], kg: 0.3, mat: 'plastic', small: true, place: ['table', 'shelf'], rooms: ['living', 'kids', 'game', 'bedroom', 'trophy', 'techshow'], pal: [['#1a1a1a'], ['#f5f5f5'], ['#e8283c']], w8: 2.5 },
    { id: 'camera', name: 'Fotoğraf Makinesi', draw: 'camera', w: 26, h: 20, val: [2000, 8000], kg: 0.8, mat: 'electronic', small: true, place: ['table', 'shelf'], rooms: [...STU, 'bedroom', 'living', 'master', 'techshow'], pal: [['#1a1a1a', '#4aa8ff'], ['#c0c4cc', '#3ddc84']], w8: 1.5 },
    { id: 'drone', name: 'Drone', draw: 'drone', w: 34, h: 20, val: [3000, 9000], kg: 1.2, mat: 'electronic', place: ['table', 'shelf', 'floor'], rooms: ['kids', 'game', 'study', 'storage', 'techshow'], pal: [['#e6e6e6'], ['#2a2d3e']], w8: 1 },
    { id: 'speaker', name: 'Bluetooth Hoparlör', draw: 'speaker', w: 20, h: 30, val: [600, 2500], kg: 1.5, mat: 'electronic', place: ['table', 'shelf', 'floor'], rooms: ['living', 'kids', 'bedroom', 'game', 'music', 'trophy', 'techshow'], pal: [['#2a2d3e', '#e8283c'], ['#c0c4cc', '#4aa8ff']], w8: 2 },
    { id: 'radio', name: 'Nostaljik Radyo', draw: 'radio', w: 32, h: 24, val: [250, 1800], kg: 2.5, mat: 'wood', place: ['table', 'shelf'], rooms: ['kitchen', 'living', 'study', 'workshop', 'security', 'techshow'], pal: [['#8a5a34', '#ffd24a'], ['#c23a2b', '#e6e6e6']], w8: 1.5 },
    { id: 'turntable', name: 'Pikap', draw: 'turntable', w: 38, h: 22, val: [1500, 5000], kg: 5, mat: 'electronic', place: ['table', 'shelf'], rooms: ['living', 'music', 'study', 'techshow'], pal: [['#5b3a24'], ['#1a1a1a']], w8: 1 },
    { id: 'record', name: 'Plak', draw: 'record', w: 22, h: 22, val: [60, 1500], kg: 0.3, mat: 'paper', small: true, place: ['shelf'], rooms: ['living', 'music', 'study', 'library'], pal: [['#e8283c', '#ffd24a'], ['#2a5db0', '#e8e0c8'], ['#1a1a1a', '#e8283c'], ['#ffd24a', '#8a1b2a']], w8: 3 },
    { id: 'tv', name: 'Televizyon', draw: 'tv', w: 70, h: 48, val: [4000, 12000], kg: 14, mat: 'glass', fragile: 0.6, place: ['table', 'floor'], rooms: ['living', 'master', 'game', 'bedroom', 'trophy', 'techshow'], pal: [['#1a1a1a'], ['#2a2d3e']], w8: 1 },
    { id: 'monitor', name: 'Monitör', draw: 'monitor', w: 44, h: 36, val: [1500, 5000], kg: 5, mat: 'glass', fragile: 0.4, place: ['table'], rooms: ['study', 'game', 'kids', 'bedroom', 'office', 'security', 'techshow'], pal: [['#1a1a1a', '#4aa8ff'], ['#e6e6e6', '#b467ff']], w8: 1.5 },
    { id: 'pc', name: 'Oyun Bilgisayarı', draw: 'pctower', w: 24, h: 42, val: [5000, 15000], kg: 10, mat: 'electronic', place: ['floor', 'table'], rooms: ['study', 'game', 'kids', 'bedroom', 'techshow'], pal: [['#1a1a1a', '#b467ff', '#4aa8ff'], ['#e6e6e6', '#3ddc84', '#e8283c']], w8: 1 },
    { id: 'keyboard', name: 'Mekanik Klavye', draw: 'keyboard', w: 38, h: 12, val: [300, 1500], kg: 1, mat: 'plastic', place: ['table'], rooms: ['study', 'game', 'kids', 'office', 'security', 'techshow'], pal: [['#1a1a1a', '#555'], ['#e6e6e6', '#bbb']], w8: 1.5 },
    { id: 'microwave', name: 'Mikrodalga Fırın', draw: 'microwave', w: 44, h: 28, val: [800, 2200], kg: 12, mat: 'electronic', place: ['table'], rooms: ['kitchen', 'techshow'], pal: P.appliance, w8: 1 },
    { id: 'toaster', name: 'Tost Makinesi', draw: 'toaster', w: 28, h: 22, val: [200, 900], kg: 2, mat: 'metal', place: ['table'], rooms: ['kitchen', 'techshow'], pal: [['#c0c4cc'], ['#e8283c'], ['#f5f0e0']], w8: 1.5 },
    { id: 'coffee_machine', name: 'Espresso Makinesi', draw: 'coffee', w: 28, h: 34, val: [1500, 6000], kg: 7, mat: 'metal', place: ['table'], rooms: ['kitchen', 'study', 'office', 'security', 'techshow'], pal: [['#c0c4cc'], ['#1a1a1a'], ['#e8283c']], w8: 1 },
    { id: 'blender', name: 'Blender', draw: 'blender', w: 20, h: 34, val: [300, 1200], kg: 2, mat: 'glass', fragile: 0.5, place: ['table'], rooms: ['kitchen', 'techshow'], pal: [['#e6e6e6', '#ff8c2e'], ['#1a1a1a', '#e8283c']], w8: 1.5 },
    { id: 'hairdryer', name: 'Saç Kurutma Makinesi', draw: 'hairdryer', w: 26, h: 24, val: [200, 1500], kg: 0.8, mat: 'plastic', small: true, place: ['table', 'shelf'], rooms: ['bathroom', 'dressing', 'bedroom', 'techshow'], pal: [['#e8a0c0'], ['#1a1a1a'], ['#e6e6e6']], w8: 1.5 },
    { id: 'vr', name: 'VR Gözlük', draw: 'vr', w: 26, h: 16, val: [2500, 7000], kg: 0.6, mat: 'electronic', small: true, place: ['table', 'shelf'], rooms: ['game', 'kids', 'living', 'trophy', 'techshow'], pal: [['#f5f5f5', '#222'], ['#1a1a1a', '#4aa8ff']], w8: 1 },
    { id: 'projector', name: 'Projeksiyon', draw: 'projector', w: 30, h: 20, val: [2000, 6000], kg: 3, mat: 'electronic', place: ['table', 'shelf'], rooms: ['living', 'game', 'study', 'techshow'], pal: [['#e6e6e6'], ['#2a2d3e']], w8: 0.8 },

    // --- Dekor / antika ---
    { id: 'vase', name: 'Seramik Vazo', draw: 'vase', w: 22, h: 34, val: [150, 900], kg: 1.5, mat: 'ceramic', fragile: 1, place: ['table', 'shelf', 'floor'], rooms: '*', pal: P.vase, w8: 3 },
    { id: 'ming_vase', name: 'Çin Vazosu', draw: 'vase', w: 28, h: 48, val: [6000, 20000], kg: 3, mat: 'ceramic', fragile: 1, place: ['table', 'floor'], rooms: ['living', 'hall', 'library', 'treasure', 'master', 'gallery', 'exhibit'], pal: [['#f0ece0', '#2a5db0', '#2a5db0']], w8: 0.6 },
    { id: 'floor_vase', name: 'Büyük Yer Vazosu', draw: 'vase', w: 36, h: 64, val: [800, 3500], kg: 6, mat: 'ceramic', fragile: 1, place: ['floor'], rooms: [...LIV, 'hall', 'master', 'gallery', 'lobby'], pal: P.vase, w8: 1 },
    { id: 'potplant', name: 'Saksı Çiçek', draw: 'potplant', w: 26, h: 34, val: [40, 250], kg: 3, mat: 'ceramic', fragile: 1, place: ['table', 'shelf', 'floor'], rooms: '*', pal: P.pot, w8: 4 },
    { id: 'big_plant', name: 'Büyük Saksı', draw: 'potplant', w: 40, h: 60, val: [150, 600], kg: 12, mat: 'ceramic', fragile: 1, place: ['floor'], rooms: [...LIV, 'hall', 'study', 'master', 'lobby'], pal: P.pot, w8: 1.5 },
    { id: 'cactus', name: 'Kaktüs', draw: 'cactus', w: 18, h: 26, val: [30, 180], kg: 1, mat: 'ceramic', fragile: 1, place: ['table', 'shelf'], rooms: '*', pal: [['#c46a3a', '#3a8f4a', '#ff6fae'], ['#e8e0c8', '#4a9a5a', '#ffd24a']], w8: 2 },
    { id: 'orchid', name: 'Orkide', draw: 'potplant', w: 20, h: 32, val: [120, 500], kg: 1, mat: 'ceramic', fragile: 1, place: ['table', 'shelf'], rooms: [...LIV, ...BED, 'bathroom', 'lobby'], pal: [['#f5f5f5', '#2d7a3e', '#e8a0e0'], ['#2a2d3e', '#3a8f4a', '#fff']], w8: 1.5 },
    { id: 'bonsai', name: 'Bonsai', draw: 'bonsai', w: 30, h: 30, val: [800, 4000], kg: 4, mat: 'ceramic', fragile: 1, place: ['table', 'shelf'], rooms: ['study', 'living', 'library'], pal: [['#2a4d8f', '#3a8f4a'], ['#8a3a2a', '#2d7a3e']], w8: 0.8 },
    { id: 'bust', name: 'Mermer Büst', draw: 'bust', w: 30, h: 42, val: [2500, 9000], kg: 18, mat: 'stone', fragile: 0.3, place: ['table', 'floor'], rooms: ['library', 'study', 'hall', 'treasure', 'living', 'gallery', 'exhibit', 'lobby'], pal: P.stone, w8: 0.8 },
    { id: 'painting_s', name: 'Küçük Tablo', draw: 'painting', w: 34, h: 28, val: [200, 2000], kg: 2, mat: 'wood', place: ['wall'], rooms: '*', pal: P.painting, w8: 4 },
    { id: 'painting_l', name: 'Yağlı Boya Tablo', draw: 'painting', w: 64, h: 48, val: [2000, 12000], kg: 6, mat: 'wood', place: ['wall'], rooms: [...LIV, 'master', 'library', 'study', 'hall', 'treasure', 'gallery', 'exhibit', 'lobby'], pal: P.painting, w8: 1.5 },
    { id: 'masterpiece', name: 'Ünlü Başyapıt', draw: 'painting', w: 56, h: 70, val: [20000, 45000], kg: 8, mat: 'wood', place: ['wall'], rooms: ['treasure', 'library', 'master', 'gallery', 'exhibit'], pal: [P.painting[2], P.painting[5]], w8: 0.25 },
    { id: 'wall_clock', name: 'Duvar Saati', draw: 'clock', w: 28, h: 28, val: [80, 700], kg: 1.5, mat: 'glass', fragile: 0.5, place: ['wall'], rooms: '*', pal: [['#5b3a24'], ['#1a1a1a'], ['#b8861a']], w8: 2 },
    { id: 'desk_clock', name: 'Masa Saati', draw: 'deskclock', w: 24, h: 22, val: [150, 1500], kg: 1, mat: 'wood', place: ['table', 'shelf'], rooms: [...STU, ...BED, 'living', 'office'], pal: [['#8a5a34'], ['#b8861a'], ['#1a1a1a']], w8: 1.5 },
    { id: 'candlestick', name: 'Gümüş Şamdan', draw: 'candlestick', w: 26, h: 34, val: [900, 3500], kg: 2, mat: 'metal', place: ['table', 'shelf'], rooms: ['dining', 'living', 'library', 'treasure', 'gallery', 'exhibit'], pal: [['#d9dde6'], ['#ffd24a']], w8: 1.2 },
    { id: 'table_lamp', name: 'Abajur', draw: 'lamp', w: 24, h: 36, val: [100, 700], kg: 2, mat: 'glass', fragile: 0.5, place: ['table'], rooms: [...BED, 'living', 'study'], pal: [['#b8861a', '#f5e0b0'], ['#1a1a1a', '#e8283c'], ['#c0c4cc', '#f0f0f0']], w8: 1.5 },
    { id: 'trophy', name: 'Kupa', draw: 'trophy', w: 22, h: 30, val: [100, 1200], kg: 1.5, mat: 'metal', place: ['shelf', 'table'], rooms: ['kids', 'study', 'game', 'living', 'hall', 'trophy', 'office'], pal: [['#ffd24a'], ['#c0c4cc'], ['#c9733a']], w8: 1.5 },
    { id: 'teacup', name: 'Porselen Fincan', draw: 'teacup', w: 18, h: 14, val: [40, 350], kg: 0.2, mat: 'ceramic', fragile: 1, small: true, place: ['table', 'shelf'], rooms: [...KIT, 'living'], pal: P.ceramic, w8: 3 },
    { id: 'plate', name: 'Porselen Tabak', draw: 'plate', w: 24, h: 24, val: [60, 500], kg: 0.5, mat: 'ceramic', fragile: 1, place: ['shelf', 'table'], rooms: KIT, pal: P.ceramic, w8: 3 },
    { id: 'tile_plate', name: 'İznik Çini Tabak', draw: 'tileplate', w: 26, h: 26, val: [800, 4000], kg: 0.8, mat: 'ceramic', fragile: 1, place: ['shelf', 'wall'], rooms: [...LIV, 'dining', 'library', 'hall', 'gallery', 'exhibit'], pal: P.tile, w8: 1 },
    { id: 'silver_tray', name: 'Gümüş Tepsi', draw: 'tray', w: 34, h: 12, val: [700, 2500], kg: 1.5, mat: 'metal', place: ['table', 'shelf'], rooms: ['dining', 'kitchen', 'living'], pal: [['#d9dde6'], ['#ffd24a']], w8: 1 },
    { id: 'wine_glass', name: 'Kristal Kadeh', draw: 'glass', w: 12, h: 20, val: [80, 450], kg: 0.2, mat: 'glass', fragile: 1, small: true, place: ['shelf', 'table'], rooms: ['dining', 'kitchen', 'living', 'wine'], pal: P.glass, w8: 2.5 },
    { id: 'wine', name: 'Şarap Şişesi', draw: 'bottle', w: 12, h: 32, val: [150, 1200], kg: 1.2, mat: 'glass', fragile: 1, place: ['shelf', 'table'], rooms: ['kitchen', 'dining', 'wine', 'living'], pal: P.wine, w8: 3 },
    { id: 'vintage_wine', name: 'Yıllanmış Şarap', draw: 'bottle', w: 12, h: 32, val: [1500, 7000], kg: 1.2, mat: 'glass', fragile: 1, place: ['shelf'], rooms: ['wine', 'treasure'], pal: [P.wine[1]], w8: 1 },
    { id: 'whisky', name: 'Viski', draw: 'bottle', w: 14, h: 28, val: [600, 3500], kg: 1.2, mat: 'glass', fragile: 1, place: ['shelf', 'table'], rooms: ['living', 'study', 'game', 'wine'], pal: [P.wine[3]], w8: 1.5 },
    { id: 'book', name: 'Kitap', draw: 'book', w: 8, h: 26, val: [5, 60], kg: 0.5, mat: 'paper', small: true, place: ['shelf'], rooms: '*', pal: P.book, w8: 8 },
    { id: 'rare_book', name: 'Nadir El Yazması', draw: 'book', w: 10, h: 28, val: [1500, 8000], kg: 0.7, mat: 'paper', small: true, place: ['shelf'], rooms: ['library', 'study', 'treasure', 'vault', 'exhibit'], pal: [['#5b3a24', '#ffd24a'], ['#3a1b1b', '#ffd24a']], w8: 0.6 },
    { id: 'bookset', name: 'Ansiklopedi Seti', draw: 'bookset', w: 36, h: 26, val: [100, 700], kg: 5, mat: 'paper', place: ['shelf'], rooms: [...STU, 'living', 'kids', 'office'], pal: P.books, w8: 2 },
    { id: 'rug', name: 'Rulo Halı', draw: 'rug', w: 60, h: 22, val: [600, 5000], kg: 12, mat: 'soft', place: ['floor'], rooms: [...LIV, 'master', 'storage'], pal: P.rug, w8: 1 },
    { id: 'kilim', name: 'El Dokuma Kilim', draw: 'rug', w: 56, h: 20, val: [1500, 8000], kg: 8, mat: 'soft', place: ['floor'], rooms: ['living', 'hall', 'treasure', 'storage'], pal: P.fur, w8: 0.6 },
    { id: 'guitar', name: 'Gitar', draw: 'guitar', w: 26, h: 62, val: [800, 6000], kg: 3, mat: 'wood', place: ['floor'], rooms: ['music', 'bedroom', 'kids', 'living', 'game'], pal: P.instrument, w8: 1.2 },
    { id: 'violin', name: 'Keman', draw: 'violin', w: 20, h: 42, val: [1500, 12000], kg: 0.8, mat: 'wood', place: ['table', 'shelf'], rooms: ['music', 'library', 'living', 'gallery'], pal: [['#a0522d'], ['#8a3a1a']], w8: 0.8 },
    { id: 'sax', name: 'Saksafon', draw: 'sax', w: 22, h: 50, val: [3000, 9000], kg: 3, mat: 'metal', place: ['floor', 'table'], rooms: ['music', 'living'], pal: P.brass, w8: 0.6 },
    { id: 'trumpet', name: 'Trompet', draw: 'trumpet', w: 36, h: 18, val: [1200, 4000], kg: 1.5, mat: 'metal', place: ['table', 'shelf'], rooms: ['music', 'kids'], pal: P.brass, w8: 0.8 },
    { id: 'drum', name: 'Trampet', draw: 'drum', w: 34, h: 26, val: [500, 2500], kg: 4, mat: 'wood', place: ['floor'], rooms: ['music', 'kids', 'game'], pal: [['#e8283c', '#c0c4cc'], ['#2a5db0', '#c0c4cc']], w8: 0.8 },
    { id: 'saz', name: 'Bağlama', draw: 'saz', w: 22, h: 56, val: [800, 4500], kg: 1.5, mat: 'wood', place: ['floor', 'wall'], rooms: ['living', 'music', 'hall'], pal: [['#a0522d'], ['#6b3a1a']], w8: 1 },
    { id: 'darbuka', name: 'Darbuka', draw: 'darbuka', w: 24, h: 32, val: [300, 1500], kg: 2, mat: 'metal', place: ['floor', 'shelf'], rooms: ['living', 'music'], pal: [['#c9733a', '#ffd24a'], ['#c0c4cc', '#8a1b2a']], w8: 0.8 },
    { id: 'teddy', name: 'Oyuncak Ayı', draw: 'teddy', w: 22, h: 26, val: [20, 300], kg: 0.4, mat: 'soft', place: ['shelf', 'table', 'floor'], rooms: ['kids', 'bedroom'], pal: P.teddy, w8: 2.5 },
    { id: 'toycar', name: 'Uzaktan Kumandalı Araba', draw: 'toycar', w: 28, h: 16, val: [150, 900], kg: 0.8, mat: 'plastic', place: ['shelf', 'floor', 'table'], rooms: ['kids', 'game'], pal: P.toy, w8: 2 },
    { id: 'bricks', name: 'Yapı Taşı Seti', draw: 'bricks', w: 24, h: 18, val: [200, 2500], kg: 1, mat: 'plastic', small: true, place: ['shelf', 'table', 'floor'], rooms: ['kids', 'game'], pal: P.toy, w8: 2 },
    { id: 'robot', name: 'Robot Oyuncak', draw: 'robot', w: 22, h: 30, val: [200, 1500], kg: 1, mat: 'plastic', place: ['shelf', 'table'], rooms: ['kids', 'game'], pal: [['#c0c4cc', '#4aa8ff'], ['#e8283c', '#ffd24a']], w8: 1.5 },
    { id: 'globe', name: 'Antika Küre', draw: 'globe', w: 26, h: 34, val: [400, 3000], kg: 2, mat: 'wood', place: ['table', 'shelf'], rooms: [...STU, 'kids', 'gallery', 'exhibit'], pal: [['#4a8fc0', '#c9b87a'], ['#2a4d8f', '#e8d9a8']], w8: 1 },
    { id: 'telescope', name: 'Teleskop', draw: 'telescope', w: 36, h: 44, val: [1500, 5500], kg: 5, mat: 'metal', place: ['floor'], rooms: ['study', 'library', 'kids', 'exhibit'], pal: [['#e6e6e6', '#1a1a1a'], ['#b8861a', '#5b3a24']], w8: 0.6 },
    { id: 'typewriter', name: 'Daktilo', draw: 'typewriter', w: 34, h: 24, val: [400, 2500], kg: 6, mat: 'metal', place: ['table'], rooms: [...STU, 'storage', 'exhibit'], pal: [['#1a1a1a'], ['#2d5a3a'], ['#8a1b2a']], w8: 0.8 },
    { id: 'gramophone', name: 'Gramofon', draw: 'gramophone', w: 30, h: 38, val: [1500, 7000], kg: 5, mat: 'wood', fragile: 0.3, place: ['table', 'floor'], rooms: ['living', 'music', 'library', 'treasure', 'gallery', 'exhibit'], pal: [['#5b3a24', '#ffd24a'], ['#3a1b1b', '#c9733a']], w8: 0.6 },
    { id: 'jewelbox', name: 'Mücevher Kutusu', draw: 'jewelbox', w: 24, h: 20, val: [1500, 6000], kg: 0.8, mat: 'wood', small: true, place: ['table', 'shelf'], rooms: ['master', 'dressing', 'bedroom', 'treasure', 'showroom', 'vault'], pal: [['#8a1b2a', '#ffd24a', '#3ddc84'], ['#1b3a8a', '#c0c4cc', '#e8283c']], w8: 1 },
    { id: 'musicbox', name: 'Müzik Kutusu', draw: 'musicbox', w: 22, h: 20, val: [300, 1500], kg: 0.6, mat: 'wood', small: true, place: ['table', 'shelf'], rooms: ['bedroom', 'kids', 'master', 'dressing'], pal: [['#e8a0c0', '#ffd24a'], ['#8a5a34', '#ffd24a']], w8: 1.2 },
    { id: 'mirror', name: 'Antika Ayna', draw: 'mirror', w: 32, h: 44, val: [500, 3500], kg: 5, mat: 'glass', fragile: 1, place: ['wall'], rooms: [...BED, 'bathroom', 'hall', 'gallery'], pal: [['#b8861a'], ['#5b3a24'], ['#c0c4cc']], w8: 1.5 },
    { id: 'sword', name: 'Osmanlı Kılıcı', draw: 'sword', w: 60, h: 18, val: [3000, 12000], kg: 2, mat: 'metal', place: ['wall'], rooms: ['library', 'study', 'hall', 'treasure', 'living', 'gallery', 'exhibit'], pal: [['#d9dde6', '#ffd24a']], w8: 0.6 },
    { id: 'tribal_mask', name: 'Afrika Maskesi', draw: 'mask', w: 22, h: 32, val: [300, 2500], kg: 1, mat: 'wood', place: ['wall'], rooms: ['living', 'study', 'hall', 'library', 'gallery', 'exhibit'], pal: [['#8a5a34', '#ffd24a'], ['#3a1b1b', '#e8e0c8']], w8: 1 },
    { id: 'elephant', name: 'Fil Heykelciği', draw: 'elephant', w: 26, h: 20, val: [150, 1200], kg: 1, mat: 'stone', place: ['shelf', 'table'], rooms: [...LIV, 'study', 'gallery', 'exhibit'], pal: [['#8a8f99', '#ffd24a'], ['#e8e0c8', '#e8283c']], w8: 1.5 },
    { id: 'cat_statue', name: 'Mısır Kedisi', draw: 'catstatue', w: 20, h: 32, val: [800, 5000], kg: 2, mat: 'stone', fragile: 0.4, place: ['shelf', 'table'], rooms: ['library', 'study', 'treasure', 'living', 'gallery', 'exhibit'], pal: [['#1a1a1a', '#ffd24a'], ['#c9a24a', '#2a5db0']], w8: 0.7 },
    { id: 'matryoshka', name: 'Matruşka', draw: 'matryoshka', w: 16, h: 26, val: [60, 400], kg: 0.4, mat: 'wood', small: true, place: ['shelf', 'table'], rooms: ['living', 'kids', 'bedroom'], pal: P.fur, w8: 1.5 },
    { id: 'fishbowl', name: 'Akvaryum Kavanozu', draw: 'fishbowl', w: 30, h: 28, val: [50, 300], kg: 4, mat: 'glass', fragile: 1, place: ['table'], rooms: ['living', 'kids'], pal: P.fish, w8: 0.8 },
    { id: 'birdcage', name: 'Kuş Kafesi', draw: 'birdcage', w: 26, h: 38, val: [100, 700], kg: 2, mat: 'metal', place: ['table', 'floor'], rooms: ['living', 'kitchen'], pal: P.birds, w8: 0.6 },
    { id: 'chess', name: 'Fildişi Satranç', draw: 'chessset', w: 30, h: 22, val: [600, 4000], kg: 2, mat: 'wood', place: ['table', 'shelf'], rooms: [...STU, 'living', 'game'], pal: [['#f0e8d0', '#1a1a1a']], w8: 1 },
    { id: 'diploma', name: 'Çerçeveli Diploma', draw: 'diploma', w: 30, h: 24, val: [10, 80], kg: 1, mat: 'glass', fragile: 0.5, place: ['wall'], rooms: ['study', 'hall', 'office'], pal: [['#1a1a1a'], ['#5b3a24']], w8: 1.5 },
    { id: 'hookah', name: 'Nargile', draw: 'hookah', w: 26, h: 44, val: [300, 1500], kg: 3, mat: 'glass', fragile: 0.8, place: ['floor', 'table'], rooms: ['living', 'game', 'storage'], pal: [['#4a8fc0', '#c0c4cc'], ['#8a1b2a', '#ffd24a']], w8: 0.8 },
    { id: 'horn', name: 'Av Borusu', draw: 'horn', w: 30, h: 20, val: [200, 900], kg: 1, mat: 'metal', place: ['wall'], rooms: ['hall', 'study', 'library'], pal: P.brass, w8: 0.6 },

    // --- Galeri / spor / lüks ---
    { id: 'jersey', name: 'İmzalı Forma', draw: 'jersey', w: 40, h: 46, val: [2500, 12000], kg: 0.6, mat: 'soft', place: ['wall'], rooms: ['trophy', 'game', 'kids', 'living'], pal: [['#1f7a4a', '#ffffff', '10'], ['#e8283c', '#ffd24a', '9'], ['#2a4d8f', '#ffffff', '7'], ['#ffd24a', '#1a3a8a', '11']], w8: 1.2 },
    { id: 'golden_ball', name: 'Altın Top Ödülü', draw: 'goldenball', w: 26, h: 36, val: [25000, 60000], kg: 4, mat: 'metal', place: ['shelf', 'table'], rooms: ['trophy', 'treasure'], pal: [['#ffd24a']], w8: 0.35 },
    { id: 'cup_big', name: 'Şampiyonluk Kupası', draw: 'trophy', w: 30, h: 44, val: [6000, 20000], kg: 5, mat: 'metal', place: ['shelf', 'table', 'floor'], rooms: ['trophy', 'treasure'], pal: [['#ffd24a'], ['#d9dde6']], w8: 0.8 },
    { id: 'sculpture', name: 'Modern Heykel', draw: 'sculpture', w: 28, h: 50, val: [8000, 30000], kg: 12, mat: 'stone', fragile: 0.35, place: ['table', 'floor'], rooms: ['gallery', 'treasure', 'living', 'hall', 'exhibit'], pal: [['#c0c4cc', '#e8283c'], ['#1a1a1a', '#ffd24a'], ['#e8e4dc', '#2a5db0']], w8: 0.7 },
    { id: 'faberge', name: 'Fabergé Yumurtası', draw: 'egg', w: 16, h: 22, val: [30000, 80000], kg: 0.4, mat: 'ceramic', fragile: 1, small: true, place: ['shelf', 'table'], rooms: ['treasure', 'gallery', 'study', 'showroom', 'exhibit'], pal: [['#c23a55', '#ffd24a', '#e8f5ff'], ['#2a5db0', '#ffd24a', '#e8f5ff'], ['#3a8f6a', '#ffd24a', '#fff']], w8: 0.18 },
    { id: 'icon_painting', name: 'Antika İkona', draw: 'icon', w: 26, h: 34, val: [9000, 26000], kg: 1.5, mat: 'wood', place: ['wall', 'shelf'], rooms: ['gallery', 'library', 'treasure', 'study', 'exhibit'], pal: [['#b8861a', '#8a1b2a', '#e8c19a'], ['#b8861a', '#1b3a8a', '#e8c19a']], w8: 0.5 },
    { id: 'smartwatch', name: 'Akıllı Saat', draw: 'watch', w: 12, h: 18, val: [2000, 6000], kg: 0.1, mat: 'electronic', small: true, place: ['shelf', 'table'], rooms: ['bedroom', 'master', 'gym', 'trophy', 'study', 'showroom', 'office', 'techshow'], pal: [['#1a1a1a', '#1a1a1a'], ['#c0c4cc', '#e8e8ec']], w8: 1.2 },
    { id: 'dumbbell', name: 'Krom Dambıl', draw: 'dumbbell', w: 30, h: 14, val: [100, 600], kg: 10, mat: 'metal', place: ['floor', 'shelf'], rooms: ['gym', 'storage'], pal: [['#c0c4cc', '#2a2a30'], ['#e8283c', '#2a2a30']], w8: 2 },
    { id: 'caviar', name: 'Havyar Kutusu', draw: 'can', w: 16, h: 10, val: [1500, 4000], kg: 0.3, mat: 'metal', small: true, place: ['shelf'], rooms: ['kitchen', 'wine', 'dining'], pal: [['#1a2a5a', '#ffd24a']], w8: 0.6 },
    { id: 'hdd', name: 'Şifreli Sabit Disk', draw: 'hdd', w: 18, h: 12, val: [5000, 25000], kg: 0.2, mat: 'electronic', small: true, place: ['shelf', 'table'], rooms: ['study', 'treasure', 'library', 'vault', 'office'], pal: [['#2a2d3e', '#3ddc84'], ['#1a1a1a', '#e8283c']], w8: 0.5 },

    { id: 'gold_mask', name: 'Altın Firavun Maskesi', draw: 'goldmask', w: 26, h: 34, val: [60000, 140000], kg: 3, mat: 'metal', place: ['shelf', 'table'], rooms: ['exhibit', 'treasure'], pal: [['#ffd24a', '#1b3a8a', '#e8283c']], w8: 0.25 },
    { id: 'crown', name: 'Kraliyet Tacı', draw: 'crown', w: 24, h: 18, val: [80000, 180000], kg: 1.5, mat: 'metal', small: true, place: ['shelf', 'table'], rooms: ['treasure', 'exhibit'], pal: [['#ffd24a', '#e8283c', '#3ddc84']], w8: 0.18 },
    { id: 'amphora', name: 'Antik Amfora', draw: 'amphora', w: 22, h: 40, val: [9000, 30000], kg: 4, mat: 'ceramic', fragile: 1, place: ['table', 'floor', 'shelf'], rooms: ['exhibit', 'gallery'], pal: [['#c8743a', '#1a1a1a'], ['#b8643a', '#3a2a1a']], w8: 0.8 },
    { id: 'fossil', name: 'Amonit Fosili', draw: 'fossil', w: 20, h: 16, val: [2000, 9000], kg: 2, mat: 'stone', small: true, place: ['shelf', 'table'], rooms: ['exhibit', 'study'], pal: [['#b8a888', '#6a5a4a']], w8: 1 },
    { id: 'bond', name: 'Hazine Bonosu', draw: 'diploma', w: 24, h: 18, val: [15000, 40000], kg: 0.1, mat: 'paper', small: true, place: ['shelf'], rooms: ['vault', 'office'], pal: [['#3a6a4a']], w8: 0.5 },
    { id: 'calculator', name: 'Hesap Makinesi', draw: 'phone', w: 14, h: 18, val: [20, 120], kg: 0.2, mat: 'plastic', small: true, place: ['shelf', 'table'], rooms: ['cashier', 'office'], pal: [['#2a2d3e', '#9fd6a0', '#3a8f4a']], w8: 2 },

    // --- Mutfak ---
    { id: 'pot', name: 'Bakır Tencere', draw: 'pot', w: 30, h: 24, val: [100, 900], kg: 3, mat: 'metal', place: ['table', 'shelf'], rooms: ['kitchen'], pal: [...P.copper, ['#c0c4cc'], ['#e8283c']], w8: 2 },
    { id: 'pan', name: 'Döküm Tava', draw: 'pan', w: 34, h: 12, val: [50, 400], kg: 2.5, mat: 'metal', place: ['table', 'shelf'], rooms: ['kitchen'], pal: [['#2a2a2a'], ['#8a8f99']], w8: 2 },
    { id: 'knifeblock', name: 'Bıçak Seti', draw: 'knifeblock', w: 20, h: 26, val: [150, 1800], kg: 2, mat: 'wood', place: ['table'], rooms: ['kitchen'], pal: [['#8a5a34'], ['#1a1a1a']], w8: 1 },
    { id: 'teapot', name: 'Porselen Demlik', draw: 'teapot', w: 26, h: 24, val: [80, 700], kg: 1, mat: 'ceramic', fragile: 1, place: ['table', 'shelf'], rooms: [...KIT, 'living'], pal: P.ceramic, w8: 1.5 },
    { id: 'samovar', name: 'Bakır Semaver', draw: 'samovar', w: 28, h: 42, val: [800, 3500], kg: 6, mat: 'metal', place: ['table', 'floor'], rooms: ['kitchen', 'dining', 'living', 'storage'], pal: P.copper, w8: 0.6 },
    { id: 'cezve', name: 'Bakır Cezve', draw: 'cezve', w: 20, h: 14, val: [50, 300], kg: 0.4, mat: 'metal', small: true, place: ['table', 'shelf'], rooms: ['kitchen'], pal: P.copper, w8: 2 },
    { id: 'lokum', name: 'Lokum Kutusu', draw: 'lokum', w: 22, h: 14, val: [20, 120], kg: 0.5, mat: 'paper', small: true, place: ['table', 'shelf'], rooms: [...KIT, 'living'], pal: [['#e8283c'], ['#2a5db0']], w8: 1.5 },
    { id: 'can', name: 'Konserve', draw: 'can', w: 12, h: 16, val: [5, 30], kg: 0.4, mat: 'metal', small: true, place: ['shelf'], rooms: ['kitchen', 'storage'], pal: [['#c0c4cc', '#e8283c'], ['#c0c4cc', '#3a8f4a'], ['#c0c4cc', '#ffd24a']], w8: 4 },
    { id: 'jar', name: 'Reçel Kavanozu', draw: 'jar', w: 14, h: 18, val: [10, 60], kg: 0.6, mat: 'glass', fragile: 1, small: true, place: ['shelf'], rooms: ['kitchen', 'storage', 'wine'], pal: P.jar, w8: 3 },
    { id: 'bread', name: 'Somun Ekmek', draw: 'bread', w: 24, h: 14, val: [2, 10], kg: 0.3, mat: 'soft', small: true, place: ['table', 'shelf'], rooms: ['kitchen'], pal: P.food, w8: 1.5 },
    { id: 'cheese', name: 'Tulum Peyniri', draw: 'cheese', w: 22, h: 16, val: [30, 250], kg: 1, mat: 'soft', small: true, place: ['shelf', 'table'], rooms: ['kitchen', 'wine', 'storage'], pal: P.cheese, w8: 1 },

    // --- Tıbbi (Doktor evi için) ---
    { id: 'medkit', name: 'İlk Yardım Çantası', draw: 'medkit', w: 26, h: 22, val: [100, 500], kg: 1.5, mat: 'plastic', place: ['shelf', 'table'], rooms: ['bathroom', 'storage', 'study', 'security'], pal: [['#f5f5f5']], w8: 1 },
    { id: 'stethoscope', name: 'Steteskop', draw: 'stethoscope', w: 20, h: 22, val: [300, 1500], kg: 0.3, mat: 'metal', small: true, place: ['table', 'shelf'], rooms: ['study'], pal: [['#1a1a1a'], ['#2a4d8f']], w8: 0.8 },
    { id: 'microscope', name: 'Mikroskop', draw: 'microscope', w: 26, h: 36, val: [2500, 9000], kg: 4, mat: 'glass', fragile: 0.5, place: ['table'], rooms: ['study', 'storage', 'workshop'], pal: [['#e6e6e6'], ['#1a1a1a']], w8: 0.5 },

    // --- Atölye / depo / garaj ---
    { id: 'drill', name: 'Şarjlı Matkap', draw: 'drill', w: 28, h: 26, val: [300, 1500], kg: 2, mat: 'plastic', place: ['table', 'shelf', 'floor'], rooms: ['workshop', 'storage'], pal: [['#ffd24a'], ['#e8283c'], ['#2a8fd0']], w8: 2 },
    { id: 'toolbox', name: 'Alet Çantası', draw: 'toolbox', w: 34, h: 24, val: [150, 900], kg: 6, mat: 'metal', place: ['floor', 'shelf'], rooms: ['workshop', 'storage'], pal: [['#e8283c'], ['#2a5db0'], ['#3a8f4a']], w8: 1.5 },
    { id: 'bicycle', name: 'Yarış Bisikleti', draw: 'bicycle', w: 70, h: 44, val: [2000, 9000], kg: 9, mat: 'metal', place: ['floor'], rooms: ['storage', 'workshop', 'garden'], pal: [['#e8283c'], ['#2a5db0'], ['#1a1a1a']], w8: 0.8 },
    { id: 'skateboard', name: 'Kaykay', draw: 'skateboard', w: 40, h: 12, val: [150, 900], kg: 2, mat: 'wood', place: ['floor'], rooms: ['kids', 'storage', 'game', 'trophy'], pal: P.toy, w8: 1 },
    { id: 'bowling', name: 'Bovling Topu', draw: 'bowling', w: 22, h: 22, val: [100, 500], kg: 7, mat: 'stone', place: ['floor', 'shelf'], rooms: ['storage', 'game', 'trophy'], pal: [['#2a5db0'], ['#8a1b2a'], ['#1a1a1a']], w8: 0.8 },
    { id: 'racket', name: 'Tenis Raketi', draw: 'racket', w: 24, h: 44, val: [200, 1500], kg: 0.5, mat: 'plastic', place: ['floor', 'shelf'], rooms: ['storage', 'kids', 'game', 'trophy'], pal: [['#e8283c', '#1a1a1a'], ['#2a5db0', '#e6e6e6']], w8: 1 },
    { id: 'football', name: 'İmzalı Top', draw: 'ballsport', w: 22, h: 22, val: [50, 2500], kg: 0.4, mat: 'soft', place: ['floor', 'shelf'], rooms: ['kids', 'game', 'storage', 'trophy'], pal: [['#f5f5f5', '#1a1a1a'], ['#ffd24a', '#e8283c']], w8: 1.5 },
    { id: 'barrel', name: 'Meşe Şarap Fıçısı', draw: 'barrel', w: 36, h: 44, val: [600, 3000], kg: 25, mat: 'wood', place: ['floor'], rooms: ['wine'], pal: [['#8a5a34'], ['#6b4a2a']], w8: 1 },

    // --- Bahçe ---
    { id: 'gnome', name: 'Bahçe Cücesi', draw: 'gnome', w: 22, h: 32, val: [20, 250], kg: 3, mat: 'ceramic', fragile: 1, place: ['garden'], rooms: ['garden'], pal: P.garden, w8: 3 },
    { id: 'angel', name: 'Melek Heykeli', draw: 'angel', w: 34, h: 56, val: [1500, 6000], kg: 30, mat: 'stone', fragile: 0.3, place: ['garden'], rooms: ['garden'], pal: P.stone, w8: 0.7 },
    { id: 'grill', name: 'Mangal', draw: 'grill', w: 40, h: 36, val: [150, 900], kg: 10, mat: 'metal', place: ['garden'], rooms: ['garden'], pal: [['#1a1a1a'], ['#c23a2b']], w8: 0.8 },
    { id: 'mower', name: 'Çim Biçme Makinesi', draw: 'mower', w: 44, h: 38, val: [900, 3500], kg: 20, mat: 'metal', place: ['garden', 'floor'], rooms: ['garden', 'storage'], pal: [['#3a8f4a'], ['#e8283c']], w8: 0.6 },
    { id: 'garden_pot', name: 'Bahçe Saksısı', draw: 'potplant', w: 34, h: 44, val: [60, 400], kg: 10, mat: 'ceramic', fragile: 1, place: ['garden'], rooms: ['garden'], pal: P.pot, w8: 2 },
    { id: 'bronze_statue', name: 'Bronz Heykelcik', draw: 'bust', w: 26, h: 38, val: [2500, 8000], kg: 14, mat: 'metal', place: ['garden', 'table'], rooms: ['garden', 'library', 'treasure', 'gallery', 'exhibit'], pal: P.bronze, w8: 0.6 },
  ];

  /** Kasadan çıkan özel ganimet */
  /*
   * Kasa içeriği. tier: listeye girdiği en düşük bölüm indeksi.
   * market: değer piyasa (karaborsa alım) fiyatıdır; bölüm çarpanı ve nadirlik
   * çarpanı uygulanmaz. appraise: ekspertiz çarpanı (bkz. Item) değeri oynatır.
   * Değerler USD, karaborsa (fence) alım fiyatı: perakendenin kabaca %30-60'ı.
   */
  const SAFE_LOOT = [
    { id: 'safe_cash', name: 'Bantlı Nakit Deste', draw: 'cash', w: 24, h: 16, val: [6000, 15000], kg: 0.5, mat: 'paper', small: true, pal: P.cash, tier: 0, w8: 3 },
    { id: 'safe_gold', name: 'Kasa Altını', draw: 'goldbar', w: 26, h: 12, val: [14000, 22000], kg: 1, mat: 'metal', small: true, pal: [['#ffd24a']], tier: 0, w8: 2 },
    { id: 'safe_diamond', name: 'Kasa Elması', draw: 'gem', w: 14, h: 14, val: [12000, 26000], kg: 0.02, mat: 'glass', small: true, pal: [['#e8f5ff'], ['#e8283c'], ['#3ddc84']], tier: 0, w8: 2 },
    { id: 'family_necklace', name: 'Aile Yadigârı Kolye', draw: 'necklace', w: 22, h: 18, val: [18000, 32000], kg: 0.2, mat: 'metal', small: true, pal: [['#ffd24a', '#e8283c', '#fff']], tier: 0, w8: 1.5 },
    { id: 'deed', name: 'Tapu Senedi', draw: 'diploma', w: 26, h: 20, val: [8000, 16000], kg: 0.1, mat: 'paper', small: true, pal: [['#e8d9a8']], tier: 0, w8: 1.5 },
    // --- Üst düzey (bölüm 4+) ---
    { id: 'bearer_bonds', name: 'Hamiline Yazılı Tahvil', draw: 'diploma', w: 26, h: 20, val: [25000, 60000], kg: 0.2, mat: 'paper', small: true, pal: [['#cfe3c4']], tier: 3, w8: 1, market: true, appraise: true },
    { id: 'graded_watch', name: 'Sertifikalı Koleksiyon Saati', draw: 'watch', w: 14, h: 20, val: [40000, 140000], kg: 0.15, mat: 'metal', small: true, pal: [['#e6e6ea', '#0b2a4a'], ['#ffd24a', '#1a1a1a']], tier: 3, w8: 0.8, market: true, appraise: true },
    { id: 'fine_jewelry', name: 'Pırlanta Gerdanlık', draw: 'necklace', w: 22, h: 18, val: [30000, 110000], kg: 0.2, mat: 'metal', small: true, pal: [['#e8e8f0', '#bfe8ff', '#fff']], tier: 3, w8: 0.8, market: true, appraise: true },
    // --- Koleksiyon ve şifreli donanım (bölüm 7+) ---
    { id: 'graded_coin', name: 'Derecelendirilmiş Nadir Sikke', draw: 'coins', w: 14, h: 12, val: [20000, 120000], kg: 0.03, mat: 'metal', small: true, pal: [['#ffd24a'], ['#e6e6ea']], tier: 6, w8: 0.6, market: true, appraise: true },
    { id: 'cold_wallet', name: 'Şifreli Donanım Cüzdanı', draw: 'hdd', w: 18, h: 12, val: [40000, 300000], kg: 0.1, mat: 'electronic', small: true, pal: [['#1a1a1e', '#3ddc84', '#c0c4cc']], tier: 6, w8: 0.4, market: true, appraise: true },
    // --- Kurumsal kasalar (bölüm 11+) ---
    { id: 'gold_kilo', name: '1 kg Külçe Altın', draw: 'goldbar', w: 28, h: 13, val: [85000, 98000], kg: 1, mat: 'metal', small: true, pal: [['#ffcf3a']], tier: 10, w8: 0.9, market: true },
    { id: 'loose_diamonds', name: 'Sertifikalı Pırlanta Kesesi', draw: 'gem', w: 14, h: 14, val: [60000, 280000], kg: 0.05, mat: 'glass', small: true, pal: [['#f2fbff']], tier: 10, w8: 0.5, market: true, appraise: true },
  ];

  /** Bölüme göre kasadan çıkabilecek eşyalar */
  function safeLootFor(levelIndex) {
    return SAFE_LOOT.filter((d) => (d.tier || 0) <= levelIndex);
  }

  const KEY_ITEM = { id: 'safe_key', name: 'Kasa Anahtarı', draw: 'keyitem', w: 20, h: 12, val: [0, 0], kg: 0.05, mat: 'metal', small: true, isKey: true, pal: [['#ffd24a']] };

  // Varsayılan değerleri doldur
  const ALL = [...ITEMS, ...SAFE_LOOT, KEY_ITEM];
  for (const d of ALL) {
    d.fragile = d.fragile == null ? (d.mat === 'glass' || d.mat === 'ceramic' ? 0.9 : 0) : d.fragile;
    d.small = !!d.small;
    d.w8 = d.w8 || 1;
    d.pal = d.pal || [['#888', '#555', '#fff']];
    d.drawFn = DRAW[d.draw] || DRAW.book;
    if (!d.rooms) d.rooms = '*';
  }

  const BY_ID = {};
  for (const d of ALL) BY_ID[d.id] = d;

  /** Oda + yerleşim türüne uygun eşya listesini önbelleğe alır */
  const poolCache = new Map();
  function poolFor(room, place) {
    const key = room + '|' + place;
    let pool = poolCache.get(key);
    if (pool) return pool;
    pool = ITEMS.filter((d) => d.place.includes(place) && (d.rooms === '*' || d.rooms.includes(room)));
    poolCache.set(key, pool);
    return pool;
  }

  /* ---------------------------------------------------------------------
   * Sprite önbelleği
   * ------------------------------------------------------------------- */
  const SCALE = 2;
  const spriteCache = new Map();
  function getSprite(def, variant) {
    const v = variant % def.pal.length;
    const key = def.id + '#' + v;
    let c = spriteCache.get(key);
    if (c) return c;
    const pad = 4;
    c = document.createElement('canvas');
    c.width = Math.ceil((def.w + pad * 2) * SCALE);
    c.height = Math.ceil((def.h + pad * 2) * SCALE);
    const ctx = c.getContext('2d');
    ctx.scale(SCALE, SCALE);
    ctx.translate(pad, pad);
    try {
      def.drawFn(ctx, def.w, def.h, def.pal[v]);
    } catch (e) {
      ctx.fillStyle = '#f0f';
      ctx.fillRect(0, 0, def.w, def.h);
    }
    c.pad = pad;
    spriteCache.set(key, c);
    return c;
  }

  RC.Items = {
    DRAW,
    PALETTES: P,
    LIST: ITEMS,
    SAFE_LOOT,
    safeLootFor,
    KEY: KEY_ITEM,
    BY_ID,
    poolFor,
    getSprite,
    SCALE,
  };
})(window.RC);
