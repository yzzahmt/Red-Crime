/* =========================================================================
 *  RED CRIME - Köprü altı brifingi
 *  Oyuncu köprü altında yürür; ateş varilinin başındaki Reis soygun planını
 *  anlatır, ardından kamyon gelir ve Red Crime kamyona biner.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const D = RC.Draw;
  const I = RC.Input;

  const GROUND = 0;
  const DECK_Y = -330;
  const WORLD_W = 2600;

  const NAMES = { boss: 'REİS', hero: 'RED CRIME' };

  RC.Scenes.briefing = {
    enter(params) {
      this.level = params.level || 0;
      this.cfg = C.LEVELS[this.level];
      this.lines = (C.BRIEFINGS[this.level] || []).slice();
      // Reis hedef tutarı söyler
      this.lines.push({ who: 'boss', mood: 'serious', text: RC.L(C.TARGET_LINE, { v: RC.U.formatMoney(this.cfg.target) }) });
      if (this.cfg.final) {
        const left = C.FINAL_ATTEMPTS - (RC.Save.progress.finalAttempts || 0);
        this.lines.push({ who: 'boss', mood: 'angry', text: RC.L(left <= 1 ? 'Bu SON hakkın Red Crime. Son. Anladın mı?' : 'Unutma: {n} hakkın var. Sonra benim sıram.', { n: left }) });
      }
      this.t = 0;
      this.camera = new RC.Camera();
      this.camera.setView(RC.Game.W, RC.Game.H);
      this.camera.bounds = { x: -300, y: -700, w: WORLD_W + 600, h: 900 };
      this.particles = new RC.Particles(800);
      this.player = { x: 200, y: GROUND, vx: 0, vy: 0, facing: 1, onGround: true, phase: 0, squash: 1 };
      this.boss = { x: 1080, y: GROUND, facing: -1, t: 0, mood: 'normal', talking: false };
      this.barrel = { x: 960 };
      this.truck = { x: WORLD_W + 400, target: 1560, state: 'away', door: 0, drive: 0 };
      this.stage = 'walk'; // walk → talk → truck → board → leave
      // Sahne her girişte sıfırlanmalı: aksi hâlde ikinci bölümde kamyon yola çıkar ama geçiş tetiklenmez
      this.boardT = 0;
      this.leaving = false;
      this.gone = false;
      this.dlg = null;
      this.lineIdx = 0;
      this.trainT = 6;
      this.train = null;
      this.skyline = new RC.BG.Skyline({ seed: 31, color: '#0f1330', minH: 120, maxH: 300, width: 1800, windowChance: 0.3 });
      this.skyline2 = new RC.BG.Skyline({ seed: 32, color: '#171b3a', minH: 60, maxH: 160, width: 1500, windowChance: 0.4 });
      this.dark = document.createElement('canvas');
      this.dctx = this.dark.getContext('2d');
      this.camera.snapTo(this.player.x + 300, -160);
      this.skipHold = 0;
      RC.Audio.playMusic('bridge');
      RC.Audio.fireLoop();
      if (this.cfg.weather === 'rain' || this.level === 0) RC.Audio.rainLoop();
    },
    exit() {
      RC.Audio.stopLoop('fire');
      RC.Audio.stopLoop('rain');
      RC.Audio.stopLoop('engine');
      RC.Audio.setMusicDuck(1);
    },

    /* ------------------------------------------------------------------ */
    /** Dokunmatik: yürürken kaydırma hareketleri, dokunuş = konuş / kamyona bin */
    touchGestures() {
      return this.stage === 'walk' || this.stage === 'truck';
    },
    touchTap() {
      return 'interact';
    },
    touchButtons() {
      if ((this.stage === 'walk' || this.stage === 'talk') && RC.Save.progress.seenBriefing[this.level]) {
        return [{ x: RC.Game.W - 84, y: 56, w: 64, h: 64, name: 'back', hold: true, draw: 'play' }];
      }
      return [];
    },

    startDialog() {
      this.stage = 'talk';
      this.lineIdx = 0;
      this.openLine();
      RC.Audio.setMusicDuck(0.45);
    },
    openLine() {
      const ln = this.lines[this.lineIdx];
      if (!ln) {
        this.endDialog();
        return;
      }
      this.dlg = { line: ln, shown: 0, t: 0 };
      this.boss.mood = ln.who === 'boss' ? ln.mood : this.boss.mood;
    },
    endDialog() {
      this.dlg = null;
      RC.Audio.setMusicDuck(1);
      RC.Save.progress.seenBriefing[this.level] = true;
      RC.Save.save();
      this.stage = 'truck';
      this.truck.state = 'arriving';
      RC.Audio.engineLoop();
      RC.Audio.setLoop('engine', { rpm: 0.6, vol: 0.8 });
      RC.Audio.play('horn', { x: this.truck.x, y: -60, vol: 1 });
    },

    update(dt) {
      this.t += dt;
      const p = this.player;
      const b = this.boss;
      b.t += dt;
      RC.Audio.listener.x = this.camera.x;
      RC.Audio.listener.y = this.camera.y;

      // Brifingi atla
      if (this.stage === 'walk' || this.stage === 'talk') {
        if (I.act('back') && RC.Save.progress.seenBriefing[this.level]) {
          this.skipHold += dt;
          if (this.skipHold > 0.6) {
            this.skipHold = 0;
            this.dlg = null;
            this.endDialog();
          }
        } else this.skipHold = 0;
        if (I.actPressed('back') && !RC.Save.progress.seenBriefing[this.level] && this.stage === 'walk') {
          RC.Game.go('levelselect', { select: this.level });
          return;
        }
      }

      // Oyuncu hareketi
      const canMove = this.stage === 'walk' || this.stage === 'truck';
      const dir = canMove ? I.axis('left', 'right') : 0;
      const target = dir * 220;
      p.vx = U.approach(p.vx, target, 1800 * dt);
      if (dir) p.facing = dir;
      if (canMove && I.actPressed('jump') && p.onGround) {
        p.vy = -620;
        p.onGround = false;
        RC.Audio.play('jump', { vol: 0.5 });
      }
      p.vy += C.GRAVITY * dt;
      p.x = U.clamp(p.x + p.vx * dt, 60, WORLD_W - 80);
      p.y += p.vy * dt;
      if (p.y >= GROUND) {
        if (!p.onGround && p.vy > 300) {
          RC.Audio.play('land', { vol: 0.4, intensity: 0.3 });
          this.particles.dust(p.x, GROUND, 5, '#8a8478');
          p.squash = 0.7;
        }
        p.y = GROUND;
        p.vy = 0;
        p.onGround = true;
      }
      p.squash = U.damp(p.squash, 1, 10, dt);
      if (p.onGround && Math.abs(p.vx) > 10) {
        p.phase += Math.abs(p.vx) * dt * 0.055;
        p.stepAcc = (p.stepAcc || 0) + Math.abs(p.vx) * dt;
        if (p.stepAcc > 46) {
          p.stepAcc = 0;
          RC.Audio.play('step', { vol: 0.4, pitch: U.rand(0.9, 1.1) });
        }
      }
      // Reis oyuncuya bakar
      b.facing = p.x < b.x ? -1 : 1;

      // Etkileşim
      const nearBoss = Math.abs(p.x - b.x) < 150;
      const tr = this.truck;
      const nearTruck = tr.state === 'waiting' && p.x > tr.x - 20 && p.x < tr.x + 140;
      this.prompt = null;
      if (this.stage === 'walk' && nearBoss) this.prompt = { key: 'E', text: 'Reis ile konuş' };
      if (this.stage === 'truck' && nearTruck) this.prompt = { key: 'E', text: 'Kamyona bin' };
      if (this.stage === 'walk' && nearBoss && (I.actPressed('interact') || I.wasPressed('Enter'))) this.startDialog();
      else if (this.stage === 'talk' && this.dlg) this.updateDialog(dt);
      else if (this.stage === 'truck' && nearTruck && (I.actPressed('interact') || I.wasPressed('Enter'))) {
        this.stage = 'board';
        this.boardT = 0;
        RC.Audio.play('truckDoor', { vol: 1 });
      }

      // Kamyon
      if (tr.state === 'arriving') {
        const dx = tr.target - tr.x;
        tr.x += Math.sign(dx) * Math.min(Math.abs(dx), Math.max(60, Math.abs(dx) * 1.6) * dt);
        tr.drive += dt;
        RC.Audio.setLoop('engine', { rpm: 0.3 + Math.min(1, Math.abs(dx) / 800) * 0.6, vol: 0.9 });
        if (Math.abs(dx) < 2) {
          tr.state = 'waiting';
          RC.Audio.play('horn', { x: tr.x, y: -60, vol: 0.7 });
          RC.Audio.setLoop('engine', { rpm: 0.1, vol: 0.5 });
        }
      }
      if (this.stage === 'board') {
        this.boardT += dt;
        p.x = U.damp(p.x, tr.x + 60, 6, dt);
        if (this.boardT > 0.8 && !this.leaving) {
          this.leaving = true;
          RC.Audio.setLoop('engine', { rpm: 0.9, vol: 1 });
          RC.Audio.play('horn', { vol: 0.8 });
        }
        if (this.leaving) {
          tr.x -= (this.boardT - 0.8) * 500 * dt;
          if (Math.random() < 0.6) this.particles.smoke(tr.x + 310, -28, 1, '#555', 9);
        }
        if (this.boardT > 2.6 && !this.gone) {
          this.gone = true;
          RC.Game.go(this.cfg.planning ? 'planning' : 'truckride', { level: this.level });
        }
      }

      // Tren
      this.trainT -= dt;
      if (this.trainT <= 0 && !this.train) {
        this.train = { x: -1600, speed: 900 };
        RC.Audio.play('train', { vol: 0.9 });
      }
      if (this.train) {
        this.train.x += this.train.speed * dt;
        this.camera.shake(0.03);
        if (Math.random() < dt * 12) this.particles.dust(U.rand(this.camera.x - 600, this.camera.x + 600), DECK_Y + 30, 2, '#9a9080');
        if (this.train.x > WORLD_W + 400) {
          this.train = null;
          this.trainT = U.rand(14, 20);
        }
      }

      // Ateş parçacıkları, puro dumanı
      if (Math.random() < dt * 30) this.particles.embers(this.barrel.x, -70, 1);
      if (Math.random() < dt * 3) this.particles.smoke(this.barrel.x, -90, 1, '#555', 8);
      if (Math.random() < dt * 2) this.particles.smoke(b.x + b.facing * 34, -60, 1, '#aaa', 3);
      // Köprüden damlayan su
      if (Math.random() < dt * 8) {
        this.particles.add({ type: 'circle', x: U.rand(this.camera.x - 700, this.camera.x + 700), y: DECK_Y + 50, vy: 100, g: 900, size: 1.5, color: '#8fb7ff', alpha: 0.6, life: 0.8 });
      }
      this.particles.update(dt);

      // Kamera
      let focusX = p.x + p.facing * 60;
      if (this.stage === 'talk') focusX = (p.x + b.x) / 2;
      if (this.stage === 'board' || this.stage === 'truck') focusX = (p.x + tr.x + 170) / 2;
      this.camera.follow(focusX, this.stage === 'talk' ? -30 : -180, dt);
      this.camera.targetZoom = this.stage === 'talk' ? 1.2 : 1;
      this.camera.update(dt);
    },

    updateDialog(dt) {
      const d = this.dlg;
      d.t += dt;
      const len = RC.L(d.line.text).length;
      const before = Math.floor(d.shown);
      d.shown = Math.min(len, d.shown + dt * 48);
      if (Math.floor(d.shown) > before && Math.floor(d.shown) % 2 === 0) {
        RC.Audio.play('blip', { pitch: d.line.who === 'boss' ? 0.7 : 1.3, minGap: 0.03 });
      }
      this.boss.talking = d.line.who === 'boss' && d.shown < len;
      if (I.actPressed('interact') || I.actPressed('grab') || I.wasPressed('Enter') || I.mouse.pressed) {
        if (d.shown < len) d.shown = len;
        else {
          this.lineIdx++;
          RC.Audio.play('tick');
          this.openLine();
        }
      }
    },

    /* ------------------------------------------------------------------ */
    render(ctx) {
      const w = RC.Game.W;
      const h = RC.Game.H;
      const t = this.t;
      const cam = this.camera;
      cam.setView(w, h);
      // Gökyüzü ve karşı kıyı
      RC.BG.sky(ctx, w, h, t, { moonX: w * 0.7 - cam.x * 0.02, moonY: h * 0.15, parallaxX: cam.x, starAlpha: 0.6 });
      const horizon = cam.worldToScreen(0, 40).y;
      this.skyline.render(ctx, cam.x * 0.1, horizon - 30, w, t);
      this.skyline2.render(ctx, cam.x * 0.2, horizon, w, t);
      // Nehir
      const riverTop = horizon;
      const rg = ctx.createLinearGradient(0, riverTop, 0, h);
      rg.addColorStop(0, '#0e1636');
      rg.addColorStop(1, '#05070f');
      ctx.fillStyle = rg;
      ctx.fillRect(0, riverTop, w, h - riverTop);
      // Işık yansımaları
      for (let i = 0; i < 40; i++) {
        const x = ((i * 137 - cam.x * 0.2) % (w + 100) + w + 100) % (w + 100) - 50;
        const y = riverTop + 6 + (i % 5) * 7;
        ctx.fillStyle = `rgba(255,210,130,${0.2 + Math.sin(t * 3 + i) * 0.15})`;
        ctx.fillRect(x + Math.sin(t * 2 + i) * 4, y, 10 + (i % 3) * 8, 2);
      }

      ctx.save();
      cam.apply(ctx);
      const view = cam.view;
      this.drawBridge(ctx, view, t);
      this.drawProps(ctx, t);
      // Kamyon
      const tr = this.truck;
      if (tr.state !== 'away') {
        RC.drawTruck(ctx, tr.x, GROUND, {
          color: this.cfg.truckColor,
          t,
          headlights: true,
          brake: tr.state === 'waiting',
          shake: 0.5,
          wheelRot: -tr.x / 20,
          doorOpen: 0,
        });
      }
      // Reis
      this.drawBoss(ctx, t);
      // Oyuncu
      if (!(this.stage === 'board' && this.boardT > 0.6)) this.drawHero(ctx, t);
      this.particles.render(ctx, view);
      ctx.restore();

      // Karanlık + ateş ışığı
      this.drawDarkness(ctx, w, h, t);

      // Etkileşim ipucu
      if (this.prompt && !this.dlg) {
        const pr = this.prompt;
        const pos = cam.worldToScreen(this.player.x, -110);
        ctx.font = `bold 15px ${C.FONT_UI}`;
        const tw = ctx.measureText(pr.text).width;
        D.panel(ctx, pos.x - tw / 2 - 30, pos.y - 30, tw + 60, 40, { r: 10, shadow: false });
        D.key(ctx, pr.key, pos.x - tw / 2 - 22, pos.y - 25, 28);
        D.text(ctx, pr.text, pos.x - tw / 2 + 14, pos.y - 5, { size: 15, weight: 'bold' });
      }
      if (this.dlg) this.drawDialog(ctx, w, h, t);

      // Üst bilgi
      if (this.stage === 'walk') {
        D.text(ctx, 'Reis\'in yanına git (A/D ile yürü)', w / 2, 40, { size: 18, align: 'center', color: '#dfe3f5', stroke: 'rgba(0,0,0,0.6)', strokeW: 4 });
      } else if (this.stage === 'truck' && this.truck.state === 'waiting') {
        D.text(ctx, 'Kamyonun kabinine git ve E\'ye bas', w / 2, 40, { size: 18, align: 'center', color: C.COLORS.gold, stroke: 'rgba(0,0,0,0.6)', strokeW: 4 });
      }
      D.text(ctx, RC.L('BÖLÜM {n} · BRİFİNG', { n: this.cfg.id }), 20, h - 18, { size: 13, color: '#5a6284' });
      if (RC.Save.progress.seenBriefing[this.level] && (this.stage === 'walk' || this.stage === 'talk')) {
        D.text(ctx, RC.T('Atlamak için ESC basılı tut', 'Atlamak için ▶ düğmesini basılı tut'), w - 20, h - 18, { size: 13, align: 'right', color: '#9aa3c7' });
        if (this.skipHold > 0) D.bar(ctx, w - 200, h - 44, 180, 6, this.skipHold / 0.6);
      }
      // Sinema şeritleri (diyalogda)
      const bar = this.stage === 'talk' ? 40 : 0;
      if (bar) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, bar);
      }
    },

    drawBridge(ctx, view, t) {
      // Zemin (beton set)
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(view.x - 50, GROUND, view.w + 100, 60);
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(view.x - 50, GROUND, view.w + 100, 6);
      ctx.fillStyle = '#1a1a20';
      ctx.fillRect(view.x - 50, GROUND + 60, view.w + 100, 400);
      // Taş parçaları
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let x = Math.floor(view.x / 90) * 90; x < view.x + view.w; x += 90) ctx.fillRect(x, GROUND + 14, 40, 3);

      // Köprü tabliyesi
      ctx.fillStyle = '#34343c';
      ctx.fillRect(view.x - 50, DECK_Y - 70, view.w + 100, 70);
      ctx.fillStyle = '#2a2a30';
      ctx.fillRect(view.x - 50, DECK_Y - 10, view.w + 100, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for (let x = Math.floor(view.x / 120) * 120; x < view.x + view.w; x += 120) ctx.fillRect(x, DECK_Y - 70, 6, 82);
      // Korkuluk
      ctx.fillStyle = '#4a4a54';
      ctx.fillRect(view.x - 50, DECK_Y - 110, view.w + 100, 6);
      for (let x = Math.floor(view.x / 30) * 30; x < view.x + view.w; x += 30) ctx.fillRect(x, DECK_Y - 110, 3, 40);

      // Tren
      if (this.train) {
        const tx = this.train.x;
        for (let i = 0; i < 6; i++) {
          const cx = tx + i * 250;
          ctx.fillStyle = i === 0 ? '#8a1b2a' : '#3a4a6a';
          U.fillRoundRect(ctx, cx, DECK_Y - 190, 240, 110, i === 0 ? 30 : 8);
          ctx.fillStyle = '#ffe9a8';
          for (let k = 0; k < 6; k++) ctx.fillRect(cx + 16 + k * 36, DECK_Y - 170, 24, 30);
          ctx.fillStyle = '#111';
          U.circle(ctx, cx + 40, DECK_Y - 76, 12);
          U.circle(ctx, cx + 200, DECK_Y - 76, 12);
        }
      }

      // Ayaklar ve kemerler
      for (const px of [380, 1280, 2180]) {
        ctx.fillStyle = '#3e3e48';
        ctx.fillRect(px - 50, DECK_Y, 100, -DECK_Y);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px + 30, DECK_Y, 20, -DECK_Y);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(px - 50, DECK_Y, 10, -DECK_Y);
        // Grafiti
        ctx.save();
        ctx.translate(px, -150);
        ctx.rotate(-0.08);
        ctx.font = `28px ${C.FONT_TITLE}`;
        ctx.textAlign = 'center';
        // Anonimlik: grafitilerde kişi adı yok, yalnızca lakap ve sokak sözleri
        const tags = { 380: 'RC', 1280: 'RED CRIME', 2180: RC.L('İZ BIRAKMA') };
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 5;
        ctx.strokeText(tags[px], 0, 0);
        ctx.fillStyle = px === 1280 ? '#e8283c' : px === 380 ? '#4aa8ff' : '#ffc83d';
        ctx.fillText(tags[px], 0, 0);
        ctx.restore();
      }
      // Kemer alt çizgileri
      ctx.strokeStyle = '#2a2a30';
      ctx.lineWidth = 16;
      for (const [a, b] of [
        [430, 1230],
        [1330, 2130],
      ]) {
        ctx.beginPath();
        ctx.moveTo(a, DECK_Y + 10);
        ctx.quadraticCurveTo((a + b) / 2, DECK_Y + 90, b, DECK_Y + 10);
        ctx.stroke();
      }
    },

    drawProps(ctx, t) {
      // Şilte ve karton kutular
      ctx.fillStyle = '#6a5a7a';
      U.fillRoundRect(ctx, 620, -22, 170, 22, 8);
      ctx.fillStyle = '#7a6a8a';
      U.fillRoundRect(ctx, 630, -30, 60, 14, 6);
      ctx.fillStyle = '#b08a5a';
      ctx.fillRect(820, -48, 50, 48);
      ctx.fillRect(840, -80, 40, 32);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(820, -48, 50, 48);
      ctx.strokeRect(840, -80, 40, 32);
      // Alışveriş arabası
      ctx.strokeStyle = '#8a909c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(1330, -60);
      ctx.lineTo(1420, -60);
      ctx.lineTo(1410, -20);
      ctx.lineTo(1340, -20);
      ctx.closePath();
      ctx.stroke();
      for (let i = 1; i < 5; i++) U.line(ctx, 1330 + i * 18, -60, 1335 + i * 16, -20);
      U.line(ctx, 1420, -60, 1440, -76);
      U.circle(ctx, 1345, -8, 6, '#222');
      U.circle(ctx, 1405, -8, 6, '#222');
      // Ateş varili
      const bx = this.barrel.x;
      ctx.fillStyle = '#5a3a2a';
      U.fillRoundRect(ctx, bx - 28, -72, 56, 72, 4);
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(bx - 28, -56, 56, 4);
      ctx.fillRect(bx - 28, -22, 56, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      U.circle(ctx, bx - 10, -40, 3);
      U.circle(ctx, bx + 12, -34, 3);
      for (let i = 0; i < 6; i++) {
        const fx = bx - 20 + i * 8;
        const fh = 26 + Math.sin(t * 10 + i * 1.3) * 10 + (i === 2 || i === 3 ? 14 : 0);
        const g = ctx.createLinearGradient(0, -72 - fh, 0, -72);
        g.addColorStop(0, 'rgba(255,220,120,0)');
        g.addColorStop(0.4, 'rgba(255,150,40,0.95)');
        g.addColorStop(1, 'rgba(230,60,20,1)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(fx - 7, -70);
        ctx.quadraticCurveTo(fx - 5, -72 - fh * 0.6, fx + Math.sin(t * 8 + i) * 3, -72 - fh);
        ctx.quadraticCurveTo(fx + 5, -72 - fh * 0.6, fx + 7, -70);
        ctx.fill();
      }
      // Radyo
      ctx.fillStyle = '#6a2a2a';
      U.fillRoundRect(ctx, 1160, -24, 40, 24, 4);
      U.circle(ctx, 1172, -12, 6, '#222');
    },

    drawBoss(ctx, t) {
      const b = this.boss;
      const talk = b.talking;
      const bob = Math.sin(b.t * 2) * 2;
      const r = 36;
      const f = b.facing;
      const gest = talk ? Math.sin(b.t * 6) * 10 : 0;
      const mood = b.mood;
      D.character(ctx, {
        x: b.x,
        y: b.y - r - bob,
        r,
        body: '#5a4a7a',
        facing: f,
        look: { x: f, y: 0 },
        eyes: mood === 'angry' ? 'angry' : 'open',
        sunglasses: mood !== 'serious' && mood !== 'angry',
        mouth: talk ? (Math.floor(b.t * 10) % 2 ? 'open' : 'grin') : mood === 'grin' ? 'grin' : mood === 'angry' ? 'angry' : 'flat',
        hat: 'fedora',
        hatColor: '#1c1c24',
        bandColor: '#8f1020',
        cigar: true,
        chain: true,
        arms: [
          { x: -r * 1.1, y: r * 0.4 - (f < 0 ? gest : 0) },
          { x: r * 1.1, y: r * 0.4 - (f > 0 ? gest + (talk ? 16 : 0) : 0) },
        ],
        sleeve: '#2a2438',
        skin: '#e0b08a',
        glove: '#1a1a1a',
        armThick: 9,
        t,
      });
      D.text(ctx, 'REİS', b.x, b.y - r * 2 - 40, { size: 14, align: 'center', font: C.FONT_TITLE, color: '#ffc83d', stroke: '#000', strokeW: 4 });
    },

    drawHero(ctx, t) {
      const p = this.player;
      const r = 21;
      const moving = Math.abs(p.vx) > 10 && p.onGround;
      const swing = moving ? Math.sin(p.phase * 2) * r * 0.6 : 0;
      const f = p.facing;
      const arms = !p.onGround
        ? [{ x: -r * 1.25, y: -r * 0.6 }, { x: r * 1.25, y: -r * 0.6 }]
        : [{ x: -f * r * 1.05 - swing * f * 0.4, y: r * 0.62 }, { x: f * r * 1.05 + swing * f * 0.6, y: r * 0.62 }];
      D.character(ctx, {
        x: p.x,
        y: p.y - r * p.squash,
        r,
        body: '#e8283c',
        sx: 2 - p.squash,
        sy: p.squash,
        facing: f,
        look: { x: f, y: 0 },
        balaclava: '#1c1d26', operator: true,
        mouth: 'smile',
        arms: f > 0 ? arms : [arms[1], arms[0]],
        sleeve: '#1d1f29',
        glove: '#2a2d3e',
        t,
      });
    },

    drawDarkness(ctx, w, h, t) {
      const s = 0.5;
      const cw = Math.ceil(w * s);
      const ch = Math.ceil(h * s);
      if (this.dark.width !== cw || this.dark.height !== ch) {
        this.dark.width = cw;
        this.dark.height = ch;
      }
      const d = this.dctx;
      d.setTransform(1, 0, 0, 1, 0, 0);
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, cw, ch);
      d.fillStyle = 'rgba(4,5,16,0.72)';
      d.fillRect(0, 0, cw, ch);
      d.setTransform(s, 0, 0, s, 0, 0);
      this.camera.apply(d);
      d.globalCompositeOperation = 'destination-out';
      const flick = 1 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.04;
      const glow = (x, y, r, a) => {
        const g = d.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g;
        d.fillRect(x - r, y - r, r * 2, r * 2);
      };
      glow(this.barrel.x, -90, 420 * flick, 1);
      glow(this.player.x, -30, 110, 0.6);
      const tr = this.truck;
      if (tr.state !== 'away') {
        d.fillStyle = 'rgba(0,0,0,0.8)';
        d.beginPath();
        d.moveTo(tr.x + 6, -54);
        d.lineTo(tr.x - 500, -150);
        d.lineTo(tr.x - 500, 40);
        d.closePath();
        d.fill();
      }
      glow(this.boss.x + this.boss.facing * 34, -60, 30, 0.8);
      d.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.dark, 0, 0, w, h);
      // Sıcak ateş tonu
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pos = this.camera.worldToScreen(this.barrel.x, -90);
      const g = ctx.createRadialGradient(pos.x, pos.y, 5, pos.x, pos.y, 340 * flick * this.camera.zoom);
      g.addColorStop(0, 'rgba(255,140,50,0.28)');
      g.addColorStop(1, 'rgba(255,140,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      D.vignette(ctx, w, h, 0.6);
    },

    drawDialog(ctx, w, h, t) {
      const d = this.dlg;
      const ln = d.line;
      const pw = Math.min(900, w - 60);
      const ph = 150;
      const px = w / 2 - pw / 2;
      const py = h - ph - 24;
      const appear = U.ease.outBack(U.clamp01(d.t / 0.25));
      ctx.save();
      ctx.translate(0, (1 - appear) * 40);
      ctx.globalAlpha = U.clamp01(d.t / 0.15);
      D.panel(ctx, px, py, pw, ph, { accent: ln.who === 'boss' ? '#ffc83d' : C.COLORS.red });
      // Portre
      const cx = px + 78;
      const cy = py + ph / 2 + 4;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, U.TAU);
      ctx.fillStyle = ln.who === 'boss' ? '#2a2438' : '#2a1a22';
      ctx.fill();
      ctx.clip();
      if (ln.who === 'boss') {
        const talk = d.shown < ln.line?.length || d.shown < ln.text.length;
        D.character(ctx, {
          x: cx,
          y: cy + 14,
          r: 40,
          body: '#5a4a7a',
          facing: 1,
          look: { x: 0.3, y: 0 },
          eyes: ln.mood === 'angry' ? 'angry' : 'open',
          sunglasses: ln.mood !== 'serious' && ln.mood !== 'angry',
          mouth: talk && Math.floor(t * 10) % 2 ? 'open' : ln.mood === 'grin' ? 'grin' : ln.mood === 'angry' ? 'angry' : 'flat',
          hat: 'fedora',
          hatColor: '#1c1c24',
          cigar: true,
          chain: true,
          noArms: true,
          shadow: false,
          t,
        });
      } else {
        D.character(ctx, {
          x: cx,
          y: cy + 12,
          r: 34,
          body: '#e8283c',
          facing: 1,
          look: { x: 0.3, y: 0 },
          balaclava: '#1c1d26', operator: true,
          mouth: ln.mood === 'worried' ? 'worried' : ln.mood === 'happy' ? 'grin' : 'smile',
          noArms: true,
          shadow: false,
          t,
        });
      }
      ctx.restore();
      ctx.strokeStyle = ln.who === 'boss' ? '#ffc83d' : C.COLORS.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, U.TAU);
      ctx.stroke();
      // İsim + metin
      D.text(ctx, NAMES[ln.who], px + 150, py + 36, { size: 18, font: C.FONT_TITLE, color: ln.who === 'boss' ? '#ffc83d' : C.COLORS.red });
      ctx.font = `18px ${C.FONT_UI}`;
      const shown = RC.L(ln.text).slice(0, Math.floor(d.shown));
      const lines = U.wrapText(ctx, shown, pw - 180);
      lines.slice(0, 4).forEach((l, i) => D.text(ctx, l, px + 150, py + 66 + i * 24, { size: 18, color: '#f2f4ff' }));
      if (d.shown >= RC.L(ln.text).length) {
        const bob = Math.sin(t * 6) * 3;
        D.text(ctx, '▼', px + pw - 26, py + ph - 16 + bob, { size: 16, align: 'center', color: '#9aa3c7' });
      }
      D.text(ctx, `${this.lineIdx + 1}/${this.lines.length}`, px + pw - 16, py + 26, { size: 12, align: 'right', color: '#5a6284' });
      ctx.restore();
    },
  };
})(window.RC);
