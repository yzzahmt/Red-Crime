/* =========================================================================
 *  RED CRIME - Soygun efektleri ve ödül anları
 *   Kombo      : eşyaları art arda (4 sn içinde) almak serinin çarpanını büyütür,
 *                her eşyanın değerine %5 artan (en fazla %50) bonus ekler
 *   Nadir      : epik / efsanevi ganimette kısa yavaş çekim, renkli flaş, yazı
 *   Görüldün   : sakin seni fark ettiğinde yavaş çekim, kırmızı flaş, gerilim sesi
 *  update() oyunun zaman ölçeğini döndürür (yavaş çekim için).
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;

  const COMBO_WINDOW = 4;
  const COMBO_STEP = 0.05;
  const COMBO_MAX = 1.5;

  /** Yüzde bonus metni: Türkçede "+%15", İngilizcede "+15%" */
  function pct(mul) {
    const p = Math.round((mul - 1) * 100);
    return RC.I18N.lang === 'en' ? '+' + p + '%' : '+%' + p;
  }

  const HeistFX = {
    init(scene) {
      scene.fx = {
        combo: 0,
        comboT: 0,
        best: 0,
        pulse: 0,
        bonus: 0,
        slowT: 0,
        slowDur: 0,
        slowMin: 1,
        flashA: 0,
        flashCol: '#ffffff',
        banner: null,
        spottedCool: 0,
      };
    },

    /** Kısa yavaş çekim: dur saniye boyunca zaman ölçeği min'den 1'e döner */
    slow(scene, dur, min) {
      const f = scene.fx;
      if (RC.Save.settings.shake === false) min = Math.max(min, 0.6);
      // Üst üste binen anlar: en derin yavaşlama ve en uzun süre geçerli
      f.slowMin = f.slowT > 0 ? Math.min(f.slowMin, min) : min;
      f.slowT = Math.max(f.slowT, dur);
      f.slowDur = Math.max(f.slowT, dur);
    },

    flash(scene, color, a) {
      scene.fx.flashCol = color;
      scene.fx.flashA = Math.max(scene.fx.flashA, a);
    },

    banner(scene, text, color, sub) {
      scene.fx.banner = { text, color, sub, t: 0, life: 1.6 };
    },

    /** Eşya ele / çuvala geçti (her eşya bir kez sayılır) */
    onLoot(scene, it) {
      const f = scene.fx;
      if (!f || it.looted || it.isKey) return;
      it.looted = true;
      f.combo = f.comboT > 0 ? f.combo + 1 : 1;
      f.comboT = COMBO_WINDOW;
      f.best = Math.max(f.best, f.combo);
      f.pulse = 1;
      if (f.combo >= 2) {
        const mul = Math.min(COMBO_MAX, 1 + COMBO_STEP * (f.combo - 1));
        const bonus = Math.round((it.value * (mul - 1)) / 10) * 10;
        if (bonus > 0) {
          it.value += bonus;
          f.bonus += bonus;
          scene.particles.text(it.cx, it.y - 26, RC.L('KOMBO x{n}', { n: f.combo }) + ' ' + pct(mul), { color: '#ffc83d', size: 14, life: 1 });
        }
        RC.Audio.play('tick', { vol: 0.5, pitch: 1 + Math.min(f.combo, 12) * 0.08, minGap: 0 });
      }
      // Nadir ganimet anı
      const ri = it.rarityIndex;
      if (ri >= 2) {
        const col = it.rarity.color;
        const legendary = ri >= 3;
        this.slow(scene, legendary ? 0.9 : 0.55, legendary ? 0.2 : 0.35);
        this.flash(scene, col, legendary ? 0.35 : 0.22);
        scene.camera.punch(legendary ? 0.1 : 0.06);
        scene.particles.sparks(it.cx, it.cy, legendary ? 60 : 32, col, legendary ? 420 : 300);
        if (legendary) scene.particles.confetti(it.cx, it.cy - 40, 40, 260);
        this.banner(scene, legendary ? RC.L('EFSANEVİ!') : RC.L('EPİK!'), col, it.name + ' · ' + U.formatMoney(it.value));
        RC.Audio.play('star', { pitch: legendary ? 1.3 : 1.1 });
        RC.Audio.play('bigcash', { vol: 0.6 });
      }
    },

    /** Bir sakin / bekçi seni fark etti */
    onSpotted(scene) {
      const f = scene.fx;
      if (!f || f.spottedCool > 0) return;
      f.spottedCool = 3;
      this.slow(scene, 0.5, 0.25);
      this.flash(scene, '#ff1a2e', 0.35);
      scene.camera.punch(0.1);
      scene.camera.shake(0.25);
      this.banner(scene, RC.L('GÖRÜLDÜN!'), '#ff3043', RC.L('Kaç ya da saklan!'));
      RC.Audio.play('sting', { vol: 1 });
    },

    /** Gerçek zamanla ilerler; oyun için zaman ölçeğini döndürür */
    update(scene, rawDt) {
      const f = scene.fx;
      if (!f) return 1;
      if (f.comboT > 0) {
        f.comboT -= rawDt;
        if (f.comboT <= 0) f.combo = 0;
      }
      if (f.spottedCool > 0) f.spottedCool -= rawDt;
      f.pulse = Math.max(0, f.pulse - rawDt * 3);
      f.flashA = Math.max(0, f.flashA - rawDt * 1.6);
      if (f.banner) {
        f.banner.t += rawDt;
        if (f.banner.t > f.banner.life) f.banner = null;
      }
      if (f.slowT > 0) {
        f.slowT -= rawDt;
        const k = Math.max(0, f.slowT / f.slowDur);
        if (f.slowT <= 0) f.slowMin = 1;
        return U.lerp(1, f.slowMin, Math.sqrt(k));
      }
      return 1;
    },

    /** Ekran efektleri: flaş (HUD'dan önce) */
    renderFlash(ctx, scene, w, h) {
      const f = scene.fx;
      if (!f || f.flashA <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = f.flashA;
      ctx.fillStyle = f.flashCol;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      D.vignette(ctx, w, h, f.flashA * 1.4, f.flashCol);
    },

    /** Kombo göstergesi ve büyük yazılar (HUD'un üstünde) */
    renderOverlay(ctx, scene, w, h) {
      const f = scene.fx;
      if (!f) return;
      if (f.combo >= 2) {
        const k = f.comboT / COMBO_WINDOW;
        const mul = Math.min(COMBO_MAX, 1 + COMBO_STEP * (f.combo - 1));
        const cx = w / 2;
        const y = 112; // kamyon panelinin altı; kombo varken uyarılar aşağı kayar (heist.render)
        const s = 1 + f.pulse * 0.25;
        ctx.save();
        ctx.translate(cx, y);
        ctx.scale(s, s);
        const col = f.combo >= 8 ? '#ff3043' : f.combo >= 5 ? '#ff8c2e' : '#ffc83d';
        D.text(ctx, RC.L('KOMBO x{n}', { n: f.combo }), 0, 0, { size: 26, font: C.FONT_TITLE, align: 'center', color: col, stroke: 'rgba(0,0,0,0.85)', strokeW: 5 });
        D.text(ctx, pct(mul), 0, 18, { size: 13, align: 'center', color: '#f2f4ff', weight: 'bold', stroke: 'rgba(0,0,0,0.85)', strokeW: 3 });
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(cx - 60, y + 26, 120, 4);
        ctx.fillStyle = col;
        ctx.fillRect(cx - 60, y + 26, 120 * k, 4);
      }
      const b = f.banner;
      if (b) {
        const t = b.t;
        const inK = U.ease.outBack(Math.min(1, t / 0.25));
        const a = t < b.life - 0.35 ? 1 : Math.max(0, (b.life - t) / 0.35);
        const y = h * 0.34;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, y - 44, w, b.sub ? 92 : 70);
        ctx.fillStyle = b.color;
        ctx.fillRect(0, y - 44, w * Math.min(1, t / 0.3), 2);
        ctx.translate(w / 2, y);
        ctx.scale(0.6 + inK * 0.4, 0.6 + inK * 0.4);
        D.text(ctx, b.text, 0, 8, { size: 56, font: C.FONT_TITLE, align: 'center', color: b.color, stroke: '#000', strokeW: 6 });
        ctx.restore();
        if (b.sub) {
          ctx.globalAlpha = a;
          D.text(ctx, b.sub, w / 2, y + 38, { size: 16, align: 'center', color: '#f2f4ff', weight: 'bold' });
          ctx.globalAlpha = 1;
        }
      }
    },
  };

  RC.HeistFX = HeistFX;
})(window.RC);
