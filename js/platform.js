/* =========================================================================
 *  RED CRIME - Platform köprüsü
 *  Aynı web kodu üç yerde çalışır:
 *    tarayıcı · masaüstü (Electron: Steam için Windows / macOS / Linux)
 *    mobil (Capacitor: Android / iOS)
 * ========================================================================= */
(function (RC) {
  'use strict';

  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugins = (cap && cap.Plugins) || {};

  const Platform = {
    desktop: !!window.RCDesktop,
    native,
    os: native ? cap.getPlatform() : window.RCDesktop ? window.RCDesktop.platform : 'web',
    /** Oyundan çıkış düğmesi gösterilsin mi (iOS kuralları gereği iOS'ta yok) */
    get canQuit() {
      return this.desktop || this.os === 'android';
    },
    quit() {
      if (this.desktop) window.RCDesktop.quit();
      else if (plugins.App) plugins.App.exitApp();
    },
    /** Dış bağlantıyı sistem tarayıcısında aç (oyun penceresi yerinde kalır) */
    openURL(url) {
      if (this.desktop && window.RCDesktop.openURL) window.RCDesktop.openURL(url);
      else if (native) window.location.href = url; // Capacitor dış adresi sistem tarayıcısına yollar
      else window.open(url, '_blank', 'noopener');
    },
    init() {
      if (!native) return;
      document.documentElement.classList.add('native');
      if (plugins.StatusBar) plugins.StatusBar.hide().catch(() => {});
      // Android geri tuşu: ESC gibi davranır; ana menüdeyse uygulamadan çıkar
      if (plugins.App) {
        plugins.App.addListener('backButton', () => {
          if (RC.Game.currentName === 'menu') plugins.App.exitApp();
          else RC.Touch.pulse('Escape');
        });
      }
    },
  };

  RC.Platform = Platform;
  Platform.init();
})(window.RC);
