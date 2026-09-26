/* =========================================================================
 *  RED CRIME - Yetişkin insan karakterler (ev sahipleri, bekçiler)
 *  Top gövdeli çizgi film karakterlerinin yerine gerçekçi oranlı, yan
 *  profilden çizilen yetişkinler: kafa/boyun/gövde/kollar/bacaklar, yaşa ve
 *  role göre saç, bıyık, gözlük, kıyafet (pijama, sabahlık, üniforma...).
 *
 *  Koordinatlar: (x, y) = ayak tabanı ortası. Karakter yukarı doğru ~HEIGHT px.
 *  Çizim her zaman sağa bakacak şekilde yapılır; facing -1 için yatay aynalanır.
 *
 *  Draw.human(ctx, o) -> { hands: {front, back}, headTop } (dünya koordinatı)
 *   o.look   : { sex, age, build, hair, hairColor, skin, mustache, beard,
 *               glasses, outfit, top, bottom, accent, cap }
 *   o.pose   : 'stand' | 'walk' | 'run' | 'sit' | 'lie'
 *   o.phase  : yürüme evresi (radyan)
 *   o.hands  : { front:{x,y}, back:{x,y} } omza göre, sağa bakış normunda
 *   o.eyes   : 'open' | 'wide' | 'angry' | 'sleepy' | 'closed'
 *   o.mouth  : 'flat' | 'frown' | 'o' | 'open' | 'angry' | 'snore'
 *   o.lookY  : -1..1 başın hafif eğimi (yukarı/aşağı bakış)
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const D = RC.Draw;

  const HEIGHT = 88;
  const HIP_Y = -42;
  const SHOULDER_Y = -68;
  const HEAD_Y = -80;
  const THIGH = 21;
  const SHIN = 21;
  const UPPER_ARM = 15;
  const FOREARM = 15;
  const OUT = 'rgba(12,10,16,0.55)';

  /** Yapılandırmada görünüm yoksa isim ve eski alanlardan makul bir varsayılan türet */
  function lookFor(cfg, isGuard) {
    if (cfg.look) return Object.assign(defaults(cfg, isGuard), cfg.look);
    return defaults(cfg, isGuard);
  }

  function defaults(cfg, isGuard) {
    const male = !!cfg.mustache || isGuard;
    const uniform = isGuard || cfg.hat === 'police';
    return {
      sex: male ? 'm' : 'f',
      age: 'adult',
      build: 1,
      hair: male ? 'short' : 'long',
      hairColor: '#2a2018',
      skin: '#e2b48e',
      mustache: !!cfg.mustache,
      beard: false,
      glasses: false,
      outfit: uniform ? 'uniform' : 'pajama',
      top: uniform ? '#23304f' : cfg.color || '#5a6a9a',
      bottom: uniform ? '#1a2238' : U.shade(cfg.color || '#5a6a9a', -0.15),
      accent: cfg.cap || '#e8e0c8',
      cap: uniform,
    };
  }

  /* --------------------------- yardımcılar --------------------------- */
  function limb(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /** İki kemikli ters kinematik: omuzdan ele, dirsek yönü bend (+1 aşağı/geri) */
  function ik(sx, sy, tx, ty, l1, l2, bend) {
    let dx = tx - sx;
    let dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.01;
    if (d > max) {
      dx *= max / d;
      dy *= max / d;
      d = max;
    }
    const a = Math.atan2(dy, dx);
    const c = U.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d || 1), -1, 1);
    const b = Math.acos(c) * bend;
    return { ex: sx + Math.cos(a + b) * l1, ey: sy + Math.sin(a + b) * l1, hx: sx + dx, hy: sy + dy };
  }

  function legPoints(hipX, hipY, swing, lift) {
    // swing: bacağın ileri-geri açısı; lift: dizin bükülmesi (geri giden bacakta)
    const kx = hipX + Math.sin(swing) * THIGH;
    const ky = hipY + Math.cos(swing) * THIGH;
    const shinA = swing - lift;
    const fx = kx + Math.sin(shinA) * SHIN;
    const fy = ky + Math.cos(shinA) * SHIN;
    return { kx, ky, fx, fy };
  }

  /* ------------------------------ kafa ------------------------------ */
  function drawHead(ctx, L, o) {
    const skin = L.skin;
    const hy = HEAD_Y;
    ctx.save();
    ctx.translate(1, hy);
    ctx.rotate((o.lookY || 0) * 0.18);
    // Boyun
    ctx.fillStyle = U.shade(skin, -0.12);
    ctx.fillRect(-3.5, 6, 7, 8);
    // Arka saç (uzun saç, topuz omuzların arkasında kalır)
    if (L.hair === 'long') {
      ctx.fillStyle = L.hairColor;
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.quadraticCurveTo(-12, 12, -7, 20);
      ctx.lineTo(1, 16);
      ctx.lineTo(2, -2);
      ctx.closePath();
      ctx.fill();
    }
    if (L.hair === 'bun') {
      ctx.fillStyle = L.hairColor;
      U.circle(ctx, -9, -6, 5, L.hairColor);
    }
    // Kafa (hafif oval, çene öne doğru)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-7.5, -3);
    ctx.quadraticCurveTo(-8.5, -12, 0, -12.5);
    ctx.quadraticCurveTo(8.5, -12, 8.5, -3);
    // alın -> burun
    ctx.lineTo(8.6, -1);
    ctx.lineTo(11, 3);
    ctx.lineTo(8.6, 4);
    // ağız -> çene
    ctx.quadraticCurveTo(9, 8.5, 5, 10);
    ctx.quadraticCurveTo(0, 11.5, -4, 8);
    ctx.quadraticCurveTo(-8, 5, -7.5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // Yaşa göre çizgiler
    if (L.age === 'old') {
      ctx.strokeStyle = 'rgba(90,50,30,0.35)';
      ctx.lineWidth = 0.8;
      U.line(ctx, 3, -7.5, 6.5, -7.8);
      U.line(ctx, 5.5, 3.5, 7.5, 6.5);
    }
    // Kulak
    ctx.fillStyle = U.shade(skin, -0.1);
    U.ellipse(ctx, -1.5, -1, 2.2, 3.2, 0);
    // Sakal / kirli sakal
    if (L.beard) {
      ctx.fillStyle = U.rgba(L.hairColor, L.beard === 'stubble' ? 0.35 : 0.9);
      ctx.beginPath();
      ctx.moveTo(-3, 3);
      ctx.quadraticCurveTo(0, 12, 6, 9.5);
      ctx.quadraticCurveTo(9, 7, 8.5, 5);
      ctx.lineTo(4, 5);
      ctx.quadraticCurveTo(0, 6, -3, 3);
      ctx.fill();
    }
    // Göz
    const eyes = o.eyes || 'open';
    ctx.fillStyle = '#1a1512';
    if (eyes === 'closed' || eyes === 'sleep') {
      ctx.strokeStyle = '#1a1512';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(5.2, -3.5, 1.6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      const big = eyes === 'wide' ? 1.35 : 1;
      const h = eyes === 'sleepy' ? 0.6 : 1;
      ctx.fillStyle = '#f4efe8';
      U.ellipse(ctx, 5.2, -3.6, 1.9 * big, 1.4 * big * h, 0);
      ctx.fillStyle = '#2a1c14';
      U.ellipse(ctx, 5.9, -3.6, 1.05 * big, 1.1 * big * h, 0);
    }
    // Kaş
    ctx.strokeStyle = U.shade(L.hair === 'bald' || L.hair === 'gray' ? '#8a8078' : L.hairColor, -0.1);
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    if (eyes === 'angry') U.line(ctx, 3, -7.4, 7.5, -5.6);
    else if (eyes === 'wide') U.line(ctx, 3, -7.4, 7.5, -7.8);
    else U.line(ctx, 3, -6.6, 7.5, -6.8);
    // Bıyık
    if (L.mustache) {
      ctx.fillStyle = L.age === 'old' ? '#cfc8c0' : U.shade(L.hairColor, -0.05);
      ctx.beginPath();
      ctx.moveTo(4.5, 4.4);
      ctx.quadraticCurveTo(8, 3.4, 10, 4.6);
      ctx.quadraticCurveTo(9, 6.4, 6.5, 5.8);
      ctx.quadraticCurveTo(5, 5.9, 4.5, 4.4);
      ctx.fill();
    }
    // Ağız
    const m = o.mouth || 'flat';
    ctx.strokeStyle = '#5a2a22';
    ctx.lineWidth = 1.1;
    if (m === 'o' || m === 'open' || m === 'snore') {
      ctx.fillStyle = '#3a1512';
      U.ellipse(ctx, 7.4, 6.8, m === 'o' ? 1.3 : 1.6, m === 'snore' ? 1 : 1.8, 0);
    } else if (m === 'angry') {
      U.line(ctx, 5, 7.4, 8.4, 6.6);
    } else if (m === 'frown') {
      ctx.beginPath();
      ctx.arc(7, 8.6, 2, Math.PI + 0.5, -0.5);
      ctx.stroke();
    } else {
      U.line(ctx, 5.5, 6.9, 8.4, 6.9);
    }
    // Saç (ön/üst)
    drawHair(ctx, L);
    // Gözlük
    if (L.glasses) {
      ctx.strokeStyle = '#1a1a1e';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(5.6, -3.4, 2.8, 0, U.TAU);
      ctx.stroke();
      U.line(ctx, 2.8, -3.6, -1, -2.6);
      ctx.fillStyle = 'rgba(200,230,255,0.18)';
      U.circle(ctx, 5.6, -3.4, 2.6, 'rgba(200,230,255,0.18)');
    }
    // Kasket (bekçi)
    if (L.cap) {
      ctx.fillStyle = '#1b2440';
      ctx.beginPath();
      ctx.moveTo(-8.5, -8);
      ctx.quadraticCurveTo(-8, -16.5, 1, -16.5);
      ctx.quadraticCurveTo(9, -16, 9, -9);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111626';
      ctx.beginPath();
      ctx.moveTo(4, -9);
      ctx.lineTo(13.5, -7.2);
      ctx.lineTo(4, -6.6);
      ctx.fill();
      ctx.fillStyle = '#d9b04a';
      U.circle(ctx, 3, -12.4, 1.6, '#d9b04a');
      ctx.fillStyle = '#0c1020';
      ctx.fillRect(-8.5, -9.5, 17.5, 2);
    }
    ctx.restore();
  }

  function drawHair(ctx, L) {
    const c = L.hair === 'gray' ? '#bdb7b0' : L.hairColor;
    ctx.fillStyle = c;
    switch (L.hair) {
      case 'bald':
        // Kel: yanlarda ve arkada ince saç
        ctx.fillStyle = L.age === 'old' ? '#cfc8c0' : c;
        ctx.beginPath();
        ctx.moveTo(-7.8, -5);
        ctx.quadraticCurveTo(-8.6, 2, -5.5, 5);
        ctx.lineTo(-4, 3);
        ctx.quadraticCurveTo(-6, -1, -4.5, -5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        U.ellipse(ctx, 1, -10.5, 4, 1.2, -0.1);
        break;
      case 'buzz':
        ctx.fillStyle = U.rgba(c, 0.8);
        ctx.beginPath();
        ctx.moveTo(-7.8, -2);
        ctx.quadraticCurveTo(-8.6, -12.8, 0.5, -12.8);
        ctx.quadraticCurveTo(7.6, -12.6, 8, -8);
        ctx.quadraticCurveTo(2, -10, -3, -6);
        ctx.lineTo(-4.2, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'long':
      case 'bun':
      case 'bob':
        ctx.beginPath();
        ctx.moveTo(-8.4, 2);
        ctx.quadraticCurveTo(-9.6, -13.8, 1, -13.6);
        ctx.quadraticCurveTo(9.4, -13, 9.2, -6);
        ctx.quadraticCurveTo(6, -9.8, 1.5, -8.4);
        ctx.quadraticCurveTo(-2.5, -6.5, -3.4, -1);
        if (L.hair === 'bob') {
          ctx.quadraticCurveTo(-3.6, 6, -1.5, 9);
          ctx.lineTo(-7, 9.5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        U.ellipse(ctx, 0, -11.4, 4, 1, -0.2);
        break;
      case 'slick':
      case 'gray':
      case 'short':
      default:
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.quadraticCurveTo(-9.2, -13.6, 1, -13.4);
        ctx.quadraticCurveTo(9.4, -13, 9, -7.4);
        ctx.quadraticCurveTo(5, -9.4, 0, -8.8);
        ctx.quadraticCurveTo(-3.6, -8, -4, -2);
        ctx.closePath();
        ctx.fill();
        if (L.hair === 'slick') {
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 0.8;
          U.line(ctx, -5, -10.5, 5, -11.5);
          U.line(ctx, -5.5, -8, 3, -9.8);
        }
        break;
    }
  }

  /* ------------------------------ gövde ------------------------------ */
  function drawTorso(ctx, L, breathe) {
    const w = 1 + (L.build - 1) * 0.6;
    const chestF = 7.5 * w;
    const backX = -7 * w;
    const belly = L.build > 1.15 ? 4 : 0;
    const top = L.top;
    ctx.save();
    ctx.translate(0, breathe);
    const g = ctx.createLinearGradient(backX, 0, chestF, 0);
    g.addColorStop(0, U.shade(top, -0.2));
    g.addColorStop(0.6, top);
    g.addColorStop(1, U.shade(top, 0.12));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(backX + 1, SHOULDER_Y - 2);
    ctx.quadraticCurveTo(0, SHOULDER_Y - 5, chestF - 1, SHOULDER_Y - 1);
    ctx.quadraticCurveTo(chestF + 2 + belly * 0.3, SHOULDER_Y + 10, chestF + belly, HIP_Y - 10);
    ctx.quadraticCurveTo(chestF + belly * 0.6, HIP_Y + 1, chestF - 1, HIP_Y + 2);
    ctx.lineTo(backX + 1, HIP_Y + 2);
    ctx.quadraticCurveTo(backX - 1, HIP_Y - 12, backX, SHOULDER_Y + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Kıyafet ayrıntıları (gövde yolunun içine kırpılır)
    ctx.save();
    ctx.clip();
    switch (L.outfit) {
      case 'pajama':
        ctx.strokeStyle = U.rgba(L.accent, 0.55);
        ctx.lineWidth = 1.6;
        for (let x = backX - 2; x < chestF + belly + 2; x += 4.5) U.line(ctx, x, SHOULDER_Y - 6, x + 1, HIP_Y + 4);
        // Düğme şeridi
        ctx.fillStyle = U.shade(top, -0.25);
        ctx.fillRect(chestF - 3.2, SHOULDER_Y + 2, 1.4, HIP_Y - SHOULDER_Y - 2);
        for (let y = SHOULDER_Y + 6; y < HIP_Y; y += 6) U.circle(ctx, chestF - 1.2, y, 0.9, '#f4efe8');
        break;
      case 'robe':
        // Sabahlık: yaka V'si, kuşak
        ctx.fillStyle = U.shade(L.bottom, 0.1);
        ctx.beginPath();
        ctx.moveTo(chestF - 1, SHOULDER_Y - 2);
        ctx.lineTo(chestF - 6, SHOULDER_Y + 12);
        ctx.lineTo(chestF + 3, SHOULDER_Y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = U.shade(top, 0.25);
        ctx.lineWidth = 2.2;
        U.line(ctx, chestF - 1, SHOULDER_Y - 2, chestF - 5, SHOULDER_Y + 14);
        ctx.fillStyle = U.shade(top, -0.3);
        ctx.fillRect(backX - 2, HIP_Y - 8, chestF - backX + belly + 4, 3.5);
        break;
      case 'uniform': {
        // Cepler, rozet, telsiz, apolet
        ctx.fillStyle = U.shade(top, -0.18);
        ctx.fillRect(1, SHOULDER_Y + 5, 6, 5);
        ctx.fillStyle = '#d9b04a';
        ctx.beginPath();
        const bx = 3.5;
        const by = SHOULDER_Y + 13;
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k * U.TAU) / 5;
          ctx.lineTo(bx + Math.cos(a) * 2.4, by + Math.sin(a) * 2.4);
          ctx.lineTo(bx + Math.cos(a + U.TAU / 10) * 1.1, by + Math.sin(a + U.TAU / 10) * 1.1);
        }
        ctx.fill();
        ctx.fillStyle = '#0c0f18';
        ctx.fillRect(backX - 2, HIP_Y - 5, chestF - backX + 4, 3.5);
        ctx.fillStyle = '#c0c4cc';
        ctx.fillRect(1, HIP_Y - 5, 3, 3.5);
        ctx.fillStyle = '#111';
        U.fillRoundRect(ctx, -6, SHOULDER_Y + 1, 4, 8, 1, '#111');
        break;
      }
      case 'tracksuit':
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(-1.5, SHOULDER_Y - 4, 2, HIP_Y - SHOULDER_Y + 6);
        ctx.fillStyle = U.shade(top, -0.2);
        ctx.fillRect(chestF - 2.5, SHOULDER_Y, 1.5, HIP_Y - SHOULDER_Y);
        break;
      case 'undershirt':
        // Atlet: kolsuz beyaz, göğüste kıllar
        ctx.fillStyle = U.shade(L.skin, -0.05);
        ctx.beginPath();
        ctx.moveTo(backX + 3, SHOULDER_Y - 6);
        ctx.quadraticCurveTo(1, SHOULDER_Y + 6, chestF + 2, SHOULDER_Y - 6);
        ctx.fill();
        break;
      default:
        break;
    }
    ctx.restore();
    ctx.restore();
  }

  function drawLeg(ctx, L, lp, hipX, back) {
    const pants = back ? U.shade(L.bottom, -0.22) : L.bottom;
    const robeLen = L.outfit === 'robe';
    limb(ctx, hipX, HIP_Y, lp.kx, lp.ky, 7.5 * (0.9 + L.build * 0.1), pants);
    limb(ctx, lp.kx, lp.ky, lp.fx, lp.fy - 2, 6.5, robeLen ? U.shade(L.skin, back ? -0.2 : -0.08) : pants);
    // Pijama paçası çizgisi
    if (L.outfit === 'pajama') {
      ctx.strokeStyle = U.rgba(L.accent, 0.5);
      ctx.lineWidth = 1.2;
      U.line(ctx, hipX, HIP_Y + 2, lp.kx, lp.ky);
    }
    if (L.outfit === 'tracksuit') {
      ctx.strokeStyle = '#f4f4f4';
      ctx.lineWidth = 1.4;
      U.line(ctx, hipX + 2, HIP_Y + 2, lp.kx + 2, lp.ky);
      U.line(ctx, lp.kx + 2, lp.ky, lp.fx + 1.5, lp.fy - 3);
    }
    // Ayakkabı / terlik / bot
    const shoe = L.outfit === 'uniform' ? '#0f0f12' : L.outfit === 'tracksuit' ? '#f0f0f0' : back ? '#3a2a2a' : '#5a3a3a';
    ctx.fillStyle = back ? U.shade(shoe, -0.2) : shoe;
    ctx.beginPath();
    ctx.moveTo(lp.fx - 4, lp.fy - 4);
    ctx.lineTo(lp.fx + 7, lp.fy - 3);
    ctx.quadraticCurveTo(lp.fx + 9, lp.fy, lp.fx + 7, lp.fy);
    ctx.lineTo(lp.fx - 4, lp.fy);
    ctx.closePath();
    ctx.fill();
  }

  function drawRobeSkirt(ctx, L, swing) {
    // Sabahlığın dizine kadar inen eteği
    const w = 1 + (L.build - 1) * 0.6;
    ctx.fillStyle = L.top;
    ctx.beginPath();
    ctx.moveTo(-7 * w, HIP_Y - 2);
    ctx.lineTo(8 * w, HIP_Y - 2);
    ctx.lineTo(9 * w + swing * 4, HIP_Y + 22);
    ctx.lineTo(-8 * w + swing * 2, HIP_Y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  function drawArm(ctx, L, hand, back) {
    const sx = 0;
    const sy = SHOULDER_Y + 2;
    const j = ik(sx, sy, hand.x, hand.y, UPPER_ARM, FOREARM, hand.bend || 1);
    const sleeve = back ? U.shade(L.top, -0.25) : L.top;
    const bare = L.outfit === 'undershirt';
    limb(ctx, sx, sy, j.ex, j.ey, 6, bare ? U.shade(L.skin, back ? -0.18 : -0.04) : sleeve);
    limb(ctx, j.ex, j.ey, j.hx, j.hy, 5.2, L.outfit === 'robe' || L.outfit === 'pajama' || L.outfit === 'uniform' || L.outfit === 'tracksuit' ? sleeve : U.shade(L.skin, back ? -0.18 : 0));
    // Manşet ve el
    const skin = back ? U.shade(L.skin, -0.18) : L.skin;
    U.circle(ctx, j.hx, j.hy, 3.1, skin);
    return { x: j.hx, y: j.hy };
  }

  /* --------------------------- ana çizim --------------------------- */
  D.human = (ctx, o) => {
    const L = o.look;
    const f = o.facing || 1;
    const pose = o.pose || 'stand';
    const ph = o.phase || 0;
    const res = { hands: { front: { x: o.x, y: o.y }, back: { x: o.x, y: o.y } }, headTop: { x: o.x, y: o.y - HEIGHT - 6 } };
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.translate(o.x, o.y);
    if (o.rotate) ctx.rotate(o.rotate);
    ctx.scale(f * (o.scale || 1), o.scale || 1);

    // Gölge
    if (o.shadow !== false && pose !== 'lie' && pose !== 'sit') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      U.ellipse(ctx, 1, 0, 13, 3, 0);
    }

    // Bacak açıları
    const run = pose === 'run';
    const amp = pose === 'walk' ? 0.42 : run ? 0.6 : 0;
    const s = Math.sin(ph);
    let front;
    let back;
    let bob = 0;
    if (pose === 'sit') {
      // Oturuş: bacaklar ileri uzanır (yatakta doğrulmuş)
      front = { kx: THIGH, ky: HIP_Y, fx: THIGH + SHIN, fy: HIP_Y + 2 };
      back = { kx: THIGH - 1, ky: HIP_Y + 1, fx: THIGH + SHIN - 1, fy: HIP_Y + 3 };
    } else {
      front = legPoints(0, HIP_Y, s * amp, Math.max(0, -s) * (run ? 0.85 : 0.55));
      back = legPoints(0, HIP_Y, -s * amp, Math.max(0, s) * (run ? 0.85 : 0.55));
      bob = amp ? -Math.abs(Math.cos(ph)) * (run ? 3 : 1.6) : 0;
      // Ayak zemine basar: bacak kısaldığında gövde iner
      const lowest = Math.max(front.fy, back.fy);
      bob += -lowest;
    }
    ctx.translate(0, bob);

    const breathe = Math.sin((o.t || 0) * 1.8) * 0.5;
    const hands = o.hands || {};
    // Serbest kollar neredeyse düz sarkar (dirsek sırttan taşmasın)
    const hb = hands.back || { x: -1 - s * 8 * (amp ? 1 : 0), y: -39 };
    const hf = hands.front || { x: 3 + s * 8 * (amp ? 1 : 0), y: -39 };

    // Arka katman: arka kol, arka bacak
    const handBack = drawArm(ctx, L, hb, true);
    drawLeg(ctx, L, back, -1, true);
    if (L.outfit === 'robe') {
      // Sabahlık: iki bacak da eteğin altında kalır
      drawLeg(ctx, L, front, 1, false);
      drawRobeSkirt(ctx, L, amp ? s * 0.5 : 0);
      drawTorso(ctx, L, breathe);
    } else {
      drawTorso(ctx, L, breathe);
      drawLeg(ctx, L, front, 1, false);
    }
    drawHead(ctx, L, o);
    const handFront = drawArm(ctx, L, hf, false);
    ctx.restore();

    // Ellerin dünya koordinatı (aksesuar çizimi için)
    const toWorld = (p) => ({ x: o.x + p.x * f, y: o.y + bob + p.y });
    if (!o.rotate) {
      res.hands.front = toWorld(handFront);
      res.hands.back = toWorld(handBack);
      res.headTop = { x: o.x + f, y: o.y + bob + HEAD_Y - 14 };
    }
    return res;
  };

  /** HUD için küçük portre (baş + omuz) */
  D.humanPortrait = (ctx, look, x, y, size, o = {}) => {
    ctx.save();
    ctx.translate(x, y);
    const k = size / 30;
    ctx.scale(k, k);
    ctx.translate(-1, 88 - 70);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, -100, 40, 50);
    ctx.clip();
    drawTorso(ctx, look, 0);
    drawHead(ctx, look, { eyes: o.eyes || 'open', mouth: o.mouth || 'flat' });
    ctx.restore();
    ctx.restore();
  };

  D.HUMAN_HEIGHT = HEIGHT;
  RC.Human = { lookFor, HEIGHT, HEAD_Y, SHOULDER_Y };
})(window.RC);
