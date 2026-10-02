/* =========================================================================
 *  RED CRIME - Soygun notu (S / A / B / C / D)
 *  100 puan: yıldızlar 60 · hiç görünmeden 12 · kimseyi uyandırmadan 8 ·
 *  hiçbir şey kırmadan 6 · polis çağrılmadan 6 · hızlı (sürenin %60'ı) 8.
 *  Yıldızsız (başarısız) soygun not almaz. Kayıtta 1..5 (D..S), 0 = not yok.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const GRADES = ['D', 'C', 'B', 'A', 'S'];
  const COLORS = { S: '#ffc83d', A: '#3ddc84', B: '#4aa8ff', C: '#b467ff', D: '#9aa3c7' };
  const S_REWARD = 0.1; // ilk S notunda hedefin %10'u kadar ödül

  const Rank = {
    GRADES,
    COLORS,

    /** p: sonuç parametreleri (stars, stats, timeUsed, timeTotal) */
    compute(p) {
      const st = p.stats || {};
      const fast = p.timeTotal > 0 && p.timeUsed <= p.timeTotal * 0.6;
      const checks = [
        { label: 'Hiç görünmeden', pts: 12, ok: !st.spotted },
        { label: 'Kimseyi uyandırmadan', pts: 8, ok: !st.woken },
        { label: 'Hiçbir şey kırmadan', pts: 6, ok: !st.broken },
        { label: 'Polis çağrılmadan', pts: 6, ok: !st.police },
        { label: 'Hızlı (sürenin %60\'ı)', pts: 8, ok: fast },
      ];
      if (!p.stars) return { grade: null, idx: 0, score: 0, checks };
      const score = p.stars * 20 + U_sum(checks.filter((c) => c.ok).map((c) => c.pts));
      const grade = score >= 92 ? 'S' : score >= 78 ? 'A' : score >= 62 ? 'B' : score >= 45 ? 'C' : 'D';
      return { grade, idx: GRADES.indexOf(grade) + 1, score, checks };
    },

    /** Kayıttaki not harfi (yoksa null) */
    best(levelIndex) {
      const v = (RC.Save.progress.ranks || [])[levelIndex] || 0;
      return v ? GRADES[v - 1] : null;
    },

    /** En iyi notu kaydeder; ilk S'de ödül verir. Dönüş: {newBest, reward} */
    record(levelIndex, idx) {
      const p = RC.Save.progress;
      if (!p.ranks) p.ranks = new Array(RC.Config.LEVELS.length).fill(0);
      const before = p.ranks[levelIndex] || 0;
      const res = { newBest: false, reward: 0 };
      if (idx > before) {
        p.ranks[levelIndex] = idx;
        res.newBest = true;
        if (idx === 5) {
          res.reward = Math.round((RC.Config.LEVELS[levelIndex].target * S_REWARD) / 1000) * 1000;
          p.wallet += res.reward;
        }
        RC.Save.save();
      }
      return res;
    },
  };

  function U_sum(arr) {
    return arr.reduce((s, v) => s + v, 0);
  }

  RC.Rank = Rank;
})(window.RC);
