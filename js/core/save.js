/* =========================================================================
 *  RED CRIME - Kayıt sistemi
 *  Ayarlar ve ilerleme tarayıcının localStorage alanında tutulur.
 *  localStorage erişilemezse oyun bellekte çalışmaya devam eder.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const KEY = 'redcrime.save.v1';

  function defaults() {
    return {
      version: 1,
      settings: {
        master: 0.8,
        music: 0.55,
        sfx: 0.9,
        quality: 'high', // low | medium | high
        shake: true,
        showFps: false,
        difficulty: 'normal', // easy | normal | hard
        mouseAim: true,
        noiseRings: true,
        hints: true,
        skipIntro: false,
        lang: 'tr', // tr | en
      },
      progress: {
        unlocked: 1,
        best: new Array(15).fill(0),
        stars: new Array(15).fill(0),
        wallet: 0,
        totalStolen: 0,
        itemsStolen: 0,
        busted: 0,
        heists: 0,
        safesOpened: 0,
        upgrades: { shoes: 0, flashlight: 0, bag: 0, strength: 0, safecracker: 0, lungs: 0 },
        seenBriefing: new Array(15).fill(false),
        tutorialDone: false,
        finalAttempts: 0,
        gameCompleted: false,
        discountCode: null,
        gadgets: { lockpick: 0, jammer: 0, sleepgas: 0, smoke: 0, emp: 0, pistol: 0 },
        perm: { nightvision: false, thermal: false, bribe: false },
      },
    };
  }

  const Save = {
    data: defaults(),
    available: true,

    load() {
      try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.data = RC.U.deepMerge(defaults(), parsed);
          // Eski kayıtlardaki kısa dizileri 10 bölüme tamamla
          const p = this.data.progress;
          const d = defaults().progress;
          for (const k of ['best', 'stars', 'seenBriefing']) {
            while (p[k].length < d[k].length) p[k].push(d[k][p[k].length]);
          }
        }
      } catch (e) {
        this.available = false;
        this.data = defaults();
      }
      this.applySettings();
      return this.data;
    },

    save() {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        this.available = false;
      }
    },

    reset() {
      const keepSettings = this.data.settings;
      this.data = defaults();
      this.data.settings = keepSettings;
      this.save();
    },

    get settings() {
      return this.data.settings;
    },
    get progress() {
      return this.data.progress;
    },

    setSetting(key, value) {
      this.data.settings[key] = value;
      this.applySettings();
      this.save();
    },

    applySettings() {
      const s = this.data.settings;
      if (RC.I18N) RC.I18N.lang = s.lang === 'en' ? 'en' : 'tr';
      if (RC.Audio) RC.Audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    },

    /** Bir soygunun sonucunu işler; yeni yıldız / rekor bilgisini döndürür. */
    recordHeist(levelIndex, value, stars, itemCount, safeOpened) {
      const p = this.data.progress;
      const res = { newBest: false, newStars: 0, unlockedNext: false };
      if (value > p.best[levelIndex]) {
        p.best[levelIndex] = value;
        res.newBest = true;
      }
      if (stars > p.stars[levelIndex]) {
        res.newStars = stars - p.stars[levelIndex];
        p.stars[levelIndex] = stars;
      }
      if (stars > 0 && p.unlocked < levelIndex + 2 && levelIndex + 1 < RC.Config.LEVELS.length) {
        p.unlocked = levelIndex + 2;
        res.unlockedNext = true;
      }
      p.wallet += value;
      p.totalStolen += value;
      p.itemsStolen += itemCount;
      p.heists += 1;
      if (safeOpened) p.safesOpened += 1;
      this.save();
      return res;
    },

    recordBusted() {
      this.data.progress.busted += 1;
      this.save();
    },

    gadgetCount(id) {
      return this.data.progress.gadgets[id] || 0;
    },

    hasPerm(id) {
      return !!this.data.progress.perm[id];
    },

    /** Karanlık ağdan satın alma */
    buyDark(def) {
      const p = this.data.progress;
      if (p.wallet < def.price) return false;
      if (def.perm) {
        if (p.perm[def.id]) return false;
        p.perm[def.id] = true;
      } else {
        p.gadgets[def.id] = (p.gadgets[def.id] || 0) + (def.pack || 1);
      }
      p.wallet -= def.price;
      this.save();
      return true;
    },

    useGadget(id) {
      const g = this.data.progress.gadgets;
      if (!g[id]) return false;
      g[id]--;
      this.save();
      return true;
    },

    upgradeLevel(id) {
      return this.data.progress.upgrades[id] || 0;
    },

    buyUpgrade(id) {
      const def = RC.Config.UPGRADES.find((u) => u.id === id);
      if (!def) return false;
      const lvl = this.upgradeLevel(id);
      if (lvl >= def.costs.length) return false;
      const cost = def.costs[lvl];
      if (this.data.progress.wallet < cost) return false;
      this.data.progress.wallet -= cost;
      this.data.progress.upgrades[id] = lvl + 1;
      this.save();
      return true;
    },
  };

  RC.Save = Save;
})(window.RC);
