/* =========================================================================
 *  RED CRIME - SOYGUN SAHNESİ (ana oyun)
 *  Dünya, oyuncu, ev sahipleri, köpek, gürültü sistemi, kamyon yükleme,
 *  kasa mini oyunu, polis, süre, yakalanma, kaçış, duraklatma menüsü.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const I = RC.Input;
  const D = RC.Draw;

  const Heist = {
    name: 'heist',

    enter(params = {}) {
      if (params.resume && this.world) {
        this.state = this.prevState === 'paused' || !this.prevState ? 'play' : this.prevState;
        RC.Audio.playMusic(this.musicName || 'heist');
        RC.Audio.engineLoop();
        RC.Audio.setLoop('engine', { rpm: 0.1, vol: 0.35 });
        if (this.weather === 'rain') RC.Audio.rainLoop();
        this.particles.setQuality(RC.Save.settings.quality);
        this.lighting.resize(RC.Game.W, RC.Game.H, RC.Save.settings.quality);
        return;
      }
      const lvl = params.level || 0;
      this.levelIndex = lvl;
      const cfg = C.LEVELS[lvl];
      this.cfg = cfg;
      this.diff = C.DIFFICULTY[RC.Save.settings.difficulty] || C.DIFFICULTY.normal;
      const seed = cfg.seed + Math.floor(Math.random() * 5) * 101;
      this.world = params.world || RC.LevelGen.generate(lvl, seed);
      this.plan = params.plan || null;
      if (this.plan) this.applyPlanWorld();
      const W = this.world;

      this.camera = new RC.Camera();
      this.camera.setView(RC.Game.W, RC.Game.H);
      this.camera.bounds = { x: W.bounds.x, y: W.bounds.y, w: W.bounds.w, h: W.bounds.h };
      this.particles = new RC.Particles(1600);
      this.particles.setQuality(RC.Save.settings.quality);
      this.lighting = new RC.Lighting();
      this.lighting.resize(RC.Game.W, RC.Game.H, RC.Save.settings.quality);
      RC.WorldRender.init(this);

      this.player = new RC.Player(this, W.spawn.x, 0);
      this.camera.snapTo(this.player.cx, this.player.cy - 60);
      this.residents = W.bedSpots.map((bs, i) => new RC.Resident(this, bs.resident, bs, i));
      // Bekçiler
      const GUARDS = [
        { name: 'Özel Güvenlik', color: '#2a3a6a', cap: '#1b2a55', mustache: true, sleepDepth: 1, look: { build: 1.2, hair: 'buzz', hairColor: '#1a1410', skin: '#c9946c', beard: 'stubble' } },
        { name: 'Vardiya Amiri', color: '#3a4a3a', cap: '#1b2a55', mustache: false, sleepDepth: 1, look: { age: 'old', build: 1.1, hair: 'gray', mustache: true, skin: '#e0b08a' } },
      ];
      (W.guardSpawns || []).forEach((gs, i) => {
        const room = W.floorByK[0].rooms[0];
        this.residents.push(new RC.Resident(this, GUARDS[i % 2], { furn: null, room, k: gs.k, x: gs.x }, this.residents.length, true));
      });
      this.dog = W.dog ? new RC.Dog(this, W.dog) : null;
      if (this.dog) this.dog.name = cfg.dogName || 'Bekçi Köpeği';
      RC.Security.init(this);
      this.mg = null;
      this.secGraceT = 0;

      this.resetRunState();
      this.time = 0;
      this.timeLeft = C.heistTime(lvl) * this.diff.time + (RC.Save.hasPerm('bribe') ? 45 : 0) + RC.Premium.time;
      this.totalTime = this.timeLeft;
      this.loaded = [];
      this.loadedValue = 0;
      this.flyers = [];
      this.noiseEvents = [];
      this.playerNoise = 0;
      this.lightsOn = false;
      this.lightsOffT = 0;
      this.policeCalled = false;
      this.policeT = 0;
      this.sirenT = 0;
      this.dangerLevel = 0;
      this.heartT = 0;
      this.prompts = [];
      this.creakFlash = 0;
      this.weather = cfg.weather;
      this.state = 'intro';
      this.stateT = 0;
      this.inputLocked = false;
      this.bigMap = false;
      this.truckAnim = { door: 0, x: W.truck.x, drive: 0 };
      this.stats = { broken: 0, brokenValue: 0, woken: 0, spotted: 0, safeOpened: false, keyFound: false, thrown: 0 };
      this.hintT = 20;
      this.hintIdx = Math.floor(Math.random() * C.HINTS.length);
      this.seenHide = false;
      this.activeItems = new Set();
      this.musicName = 'heist';
      this.slowmo = 1;
      this.endFade = 0;

      this.heat = new RC.Heat(this);
      RC.HUD.reset();
      RC.Audio.playMusic('heist');
      RC.Audio.stopAllLoops();
      if (this.weather === 'rain') RC.Audio.rainLoop();
      RC.Audio.engineLoop();
      RC.Audio.setLoop('engine', { rpm: 0.1, vol: 0.35 });
      RC.Audio.play('teleport', { vol: 0.5 });
      this.particles.sparks(this.player.cx, this.player.cy, 40, '#8fd6ff', 380);
      this.particles.ring(this.player.cx, this.player.cy, 200, '#8fd6ff', 0.8, 5);
      this.pauseMenu = null;
      this.tutorial = lvl === 0 && !RC.Save.progress.tutorialDone ? new RC.Tutorial(this) : null;
      if (this.plan) this.applyPlanStart();
      this.radioT = 0;
      if (this.tutorial) this.state = 'play';
    },

    /**
     * Bir önceki soygundan kalan her bayrak burada sıfırlanır. Sahne nesnesi
     * tekil olduğundan enter() içinde atanmayan alanlar yeni bölüme taşınıyordu
     * (yıldız bildirimi çıkmaması, önceki planın matkap/stetoskop/polis gecikmesi vb.).
     */
    resetRunState() {
      this.prevState = null;
      this.leftBehind = false;
      this.escapeTimeUp = false;
      this.caughtBy = null;
      this.caughtByPolice = false;
      this.lastStars = 0;
      this.warned30 = false;
      this.lastBeep = null;
      this.policeDelay = 0;
      this.stethoscope = false;
      this.drill = false;
      this.hackPanelT = 0;
      this.muzzleT = 0;
      this.drag = null;
      RC.DragLoot.hover = null;
    },

    exit() {
      RC.Audio.stopLoop('engine');
      RC.Audio.stopLoop('rain');
      this.releaseWorld();
    },

    /**
     * Dünyayı ve ona bağlı her şeyi bırakır: oda/mobilya tuval önbellekleri
     * (GPU belleği), ızgaralar, varlıklar. Ayarlar ekranına "keep" ile geçişte
     * exit() çağrılmaz, bu yüzden devam etme (resume) bozulmaz.
     */
    releaseWorld() {
      const W = this.world;
      if (W) {
        for (const room of W.rooms || []) {
          if (room.cache) room.cache.width = room.cache.height = 0;
          room.cache = null;
        }
        if (W.grid) W.grid.map.clear();
        if (W.itemGrid) W.itemGrid.map.clear();
      }
      RC.Furniture.clearCache();
      if (RC.WorldRender.world === W) RC.WorldRender.world = null;
      if (this.lighting && this.lighting.canvas) this.lighting.canvas.width = this.lighting.canvas.height = 0;
      this.world = null;
      this.player = null;
      this.residents = [];
      this.dog = null;
      this.activeItems = null;
      this.flyers = [];
      this.noiseEvents = [];
      this.lighting = null;
      this.particles = null;
      this.tutorial = null;
      this.mg = null;
      this.pauseMenu = null;
      this.drag = null;
      this.heat = null;
      RC.DragLoot.hover = null;
      RC.DragLoot.setCursor('');
    },

    /* ==================================================================
     * OLAY GERİ ÇAĞIRIMLARI (varlıklar tarafından çağrılır)
     * ================================================================ */
    makeNoise(x, y, loud, src) {
      if (loud <= 0) return;
      this.noiseEvents.push({ x, y, loud, src });
      if (this.heat && src !== 'bark') this.heat.noteNoise(x, y, loud);
      const p = this.player;
      if (src !== 'bark' && U.dist(x, y, p.cx, p.cy) < 260) this.playerNoise = Math.max(this.playerNoise, loud);
      if (RC.Save.settings.noiseRings && loud > 0.08) {
        const col = loud > 0.6 ? '#ff3043' : loud > 0.3 ? '#ffc83d' : '#ffffff';
        this.particles.ring(x, y, 40 + loud * 260, col, 0.45 + loud * 0.5, 2 + loud * 3);
      }
    },

    floorOf(y) {
      const H = this.world.house;
      if (H.basement && y > 12) return -1;
      const k = Math.floor((-y + 12) / C.FLOOR_H);
      return U.clamp(k, 0, H.floors - 1);
    },

    flashlightHits(x, y) {
      const p = this.player;
      if (!p.flashOn) return false;
      const hp = p.handPos;
      if (!U.pointInCone(x, y, hp.x, hp.y, p.aim, p.flashSpread, p.flashRange)) return false;
      return RC.Physics.lineOfSight(this.world.grid, hp.x, hp.y, x, y);
    },

    nearOutdoorLight(x, y) {
      for (const l of this.world.lamps) {
        if (!l.always) continue;
        if (U.dist(x, y, l.x, l.y) < l.r * 0.55) return true;
      }
      return false;
    },

    inTruckZone(p) {
      const z = this.world.truck.zone;
      return p.x + p.w > z.x && p.x < z.x + z.w && p.y + p.h > z.y && p.y < z.y + z.h;
    },

    nearTruck(p) {
      const t = this.world.truck;
      return p.x + p.w > t.x - 20 && p.x < t.x + t.w + 140 && p.bottom > -200 && p.bottom < 20;
    },

    toast(text, color) {
      RC.HUD.toast(text, color);
    },

    onResidentWake(r) {
      this.stats.woken++;
      if (!this.lightsOn) {
        this.lightsOn = true;
        RC.Audio.play('lightOn', { x: r.x, y: r.y, vol: 1 });
        this.toast(RC.L('{n} uyandı! Işıklar yandı!', { n: r.displayName }), '#ff8c2e');
        this.camera.shake(0.2);
      } else {
        this.toast(RC.L('{n} de uyandı!', { n: r.displayName }), '#ff8c2e');
      }
      // Diğerleri de hafifçe irkilir
      for (const o of this.residents) if (o !== r && o.state === 'sleep') o.wake += 30;
      // Üçüncü uyanışta polis
      const total = U.sum(this.residents, (x) => x.timesWoken);
      if (total >= 3 && !this.policeCalled) this.callPolice(r);
    },

    onResidentSleep(r) {
      if (this.residents.every((x) => x.state === 'sleep')) {
        this.lightsOffT = 1.2;
      }
    },

    onResidentStir(r, amount) {
      if (amount > 20) this.camera.shake(0.05);
    },

    onSpotted(r) {
      this.stats.spotted++;
      // Bekçiler telsizle anında haber verir; ev sahipleri önce 911'i arar (Resident.beginCall)
      if (r && r.isGuard && !this.policeCalled) this.callPolice(r, 60);
    },

    roomAt(k, x) {
      const f = this.world.floorByK[k];
      if (!f) return null;
      for (const r of f.rooms) if (x >= r.x0 && x < r.x1) return r;
      return null;
    },

    /** quiet=true: sessiz alarm (siren ve bildirim yok; bildirimi çağıran yapar) */
    callPolice(r, secs, quiet = false) {
      this.policeCalled = true;
      this.policeT = Math.min(this.timeLeft, (secs || 60) * this.diff.time + (this.policeDelay || 0));
      if (this.policeDelay) RC.Game.later(2.5, () => this.radio('lookout', 'Polisi yanlış adrese yolladım, biraz vaktin var!'));
      if (r && !r.isGuard) RC.Game.later(1.2, () => r.say(U.pick(C.LINES.police), 2));
      if (quiet) return;
      this.toast(RC.L('911 ARANDI! Kaçmak için {t} var!', { t: U.formatTime(this.policeT) }), '#ff3043');
      RC.Audio.play('alarm', { vol: 0.8 });
    },

    onItemBroken(it) {
      this.stats.broken++;
      this.stats.brokenValue += it.value;
      const br = this.roomAt(this.floorOf(it.y + it.h - 2), it.cx);
      if (br) br.broken = (br.broken || 0) + 1;
      this.toast(RC.L('{n} kırıldı! (-{v})', { n: it.name, v: U.formatMoney(it.value) }), '#ff8fa3');
      U.removeFrom(this.world.items, it);
      this.activeItems.delete(it);
      for (const r of this.residents) {
        if (r.awake && U.dist(r.x, r.y, it.cx, it.cy) < 500 && r.speechCooldown()) r.say(U.pick(C.LINES.broken), 1.5);
      }
    },

    /** Alınan eşyanın üstünde duran eşyalar düşer (yığından alttakini çekmek!) */
    releaseAbove(it) {
      const W = this.world;
      const list = W.itemGrid.query(it.x - 2, it.y - 60, it.w + 4, 62, []);
      for (const o of list) {
        if (o === it || o.state !== 'rest') continue;
        const onTop = Math.abs(o.y + o.h - it.y) < 2 && o.x < it.x + it.w && o.x + o.w > it.x;
        if (onTop) {
          this.releaseAbove(o);
          o.release(U.rand(-40, 40), -20, false);
          this.activeItems.add(o);
        }
      }
    },

    onPickup(it) {
      this.activeItems.delete(it);
      if (it.room && !it.fromContainer) it.room.stolen = (it.room.stolen || 0) + 1;
      if (this.tutorial) this.tutorial.stats.pickups++;
    },

    onThrow(it) {
      this.stats.thrown++;
      this.activeItems.add(it);
    },

    onKeyFound() {
      this.stats.keyFound = true;
    },

    onHide() {
      if (this.tutorial) this.tutorial.stats.hides++;
      if (!this.seenHide) {
        this.seenHide = true;
        this.toast('Saklandın! Hareket etmezsen seni göremezler.', '#3ddc84');
      }
    },

    /* ------------------------ Kamyon ------------------------ */
    loadItem(it) {
      it.state = 'loaded';
      this.loaded.push(it);
      this.loadedValue += it.value;
      const t = this.world.truck;
      this.flyers.push({ item: it, x0: this.player.cx, y0: this.player.bodyY - 40, x1: t.x + t.w - 60, y1: t.y - 150, t: 0, dur: 0.45 });
      this.particles.text(t.x + t.w - 20, t.y - 180, '+' + U.formatMoney(it.value), { color: it.rarity.color, size: 22 });
      RC.Audio.play(it.value > 5000 ? 'bigcash' : 'cash', { vol: 0.8 });
      this.checkStarToast();
    },

    unloadBag() {
      const p = this.player;
      const list = p.bag.slice();
      p.bag.length = 0;
      p.bagFullWarned = false;
      let total = 0;
      const t = this.world.truck;
      list.forEach((it, i) => {
        it.state = 'loaded';
        this.loaded.push(it);
        total += it.value;
        this.flyers.push({ item: it, x0: p.cx, y0: p.bodyY, x1: t.x + t.w - 60, y1: t.y - 150, t: -i * 0.06, dur: 0.45 });
      });
      this.loadedValue += total;
      this.particles.text(t.x + t.w - 20, t.y - 180, '+' + U.formatMoney(total), { color: C.COLORS.gold, size: 26 });
      this.particles.cash(t.x + t.w - 40, t.y - 150, 12);
      RC.Audio.play('bigcash', { vol: 0.8 });
      this.checkStarToast();
    },

    checkStarToast() {
      const stars = this.cfg.stars;
      const s = stars.filter((v) => this.loadedValue >= v).length;
      if (s > (this.lastStars || 0)) {
        this.lastStars = s;
        RC.Audio.play('star');
        this.toast(s === 1 ? '★ Hedefe ulaştın! Kaçabilirsin — ya da devam!' : s === 2 ? '★★ Harika vurgun!' : '★★★ EFSANE VURGUN!', C.COLORS.gold);
        this.particles.confetti(this.world.truck.x + 170, this.world.truck.y - 200, 50, 300);
      }
    },

    /* ------------------------ Kasa ------------------------ */
    startSafeMinigame() {
      this.startMinigame(new RC.Minigames.SafeGame(this, this.world.safe), 'safe', this.world.safe);
    },

    openSafe() {
      const W = this.world;
      const s = W.safe;
      s.state.open = true;
      this.state = 'play';
      this.inputLocked = false;
      this.stats.safeOpened = true;
      RC.Audio.play('safeOpen', { vol: 1 });
      this.toast('KASA AÇILDI! İçindekileri topla!', C.COLORS.gold);
      this.particles.sparks(s.x + s.w / 2, s.y + 30, 40, '#ffd24a', 320);
      this.camera.shake(0.3);
      // Kasa bütçesi bölüm hedefine bağlı: bütçe dolana kadar eşya çıkar.
      // Piyasa değerli olmayan eşyalar erken bölümlerde bütçeye göre ölçeklenir
      // (aksi hâlde 1. bölüm kasasındaki tek deste nakit hedefi karşılıyordu).
      const budget = this.cfg.target * C.SAFE_BUDGET;
      const lvlMul = 1 + this.levelIndex * 0.35;
      const scale = U.clamp((budget * 0.12) / (17000 * lvlMul), 0.03, 1);
      const rng = new U.RNG(Math.floor(Math.random() * 1e6));
      const pool = RC.Items.safeLootFor(this.levelIndex);
      let spent = 0;
      for (let i = 0; i < 40 && spent < budget; i++) {
        const def = rng.weighted(pool, 'w8');
        const it = new RC.Item(def, s.x + s.w / 2 - def.w / 2, s.y + 20, rng, { valueMul: lvlMul * scale, valueCap: budget * C.SAFE_ITEM_CAP, room: W.safeRoom });
        spent += it.value;
        it.k = s.k;
        it.release(U.rand(-180, 180), U.rand(-420, -220), true);
        W.items.push(it);
        W.itemGrid.insert(it);
        this.activeItems.add(it);
      }
      I.consumeAll();
    },

    /* ------------------------ Ekip ve plan ------------------------ */
    radio(crewId, text, color) {
      const cm = C.CREW.find((c) => c.id === crewId);
      const name = cm ? RC.L(cm.name) : '';
      this.toast(name + ': ' + RC.L(text), color || (cm ? cm.color : '#ffffff'));
      RC.Audio.play('blip', { pitch: 1.6 });
      RC.Audio.play('noise' in RC.Audio.SFX ? 'noise' : 'tick', { vol: 0.3 });
    },

    /** Dünya üzerinde değişiklik gerektiren plan seçimleri (heist başlamadan) */
    applyPlanWorld() {
      const W = this.world;
      const H = W.house;
      if (this.plan.driver === 'back') {
        W.truck.x = H.r + 40;
        W.truck.zone = { x: W.truck.x + W.truck.w - 30, y: -170, w: 150, h: 170 };
        // Arka kapıyı aç
        for (const b of W.solids) {
          if (b.kind === 'wall' && b.x === H.r - C.WALL && b.y === -C.FLOOR_H + C.SLAB) b.h = C.FLOOR_H - C.SLAB - C.DOOR_H;
        }
        W.backDoor = true;
      }
      if (this.plan.entry === 'roof') W.spawn = { x: H.innerL + 150, y: W.floorY(H.floors - 1) - 60 };
      else if (this.plan.entry === 'sewer' && H.basement) W.spawn = { x: H.innerL + 100, y: W.floorY(-1) - 60 };
      else if (this.plan.driver === 'back') W.spawn = { x: W.truck.x - 60, y: -60 };
    },

    applyPlanStart() {
      const W = this.world;
      const pl = this.plan;
      this.player.x = W.spawn.x - this.player.w / 2;
      this.player.y = W.spawn.y;
      this.camera.snapTo(this.player.cx, this.player.cy - 60);
      this.truckAnim.x = W.truck.x;
      if (pl.hacker === 'cams') {
        this.jamT = 90;
        this.radio('hacker', 'Kameralar kör! 90 saniyen var.');
      } else if (pl.hacker === 'lasers') {
        for (const l of W.lasers) l.disabled = true;
        for (const p of W.plates || []) p.disabled = true;
        for (const s of W.sweepers || []) s.disabled = true;
        this.radio('hacker', 'Lazerler ve plakalar kapalı. Kameralar hâlâ açık, dikkat.');
      } else if (pl.hacker === 'panel') {
        this.hackPanelT = 120;
        this.radio('hacker', 'Alarm sistemine sızıyorum. 2 dakika dayan.');
      }
      if (pl.lookout === 'street') this.policeDelay = 25;
      if (pl.decoy === 'call') {
        for (const r of this.residents) {
          if (!r.isGuard) continue;
          r.decoyT = 45;
          r.setTarget(0, W.street.x1 - 150 - r.index * 60);
        }
        RC.Game.later(1.5, () => this.radio('decoy', 'Sahte ihbar yapıldı. Bekçiler 45 saniye dışarıda!'));
      }
      if (pl.gear === 'stetho') this.stethoscope = true;
      if (pl.gear === 'drill') this.drill = true;
    },

    updatePlan(dt) {
      const pl = this.plan;
      if (!pl) return;
      if (this.hackPanelT > 0) {
        this.hackPanelT -= dt;
        if (this.hackPanelT <= 0) {
          RC.Security.disable(this, false);
          this.radio('hacker', 'İçerideyim! Bütün güvenlik sistemi kapandı.');
        }
      }
      // Gözcü uyarıları
      if (pl.lookout === 'roof') {
        this.radioT -= dt;
        if (this.radioT <= 0) {
          const p = this.player;
          for (const r of this.residents) {
            if (!r.awake || r.state === 'knocked') continue;
            if (r.k === this.floorOf(p.bottom - 4) && Math.abs(r.x - p.cx) < 520 && !r.seesPlayer) {
              this.radio('lookout', r.isGuard ? 'Dikkat! Bekçi sana doğru geliyor!' : 'Dikkat! Biri yaklaşıyor, saklan!');
              this.radioT = 9;
              break;
            }
          }
        }
      }
    },

    /* ------------------------ Kapı / panel etkileşimi ------------------------ */
    tryInteract() {
      const p = this.player;
      const W = this.world;
      const L = RC.L;
      // Alarm paneli
      const pn = W.panel;
      if (this.panelNear()) {
        if (this.alarm) {
          this.toast(L('Alarm çalıyor, panel kilitlendi!'), '#ff3043');
          return true;
        }
        this.startMinigame(new RC.Minigames.HackGame(this, pn), 'hack');
        return true;
      }
      // Çekmece / dolap
      const cont = this.containerNear();
      const d0 = RC.Doors.nearPlayer(this);
      if (cont && (!d0 || Math.abs(d0.x - p.cx) > 26)) {
        this.openContainer(cont);
        return true;
      }
      // Kapılar
      const d = RC.Doors.nearPlayer(this);
      if (d) {
        if (d.closed && d.locked && d.exterior && p.cx > d.x) {
          // İçeriden: mandalı çevir, kır-aç gerekmez
          d.locked = false;
          RC.Doors.open(this, d, p);
        } else if (d.closed && d.locked) {
          // Kilit açma: alet seç (maymuncuk / vurma anahtarı / matkap). Dış kapı daha zor.
          this.startMinigame(new RC.Minigames.LockpickGame(this, d, { drill: !!d.exterior }), 'lockpick', d);
        } else if (d.closed) {
          RC.Doors.open(this, d, p);
        } else if (!RC.Doors.close(this, d, p)) {
          this.toast(L('Kapının önünden çekil.'), '#9aa3c7');
        }
        return true;
      }
      return false;
    },

    /** Oyuncunun önündeki açılmamış çekmece/dolap */
    panelNear() {
      const p = this.player;
      const pn = this.world.panel;
      return !!(pn && !pn.disabled && Math.abs(p.cx - pn.x) < 50 && p.bottom > -20 && p.bottom < 10);
    },

    containerNear() {
      const p = this.player;
      let best = null;
      let bd = 1e9;
      for (const f of this.world.furniture) {
        if (!f.container || f.container.open) continue;
        if (p.cx < f.x - 14 || p.cx > f.x + f.w + 14) continue;
        const top = f.def.wall ? f.y + f.h + 60 : f.y;
        if (p.bottom < top - 4 || p.bottom > f.y + f.h + (f.def.wall ? 240 : 6)) continue;
        const d = Math.abs(p.cx - (f.x + f.w / 2));
        if (d < bd) {
          bd = d;
          best = f;
        }
      }
      return best;
    },

    openContainer(f) {
      const c = f.container;
      const p = this.player;
      const W = this.world;
      c.open = true;
      c.t = 0;
      const quiet = p.crouch;
      RC.Audio.play('wood', { vol: quiet ? 0.35 : 0.7, pitch: 1.2 });
      RC.Audio.play('creak', { vol: quiet ? 0.2 : 0.4, pitch: 1.6 });
      this.makeNoise(f.x + f.w / 2, f.y + f.h / 2, quiet ? 0.05 : 0.12, 'drawer');
      const rng = new U.RNG(c.seed);
      const topY = f.def.wall ? f.y + f.h + 2 : f.y;
      for (const def of c.defs) {
        const it = new RC.Item(def, U.clamp(f.x + rng.float(4, f.w - def.w - 4), f.x, f.x + f.w - def.w), topY - def.h - 2, rng, { valueMul: 1 + this.levelIndex * 0.18, valueCap: W.valueCap, room: f.room });
        it.k = f.k;
        it.fromContainer = true;
        it.release(rng.float(-60, 60), rng.float(-260, -120), true);
        W.items.push(it);
        W.itemGrid.insert(it);
        this.activeItems.add(it);
      }
      if (f.room) f.room.opened = (f.room.opened || 0) + 1;
      this.stats.drawers = (this.stats.drawers || 0) + 1;
      this.toast(RC.L('{c} açıldı: {n} eşya çıktı!', { c: RC.L(c.label), n: c.defs.length }), '#ffd24a');
      c.defs = [];
    },

    startMinigame(game, type, target) {
      this.mg = { game, type, target };
      this.prevState = this.state;
      this.state = 'mg';
      this.inputLocked = true;
      I.consumeAll();
    },

    updateMg(dt) {
      const res = this.mg.game.update(dt);
      if (!res) return;
      const { type, target } = this.mg;
      if (res === 'win') {
        if (type === 'lockpick') {
          RC.Doors.open(this, target, this.player);
          this.toast(RC.L('Kilit açıldı!'), '#3ddc84');
          this.stats.locks = (this.stats.locks || 0) + 1;
        } else if (type === 'hack') {
          RC.Security.disable(this, false);
        } else if (type === 'safe') {
          this.openSafe();
        }
      } else if (res === 'fail' && type === 'lockpick') {
        this.toast(this.mg.game.failMsg || RC.L('Matkap uçları bitti. Kilit kırılamadı.'), '#ff3043');
      } else if (res === 'alarm') {
        RC.Security.trigger(this, this.world.panel.x, this.world.panel.y, RC.L('Panel hatalı şifreyle kilitlendi!'));
      }
      this.mg = null;
      this.state = 'play';
      this.inputLocked = false;
      I.consumeAll();
    },

    /* ------------------------ Karanlık ağ ekipmanı ------------------------ */
    useGadget(id) {
      const L = RC.L;
      const p = this.player;
      const def = C.DARKWEB.find((g) => g.id === id);
      if (!RC.Save.gadgetCount(id)) {
        this.toast(L('Bu ekipmandan kalmadı: {n}', { n: L(def.name) }), '#9aa3c7');
        RC.Audio.play('uiError', { vol: 0.5 });
        return;
      }
      if (id === 'lockpick') {
        const d = RC.Doors.nearPlayer(this);
        if (!d || !d.locked) {
          this.toast(L('Yakında kilitli bir kapı yok.'), '#9aa3c7');
          return;
        }
        RC.Save.useGadget(id);
        RC.Audio.play('safeGood', { vol: 0.7 });
        this.particles.sparks(d.x, d.y - 100, 20, '#8fd6ff', 200);
        d.locked = false;
        RC.Doors.open(this, d, p);
        this.toast(L('Elektronik maymuncuk kilidi açtı.'), '#3ddc84');
      } else if (id === 'jammer') {
        if (!this.world.cameras.length || this.secDisabled) {
          this.toast(L('Karıştırılacak kamera yok.'), '#9aa3c7');
          return;
        }
        RC.Save.useGadget(id);
        this.jamT = 25;
        RC.Audio.play('flash', { vol: 0.4 });
        this.particles.ring(p.cx, p.cy, 700, '#4aa8ff', 0.9, 4);
        this.toast(L('Kameralar 25 saniye kör!'), '#4aa8ff');
      } else if (id === 'sleepgas') {
        RC.Save.useGadget(id);
        this.clouds.push({ type: 'gas', x: p.cx, y: p.cy - 10, r: 280, t: 0, dur: 9, life01: 0 });
        RC.Audio.play('whoosh', { vol: 0.8, pitch: 0.6 });
        this.toast(L('Uyku gazı yayıldı!'), '#9ad08a');
      } else if (id === 'smoke') {
        RC.Save.useGadget(id);
        this.clouds.push({ type: 'smoke', x: p.cx, y: p.cy - 10, r: 240, t: 0, dur: 16, life01: 0 });
        RC.Audio.play('whoosh', { vol: 0.9, pitch: 0.4 });
        this.toast(L('Sis bombası! Görünmezsin.'), '#b4b8c4');
      } else if (id === 'pistol') {
        RC.Save.useGadget(id);
        const fx = p.cx + p.facing * 30;
        RC.Audio.play('gunshot', { vol: 1 });
        this.particles.sparks(fx, p.bodyY - 10, 30, '#ffd36b', 500);
        this.particles.smoke(fx, p.bodyY - 10, 6, '#888', 10);
        this.camera.shake(0.8);
        this.muzzleT = 0.08;
        this.makeNoise(p.cx, p.cy, 1.6, 'gun');
        for (const r of this.residents) {
          if (U.dist(r.x, r.y, p.cx, p.cy) < 900 && r.state !== 'knocked') r.scare(p.cx);
        }
        if (this.dog && Math.abs(this.dog.x - p.cx) < 900) this.dog.setState('return');
        if (!this.policeCalled) this.callPolice(null, 60);
        this.lightsOn = true;
        this.toast(L('Uyarı atışı! Herkes kaçışıyor... ama polis yolda!'), '#ffd24a');
      } else if (id === 'emp') {
        if (this.secDisabled || (!this.world.cameras.length && !this.world.lasers.length && !this.world.panel)) {
          this.toast(L('Bu evde kapatılacak sistem yok.'), '#9aa3c7');
          return;
        }
        RC.Save.useGadget(id);
        RC.Security.disable(this, true);
      }
    },

    /* ------------------------ Son ------------------------ */
    caught(by) {
      if (this.state === 'caught' || this.state === 'escape') return;
      this.state = 'caught';
      this.stateT = 0;
      this.inputLocked = true;
      this.caughtBy = by;
      RC.Audio.play('punch', { vol: 1 });
      RC.Audio.play('fail', { vol: 0.8 });
      this.camera.shake(0.7);
      this.camera.targetZoom = 1.6;
      this.slowmo = 0.3;
      if (by && by.say) by.say('YAKALADIM SENİ!', 2);
    },

    escape(timeUp = false) {
      if (this.state === 'escape' || this.state === 'caught') return;
      const nearTruck = this.nearTruck(this.player);
      this.state = 'escape';
      this.stateT = 0;
      this.inputLocked = true;
      this.leftBehind = timeUp && !nearTruck;
      this.escapeTimeUp = timeUp;
      if (!this.leftBehind) this.player.hiddenInTruck = true;
      RC.Audio.play('truckDoor', { vol: 1 });
      RC.Audio.play('horn', { vol: 0.8 });
      RC.Audio.setLoop('engine', { rpm: 0.8, vol: 0.9 });
      this.toast(timeUp ? (this.leftBehind ? 'Süre doldu! Kamyon sensiz gitti!' : 'Süre doldu! Kamyon kalkıyor!') : 'Kaçıyoruz!', C.COLORS.gold);
    },

    finish() {
      const p = this.player;
      if (this.plan && this.plan.decoy === 'none' && this.loadedValue > 0) {
        this.loadedValue = Math.round(this.loadedValue * 1.1);
      }
      // Kamyon sensiz gittiyse soygun başarısız: yıldız yok, sonraki bölüm açılmaz
      const stars = this.leftBehind ? 0 : this.cfg.stars.filter((v) => this.loadedValue >= v).length;
      const lost = this.leftBehind ? p.bagValue + (p.held ? p.held.value : 0) : 0;
      RC.Game.go('results', {
        level: this.levelIndex,
        value: this.loadedValue,
        items: this.loaded.slice(),
        stars,
        stats: this.stats,
        timeUsed: this.totalTime - Math.max(0, this.timeLeft),
        leftBehind: this.leftBehind,
        lostValue: lost,
        bagValue: p.bagValue,
        total: this.world.valueTotal,
        itemCount: this.world.items.length,
      });
    },

    /* ==================================================================
     * GÜNCELLEME
     * ================================================================ */
    update(rawDt) {
      if (this.state === 'paused') {
        this.updatePause(rawDt);
        return;
      }
      const dt = rawDt * this.slowmo;
      this.time += dt;
      this.stateT += rawDt;
      const p = this.player;
      const W = this.world;

      if (I.actPressed('pause') && this.state !== 'mg' && this.state !== 'caught' && this.state !== 'escape') {
        this.openPause();
        return;
      }
      this.bigMap = I.act('map') && this.state !== 'mg';

      // Giriş bandı
      if (this.state === 'intro') {
        this.truckAnim.door = Math.min(1, this.truckAnim.door + dt * 1.5);
        if (this.stateT > 2.6 || (this.stateT > 0.5 && I.anyPressed)) this.state = 'play';
      }

      // Süre
      if (this.tutorial) this.tutorial.update(rawDt);
      const tutPause = this.tutorial && this.tutorial.timerPaused;
      if ((this.state === 'play' || this.state === 'mg' || this.state === 'intro') && !tutPause) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 30 && !this.warned30) {
          this.warned30 = true;
          this.toast('Son 30 saniye!', '#ff3043');
        }
        if (this.timeLeft <= 10 && Math.ceil(this.timeLeft) !== this.lastBeep) {
          this.lastBeep = Math.ceil(this.timeLeft);
          RC.Audio.play('beep', { pitch: 1 + (10 - this.timeLeft) * 0.05 });
        }
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.escape(true);
        }
        if (this.policeCalled) {
          this.policeT -= dt;
          this.sirenT -= dt;
          if (this.sirenT <= 0) {
            this.sirenT = 1.25;
            RC.Audio.play('siren', { vol: U.clamp(1 - this.policeT / 70, 0.25, 1) });
          }
          if (this.policeT <= 0) {
            if (this.nearTruck(p)) this.escape(false);
            else this.caught({ name: 'Polis', say: null });
            this.caughtByPolice = true;
          }
        }
      }

      if (this.state === 'mg' && this.mg) this.updateMg(rawDt);
      this.updatePlan(dt);
      RC.Doors.update(this, dt);
      if (this.state !== 'escape') RC.Security.update(this, dt);
      if (this.state === 'play') {
        for (const g of C.DARKWEB) if (g.key && I.wasPressed('Digit' + g.key)) this.useGadget(g.id);
      }

      // Çuvaldan eşya çıkarma: yuvaya tıkla / dokun, ya da G son eşyayı bırakır
      if (this.state === 'play' && !p.hiddenInTruck && !this.bigMap) {
        const slots = RC.HUD.bagSlotRects || [];
        if (I.mouse.pressed && !this.drag) {
          const hit = slots.find((r) => I.hover(r.x, r.y, r.w, r.h));
          if (hit) {
            p.dropFromBag(hit.i);
            I.mouse.pressed = false;
          } else {
            const b = RC.HUD.bagRect;
            if (b && I.hover(b.x, b.y, b.w, b.h)) I.mouse.pressed = false;
          }
        }
        for (const r of slots) if (I.wasPressed('Touch.bag' + r.i)) p.dropFromBag(r.i);
        if (I.wasPressed('KeyG') && p.bag.length) p.dropFromBag(p.bag.length - 1);
      }

      // Oyuncu
      RC.DragLoot.updateHover(this);
      if (this.state !== 'escape' || this.leftBehind) {
        if (!p.hiddenInTruck) p.update(dt);
      }
      RC.DragLoot.update(this, dt);

      // Eşyalar
      for (const it of W.items) {
        if (it.state === 'falling') this.activeItems.add(it);
      }
      for (const it of this.activeItems) {
        it.update(dt, this);
        if (it.state !== 'falling') this.activeItems.delete(it);
      }

      // Ev sahipleri, köpek
      if (this.state !== 'escape') {
        for (const r of this.residents) r.update(dt);
        if (this.dog) this.dog.update(dt);
      }

      // Gürültü olaylarını dağıt
      for (const ev of this.noiseEvents) {
        for (const r of this.residents) r.hear(ev);
        if (this.dog) this.dog.hear(ev);
      }
      this.noiseEvents.length = 0;
      this.playerNoise = Math.max(0, this.playerNoise - dt * 1.5);

      // Işıklar sönme gecikmesi
      if (this.lightsOffT > 0) {
        this.lightsOffT -= dt;
        if (this.lightsOffT <= 0 && this.residents.every((x) => x.state === 'sleep')) {
          this.lightsOn = false;
          RC.Audio.play('lightOn', { vol: 0.5 });
          this.toast('Işıklar söndü. Yeniden sessizlik...', '#8fb7ff');
        }
      }

      // Tehlike seviyesi
      let danger = 0;
      for (const r of this.residents) {
        let d = 0;
        if (r.state === 'sleep') d = (r.wake / 100) * 0.45;
        else if (r.state === 'chase') d = 1;
        else if (r.state === 'waking') d = 0.7;
        else if (r.state === 'knocked') d = 0;
        else if (r.state === 'patrol') d = (r.suspicion / 100) * 0.8;
        else d = 0.45 + (r.suspicion / 100) * 0.4;
        danger = Math.max(danger, d);
      }
      if (this.dog && this.dog.state === 'chase') danger = Math.max(danger, 0.8);
      else if (this.dog && (this.dog.state === 'track' || this.dog.state === 'guard')) danger = Math.max(danger, 0.5);
      if (this.alarm) danger = Math.max(danger, 0.9);
      for (const c of this.world.cameras) danger = Math.max(danger, c.detect * 0.8);
      this.dangerLevel = U.damp(this.dangerLevel, danger, 4, dt);
      if (this.secGraceT > 0) this.secGraceT -= dt;
      if (this.heat && this.state !== 'escape' && this.state !== 'caught') this.heat.update(dt);
      if (this.dangerLevel > 0.55) {
        this.heartT -= dt;
        if (this.heartT <= 0) {
          this.heartT = U.lerp(1.1, 0.45, (this.dangerLevel - 0.55) / 0.45);
          RC.Audio.play('heartbeat', { vol: 0.6 * this.dangerLevel });
        }
      }
      const wantMusic = danger >= 1 || this.policeCalled ? 'alert' : 'heist';
      if (wantMusic !== this.musicName && this.state !== 'caught') {
        this.musicName = wantMusic;
        RC.Audio.playMusic(wantMusic);
      }

      // Uçan eşyalar (kamyona)
      for (let i = this.flyers.length - 1; i >= 0; i--) {
        const f = this.flyers[i];
        f.t += dt;
        if (f.t >= f.dur) {
          this.flyers.splice(i, 1);
          RC.Audio.play('coin', { vol: 0.3, minGap: 0.04 });
        }
      }

      // Kamyon animasyonu
      const ta = this.truckAnim;
      if (this.state === 'escape') {
        ta.door = Math.max(0, ta.door - dt * 2);
        if (this.stateT > 0.6) {
          ta.drive += dt;
          ta.x -= ta.drive * 420 * dt;
          if (Math.random() < 0.5) this.particles.smoke(ta.x + 320, -28, 1, '#555', 8);
        }
        this.endFade = U.clamp((this.stateT - 1.8) / 1, 0, 1);
        if (this.stateT > 3) this.finish();
      } else if (this.state !== 'intro') {
        ta.door = Math.min(1, ta.door + dt * 2);
      }
      if (Math.random() < dt * 3) this.particles.smoke(ta.x + 305, -28, 1, '#666', 6);

      if (this.state === 'caught') {
        if (this.stateT > 1.8) {
          RC.Save.recordBusted();
          RC.Game.go('busted', { level: this.levelIndex, by: this.caughtBy ? this.caughtBy.name : 'Polis', police: !!this.caughtByPolice, value: this.loadedValue });
          return;
        }
      }

      // Kamera
      const followY = p.bodyY - 70;
      this.camera.follow(p.cx, followY, dt, p.vx);
      this.camera.update(rawDt);
      RC.Audio.listener.x = this.camera.x;
      RC.Audio.listener.y = this.camera.y;

      this.particles.update(dt);
      this.lighting.update(dt, this);
      if (this.creakFlash > 0) this.creakFlash -= dt;
      this.updatePrompts();
      RC.HUD.update(dt, this);

      // İpuçları
      if (RC.Save.settings.hints && this.state === 'play' && !(this.tutorial && this.tutorial.active)) {
        this.hintT -= dt;
        if (this.hintT <= 0) {
          this.hintT = 40;
          this.hintIdx = (this.hintIdx + 1) % C.HINTS.length;
          const hint = C.HINTS[this.hintIdx];
          this.toast(RC.L('İpucu: {h}', { h: RC.L(RC.T(hint, C.HINTS_TOUCH[hint] || hint)) }), '#8fb7ff');
        }
      }
    },

    updatePrompts() {
      const p = this.player;
      const W = this.world;
      const pr = [];
      if (this.state !== 'play' && this.state !== 'intro') {
        this.prompts = pr;
        return;
      }
      const inTruck = this.inTruckZone(p);
      if (p.held && inTruck) pr.push({ key: 'SPACE', text: RC.L('Kamyona yükle (+{v})', { v: U.formatMoney(p.held.value) }), color: C.COLORS.gold });
      else if (!p.held && p.bag.length && inTruck) pr.push({ key: 'SPACE', text: RC.L('Çuvalı boşalt (+{v})', { v: U.formatMoney(p.bagValue) }), color: C.COLORS.gold });
      else if (p.grabCandidate) {
        const it = p.grabCandidate;
        const bagOk = it.small && p.bag.length < p.bagCap;
        pr.push({ key: 'SPACE', text: it.isKey ? RC.L('Anahtarı al') : RC.L(bagOk ? 'Çuvala at: {n}' : 'Tut: {n}', { n: it.name }), color: it.isKey ? C.COLORS.gold : it.rarity.color });
      } else if (p.held) {
        pr.push({ key: 'Q', text: RC.L('Fırlat (dikkat dağıt)') });
        pr.push({ key: p.crouch ? 'SPACE' : 'S + SPACE', text: RC.L(p.crouch ? 'Sessizce yere koy' : 'Sessizce koy (ayakta: düşürür!)'), color: p.crouch ? '#3ddc84' : '#ffc83d' });
      }
      // tryInteract() ile aynı öncelik: alarm paneli → çekmece/dolap → kapı
      const door = RC.Doors.nearPlayer(this);
      const cont = !p.held && this.containerNear();
      if (this.panelNear()) pr.push({ key: 'E', text: RC.L('Alarm panelini hackle'), color: '#4aa8ff' });
      else if (cont && (!door || Math.abs(door.x - p.cx) > 26)) pr.push({ key: 'E', text: RC.L('Aç: {c}', { c: RC.L(cont.container.label) }), color: '#ffd24a' });
      else if (door) {
        let txt = RC.L('Kapıyı kapat');
        let col = '#9aa3c7';
        if (door.closed) {
          const pick = door.locked && !(door.exterior && p.cx > door.x);
          txt = RC.L(pick ? 'Kilitli kapı: kilidi kır' : 'Kapıyı aç');
          col = pick ? '#ff8c2e' : '#ffd24a';
        }
        pr.push({ key: 'E', text: txt, color: col });
      }
      if (W.safe && !W.safe.state.open && p.near(W.safe, 30)) {
        pr.push({ key: 'E', text: RC.L(p.hasKey ? 'Kasayı aç' : 'Kasa kilitli — anahtarı bul'), color: p.hasKey ? '#3ddc84' : '#ff8c2e' });
      }
      if (this.nearTruck(p)) pr.push({ key: 'E', text: RC.L(p.escapeConfirmT > 0 ? 'Onayla: KAÇ!' : 'Kaç (soygunu bitir)'), color: '#ffc83d' });
      if (!p.climbing && !p.stairAssist) {
        const sa = p.stairAt();
        if (sa) pr.push({ key: sa.where === 'top' ? 'S' : 'W', text: sa.where === 'top' ? RC.L('Merdivenden in') : RC.L('Merdivenden çık'), color: '#8fb7ff' });
      }
      if (!p.climbing) {
        const lad = p.ladderAt();
        if (lad) pr.push({ key: p.bottom < 10 ? 'S' : 'W', text: RC.L('El merdiveni') });
      }
      this.prompts = pr.slice(0, 3);
    },

    /* ------------------------ Dokunmatik ------------------------ */
    /** Oyun sırasında ekran kaydırma hareketleriyle oynanır (js/core/touch.js) */
    touchGestures() {
      return this.state === 'play';
    },
    /**
     * Dokunuş: ekrandaki ipucuna göre al/bırak/yükle ya da aç/kaç.
     * Kapıya, kasaya ya da alarm paneline dokunulursa (yakındaysa) her zaman onu açar;
     * böylece elde eşya varken ya da yanda eşya dururken de kapı açılabilir.
     */
    touchTap(pos) {
      const p = this.player;
      if (!p) return 'grab';
      if (pos && this.camera && this.prompts.some((pr) => pr.key === 'E')) {
        const w = this.camera.screenToWorld(pos.x, pos.y);
        const inRect = (x, y, rw, rh, m) => w.x > x - m && w.x < x + rw + m && w.y > y - m && w.y < y + rh + m;
        const d = RC.Doors.nearPlayer(this);
        if (d && inRect(d.x - 32, d.y - d.h, 64, d.h, 36)) return 'interact';
        const s = this.world.safe;
        if (s && !s.state.open && p.near(s, 30) && inRect(s.x, s.y, s.w, s.h, 36)) return 'interact';
        const pn = this.world.panel;
        if (this.panelNear() && inRect(pn.x - pn.w / 2, pn.y, pn.w, pn.h, 50)) return 'interact';
      }
      if (p.held || p.grabCandidate || (p.bag.length && this.inTruckZone(p))) return 'grab';
      if (this.prompts.some((pr) => pr.key === 'E')) return 'interact';
      return 'grab';
    },
    touchLongPress() {
      return this.player && this.player.held ? 'throw' : 'flashlight';
    },
    touchButtons() {
      const W = RC.Game.W;
      const H = RC.Game.H;
      const out = [];
      if (this.state === 'mg') {
        out.push({ x: W - 84, y: 20, w: 64, h: 64, name: 'back', code: 'Touch.back', draw: 'close' });
        return out;
      }
      if (this.state !== 'play') return out;
      const top = (RC.HUD.residentsBottom || 90) + 14;
      out.push({ x: W - 18 - 60, y: top, w: 60, h: 60, name: 'pause', draw: 'pause' });
      const mm = RC.Minimap.rect;
      if (mm) out.push({ x: mm.x, y: mm.y, w: mm.w, h: mm.h, name: 'map', hold: true });
      // Çuval yuvaları: aradaki boşluk da dokunuşa dahil
      if (!this.bigMap) for (const r of RC.HUD.bagSlotRects || []) out.push({ x: r.x - 2, y: r.y - 2, w: r.w + 4, h: r.h + 4, name: 'bag' + r.i });
      for (const g of RC.HUD.gadgetRects || []) out.push({ x: g.x, y: g.y, w: g.w, h: g.h, name: 'gadget' + g.key, code: 'Digit' + g.key });
      if (this.tutorial && this.tutorial.active && !this.tutorial.finished) {
        const pw = Math.min(620, W - 40);
        out.push({ x: W / 2 + pw / 2 - 210, y: 90, w: 210, h: 44, name: 'skipTutorial', code: 'Enter' });
      }
      return out;
    },

    /* ------------------------ Duraklatma ------------------------ */
    openPause() {
      this.prevState = this.state;
      this.state = 'paused';
      RC.Audio.play('uiBack');
      RC.Audio.setMusicDuck(0.35);
      const cx = RC.Game.W / 2 - 170;
      let y = RC.Game.H / 2 - 110;
      const mk = (label, icon, fn, primary) => {
        const b = new RC.UI.Button({ x: cx, y, w: 340, h: 54, label, icon, onClick: fn, primary });
        y += 66;
        return b;
      };
      this.pauseMenu = new RC.UI.Menu([
        mk('DEVAM ET', 'play', () => this.closePause(), true),
        mk('AYARLAR', 'gear', () => {
          RC.Audio.setMusicDuck(1);
          RC.Game.go('settings', { back: 'heist', backParams: { resume: true } }, true);
        }),
        mk('YENİDEN BAŞLA', 'retry', () => {
          RC.Audio.setMusicDuck(1);
          RC.Game.go('heist', { level: this.levelIndex });
        }),
        mk('ANA MENÜ', 'home', () => {
          // Dünya burada null yapılmaz: kararma sürerken sahne hâlâ çizilir.
          // Kaynaklar exit() -> releaseWorld() ile geçiş anında bırakılır.
          RC.Audio.setMusicDuck(1);
          RC.Game.go('menu');
        }),
      ]);
      I.consumeAll();
    },

    closePause() {
      this.state = this.prevState === 'paused' ? 'play' : this.prevState;
      RC.Audio.setMusicDuck(1);
      I.consumeAll();
    },

    updatePause(dt) {
      this.time += dt * 0.2;
      if (I.actPressed('pause')) {
        this.closePause();
        return;
      }
      this.pauseMenu.update(dt);
    },

    /* ==================================================================
     * ÇİZİM
     * ================================================================ */
    render(ctx) {
      const Wd = RC.Game.W;
      const Hd = RC.Game.H;
      const W = this.world;
      const cam = this.camera;
      const t = this.time;
      const p = this.player;
      cam.setView(Wd, Hd);
      const view = cam.view;

      RC.WorldRender.drawBackground(ctx, this, Wd, Hd, t);

      ctx.save();
      cam.apply(ctx);
      RC.WorldRender.drawWorldBack(ctx, this, view, t);

      // Mobilya (arka katman)
      for (const f of W.furniture) {
        if (f.layer === 'front') continue;
        if (!cam.inView(f.x, f.y - 130, f.w, f.h + 130, 80)) continue;
        RC.Furniture.draw(ctx, f, t);
      }
      // Kasa parıltısı
      if (W.safe && !W.safe.state.open && p.hasKey) {
        const s = W.safe;
        ctx.strokeStyle = `rgba(255,210,74,${0.4 + Math.sin(t * 5) * 0.3})`;
        ctx.lineWidth = 3;
        U.strokeRoundRect(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 8);
      }

      // Kapılar ve güvenlik donanımı
      RC.Doors.draw(ctx, this, view, t);
      RC.Security.drawWorld(ctx, this, view, t);

      // Görüş konileri
      for (const r of this.residents) r.drawCone(ctx);

      // Eşyalar
      const q = W.itemGrid.query(view.x - 60, view.y - 60, view.w + 120, view.h + 120, []);
      for (const it of q) {
        if (it.state === 'rest' || it.state === 'wall' || it.state === 'falling') it.draw(ctx, t, null);
      }
      for (const it of this.activeItems) if (!it._gc) it.draw(ctx, t, null);

      // Vitrin camları
      for (const f of W.furniture) {
        if (f.def.drawFront && cam.inView(f.x, f.y, f.w, f.h, 40)) {
          ctx.save();
          ctx.translate(f.x, f.y);
          f.def.drawFront(ctx, f.w, f.h);
          ctx.restore();
        }
      }

      // Yumuşak temas gölgeleri (karakterler zemine otursun)
      const contact = (x, y, rx) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
        g.addColorStop(0, 'rgba(0,0,0,0.42)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 0.22);
        ctx.translate(-x, -y);
        ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
        ctx.restore();
      };
      for (const r of this.residents) if (r.state !== 'sleep') contact(r.x, r.y, 34);
      if (this.dog) contact(this.dog.x, Math.max(this.dog.y, 0) || 0, 30);
      if (!p.hiddenInTruck && p.onGround !== false) contact(p.cx, p.bottom, 30);

      // Ev sahipleri ve yorganları
      for (const r of this.residents) r.draw(ctx, t);
      RC.WorldRender.drawBlankets(ctx, this);
      if (this.dog) this.dog.draw(ctx, t);

      // Kamyon
      const ta = this.truckAnim;
      const cargo = U.clamp(this.loadedValue / this.cfg.stars[2], 0, 1);
      RC.drawTruck(ctx, ta.x, W.truck.y, {
        color: this.cfg.truckColor,
        t,
        doorOpen: ta.door,
        cargo,
        headlights: true,
        brake: this.state !== 'escape',
        shake: this.state === 'escape' ? 1 : 0.4,
        wheelRot: -(W.truck.x - ta.x) / 20,
      });
      // Yükleme bölgesi işareti
      if (this.state === 'play' || this.state === 'intro') {
        const z = W.truck.zone;
        const a = (p.held || p.bag.length) ? 0.5 + Math.sin(t * 4) * 0.3 : 0.15;
        ctx.strokeStyle = U.rgba(C.COLORS.gold, a);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(z.x + 30, -4, z.w - 30, 4);
        ctx.setLineDash([]);
      }

      // Oyuncu
      if (!p.hiddenInTruck) p.draw(ctx, t);

      // Mobilya (ön katman: saklanma yerleri)
      for (const f of W.furniture) {
        if (f.layer !== 'front') continue;
        if (!cam.inView(f.x, f.y - 130, f.w, f.h + 130, 80)) continue;
        const overlap = p.cx > f.x - 10 && p.cx < f.x + f.w + 10 && p.bottom > f.y && p.y < f.y + f.h;
        if (overlap) ctx.globalAlpha = p.hidden ? 0.82 : 0.6;
        RC.Furniture.draw(ctx, f, t);
        ctx.globalAlpha = 1;
      }

      this.particles.render(ctx, view, false);
      ctx.restore();

      // Yağmur (ev dışında)
      if (this.weather === 'rain') {
        const a = cam.worldToScreen(W.house.x, W.house.topY);
        const b = cam.worldToScreen(W.house.r, W.floorY(W.house.basement ? -1 : 0) + 30);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, Wd, Hd);
        ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.clip('evenodd');
        RC.WorldRender.drawRain(ctx, this, Wd, Hd, 1 / 60);
        ctx.restore();
      }
      if (this.weather === 'fog') RC.BG.fog(ctx, Wd, Hd, t, 0.12);

      // Aydınlatma
      this.lighting.render(ctx, this);

      // Karanlığın üstündeki dünya katmanları
      ctx.save();
      cam.apply(ctx);
      this.particles.renderRings(ctx, view);
      RC.Security.drawOverlay(ctx, this, view, t);
      this.drawThermal(ctx, t);
      for (const r of this.residents) if (r._ov) r.drawOverlay(ctx, t, r._ov.x, r._ov.y);
      if (this.dog) this.dog.drawOverlay(ctx, t);
      this.drawWorldLabels(ctx, t);
      RC.DragLoot.drawWorld(ctx, this, t);
      // Uçan eşyalar
      for (const f of this.flyers) {
        if (f.t < 0) continue;
        const k = U.ease.inOutQuad(Math.min(1, f.t / f.dur));
        const x = U.lerp(f.x0, f.x1, k);
        const y = U.lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 120;
        f.item.drawAt(ctx, x, y, 1 - k * 0.5, k * 6);
      }
      this.particles.renderTexts(ctx);
      ctx.restore();

      // Sinematik son işlem (renk tonu, vinyet, gren)
      this.lighting.post(ctx, this, Wd, Hd);

      // Arayüz
      RC.HUD.toastY = this.tutorial && this.tutorial.active ? 200 : 104;
      RC.HUD.render(ctx, this, Wd, Hd);
      if (this.tutorial && this.state !== 'paused') this.tutorial.render(ctx, Wd);
      if (this.bigMap) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, Wd, Hd);
        RC.Minimap.render(ctx, this, 0, 0, true);
      }
      if (this.state === 'intro') this.drawIntroBanner(ctx, Wd, Hd);
      if (this.state === 'mg' && this.mg) this.mg.game.draw(ctx, Wd, Hd, t);
      if (this.state === 'caught') {
        const k = U.clamp(this.stateT / 1.5, 0, 1);
        ctx.fillStyle = `rgba(120,0,10,${k * 0.5})`;
        ctx.fillRect(0, 0, Wd, Hd);
        D.text(ctx, 'YAKALANDIN!', Wd / 2, Hd / 2, { size: 72 * (0.8 + U.ease.outBack(Math.min(1, k * 2)) * 0.2), font: C.FONT_TITLE, align: 'center', color: '#ff3043', stroke: '#000', strokeW: 8, alpha: Math.min(1, k * 2) });
      }
      if (this.endFade > 0) {
        ctx.fillStyle = `rgba(0,0,0,${this.endFade})`;
        ctx.fillRect(0, 0, Wd, Hd);
      }
      if (this.state === 'paused') this.drawPause(ctx, Wd, Hd, t);
    },

    /** Termal tarayıcı: duvar arkasındaki herkesi göster */
    drawThermal(ctx, t) {
      if (!RC.Save.hasPerm('thermal')) return;
      const a = 0.35 + Math.sin(t * 3) * 0.1;
      for (const r of this.residents) {
        const x = r.state === 'sleep' && r.bed ? r.bed.x + 42 : r.x;
        const y = r.state === 'sleep' && r.bed ? r.bed.y + 20 : r.y - 25;
        const g = ctx.createRadialGradient(x, y, 4, x, y, 40);
        g.addColorStop(0, `rgba(255,120,40,${a + 0.2})`);
        g.addColorStop(0.5, `rgba(255,40,40,${a})`);
        g.addColorStop(1, 'rgba(255,40,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 40, y - 40, 80, 80);
      }
      const key = this.world.keyItem;
      if (key && key.state !== 'bag') {
        ctx.strokeStyle = `rgba(255,210,74,${a + 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(key.cx, key.cy, 16 + Math.sin(t * 5) * 3, 0, U.TAU);
        ctx.stroke();
      }
    },

    drawWorldLabels(ctx, t) {
      const p = this.player;
      // Eldeki eşyanın fiyatı
      if (p.held && !p.hiddenInTruck) {
        const it = p.held;
        const y = p.bodyY - RC.Player.R - it.h - 18;
        priceTag(ctx, p.cx, y, it, true);
      }
      // Alınabilecek eşya
      const c = p.grabCandidate;
      if (c && this.state === 'play') {
        const pad = 4;
        const s = 6 + Math.sin(t * 6) * 1.5;
        ctx.strokeStyle = c.isKey ? C.COLORS.gold : c.rarity.color;
        ctx.lineWidth = 2.5;
        const x0 = c.x - pad;
        const y0 = c.y - pad;
        const x1 = c.x + c.w + pad;
        const y1 = c.y + c.h + pad;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + s);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x0 + s, y0);
        ctx.moveTo(x1 - s, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x1, y0 + s);
        ctx.moveTo(x1, y1 - s);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - s, y1);
        ctx.moveTo(x0 + s, y1);
        ctx.lineTo(x0, y1);
        ctx.lineTo(x0, y1 - s);
        ctx.stroke();
        priceTag(ctx, c.cx, c.y - 16, c, false);
      }
      // Kasa etiketi
      const s = this.world.safe;
      if (s && !s.state.open && U.dist(p.cx, p.cy, s.x + s.w / 2, s.y) < 300) {
        D.text(ctx, p.hasKey ? RC.T('KASA  [E]', 'KASA  · DOKUN') : 'KASA  🔒', s.x + s.w / 2, s.y - 12, { size: 13, align: 'center', weight: 'bold', color: p.hasKey ? '#3ddc84' : '#ffc83d', stroke: 'rgba(0,0,0,0.8)', strokeW: 4 });
      }
    },

    drawIntroBanner(ctx, w, h) {
      const k = this.stateT;
      const a = k < 0.4 ? k / 0.4 : k > 2.2 ? Math.max(0, (2.6 - k) / 0.4) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, h / 2 - 70, w, 140);
      D.text(ctx, RC.L('BÖLÜM {n}', { n: this.cfg.id }), w / 2, h / 2 - 28, { size: 16, align: 'center', color: C.COLORS.red, weight: 'bold' });
      D.text(ctx, RC.L(this.cfg.name).toLocaleUpperCase(RC.I18N.lang === 'en' ? 'en-US' : 'tr-TR'), w / 2, h / 2 + 12, { size: 40, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      D.text(ctx, RC.L('{t} — Ev sahibini uyandırmadan en çok ganimeti kamyona yükle!', { t: U.formatTime(this.totalTime) }), w / 2, h / 2 + 44, { size: 16, align: 'center', color: '#dfe3f5' });
      ctx.globalAlpha = 1;
    },

    drawPause(ctx, w, h, t) {
      ctx.fillStyle = 'rgba(5,6,15,0.75)';
      ctx.fillRect(0, 0, w, h);
      D.text(ctx, 'DURAKLATILDI', w / 2, h / 2 - 150, { size: 44, font: C.FONT_TITLE, align: 'center', color: '#fff', shadow: true });
      D.text(ctx, RC.L(this.cfg.name), w / 2, h / 2 - 122, { size: 16, align: 'center', color: '#9aa3c7' });
      this.pauseMenu.draw(ctx, t);
    },
  };

  function priceTag(ctx, x, y, it, big) {
    const size = big ? 16 : 13;
    const txt = it.isKey ? 'KASA ANAHTARI' : U.formatMoney(it.value) + (it.appraisal !== 1 ? '  ×' + it.appraisal.toFixed(2) : '');
    ctx.font = `bold ${size}px ${C.FONT_UI}`;
    const name = big ? it.name : null;
    const tw = Math.max(ctx.measureText(txt).width, name ? ctx.measureText(name).width * 0.8 : 0);
    const w = tw + 20;
    const h = big ? 40 : 22;
    const bx = x - w / 2;
    const by = y - h;
    ctx.fillStyle = 'rgba(8,10,20,0.88)';
    U.fillRoundRect(ctx, bx, by, w, h, 7);
    ctx.strokeStyle = it.isKey ? C.COLORS.gold : it.rarity.color;
    ctx.lineWidth = 2;
    U.strokeRoundRect(ctx, bx, by, w, h, 7);
    ctx.fillStyle = 'rgba(8,10,20,0.88)';
    ctx.beginPath();
    ctx.moveTo(x - 6, by + h);
    ctx.lineTo(x, by + h + 7);
    ctx.lineTo(x + 6, by + h);
    ctx.fill();
    if (name) {
      D.text(ctx, name, x, by + 15, { size: 11, align: 'center', color: it.rarity.color, weight: 'bold' });
      D.text(ctx, txt, x, by + 33, { size, align: 'center', color: C.COLORS.gold, weight: 'bold' });
    } else {
      D.text(ctx, txt, x, by + 16, { size, align: 'center', color: it.isKey ? C.COLORS.gold : '#f2f4ff', weight: 'bold' });
    }
  }

  RC.Scenes = RC.Scenes || {};
  RC.Scenes.heist = Heist;
})(window.RC);
