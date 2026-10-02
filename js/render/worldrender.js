/* =========================================================================
 *  RED CRIME - Dünya çizimi
 *  Gökyüzü + şehir paralaksı, sokak, bahçe, havuz, evin kesit görünümü:
 *  duvar kâğıtları, pencereler, döşemeler, merdivenler, el merdiveni,
 *  çatı, lambalar. Oda arka planları önbelleğe alınır.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;

  const WR = {
    skylines: null,
    rain: null,
  };

  WR.init = function (scene) {
    const W = scene.world;
    WR.skylines = [
      new RC.BG.Skyline({ seed: 11, color: '#0d1024', minH: 140, maxH: 320, width: 1800, windowChance: 0.18 }),
      new RC.BG.Skyline({ seed: 23, color: '#141834', minH: 80, maxH: 200, width: 1600, windowChance: 0.25 }),
    ];
    WR.rain = new RC.BG.Rain(RC.Save.settings.quality === 'low' ? 120 : 300);
    for (const room of W.rooms) room.cache = null;
    WR.world = W;
  };

  /* =====================================================================
   * Ekran uzayı arka plan
   * =================================================================== */
  WR.drawBackground = function (ctx, scene, w, h, t) {
    const cam = scene.camera;
    const weather = scene.weather;
    RC.BG.sky(ctx, w, h, t, {
      top: weather === 'fog' ? '#141828' : '#05060f',
      mid: weather === 'rain' ? '#10142a' : '#111634',
      bottom: weather === 'fog' ? '#2a2e40' : '#2a1f3d',
      parallaxX: cam.x,
      moonX: w * 0.78 - cam.x * 0.01,
      moonY: h * 0.16 - (cam.y + 400) * 0.02,
      starAlpha: weather === 'clear' ? 1 : 0.35,
    });
    RC.BG.clouds(ctx, w, h, t, { parallaxX: cam.x, color: weather === 'rain' ? 'rgba(30,34,60,0.8)' : 'rgba(40,46,80,0.45)', count: weather === 'rain' ? 12 : 6 });
    // Ufuk çizgisi: dünya y=0'ın ekrandaki yeri
    const horizon = cam.worldToScreen(0, 0).y;
    WR.skylines[0].render(ctx, cam.x * 0.15, horizon - 40 - cam.y * 0.08, w, t);
    WR.skylines[1].render(ctx, cam.x * 0.3, horizon - 10 - cam.y * 0.05, w, t);
  };

  /* =====================================================================
   * Dünya uzayı: arka katman
   * =================================================================== */
  WR.drawWorldBack = function (ctx, scene, view, t) {
    const W = scene.world;
    const H = W.house;
    const FH = C.FLOOR_H;

    drawGround(ctx, W, view, t);

    // Dekor: ağaçlar, lambalar, çit
    for (const d of W.decor) {
      if (d.x < view.x - 300 || d.x > view.x + view.w + 300) continue;
      if (d.type === 'tree') RC.BG.tree(ctx, d.x, d.y, d.s, d.seed, t);
      else if (d.type === 'streetlamp') RC.BG.streetLamp(ctx, d.x, d.y, 220, true, t, 1);
      else if (d.type === 'fence') RC.BG.fence(ctx, d.x, d.y, d.w, 66);
      else if (d.type === 'gate') drawGate(ctx, d.x, d.y);
    }
    // Bahçe çiti (sokak ↔ bahçe sınırı hariç arka taraf)
    RC.BG.fence(ctx, W.backyard.x1 - 30, 0, 30, 70);
    RC.BG.fence(ctx, W.backyard.x0 + 200, 0, W.backyard.x1 - W.backyard.x0 - 230, 70, '#cfc8b8');

    // Havuz
    if (W.pool) drawPool(ctx, W.pool, t, scene);

    // Ev: çatı ve dış cephe
    drawRoof(ctx, W, t);

    // Odalar (önbellek ekran çözünürlüğünde; uzaktaki odaların önbelleği bırakılır)
    const res = U.cacheRes(2);
    for (const room of W.rooms) {
      if (room.x1 < view.x || room.x0 > view.x + view.w || room.y1 < view.y || room.y0 > view.y + view.h) {
        if (room.cache && (room.x1 < view.x - view.w * 1.5 || room.x0 > view.x + view.w * 2.5 || room.y1 < view.y - view.h * 1.5 || room.y0 > view.y + view.h * 2.5)) room.cache = null;
        continue;
      }
      if (!room.cache || room.cache.res !== res) room.cache = buildRoomCache(room, W, res);
      ctx.drawImage(room.cache, room.x0, room.y0, room.cache.lw, room.cache.lh);
      // Tavan lambası
      drawCeilingLamp(ctx, room, scene.lightsOn, t);
      if (RC.Decor) RC.Decor.live(ctx, scene, room, t);
    }

    // Döşemeler ve duvarlar
    for (const b of W.solids) {
      if (b.x > view.x + view.w || b.x + b.w < view.x || b.y > view.y + view.h || b.y + b.h < view.y) continue;
      if (b.kind === 'slab') drawSlab(ctx, b, W);
      else if (b.kind === 'wall') drawWall(ctx, b, W);
      else if (b.kind === 'roof') drawCeiling(ctx, b, W);
    }
    // Bodrum zemini
    if (H.basement) {
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(H.x, FH, H.w, 14);
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(H.x, FH + 14, H.w, 40);
    }

    // Gıcırdayan tahtalar
    for (const c of W.creaky) {
      if (c.x1 < view.x || c.x0 > view.x + view.w) continue;
      const flash = scene.creakFlash > 0 && Math.abs(scene.player.bottom - c.y) < 4 && scene.player.cx > c.x0 && scene.player.cx < c.x1 ? scene.creakFlash : 0;
      ctx.fillStyle = flash > 0 ? `rgba(255,200,120,${0.6 + flash})` : 'rgba(230,200,150,0.55)';
      ctx.fillRect(c.x0, c.y, c.x1 - c.x0, 5);
      ctx.strokeStyle = 'rgba(80,50,20,0.6)';
      ctx.lineWidth = 1;
      for (let x = c.x0 + 16; x < c.x1; x += 16) U.line(ctx, x, c.y, x, c.y + 5);
    }

    // Merdivenler
    for (const st of W.stairs) drawStairs(ctx, st, W);
    // El merdiveni
    for (const l of W.ladders) drawLadder(ctx, l);

    // Ön kapı
    if (W.frontDoor) drawFrontDoor(ctx, W.frontDoor);
    if (RC.Decor) RC.Decor.porch(ctx, W, t);
  };

  /* =====================================================================
   * Zemin, sokak, bahçe
   * =================================================================== */
  function drawGround(ctx, W, view, t) {
    const x0 = view.x - 50;
    const x1 = view.x + view.w + 50;
    // Toprak
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x0, 0, x1 - x0, 900);
    // Sokak asfaltı
    const s0 = Math.max(x0, W.street.x0 - 2000);
    const s1 = W.street.x1;
    if (s1 > x0) {
      ctx.fillStyle = '#23252c';
      ctx.fillRect(s0, 0, s1 - s0, 60);
      ctx.fillStyle = '#e8e0b0';
      for (let x = Math.floor(s0 / 120) * 120; x < s1 - 120; x += 120) ctx.fillRect(x, 26, 60, 4);
      // Kaldırım
      ctx.fillStyle = '#6a6e78';
      ctx.fillRect(s1 - 140, -6, 140, 12);
      ctx.fillStyle = '#50545e';
      for (let x = s1 - 140; x < s1; x += 28) ctx.fillRect(x, -6, 2, 12);
    }
    // Şehir: bahçe yerine kaldırım
    if (W.cfg.urban) {
      const u0 = Math.max(x0, W.garden.x0);
      const u1 = Math.min(x1, W.backyard.x1 + 800);
      if (u1 > u0) {
        ctx.fillStyle = '#5a5e68';
        ctx.fillRect(u0, -6, u1 - u0, 12);
        ctx.fillStyle = '#4a4e58';
        for (let x = Math.floor(u0 / 40) * 40; x < u1; x += 40) ctx.fillRect(x, -6, 2, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(u0, -6, u1 - u0, 2);
      }
      return;
    }
    // Bahçe çimi
    const g0 = W.garden.x0;
    const g1 = W.backyard.x1 + 800;
    ctx.fillStyle = '#1f3a22';
    ctx.fillRect(Math.max(x0, g0), 0, Math.min(x1, g1) - Math.max(x0, g0), 12);
    ctx.fillStyle = '#2d5a30';
    ctx.fillRect(Math.max(x0, g0), -3, Math.min(x1, g1) - Math.max(x0, g0), 6);
    // Çim tutamları
    ctx.strokeStyle = '#3a7a3a';
    ctx.lineWidth = 2;
    const start = Math.max(x0, g0);
    const end = Math.min(x1, g1);
    ctx.beginPath();
    for (let x = Math.floor(start / 14) * 14; x < end; x += 14) {
      if (W.pool && x > W.pool.x0 - 4 && x < W.pool.x1 + 4) continue;
      if (x > W.house.x && x < W.house.r) continue;
      const hgt = 6 + ((x * 7919) % 7);
      const sway = Math.sin(t * 1.5 + x * 0.05) * 2;
      ctx.moveTo(x, -2);
      ctx.lineTo(x + sway, -2 - hgt);
    }
    ctx.stroke();
  }

  function drawGate(ctx, x, y) {
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - 6, y - 90, 10, 90);
    ctx.fillRect(x + 110, y - 90, 10, 90);
    U.circle(ctx, x - 1, y - 94, 8, '#3a3a40');
    U.circle(ctx, x + 115, y - 94, 8, '#3a3a40');
    // Açık kapı kanadı
    ctx.strokeStyle = '#2a2a30';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(x + 4 + i * 8, y - 4);
      ctx.lineTo(x + 4 + i * 8, y - 78);
    }
    ctx.moveTo(x + 4, y - 40);
    ctx.lineTo(x + 30, y - 40);
    ctx.stroke();
  }

  function drawPool(ctx, pool, t, scene) {
    const w = pool.x1 - pool.x0;
    // Havuz kenarları (fayans)
    ctx.fillStyle = '#d8e4ec';
    ctx.fillRect(pool.x0 - 16, -4, 16, 10);
    ctx.fillRect(pool.x1, -4, 16, 10);
    ctx.fillStyle = '#9fc4d8';
    ctx.fillRect(pool.x0, 0, w, pool.y1);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    for (let x = pool.x0; x < pool.x1; x += 24) U.line(ctx, x, 0, x, pool.y1);
    for (let y = 0; y < pool.y1; y += 24) U.line(ctx, pool.x0, y, pool.x1, y);
    // Su
    const g = ctx.createLinearGradient(0, pool.y0, 0, pool.y1);
    g.addColorStop(0, 'rgba(60,160,220,0.75)');
    g.addColorStop(1, 'rgba(20,70,130,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pool.x0, pool.y1);
    for (let x = pool.x0; x <= pool.x1; x += 12) {
      ctx.lineTo(x, pool.y0 + Math.sin(t * 2 + x * 0.04) * 2);
    }
    ctx.lineTo(pool.x1, pool.y1);
    ctx.closePath();
    ctx.fill();
    // Kostikler
    ctx.strokeStyle = 'rgba(200,240,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const cx = pool.x0 + ((i * 97 + t * 20) % w);
      ctx.beginPath();
      ctx.ellipse(cx, pool.y0 + 30 + (i % 3) * 20, 18, 4, 0, 0, U.TAU);
      ctx.stroke();
    }
    // Havuz merdiveni
    ctx.strokeStyle = '#c0c4cc';
    ctx.lineWidth = 3;
    const lx = pool.x1 - 40;
    U.line(ctx, lx, -40, lx, pool.y1 - 10);
    U.line(ctx, lx + 20, -40, lx + 20, pool.y1 - 10);
    for (let y = 10; y < pool.y1; y += 22) U.line(ctx, lx, y, lx + 20, y);
  }

  /* =====================================================================
   * Ev dış hatları
   * =================================================================== */
  function drawRoof(ctx, W, t) {
    const H = W.house;
    const cfg = W.cfg;
    if (cfg.kind) {
      drawFlatRoof(ctx, W, t);
      return;
    }
    const y = H.topY;
    const ov = 50;
    // Çatı üçgeni
    ctx.fillStyle = cfg.roof;
    ctx.beginPath();
    ctx.moveTo(H.x - ov, y + 4);
    ctx.lineTo(H.x + H.w * 0.12, y - 190);
    ctx.lineTo(H.r - H.w * 0.12, y - 190);
    ctx.lineTo(H.r + ov, y + 4);
    ctx.closePath();
    ctx.fill();
    // Kiremit sıraları
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = U.shade(cfg.roof, -0.3);
    ctx.lineWidth = 2;
    for (let yy = y - 186; yy < y; yy += 16) {
      U.line(ctx, H.x - ov, yy, H.r + ov, yy);
      for (let xx = H.x - ov + ((yy / 16) % 2) * 14; xx < H.r + ov; xx += 28) U.line(ctx, xx, yy, xx, yy + 16);
    }
    ctx.restore();
    // Çatı katı penceresi (yuvarlak)
    const wx = H.x + H.w / 2;
    U.circle(ctx, wx, y - 90, 34, U.shade(cfg.facade, -0.1));
    U.circle(ctx, wx, y - 90, 26, '#1a2240');
    ctx.strokeStyle = U.shade(cfg.facade, -0.1);
    ctx.lineWidth = 4;
    U.line(ctx, wx - 26, y - 90, wx + 26, y - 90);
    U.line(ctx, wx, y - 116, wx, y - 64);
    // Baca
    const chx = H.r - H.w * 0.22;
    ctx.fillStyle = '#6b3a2e';
    ctx.fillRect(chx, y - 240, 50, 100);
    ctx.fillStyle = '#4a2a20';
    ctx.fillRect(chx - 6, y - 248, 62, 12);
    // Baca dumanı
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.25 + i / 5) % 1;
      ctx.fillStyle = `rgba(160,160,180,${0.25 * (1 - k)})`;
      U.circle(ctx, chx + 25 + Math.sin(k * 6 + i) * 12 + k * 40, y - 250 - k * 140, 12 + k * 26);
    }
    // Saçak
    ctx.fillStyle = U.shade(cfg.roof, -0.35);
    ctx.fillRect(H.x - ov, y - 2, H.w + ov * 2, 10);
  }

  /** Dükkân / müze / banka: düz çatı, korkuluk ve ışıklı tabela */
  function drawFlatRoof(ctx, W, t) {
    const H = W.house;
    const cfg = W.cfg;
    const y = H.topY;
    ctx.fillStyle = U.shade(cfg.facade, -0.15);
    ctx.fillRect(H.x - 20, y - 40, H.w + 40, 40);
    ctx.fillStyle = U.shade(cfg.facade, 0.1);
    ctx.fillRect(H.x - 26, y - 46, H.w + 52, 8);
    // Klima üniteleri ve anten
    for (let i = 0; i < 3; i++) {
      const ax = H.x + H.w * (0.15 + i * 0.3);
      ctx.fillStyle = '#9aa0aa';
      ctx.fillRect(ax, y - 86, 60, 40);
      ctx.fillStyle = '#6a707c';
      U.circle(ctx, ax + 30, y - 66, 14);
      ctx.save();
      ctx.translate(ax + 30, y - 66);
      ctx.rotate(t * 6 + i);
      ctx.fillStyle = '#4a4f58';
      ctx.fillRect(-12, -2, 24, 4);
      ctx.fillRect(-2, -12, 4, 24);
      ctx.restore();
    }
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(H.r - 120, y - 200, 4, 154);
    if (Math.sin(t * 3) > 0) U.circle(ctx, H.r - 118, y - 202, 4, '#ff3b3b');
    // Işıklı tabela
    const sign = RC.L(cfg.sign || cfg.name).toLocaleUpperCase(RC.I18N.lang === 'en' ? 'en-US' : 'tr-TR');
    ctx.font = `44px ${C.FONT_TITLE}`;
    const tw = ctx.measureText(sign).width;
    const sx = H.x + H.w / 2;
    const sy = y - 110;
    ctx.fillStyle = '#15161d';
    U.fillRoundRect(ctx, sx - tw / 2 - 30, sy - 40, tw + 60, 66, 8);
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(sx - tw / 2, sy + 26, 6, 38);
    ctx.fillRect(sx + tw / 2 - 6, sy + 26, 6, 38);
    const flick = Math.sin(t * 23) > 0.97 ? 0.4 : 1;
    ctx.save();
    ctx.shadowColor = cfg.kind === 'bank' ? '#4aa8ff' : cfg.kind === 'museum' ? '#ffd24a' : '#ff3bd4';
    ctx.shadowBlur = 24 * flick;
    ctx.fillStyle = cfg.kind === 'bank' ? '#bfe3ff' : cfg.kind === 'museum' ? '#fff2c0' : '#ffd0f4';
    ctx.globalAlpha = 0.6 + flick * 0.4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign, sx, sy - 6);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  function drawSlab(ctx, b, W) {
    const cfg = W.cfg;
    // Üst: parke
    const rooms = W.floorByK[b.floorK] ? W.floorByK[b.floorK].rooms : [];
    ctx.fillStyle = U.shade(cfg.facade, -0.25);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Oda bazında zemin rengi
    for (const r of rooms) {
      const x0 = Math.max(b.x, r.x0);
      const x1 = Math.min(b.x + b.w, r.x1);
      if (x1 <= x0) continue;
      const col = r.floorStyle === 'tile' ? '#d8dce4' : r.floorStyle === 'concrete' ? '#6a6e78' : W.theme.floor;
      ctx.fillStyle = col;
      ctx.fillRect(x0, b.y, x1 - x0, 10);
      const step = r.floorStyle === 'tile' ? 24 : 56;
      let i = 0;
      for (let x = Math.floor(x0 / step) * step; x < x1; x += step, i++) {
        const px = Math.max(x, x0);
        const pw = Math.min(x + step, x1) - px;
        if (pw <= 0) continue;
        ctx.fillStyle = (Math.floor(x / step) % 3 === 0) ? 'rgba(255,255,255,0.06)' : (Math.floor(x / step) % 3 === 1 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0)');
        ctx.fillRect(px, b.y, pw, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(px, b.y, 1.5, 10);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x0, b.y, x1 - x0, 1.5);
    }
    // Tavan (altı)
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(b.x, b.y + b.h - 5, b.w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(b.x, b.y + 10, b.w, 2);
  }

  function drawCeiling(ctx, b, W) {
    ctx.fillStyle = U.shade(W.cfg.facade, -0.3);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(b.x + 30, b.y + b.h - 5, b.w - 60, 5);
  }

  function drawWall(ctx, b, W) {
    const col = W.cfg.facade;
    const basement = b.y > 0;
    ctx.fillStyle = basement ? '#4a4a52' : col;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = b.y + 12; y < b.y + b.h; y += 14) ctx.fillRect(b.x, y, b.w, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(b.x, b.y, 3, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + b.w - 3, b.y, 3, b.h);
  }

  function drawFrontDoor(ctx, d) {
    const x = d.x;
    const y = d.y;
    // Kapı kanadı artık gerçek bir kapı (Doors.draw); eski dekoratif açık kanat
    // yalnızca kapı nesnesi olmayan eski dünyalar için çizilir.
    if (!d.door) {
    ctx.fillStyle = '#5b3a24';
    ctx.beginPath();
    ctx.moveTo(x, y - d.h);
    ctx.lineTo(x - 34, y - d.h + 10);
    ctx.lineTo(x - 34, y - 6);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    U.circle(ctx, x - 28, y - d.h / 2, 3, '#d9b04a');
    }
    // Paspas
    ctx.fillStyle = '#8a3a2a';
    ctx.fillRect(x - 70, y - 4, 60, 4);
    // Kapı numarası lambası
    const g = ctx.createRadialGradient(x - 12, y - d.h - 18, 1, x - 12, y - d.h - 18, 40);
    g.addColorStop(0, 'rgba(255,220,150,0.6)');
    g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 52, y - d.h - 58, 80, 80);
    U.fillRoundRect(ctx, x - 16, y - d.h - 24, 8, 12, 2, '#fff2c0');
  }

  /* =====================================================================
   * Merdiven ve el merdiveni
   * =================================================================== */
  function drawStairs(ctx, st, W) {
    const wood = W.theme.wood[0];
    // Taşıyıcı kiriş
    const sx = st.bottom.x;
    const sy = st.bottom.y;
    const ex = st.top.x;
    const ey = st.top.y;
    ctx.strokeStyle = U.shade(wood, -0.35);
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey + 16);
    ctx.stroke();
    // Basamaklar
    for (const s of st.steps) {
      if (!s) continue;
      ctx.fillStyle = wood;
      ctx.fillRect(s.x - 1, s.y, s.w + 2, 7);
      ctx.fillStyle = U.shade(wood, -0.25);
      ctx.fillRect(s.x - 1, s.y + 7, s.w + 2, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(s.x - 1, s.y, s.w + 2, 2);
    }
    // Tırabzan
    ctx.strokeStyle = U.shade(wood, -0.1);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 80);
    ctx.lineTo(ex, ey - 80);
    ctx.stroke();
    ctx.lineWidth = 3;
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const x = U.lerp(sx, ex, k);
      const y = U.lerp(sy, ey, k);
      U.line(ctx, x, y - 4, x, y - 80);
    }
    U.circle(ctx, sx, sy - 84, 6, U.shade(wood, 0.1));
  }

  function drawLadder(ctx, l) {
    const x = l.x;
    ctx.strokeStyle = '#8a5a34';
    ctx.lineWidth = 5;
    U.line(ctx, x - 18, l.yTop - 60, x - 18, l.yBottom);
    U.line(ctx, x + 18, l.yTop - 60, x + 18, l.yBottom);
    ctx.lineWidth = 4;
    for (let y = l.yTop - 50; y < l.yBottom; y += 26) U.line(ctx, x - 18, y, x + 18, y);
    // Kapak (yukarı açılmış)
    ctx.fillStyle = '#6b4a2a';
    ctx.save();
    ctx.translate(l.hole[1], 0);
    ctx.rotate(-1.35);
    ctx.fillRect(0, -4, l.hole[1] - l.hole[0], 8);
    ctx.restore();
    // Delik kenarı
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(l.hole[0], 0, l.hole[1] - l.hole[0], 4);
    ctx.strokeStyle = '#d9b04a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(l.hole[0], -1, l.hole[1] - l.hole[0], 6);
    ctx.setLineDash([]);
  }

  function drawCeilingLamp(ctx, room, on, t) {
    const l = room.lamp;
    if (!l) return;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    U.line(ctx, l.x, room.y0, l.x, l.y);
    ctx.fillStyle = on ? '#fff2c0' : '#3a3a44';
    ctx.beginPath();
    ctx.moveTo(l.x - 22, l.y + 14);
    ctx.lineTo(l.x - 8, l.y);
    ctx.lineTo(l.x + 8, l.y);
    ctx.lineTo(l.x + 22, l.y + 14);
    ctx.closePath();
    ctx.fill();
    if (on) {
      U.circle(ctx, l.x, l.y + 15, 6, '#fffbe0');
    }
  }

  /* =====================================================================
   * Oda arka planı (önbellek)
   * =================================================================== */
  function buildRoomCache(room, W, res = 1) {
    const w = Math.ceil(room.x1 - room.x0);
    const h = Math.ceil(room.y1 - room.y0);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * res);
    c.height = Math.ceil(h * res);
    c.lw = w;
    c.lh = h;
    c.res = res;
    const ctx = c.getContext('2d');
    ctx.scale(res, res);
    const base = room.wall;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    drawPattern(ctx, room.pattern, w, h, base, room.id);

    // Duvar dokusu (ince benekler + dikey ışık geçişi)
    {
      const rng = new U.RNG(room.id * 97 + 13);
      for (let i = 0; i < (w * h) / 180; i++) {
        ctx.fillStyle = rng.chance(0.5) ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(rng.float(0, w), rng.float(0, h), rng.float(1, 2.5), rng.float(1, 2.5));
      }
      const vg = ctx.createLinearGradient(0, 0, w, 0);
      vg.addColorStop(0, 'rgba(0,0,0,0.18)');
      vg.addColorStop(0.12, 'rgba(0,0,0,0)');
      vg.addColorStop(0.88, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.22)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }

    // Mutfak tezgâh arası fayansı
    if (room.type === 'kitchen') {
      const ty = h - 172;
      ctx.fillStyle = '#e9e4d6';
      ctx.fillRect(0, ty, w, 86);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      for (let yy = ty; yy < ty + 86; yy += 14) U.line(ctx, 0, yy, w, yy);
      for (let yy = 0; yy < 86 / 14; yy++) for (let x = (yy % 2) * 14; x < w; x += 28) U.line(ctx, x, ty + yy * 14, x, ty + yy * 14 + 14);
      ctx.fillStyle = 'rgba(42,93,176,0.25)';
      for (let x = 0; x < w; x += 84) ctx.fillRect(x, ty + 28, 28, 14);
    }

    // Lambri (alt kısım)
    if (room.k >= 0 && room.floorStyle === 'wood') {
      ctx.fillStyle = U.shade(base, -0.28);
      ctx.fillRect(0, h - 70, w, 70);
      ctx.fillStyle = U.shade(base, -0.15);
      for (let x = 10; x < w - 40; x += 60) {
        ctx.fillRect(x, h - 62, 48, 50);
      }
      ctx.fillStyle = U.shade(base, 0.1);
      ctx.fillRect(0, h - 72, w, 4);
    }
    // Süpürgelik
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, h - 10, w, 2);
    // Kartonpiyer (dişli korniş)
    ctx.fillStyle = '#f0ece2';
    ctx.fillRect(0, 0, w, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 2; x < w; x += 9) ctx.fillRect(x, 8, 5, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 12, w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 14, w, 6);

    // Odaya özel dekor
    if (RC.Decor) RC.Decor.room(ctx, room, W, w, h);

    // Oda geçişi: kapı kasası ve aralık duran iç kapı
    const leftIsWall = room.x0 <= W.house.innerL + 1;
    if (!leftIsWall) {
      const dh = 196;
      // Bölme duvar kesiti (kapının üstü)
      ctx.fillStyle = U.shade(base, -0.35);
      ctx.fillRect(0, 0, 12, h - dh - 8);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(12, 0, 3, h - dh - 8);
      // Kasa
      ctx.fillStyle = '#e4dccb';
      ctx.fillRect(0, h - dh - 10, 22, 10);
      ctx.fillRect(0, h - dh - 10, 7, dh + 10);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(7, h - dh, 2, dh);
      // Işık anahtarı
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(46, h - 140, 12, 18);
      ctx.fillStyle = '#bbb';
      ctx.fillRect(50, h - 136, 4, 10);
    }
    // Priz(ler)
    for (let x = 90; x < w - 40; x += 260) {
      ctx.fillStyle = '#f2f0ea';
      ctx.fillRect(x, h - 34, 12, 14);
      ctx.fillStyle = '#555';
      U.circle(ctx, x + 4, h - 27, 1.2);
      U.circle(ctx, x + 8, h - 27, 1.2);
    }
    // Duvar aplikleri (salon, yatak odası, hol, kütüphane...)
    if (['living', 'master', 'hall', 'dining', 'library', 'music', 'treasure'].includes(room.type) && room.k >= 0) {
      for (const fx of [0.22, 0.78]) {
        const sx = w * fx;
        const sy = h - 200;
        ctx.fillStyle = '#b8903a';
        ctx.fillRect(sx - 3, sy, 6, 16);
        ctx.fillRect(sx - 10, sy + 12, 20, 4);
        ctx.fillStyle = '#f3e3c0';
        ctx.beginPath();
        ctx.moveTo(sx - 12, sy);
        ctx.lineTo(sx - 7, sy - 16);
        ctx.lineTo(sx + 7, sy - 16);
        ctx.lineTo(sx + 12, sy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.stroke();
      }
    }
    // Havlu askısı (banyo)
    if (room.type === 'bathroom') {
      ctx.fillStyle = '#c0c4cc';
      ctx.fillRect(w * 0.55, h - 150, 70, 4);
      ctx.fillStyle = '#6aa0d0';
      ctx.fillRect(w * 0.55 + 8, h - 148, 22, 40);
      ctx.fillStyle = '#e8a0b4';
      ctx.fillRect(w * 0.55 + 36, h - 148, 22, 34);
    }
    // Çocuk odası: boy ölçer
    if (room.type === 'kids') {
      ctx.fillStyle = '#ffe08a';
      ctx.fillRect(w - 60, h - 190, 14, 170);
      ctx.fillStyle = '#c23a55';
      for (let y = h - 190; y < h - 20; y += 17) ctx.fillRect(w - 60, y, 7, 2);
    }
    // Pencereler + altlarında kalorifer
    for (const win of room.windows) {
      const wx = win.x - room.x0;
      drawWindow(ctx, wx, win.y - room.y0, win.w, win.h, room.id);
      const ry = h - 64;
      ctx.fillStyle = '#e9e9ee';
      U.fillRoundRect(ctx, wx - 4, ry, win.w + 8, 40, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      for (let x = wx + 2; x < wx + win.w + 2; x += 8) ctx.fillRect(x, ry + 4, 3, 32);
      ctx.fillStyle = '#c0c4cc';
      ctx.fillRect(wx + 4, ry + 40, 5, 14);
      ctx.fillRect(wx + win.w - 9, ry + 40, 5, 14);
    }
    // Oda adı tabelası (bodrumda)
    if (room.k === -1) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 6; i++) ctx.fillRect(((i * 173) % (w - 40)) + 10, 30 + ((i * 71) % 120), 30, 3);
      // Borular
      ctx.strokeStyle = '#6a707c';
      ctx.lineWidth = 8;
      U.line(ctx, 0, 30, w, 30);
      ctx.strokeStyle = '#8a3a2a';
      ctx.lineWidth = 5;
      U.line(ctx, 0, 46, w, 46);
    }
    // Ortam kapanması (ambient occlusion): tavan altı, köşeler ve zemin birleşimi
    // koyulaşır; duvarın ortası hafifçe aydınlık kalır. Oda derinlik kazanır.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.16, 'rgba(0,0,0,0.08)');
    g.addColorStop(0.3, 'rgba(0,0,0,0)');
    g.addColorStop(0.8, 'rgba(0,0,0,0)');
    g.addColorStop(0.95, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (const side of [0, 1]) {
      const sx = side ? w : 0;
      const sg = ctx.createLinearGradient(sx, 0, side ? w - 46 : 46, 0);
      sg.addColorStop(0, 'rgba(0,0,0,0.38)');
      sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(side ? w - 46 : 0, 0, 46, h);
    }
    const glow = ctx.createRadialGradient(w / 2, h * 0.35, 10, w / 2, h * 0.35, Math.max(w, h) * 0.7);
    glow.addColorStop(0, 'rgba(255,255,255,0.05)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Tavan pervazı
    const isHex = /^#[0-9a-f]{6}$/i.test(base);
    const trim = isHex ? U.mix(base, '#ffffff', 0.18) : 'rgba(255,255,255,0.18)';
    ctx.fillStyle = trim;
    ctx.fillRect(0, 0, w, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 5, w, 2);
    // Süpürgelik: üstte ince parlama, altında temas gölgesi
    if (room.k !== -1 || room.type === 'treasure' || room.type === 'game') {
      const bh = 12;
      ctx.fillStyle = isHex ? U.mix(base, '#000000', 0.45) : 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, h - bh, w, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.fillRect(0, h - bh, w, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, h - bh - 2, w, 2);
    }
    // Ortam gölgelemesi (AO): duvar-zemin ve duvar-tavan birleşimleri ile köşeler kararır
    {
      const fl = ctx.createLinearGradient(0, h - 70, 0, h);
      fl.addColorStop(0, 'rgba(0,0,0,0)');
      fl.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = fl;
      ctx.fillRect(0, h - 70, w, 70);
      const cl = ctx.createLinearGradient(0, 0, 0, 60);
      cl.addColorStop(0, 'rgba(0,0,0,0.34)');
      cl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cl;
      ctx.fillRect(0, 0, w, 60);
      for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 110);
        cg.addColorStop(0, 'rgba(0,0,0,0.28)');
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.fillRect(cx - 110, cy - 110, 220, 220);
      }
    }
    return c;
  }

  function drawPattern(ctx, pattern, w, h, base, seed) {
    const dark = U.shade(base, -0.12);
    const light = U.shade(base, 0.08);
    switch (pattern) {
      case 'stripes':
        ctx.fillStyle = dark;
        for (let x = 0; x < w; x += 36) ctx.fillRect(x, 0, 14, h);
        ctx.fillStyle = light;
        for (let x = 20; x < w; x += 36) ctx.fillRect(x, 0, 3, h);
        break;
      case 'dots':
        ctx.fillStyle = light;
        for (let y = 20; y < h; y += 28) for (let x = (y / 28) % 2 ? 14 : 0; x < w; x += 28) U.circle(ctx, x, y, 3);
        break;
      case 'damask':
        ctx.fillStyle = dark;
        for (let y = 30; y < h - 60; y += 60) {
          for (let x = (Math.floor(y / 60) % 2) * 40; x < w; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, y - 18);
            ctx.quadraticCurveTo(x + 14, y - 6, x, y + 18);
            ctx.quadraticCurveTo(x - 14, y - 6, x, y - 18);
            ctx.fill();
            U.circle(ctx, x - 12, y + 4, 4);
            U.circle(ctx, x + 12, y + 4, 4);
          }
        }
        break;
      case 'tiles':
        ctx.strokeStyle = U.rgba('#ffffff', 0.35);
        ctx.lineWidth = 1.5;
        for (let x = 0; x < w; x += 30) U.line(ctx, x, 0, x, h);
        for (let y = 0; y < h; y += 30) U.line(ctx, 0, y, w, y);
        ctx.fillStyle = U.rgba('#2a5db0', 0.2);
        for (let y = h - 120; y < h - 90; y += 30) for (let x = 0; x < w; x += 60) ctx.fillRect(x, y, 30, 30);
        break;
      case 'wood':
        ctx.fillStyle = dark;
        for (let x = 0; x < w; x += 22) ctx.fillRect(x, 0, 2, h);
        ctx.strokeStyle = U.rgba('#000000', 0.08);
        for (let y = 10; y < h; y += 13) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(w * 0.3, y - 3, w * 0.6, y + 3, w, y);
          ctx.stroke();
        }
        break;
      case 'brick':
        RC.BG.brickWall(ctx, 0, 0, w, h, U.shade(base, 0.05), U.shade(base, -0.3));
        break;
      case 'stars':
        ctx.fillStyle = U.rgba('#ffffff', 0.35);
        {
          const rng = new U.RNG(seed * 13 + 7);
          for (let i = 0; i < (w * h) / 2500; i++) {
            U.star(ctx, rng.float(0, w), rng.float(10, h - 80), 6, 2.5, 5);
            ctx.fill();
          }
        }
        break;
      default:
        break;
    }
  }

  function drawWindow(ctx, x, y, w, h, seed) {
    // Çerçeve
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
    // Gece manzarası
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#0a0e22');
    g.addColorStop(1, '#27294a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const rng = new U.RNG(seed * 31 + x);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 12; i++) ctx.fillRect(x + rng.float(0, w), y + rng.float(0, h * 0.6), 1.2, 1.2);
    // Karşı binalar
    ctx.fillStyle = '#0e1124';
    for (let i = 0; i < 4; i++) {
      const bh = rng.float(20, 60);
      ctx.fillRect(x + i * (w / 4), y + h - bh, w / 4 - 2, bh);
      ctx.fillStyle = 'rgba(255,217,138,0.7)';
      if (rng.chance(0.6)) ctx.fillRect(x + i * (w / 4) + 5, y + h - bh + 8, 4, 5);
      ctx.fillStyle = '#0e1124';
    }
    if (rng.chance(0.35)) {
      U.circle(ctx, x + w * 0.7, y + h * 0.25, 9, '#f5ecc8');
    }
    // Kayıt ve pervaz
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillRect(x, y + h / 2 - 3, w, 6);
    ctx.fillStyle = '#d0cabe';
    ctx.fillRect(x - 14, y + h + 6, w + 28, 8);
    // Cam yansıması
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + h - 6);
    ctx.lineTo(x + 24, y + 6);
    ctx.lineTo(x + 34, y + 6);
    ctx.lineTo(x + 16, y + h - 6);
    ctx.fill();
  }

  /* =====================================================================
   * Yatakların örtüleri (uyuyan kişinin üstüne)
   * =================================================================== */
  WR.drawBlankets = function (ctx, scene) {
    for (const r of scene.residents) {
      const b = r.bed;
      if (!b) continue;
      const occupied = r.state === 'sleep';
      ctx.save();
      ctx.translate(b.x, b.y);
      RC.Furniture.DEFS.doublebed.drawBlanket(ctx, b.w, b.h, b.pal, occupied);
      ctx.restore();
    }
  };

  WR.drawRain = function (ctx, scene, w, h, dt) {
    if (scene.weather !== 'rain') return;
    WR.rain.update(dt, w, h);
    WR.rain.render(ctx, 0.35);
  };

  RC.WorldRender = WR;
})(window.RC);
