/* =========================================================================
 *  RED CRIME - Çizim kütüphanesi
 *  - Top karakterler (Red Crime, Reis, ev sahipleri) ve insan benzeri kollar
 *  - İkonlar, tuş kapakları, paneller, metin yardımcıları
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const Draw = {};

  /* ---------------------------------------------------------------------
   * Metin ve paneller
   * ------------------------------------------------------------------- */
  Draw.text = (ctx, str, x, y, o = {}) => {
    str = RC.Lx(str);
    const size = o.size || 18;
    ctx.font = `${o.weight || ''} ${size}px ${o.font || C.FONT_UI}`.trim();
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.shadow) {
      ctx.fillStyle = o.shadow === true ? 'rgba(0,0,0,0.6)' : o.shadow;
      ctx.fillText(str, x + (o.shadowOff || 2), y + (o.shadowOff || 2));
    }
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.strokeW || 4;
      ctx.strokeStyle = o.stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || C.COLORS.text;
    ctx.fillText(str, x, y);
    if (o.alpha != null) ctx.globalAlpha = 1;
    return ctx.measureText(str).width;
  };

  Draw.panel = (ctx, x, y, w, h, o = {}) => {
    const r = o.r == null ? 12 : o.r;
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      U.fillRoundRect(ctx, x + 4, y + 6, w, h, r);
    }
    if (o.gradient !== false) {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, o.fillTop || 'rgba(34,40,72,0.94)');
      g.addColorStop(1, o.fill || 'rgba(14,17,34,0.94)');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = o.fill || 'rgba(14,17,34,0.94)';
    }
    U.fillRoundRect(ctx, x, y, w, h, r);
    if (o.border !== false) {
      ctx.lineWidth = o.borderW || 2;
      ctx.strokeStyle = o.border || 'rgba(255,255,255,0.12)';
      U.strokeRoundRect(ctx, x + 1, y + 1, w - 2, h - 2, r);
    }
    if (o.accent) {
      ctx.fillStyle = o.accent;
      U.fillRoundRect(ctx, x, y, w, 4, 2);
    }
  };

  Draw.bar = (ctx, x, y, w, h, t, o = {}) => {
    t = U.clamp01(t);
    ctx.fillStyle = o.bg || 'rgba(0,0,0,0.5)';
    U.fillRoundRect(ctx, x, y, w, h, h / 2);
    if (t > 0) {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, o.from || C.COLORS.red);
      g.addColorStop(1, o.to || C.COLORS.gold);
      ctx.fillStyle = o.color || g;
      U.fillRoundRect(ctx, x, y, Math.max(h, w * t), h, h / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      U.fillRoundRect(ctx, x + 2, y + 1, Math.max(0, w * t - 4), h * 0.35, h / 4);
    }
    if (o.border) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = o.border;
      U.strokeRoundRect(ctx, x, y, w, h, h / 2);
    }
  };

  /** Klavye tuşu kapağı çizer; genişliği döndürür. */
  Draw.key = (ctx, label, x, y, h = 30, o = {}) => {
    label = RC.Lx(RC.Input.keyText(label));
    ctx.font = `bold ${Math.round(h * 0.45)}px ${C.FONT_UI}`;
    const tw = ctx.measureText(label).width;
    const w = Math.max(h, tw + h * 0.6);
    const pressed = o.pressed;
    const off = pressed ? 2 : 0;
    ctx.fillStyle = '#0b0d18';
    U.fillRoundRect(ctx, x, y + 3, w, h, 6);
    ctx.fillStyle = pressed ? '#c9cde0' : o.color || '#eef0fa';
    U.fillRoundRect(ctx, x, y + off, w, h - 1, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    U.fillRoundRect(ctx, x + 3, y + off + h * 0.55, w - 6, h * 0.35, 4);
    ctx.fillStyle = '#1a1d2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + off + h / 2);
    ctx.textBaseline = 'alphabetic';
    return w;
  };

  /* ---------------------------------------------------------------------
   * Kol çizimi (iki segmentli ters kinematik)
   * ------------------------------------------------------------------- */
  Draw.arm = (ctx, sx, sy, hx, hy, o) => {
    const L1 = o.upper || 14;
    const L2 = o.lower || 14;
    const bend = o.bend || 1;
    let dx = hx - sx;
    let dy = hy - sy;
    let d = Math.hypot(dx, dy);
    const maxD = L1 + L2 - 0.5;
    if (d > maxD) {
      hx = sx + (dx / d) * maxD;
      hy = sy + (dy / d) * maxD;
      dx = hx - sx;
      dy = hy - sy;
      d = maxD;
    }
    d = Math.max(d, 1);
    const a = Math.atan2(dy, dx);
    const cosB = U.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const off = Math.acos(cosB) * bend;
    const ex = sx + Math.cos(a + off) * L1;
    const ey = sy + Math.sin(a + off) * L1;
    const th = o.thick || 6;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Dış çizgi
    ctx.strokeStyle = o.outline || 'rgba(0,0,0,0.55)';
    ctx.lineWidth = th + 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // Kol (kol yeni + deri)
    ctx.strokeStyle = o.sleeve || '#333';
    ctx.lineWidth = th + 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = o.skin || '#f1c7a1';
    ctx.lineWidth = th;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // Dirsekte kol yeni kıvrımı
    U.circle(ctx, ex, ey, th * 0.55, o.sleeve || '#333');
    // El
    const hr = th * 0.95;
    U.circle(ctx, hx, hy, hr + 1.5, o.outline || 'rgba(0,0,0,0.55)');
    U.circle(ctx, hx, hy, hr, o.glove || o.skin || '#f1c7a1');
    // Başparmak
    const ta = a + (o.thumbSide || 1) * 1.2;
    U.circle(ctx, hx + Math.cos(ta) * hr * 0.8, hy + Math.sin(ta) * hr * 0.8, hr * 0.45, o.glove || o.skin || '#f1c7a1');
    ctx.lineCap = 'butt';
    return { ex, ey };
  };

  /* ---------------------------------------------------------------------
   * Top karakter
   * o: {x, y, r, body, sx, sy, facing, look, eyes, mouth, mask, hat, hatColor,
   *     mustache, cigar, chain, sunglasses, arms:[{x,y},{x,y}], sleeve, skin,
   *     glove, alpha, blink, outline, shadow, pajama, tilt}
   * ------------------------------------------------------------------- */
  /**
   * Karakterlere hacim ve kenar ışığı: karakter önce ayrı bir katmana çizilir,
   * sonra yalnızca siluetin üstüne (source-atop) tepe ışığı, alt / arka gölgesi
   * ve arka-üst kenarda ay ışığı tonunda ince bir parlama (rim light) eklenir.
   * box: {x0, y0, x1, y1} dünya koordinatında sınırlar, facing: bakış yönü.
   * Düşük grafik kalitesinde doğrudan çizer. fn'in dönüş değeri aynen döner.
   */
  const shadeBuf = { a: null, b: null };
  Draw.shaded = (ctx, box, facing, fn) => {
    if (!ctx.getTransform || (RC.Save && RC.Save.settings && RC.Save.settings.quality === 'low')) return fn(ctx);
    const m = ctx.getTransform();
    const xs = [box.x0, box.x1];
    const ys = [box.y0, box.y1];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const x of xs)
      for (const y of ys) {
        const dx = m.a * x + m.c * y + m.e;
        const dy = m.b * x + m.d * y + m.f;
        minX = Math.min(minX, dx);
        maxX = Math.max(maxX, dx);
        minY = Math.min(minY, dy);
        maxY = Math.max(maxY, dy);
      }
    minX = Math.floor(minX) - 2;
    minY = Math.floor(minY) - 2;
    const w = Math.ceil(maxX) - minX + 4;
    const h = Math.ceil(maxY) - minY + 4;
    if (w <= 0 || h <= 0 || w > 2048 || h > 2048) return fn(ctx);
    const buf = (k) => {
      let c = shadeBuf[k];
      if (!c) c = shadeBuf[k] = document.createElement('canvas');
      if (c.width < w || c.height < h) {
        c.width = Math.max(c.width, w);
        c.height = Math.max(c.height, h);
      }
      const g = c.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.clearRect(0, 0, w, h);
      return { c, g };
    };
    const A = buf('a');
    const g = A.g;
    g.setTransform(m.a, m.b, m.c, m.d, m.e - minX, m.f - minY);
    const ret = fn(g);
    g.setTransform(m.a, m.b, m.c, m.d, m.e - minX, m.f - minY);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-atop';
    // Tepe ışığı → alt gölge
    const bh = box.y1 - box.y0;
    const vg = g.createLinearGradient(0, box.y0, 0, box.y1);
    vg.addColorStop(0, 'rgba(255,240,220,0.14)');
    vg.addColorStop(0.35, 'rgba(255,240,220,0)');
    vg.addColorStop(0.7, 'rgba(0,0,10,0.08)');
    vg.addColorStop(1, 'rgba(0,0,10,0.3)');
    g.fillStyle = vg;
    g.fillRect(box.x0, box.y0, box.x1 - box.x0, bh);
    // Arka taraf gölgede
    const cx = (box.x0 + box.x1) / 2;
    const back = facing > 0 ? box.x0 : box.x1;
    const hg = g.createLinearGradient(back, 0, cx + facing * (box.x1 - box.x0) * 0.15, 0);
    hg.addColorStop(0, 'rgba(0,0,12,0.26)');
    hg.addColorStop(1, 'rgba(0,0,12,0)');
    g.fillStyle = hg;
    g.fillRect(box.x0, box.y0, box.x1 - box.x0, bh);
    // Kenar ışığı: silueti ışık yönünde kaydırıp çıkarınca ince bir kenar kalır
    const B = buf('b');
    const rg = B.g;
    rg.drawImage(A.c, 0, 0, w, h, 0, 0, w, h);
    rg.globalCompositeOperation = 'source-in';
    rg.fillStyle = 'rgba(170,200,255,0.6)';
    rg.fillRect(0, 0, w, h);
    rg.globalCompositeOperation = 'destination-out';
    const d = U.clamp(Math.abs(m.a) * 1.3, 1.2, 2.6);
    rg.drawImage(A.c, 0, 0, w, h, facing * d, d * 0.8, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(B.c, 0, 0, w, h, 0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(A.c, 0, 0, w, h, minX, minY, w, h);
    ctx.restore();
    return ret;
  };

  /** Oyuncunun (operatör) renkleri: koyu kırmızı tulum, siyah eldiven ve kollar */
  const OPERATOR = { body: '#b3141f', balaclava: '#17181d', sleeve: '#16171d', glove: '#0f0f12', skin: '#0f0f12' };

  Draw.character = (ctx, o) => {
    if (o.operator) o = Object.assign({}, o, OPERATOR);
    const r = o.r || 22;
    const sx = o.sx || 1;
    const sy = o.sy || 1;
    const f = o.facing || 1;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.translate(o.x, o.y);

    // Zemin gölgesi
    if (o.shadow !== false) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      U.ellipse(ctx, 0, r * sy + (o.shadowOff || 0), r * 0.9 * sx, r * 0.18, 0);
    }

    const shoulderY = r * 0.12 * sy;
    const shoulders = [
      { x: -r * 0.88 * sx, y: shoulderY },
      { x: r * 0.88 * sx, y: shoulderY },
    ];
    const armStyle = {
      upper: o.armUpper || r * 0.62,
      lower: o.armLower || r * 0.62,
      thick: o.armThick || Math.max(4, r * 0.26),
      sleeve: o.sleeve || '#2a2d3e',
      skin: o.skin || '#f1c7a1',
      glove: o.glove,
    };

    // Arka kol (bakış yönünün tersi)
    const arms = o.arms || [
      { x: -r * 1.1, y: r * 0.7 },
      { x: r * 1.1, y: r * 0.7 },
    ];
    const backIdx = f > 0 ? 0 : 1;
    const frontIdx = 1 - backIdx;
    if (!o.armsFront) {
      Draw.arm(ctx, shoulders[backIdx].x, shoulders[backIdx].y, arms[backIdx].x, arms[backIdx].y, {
        ...armStyle,
        sleeve: U.shade(armStyle.sleeve, -0.25),
        skin: U.shade(armStyle.skin, -0.15),
        glove: armStyle.glove ? U.shade(armStyle.glove, -0.2) : undefined,
        bend: backIdx === 0 ? -1 : 1,
        thumbSide: backIdx === 0 ? 1 : -1,
      });
    }

    // Gövde (top)
    ctx.save();
    ctx.rotate(o.tilt || 0);
    ctx.scale(sx, sy);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, U.shade(o.body || '#e8283c', 0.35));
    g.addColorStop(0.55, o.body || '#e8283c');
    g.addColorStop(1, U.shade(o.body || '#e8283c', -0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, U.TAU);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = o.outline || 'rgba(0,0,0,0.6)';
    ctx.stroke();

    // Pijama çizgileri
    if (o.pajama) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, U.TAU);
      ctx.clip();
      ctx.strokeStyle = U.rgba('#ffffff', 0.22);
      ctx.lineWidth = r * 0.14;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.36, -r);
        ctx.lineTo(i * r * 0.36, r);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Kar maskesi (balaclava): başın üst kısmını örten örgü
    if (o.balaclava) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, 0, U.TAU);
      ctx.clip();
      const bc = o.balaclava;
      const mg = ctx.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.05);
      mg.addColorStop(0, U.shade(bc, 0.25));
      mg.addColorStop(1, U.shade(bc, -0.35));
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.moveTo(-r, -r);
      ctx.lineTo(r, -r);
      const mb = o.operator ? 0.3 : 0.52; // maskenin alt kenarı (operatörde kırmızı tulum daha görünür)
      ctx.lineTo(r, r * mb);
      for (let i = 8; i >= 0; i--) {
        const x = -r + (i / 8) * r * 2;
        ctx.lineTo(x, r * mb + (i % 2 ? 3 : -1));
      }
      ctx.closePath();
      ctx.fill();
      // Örgü dokusu
      ctx.strokeStyle = U.rgba('#000000', 0.28);
      ctx.lineWidth = 1;
      for (let x = -r; x < r; x += r * 0.16) {
        ctx.beginPath();
        for (let y = -r; y < r * mb; y += 4) {
          ctx.moveTo(x - 1.2, y);
          ctx.lineTo(x, y + 2.5);
          ctx.lineTo(x + 1.2, y);
        }
        ctx.stroke();
      }
      // Boyun ribanası
      ctx.fillStyle = U.shade(bc, 0.08);
      ctx.fillRect(-r, r * (mb - 0.12), r * 2, r * 0.14);
      ctx.strokeStyle = U.rgba('#000000', 0.35);
      for (let x = -r; x < r; x += 3) U.line(ctx, x, r * (mb - 0.12), x, r * (mb + 0.02));
      ctx.restore();
    }

    if (o.operator) drawOperatorGear(ctx, r, f, o);

    // Hacim: yumuşak parlama, alt yansıma ve kenar boyunca gölge halkası
    {
      const hl = ctx.createRadialGradient(-r * 0.38, -r * 0.45, 0, -r * 0.38, -r * 0.45, r * 0.55);
      hl.addColorStop(0, o.balaclava ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)');
      hl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hl;
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, 0, U.TAU);
      ctx.fill();
      ctx.fillStyle = o.balaclava ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.4)';
      U.ellipse(ctx, -r * 0.4, -r * 0.52, r * 0.2, r * 0.1, -0.5);
      const ao = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
      ao.addColorStop(0, 'rgba(0,0,0,0)');
      ao.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = ao;
      ctx.beginPath();
      ctx.arc(0, 0, r - 0.5, 0, U.TAU);
      ctx.fill();
      // Zeminden yansıyan sıcak ışık (alt kenar)
      ctx.strokeStyle = 'rgba(255,190,150,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r - 2, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }

    // Altın zincir
    if (o.chain) {
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, r * 0.05, r * 0.7, 0.35, Math.PI - 0.35);
      ctx.stroke();
      U.circle(ctx, 0, r * 0.75, r * 0.14, '#ffd24a');
      ctx.fillStyle = '#b8861a';
      ctx.font = `bold ${Math.round(r * 0.18)}px ${C.FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, r * 0.76);
    }

    // Yüz
    const faceX = f * r * 0.28 + (o.look ? o.look.x * r * 0.08 : 0);
    const faceY = -r * 0.12 + (o.look ? o.look.y * r * 0.06 : 0);
    ctx.translate(faceX, faceY);

    // Hırsız maskesi
    if (o.mask) {
      ctx.fillStyle = '#15161d';
      ctx.beginPath();
      ctx.moveTo(-r * 1.05, -r * 0.32);
      ctx.quadraticCurveTo(0, -r * 0.48, r * 0.8, -r * 0.3);
      ctx.lineTo(r * 0.78, r * 0.1);
      ctx.quadraticCurveTo(0, r * 0.02, -r * 1.02, r * 0.12);
      ctx.closePath();
      ctx.fill();
      // Maske kuyrukları
      ctx.beginPath();
      ctx.moveTo(-r * 0.95 * f, -r * 0.1);
      ctx.quadraticCurveTo(-r * 1.4 * f, -r * 0.2 + Math.sin((o.t || 0) * 8) * 3, -r * 1.6 * f, r * 0.05);
      ctx.lineTo(-r * 1.55 * f, r * 0.2);
      ctx.quadraticCurveTo(-r * 1.3 * f, 0, -r * 0.95 * f, r * 0.05);
      ctx.fill();
    }

    if (o.operator) {
      drawOperatorFace(ctx, r, o);
    } else if (o.balaclava) {
      // Göz ve ağız delikleri (içinden ten görünür)
      const skin = o.faceSkin || '#e3ad86';
      ctx.fillStyle = skin;
      ctx.beginPath();
      U.roundRect(ctx, -r * 0.62, -r * 0.4, r * 1.24, r * 0.52, r * 0.24);
      ctx.fill();
      ctx.strokeStyle = U.shade(o.balaclava, -0.4);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = skin;
      U.ellipse(ctx, 0, r * 0.32, r * 0.2, r * 0.14, 0);
      ctx.stroke();
    }
    if (!o.operator) {
      drawEyes(ctx, r, o);
      drawMouth(ctx, r, o);
    }

    if (o.mustache) {
      ctx.fillStyle = o.mustacheColor || '#3b2a1e';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.22);
      ctx.quadraticCurveTo(-r * 0.25, r * 0.08, -r * 0.45, r * 0.3);
      ctx.quadraticCurveTo(-r * 0.2, r * 0.32, 0, r * 0.28);
      ctx.quadraticCurveTo(r * 0.2, r * 0.32, r * 0.45, r * 0.3);
      ctx.quadraticCurveTo(r * 0.25, r * 0.08, 0, r * 0.22);
      ctx.fill();
    }
    if (o.cigar) {
      ctx.save();
      ctx.translate(r * 0.25 * f, r * 0.38);
      ctx.rotate(0.15 * f);
      ctx.fillStyle = '#6b3d1f';
      ctx.fillRect(f > 0 ? 0 : -r * 0.7, -r * 0.07, r * 0.7, r * 0.14);
      ctx.fillStyle = '#c9a26b';
      ctx.fillRect(f > 0 ? r * 0.12 : -r * 0.22, -r * 0.075, r * 0.1, r * 0.15);
      const tip = f > 0 ? r * 0.7 : -r * 0.7;
      U.circle(ctx, tip, 0, r * 0.08, '#ff6a2e');
      ctx.restore();
    }
    ctx.restore(); // gövde dönüşümü

    // Şapka
    drawHat(ctx, r, sx, sy, f, o);

    // Ön kol
    if (!o.noArms) {
      Draw.arm(ctx, shoulders[frontIdx].x, shoulders[frontIdx].y, arms[frontIdx].x, arms[frontIdx].y, {
        ...armStyle,
        bend: frontIdx === 0 ? -1 : 1,
        thumbSide: frontIdx === 0 ? 1 : -1,
      });
      if (o.armsFront) {
        Draw.arm(ctx, shoulders[backIdx].x, shoulders[backIdx].y, arms[backIdx].x, arms[backIdx].y, {
          ...armStyle,
          bend: backIdx === 0 ? -1 : 1,
          thumbSide: backIdx === 0 ? 1 : -1,
        });
      }
    }

    ctx.restore();
  };

  /* ------------------------------------------------------------------
   * Operatör (oyuncu): kar maskeli, taktik teçhizatlı ciddi hırsız.
   * Gövde dönüşümü içinde, topun kendi koordinatlarında çizilir.
   * ---------------------------------------------------------------- */
  function drawOperatorGear(ctx, r, f, o) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, U.TAU);
    ctx.clip();
    // Kumaş dokusu (gövde)
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 0.8;
    for (let x = -r * 2; x < r; x += 3) U.line(ctx, x, r * 0.5, x + r, r * 1.5);
    // Gözlük kayışı (kafanın çevresinde)
    ctx.fillStyle = '#0c0d10';
    ctx.fillRect(-r, -r * 0.8, r * 2, r * 0.11);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(-r, -r * 0.8, r * 2, r * 0.025);
    // Kemer + toka + cep
    ctx.fillStyle = '#101115';
    ctx.fillRect(-r, r * 0.78, r * 2, r * 0.13);
    ctx.fillStyle = '#6d727c';
    ctx.fillRect(f * r * 0.1 - r * 0.06, r * 0.78, r * 0.12, r * 0.13);
    ctx.fillStyle = '#16171c';
    U.fillRoundRect(ctx, -f * r * 0.42 - r * 0.12, r * 0.6, r * 0.24, r * 0.2, r * 0.04);
    // Fermuar
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.2;
    U.line(ctx, f * r * 0.22, r * 0.32, f * r * 0.16, r * 0.78);
    // Soğuk ay ışığı kenar parlaması (arka kenar) — siluete sertlik verir
    ctx.strokeStyle = 'rgba(150,180,255,0.28)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (f > 0) ctx.arc(0, 0, r - 1.5, Math.PI * 0.95, Math.PI * 1.45);
    else ctx.arc(0, 0, r - 1.5, -Math.PI * 0.45, Math.PI * 0.05);
    ctx.stroke();
    ctx.restore();
  }

  function drawOperatorFace(ctx, r, o) {
    const eyes = o.eyes || 'open';
    const blink = o.blink || 0;
    const lookX = o.look ? o.look.x : 0;
    const lookY = o.look ? o.look.y : 0;
    const wide = eyes === 'wide';
    const shut = eyes === 'closed' || eyes === 'sleep' || blink > 0.5;
    const skin = o.faceSkin || '#c99a78';
    const mask = o.balaclava || '#17181d';
    // Dar göz yarığı
    const sy0 = -r * 0.3;
    const sh = r * (wide ? 0.34 : 0.27);
    ctx.fillStyle = U.shade(skin, -0.22);
    ctx.beginPath();
    U.roundRect(ctx, -r * 0.6, sy0, r * 1.2, sh, r * 0.1);
    ctx.fill();
    // Yarık içinde gözler (göz kapağı gölgesi üstten)
    ctx.save();
    ctx.clip();
    const ey = sy0 + sh * 0.55;
    for (const side of [-1, 1]) {
      const x = side * r * 0.27;
      if (shut) {
        ctx.strokeStyle = '#1a1210';
        ctx.lineWidth = 1.6;
        U.line(ctx, x - r * 0.15, ey, x + r * 0.15, ey);
        continue;
      }
      const ew = r * 0.17;
      const eh = r * (wide ? 0.12 : 0.085);
      U.ellipse(ctx, x, ey, ew, eh, 0, '#d9d3c9');
      const ix = x + lookX * ew * 0.4;
      const iy = ey + lookY * eh * 0.3;
      U.circle(ctx, ix, iy, r * 0.075, '#2a1c12');
      U.circle(ctx, ix, iy, r * 0.04, '#07070a');
      U.circle(ctx, ix - r * 0.025, iy - r * 0.03, r * 0.018, 'rgba(255,255,255,0.85)');
      // Çatık kaş / göz kapağı: içe doğru inen sert gölge
      ctx.fillStyle = 'rgba(10,6,4,0.55)';
      ctx.beginPath();
      const inner = wide ? 0 : r * 0.06;
      ctx.moveTo(x - side * r * 0.2, sy0 - 1);
      ctx.lineTo(x + side * r * 0.2, sy0 - 1);
      ctx.lineTo(x + side * r * 0.2, sy0 + r * 0.04);
      ctx.lineTo(x - side * r * 0.2, sy0 + r * 0.04 + inner);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Yarık kenarı dikişi
    ctx.strokeStyle = U.shade(mask, -0.5);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    U.roundRect(ctx, -r * 0.6, sy0, r * 1.2, sh, r * 0.1);
    ctx.stroke();
    // Alna kaldırılmış gece görüş gözlüğü
    const gy = -r * 0.62;
    const gg = ctx.createLinearGradient(0, gy - r * 0.16, 0, gy + r * 0.16);
    gg.addColorStop(0, '#3a3d45');
    gg.addColorStop(1, '#141519');
    ctx.fillStyle = gg;
    U.fillRoundRect(ctx, -r * 0.42, gy - r * 0.15, r * 0.84, r * 0.3, r * 0.08);
    for (const side of [-1, 1]) {
      const lx = side * r * 0.2;
      U.circle(ctx, lx, gy, r * 0.11, '#0a0b0d');
      U.circle(ctx, lx, gy, r * 0.075, '#123b2a');
      U.circle(ctx, lx - r * 0.03, gy - r * 0.03, r * 0.025, 'rgba(160,255,200,0.6)');
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-r * 0.38, gy - r * 0.14, r * 0.76, r * 0.04);
  }

  function drawEyes(ctx, r, o) {
    const eyes = o.eyes || 'open';
    const ex = r * 0.26;
    const ey = -r * 0.12;
    const er = r * 0.2;
    const lookX = o.look ? o.look.x : 0;
    const lookY = o.look ? o.look.y : 0;
    const blink = o.blink || 0;

    if (o.sunglasses) {
      ctx.fillStyle = '#0a0a10';
      U.fillRoundRect(ctx, -ex - er * 1.2, ey - er * 0.9, er * 2.4, er * 1.7, er * 0.6);
      U.fillRoundRect(ctx, ex - er * 1.2, ey - er * 0.9, er * 2.4, er * 1.7, er * 0.6);
      ctx.fillRect(-ex + er, ey - er * 0.4, ex * 2 - er * 2, er * 0.35);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(-ex - er * 0.8, ey - er * 0.6, er * 0.6, er * 0.3);
      ctx.fillRect(ex - er * 0.8, ey - er * 0.6, er * 0.6, er * 0.3);
      return;
    }

    for (const side of [-1, 1]) {
      const x = side * ex;
      if (eyes === 'closed' || eyes === 'sleep' || blink > 0.5) {
        ctx.strokeStyle = '#1a1a22';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        if (eyes === 'sleep') ctx.arc(x, ey - er * 0.2, er * 0.7, 0.2, Math.PI - 0.2);
        else ctx.arc(x, ey + er * 0.3, er * 0.7, Math.PI + 0.2, -0.2);
        ctx.stroke();
        continue;
      }
      let h = er * (eyes === 'wide' ? 1.25 : eyes === 'sleepy' ? 0.55 : 1);
      U.ellipse(ctx, x, ey, er * 0.9, h, 0, '#ffffff');
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const pr = er * (eyes === 'wide' ? 0.38 : 0.5);
      U.circle(ctx, x + lookX * er * 0.35, ey + lookY * h * 0.35, pr, '#141420');
      U.circle(ctx, x + lookX * er * 0.35 - pr * 0.35, ey + lookY * h * 0.35 - pr * 0.35, pr * 0.35, '#ffffff');
      if (eyes === 'sleepy') {
        ctx.fillStyle = o.body || '#888';
        ctx.fillRect(x - er, ey - h - 2, er * 2, h * 0.9);
      }
      // Kaşlar
      const brow = o.mouth === 'angry' || eyes === 'angry' ? 0.45 : o.mouth === 'worried' ? -0.4 : 0;
      if (brow !== 0 || o.brows) {
        ctx.strokeStyle = '#1a1a22';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - er * 0.9, ey - h - 3 - side * brow * er * 0.6);
        ctx.lineTo(x + er * 0.9, ey - h - 3 + side * brow * er * 0.6);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }

  function drawMouth(ctx, r, o) {
    const m = o.mouth || 'smile';
    const y = r * 0.32;
    ctx.strokeStyle = '#1a1a22';
    ctx.fillStyle = '#5a1320';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    switch (m) {
      case 'smile':
        ctx.arc(0, y - r * 0.14, r * 0.2, 0.3, Math.PI - 0.3);
        ctx.stroke();
        break;
      case 'grin':
        ctx.moveTo(-r * 0.25, y - r * 0.05);
        ctx.quadraticCurveTo(0, y + r * 0.25, r * 0.25, y - r * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-r * 0.18, y - r * 0.04, r * 0.36, r * 0.06);
        break;
      case 'o':
        U.ellipse(ctx, 0, y, r * 0.09, r * 0.12, 0, '#5a1320');
        break;
      case 'open':
        U.ellipse(ctx, 0, y, r * 0.16, r * 0.14, 0, '#5a1320');
        break;
      case 'frown':
      case 'worried':
        ctx.arc(0, y + r * 0.12, r * 0.16, Math.PI + 0.4, -0.4);
        ctx.stroke();
        break;
      case 'angry':
        ctx.moveTo(-r * 0.18, y + r * 0.04);
        ctx.lineTo(r * 0.18, y - r * 0.02);
        ctx.stroke();
        break;
      case 'flat':
        ctx.moveTo(-r * 0.14, y);
        ctx.lineTo(r * 0.14, y);
        ctx.stroke();
        break;
      case 'snore':
        U.ellipse(ctx, 0, y, r * 0.1, r * 0.08 + Math.sin((o.t || 0) * 2) * r * 0.04, 0, '#5a1320');
        break;
      default:
        break;
    }
    ctx.lineCap = 'butt';
  }

  function drawHat(ctx, r, sx, sy, f, o) {
    const hat = o.hat;
    if (!hat || hat === 'none') return;
    const col = o.hatColor || '#222';
    const topY = -r * sy;
    ctx.save();
    ctx.translate(0, topY);
    if (hat === 'beanie') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r * 0.82 * sx, r * 0.42);
      ctx.quadraticCurveTo(-r * 0.8 * sx, -r * 0.3, 0, -r * 0.34);
      ctx.quadraticCurveTo(r * 0.8 * sx, -r * 0.3, r * 0.82 * sx, r * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = U.shade(col, -0.25);
      U.fillRoundRect(ctx, -r * 0.88 * sx, r * 0.24, r * 1.76 * sx, r * 0.28, r * 0.12);
      // Ribanalar
      ctx.strokeStyle = U.shade(col, -0.4);
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) U.line(ctx, i * r * 0.22 * sx, r * 0.26, i * r * 0.22 * sx, r * 0.5);
      // Ponpon
      U.circle(ctx, 0, -r * 0.36, r * 0.18, U.shade(col, 0.3));
    } else if (hat === 'fedora') {
      ctx.fillStyle = col;
      U.fillRoundRect(ctx, -r * 1.2 * sx, r * 0.22, r * 2.4 * sx, r * 0.18, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(-r * 0.7 * sx, r * 0.26);
      ctx.lineTo(-r * 0.6 * sx, -r * 0.45);
      ctx.quadraticCurveTo(0, -r * 0.3, r * 0.6 * sx, -r * 0.45);
      ctx.lineTo(r * 0.7 * sx, r * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.bandColor || '#8f1020';
      ctx.fillRect(-r * 0.69 * sx, r * 0.02, r * 1.38 * sx, r * 0.16);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-r * 0.5 * sx, -r * 0.3, r * 0.2, r * 0.3);
    } else if (hat === 'nightcap') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85 * sx, r * 0.4);
      ctx.quadraticCurveTo(-r * 0.4, -r * 0.5, r * 0.5 * -f, -r * 0.4);
      ctx.quadraticCurveTo(-f * r * 1.1, -r * 0.3, -f * r * 1.4, r * 0.5);
      ctx.lineTo(-f * r * 1.2, r * 0.55);
      ctx.quadraticCurveTo(r * 0.3 * f, -r * 0.1, r * 0.85 * sx, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = U.shade(col, -0.15);
      U.fillRoundRect(ctx, -r * 0.9 * sx, r * 0.28, r * 1.8 * sx, r * 0.22, r * 0.1);
      U.circle(ctx, -f * r * 1.35, r * 0.6, r * 0.16, '#ffffff');
    } else if (hat === 'cap') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, r * 0.45, r * 0.78 * sx, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = U.shade(col, -0.3);
      U.fillRoundRect(ctx, f > 0 ? 0 : -r * 1.3, r * 0.34, r * 1.3, r * 0.16, r * 0.08);
    } else if (hat === 'police') {
      ctx.fillStyle = '#1b2a55';
      U.fillRoundRect(ctx, -r * 0.9 * sx, -r * 0.2, r * 1.8 * sx, r * 0.55, r * 0.15);
      ctx.fillStyle = '#0e1633';
      U.fillRoundRect(ctx, -r * 0.8 * sx, r * 0.3, r * 1.6 * sx, r * 0.18, r * 0.06);
      U.circle(ctx, 0, r * 0.05, r * 0.14, '#ffd24a');
    }
    ctx.restore();
  }

  /* ---------------------------------------------------------------------
   * Konuşma balonu
   * ------------------------------------------------------------------- */
  Draw.speech = (ctx, x, y, text, o = {}) => {
    text = RC.Lx(text);
    const size = o.size || 15;
    ctx.font = `bold ${size}px ${C.FONT_UI}`;
    const w = ctx.measureText(text).width + 22;
    const h = size + 16;
    const bx = x - w / 2;
    const by = y - h - 12;
    const a = o.alpha == null ? 1 : o.alpha;
    ctx.globalAlpha = a;
    ctx.fillStyle = o.bg || '#ffffff';
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    U.roundRect(ctx, bx, by, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 7, by + h - 1);
    ctx.lineTo(x, by + h + 10);
    ctx.lineTo(x + 7, by + h - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = o.color || '#15161d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
  };

  /** Ünlem / soru işareti uyarısı */
  Draw.alertMark = (ctx, x, y, kind, t, scale = 1) => {
    const s = scale * (1 + Math.sin(t * 10) * 0.06);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    const col = kind === '!' ? '#ff3043' : kind === '?' ? '#ffc83d' : '#8fb7ff';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    U.circle(ctx, 1, 2, 15);
    U.circle(ctx, 0, 0, 15, col);
    ctx.fillStyle = '#fff';
    ctx.font = `bold 22px ${C.FONT_TITLE}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kind, 0, 1);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  };

  /* ---------------------------------------------------------------------
   * İkonlar (vektör)
   * ------------------------------------------------------------------- */
  Draw.icon = (ctx, name, x, y, s, color = '#fff') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 24, s / 24);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const fn = ICONS[name];
    if (fn) fn(ctx, color);
    ctx.restore();
  };

  const ICONS = {
    clock(ctx) {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, U.TAU);
      ctx.stroke();
      U.line(ctx, 0, 0, 0, -6);
      U.line(ctx, 0, 0, 5, 3);
    },
    money(ctx, c) {
      U.fillRoundRect(ctx, -11, -7, 22, 14, 2, c);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      U.circle(ctx, 0, 0, 4);
      ctx.fillRect(-9, -5, 3, 3);
      ctx.fillRect(6, 2, 3, 3);
    },
    coin(ctx, c) {
      U.circle(ctx, 0, 0, 10, c);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);
    },
    key(ctx) {
      ctx.beginPath();
      ctx.arc(-5, 0, 5.5, 0, U.TAU);
      ctx.stroke();
      U.line(ctx, 0, 0, 11, 0);
      U.line(ctx, 8, 0, 8, 5);
      U.line(ctx, 11, 0, 11, 4);
    },
    bag(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.quadraticCurveTo(-12, 11, 0, 11);
      ctx.quadraticCurveTo(12, 11, 9, -4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.lineTo(-3, -10);
      ctx.lineTo(3, -10);
      ctx.lineTo(6, -4);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 7);
      ctx.fillStyle = c;
    },
    star(ctx, c) {
      U.star(ctx, 0, 0, 11, 5, 5);
      ctx.fillStyle = c;
      ctx.fill();
    },
    starEmpty(ctx) {
      U.star(ctx, 0, 0, 11, 5, 5);
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    lock(ctx, c) {
      U.fillRoundRect(ctx, -9, -2, 18, 13, 3, c);
      ctx.beginPath();
      ctx.arc(0, -3, 6, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      U.circle(ctx, 0, 4, 2.5);
    },
    eye(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(0, -11, 12, 0);
      ctx.quadraticCurveTo(0, 11, -12, 0);
      ctx.closePath();
      ctx.stroke();
      U.circle(ctx, 0, 0, 4, c);
    },
    ear(ctx) {
      ctx.beginPath();
      ctx.arc(0, -2, 7, Math.PI * 0.9, Math.PI * 2.3);
      ctx.quadraticCurveTo(4, 8, -1, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -2, 3, Math.PI, Math.PI * 2.2);
      ctx.stroke();
    },
    sound(ctx, c) {
      U.poly(ctx, [-10, -4, -5, -4, 1, -9, 1, 9, -5, 4, -10, 4], c);
      ctx.beginPath();
      ctx.arc(2, 0, 6, -0.8, 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2, 0, 10, -0.8, 0.8);
      ctx.stroke();
    },
    gear(ctx, c) {
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 4);
        ctx.fillRect(-2.5, -12, 5, 6);
        ctx.restore();
      }
      U.circle(ctx, 0, 0, 8, c);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      U.circle(ctx, 0, 0, 3.5);
    },
    play(ctx, c) {
      U.poly(ctx, [-6, -10, 10, 0, -6, 10], c);
    },
    home(ctx, c) {
      U.poly(ctx, [-11, 0, 0, -10, 11, 0, 8, 0, 8, 10, -8, 10, -8, 0], c);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-3, 3, 6, 7);
    },
    truck(ctx, c) {
      ctx.fillRect(-12, -7, 15, 13);
      U.poly(ctx, [4, -3, 9, -3, 12, 2, 12, 6, 4, 6], c);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      U.circle(ctx, -7, 7, 3);
      U.circle(ctx, 7, 7, 3);
    },
    flashlight(ctx, c) {
      ctx.save();
      ctx.rotate(-0.6);
      U.fillRoundRect(ctx, -11, -3.5, 13, 7, 2, c);
      U.poly(ctx, [2, -5, 7, -7, 7, 7, 2, 5], c);
      ctx.globalAlpha = 0.5;
      U.poly(ctx, [7, -5, 14, -10, 14, 10, 7, 5], c);
      ctx.restore();
    },
    shoe(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-4, -8);
      ctx.lineTo(-3, 0);
      ctx.quadraticCurveTo(10, 0, 11, 6);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-10, 6, 21, 3);
    },
    muscle(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(-11, 8);
      ctx.lineTo(-6, -2);
      ctx.quadraticCurveTo(-4, -10, 2, -9);
      ctx.lineTo(3, -5);
      ctx.lineTo(-1, -3);
      ctx.quadraticCurveTo(8, -6, 11, 3);
      ctx.quadraticCurveTo(8, 10, -2, 8);
      ctx.closePath();
      ctx.fill();
    },
    safe(ctx, c) {
      U.fillRoundRect(ctx, -11, -11, 22, 22, 3, c);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      U.circle(ctx, 0, 0, 6);
      ctx.fillStyle = c;
      U.circle(ctx, 0, 0, 3);
    },
    run(ctx, c) {
      U.circle(ctx, 3, -8, 3.5, c);
      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.lineTo(-2, 4);
      ctx.lineTo(3, 10);
      ctx.moveTo(-2, 4);
      ctx.lineTo(-9, 7);
      ctx.moveTo(1, -1);
      ctx.lineTo(8, 1);
      ctx.moveTo(1, -1);
      ctx.lineTo(-6, -2);
      ctx.stroke();
    },
    police(ctx) {
      U.fillRoundRect(ctx, -11, -3, 22, 10, 3, '#2a4bff');
      ctx.fillStyle = '#ff2a3b';
      ctx.fillRect(-4, -8, 4, 5);
      ctx.fillStyle = '#2a8bff';
      ctx.fillRect(0, -8, 4, 5);
      ctx.fillStyle = '#000';
      U.circle(ctx, -6, 8, 3);
      U.circle(ctx, 6, 8, 3);
    },
    zzz(ctx, c) {
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('z', -5, 6);
      ctx.font = 'bold 11px Arial';
      ctx.fillText('z', 3, -1);
      ctx.font = 'bold 8px Arial';
      ctx.fillText('z', 9, -7);
      ctx.fillStyle = c;
    },
    exclaim(ctx) {
      ctx.fillRect(-2.5, -11, 5, 14);
      U.circle(ctx, 0, 8, 3);
    },
    question(ctx) {
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -4, 6, Math.PI * 1.1, Math.PI * 2.4);
      ctx.lineTo(0, 4);
      ctx.stroke();
      U.circle(ctx, 0, 9, 2.4);
    },
    hand(ctx, c) {
      U.fillRoundRect(ctx, -7, -2, 14, 12, 4, c);
      for (let i = 0; i < 4; i++) U.fillRoundRect(ctx, -7 + i * 3.6, -10, 3, 10, 1.5, c);
      U.fillRoundRect(ctx, 6, -2, 6, 4, 2, c);
    },
    map(ctx, c) {
      U.poly(ctx, [-11, -8, -4, -10, 4, -7, 11, -9, 11, 8, 4, 10, -4, 7, -11, 9], c);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      U.line(ctx, -4, -10, -4, 7);
      U.line(ctx, 4, -7, 4, 10);
    },
    trophy(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(-7, -10);
      ctx.lineTo(7, -10);
      ctx.lineTo(6, -1);
      ctx.quadraticCurveTo(0, 5, -6, -1);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-2, 2, 4, 5);
      ctx.fillRect(-6, 7, 12, 3);
      ctx.beginPath();
      ctx.arc(-8, -5, 3.5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, -5, 3.5, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
    },
    back(ctx) {
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-8, 0);
      ctx.moveTo(-2, -7);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-2, 7);
      ctx.stroke();
    },
    retry(ctx) {
      ctx.beginPath();
      ctx.arc(0, 0, 8, -Math.PI * 0.3, Math.PI * 1.5);
      ctx.stroke();
      U.poly(ctx, [4, -12, 10, -6, 2, -4], ctx.fillStyle);
    },
    info(ctx, c) {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, U.TAU);
      ctx.stroke();
      ctx.fillRect(-1.5, -2, 3, 8);
      U.circle(ctx, 0, -6, 1.8, c);
    },
    shop(ctx, c) {
      U.poly(ctx, [-10, -4, 10, -4, 8, 10, -8, 10], c);
      ctx.beginPath();
      ctx.arc(0, -4, 5, Math.PI, 0);
      ctx.stroke();
    },
    check(ctx) {
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-2, 7);
      ctx.lineTo(9, -7);
      ctx.stroke();
    },
    cross(ctx) {
      ctx.lineWidth = 3.5;
      U.line(ctx, -7, -7, 7, 7);
      U.line(ctx, 7, -7, -7, 7);
    },
    weight(ctx, c) {
      U.poly(ctx, [-6, -4, 6, -4, 10, 10, -10, 10], c);
      ctx.beginPath();
      ctx.arc(0, -6, 4, 0, U.TAU);
      ctx.stroke();
    },
    fragile(ctx, c) {
      ctx.beginPath();
      ctx.moveTo(-7, -10);
      ctx.lineTo(7, -10);
      ctx.lineTo(5, 0);
      ctx.quadraticCurveTo(0, 4, -5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-1, 2, 2, 6);
      ctx.fillRect(-5, 8, 10, 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, -10);
      ctx.lineTo(1, -6);
      ctx.lineTo(-1, -3);
      ctx.stroke();
    },
    dog(ctx, c) {
      U.ellipse(ctx, 0, 2, 10, 7, 0, c);
      U.ellipse(ctx, -8, -4, 3.5, 6, 0.4, c);
      U.ellipse(ctx, 8, -4, 3.5, 6, -0.4, c);
      ctx.fillStyle = '#000';
      U.circle(ctx, -3, 0, 1.6);
      U.circle(ctx, 3, 0, 1.6);
      U.ellipse(ctx, 0, 5, 2.5, 2, 0);
    },
  };
  ICONS.door = (ctx, c) => {
    U.fillRoundRect(ctx, -7, -11, 14, 22, 2, c);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    U.circle(ctx, 4, 1, 1.8);
  };
  ICONS.cloud = (ctx, c) => {
    U.circle(ctx, -5, 2, 6, c);
    U.circle(ctx, 3, -2, 8, c);
    U.circle(ctx, 8, 4, 5, c);
    ctx.fillRect(-8, 2, 18, 7);
  };
  ICONS.bolt = (ctx, c) => {
    U.poly(ctx, [2, -12, -8, 2, -1, 2, -3, 12, 8, -3, 1, -3], c);
  };
  ICONS.camera = (ctx, c) => {
    U.fillRoundRect(ctx, -10, -6, 16, 12, 3, c);
    U.poly(ctx, [6, -3, 12, -7, 12, 7, 6, 3], c);
    ctx.fillStyle = '#ff3043';
    U.circle(ctx, -6, -2, 2);
  };
  ICONS.laser = (ctx, c) => {
    ctx.fillRect(-12, -8, 4, 16);
    ctx.fillRect(8, -8, 4, 16);
    ctx.strokeStyle = '#ff3043';
    ctx.lineWidth = 2;
    U.line(ctx, -8, 0, 8, 0);
  };
  ICONS.globe = (ctx) => {
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, U.TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 10, 0, 0, U.TAU);
    ctx.stroke();
    U.line(ctx, -10, 0, 10, 0);
  };
  ICONS.skull = (ctx, c) => {
    U.circle(ctx, 0, -2, 9, c);
    ctx.fillRect(-5, 4, 10, 7);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    U.circle(ctx, -3.5, -2, 2.6);
    U.circle(ctx, 3.5, -2, 2.6);
    ctx.fillRect(-3, 7, 1.5, 4);
    ctx.fillRect(1.5, 7, 1.5, 4);
  };
  ICONS.gun = (ctx, c) => {
    U.poly(ctx, [-12, -6, 10, -6, 12, -3, 12, 0, -4, 0, -2, 3, -3, 10, -9, 10, -9, 1, -12, 0], c);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-10, -4, 18, 1.5);
  };
  Draw.ICONS = ICONS;

  /* ---------------------------------------------------------------------
   * Yıldızlar (derecelendirme)
   * ------------------------------------------------------------------- */
  Draw.stars = (ctx, x, y, count, max = 3, size = 22, gap = 4) => {
    const total = max * size + (max - 1) * gap;
    let sx = x - total / 2 + size / 2;
    for (let i = 0; i < max; i++) {
      if (i < count) {
        Draw.icon(ctx, 'star', sx + 1, y + 2, size, 'rgba(0,0,0,0.5)');
        Draw.icon(ctx, 'star', sx, y, size, C.COLORS.gold);
      } else {
        Draw.icon(ctx, 'starEmpty', sx, y, size, 'rgba(255,255,255,0.35)');
      }
      sx += size + gap;
    }
  };

  /* ---------------------------------------------------------------------
   * Ekran geçişi / vinyet
   * ------------------------------------------------------------------- */
  Draw.vignette = (ctx, w, h, strength = 0.6, color = '#000000') => {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, U.rgba(color, 0));
    g.addColorStop(1, U.rgba(color, strength));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

  RC.Draw = Draw;
})(window.RC);
