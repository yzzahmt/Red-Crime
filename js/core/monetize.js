/* =========================================================================
 *  RED CRIME - Reklamlar (AdMob) ve uygulama içi satın alma
 *  Yalnızca Android / iOS uygulamasında çalışır (Capacitor eklentileri:
 *  @capacitor-community/admob, @capgo/native-purchases). Tarayıcı ve
 *  masaüstünde reklam yoktur, mağaza "yalnızca mobil" der.
 *  Geliştirme: tarayıcıda ?iaptest=1 satın almaları taklit eder.
 *
 *  Premium: reklamsız, soygunda +60 sn, +10 çuval yuvası, günlük para ödülü.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const C = RC.Config;
  const M = C.MONETIZATION;
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const os = native ? cap.getPlatform() : 'web';
  const fakeStore = !native && /[?&]iaptest=1/.test(location.search);

  function plugin(name) {
    if (!native) return null;
    const p = cap.Plugins && cap.Plugins[name];
    if (p) return p;
    return cap.registerPlugin ? cap.registerPlugin(name) : null;
  }

  const premium = () => !!RC.Save.progress.premium;
  /** Yerel tarih (YYYY-AA-GG): günlük hediye gece yarısı yenilenir (UTC değil) */
  const today = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  /** Android'de ödemesi henüz tamamlanmamış (bekleyen) işlem mi */
  const pending = (t) => os === 'android' && t && t.purchaseState != null && String(t.purchaseState) !== '1';

  /* =====================================================================
   * REKLAMLAR
   * =================================================================== */
  const Ads = {
    ready: false,
    bannerShown: false,
    rewardedLoaded: false,
    interLoaded: false,
    bannerH: 0,

    // Premium'da ya da gizlilik / KVKK onayı yokken (geri çekildiyse) reklam yok
    get enabled() {
      return native && !!this.plugin && !premium() && RC.Privacy.accepted;
    },
    unit(kind) {
      return (M.admob[os] || {})[kind];
    },

    async init() {
      this.plugin = plugin('AdMob');
      if (!this.plugin || premium()) return;
      const A = this.plugin;
      try {
        await A.initialize({ initializeForTesting: M.admob.testing });
        // AB / KVKK rıza formu (Google UMP). Gerekmiyorsa hemen döner.
        try {
          const info = await A.requestConsentInfo();
          if (info.isConsentFormAvailable && info.status === 'REQUIRED') await A.showConsentForm();
        } catch (e) {
          /* rıza formu yoksa reklam yine kişiselleştirilmemiş gelir */
        }
        // iOS: izleme izni (App Tracking Transparency)
        if (os === 'ios') {
          try {
            const st = await A.trackingAuthorizationStatus();
            if (st.status === 'notDetermined') await A.requestTrackingAuthorization();
          } catch (e) {
            /* eski iOS */
          }
        }
        A.addListener('bannerAdSizeChanged', (s) => this.setBannerH(s && s.height ? s.height : 0));
        // Tam ekran reklam kapandığında bekleyen gösterimi bitir, yenisini yükle.
        // (Eklenti ödüllü reklamda yalnızca ödül kazanılınca yanıt verir; erken
        // kapatılırsa "kapandı" olayı olmadan oyun sonsuza dek beklerdi.)
        const closed = () => {
          const f = this.onClosed;
          this.onClosed = null;
          if (f) f();
        };
        A.addListener('onRewardedVideoAdDismissed', () => {
          closed();
          this.loadRewarded();
        });
        A.addListener('onRewardedVideoAdFailedToShow', () => {
          closed();
          this.loadRewarded();
        });
        A.addListener('interstitialAdDismissed', () => {
          closed();
          this.loadInterstitial();
        });
        A.addListener('interstitialAdFailedToShow', () => {
          closed();
          this.loadInterstitial();
        });
        this.ready = true;
        this.loadRewarded();
        this.loadInterstitial();
        this.onScene(RC.Game.currentName);
      } catch (e) {
        console.warn('AdMob başlatılamadı', e);
      }
    },

    /** Banner açıkken oyun alanı banner kadar kısalır (üstüne binmez) */
    setBannerH(h) {
      this.bannerH = h;
      document.documentElement.style.setProperty('--adb', (this.bannerShown ? h : 0) + 'px');
      if (RC.Game.canvas) RC.Game.resize();
    },

    /** Sahne değişiminde çağrılır: banner yalnızca menülerde */
    onScene(name) {
      if (!this.ready) return;
      const want = this.enabled && M.BANNER_SCENES.includes(name);
      if (want === this.bannerShown) return;
      this.bannerShown = want;
      if (want) {
        this.plugin.showBanner({ adId: this.unit('banner'), adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: M.admob.testing }).catch(() => {});
      } else {
        this.plugin.removeBanner().catch(() => {});
        this.setBannerH(0);
      }
    },

    loadRewarded() {
      if (!this.ready || premium()) return;
      this.rewardedLoaded = false;
      this.plugin
        .prepareRewardVideoAd({ adId: this.unit('rewarded'), isTesting: M.admob.testing })
        .then(() => (this.rewardedLoaded = true))
        .catch(() => setTimeout(() => this.loadRewarded(), 30000));
    },
    loadInterstitial() {
      if (!this.ready || premium()) return;
      this.interLoaded = false;
      this.plugin
        .prepareInterstitial({ adId: this.unit('interstitial'), isTesting: M.admob.testing })
        .then(() => (this.interLoaded = true))
        .catch(() => setTimeout(() => this.loadInterstitial(), 30000));
    },

    /** Ödüllü reklam hazır mı (premium'da gösterilmez) */
    canReward() {
      return (this.enabled && this.rewardedLoaded) || (fakeStore && !premium());
    },
    /**
     * Tam ekran reklamı göster, KAPANANA kadar bekle (müzik bu sürede kısık).
     * show: eklenti çağrısı. Sonuç: ödül kazanıldıysa true.
     */
    showFullscreen(show) {
      return new Promise((resolve) => {
        let rewarded = false;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(guard);
          RC.Audio.setMusicDuck(1);
          resolve(rewarded);
        };
        // Olay hiç gelmezse oyun kilitli kalmasın
        const guard = setTimeout(finish, 120000);
        RC.Audio.setMusicDuck(0);
        // Ödül olayı kapanıştan hemen sonra gelebilir: kısa bir pay bırak
        this.onClosed = () => setTimeout(finish, 400);
        show().then(
          (r) => {
            if (r && r.type !== undefined) rewarded = true;
          },
          () => finish()
        );
      });
    },

    /** Ödüllü reklam: sonuna kadar izlenip ödül kazanılırsa true döner */
    async showRewarded() {
      if (fakeStore) return true;
      if (!this.canReward()) return false;
      this.rewardedLoaded = false;
      return this.showFullscreen(() => this.plugin.showRewardVideoAd());
    },

    /** Her INTERSTITIAL_EVERY soygunda bir, sonuç ekranından çıkarken */
    async maybeInterstitial() {
      if (!this.enabled || !this.interLoaded) return;
      if (RC.Save.progress.heists % M.INTERSTITIAL_EVERY !== 0) return;
      this.interLoaded = false;
      await this.showFullscreen(() => this.plugin.showInterstitial());
    },

    /** Premium alınınca ya da gizlilik onayı geri çekilince banner'ı kaldır */
    disableAll() {
      if (!this.ready) return;
      this.bannerShown = false;
      this.plugin.removeBanner().catch(() => {});
      this.setBannerH(0);
    },
    /** Gizlilik onayı yeniden verildi: banner kuralı tekrar uygulanır */
    resume() {
      if (!this.ready) return this.init();
      if (!this.rewardedLoaded) this.loadRewarded();
      if (!this.interLoaded) this.loadInterstitial();
      this.onScene(RC.Game.currentName);
      return Promise.resolve();
    },
  };

  /* =====================================================================
   * SATIN ALMA
   * =================================================================== */
  const IAP = {
    prices: {}, // ürün kimliği → mağazadan gelen yerel fiyat ("₺5,00")
    busy: false,

    get available() {
      return (native && !!this.plugin) || fakeStore;
    },
    /** Mağaza bu platformda var mı (masaüstü / tarayıcıda gizlenir) */
    get supported() {
      return native || fakeStore;
    },
    price(id, fallback) {
      return this.prices[id] || fallback;
    },

    async init() {
      this.plugin = plugin('NativePurchases');
      if (!this.plugin) return;
      try {
        const ok = await this.plugin.isBillingSupported();
        if (ok && ok.isBillingSupported === false) {
          this.plugin = null;
          return;
        }
      } catch (e) {
        /* bazı sürümlerde yok */
      }
      const ids = [...M.CASH_PACKS.map((p) => p.id), M.PREMIUM.id];
      try {
        const { products } = await this.plugin.getProducts({ productIdentifiers: ids, productType: 'inapp' });
        for (const p of products || []) if (p.priceString) this.prices[p.identifier] = p.priceString;
      } catch (e) {
        console.warn('Ürünler alınamadı', e);
      }
      await this.syncOwned(false);
    },

    /**
     * Sahip olunan satın alımlar: premium'u geri yükler; Android'de ödemesi
     * alınmış ama uygulama kapandığı için teslim edilmemiş para paketlerini
     * teslim edip tüketir.
     */
    async syncOwned(announce) {
      if (!this.plugin) return false;
      let found = false;
      try {
        const { purchases } = await this.plugin.getPurchases({ productType: 'inapp' });
        for (const t of purchases || []) {
          // Android: yalnızca ödemesi tamamlanmış ("1") işlemler; bekleyen ödeme teslim edilmez
          if (pending(t)) continue;
          if (t.productIdentifier === M.PREMIUM.id) {
            if (!premium()) this.grantPremium();
            found = true;
          }
          const pack = M.CASH_PACKS.find((p) => p.id === t.productIdentifier);
          if (pack && os === 'android' && t.purchaseToken) {
            this.grantCash(pack, t.purchaseToken);
            this.plugin.consumePurchase({ purchaseToken: t.purchaseToken }).catch(() => {});
          }
        }
      } catch (e) {
        if (announce) console.warn('Satın alımlar okunamadı', e);
      }
      return found;
    },

    /** Aynı işlem iki kez para vermesin */
    grantCash(pack, txId) {
      const pr = RC.Save.progress;
      if (txId) {
        if (pr.grantedTx.includes(txId)) return false;
        pr.grantedTx.push(txId);
        if (pr.grantedTx.length > 200) pr.grantedTx.shift();
      }
      pr.wallet += pack.money;
      RC.Save.save();
      return true;
    },

    grantPremium() {
      RC.Save.progress.premium = true;
      RC.Save.save();
      Ads.disableAll();
    },

    /** Para paketi satın al. Sonuç: 'ok' | 'cancel' | 'error' | 'unavailable' */
    async buyCash(pack) {
      if (this.busy) return 'error';
      if (fakeStore) {
        this.grantCash(pack, null);
        return 'ok';
      }
      if (!this.plugin) return 'unavailable';
      this.busy = true;
      try {
        const t = await this.plugin.purchaseProduct({ productIdentifier: pack.id, productType: 'inapp', quantity: 1, isConsumable: true });
        // Bekleyen ödeme (ör. nakit / havale): para tamamlanınca, sonraki açılışta verilir (syncOwned)
        if (pending(t)) return 'pending';
        this.grantCash(pack, t.purchaseToken || t.transactionId);
        return 'ok';
      } catch (e) {
        return /cancel/i.test(String((e && (e.code || e.message)) || e)) ? 'cancel' : 'error';
      } finally {
        this.busy = false;
      }
    },

    async buyPremium() {
      if (premium()) return 'ok';
      if (this.busy) return 'error';
      if (fakeStore) {
        this.grantPremium();
        return 'ok';
      }
      if (!this.plugin) return 'unavailable';
      this.busy = true;
      try {
        const t = await this.plugin.purchaseProduct({ productIdentifier: M.PREMIUM.id, productType: 'inapp', quantity: 1 });
        if (pending(t)) return 'pending';
        this.grantPremium();
        return 'ok';
      } catch (e) {
        return /cancel/i.test(String((e && (e.code || e.message)) || e)) ? 'cancel' : 'error';
      } finally {
        this.busy = false;
      }
    },

    /** "Satın alımları geri yükle" (App Store kuralı gereği zorunlu) */
    async restore() {
      if (fakeStore) return premium();
      if (!this.plugin) return false;
      try {
        await this.plugin.restorePurchases();
      } catch (e) {
        /* Android'de gerekmez */
      }
      return this.syncOwned(true);
    },

    /** Premium günlük ödül: bugün alınmadıysa verir, miktarı döner */
    claimDaily() {
      const pr = RC.Save.progress;
      if (!pr.premium || pr.lastDaily === today()) return 0;
      pr.lastDaily = today();
      pr.wallet += M.DAILY_BONUS;
      RC.Save.save();
      return M.DAILY_BONUS;
    },
  };

  RC.Ads = Ads;
  RC.IAP = IAP;
  RC.Premium = {
    get active() {
      return premium();
    },
    get time() {
      return premium() ? M.PREMIUM_TIME : 0;
    },
    get bag() {
      return premium() ? M.PREMIUM_BAG : 0;
    },
  };

  /** Oyun hazır olunca (main.js) çağrılır */
  RC.initMonetization = function () {
    IAP.init().catch(() => {});
    // Reklamlar gizlilik / KVKK onayından sonra başlar (js/scenes/privacy.js)
    if (RC.Privacy.accepted) Ads.init().catch(() => {});
  };
})(window.RC);
