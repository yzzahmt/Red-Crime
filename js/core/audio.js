/* =========================================================================
 *  RED CRIME - Ses motoru
 *  Tüm sesler Web Audio API ile gerçek zamanlı sentezlenir; harici dosya yok.
 *  - Efektler (ayak sesi, kırılma, kasa, köpek havlaması...)
 *  - Konumsal ses (dinleyiciye uzaklık + stereo pan)
 *  - Prosedürel müzik sıralayıcı (menü, köprü, soygun, alarm, sonuç...)
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------------------------------------------------------------
   * Müzik parçaları. Her parça 16 adımlık desenlerden oluşur.
   * Nota değerleri MIDI numarasıdır; null = sus.
   * ------------------------------------------------------------------- */
  const TRACKS = {
    menu: {
      bpm: 92,
      swing: 0.04,
      bars: [
        { chord: [57, 60, 64], bass: 45 },
        { chord: [53, 57, 60], bass: 41 },
        { chord: [55, 59, 62], bass: 43 },
        { chord: [52, 56, 59], bass: 40 },
      ],
      bassPattern: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
      arp: [0, 2, 1, 2, 0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1],
      arpOct: 12,
      arpVol: 0.05,
      padVol: 0.035,
      bassVol: 0.13,
      lead: [
        [76, null, null, 74, null, 72, null, null, 71, null, 72, null, 74, null, null, null],
        [72, null, null, null, 69, null, null, null, 72, null, 74, null, 76, null, 77, null],
        [74, null, null, 71, null, 67, null, null, 71, null, 74, null, 79, null, null, null],
        [76, null, 75, null, 76, null, null, null, 71, null, null, null, null, null, null, null],
      ],
      leadVol: 0.045,
      leadType: 'triangle',
    },
    bridge: {
      bpm: 78,
      swing: 0.12,
      bars: [
        { chord: [50, 53, 57, 60], bass: 38 },
        { chord: [48, 52, 55, 59], bass: 36 },
        { chord: [46, 50, 53, 57], bass: 34 },
        { chord: [45, 49, 52, 55], bass: 33 },
      ],
      bassPattern: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      kick: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      arp: null,
      padVol: 0.05,
      bassVol: 0.14,
      lead: null,
      vinyl: true,
    },
    heist: {
      bpm: 104,
      swing: 0.0,
      bars: [
        { chord: [45, 48, 52], bass: 33 },
        { chord: [45, 48, 52], bass: 33 },
        { chord: [44, 47, 50], bass: 32 },
        { chord: [46, 50, 53], bass: 34 },
      ],
      bassPattern: [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
      bassPizz: true,
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      arp: [0, null, null, 1, null, null, 2, null, 1, null, null, 0, null, 2, null, null],
      arpOct: 24,
      arpVol: 0.03,
      padVol: 0.02,
      bassVol: 0.12,
      lead: null,
    },
    alert: {
      bpm: 150,
      swing: 0,
      bars: [
        { chord: [45, 48, 52], bass: 33 },
        { chord: [46, 49, 53], bass: 34 },
        { chord: [45, 48, 52], bass: 33 },
        { chord: [44, 47, 51], bass: 32 },
      ],
      bassPattern: [1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      arp: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 2],
      arpOct: 12,
      arpVol: 0.045,
      padVol: 0.03,
      bassVol: 0.14,
      lead: [
        [81, null, 80, null, 81, null, 84, null, 81, null, 80, null, 77, null, 76, null],
        [82, null, 81, null, 82, null, 85, null, 82, null, 81, null, 77, null, null, null],
        [81, null, 80, null, 81, null, 84, null, 88, null, 86, null, 84, null, 83, null],
        [80, null, null, null, 76, null, null, null, 80, null, 83, null, 86, null, null, null],
      ],
      leadVol: 0.035,
      leadType: 'square',
    },
    results: {
      bpm: 116,
      swing: 0.06,
      bars: [
        { chord: [60, 64, 67, 71], bass: 48 },
        { chord: [57, 60, 64, 67], bass: 45 },
        { chord: [53, 57, 60, 64], bass: 41 },
        { chord: [55, 59, 62, 65], bass: 43 },
      ],
      bassPattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
      arpOct: 12,
      arpVol: 0.04,
      padVol: 0.03,
      bassVol: 0.12,
      lead: null,
    },
    busted: {
      bpm: 70,
      swing: 0,
      bars: [
        { chord: [45, 48, 52], bass: 33 },
        { chord: [41, 45, 48], bass: 29 },
        { chord: [43, 46, 50], bass: 31 },
        { chord: [40, 44, 47], bass: 28 },
      ],
      bassPattern: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      hat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      arp: null,
      padVol: 0.06,
      bassVol: 0.14,
      lead: [
        [69, null, null, null, 67, null, null, null, 65, null, null, null, 64, null, null, null],
        [65, null, null, null, 64, null, null, null, 62, null, null, null, 60, null, null, null],
        [62, null, null, null, 64, null, null, null, 65, null, null, null, 67, null, null, null],
        [64, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      ],
      leadVol: 0.05,
      leadType: 'sine',
    },
  };

  const Audio = {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    comp: null,
    noiseBuf: null,
    unlocked: false,
    listener: { x: 0, y: 0 },
    hearRange: 1400,
    volumes: { master: 0.8, music: 0.6, sfx: 0.9 },
    musicState: { track: null, name: null, step: 0, bar: 0, nextTime: 0, timer: null, fade: 1 },
    loops: {},
    lastPlay: {},

    unlock() {
      if (this.unlocked) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.comp = this.ctx.createDynamicsCompressor();
        this.comp.threshold.value = -14;
        this.comp.ratio.value = 4;
        this.master = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        this.master.connect(this.comp);
        this.comp.connect(this.ctx.destination);
        this.noiseBuf = this._makeNoise(2);
        this.unlocked = true;
        this.applyVolumes();
        if (this._pendingMusic) {
          const n = this._pendingMusic;
          this._pendingMusic = null;
          this.playMusic(n);
        }
      } catch (e) {
        console.warn('Ses başlatılamadı', e);
      }
    },

    setVolumes(v) {
      Object.assign(this.volumes, v);
      this.applyVolumes();
    },
    applyVolumes() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
      this.musicGain.gain.setTargetAtTime(this.volumes.music * this.musicState.fade, t, 0.05);
      this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    },

    _makeNoise(sec) {
      const len = Math.floor(this.ctx.sampleRate * sec);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    },

    /* ---------------- Düşük seviye yapı taşları ------------------------ */

    _out(dest, pan) {
      const target = dest || this.sfxGain;
      if (pan && this.ctx.createStereoPanner) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = U.clamp(pan, -1, 1);
        p.connect(target);
        return p;
      }
      return target;
    },

    tone(o) {
      if (!this.ctx) return;
      const c = this.ctx;
      const t0 = c.currentTime + (o.delay || 0);
      const dur = o.dur || 0.2;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(1, o.freq || 440), t0);
      if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + dur);
      if (o.detune) osc.detune.value = o.detune;
      const vol = o.vol == null ? 0.2 : o.vol;
      const a = o.attack == null ? 0.005 : o.attack;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let node = osc;
      if (o.filter) {
        const f = c.createBiquadFilter();
        f.type = o.filter;
        f.frequency.value = o.filterFreq || 1200;
        f.Q.value = o.q || 1;
        node.connect(f);
        node = f;
      }
      node.connect(g);
      g.connect(this._out(o.dest, o.pan));
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
      return osc;
    },

    noise(o) {
      if (!this.ctx) return;
      const c = this.ctx;
      const t0 = c.currentTime + (o.delay || 0);
      const dur = o.dur || 0.2;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = o.filter || 'lowpass';
      f.frequency.setValueAtTime(o.freq || 1000, t0);
      if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(10, o.freqEnd), t0 + dur);
      f.Q.value = o.q || 0.8;
      const g = c.createGain();
      const vol = o.vol == null ? 0.2 : o.vol;
      const a = o.attack == null ? 0.003 : o.attack;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this._out(o.dest, o.pan));
      src.start(t0, Math.random() * 1.5);
      src.stop(t0 + dur + 0.05);
    },

    /** Konumsal ses için ses seviyesi ve pan değeri hesaplar. */
    spatial(x, y) {
      if (x == null) return { vol: 1, pan: 0 };
      const dx = x - this.listener.x;
      const dy = y - this.listener.y;
      const d = Math.hypot(dx, dy * 1.3);
      const vol = U.clamp(1 - d / this.hearRange, 0, 1);
      return { vol: vol * vol, pan: U.clamp(dx / 700, -0.9, 0.9) };
    },

    /* ---------------- Yüksek seviye efektler --------------------------- */

    play(name, opts = {}) {
      if (!this.ctx || !this.unlocked) return;
      const now = this.ctx.currentTime;
      // Aynı efektin aynı anda aşırı üst üste binmesini engelle
      const minGap = opts.minGap == null ? 0.025 : opts.minGap;
      if (this.lastPlay[name] && now - this.lastPlay[name] < minGap) return;
      this.lastPlay[name] = now;

      const sp = this.spatial(opts.x, opts.y);
      const v = (opts.vol == null ? 1 : opts.vol) * sp.vol;
      if (v < 0.005) return;
      const pan = sp.pan;
      const p = opts.pitch || 1;
      const fn = SFX[name];
      if (fn) fn(this, v, pan, p, opts);
    },

    /* ---------------- Sürekli (loop) sesler ---------------------------- */

    startLoop(name, build) {
      if (!this.ctx || this.loops[name]) return;
      this.loops[name] = build(this);
    },
    setLoop(name, params) {
      const l = this.loops[name];
      if (l && l.set) l.set(params);
    },
    stopLoop(name, fade = 0.4) {
      const l = this.loops[name];
      if (!l) return;
      delete this.loops[name];
      try {
        const t = this.ctx.currentTime;
        l.gain.gain.cancelScheduledValues(t);
        l.gain.gain.setTargetAtTime(0.0001, t, fade / 4);
        setTimeout(() => {
          try {
            l.nodes.forEach((n) => n.stop && n.stop());
          } catch (e) {
            /* yoksay */
          }
        }, fade * 1000 + 100);
      } catch (e) {
        /* yoksay */
      }
    },
    stopAllLoops() {
      for (const k of Object.keys(this.loops)) this.stopLoop(k, 0.2);
    },

    engineLoop() {
      this.startLoop('engine', (A) => {
        const c = A.ctx;
        const o1 = c.createOscillator();
        const o2 = c.createOscillator();
        o1.type = 'sawtooth';
        o2.type = 'square';
        o1.frequency.value = 42;
        o2.frequency.value = 21;
        const lfo = c.createOscillator();
        const lfoG = c.createGain();
        lfo.frequency.value = 9;
        lfoG.gain.value = 6;
        lfo.connect(lfoG);
        lfoG.connect(o1.frequency);
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 280;
        const g = c.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.09, c.currentTime, 0.2);
        o1.connect(f);
        o2.connect(f);
        f.connect(g);
        g.connect(A.sfxGain);
        o1.start();
        o2.start();
        lfo.start();
        return {
          gain: g,
          nodes: [o1, o2, lfo],
          set(pr) {
            const t = c.currentTime;
            if (pr.rpm != null) {
              o1.frequency.setTargetAtTime(38 + pr.rpm * 50, t, 0.1);
              o2.frequency.setTargetAtTime(19 + pr.rpm * 25, t, 0.1);
              f.frequency.setTargetAtTime(240 + pr.rpm * 500, t, 0.1);
            }
            if (pr.vol != null) g.gain.setTargetAtTime(Math.max(0.0001, pr.vol * 0.1), t, 0.1);
          },
        };
      });
    },

    /** Helikopter rotoru: alçak geçiren gürültü, ~13 Hz'de genlik modülasyonu (pat-pat-pat) */
    heliLoop() {
      this.startLoop('heli', (A) => {
        const c = A.ctx;
        const src = c.createBufferSource();
        src.buffer = A.noiseBuf;
        src.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 380;
        const am = c.createGain();
        am.gain.value = 0.5;
        const lfo = c.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 13;
        const lfoG = c.createGain();
        lfoG.gain.value = 0.45;
        lfo.connect(lfoG);
        lfoG.connect(am.gain);
        const hum = c.createOscillator();
        hum.type = 'sawtooth';
        hum.frequency.value = 52;
        const humG = c.createGain();
        humG.gain.value = 0.15;
        hum.connect(humG);
        humG.connect(f);
        const g = c.createGain();
        g.gain.value = 0.0001;
        src.connect(f);
        f.connect(am);
        am.connect(g);
        g.connect(A.sfxGain);
        src.start();
        lfo.start();
        hum.start();
        return {
          gain: g,
          nodes: [src, lfo, hum],
          set(pr) {
            if (pr.vol != null) g.gain.setTargetAtTime(Math.max(0.0001, pr.vol * 0.4), c.currentTime, 0.25);
          },
        };
      });
    },

    rainLoop() {
      this.startLoop('rain', (A) => {
        const c = A.ctx;
        const src = c.createBufferSource();
        src.buffer = A.noiseBuf;
        src.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 2400;
        f.Q.value = 0.4;
        const f2 = c.createBiquadFilter();
        f2.type = 'lowpass';
        f2.frequency.value = 6000;
        const g = c.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.05, c.currentTime, 0.8);
        src.connect(f);
        f.connect(f2);
        f2.connect(g);
        g.connect(A.sfxGain);
        src.start();
        return {
          gain: g,
          nodes: [src],
          set(pr) {
            if (pr.vol != null) g.gain.setTargetAtTime(Math.max(0.0001, pr.vol * 0.05), c.currentTime, 0.3);
          },
        };
      });
    },

    fireLoop() {
      this.startLoop('fire', (A) => {
        const c = A.ctx;
        const src = c.createBufferSource();
        src.buffer = A.noiseBuf;
        src.loop = true;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 700;
        const g = c.createGain();
        g.gain.value = 0.0001;
        g.gain.setTargetAtTime(0.03, c.currentTime, 0.5);
        const lfo = c.createOscillator();
        const lfoG = c.createGain();
        lfo.frequency.value = 3.3;
        lfoG.gain.value = 0.015;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        src.connect(f);
        f.connect(g);
        g.connect(A.sfxGain);
        src.start();
        lfo.start();
        return {
          gain: g,
          nodes: [src, lfo],
          set(pr) {
            if (pr.vol != null) g.gain.setTargetAtTime(Math.max(0.0001, pr.vol * 0.03), c.currentTime, 0.2);
          },
        };
      });
    },

    /* ---------------- Müzik sıralayıcı -------------------------------- */

    playMusic(name) {
      if (!this.ctx) {
        this._pendingMusic = name;
        return;
      }
      const ms = this.musicState;
      if (ms.name === name) return;
      ms.name = name;
      ms.track = TRACKS[name] || null;
      ms.step = 0;
      ms.bar = 0;
      ms.nextTime = this.ctx.currentTime + 0.1;
      // Geçişte hafif fade
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(0.0001, t);
      this.musicGain.gain.linearRampToValueAtTime(this.volumes.music * ms.fade, t + 1.2);
      if (!ms.timer) {
        ms.timer = setInterval(() => this._schedule(), 25);
      }
    },
    stopMusic() {
      const ms = this.musicState;
      ms.name = null;
      ms.track = null;
    },
    /** Müziği anlık olarak kısmak için (ör. diyaloglarda) 0..1 */
    setMusicDuck(f) {
      this.musicState.fade = f;
      this.applyVolumes();
    },

    _schedule() {
      const ms = this.musicState;
      if (!this.ctx || !ms.track) return;
      const tr = ms.track;
      const stepDur = 60 / tr.bpm / 4;
      while (ms.nextTime < this.ctx.currentTime + 0.12) {
        const swing = ms.step % 2 === 1 ? tr.swing * stepDur : 0;
        this._playStep(tr, ms.step, ms.bar, ms.nextTime + swing, stepDur);
        ms.step++;
        if (ms.step >= 16) {
          ms.step = 0;
          ms.bar = (ms.bar + 1) % tr.bars.length;
        }
        ms.nextTime += stepDur;
      }
    },

    _playStep(tr, step, barIdx, t, stepDur) {
      const c = this.ctx;
      const bar = tr.bars[barIdx];
      const dest = this.musicGain;
      const delay = Math.max(0, t - c.currentTime);

      // Pad akoru (bar başında)
      if (step === 0 && tr.padVol) {
        for (const n of bar.chord) {
          this.tone({
            type: 'sawtooth',
            freq: mtof(n),
            dur: stepDur * 16,
            vol: tr.padVol / bar.chord.length,
            attack: 0.6,
            delay,
            filter: 'lowpass',
            filterFreq: 900,
            dest,
            detune: U.rand(-8, 8),
          });
        }
      }
      // Bas
      if (tr.bassPattern && tr.bassPattern[step]) {
        const oct = step % 8 === 6 && tr.bassPizz ? 12 : 0;
        this.tone({
          type: tr.bassPizz ? 'triangle' : 'sawtooth',
          freq: mtof(bar.bass + oct),
          dur: tr.bassPizz ? stepDur * 1.2 : stepDur * 1.8,
          vol: tr.bassVol,
          delay,
          filter: 'lowpass',
          filterFreq: tr.bassPizz ? 700 : 420,
          dest,
        });
      }
      // Arpej
      if (tr.arp && tr.arp[step] != null) {
        const idx = tr.arp[step] % bar.chord.length;
        this.tone({
          type: 'square',
          freq: mtof(bar.chord[idx] + (tr.arpOct || 12)),
          dur: stepDur * 0.9,
          vol: tr.arpVol,
          delay,
          filter: 'lowpass',
          filterFreq: 2200,
          dest,
        });
      }
      // Melodi
      if (tr.lead) {
        const ln = tr.lead[barIdx % tr.lead.length][step];
        if (ln != null) {
          this.tone({
            type: tr.leadType || 'triangle',
            freq: mtof(ln),
            dur: stepDur * 3,
            vol: tr.leadVol,
            delay,
            attack: 0.02,
            filter: 'lowpass',
            filterFreq: 3000,
            dest,
          });
        }
      }
      // Davul
      if (tr.kick && tr.kick[step]) {
        this.tone({ type: 'sine', freq: 140, freqEnd: 40, dur: 0.25, vol: 0.32, delay, dest });
      }
      if (tr.snare && tr.snare[step]) {
        this.noise({ filter: 'highpass', freq: 1500, dur: 0.16, vol: 0.12, delay, dest });
        this.tone({ type: 'triangle', freq: 220, freqEnd: 120, dur: 0.08, vol: 0.08, delay, dest });
      }
      if (tr.hat && tr.hat[step]) {
        this.noise({ filter: 'highpass', freq: 8000, dur: 0.04, vol: 0.05, delay, dest });
      }
      if (tr.vinyl && Math.random() < 0.3) {
        this.noise({ filter: 'bandpass', freq: 3000 + Math.random() * 3000, q: 8, dur: 0.01, vol: 0.05, delay, dest });
      }
    },
  };

  /* ---------------------------------------------------------------------
   * Efekt tarifleri: (A, vol, pan, pitch, opts)
   * ------------------------------------------------------------------- */
  const SFX = {
    step(A, v, pan, p, o) {
      const heavy = o.heavy || 0;
      A.noise({ filter: 'lowpass', freq: (500 + Math.random() * 300) * p, dur: 0.07 + heavy * 0.05, vol: 0.14 * v, pan });
      A.tone({ type: 'sine', freq: (90 - heavy * 20) * p, freqEnd: 50, dur: 0.07, vol: 0.12 * v, pan });
    },
    creak(A, v, pan, p) {
      const f = 180 + Math.random() * 120;
      A.tone({ type: 'sawtooth', freq: f * p, freqEnd: f * 1.4 * p, dur: 0.35, vol: 0.07 * v, pan, filter: 'bandpass', filterFreq: 900, q: 6 });
      A.tone({ type: 'square', freq: f * 0.5 * p, freqEnd: f * 0.7, dur: 0.3, vol: 0.03 * v, pan, filter: 'bandpass', filterFreq: 600, q: 5 });
    },
    jump(A, v, pan, p) {
      A.tone({ type: 'sine', freq: 260 * p, freqEnd: 520 * p, dur: 0.12, vol: 0.08 * v, pan });
      A.noise({ filter: 'bandpass', freq: 1400, dur: 0.06, vol: 0.05 * v, pan });
    },
    land(A, v, pan, p, o) {
      const k = U.clamp(o.intensity == null ? 0.5 : o.intensity, 0, 1.5);
      A.noise({ filter: 'lowpass', freq: 400 + 500 * k, dur: 0.12 + 0.15 * k, vol: (0.15 + 0.25 * k) * v, pan });
      A.tone({ type: 'sine', freq: 110 * p, freqEnd: 40, dur: 0.15 + 0.1 * k, vol: (0.2 + 0.2 * k) * v, pan });
    },
    pickup(A, v, pan, p) {
      A.tone({ type: 'triangle', freq: 520 * p, freqEnd: 780 * p, dur: 0.1, vol: 0.12 * v, pan });
      A.noise({ filter: 'highpass', freq: 3000, dur: 0.04, vol: 0.04 * v, pan });
    },
    bag(A, v, pan, p) {
      A.noise({ filter: 'bandpass', freq: 1800 * p, q: 2, dur: 0.18, vol: 0.12 * v, pan, attack: 0.03 });
      A.tone({ type: 'sine', freq: 880 * p, freqEnd: 1320 * p, dur: 0.08, vol: 0.06 * v, pan, delay: 0.05 });
    },
    place(A, v, pan, p) {
      A.noise({ filter: 'lowpass', freq: 700, dur: 0.06, vol: 0.08 * v, pan });
      A.tone({ type: 'sine', freq: 180 * p, freqEnd: 120, dur: 0.06, vol: 0.06 * v, pan });
    },
    thud(A, v, pan, p, o) {
      const k = U.clamp(o.intensity == null ? 0.6 : o.intensity, 0, 1.5);
      A.tone({ type: 'sine', freq: 120 * p, freqEnd: 35, dur: 0.2 + k * 0.2, vol: (0.25 + 0.3 * k) * v, pan });
      A.noise({ filter: 'lowpass', freq: 600 + k * 800, dur: 0.15 + k * 0.2, vol: (0.2 + 0.25 * k) * v, pan });
    },
    metal(A, v, pan, p, o) {
      const k = U.clamp(o.intensity == null ? 0.6 : o.intensity, 0, 1.5);
      for (let i = 0; i < 3; i++) {
        A.tone({ type: 'square', freq: (600 + i * 370) * p, dur: 0.3 + k * 0.4, vol: 0.05 * v * (1 + k), pan, filter: 'bandpass', filterFreq: 1800 + i * 600, q: 12 });
      }
      A.noise({ filter: 'highpass', freq: 2500, dur: 0.1, vol: 0.12 * v, pan });
    },
    glass(A, v, pan, p, o) {
      const k = U.clamp(o.intensity == null ? 1 : o.intensity, 0.3, 1.5);
      A.noise({ filter: 'highpass', freq: 3000, dur: 0.5 * k, vol: 0.35 * v, pan });
      for (let i = 0; i < 7; i++) {
        A.tone({ type: 'sine', freq: (2000 + Math.random() * 4000) * p, dur: 0.1 + Math.random() * 0.3, vol: 0.06 * v, pan, delay: Math.random() * 0.2 });
      }
      A.noise({ filter: 'lowpass', freq: 900, dur: 0.15, vol: 0.2 * v, pan });
    },
    ceramic(A, v, pan, p) {
      A.noise({ filter: 'bandpass', freq: 2200, q: 1.2, dur: 0.35, vol: 0.35 * v, pan });
      for (let i = 0; i < 5; i++) {
        A.tone({ type: 'triangle', freq: (900 + Math.random() * 1600) * p, dur: 0.08 + Math.random() * 0.15, vol: 0.07 * v, pan, delay: Math.random() * 0.15 });
      }
      A.tone({ type: 'sine', freq: 150, freqEnd: 60, dur: 0.15, vol: 0.2 * v, pan });
    },
    wood(A, v, pan, p) {
      A.tone({ type: 'triangle', freq: 300 * p, freqEnd: 180, dur: 0.12, vol: 0.18 * v, pan });
      A.noise({ filter: 'bandpass', freq: 900, q: 3, dur: 0.1, vol: 0.12 * v, pan });
    },
    soft(A, v, pan) {
      A.noise({ filter: 'lowpass', freq: 400, dur: 0.12, vol: 0.12 * v, pan });
    },
    coin(A, v, pan, p) {
      A.tone({ type: 'square', freq: 988 * p, dur: 0.08, vol: 0.06 * v, pan });
      A.tone({ type: 'square', freq: 1319 * p, dur: 0.25, vol: 0.06 * v, pan, delay: 0.07 });
    },
    cash(A, v, pan, p) {
      A.tone({ type: 'triangle', freq: 1568 * p, dur: 0.1, vol: 0.1 * v, pan });
      A.tone({ type: 'triangle', freq: 2093 * p, dur: 0.35, vol: 0.1 * v, pan, delay: 0.08 });
      A.noise({ filter: 'highpass', freq: 5000, dur: 0.15, vol: 0.05 * v, pan, delay: 0.05 });
    },
    bigcash(A, v, pan, p) {
      [1047, 1319, 1568, 2093].forEach((f, i) => A.tone({ type: 'triangle', freq: f * p, dur: 0.3, vol: 0.09 * v, pan, delay: i * 0.07 }));
    },
    uiHover(A, v) {
      A.tone({ type: 'sine', freq: 880, dur: 0.05, vol: 0.04 * v });
    },
    uiSelect(A, v) {
      A.tone({ type: 'triangle', freq: 660, freqEnd: 990, dur: 0.1, vol: 0.1 * v });
      A.tone({ type: 'sine', freq: 1320, dur: 0.12, vol: 0.05 * v, delay: 0.06 });
    },
    uiBack(A, v) {
      A.tone({ type: 'triangle', freq: 660, freqEnd: 330, dur: 0.12, vol: 0.1 * v });
    },
    uiError(A, v) {
      A.tone({ type: 'square', freq: 180, dur: 0.12, vol: 0.08 * v, filter: 'lowpass', filterFreq: 800 });
      A.tone({ type: 'square', freq: 140, dur: 0.18, vol: 0.08 * v, delay: 0.12, filter: 'lowpass', filterFreq: 800 });
    },
    tick(A, v, pan, p) {
      A.tone({ type: 'square', freq: 1800 * p, dur: 0.02, vol: 0.05 * v, pan, filter: 'highpass', filterFreq: 1200 });
    },
    whoosh(A, v, pan, p) {
      A.noise({ filter: 'bandpass', freq: 400 * p, freqEnd: 2400 * p, q: 1.5, dur: 0.35, vol: 0.18 * v, pan, attack: 0.1 });
    },
    throwIt(A, v, pan, p) {
      A.noise({ filter: 'bandpass', freq: 800 * p, freqEnd: 2000, q: 2, dur: 0.2, vol: 0.12 * v, pan, attack: 0.05 });
    },
    teleport(A, v) {
      A.tone({ type: 'sawtooth', freq: 110, freqEnd: 1760, dur: 1.2, vol: 0.1 * v, attack: 0.4, filter: 'lowpass', filterFreq: 3000 });
      A.tone({ type: 'sine', freq: 220, freqEnd: 3520, dur: 1.4, vol: 0.1 * v, attack: 0.5 });
      A.noise({ filter: 'bandpass', freq: 500, freqEnd: 8000, q: 2, dur: 1.4, vol: 0.12 * v, attack: 0.6 });
    },
    flash(A, v) {
      A.noise({ filter: 'highpass', freq: 1000, dur: 0.8, vol: 0.25 * v });
      A.tone({ type: 'sine', freq: 60, freqEnd: 30, dur: 0.8, vol: 0.3 * v });
    },
    thunder(A, v) {
      A.noise({ filter: 'lowpass', freq: 300, freqEnd: 80, dur: 2.5, vol: 0.5 * v, attack: 0.02 });
      A.noise({ filter: 'lowpass', freq: 1500, freqEnd: 200, dur: 0.6, vol: 0.3 * v });
    },
    lightOn(A, v, pan) {
      A.tone({ type: 'square', freq: 2400, dur: 0.02, vol: 0.08 * v, pan, filter: 'highpass', filterFreq: 1500 });
      A.noise({ filter: 'lowpass', freq: 4000, dur: 0.03, vol: 0.08 * v, pan });
      A.tone({ type: 'sine', freq: 120, dur: 0.6, vol: 0.03 * v, pan, delay: 0.05, attack: 0.1 });
    },
    snore(A, v, pan, p, o) {
      const inhale = o.inhale;
      if (inhale) {
        A.noise({ filter: 'bandpass', freq: 500, q: 3, dur: 0.9, vol: 0.1 * v, pan, attack: 0.5 });
        A.tone({ type: 'sawtooth', freq: 70 * p, freqEnd: 90 * p, dur: 0.9, vol: 0.06 * v, pan, attack: 0.4, filter: 'lowpass', filterFreq: 400 });
      } else {
        A.noise({ filter: 'lowpass', freq: 700, freqEnd: 300, dur: 1.1, vol: 0.06 * v, pan, attack: 0.2 });
      }
    },
    mumble(A, v, pan, p) {
      for (let i = 0; i < 4; i++) {
        A.tone({ type: 'sawtooth', freq: (130 + Math.random() * 60) * p, dur: 0.12, vol: 0.05 * v, pan, delay: i * 0.12, filter: 'lowpass', filterFreq: 700 });
      }
    },
    gasp(A, v, pan, p) {
      A.noise({ filter: 'bandpass', freq: 1200 * p, q: 2, dur: 0.3, vol: 0.18 * v, pan, attack: 0.02 });
      A.tone({ type: 'sawtooth', freq: 300 * p, freqEnd: 520 * p, dur: 0.25, vol: 0.08 * v, pan, filter: 'lowpass', filterFreq: 1400 });
    },
    shout(A, v, pan, p) {
      for (let i = 0; i < 3; i++) {
        A.tone({ type: 'sawtooth', freq: (240 - i * 20) * p, freqEnd: (320 - i * 30) * p, dur: 0.18, vol: 0.1 * v, pan, delay: i * 0.17, filter: 'lowpass', filterFreq: 1800 });
      }
    },
    /** Görüldün: uyumsuz iki ton + alçak vuruş (gerilim) */
    sting(A, v) {
      A.tone({ type: 'sawtooth', freq: 233, freqEnd: 220, dur: 0.9, vol: 0.1 * v, filter: 'lowpass', filterFreq: 1800, attack: 0.01 });
      A.tone({ type: 'sawtooth', freq: 247, freqEnd: 233, dur: 0.9, vol: 0.1 * v, filter: 'lowpass', filterFreq: 1800, attack: 0.01 });
      A.tone({ type: 'square', freq: 466, dur: 0.18, vol: 0.06 * v, filter: 'lowpass', filterFreq: 3000 });
      A.tone({ type: 'sine', freq: 70, freqEnd: 40, dur: 0.7, vol: 0.4 * v });
      A.noise({ filter: 'lowpass', freq: 600, freqEnd: 100, dur: 0.5, vol: 0.25 * v });
    },
    alarm(A, v) {
      for (let i = 0; i < 4; i++) {
        A.tone({ type: 'square', freq: i % 2 ? 880 : 660, dur: 0.22, vol: 0.07 * v, delay: i * 0.22, filter: 'lowpass', filterFreq: 2500 });
      }
    },
    siren(A, v) {
      A.tone({ type: 'sawtooth', freq: 600, freqEnd: 1100, dur: 0.6, vol: 0.06 * v, filter: 'lowpass', filterFreq: 2000 });
      A.tone({ type: 'sawtooth', freq: 1100, freqEnd: 600, dur: 0.6, vol: 0.06 * v, delay: 0.6, filter: 'lowpass', filterFreq: 2000 });
    },
    heartbeat(A, v) {
      A.tone({ type: 'sine', freq: 60, freqEnd: 40, dur: 0.12, vol: 0.35 * v });
      A.tone({ type: 'sine', freq: 55, freqEnd: 35, dur: 0.14, vol: 0.25 * v, delay: 0.18 });
    },
    blip(A, v, pan, p) {
      A.tone({ type: 'square', freq: 520 * p * (0.9 + Math.random() * 0.2), dur: 0.035, vol: 0.035 * v, filter: 'lowpass', filterFreq: 2500 });
    },
    bark(A, v, pan, p) {
      A.noise({ filter: 'bandpass', freq: 800 * p, q: 3, dur: 0.14, vol: 0.35 * v, pan });
      A.tone({ type: 'sawtooth', freq: 380 * p, freqEnd: 220 * p, dur: 0.14, vol: 0.2 * v, pan, filter: 'lowpass', filterFreq: 1500 });
      A.noise({ filter: 'bandpass', freq: 700 * p, q: 3, dur: 0.12, vol: 0.28 * v, pan, delay: 0.2 });
      A.tone({ type: 'sawtooth', freq: 360 * p, freqEnd: 200 * p, dur: 0.12, vol: 0.18 * v, pan, delay: 0.2, filter: 'lowpass', filterFreq: 1500 });
    },
    growl(A, v, pan) {
      A.tone({ type: 'sawtooth', freq: 70, freqEnd: 90, dur: 0.6, vol: 0.1 * v, pan, filter: 'lowpass', filterFreq: 500, attack: 0.1 });
    },
    splash(A, v, pan) {
      A.noise({ filter: 'bandpass', freq: 1200, freqEnd: 400, q: 0.8, dur: 0.6, vol: 0.35 * v, pan });
      A.noise({ filter: 'lowpass', freq: 500, dur: 0.3, vol: 0.2 * v, pan, delay: 0.1 });
    },
    safeClick(A, v, pan, p) {
      A.tone({ type: 'square', freq: 2600 * p, dur: 0.015, vol: 0.08 * v, pan, filter: 'highpass', filterFreq: 1800 });
      A.noise({ filter: 'bandpass', freq: 4000, q: 5, dur: 0.02, vol: 0.05 * v, pan });
    },
    safeGood(A, v, pan) {
      A.tone({ type: 'square', freq: 1200, dur: 0.03, vol: 0.1 * v, pan, filter: 'bandpass', filterFreq: 1500, q: 4 });
      A.tone({ type: 'sine', freq: 880, dur: 0.2, vol: 0.1 * v, pan, delay: 0.04 });
    },
    safeBad(A, v, pan) {
      A.tone({ type: 'square', freq: 90, dur: 0.3, vol: 0.18 * v, pan, filter: 'lowpass', filterFreq: 700 });
      SFX.metal(A, v, pan, 0.7, { intensity: 1 });
    },
    safeOpen(A, v, pan) {
      A.tone({ type: 'sawtooth', freq: 80, freqEnd: 50, dur: 0.8, vol: 0.12 * v, pan, filter: 'lowpass', filterFreq: 500 });
      SFX.creak(A, v, pan, 0.6);
      [784, 988, 1175, 1568].forEach((f, i) => A.tone({ type: 'triangle', freq: f, dur: 0.4, vol: 0.08 * v, pan, delay: 0.5 + i * 0.1 }));
    },
    key(A, v, pan) {
      A.tone({ type: 'triangle', freq: 1760, dur: 0.12, vol: 0.08 * v, pan });
      A.tone({ type: 'triangle', freq: 2349, dur: 0.12, vol: 0.08 * v, pan, delay: 0.08 });
      A.tone({ type: 'triangle', freq: 2637, dur: 0.3, vol: 0.08 * v, pan, delay: 0.16 });
    },
    truckDoor(A, v, pan) {
      A.noise({ filter: 'lowpass', freq: 900, dur: 0.25, vol: 0.25 * v, pan });
      SFX.metal(A, v * 0.5, pan, 0.5, { intensity: 0.4 });
    },
    horn(A, v, pan) {
      A.tone({ type: 'sawtooth', freq: 350, dur: 0.4, vol: 0.08 * v, pan, filter: 'lowpass', filterFreq: 1500 });
      A.tone({ type: 'sawtooth', freq: 440, dur: 0.4, vol: 0.08 * v, pan, filter: 'lowpass', filterFreq: 1500 });
    },
    train(A, v) {
      A.noise({ filter: 'lowpass', freq: 250, dur: 4, vol: 0.4 * v, attack: 1 });
      for (let i = 0; i < 12; i++) {
        A.noise({ filter: 'bandpass', freq: 600, q: 2, dur: 0.08, vol: 0.2 * v, delay: 0.6 + i * 0.28 });
      }
    },
    star(A, v, pan, p) {
      A.tone({ type: 'triangle', freq: 1046 * p, dur: 0.15, vol: 0.12 * v });
      A.tone({ type: 'triangle', freq: 1568 * p, dur: 0.4, vol: 0.12 * v, delay: 0.1 });
      A.noise({ filter: 'highpass', freq: 6000, dur: 0.3, vol: 0.05 * v, delay: 0.1 });
    },
    fail(A, v) {
      [392, 370, 349, 262].forEach((f, i) => A.tone({ type: 'square', freq: f, dur: i === 3 ? 0.8 : 0.25, vol: 0.07 * v, delay: i * 0.28, filter: 'lowpass', filterFreq: 1200 }));
    },
    win(A, v) {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => A.tone({ type: 'triangle', freq: f, dur: 0.25, vol: 0.1 * v, delay: i * 0.1 }));
    },
    beep(A, v, pan, p) {
      A.tone({ type: 'square', freq: 1000 * p, dur: 0.08, vol: 0.06 * v, filter: 'lowpass', filterFreq: 3000 });
    },
    flashlight(A, v) {
      A.tone({ type: 'square', freq: 1400, dur: 0.015, vol: 0.06 * v, filter: 'highpass', filterFreq: 1000 });
      A.noise({ filter: 'bandpass', freq: 3000, q: 3, dur: 0.02, vol: 0.05 * v });
    },
    punch(A, v, pan) {
      A.noise({ filter: 'lowpass', freq: 1200, dur: 0.12, vol: 0.3 * v, pan });
      A.tone({ type: 'sine', freq: 160, freqEnd: 60, dur: 0.15, vol: 0.3 * v, pan });
    },
    typewriter(A, v) {
      A.noise({ filter: 'bandpass', freq: 3500, q: 4, dur: 0.02, vol: 0.06 * v });
    },
    gunshot(A, v) {
      A.noise({ filter: 'lowpass', freq: 4000, freqEnd: 300, dur: 0.5, vol: 0.7 * v, attack: 0.001 });
      A.tone({ type: 'sine', freq: 90, freqEnd: 30, dur: 0.4, vol: 0.6 * v });
      A.noise({ filter: 'highpass', freq: 2000, dur: 0.08, vol: 0.5 * v });
      A.noise({ filter: 'bandpass', freq: 600, q: 1, dur: 1.4, vol: 0.12 * v, delay: 0.1, attack: 0.05 });
    },
        rumble(A, v) {
      A.tone({ type: 'sine', freq: 45, freqEnd: 30, dur: 1.2, vol: 0.3 * v, attack: 0.2 });
    },
  };

  Audio.SFX = SFX;
  Audio.TRACKS = TRACKS;
  RC.Audio = Audio;
})(window.RC);
