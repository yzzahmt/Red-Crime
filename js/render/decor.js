/* =========================================================================
 *  RED CRIME - Oda dekorasyonları
 *  Oda türüne özel, alınamayan arka plan detayları (oda önbelleğine çizilir):
 *  aile fotoğrafları, dünya haritası ve mantar pano, çocuk posterleri ve
 *  flama, mutfak kancaları, neon tabela, akustik paneller, portmanto,
 *  alet panosu, kemerli mahzen, galeri spotları ve eser etiketleri...
 *  Ayrıca canlı çizilen avizeler, tavan vantilatörleri, duman dedektörleri
 *  ve evin giriş verandası.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  function frame(ctx, x, y, w, h, frameCol, inner) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, y + 4, w, h);
    ctx.fillStyle = frameCol;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = inner || '#e8e0cc';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  }
  function silhouette(ctx, cx, cy, s, col) {
    ctx.fillStyle = col;
    U.circle(ctx, cx, cy - s * 0.5, s * 0.35);
    ctx.beginPath();
    ctx.ellipse(cx, cy + s * 0.35, s * 0.55, s * 0.45, 0, Math.PI, 0);
    ctx.fill();
  }

  const ROOM = {
    living(ctx, room, W, w, h, rng) {
      // Aile fotoğrafları kümesi
      const cx = w * rng.float(0.3, 0.7);
      const cy = h - 205;
      const frames = [
        [-60, -18, 34, 42],
        [-18, -30, 44, 34],
        [34, -14, 28, 36],
        [-40, 30, 30, 26],
        [0, 12, 40, 30],
      ];
      for (const [dx, dy, fw, fh] of frames) {
        frame(ctx, cx + dx, cy + dy, fw, fh, rng.pick(['#5b3a24', '#1a1a1a', '#b8903a', '#e8e4dc']), '#d8d0c0');
        silhouette(ctx, cx + dx + fw / 2 - 5, cy + dy + fh / 2 + 3, fh * 0.4, 'rgba(90,70,60,0.55)');
        silhouette(ctx, cx + dx + fw / 2 + 6, cy + dy + fh / 2 + 5, fh * 0.32, 'rgba(120,90,70,0.5)');
      }
      // Köşede ayaklı lamba silueti
      const lx = rng.chance(0.5) ? 30 : w - 40;
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(lx - 2, h - 170, 4, 160);
      ctx.fillRect(lx - 14, h - 12, 28, 4);
      ctx.fillStyle = '#e8d8b0';
      U.poly(ctx, [lx - 20, h - 170, lx - 12, h - 200, lx + 12, h - 200, lx + 20, h - 170]);
    },
    dining(ctx, room, W, w, h, rng) {
      // Natürmort tablo (dekor)
      const fx = w * 0.5 - 60;
      frame(ctx, fx, h - 230, 120, 70, '#8a6a2a', '#3a2a1a');
      U.circle(ctx, fx + 40, h - 190, 12, '#c23a2b');
      U.circle(ctx, fx + 62, h - 186, 10, '#e8b04a');
      U.circle(ctx, fx + 80, h - 192, 9, '#6a8a3a');
      ctx.fillStyle = '#c9c0a0';
      U.ellipse(ctx, fx + 60, h - 176, 40, 6, 0);
    },
    kitchen(ctx, room, W, w, h, rng) {
      // Kanca rayı ve asılı mutfak aletleri
      const x0 = w * 0.15;
      const rw = Math.min(220, w * 0.4);
      const y = h - 200;
      ctx.fillStyle = '#9aa0aa';
      ctx.fillRect(x0, y, rw, 4);
      for (let i = 0; i < 6; i++) {
        const x = x0 + 14 + i * (rw / 6);
        ctx.strokeStyle = '#6a707c';
        ctx.lineWidth = 1.5;
        U.line(ctx, x, y + 4, x, y + 12);
        if (i % 3 === 0) {
          U.circle(ctx, x, y + 26, 11, '#3a3a40');
          ctx.fillStyle = '#3a3a40';
          ctx.fillRect(x - 2, y + 10, 4, 8);
        } else if (i % 3 === 1) {
          ctx.fillStyle = '#c0c4cc';
          ctx.fillRect(x - 1.5, y + 12, 3, 30);
          U.ellipse(ctx, x, y + 44, 6, 4, 0, '#c0c4cc');
        } else {
          ctx.fillStyle = '#8a5a34';
          ctx.fillRect(x - 1.5, y + 12, 3, 22);
          ctx.fillStyle = '#c0c4cc';
          ctx.fillRect(x - 5, y + 34, 10, 10);
        }
      }
      // Baharat rafı
      const sx = w * 0.7;
      ctx.fillStyle = '#8a5a34';
      ctx.fillRect(sx, h - 196, 90, 4);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = 'rgba(220,240,255,0.5)';
        ctx.fillRect(sx + 4 + i * 12, h - 212, 9, 16);
        ctx.fillStyle = ['#c23a2b', '#e8b04a', '#6a8a3a', '#8a3a1a', '#f0e0a0', '#3a2a1a', '#c86a2a'][i];
        ctx.fillRect(sx + 5 + i * 12, h - 206, 7, 9);
      }
    },
    bedroom(ctx, room, W, w, h, rng) {
      const fx = w * rng.float(0.35, 0.6);
      frame(ctx, fx, h - 236, 90, 60, '#e8e4dc', rng.pick(['#8fb3cc', '#c9a0b0', '#a0c0a0']));
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      U.poly(ctx, [fx + 6, h - 182, fx + 40, h - 222, fx + 60, h - 200, fx + 84, h - 216, fx + 84, h - 182]);
    },
    master(ctx, room, W, w, h, rng) {
      ROOM.bedroom(ctx, room, W, w, h, rng);
      // Duvar kaplaması panelleri
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      for (let x = 30; x < w - 60; x += 110) ctx.strokeRect(x, h - 250, 90, 160);
    },
    kids(ctx, room, W, w, h, rng) {
      // Flama
      ctx.strokeStyle = '#6a5a4a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, 40);
      ctx.quadraticCurveTo(w / 2, 90, w - 20, 40);
      ctx.stroke();
      const cols = ['#e8283c', '#ffd24a', '#4aa8ff', '#3ddc84', '#b467ff'];
      for (let i = 1; i < 14; i++) {
        const t = i / 14;
        const x = U.lerp(20, w - 20, t);
        const y = 40 + Math.sin(t * Math.PI) * 25;
        ctx.fillStyle = cols[i % cols.length];
        U.poly(ctx, [x - 9, y, x + 9, y, x, y + 18]);
      }
      // Roket posteri
      const px = w * 0.3;
      frame(ctx, px, h - 240, 56, 76, '#ffffff', '#1a2a5a');
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 8; i++) ctx.fillRect(px + 8 + ((i * 17) % 40), h - 232 + ((i * 29) % 60), 1.5, 1.5);
      ctx.fillStyle = '#e8e8ec';
      U.poly(ctx, [px + 28, h - 226, px + 36, h - 200, px + 36, h - 186, px + 20, h - 186, px + 20, h - 200]);
      ctx.fillStyle = '#ff8c2e';
      U.poly(ctx, [px + 22, h - 186, px + 34, h - 186, px + 28, h - 174]);
      // Dinozor posteri
      const dx = w * 0.62;
      frame(ctx, dx, h - 236, 70, 54, '#ffd24a', '#bfe3a0');
      ctx.fillStyle = '#3a8a4a';
      U.ellipse(ctx, dx + 34, h - 200, 18, 10, 0);
      ctx.fillRect(dx + 46, h - 222, 6, 20);
      U.circle(ctx, dx + 52, h - 222, 6);
      ctx.fillRect(dx + 24, h - 194, 4, 10);
      ctx.fillRect(dx + 40, h - 194, 4, 10);
    },
    study(ctx, room, W, w, h, rng) {
      // Dünya haritası
      const mx = w * 0.22;
      frame(ctx, mx, h - 250, 140, 84, '#3a2a1a', '#e8d9a8');
      ctx.fillStyle = '#8a9a6a';
      U.ellipse(ctx, mx + 36, h - 214, 20, 14, 0.3);
      U.ellipse(ctx, mx + 44, h - 190, 10, 12, 0);
      U.ellipse(ctx, mx + 78, h - 218, 18, 10, 0);
      U.ellipse(ctx, mx + 88, h - 196, 12, 14, 0);
      U.ellipse(ctx, mx + 112, h - 186, 12, 6, 0);
      ctx.strokeStyle = 'rgba(90,70,40,0.4)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) U.line(ctx, mx + 4, h - 250 + i * 21, mx + 136, h - 250 + i * 21);
      // Mantar pano: notlar ve iplerle bağlı fotoğraflar
      const bx = w * 0.62;
      frame(ctx, bx, h - 246, 110, 80, '#8a5a34', '#c49a6a');
      const pins = [];
      for (let i = 0; i < 6; i++) {
        const nx = bx + 10 + (i % 3) * 32 + rng.float(-3, 3);
        const ny = h - 238 + Math.floor(i / 3) * 34 + rng.float(-3, 3);
        ctx.fillStyle = i % 2 ? '#fff7a0' : '#f0f0f0';
        ctx.fillRect(nx, ny, 24, 22);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(nx + 3, ny + 6, 16, 1.5);
        ctx.fillRect(nx + 3, ny + 11, 12, 1.5);
        pins.push([nx + 12, ny + 2]);
      }
      ctx.strokeStyle = '#c23a2b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      pins.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      for (const [x, y] of pins) U.circle(ctx, x, y, 2.5, '#e8283c');
      // Diploma çerçeveleri
      for (let i = 0; i < 2; i++) frame(ctx, w * 0.45 + i * 34, h - 180, 26, 20, '#1a1a1a', '#f7f0dc');
    },
    library(ctx, room, W, w, h, rng) {
      // Ahşap panel ve raylı merdiven rayı
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      for (let x = 0; x < w; x += 60) ctx.fillRect(x, 20, 3, h - 30);
      ctx.fillStyle = '#b8903a';
      ctx.fillRect(10, 36, w - 20, 4);
      // Okuma lambası (duvar)
      const lx = w * rng.float(0.3, 0.7);
      ctx.fillStyle = '#2a4a3a';
      U.poly(ctx, [lx - 18, h - 200, lx + 18, h - 200, lx + 10, h - 214, lx - 10, h - 214]);
      ctx.fillStyle = '#b8903a';
      ctx.fillRect(lx - 2, h - 200, 4, 12);
    },
    bathroom(ctx, room, W, w, h, rng) {
      // Aynalı dolap
      const mx = w * 0.3;
      U.fillRoundRect(ctx, mx, h - 230, 70, 60, 4, '#e8e8ec');
      const g = ctx.createLinearGradient(mx, h - 226, mx + 66, h - 174);
      g.addColorStop(0, '#dff1ff');
      g.addColorStop(1, '#8fb3cc');
      ctx.fillStyle = g;
      ctx.fillRect(mx + 4, h - 226, 62, 52);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      U.line(ctx, mx + 12, h - 196, mx + 26, h - 214);
      // Duş perdesi rayı
      const sx = w * 0.72;
      ctx.fillStyle = '#c0c4cc';
      ctx.fillRect(sx - 10, h - 258, 120, 4);
      ctx.fillStyle = 'rgba(160,210,230,0.45)';
      for (let i = 0; i < 5; i++) ctx.fillRect(sx - 6 + i * 22, h - 254, 18, 150 + (i % 2) * 6);
    },
    hall(ctx, room, W, w, h, rng) {
      // Portmanto: kancalar, paltolar, şapka
      const hx = w * 0.25;
      ctx.fillStyle = '#5b3a24';
      ctx.fillRect(hx, h - 190, 130, 10);
      const coats = ['#3a4a6a', '#8a3a2a', '#2a2a30', '#6a5a3a'];
      for (let i = 0; i < 4; i++) {
        const x = hx + 16 + i * 32;
        U.circle(ctx, x, h - 185, 3, '#d9b04a');
        if (i !== 2) {
          ctx.fillStyle = coats[i];
          ctx.beginPath();
          ctx.moveTo(x - 6, h - 180);
          ctx.lineTo(x + 6, h - 180);
          ctx.lineTo(x + 14, h - 100);
          ctx.lineTo(x - 14, h - 100);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = '#2a2a30';
          U.ellipse(ctx, x, h - 176, 14, 5, 0);
          ctx.fillRect(x - 8, h - 190, 16, 12);
        }
      }
      // Şemsiyelik
      ctx.fillStyle = '#6a707c';
      ctx.fillRect(hx + 150, h - 60, 26, 50);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      U.line(ctx, hx + 158, h - 60, hx + 154, h - 110);
      U.line(ctx, hx + 168, h - 60, hx + 172, h - 104);
    },
    storage(ctx, room, W, w, h, rng) {
      // Alet panosu
      const px = w * 0.4;
      ctx.fillStyle = '#b08a5a';
      ctx.fillRect(px, h - 240, 160, 90);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = h - 234; y < h - 150; y += 12) for (let x = px + 6; x < px + 156; x += 12) U.circle(ctx, x, y, 1.2);
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(px + 20, h - 228, 6, 50);
      ctx.fillRect(px + 14, h - 232, 18, 8);
      ctx.fillStyle = '#c23a2b';
      ctx.fillRect(px + 50, h - 226, 5, 60);
      ctx.fillStyle = '#6a707c';
      U.circle(ctx, px + 100, h - 200, 16);
      ctx.fillStyle = '#b08a5a';
      U.circle(ctx, px + 100, h - 200, 8);
      // Çıplak ampul
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      U.line(ctx, w * 0.8, 0, w * 0.8, 60);
      U.circle(ctx, w * 0.8, 66, 6, '#f0e8c0');
    },
    workshop(ctx, room, W, w, h, rng) {
      ROOM.storage(ctx, room, W, w, h, rng);
    },
    wine(ctx, room, W, w, h, rng) {
      // Tuğla kemerler
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 10;
      for (let x = 60; x < w; x += 200) {
        ctx.beginPath();
        ctx.arc(x + 70, h - 40, 80, Math.PI, 0);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = 60; x < w; x += 200) {
        ctx.beginPath();
        ctx.arc(x + 70, h - 40, 75, Math.PI, 0);
        ctx.fill();
      }
    },
    game(ctx, room, W, w, h, rng) {
      // Neon tabela
      const nx = w * 0.5;
      ctx.save();
      ctx.shadowColor = '#ff3bd4';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ff7be4';
      ctx.lineWidth = 3;
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText('GAME ON', nx, h - 200);
      ctx.shadowColor = '#3bd4ff';
      ctx.strokeStyle = '#7be4ff';
      ctx.strokeRect(nx - 90, h - 236, 180, 50);
      ctx.restore();
      // Dart tahtası
      const dx = w * 0.18;
      for (let i = 5; i > 0; i--) U.circle(ctx, dx, h - 190, i * 6, i % 2 ? '#1a1a1a' : '#e8e0c8');
      U.circle(ctx, dx, h - 190, 3, '#e8283c');
    },
    music(ctx, room, W, w, h, rng) {
      // Akustik paneller
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * ((w - 60) / 6);
        ctx.fillStyle = i % 2 ? '#2a2a34' : '#3a2a3a';
        ctx.fillRect(x, h - 250, (w - 60) / 6 - 8, 60);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 4 + k * 12, h - 246, 6, 52);
      }
      // Duvardaki plaklar
      for (let i = 0; i < 3; i++) {
        const x = w * 0.3 + i * 60;
        U.circle(ctx, x, h - 160, 20, '#15151a');
        U.circle(ctx, x, h - 160, 7, ['#e8283c', '#ffd24a', '#4aa8ff'][i]);
      }
    },
    treasure(ctx, room, W, w, h, rng) {
      // Kadife perdeler ve altın bordür
      ctx.fillStyle = '#5a0a1a';
      for (const side of [0, w - 70]) {
        ctx.beginPath();
        ctx.moveTo(side, 14);
        ctx.lineTo(side + 70, 14);
        ctx.quadraticCurveTo(side + 40, h * 0.5, side + (side ? 70 : 0), h - 10);
        ctx.lineTo(side + (side ? 70 : 0), 14);
        ctx.fill();
      }
      ctx.fillStyle = '#d9b04a';
      ctx.fillRect(0, 14, w, 6);
      ctx.fillRect(0, h - 76, w, 3);
      // Spot ışıkları
      for (let x = 100; x < w - 80; x += 140) {
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(x - 6, 20, 12, 14);
        const g = ctx.createLinearGradient(0, 34, 0, h);
        g.addColorStop(0, 'rgba(255,240,200,0.18)');
        g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g;
        U.poly(ctx, [x - 6, 34, x + 6, 34, x + 50, h - 10, x - 50, h - 10]);
      }
    },
    gallery(ctx, room, W, w, h, rng) {
      // Ray spotlar
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(10, 24, w - 20, 4);
      for (let x = 60; x < w - 40; x += 120) {
        ctx.save();
        ctx.translate(x, 28);
        ctx.rotate(0.5);
        ctx.fillRect(-4, 0, 8, 18);
        ctx.restore();
        const g = ctx.createRadialGradient(x + 30, h - 190, 10, x + 30, h - 190, 110);
        g.addColorStop(0, 'rgba(255,245,220,0.16)');
        g.addColorStop(1, 'rgba(255,245,220,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 80, h - 300, 220, 220);
      }
      // Eser etiketleri (duvardaki eşyaların altına)
      for (const it of W.items) {
        if (!it.wall || it.room !== room) continue;
        const px = it.x + it.w / 2 - room.x0;
        const py = it.y + it.h - room.y0 + 10;
        ctx.fillStyle = '#f5f2ea';
        ctx.fillRect(px - 16, py, 32, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(px - 12, py + 3, 24, 1.5);
        ctx.fillRect(px - 12, py + 7, 16, 1.5);
      }
    },
    trophy(ctx, room, W, w, h, rng) {
      // Takım flamaları
      const cols = [['#1f7a4a', '#ffffff'], ['#e8283c', '#ffd24a'], ['#2a4d8f', '#ffffff']];
      for (let i = 0; i < 3; i++) {
        const x = 60 + i * (w - 120) / 3;
        const [a, b] = cols[i];
        ctx.fillStyle = a;
        U.poly(ctx, [x, h - 250, x + 90, h - 236, x, h - 222]);
        ctx.fillStyle = b;
        ctx.fillRect(x + 4, h - 240, 30, 4);
        ctx.fillStyle = '#8a5a34';
        ctx.fillRect(x - 3, h - 254, 4, 36);
      }
      // Stadyum fotoğrafı
      frame(ctx, w * 0.55, h - 200, 110, 50, '#1a1a1a', '#2a6a3a');
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.55 + 12, h - 190, 86, 30);
      U.line(ctx, w * 0.55 + 55, h - 190, w * 0.55 + 55, h - 160);
    },
    gym(ctx, room, W, w, h, rng) {
      // Boy aynası ve motivasyon posteri
      const mx = w * 0.25;
      const g = ctx.createLinearGradient(mx, h - 240, mx + 160, h - 20);
      g.addColorStop(0, '#dff1ff');
      g.addColorStop(1, '#6a8aa0');
      ctx.fillStyle = '#c0c4cc';
      ctx.fillRect(mx - 4, h - 244, 168, 234);
      ctx.fillStyle = g;
      ctx.fillRect(mx, h - 240, 160, 226);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      U.line(ctx, mx + 20, h - 60, mx + 80, h - 200);
      frame(ctx, w * 0.7, h - 236, 60, 80, '#1a1a1a', '#e8283c');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('NO', w * 0.7 + 30, h - 204);
      ctx.fillText('PAIN', w * 0.7 + 30, h - 190);
    },
    dressing(ctx, room, W, w, h, rng) {
      // Makyaj aynası ampulleri
      const mx = w * 0.5 - 50;
      U.fillRoundRect(ctx, mx, h - 250, 100, 80, 6, '#e8e4dc');
      ctx.fillStyle = '#9ac0d8';
      ctx.fillRect(mx + 10, h - 240, 80, 60);
      for (let i = 0; i < 5; i++) {
        U.circle(ctx, mx + 10 + i * 20, h - 246, 4, '#fff7c8');
        U.circle(ctx, mx + 10 + i * 20, h - 174, 4, '#fff7c8');
      }
    },
  };

  const Decor = {
    /** Oda önbelleğine sabit dekor çiz */
    room(ctx, room, W, w, h) {
      const rng = new U.RNG(room.id * 131 + 7);
      const fn = ROOM[room.type];
      if (fn) {
        ctx.save();
        try {
          fn(ctx, room, W, w, h, rng);
        } catch (e) {
          /* dekor hatası oyunu durdurmasın */
        }
        ctx.restore();
      }
      // Tavan göbeği
      if (room.k >= 0) {
        const cx = w / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        U.ellipse(ctx, cx, 12, 34, 7, 0);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, 12, 26, 5, 0, 0, U.TAU);
        ctx.stroke();
      }
      // Duman dedektörü
      const dx = w * 0.25;
      U.circle(ctx, dx, 16, 7, '#f2f2f4');
      U.circle(ctx, dx + 3, 15, 1.2, '#ff3043');
      // Havalandırma ızgarası
      const vx = w * 0.8;
      ctx.fillStyle = '#d8d8dc';
      ctx.fillRect(vx, 26, 40, 18);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 0; i < 5; i++) ctx.fillRect(vx + 3, 29 + i * 3, 34, 1.5);
    },

    /** Canlı dekor: avizeler ve tavan vantilatörleri */
    live(ctx, scene, room, t) {
      const lux = ['luxury', 'mansion', 'oligarch', 'gallery', 'waterfront', 'classic'].includes(scene.cfg.theme);
      const cx = (room.x0 + room.x1) / 2;
      const top = room.y0;
      if ((room.type === 'dining' || room.type === 'living' || room.type === 'hall') && lux) {
        // Kristal avize
        ctx.strokeStyle = '#b8903a';
        ctx.lineWidth = 2;
        U.line(ctx, cx, top, cx, top + 26);
        const sway = Math.sin(t * 0.8 + room.id) * 1.5;
        ctx.save();
        ctx.translate(cx + sway, top + 26);
        ctx.fillStyle = '#d9b04a';
        U.ellipse(ctx, 0, 6, 40, 6, 0);
        for (let i = -3; i <= 3; i++) {
          const x = i * 12;
          ctx.strokeStyle = 'rgba(220,240,255,0.8)';
          ctx.lineWidth = 1;
          U.line(ctx, x, 8, x, 24 + Math.abs(i) * -2 + 6);
          const glint = 0.5 + Math.sin(t * 3 + i) * 0.5;
          U.circle(ctx, x, 30 - Math.abs(i) * 2, 3, `rgba(220,240,255,${0.5 + glint * 0.5})`);
        }
        for (let i = -2; i <= 2; i++) U.circle(ctx, i * 16, 0, 3.5, scene.lightsOn ? '#fff7d0' : '#8a8070');
        ctx.restore();
      } else if (room.type === 'bedroom' || room.type === 'master' || room.type === 'kids') {
        // Tavan vantilatörü
        const fx = cx + (room.x1 - room.x0) * 0.25;
        ctx.strokeStyle = '#3a3a40';
        ctx.lineWidth = 3;
        U.line(ctx, fx, top, fx, top + 20);
        U.fillRoundRect(ctx, fx - 8, top + 18, 16, 10, 4, '#5a4a3a');
        const a = t * (scene.lightsOn ? 5 : 3);
        ctx.fillStyle = '#6b4a2a';
        for (let i = 0; i < 2; i++) {
          const w = Math.cos(a + i * Math.PI / 2) * 46;
          U.fillRoundRect(ctx, fx - Math.abs(w), top + 22, Math.abs(w) * 2, 4, 2);
        }
      }
    },

    /** Evin girişi: veranda, merdiven, fenerler, posta kutusu */
    porch(ctx, W, t) {
      const d = W.frontDoor;
      if (!d) return;
      const x = d.x;
      const y = d.y;
      // Veranda basamakları
      ctx.fillStyle = '#9a9aa4';
      ctx.fillRect(x - 110, y - 6, 110, 6);
      ctx.fillStyle = '#b8b8c0';
      ctx.fillRect(x - 96, y - 12, 96, 6);
      // Sundurma
      ctx.fillStyle = W.cfg.roof;
      U.poly(ctx, [x - 130, y - 176, x + 6, y - 206, x + 6, y - 186, x - 130, y - 164]);
      ctx.fillStyle = U.shade(W.cfg.roof, -0.3);
      ctx.fillRect(x - 130, y - 166, 136, 5);
      // Sütunlar
      ctx.fillStyle = '#e8e4dc';
      ctx.fillRect(x - 124, y - 164, 10, 152);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(x - 117, y - 164, 3, 152);
      // Fenerler
      for (const lx of [x - 20]) {
        ctx.fillStyle = '#1a1a1e';
        ctx.fillRect(lx - 7, y - 150, 14, 22);
        const flick = 0.85 + Math.sin(t * 9) * 0.05;
        ctx.fillStyle = `rgba(255,220,140,${flick})`;
        ctx.fillRect(lx - 5, y - 147, 10, 16);
      }
      // Saksılar
      for (const px of [x - 150, x - 104]) {
        ctx.fillStyle = '#b8643c';
        U.poly(ctx, [px - 12, y - 30, px + 12, y - 30, px + 9, y, px - 9, y]);
        ctx.fillStyle = '#2d6a3e';
        U.circle(ctx, px, y - 38, 13);
        U.circle(ctx, px - 8, y - 32, 8);
        U.circle(ctx, px + 8, y - 32, 8);
      }
      // Kapı numarası
      U.fillRoundRect(ctx, x - 60, y - 200, 34, 18, 3, '#1a2a5a');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(String(12 + W.levelIndex * 7), x - 43, y - 187);
      // Posta kutusu (bahçe kapısında)
      const mx = W.garden.x0 + 150;
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(mx - 2, -70, 4, 70);
      U.fillRoundRect(ctx, mx - 16, -94, 32, 26, 8, '#c23a2b');
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(mx + 14, -96, 3, 14);
      // Taş yol
      ctx.fillStyle = 'rgba(180,180,190,0.6)';
      for (let px = W.garden.x0 + 190; px < x - 120; px += 46) U.ellipse(ctx, px, -1, 17, 3, 0);
    },
  };

  RC.Decor = Decor;
})(window.RC);
