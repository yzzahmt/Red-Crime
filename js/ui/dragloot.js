/* =========================================================================
 *  RED CRIME - Fareyle fiziksel ganimet toplama
 *  Klavye (SPACE) toplamaya ek olarak: menzildeki bir eşyaya tıkla, tut,
 *  sürükle ve bırak.
 *   - HUD'daki çuval paneline bırak: çuvala girer (küçük eşyalar)
 *   - Kamyonun yükleme bölgesine bırak: kamyona yüklenir
 *   - Karakterin üstüne yavaşça bırak: eline alır
 *   - Başka bir yere bırak: sürükleme hızıyla savrulur (fırlatma sesi çıkar!)
 *  Kütle geri bildirimi: ağır eşyalar imleci geç izler, aşağı sarkar, oyuncuyu
 *  yavaşlatır ve sürtünerek ses çıkarır. Kol menzili dışına taşınamaz.
 *
 *  Durum sahnede tutulur (scene.drag); sahne çıkışında releaseWorld() temizler.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const I = RC.Input;
  const D = RC.Draw;

  const REACH = 96; // el ile tutma menzili (dünya px)
  const PICK_PAD = 6; // imleç çevresindeki tolerans
  const MOUSE_ACTIVE_SEC = 3; // fare bu kadar süre hareketsizse hedefi klavye seçer
  const GENTLE_SPEED = 160; // bunun altındaki bırakış yavaşça koyma sayılır
  const q = [];

  const DragLoot = {
    /** Alınabilir durumda mı (yerinde, duvarda ya da yavaşlamış düşüşte) */
    grabbable(it) {
      return it.state === 'rest' || it.state === 'wall' || (it.state === 'falling' && Math.abs(it.vy) < 120);
    },

    /**
     * İmlecin TAM altındaki, menzilde ve görüş hattındaki eşya. Üst üste binen
     * eşyalarda imlecin üstünde olduğu en küçük eşya seçilir (üstteki küçük
     * eşya, altındaki büyük eşyadan önce). İmleç bir eşyanın içinde değilse
     * PICK_PAD kadar yakındaki en yakın eşya.
     */
    itemUnderCursor(scene) {
      const p = scene.player;
      const W = scene.world;
      const m = scene.camera.screenToWorld(I.mouse.x, I.mouse.y);
      W.itemGrid.query(m.x - PICK_PAD, m.y - PICK_PAD, PICK_PAD * 2, PICK_PAD * 2, q);
      const hx = p.cx;
      const hy = p.bodyY - 8;
      let best = null;
      let bestKey = Infinity;
      for (const it of q) {
        if (!this.grabbable(it)) continue;
        if (U.dist(hx, hy, it.cx, it.cy) > REACH + Math.max(it.w, it.h) / 2) continue;
        if (!RC.Physics.lineOfSight(W.grid, hx, hy, it.cx, it.cy)) continue;
        const inside = m.x >= it.x && m.x <= it.x + it.w && m.y >= it.y && m.y <= it.y + it.h;
        const gap = Math.hypot(Math.max(it.x - m.x, 0, m.x - it.x - it.w), Math.max(it.y - m.y, 0, m.y - it.y - it.h));
        // İçerideyse alana göre (küçük önce), değilse uzaklığa göre; içeridekiler her zaman önce
        const key = inside ? it.w * it.h : 1e6 + gap;
        if (key < bestKey) {
          bestKey = key;
          best = it;
        }
      }
      return best;
    },

    /** Fare şu an hedef seçmek için kullanılıyor mu (yeni hareket ya da tıklama) */
    mouseActive() {
      return I.mouse.inside && (I.mouse.pressed || I.mouseRecentlyUsed(MOUSE_ACTIVE_SEC));
    },

    /**
     * Karedeki tek hedef: fare kullanılıyorsa imlecin altındaki eşya. Oyuncu
     * güncellemesinden ÖNCE çağrılır; SPACE (Player.grabCandidate) ve tıklama
     * aynı eşyayı hedefler, ekranda tek bir vurgu görünür.
     */
    updateHover(scene) {
      const p = scene.player;
      const ok = p && scene.world && scene.state === 'play' && !scene.drag && !p.hiddenInTruck && !p.climbing;
      this.hover = ok && this.mouseActive() ? this.itemUnderCursor(scene) : null;
      if (!scene.drag) this.setCursor(this.hover ? 'grab' : '');
    },

    update(scene, dt) {
      const p = scene.player;
      if (!p || !scene.world) return;
      const active = scene.state === 'play' && !p.hiddenInTruck && !p.climbing;
      const drag = scene.drag;
      if (drag && !active) {
        this.drop(scene, true);
        return;
      }
      if (!active) {
        this.hover = null;
        this.setCursor('');
        return;
      }
      if (!drag) {
        // Hedef updateHover() ile karenin başında seçildi; SPACE aynı karede
        // onu aldıysa artık alınabilir değildir.
        const h = this.hover;
        if (h && I.mouse.pressed && this.grabbable(h)) this.begin(scene, h);
        return;
      }
      this.setCursor('grabbing');
      this.follow(scene, drag, dt);
      if (!I.mouse.down) this.drop(scene, false);
    },

    begin(scene, it) {
      const p = scene.player;
      const W = scene.world;
      if (it.isKey) {
        p.pickUp(it);
        return;
      }
      scene.releaseAbove(it);
      W.itemGrid.remove(it);
      scene.activeItems.delete(it);
      const wasWall = it.state === 'wall';
      it.state = 'drag';
      it.angle = 0;
      scene.drag = { item: it, vx: 0, vy: 0, scrapeT: 0, strain: 0 };
      p.dragItem = it;
      RC.Audio.play('pickup', { vol: 0.5 });
      scene.makeNoise(it.cx, it.cy, (wasWall ? 0.08 : 0.04) + it.kg * 0.005, 'grab');
      scene.onPickup(it);
    },

    /** Kütleye bağlı yay-sönüm ile imleci izle; kol menzili ve duvarlarla sınırla. */
    follow(scene, drag, dt) {
      const it = drag.item;
      const p = scene.player;
      const W = scene.world;
      const m = scene.camera.screenToWorld(I.mouse.x, I.mouse.y);
      const kg = Math.max(0.05, it.kg);
      const strength = 1 + (p.strength || 0) * 0.25;
      const stiff = 220 / (1 + kg * 0.6 / strength);
      const damp = 2 * Math.sqrt(stiff) * 0.9;
      const sag = kg * 22 / strength; // ağır eşya aşağı sarkar

      let tx = m.x - it.w / 2;
      let ty = m.y - it.h / 2 + sag;
      // Kol menzili: elden en fazla REACH uzaklıkta
      const hx = p.cx;
      const hy = p.bodyY - 8;
      const dx = tx + it.w / 2 - hx;
      const dy = ty + it.h / 2 - hy;
      const dd = Math.hypot(dx, dy);
      drag.strain = U.clamp01(dd / REACH);
      if (dd > REACH) {
        tx = hx + (dx / dd) * REACH - it.w / 2;
        ty = hy + (dy / dd) * REACH - it.h / 2;
      }
      drag.vx += ((tx - it.x) * stiff - drag.vx * damp) * dt;
      drag.vy += ((ty - it.y) * stiff - drag.vy * damp) * dt;
      const nx = it.x + drag.vx * dt;
      const ny = it.y + drag.vy * dt;
      // Duvar/döşeme içine girmesin: eksen eksen dene
      if (RC.Physics.spaceFree(nx, it.y, it.w, it.h, W.grid)) it.x = nx;
      else drag.vx *= -0.2;
      if (RC.Physics.spaceFree(it.x, ny, it.w, it.h, W.grid)) it.y = ny;
      else drag.vy *= -0.2;
      it.angle = U.clamp(drag.vx * 0.0015, -0.5, 0.5);

      // Ağır eşyayı hızlı sürüklemek ses çıkarır
      const speed = Math.hypot(drag.vx, drag.vy);
      drag.scrapeT -= dt;
      if (kg >= 2 && speed > 140 && drag.scrapeT <= 0) {
        drag.scrapeT = 0.35;
        scene.makeNoise(it.cx, it.cy, U.clamp(kg * speed * 0.00004, 0.03, 0.3), 'drag');
      }
    },

    /** force=true: sahne durumu değişti, eşyayı olduğu yere bırak. */
    drop(scene, force) {
      const drag = scene.drag;
      if (!drag) return;
      const it = drag.item;
      const p = scene.player;
      const W = scene.world;
      scene.drag = null;
      if (p) p.dragItem = null;
      this.setCursor('');
      if (!force) {
        const bag = RC.HUD.bagRect;
        const overBag = bag && I.hover(bag.x, bag.y, bag.w, bag.h);
        if (overBag && it.small && p.bag.length < p.bagCap) {
          it.state = 'bag';
          p.bag.push(it);
          RC.Audio.play('bag', { vol: 0.8 });
          scene.particles.text(p.cx, p.y - 10, '+' + U.formatMoney(it.value), { color: it.rarity.color, size: 15, life: 1 });
          scene.makeNoise(p.cx, p.cy, 0.03 * p.shoeMul, 'grab');
          return;
        }
        if (overBag) scene.toast(it.small ? RC.L('Çuval dolu! Kamyona boşalt.') : RC.L('Bu eşya çuvala sığmaz.'), '#ff8c2e');
        const z = W.truck.zone;
        if (!overBag && it.x + it.w > z.x && it.x < z.x + z.w && it.y + it.h > z.y && it.y < z.y + z.h) {
          scene.loadItem(it);
          return;
        }
        const slow = Math.hypot(drag.vx, drag.vy) < GENTLE_SPEED;
        if (!overBag && !p.held && slow && U.dist(it.cx, it.cy, p.cx, p.bodyY) < 34) {
          it.state = 'held';
          p.held = it;
          RC.Audio.play('pickup', { vol: 0.6 });
          return;
        }
      }
      // Dünyaya bırak: yavaşsa usulca koy, hızlıysa savur
      const speed = Math.hypot(drag.vx, drag.vy);
      const gentle = speed < GENTLE_SPEED;
      if (!RC.Physics.spaceFree(it.x, it.y, it.w, it.h, W.grid)) {
        it.x = p.cx - it.w / 2;
        it.y = p.bodyY - 30 - it.h;
      }
      it.release(gentle ? 0 : drag.vx * 0.8, gentle ? 0 : drag.vy * 0.8, gentle);
      W.itemGrid.insert(it);
      if (gentle) {
        scene.activeItems.add(it);
        RC.Audio.play('place', { vol: 0.35 });
      } else {
        p.anim.throwT = 0.3;
        RC.Audio.play('throwIt', { vol: 0.5 });
        scene.onThrow(it);
      }
    },

    setCursor(c) {
      const cv = RC.Game.canvas;
      if (cv && cv.style.cursor !== c) cv.style.cursor = c;
    },

    /** Dünya katmanı: vurgulama, sürüklenen eşya ve kol ipi */
    drawWorld(ctx, scene, t) {
      const p = scene.player;
      const drag = scene.drag;
      // Vurgu tek yerden çizilir (Heist.drawWorldLabels: grabCandidate = hover)
      if (!drag) return;
      const it = drag.item;
      const hand = p.handPos;
      const col = drag.strain > 0.95 ? '#ff8c2e' : 'rgba(230,232,238,0.7)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hand.x, hand.y);
      const midX = (hand.x + it.cx) / 2;
      const midY = (hand.y + it.cy) / 2 + it.kg * 3;
      ctx.quadraticCurveTo(midX, midY, it.cx, it.y);
      ctx.stroke();
      it.drawAt(ctx, it.cx, it.cy, 1, it.angle);
      D.text(ctx, it.kg.toFixed(it.kg < 1 ? 2 : 1) + ' kg · ' + U.formatMoney(it.value), it.cx, it.y - 10, { size: 12, align: 'center', weight: 'bold', color: C.COLORS.gold, stroke: 'rgba(0,0,0,0.8)', strokeW: 4 });
    },
  };

  RC.DragLoot = DragLoot;
})(window.RC);
