/* =========================================================================
 *  RED CRIME - Dil sistemi (Türkçe / English)
 *  Kaynak dil Türkçe'dir; İngilizce çeviriler Türkçe metinle anahtarlanır.
 *  RC.L('Metin {x}', {x: 5}) → seçili dile göre çevirir ve yer tutucuları doldurur.
 *  Draw.text / Draw.speech / Draw.key otomatik olarak RC.L uygular.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const I18N = {
    lang: 'tr',
    EN: {},
    missing: new Set(),
  };

  RC.L = function (s, vars) {
    if (s == null) return '';
    let out = String(s);
    if (I18N.lang === 'en') {
      const tr = I18N.EN[out];
      if (tr !== undefined) out = tr;
      else if (/[ğüşıöçĞÜŞİÖÇ]/.test(out) && !vars) I18N.missing.add(out);
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return out;
  };

  /** Otomatik çeviride, zaten İngilizceye çevrilmiş metni tekrar çevirmemek için */
  RC.Lx = function (s) {
    if (I18N.lang !== 'en' || typeof s !== 'string') return s;
    const tr = I18N.EN[s];
    return tr !== undefined ? tr : s;
  };

  RC.setLang = function (lang) {
    I18N.lang = lang === 'en' ? 'en' : 'tr';
    document.documentElement.lang = I18N.lang;
    if (RC.Save && RC.Save.data) {
      RC.Save.data.settings.lang = I18N.lang;
      RC.Save.save();
    }
  };

  RC.I18N = I18N;
})(window.RC);
