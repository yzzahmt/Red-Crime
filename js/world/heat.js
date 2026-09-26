/* =========================================================================
 *  RED CRIME - Gerilim (heat) durum makinesi
 *  Sessiz Sızma -> Şüphe -> Alarm -> Taktik Müdahale
 *
 *  Sahnenin mevcut sinyallerini (tehlike seviyesi, alarm, polis, kalan süre)
 *  okur, tek yönlü ilerleyen bir aşama üretir ve aşamaya göre çarpanları
 *  scene.heatFx üzerinden yayınlar. Varlıklar bu modülü bilmez; yalnızca
 *  çarpanları okur (Resident.diff, Security kamera taraması).
 *
 *  Kurallar:
 *   - Şüphe, sakin kalınırsa Sessiz'e geri düşebilir (histerezis ile).
 *   - Alarm ve Taktik Müdahale geri dönmez.
 *   - Süre azaldıkça (%35 ve %15 eşikleri) aşama kendiliğinden yükselir.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const L = (s, v) => RC.L(s, v);

  const STAGES = [
    { id: 'quiet', name: 'SESSİZ SIZMA', color: '#3ddc84', fx: { hearing: 1, sight: 1, speed: 1, cam: 1 } },
    { id: 'suspicion', name: 'ŞÜPHE', color: '#ffc83d', fx: { hearing: 1.15, sight: 1.1, speed: 1, cam: 1.25 } },
    { id: 'alarm', name: 'ALARM', color: '#ff8c2e', fx: { hearing: 1.3, sight: 1.2, speed: 1.1, cam: 1.5 } },
    { id: 'tactical', name: 'TAKTİK MÜDAHALE', color: '#ff3043', fx: { hearing: 1.45, sight: 1.35, speed: 1.2, cam: 1.8 } },
  ];
  const QUIET = 0;
  const SUSPICION = 1;
  const ALARM = 2;
  const TACTICAL = 3;

  const SUSPICION_DANGER = 0.35; // bu tehlike seviyesinin üstü şüphe
  const CALM_DANGER = 0.15; // bunun altında geçen süre sakinleşme sayılır
  const CALM_TIME = 12; // Şüphe -> Sessiz için gereken sakin süre (sn)
  const CLOCK_SUSPICION = 0.35; // kalan süre oranı: bu eşiğin altı en az Şüphe
  const CLOCK_TACTICAL = 0.15; // alarm varken bu eşiğin altı Taktik
  const POLICE_TACTICAL = 25; // polise bu kadar sn kala Taktik
  const SWEEP_EVERY = [0, 0, 14, 8]; // aşamaya göre devriye taraması aralığı (sn)

  class Heat {
    constructor(scene) {
      this.scene = scene;
      this.stage = QUIET;
      this.calmT = 0;
      this.sweepT = 0;
      this.flash = 0;
      this.lastNoise = null;
      this.silentAlarm = false;
      this.publish();
    }

    get info() {
      return STAGES[this.stage];
    }

    /** Sahne çarpanlarını zorluk ayarıyla birleştirip yayınlar. */
    publish() {
      const s = this.scene;
      const fx = STAGES[this.stage].fx;
      const d = s.diff;
      s.heatFx = fx;
      s.diffEff = { name: d.name, hearing: d.hearing * fx.hearing, sight: d.sight * fx.sight, speed: d.speed * fx.speed, time: d.time, decay: d.decay / fx.hearing };
    }

    /** Oyuncunun duyulabilir son gürültüsü: devriye taramasının hedefi. */
    noteNoise(x, y, loud) {
      if (loud >= 0.3) this.lastNoise = { x, y };
    }

    update(dt) {
      const s = this.scene;
      this.flash = Math.max(0, this.flash - dt);
      const timeFrac = s.totalTime > 0 ? s.timeLeft / s.totalTime : 1;
      let target = this.stage;

      if (s.alarm || s.policeCalled || this.silentAlarm) target = Math.max(target, ALARM);
      if (target >= ALARM && ((s.policeCalled && s.policeT <= POLICE_TACTICAL) || timeFrac <= CLOCK_TACTICAL)) target = TACTICAL;

      if (target < ALARM) {
        const hot = s.dangerLevel > SUSPICION_DANGER || timeFrac <= CLOCK_SUSPICION;
        if (hot) {
          target = SUSPICION;
          this.calmT = 0;
        } else if (this.stage === SUSPICION) {
          this.calmT = s.dangerLevel < CALM_DANGER ? this.calmT + dt : 0;
          if (this.calmT >= CALM_TIME) target = QUIET;
        }
      }
      if (target !== this.stage) this.enterStage(target);

      // Alarm ve üstünde bekçiler düzenli aralıklarla son gürültüyü tarar
      const every = SWEEP_EVERY[this.stage];
      if (every > 0) {
        this.sweepT -= dt;
        if (this.sweepT <= 0) {
          this.sweepT = every;
          this.sweep();
        }
      }
    }

    enterStage(next) {
      const s = this.scene;
      const up = next > this.stage;
      this.stage = next;
      this.calmT = 0;
      this.flash = 1;
      this.publish();
      const info = STAGES[next];
      if (up) {
        s.toast(L('Durum: {s}', { s: L(info.name) }), info.color);
        if (next >= SUSPICION) RC.Audio.play('beep', { vol: 0.5, pitch: 0.7 + next * 0.15 });
        if (next === SUSPICION) this.sweep();
        if (next === TACTICAL) s.camera.shake(0.25);
      } else {
        s.toast(L('Ortam sakinleşti. {s}', { s: L(info.name) }), info.color);
      }
    }

    /** Uyanık bekçileri oyuncunun son gürültüsüne (yoksa bulunduğu kata) yollar. */
    sweep() {
      const s = this.scene;
      const p = s.player;
      if (!p) return;
      const target = this.lastNoise || { x: p.cx, y: p.bottom - 4 };
      const k = s.floorOf(target.y);
      let sent = 0;
      for (const r of s.residents) {
        if (!r.isGuard || !r.awake || r.state === 'chase' || r.state === 'knocked' || r.decoyT > 0) continue;
        r.investigate(target.x + U.rand(-120, 120), k);
        sent++;
      }
      this.lastNoise = null;
      return sent;
    }

    /**
     * İzlenen bir güvenlik sistemi ilk ihlalde sessiz alarm verir: ev uyanmaz,
     * siren çalmaz ama polis yola çıkar. Dönüş true ise olay tüketilmiştir.
     */
    trySilentAlarm(reason) {
      const s = this.scene;
      if (this.silentAlarm || s.alarm || s.policeCalled || this.stage >= ALARM || !s.world.panel) return false;
      this.silentAlarm = true;
      s.stats.silentAlarms = (s.stats.silentAlarms || 0) + 1;
      s.callPolice(null, 90, true);
      s.toast(reason + ' ' + L('SESSİZ ALARM: güvenlik şirketi polisi aradı.'), '#ff8c2e');
      RC.Audio.play('beep', { vol: 0.35, pitch: 0.6 });
      this.enterStage(ALARM);
      return true;
    }
  }

  Heat.STAGES = STAGES;
  RC.Heat = Heat;
})(window.RC);
