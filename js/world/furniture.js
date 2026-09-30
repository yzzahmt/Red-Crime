/* =========================================================================
 *  RED CRIME - Mobilyalar
 *  Her mobilya: boyut, saklanma türü (hide), çizim katmanı, üzerine eşya
 *  konabilen yüzeyler (surfaces) ve vektörel çizim.
 *  hide: 'crouch' → çömelince arkasına saklanılır
 *        'stand'  → hareketsiz durunca arkasına saklanılır (uzun mobilyalar)
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const OUT = 'rgba(0,0,0,0.5)';

  function rect(ctx, x, y, w, h, fill, r = 0, stroke = true) {
    ctx.beginPath();
    U.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = OUT;
      ctx.stroke();
    }
  }
  function woodGrain(ctx, x, y, w, h, base) {
    ctx.strokeStyle = U.rgba(U.shade(base, -0.4), 0.25);
    ctx.lineWidth = 1;
    for (let i = 6; i < h; i += 7) {
      ctx.beginPath();
      ctx.moveTo(x + 2, y + i);
      ctx.bezierCurveTo(x + w * 0.3, y + i - 2, x + w * 0.6, y + i + 2, x + w - 2, y + i);
      ctx.stroke();
    }
  }
  function knob(ctx, x, y, c = '#d9b04a') {
    U.circle(ctx, x, y, 2.5, c);
  }
  function legs(ctx, x, y, w, h, c, inset = 6) {
    rect(ctx, x + inset, y, 6, h, c, 1);
    rect(ctx, x + w - inset - 6, y, 6, h, c, 1);
  }

  /* ---------------------------------------------------------------------
   * Tanımlar
   * ------------------------------------------------------------------- */
  const F = {
    /* ================= YATAK ODASI ================= */
    bed: {
      name: 'Yatak',
      w: 150,
      h: 62,
      hide: 'crouch',
      surfaces: () => [],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, 14, h, p.wood, 3);
        rect(ctx, w - 10, 16, 10, h - 16, p.wood, 3);
        rect(ctx, 8, h * 0.35, w - 14, h * 0.4, '#f0ece2', 6);
        rect(ctx, w * 0.3, h * 0.28, w * 0.66, h * 0.5, p.fabric, 8);
        ctx.fillStyle = U.shade(p.fabric, -0.15);
        for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.34 + i * w * 0.15, h * 0.32, 3, h * 0.42);
        rect(ctx, 16, h * 0.18, 38, 18, '#ffffff', 8);
        rect(ctx, 6, h * 0.75, w - 12, h * 0.1, U.shade(p.wood, -0.2), 2);
        legs(ctx, 4, h * 0.85, w - 8, h * 0.15, U.shade(p.wood, -0.3), 4);
      },
    },
    doublebed: {
      name: 'Çift Kişilik Yatak',
      w: 220,
      h: 78,
      hide: null,
      surfaces: () => [],
      draw(ctx, w, h, p) {
        rect(ctx, 0, -40, 18, h + 40, p.wood, 4);
        rect(ctx, 3, -34, 12, 20, U.shade(p.wood, 0.15), 3);
        rect(ctx, w - 12, 18, 12, h - 18, p.wood, 3);
        rect(ctx, 10, h * 0.38, w - 16, h * 0.38, '#f0ece2', 6);
        rect(ctx, 20, h * 0.16, 46, 20, '#ffffff', 9);
        rect(ctx, 30, h * 0.08, 46, 20, '#f6f2ea', 9);
        rect(ctx, 6, h * 0.76, w - 12, h * 0.1, U.shade(p.wood, -0.2), 2);
        legs(ctx, 4, h * 0.86, w - 8, h * 0.14, U.shade(p.wood, -0.3), 4);
      },
      // Yorgan ayrıca (uyuyan kişinin üstüne) çizilir
      drawBlanket(ctx, w, h, p, occupied) {
        ctx.save();
        const top = occupied ? h * 0.2 : h * 0.34;
        ctx.beginPath();
        ctx.moveTo(w * 0.22, h * 0.76);
        ctx.lineTo(w * 0.22, top + 12);
        ctx.quadraticCurveTo(w * 0.22, top, w * 0.3, top);
        if (occupied) {
          ctx.quadraticCurveTo(w * 0.45, top - 8, w * 0.6, top + 6);
        }
        ctx.lineTo(w * 0.97, top + 8);
        ctx.lineTo(w * 0.97, h * 0.76);
        ctx.closePath();
        ctx.fillStyle = p.fabric;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = OUT;
        ctx.stroke();
        ctx.fillStyle = U.shade(p.fabric, 0.2);
        ctx.fillRect(w * 0.22, top + 4, w * 0.75, 6);
        ctx.fillStyle = U.shade(p.fabric, -0.15);
        for (let i = 0; i < 5; i++) U.circle(ctx, w * (0.35 + i * 0.13), h * 0.55, 3);
        ctx.restore();
      },
    },
    nightstand: {
      name: 'Komodin',
      w: 46,
      h: 46,
      surfaces: (w) => [{ y: 0, x0: 3, x1: w - 3, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h - 6, p.wood, 3);
        rect(ctx, 4, 6, w - 8, (h - 16) / 2, U.shade(p.wood, 0.08), 2);
        rect(ctx, 4, 10 + (h - 16) / 2, w - 8, (h - 16) / 2 - 2, U.shade(p.wood, 0.08), 2);
        knob(ctx, w / 2, 6 + (h - 16) / 4);
        knob(ctx, w / 2, 10 + ((h - 16) * 3) / 4);
        legs(ctx, 0, h - 6, w, 6, U.shade(p.wood, -0.3), 2);
      },
    },
    wardrobe: {
      name: 'Gardırop',
      w: 112,
      h: 204,
      hide: 'stand',
      layer: 'front',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 64 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h - 8, p.wood, 3);
        woodGrain(ctx, 0, 0, w, h - 8, p.wood);
        rect(ctx, 6, 8, w / 2 - 8, h - 30, U.shade(p.wood, 0.06), 2);
        rect(ctx, w / 2 + 2, 8, w / 2 - 8, h - 30, U.shade(p.wood, 0.06), 2);
        rect(ctx, 12, 18, w / 2 - 20, h * 0.35, U.shade(p.wood, 0.12), 2);
        rect(ctx, w / 2 + 8, 18, w / 2 - 20, h * 0.35, U.shade(p.wood, 0.12), 2);
        knob(ctx, w / 2 - 6, h / 2);
        knob(ctx, w / 2 + 6, h / 2);
        rect(ctx, -3, -4, w + 6, 8, U.shade(p.wood, -0.15), 2);
        legs(ctx, 0, h - 8, w, 8, U.shade(p.wood, -0.3), 4);
      },
    },
    dresser: {
      name: 'Şifonyer',
      w: 124,
      h: 72,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 80 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h - 6, p.wood, 3);
        rect(ctx, -2, -3, w + 4, 6, U.shade(p.wood, -0.1), 2);
        for (let r = 0; r < 3; r++) {
          rect(ctx, 5, 6 + r * ((h - 16) / 3), w - 10, (h - 16) / 3 - 3, U.shade(p.wood, 0.08), 2);
          knob(ctx, w * 0.3, 6 + r * ((h - 16) / 3) + (h - 16) / 6 - 1);
          knob(ctx, w * 0.7, 6 + r * ((h - 16) / 3) + (h - 16) / 6 - 1);
        }
        legs(ctx, 0, h - 6, w, 6, U.shade(p.wood, -0.3), 3);
      },
    },
    vanity: {
      name: 'Makyaj Masası',
      w: 100,
      h: 70,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, w * 0.2, -80, w * 0.6, 74, U.shade(p.wood, 0.1), 30);
        const g = ctx.createLinearGradient(0, -74, w, -10);
        g.addColorStop(0, '#dff1ff');
        g.addColorStop(1, '#8fb3cc');
        rect(ctx, w * 0.25, -74, w * 0.5, 62, g, 26, false);
        rect(ctx, 0, 0, w, 18, p.wood, 3);
        rect(ctx, 6, 4, w * 0.35, 10, U.shade(p.wood, 0.1), 2);
        legs(ctx, 0, 18, w, h - 18, U.shade(p.wood, -0.2), 4);
      },
    },
    bunkbed: {
      name: 'Ranza',
      w: 160,
      h: 150,
      hide: 'crouch',
      surfaces: () => [],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, 10, h, p.wood, 2);
        rect(ctx, w - 10, 0, 10, h, p.wood, 2);
        for (const y of [h * 0.28, h * 0.82]) {
          rect(ctx, 8, y, w - 16, 14, '#f0ece2', 4);
          rect(ctx, w * 0.35, y - 6, w * 0.6, 18, p.fabric, 6);
          rect(ctx, 14, y - 8, 30, 12, '#fff', 5);
          rect(ctx, 6, y + 14, w - 12, 8, U.shade(p.wood, -0.2), 2);
        }
        ctx.strokeStyle = U.shade(p.wood, -0.2);
        ctx.lineWidth = 4;
        for (let i = 0; i < 5; i++) U.line(ctx, w - 30, h * 0.35 + i * 18, w - 12, h * 0.35 + i * 18);
      },
    },
    toychest: {
      name: 'Oyuncak Sandığı',
      w: 78,
      h: 48,
      hide: 'crouch',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 6, w, h - 6, p.accent, 4);
        rect(ctx, -2, 0, w + 4, 10, U.shade(p.accent, -0.15), 4);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('★', w / 2, h * 0.7);
      },
    },

    /* ================= SALON ================= */
    sofa: {
      name: 'Kanepe',
      w: 190,
      h: 74,
      hide: 'crouch',
      layer: 'front',
      surfaces: () => [],
      draw(ctx, w, h, p) {
        rect(ctx, 10, 0, w - 20, h * 0.55, U.shade(p.fabric, -0.1), 12);
        rect(ctx, 0, h * 0.3, 26, h * 0.58, p.fabric, 10);
        rect(ctx, w - 26, h * 0.3, 26, h * 0.58, p.fabric, 10);
        rect(ctx, 20, h * 0.48, (w - 40) / 2, h * 0.3, U.shade(p.fabric, 0.08), 8);
        rect(ctx, w / 2, h * 0.48, (w - 40) / 2, h * 0.3, U.shade(p.fabric, 0.08), 8);
        rect(ctx, w * 0.12, h * 0.1, 30, 26, p.accent, 8);
        legs(ctx, 8, h * 0.88, w - 16, h * 0.12, '#2a1a10', 4);
      },
    },
    armchair: {
      name: 'Berjer',
      w: 84,
      h: 76,
      hide: 'crouch',
      layer: 'front',
      surfaces: () => [],
      draw(ctx, w, h, p) {
        rect(ctx, 8, 0, w - 16, h * 0.62, U.shade(p.fabric, -0.1), 12);
        rect(ctx, 0, h * 0.34, 18, h * 0.54, p.fabric, 8);
        rect(ctx, w - 18, h * 0.34, 18, h * 0.54, p.fabric, 8);
        rect(ctx, 14, h * 0.52, w - 28, h * 0.28, U.shade(p.fabric, 0.08), 8);
        legs(ctx, 6, h * 0.88, w - 12, h * 0.12, '#2a1a10', 3);
      },
    },
    coffeetable: {
      name: 'Sehpa',
      w: 110,
      h: 40,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 8, p.wood, 3);
        rect(ctx, 8, 22, w - 16, 4, U.shade(p.wood, -0.1), 1);
        legs(ctx, 0, 8, w, h - 8, U.shade(p.wood, -0.2), 6);
      },
    },
    tvstand: {
      name: 'TV Ünitesi',
      w: 150,
      h: 46,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 90 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h - 4, p.wood, 3);
        rect(ctx, 6, 8, w * 0.3, h - 20, '#1a1a1a', 2);
        rect(ctx, w * 0.36, 8, w * 0.28, h - 20, U.shade(p.wood, 0.08), 2);
        rect(ctx, w * 0.68, 8, w * 0.3 - 4, h - 20, '#1a1a1a', 2);
        knob(ctx, w / 2, h / 2);
        U.circle(ctx, w * 0.12, h * 0.5, 2, '#3ddc84');
      },
    },
    bookshelf: {
      name: 'Kitaplık',
      w: 124,
      h: 214,
      hide: null,
      surfaces: (w) => [
        { y: 0, x0: 4, x1: w - 4, max: 60 },
        { y: 54, x0: 8, x1: w - 8, max: 44, inner: true },
        { y: 106, x0: 8, x1: w - 8, max: 44, inner: true },
        { y: 158, x0: 8, x1: w - 8, max: 44, inner: true },
        { y: 208, x0: 8, x1: w - 8, max: 44, inner: true },
      ],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h, p.wood, 2);
        ctx.fillStyle = U.shade(p.wood, -0.45);
        ctx.fillRect(7, 6, w - 14, h - 8);
        for (const y of [54, 106, 158, 208]) rect(ctx, 4, y, w - 8, 6, U.shade(p.wood, 0.05), 1);
        rect(ctx, -3, -4, w + 6, 8, U.shade(p.wood, -0.15), 2);
      },
    },
    vitrine: {
      name: 'Vitrin',
      w: 104,
      h: 184,
      surfaces: (w) => [
        { y: 0, x0: 4, x1: w - 4, max: 60 },
        { y: 58, x0: 10, x1: w - 10, max: 46, inner: true },
        { y: 112, x0: 10, x1: w - 10, max: 46, inner: true },
        { y: 166, x0: 10, x1: w - 10, max: 46, inner: true },
      ],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h, p.wood, 3);
        ctx.fillStyle = '#1e2433';
        ctx.fillRect(8, 8, w - 16, h - 22);
        for (const y of [58, 112, 166]) rect(ctx, 6, y, w - 12, 5, 'rgba(210,235,255,0.7)', 1);
        legs(ctx, 0, h - 6, w, 6, U.shade(p.wood, -0.3), 4);
      },
      drawFront(ctx, w, h) {
        ctx.fillStyle = 'rgba(190,225,255,0.10)';
        ctx.fillRect(8, 8, w - 16, h - 22);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        U.line(ctx, 16, 16, 40, 60);
        U.line(ctx, w / 2 + 6, 20, w / 2 + 26, 50);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(w / 2 - 1, 8, 2, h - 22);
      },
    },
    fireplace: {
      name: 'Şömine',
      w: 170,
      h: 128,
      surfaces: (w) => [{ y: 0, x0: -6, x1: w + 6, max: 70 }],
      animated: true,
      draw(ctx, w, h, p, t) {
        rect(ctx, 0, 10, w, h - 10, p.stone || '#b8b0a0', 3);
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 6; c++) {
            ctx.fillStyle = U.rgba('#000', 0.08 * ((r + c) % 2));
            ctx.fillRect(c * (w / 6), 10 + r * ((h - 10) / 5), w / 6, (h - 10) / 5);
          }
        }
        rect(ctx, -8, 0, w + 16, 12, U.shade(p.wood, -0.1), 2);
        rect(ctx, w * 0.2, h * 0.38, w * 0.6, h * 0.62, '#15100c', 30);
        // Ateş
        const cx = w / 2;
        const by = h - 8;
        for (let i = 0; i < 5; i++) {
          const fx = cx + (i - 2) * 14;
          const fh = 30 + Math.sin(t * 9 + i * 1.7) * 8 + (i === 2 ? 14 : 0);
          const g = ctx.createLinearGradient(0, by - fh, 0, by);
          g.addColorStop(0, 'rgba(255,220,120,0)');
          g.addColorStop(0.4, 'rgba(255,160,50,0.9)');
          g.addColorStop(1, 'rgba(230,60,20,1)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(fx - 10, by);
          ctx.quadraticCurveTo(fx - 8, by - fh * 0.6, fx + Math.sin(t * 7 + i) * 4, by - fh);
          ctx.quadraticCurveTo(fx + 8, by - fh * 0.6, fx + 10, by);
          ctx.fill();
        }
        rect(ctx, cx - 40, by - 6, 80, 8, '#4a2a18', 3);
      },
      light: { color: '#ff9a3c', radius: 260 },
    },
    piano: {
      name: 'Piyano',
      w: 156,
      h: 116,
      hide: 'crouch',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h * 0.7, '#15151a', 4);
        shine(ctx, 10, 6, w - 20, 4);
        rect(ctx, 6, h * 0.5, w - 12, 12, '#f5f5f0', 1);
        ctx.fillStyle = '#111';
        for (let i = 0; i < 20; i++) if (i % 7 !== 2 && i % 7 !== 6) ctx.fillRect(12 + i * ((w - 24) / 20), h * 0.5, 3, 7);
        rect(ctx, 0, h * 0.6, w, h * 0.12, '#15151a', 2);
        legs(ctx, 0, h * 0.72, w, h * 0.28, '#15151a', 10);
        rect(ctx, w * 0.35, h * 0.9, w * 0.3, 4, '#d9b04a', 1);
      },
    },
    grandclock: {
      name: 'Ayaklı Saat',
      w: 52,
      h: 196,
      hide: null,
      surfaces: () => [],
      animated: true,
      draw(ctx, w, h, p, t) {
        rect(ctx, 4, 0, w - 8, h, p.wood, 4);
        U.circle(ctx, w / 2, 30, 20, '#f5efe0');
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(w / 2, 30, 20, 0, U.TAU);
        ctx.stroke();
        const a = t * 0.1;
        U.line(ctx, w / 2, 30, w / 2 + Math.cos(a) * 14, 30 + Math.sin(a) * 14);
        U.line(ctx, w / 2, 30, w / 2 + Math.cos(a / 12) * 9, 30 + Math.sin(a / 12) * 9);
        rect(ctx, 10, 60, w - 20, h - 90, '#1a1410', 2);
        const sw = Math.sin(t * 3) * 0.35;
        ctx.save();
        ctx.translate(w / 2, 66);
        ctx.rotate(sw);
        ctx.strokeStyle = '#d9b04a';
        ctx.lineWidth = 2;
        U.line(ctx, 0, 0, 0, 70);
        U.circle(ctx, 0, 76, 8, '#d9b04a');
        ctx.restore();
      },
    },
    consoletable: {
      name: 'Dresuar',
      w: 130,
      h: 76,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 80 }, { y: 56, x0: 10, x1: w - 10, max: 40, inner: true }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 10, p.wood, 2);
        rect(ctx, 8, 56, w - 16, 5, U.shade(p.wood, -0.1), 1);
        legs(ctx, 0, 10, w, h - 10, U.shade(p.wood, -0.2), 4);
      },
    },
    pedestal: {
      name: 'Kaide',
      w: 52,
      h: 70,
      surfaces: (w) => [{ y: 0, x0: 2, x1: w - 2, max: 80 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 10, '#e8e4dc', 2);
        rect(ctx, 6, 10, w - 12, h - 20, '#d8d4cc', 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 3; i++) U.line(ctx, 12 + i * ((w - 24) / 2), 12, 12 + i * ((w - 24) / 2), h - 12);
        rect(ctx, -2, h - 10, w + 4, 10, '#e8e4dc', 2);
      },
    },
    plantstand: {
      name: 'Çiçeklik',
      w: 44,
      h: 58,
      surfaces: (w) => [{ y: 0, x0: 2, x1: w - 2, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 6, p.wood, 2);
        ctx.strokeStyle = U.shade(p.wood, -0.2);
        ctx.lineWidth = 4;
        U.line(ctx, 6, 6, 2, h);
        U.line(ctx, w - 6, 6, w - 2, h);
        U.line(ctx, 8, h * 0.6, w - 8, h * 0.6);
      },
    },

    /* ================= MUTFAK / YEMEK ================= */
    counter: {
      name: 'Tezgâh',
      w: 240,
      h: 84,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 90 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 8, w, h - 8, p.cabinet || '#e8e4dc', 2);
        rect(ctx, -3, 0, w + 6, 10, p.top || '#3a3d45', 2);
        const n = Math.max(2, Math.floor(w / 60));
        for (let i = 0; i < n; i++) {
          rect(ctx, 5 + i * ((w - 10) / n), 16, (w - 10) / n - 5, h - 26, U.shade(p.cabinet || '#e8e4dc', -0.05), 2);
          ctx.fillStyle = '#888';
          ctx.fillRect(5 + i * ((w - 10) / n) + ((w - 10) / n - 5) / 2 - 8, 22, 16, 3);
        }
        // Lavabo
        rect(ctx, w * 0.62, 2, w * 0.22, 6, '#c0c4cc', 2);
        ctx.strokeStyle = '#c0c4cc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.73, 2);
        ctx.lineTo(w * 0.73, -18);
        ctx.lineTo(w * 0.68, -18);
        ctx.stroke();
      },
    },
    uppercab: {
      name: 'Üst Dolap',
      w: 200,
      h: 64,
      wall: true,
      surfaces: (w) => [{ y: 64, x0: 6, x1: w - 6, max: 0, under: true }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h, p.cabinet || '#e8e4dc', 2);
        const n = Math.max(2, Math.floor(w / 60));
        for (let i = 0; i < n; i++) {
          rect(ctx, 4 + i * ((w - 8) / n), 4, (w - 8) / n - 4, h - 8, U.shade(p.cabinet || '#e8e4dc', -0.05), 2);
          ctx.fillStyle = '#888';
          ctx.fillRect(4 + i * ((w - 8) / n) + ((w - 8) / n - 4) / 2 - 1.5, h - 20, 3, 12);
        }
      },
    },
    fridge: {
      name: 'Buzdolabı',
      w: 76,
      h: 178,
      hide: 'stand',
      layer: 'front',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 90 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h, p.appliance || '#e8e8ec', 8);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(2, h * 0.34, w - 4, 2);
        rect(ctx, w - 14, 16, 5, 34, '#9aa0aa', 2);
        rect(ctx, w - 14, h * 0.4, 5, 50, '#9aa0aa', 2);
        shine(ctx, 8, 8, 6, h - 16);
        // Magnetler
        U.circle(ctx, 18, h * 0.5, 4, '#e8283c');
        U.circle(ctx, 30, h * 0.56, 4, '#4aa8ff');
        rect(ctx, 14, h * 0.62, 22, 16, '#fff7c2', 1);
      },
    },
    stove: {
      name: 'Ocak',
      w: 72,
      h: 84,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 80 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h, p.appliance || '#e8e8ec', 3);
        rect(ctx, 0, 0, w, 8, '#1a1a1a', 2);
        rect(ctx, 6, 22, w - 12, h - 32, '#1a1f26', 3);
        ctx.fillStyle = 'rgba(255,140,60,0.18)';
        ctx.fillRect(10, 26, w - 20, h - 40);
        for (let i = 0; i < 4; i++) U.circle(ctx, 12 + i * ((w - 24) / 3), 14, 3, '#333');
      },
    },
    diningtable: {
      name: 'Yemek Masası',
      w: 200,
      h: 64,
      surfaces: (w) => [{ y: 0, x0: 6, x1: w - 6, max: 80 }],
      draw(ctx, w, h, p) {
        // Sandalyeler (arka)
        for (const x of [w * 0.12, w * 0.4, w * 0.68]) {
          rect(ctx, x, -34, 34, 44, U.shade(p.wood, -0.1), 4);
          rect(ctx, x + 5, -28, 24, 30, U.shade(p.fabric, 0), 3);
        }
        rect(ctx, 0, 0, w, 10, p.wood, 3);
        rect(ctx, 6, 8, w - 12, 8, U.shade(p.wood, -0.15), 1);
        legs(ctx, 0, 14, w, h - 14, U.shade(p.wood, -0.2), 10);
      },
    },
    washer: {
      name: 'Çamaşır Makinesi',
      w: 64,
      h: 80,
      surfaces: (w) => [{ y: 0, x0: 3, x1: w - 3, max: 80 }],
      draw(ctx, w, h) {
        rect(ctx, 0, 0, w, h, '#eef0f4', 4);
        rect(ctx, 4, 4, w - 8, 12, '#d8dce4', 2);
        U.circle(ctx, w / 2, h * 0.58, 22, '#9aa0aa');
        U.circle(ctx, w / 2, h * 0.58, 17, '#6a8fb0');
        shine(ctx, w / 2 - 10, h * 0.5, 6, 6, 0.4);
        U.circle(ctx, w - 12, 10, 3, '#3ddc84');
      },
    },

    /* ================= BANYO ================= */
    bathtub: {
      name: 'Küvet',
      w: 170,
      h: 64,
      hide: 'crouch',
      layer: 'front',
      surfaces: () => [],
      draw(ctx, w, h) {
        rect(ctx, 0, 6, w, h - 18, '#f6f6f8', 20);
        rect(ctx, 6, 0, w - 12, 12, '#ffffff', 6);
        ctx.fillStyle = 'rgba(120,190,255,0.35)';
        ctx.fillRect(10, 4, w - 20, 6);
        legs(ctx, 6, h - 12, w - 12, 12, '#d9b04a', 10);
        ctx.strokeStyle = '#c0c4cc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w - 20, 0);
        ctx.lineTo(w - 20, -30);
        ctx.lineTo(w - 36, -30);
        ctx.stroke();
      },
    },
    toilet: {
      name: 'Klozet',
      w: 44,
      h: 64,
      surfaces: (w) => [{ y: 0, x0: 2, x1: w - 2, max: 50 }],
      draw(ctx, w, h) {
        rect(ctx, w * 0.45, 0, w * 0.55, h * 0.45, '#f6f6f8', 4);
        rect(ctx, 0, h * 0.45, w, h * 0.16, '#ffffff', 6);
        rect(ctx, w * 0.2, h * 0.6, w * 0.6, h * 0.4, '#f0f0f2', 4);
      },
    },
    sink: {
      name: 'Lavabo',
      w: 60,
      h: 84,
      surfaces: (w) => [{ y: 0, x0: 3, x1: w - 3, max: 60 }],
      draw(ctx, w, h) {
        rect(ctx, 0, 0, w, 14, '#ffffff', 5);
        rect(ctx, w * 0.35, 14, w * 0.3, h - 14, '#f0f0f2', 3);
        ctx.strokeStyle = '#c0c4cc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, -14);
        ctx.lineTo(w / 2 + 10, -14);
        ctx.stroke();
      },
    },
    bathshelf: {
      name: 'Banyo Dolabı',
      w: 60,
      h: 150,
      surfaces: (w) => [
        { y: 0, x0: 3, x1: w - 3, max: 60 },
        { y: 50, x0: 6, x1: w - 6, max: 42, inner: true },
        { y: 100, x0: 6, x1: w - 6, max: 42, inner: true },
        { y: 146, x0: 6, x1: w - 6, max: 42, inner: true },
      ],
      draw(ctx, w, h) {
        rect(ctx, 0, 0, w, h, '#f4f4f6', 2);
        ctx.fillStyle = '#d9dde4';
        ctx.fillRect(5, 5, w - 10, h - 8);
        for (const y of [50, 100, 146]) rect(ctx, 3, y, w - 6, 4, '#ffffff', 1);
      },
    },

    /* ================= ÇALIŞMA / KÜTÜPHANE ================= */
    desk: {
      name: 'Çalışma Masası',
      w: 156,
      h: 74,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 90 }],
      draw(ctx, w, h, p) {
        // Sandalye
        rect(ctx, w * 0.35, -20, 40, 50, '#2a2d3e', 8);
        rect(ctx, w * 0.35 + 16, 30, 8, 30, '#444', 1);
        rect(ctx, 0, 0, w, 10, p.wood, 2);
        rect(ctx, w - 50, 10, 46, h - 14, U.shade(p.wood, 0.05), 2);
        for (let i = 0; i < 3; i++) {
          rect(ctx, w - 46, 14 + i * ((h - 22) / 3), 38, (h - 22) / 3 - 3, U.shade(p.wood, 0.12), 2);
          knob(ctx, w - 27, 14 + i * ((h - 22) / 3) + (h - 22) / 6 - 1);
        }
        rect(ctx, 4, 10, 8, h - 10, U.shade(p.wood, -0.2), 1);
      },
    },
    globestand: {
      name: 'Harita Masası',
      w: 90,
      h: 70,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 80 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 8, p.wood, 2);
        rect(ctx, 6, 8, w - 12, 14, '#e8d9a8', 1);
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) U.line(ctx, 10 + i * 18, 10, 18 + i * 18, 20);
        legs(ctx, 0, 22, w, h - 22, U.shade(p.wood, -0.2), 6);
      },
    },

    /* ================= DEPO / ATÖLYE / BODRUM ================= */
    rack: {
      name: 'Metal Raf',
      w: 124,
      h: 196,
      surfaces: (w) => [
        { y: 0, x0: 4, x1: w - 4, max: 60 },
        { y: 50, x0: 6, x1: w - 6, max: 44, inner: true },
        { y: 100, x0: 6, x1: w - 6, max: 44, inner: true },
        { y: 150, x0: 6, x1: w - 6, max: 44, inner: true },
      ],
      draw(ctx, w, h) {
        ctx.fillStyle = '#6a707c';
        ctx.fillRect(0, 0, 6, h);
        ctx.fillRect(w - 6, 0, 6, h);
        for (const y of [0, 50, 100, 150]) rect(ctx, 0, y, w, 5, '#8a909c', 1);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        for (let y = 8; y < h; y += 12) U.line(ctx, 2, y, 4, y + 4);
      },
    },
    workbench: {
      name: 'Tezgâh',
      w: 190,
      h: 82,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 90 }, { y: 60, x0: 12, x1: w - 12, max: 44, inner: true }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 12, '#9a6a3a', 2);
        woodGrain(ctx, 0, 0, w, 12, '#9a6a3a');
        rect(ctx, 8, 60, w - 16, 5, '#7a4a2a', 1);
        legs(ctx, 0, 12, w, h - 12, '#6a4a2a', 6);
        // Mengene
        rect(ctx, w - 30, -12, 22, 12, '#4a5a6a', 2);
        // Duvar alet panosu
        rect(ctx, 20, -110, w - 40, 80, '#b08a5a', 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) U.circle(ctx, 30 + i * ((w - 60) / 7), -100 + j * 20, 1.2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        U.line(ctx, 40, -95, 40, -55);
        U.line(ctx, 70, -95, 76, -50);
        ctx.strokeStyle = '#c23a2b';
        U.line(ctx, 110, -90, 110, -60);
      },
    },
    winerack: {
      name: 'Şarap Rafı',
      w: 124,
      h: 186,
      surfaces: (w) => [
        { y: 0, x0: 4, x1: w - 4, max: 60 },
        { y: 46, x0: 6, x1: w - 6, max: 40, inner: true, only: 'wine' },
        { y: 92, x0: 6, x1: w - 6, max: 40, inner: true, only: 'wine' },
        { y: 138, x0: 6, x1: w - 6, max: 40, inner: true, only: 'wine' },
        { y: 182, x0: 6, x1: w - 6, max: 40, inner: true, only: 'wine' },
      ],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, h, U.shade(p.wood, -0.1), 2);
        ctx.fillStyle = '#1a1210';
        ctx.fillRect(5, 5, w - 10, h - 8);
        for (const y of [46, 92, 138, 182]) rect(ctx, 3, y, w - 6, 4, p.wood, 1);
      },
    },
    boxes: {
      name: 'Koliler',
      w: 96,
      h: 92,
      hide: 'crouch',
      layer: 'front',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 30, max: 70 }],
      draw(ctx, w, h) {
        const box = (x, y, bw, bh) => {
          rect(ctx, x, y, bw, bh, '#c49a6a', 2);
          ctx.fillStyle = '#a07a4a';
          ctx.fillRect(x + bw / 2 - 5, y, 10, bh);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + 6, y + bh - 16, 22, 10);
        };
        box(0, 44, 56, 48);
        box(52, 36, 44, 56);
        box(4, 0, 48, 44);
      },
    },
    chest: {
      name: 'Sandık',
      w: 84,
      h: 50,
      hide: 'crouch',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 10, w, h - 10, U.shade(p.wood, -0.05), 3);
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.quadraticCurveTo(w / 2, -6, w, 14);
        ctx.closePath();
        ctx.fillStyle = p.wood;
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#6a707c';
        ctx.fillRect(10, 4, 6, h - 4);
        ctx.fillRect(w - 16, 4, 6, h - 4);
        rect(ctx, w / 2 - 6, 14, 12, 12, '#d9b04a', 2);
      },
    },
    furnace: {
      name: 'Kombi',
      w: 70,
      h: 110,
      surfaces: (w) => [{ y: 0, x0: 3, x1: w - 3, max: 60 }],
      animated: true,
      draw(ctx, w, h, p, t) {
        rect(ctx, 0, 0, w, h, '#d9dde4', 4);
        rect(ctx, 10, 14, w - 20, 26, '#1a1f26', 2);
        ctx.fillStyle = `rgba(80,200,255,${0.6 + Math.sin(t * 2) * 0.2})`;
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('60°', w / 2, 32);
        ctx.strokeStyle = '#9aa0aa';
        ctx.lineWidth = 4;
        U.line(ctx, 15, h, 15, h - 20);
        U.line(ctx, w - 15, h, w - 15, h - 20);
      },
    },

    /* ================= OYUN / MÜZİK ================= */
    pooltable: {
      name: 'Bilardo Masası',
      w: 210,
      h: 84,
      hide: 'crouch',
      surfaces: (w) => [{ y: 0, x0: 10, x1: w - 10, max: 50 }],
      draw(ctx, w, h) {
        rect(ctx, 0, 0, w, 16, '#5b3a24', 4);
        ctx.fillStyle = '#1f7a4a';
        ctx.fillRect(8, 2, w - 16, 6);
        U.circle(ctx, 8, 6, 5, '#111');
        U.circle(ctx, w - 8, 6, 5, '#111');
        U.circle(ctx, w / 2, 6, 5, '#111');
        rect(ctx, 6, 16, w - 12, 18, '#4a2a18', 2);
        legs(ctx, 0, 34, w, h - 34, '#3a2010', 14);
      },
    },
    bar: {
      name: 'Bar Tezgâhı',
      w: 190,
      h: 104,
      hide: 'crouch',
      layer: 'front',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 70 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 12, '#2a1a10', 3);
        rect(ctx, 6, 12, w - 12, h - 12, p.wood, 2);
        for (let i = 0; i < 4; i++) rect(ctx, 14 + i * ((w - 28) / 4), 22, (w - 28) / 4 - 8, h - 40, U.shade(p.wood, 0.1), 3);
        rect(ctx, 0, h - 10, w, 6, '#d9b04a', 2);
      },
    },
    drumkit: {
      name: 'Bateri',
      w: 150,
      h: 110,
      hide: 'crouch',
      surfaces: () => [],
      draw(ctx, w, h) {
        rect(ctx, w * 0.35, h * 0.45, w * 0.35, h * 0.55, '#c23a2b', 30);
        U.circle(ctx, w * 0.52, h * 0.72, 22, '#eee');
        rect(ctx, 0, h * 0.55, 40, 30, '#c23a2b', 6);
        rect(ctx, w - 44, h * 0.5, 40, 34, '#c23a2b', 6);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        U.line(ctx, 20, h * 0.55, 10, 0);
        U.line(ctx, w - 20, h * 0.5, w - 10, 10);
        ctx.fillStyle = '#d9b04a';
        U.ellipse(ctx, 10, 0, 26, 4, -0.1);
        U.ellipse(ctx, w - 10, 10, 26, 4, 0.1);
      },
    },

    /* ================= HAZİNE / KASA ================= */
    safe: {
      name: 'Kasa',
      w: 76,
      h: 88,
      surfaces: (w) => [{ y: 0, x0: 3, x1: w - 3, max: 60 }],
      draw(ctx, w, h, p, t, st) {
        const open = st && st.open;
        rect(ctx, 0, 0, w, h, '#3a3f4a', 6);
        rect(ctx, 5, 5, w - 10, h - 16, '#2a2e36', 4);
        if (open) {
          ctx.fillStyle = '#0d0f14';
          ctx.fillRect(9, 9, w - 18, h - 24);
          rect(ctx, -w * 0.55, 5, w * 0.6, h - 16, '#4a505c', 4);
          U.circle(ctx, -w * 0.25, h * 0.45, 12, '#8a909c');
        } else {
          U.circle(ctx, w / 2, h * 0.45, 17, '#8a909c');
          U.circle(ctx, w / 2, h * 0.45, 13, '#5a606c');
          ctx.strokeStyle = '#d9dde4';
          ctx.lineWidth = 2;
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * U.TAU;
            U.line(ctx, w / 2 + Math.cos(a) * 13, h * 0.45 + Math.sin(a) * 13, w / 2 + Math.cos(a) * 16, h * 0.45 + Math.sin(a) * 16);
          }
          rect(ctx, w * 0.72, h * 0.38, 8, 20, '#b8bcc6', 2);
          U.circle(ctx, w * 0.25, h * 0.75, 4, '#111');
        }
        legs(ctx, 0, h - 8, w, 8, '#222', 4);
      },
    },

    /* ================= DÜKKÂN / MÜZE / BANKA ================= */
    cot: {
      name: 'Kamp Yatağı',
      w: 220,
      h: 60,
      hide: null,
      surfaces: () => [],
      draw(ctx, w, h, p) {
        ctx.strokeStyle = '#4a505c';
        ctx.lineWidth = 4;
        U.line(ctx, 10, h * 0.45, 30, h);
        U.line(ctx, 30, h * 0.45, 10, h);
        U.line(ctx, w - 10, h * 0.45, w - 30, h);
        U.line(ctx, w - 30, h * 0.45, w - 10, h);
        rect(ctx, 0, h * 0.35, w, h * 0.16, '#3a5a3a', 4);
        rect(ctx, 16, h * 0.14, 50, 16, '#e8e4dc', 7);
        // Başucunda termos ve telsiz
        rect(ctx, w + 6, h * 0.4, 12, h * 0.6, '#c23a2b', 3);
      },
      drawBlanket(ctx, w, h, p, occupied) {
        F.doublebed.drawBlanket(ctx, w, h, { fabric: '#4a6a4a' }, occupied);
      },
    },
    displaycase: {
      name: 'Mücevher Vitrini',
      w: 150,
      h: 96,
      surfaces: (w) => [
        { y: 0, x0: 6, x1: w - 6, max: 40 },
        { y: 40, x0: 10, x1: w - 10, max: 30, inner: true },
      ],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 44, w, h - 44, '#2a1a12', 3);
        rect(ctx, 6, 50, w - 12, h - 60, U.shade(p.wood || '#5b3a24', 0.05), 2);
        ctx.fillStyle = '#d9b04a';
        ctx.fillRect(0, 44, w, 3);
        ctx.fillStyle = '#6a1b2a';
        ctx.fillRect(4, 36, w - 8, 8);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        for (let i = 1; i < 4; i++) U.line(ctx, (w * i) / 4, 52, (w * i) / 4, h - 10);
      },
      drawFront(ctx, w, h) {
        ctx.fillStyle = 'rgba(190,225,255,0.12)';
        ctx.fillRect(2, 0, w - 4, 44);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(2, 0, w - 4, 44);
        U.line(ctx, 10, 6, 24, 30);
        U.line(ctx, w - 30, 6, w - 18, 26);
      },
    },
    techstand: {
      name: 'Teşhir Masası',
      w: 170,
      h: 80,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 60 }, { y: 50, x0: 10, x1: w - 10, max: 34, inner: true }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 8, '#f4f4f6', 2);
        rect(ctx, 8, 50, w - 16, 4, '#d8dce4', 1);
        legs(ctx, 0, 8, w, h - 8, '#9aa0aa', 6);
        ctx.fillStyle = '#4aa8ff';
        ctx.fillRect(0, 8, w, 3);
      },
    },
    cashdesk: {
      name: 'Kasa Bankosu',
      w: 170,
      h: 92,
      hide: 'crouch',
      layer: 'front',
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 60 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 8, w, h - 8, '#e8e4dc', 3);
        rect(ctx, -3, 0, w + 6, 10, '#3a3d45', 2);
        rect(ctx, 10, 20, w - 20, 26, U.shade('#e8e4dc', -0.06), 2);
        ctx.fillStyle = '#2a2d3e';
        ctx.fillRect(w * 0.6, -26, 40, 26);
        ctx.fillStyle = '#3ddc84';
        ctx.fillRect(w * 0.6 + 4, -22, 32, 10);
      },
    },
    bankcounter: {
      name: 'Vezne Bankosu',
      w: 220,
      h: 100,
      hide: 'crouch',
      layer: 'front',
      surfaces: (w) => [{ y: 0, x0: 6, x1: w - 6, max: 50 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 10, w, h - 10, '#5b3a24', 3);
        for (let i = 0; i < 3; i++) rect(ctx, 10 + i * ((w - 20) / 3), 22, (w - 20) / 3 - 8, h - 36, '#6b4a2a', 3);
        rect(ctx, -4, 0, w + 8, 12, '#e8e4dc', 2);
        // Cam bölme
        ctx.fillStyle = 'rgba(190,225,255,0.15)';
        ctx.fillRect(0, -110, w, 110);
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -110, w, 110);
        for (let i = 1; i < 3; i++) U.line(ctx, (w * i) / 3, -110, (w * i) / 3, 0);
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(w * 0.3, -8, 30, 8);
      },
    },
    lockers: {
      name: 'Kiralık Kasalar',
      w: 190,
      h: 210,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 60 }],
      draw(ctx, w, h) {
        rect(ctx, 0, 0, w, h, '#8a8f99', 3);
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 5; c++) {
            const x = 6 + c * ((w - 12) / 5);
            const y = 6 + r * ((h - 12) / 6);
            rect(ctx, x, y, (w - 12) / 5 - 4, (h - 12) / 6 - 4, '#b8bcc6', 2);
            U.circle(ctx, x + ((w - 12) / 5 - 4) / 2, y + ((h - 12) / 6 - 4) / 2, 3, '#4a4f58');
            ctx.fillStyle = '#2a2a30';
            ctx.font = '7px Arial';
            ctx.fillText(String(100 + r * 5 + c), x + 3, y + 9);
          }
        }
      },
    },
    monitors: {
      name: 'Güvenlik Masası',
      w: 180,
      h: 76,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 30 }],
      animated: true,
      draw(ctx, w, h, p, t) {
        rect(ctx, 0, 0, w, 10, '#3a3d45', 2);
        legs(ctx, 0, 10, w, h - 10, '#2a2d3e', 6);
        // Monitör duvarı
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 3; c++) {
            const x = 10 + c * 56;
            const y = -120 + r * 56;
            rect(ctx, x, y, 50, 44, '#15151a', 3);
            const g = ctx.createLinearGradient(0, y, 0, y + 44);
            g.addColorStop(0, '#1a3a2a');
            g.addColorStop(1, '#0a1a12');
            ctx.fillStyle = g;
            ctx.fillRect(x + 3, y + 3, 44, 34);
            ctx.fillStyle = 'rgba(160,255,200,0.25)';
            const scan = (t * 30 + c * 20 + r * 10) % 34;
            ctx.fillRect(x + 3, y + 3 + scan, 44, 2);
            ctx.fillStyle = 'rgba(160,255,200,0.4)';
            ctx.fillRect(x + 6, y + 24, 12 + c * 4, 8);
            ctx.fillStyle = '#ff3043';
            if (Math.sin(t * 3 + c + r) > 0) ctx.fillRect(x + 40, y + 5, 3, 3);
          }
        }
      },
    },
    dinosaur: {
      name: 'Dinozor İskeleti',
      w: 320,
      h: 230,
      layer: 'back',
      surfaces: () => [],
      draw(ctx, w, h) {
        rect(ctx, 20, h - 20, w - 40, 20, '#3a3a40', 3);
        ctx.strokeStyle = '#e8e0cc';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        // Omurga
        ctx.beginPath();
        ctx.moveTo(10, h * 0.55);
        ctx.quadraticCurveTo(w * 0.35, h * 0.25, w * 0.62, h * 0.35);
        ctx.quadraticCurveTo(w * 0.8, h * 0.4, w * 0.88, h * 0.18);
        ctx.stroke();
        // Kaburgalar
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          const x = w * (0.3 + i * 0.04);
          ctx.beginPath();
          ctx.moveTo(x, h * 0.32);
          ctx.quadraticCurveTo(x + 8, h * 0.5, x - 4, h * 0.6);
          ctx.stroke();
        }
        // Bacaklar
        ctx.lineWidth = 6;
        U.line(ctx, w * 0.4, h * 0.45, w * 0.36, h - 20);
        U.line(ctx, w * 0.58, h * 0.45, w * 0.62, h - 20);
        // Kafatası
        ctx.fillStyle = '#e8e0cc';
        ctx.beginPath();
        ctx.ellipse(w * 0.92, h * 0.16, 28, 16, 0.2, 0, U.TAU);
        ctx.fill();
        ctx.fillStyle = '#2a2420';
        U.circle(ctx, w * 0.93, h * 0.13, 4);
        ctx.strokeStyle = '#2a2420';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) U.line(ctx, w * 0.88 + i * 5, h * 0.2, w * 0.88 + i * 5, h * 0.24);
        ctx.lineCap = 'butt';
        ctx.fillStyle = '#c8c0a0';
        ctx.fillRect(w * 0.4, h - 44, 90, 18);
      },
    },
    bigsafe: {
      name: 'Çelik Kasa Kapısı',
      w: 150,
      h: 200,
      surfaces: () => [],
      draw(ctx, w, h, p, t, st) {
        const open = st && st.open;
        rect(ctx, -10, -8, w + 20, h + 8, '#3a3f4a', 6);
        if (open) {
          ctx.fillStyle = '#0d0f14';
          ctx.fillRect(4, 4, w - 8, h - 8);
          ctx.fillStyle = 'rgba(255,210,74,0.2)';
          ctx.fillRect(10, h - 60, w - 20, 50);
          rect(ctx, -w * 0.7, 0, w * 0.62, h, '#6a707c', 8);
          U.circle(ctx, -w * 0.4, h / 2, 34, '#8a909c');
        } else {
          U.circle(ctx, w / 2, h / 2, 64, '#8a909c');
          U.circle(ctx, w / 2, h / 2, 54, '#6a707c');
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * U.TAU;
            U.circle(ctx, w / 2 + Math.cos(a) * 58, h / 2 + Math.sin(a) * 58, 5, '#4a4f58');
          }
          ctx.strokeStyle = '#d9dde4';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * U.TAU + 0.3;
            U.line(ctx, w / 2, h / 2, w / 2 + Math.cos(a) * 34, h / 2 + Math.sin(a) * 34);
          }
          ctx.lineCap = 'butt';
          U.circle(ctx, w / 2, h / 2, 12, '#b8bcc6');
        }
      },
    },

    /* ================= DUVAR RAFI (kapasite) ================= */
    wallshelf: {
      name: 'Duvar Rafı',
      w: 110,
      h: 10,
      wall: true,
      surfaces: (w) => [{ y: 0, x0: 2, x1: w - 2, max: 40 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 0, w, 7, p.wood, 2);
        ctx.fillStyle = U.shade(p.wood, -0.35);
        U.poly(ctx, [8, 7, 20, 7, 8, 20]);
        U.poly(ctx, [w - 8, 7, w - 20, 7, w - 8, 20]);
      },
    },

    /* ================= PERDE (pencere önünde) ================= */
    curtain: {
      name: 'Perde',
      w: 44,
      h: 210,
      hide: 'stand',
      layer: 'front',
      surfaces: () => [],
      animated: true,
      draw(ctx, w, h, p, t) {
        const sway = Math.sin(t * 1.3 + w) * 2;
        ctx.fillStyle = p.curtain || '#8a1b2a';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.quadraticCurveTo(w + sway, h * 0.5, w - 4 + sway, h);
        ctx.lineTo(4 + sway, h);
        ctx.quadraticCurveTo(-4 + sway, h * 0.5, 0, 0);
        ctx.fill();
        ctx.strokeStyle = U.rgba('#000000', 0.25);
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo((w * i) / 4, 2);
          ctx.quadraticCurveTo((w * i) / 4 + sway, h * 0.5, (w * i) / 4 + sway, h - 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#d9b04a';
        ctx.fillRect(-4, -4, w + 8, 5);
      },
    },

    /* ================= BAHÇE ================= */
    bush: {
      name: 'Çalı',
      w: 110,
      h: 74,
      hide: 'crouch',
      layer: 'front',
      garden: true,
      surfaces: () => [],
      draw(ctx, w, h, p, t, st) {
        RC.BG.bush(ctx, 0, 0, w, h, (st && st.seed) || 3, p.leaf || '#24502f');
      },
    },
    hedge: {
      name: 'Çit Çalısı',
      w: 200,
      h: 104,
      hide: 'stand',
      layer: 'front',
      garden: true,
      surfaces: (w) => [{ y: 6, x0: 10, x1: w - 10, max: 60 }],
      draw(ctx, w, h, p) {
        rect(ctx, 0, 6, w, h - 6, p.leaf || '#1f4a2a', 14, false);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < w / 18; i++) U.circle(ctx, 8 + i * 18, 12 + (i % 3) * 20, 9);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < w / 22; i++) U.circle(ctx, 14 + i * 22, h - 16 - (i % 2) * 18, 8);
      },
    },
    bench: {
      name: 'Bank',
      w: 124,
      h: 50,
      garden: true,
      surfaces: (w) => [{ y: 14, x0: 6, x1: w - 6, max: 70 }],
      draw(ctx, w, h) {
        rect(ctx, 4, -24, w - 8, 10, '#8a5a34', 2);
        rect(ctx, 4, -10, w - 8, 10, '#8a5a34', 2);
        rect(ctx, 0, 14, w, 10, '#9a6a3a', 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(10, -24, 5, h + 24);
        ctx.fillRect(w - 15, -24, 5, h + 24);
      },
    },
    fountain: {
      name: 'Süs Havuzu',
      w: 200,
      h: 120,
      garden: true,
      animated: true,
      surfaces: (w) => [{ y: 70, x0: 4, x1: 30, max: 60 }, { y: 70, x0: w - 30, x1: w - 4, max: 60 }],
      draw(ctx, w, h, p, t) {
        rect(ctx, 0, 70, w, h - 70, '#c8c0b0', 6);
        ctx.fillStyle = '#4a8fc0';
        ctx.fillRect(8, 74, w - 16, 12);
        rect(ctx, w / 2 - 10, 20, 20, 54, '#d8d0c0', 3);
        U.ellipse(ctx, w / 2, 22, 36, 8, 0, '#d8d0c0');
        ctx.strokeStyle = 'rgba(160,210,255,0.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const k = ((t * 1.5 + i / 6) % 1);
          const dir = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(w / 2, 14);
          ctx.quadraticCurveTo(w / 2 + dir * 40 * k, -10, w / 2 + dir * (30 + 40 * k), 74);
          ctx.stroke();
        }
        U.circle(ctx, w / 2, 8, 6, '#d8d0c0');
      },
    },
    doghouse: {
      name: 'Köpek Kulübesi',
      w: 96,
      h: 84,
      garden: true,
      surfaces: () => [],
      draw(ctx, w, h, pal, t, st) {
        ctx.fillStyle = '#8a3a2a';
        U.poly(ctx, [-8, 30, w / 2, -6, w + 8, 30]);
        rect(ctx, 4, 28, w - 8, h - 28, '#b8864a', 2);
        ctx.fillStyle = '#1a1210';
        ctx.beginPath();
        ctx.moveTo(w * 0.3, h);
        ctx.lineTo(w * 0.3, h * 0.6);
        ctx.arc(w / 2, h * 0.6, w * 0.2, Math.PI, 0);
        ctx.lineTo(w * 0.7, h);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText((st && st.label) || 'KARABAŞ', w / 2, 42);
      },
    },
    gardentable: {
      name: 'Bahçe Masası',
      w: 110,
      h: 62,
      garden: true,
      surfaces: (w) => [{ y: 0, x0: 4, x1: w - 4, max: 60 }],
      draw(ctx, w, h) {
        ctx.fillStyle = '#e8283c';
        U.poly(ctx, [w / 2 - 80, -80, w / 2, -120, w / 2 + 80, -80]);
        ctx.fillStyle = '#fff';
        U.poly(ctx, [w / 2 - 40, -100, w / 2, -120, w / 2 - 20, -90]);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(w / 2 - 2, -120, 4, 120);
        rect(ctx, 0, 0, w, 7, '#f0f0f0', 3);
        legs(ctx, 0, 7, w, h - 7, '#c0c4cc', 8);
      },
    },
    flowerbed: {
      name: 'Çiçek Tarhı',
      w: 150,
      h: 34,
      garden: true,
      layer: 'front',
      surfaces: () => [],
      draw(ctx, w, h, p, t, st) {
        rect(ctx, 0, h - 14, w, 14, '#6b4a2a', 3);
        const rng = new U.RNG((st && st.seed) || 5);
        for (let i = 0; i < w / 9; i++) {
          const x = 4 + i * 9;
          const fh = rng.float(10, 26);
          ctx.strokeStyle = '#2d6a3e';
          ctx.lineWidth = 2;
          U.line(ctx, x, h - 12, x + Math.sin(t + i) * 2, h - 12 - fh);
          U.circle(ctx, x + Math.sin(t + i) * 2, h - 12 - fh, 4, rng.pick(['#e8283c', '#ffd24a', '#f5f5f5', '#b467ff', '#ff8fa3']));
        }
      },
    },
    shed: {
      name: 'Bahçe Kulübesi',
      w: 440,
      h: 240,
      garden: true,
      layer: 'back',
      surfaces: () => [],
      draw(ctx, w, h) {
        ctx.fillStyle = '#5b3a24';
        U.poly(ctx, [-20, 40, w / 2, -30, w + 20, 40]);
        ctx.fillStyle = '#3a2416';
        U.poly(ctx, [-20, 40, w / 2, -30, w + 20, 40, w + 20, 46, -20, 46]);
        rect(ctx, 0, 40, w, h - 40, '#7a5a3a', 0);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        for (let x = 14; x < w; x += 22) U.line(ctx, x, 42, x, h);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(10, 50, w - 20, h - 50);
      },
    },
    lamppost: {
      name: 'Bahçe Lambası',
      w: 20,
      h: 180,
      garden: true,
      surfaces: () => [],
      draw(ctx, w, h) {
        ctx.fillStyle = '#1c1f2b';
        ctx.fillRect(w / 2 - 3, 20, 6, h - 20);
        ctx.fillRect(w / 2 - 8, h - 10, 16, 10);
        rect(ctx, 0, 0, w, 24, '#2a2e3d', 3);
        ctx.fillStyle = '#fff4c8';
        ctx.fillRect(4, 4, w - 8, 16);
      },
      light: { color: '#ffe0a0', radius: 200, offY: 12 },
    },
  };

  function shine(ctx, x, y, w, h, a = 0.25) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, w, h);
  }

  /* ---------------------------------------------------------------------
   * Sprite önbelleği (animasyonsuz mobilyalar için)
   * ------------------------------------------------------------------- */
  const cache = new Map();
  const PAD = { l: 90, t: 130, r: 90, b: 10 };

  function getSprite(inst) {
    const def = F[inst.type];
    if (def.animated) return null;
    const key = inst.type + '|' + inst.w + '|' + inst.h + '|' + inst.palKey + '|' + (inst.state && inst.state.seed) + '|' + (inst.state && inst.state.open);
    let c = cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = inst.w + PAD.l + PAD.r;
    c.height = inst.h + PAD.t + PAD.b;
    const ctx = c.getContext('2d');
    ctx.translate(PAD.l, PAD.t);
    def.draw(ctx, inst.w, inst.h, inst.pal, 0, inst.state);
    cache.set(key, c);
    return c;
  }

  function draw(ctx, inst, t) {
    const def = F[inst.type];
    const sp = getSprite(inst);
    if (sp) {
      ctx.drawImage(sp, inst.x - PAD.l, inst.y - PAD.t);
    } else {
      ctx.save();
      ctx.translate(inst.x, inst.y);
      def.draw(ctx, inst.w, inst.h, inst.pal, t, inst.state);
      ctx.restore();
    }
    const c = inst.container;
    if (c && c.open) drawOpened(ctx, inst, t);
  }

  /** Açılmış çekmece / kapak görseli */
  function drawOpened(ctx, inst, t) {
    const c = inst.container;
    c.t = Math.min(1, (c.t || 0) + 0.06);
    const k = U.ease.outBack(c.t);
    const x = inst.x;
    const y = inst.y;
    const w = inst.w;
    const h = inst.h;
    const tall = h > 120;
    if (tall) {
      // Dolap kapağı açık: iç karanlık + yana açılmış kanat
      ctx.fillStyle = '#120c08';
      ctx.fillRect(x + 8, y + 12, w - 16, h - 32);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let yy = y + 40; yy < y + h - 30; yy += 40) ctx.fillRect(x + 10, yy, w - 20, 3);
      const pw = (w / 2 - 8) * (1 - k * 0.75);
      ctx.fillStyle = U.shade(inst.pal.wood || '#8a5a34', 0.1);
      ctx.fillRect(x - pw * 0.2, y + 8, pw, h - 26);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - pw * 0.2, y + 8, pw, h - 26);
    } else {
      // Çekmece dışarı çekilmiş
      const dh = Math.min(22, h * 0.32);
      const dy = y + h * 0.18;
      ctx.fillStyle = '#120c08';
      ctx.fillRect(x + 6, dy, w - 12, dh);
      const off = 10 * k;
      ctx.fillStyle = U.shade(inst.pal.wood || inst.pal.cabinet || '#8a5a34', 0.12);
      ctx.fillRect(x + 4 - off * 0.3, dy + off * 0.6, w - 8, dh);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 4 - off * 0.3, dy + off * 0.6, w - 8, dh);
      U.circle(ctx, x + w / 2 - off * 0.3, dy + off * 0.6 + dh / 2, 2.5, '#d9b04a');
    }
  }

  function clearCache() {
    cache.clear();
  }

  RC.Furniture = { DEFS: F, draw, getSprite, clearCache, PAD };
})(window.RC);
