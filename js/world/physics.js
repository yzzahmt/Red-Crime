/* =========================================================================
 *  RED CRIME - Fizik
 *  - Statik katı (solid) ve tek yönlü (oneway) platformlar için uzamsal ızgara
 *  - AABB hareket çözümü: alt adımlar, basamak çıkma, aşağı yapışma,
 *    tek yönlü platformlardan aşağı inme
 *  - Eşyalar için dinamik uzamsal ızgara
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;

  /* ---------------------------------------------------------------------
   * Statik ızgara
   * ------------------------------------------------------------------- */
  class StaticGrid {
    constructor(cell = 128) {
      this.cell = cell;
      this.map = new Map();
      this.all = [];
      this.stamp = 0;
    }
    key(cx, cy) {
      return cx * 73856093 + cy * 19349663;
    }
    add(b) {
      b._stamp = 0;
      this.all.push(b);
      const c = this.cell;
      const x0 = Math.floor(b.x / c);
      const x1 = Math.floor((b.x + b.w) / c);
      const y0 = Math.floor(b.y / c);
      const y1 = Math.floor((b.y + b.h) / c);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const k = this.key(cx, cy);
          let arr = this.map.get(k);
          if (!arr) {
            arr = [];
            this.map.set(k, arr);
          }
          arr.push(b);
        }
      }
      return b;
    }
    query(x, y, w, h, out = []) {
      out.length = 0;
      this.stamp++;
      const c = this.cell;
      const x0 = Math.floor(x / c);
      const x1 = Math.floor((x + w) / c);
      const y0 = Math.floor(y / c);
      const y1 = Math.floor((y + h) / c);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const arr = this.map.get(this.key(cx, cy));
          if (!arr) continue;
          for (let i = 0; i < arr.length; i++) {
            const b = arr[i];
            if (b._stamp === this.stamp) continue;
            b._stamp = this.stamp;
            if (b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y) out.push(b);
          }
        }
      }
      return out;
    }
  }

  /* ---------------------------------------------------------------------
   * Dinamik ızgara (eşyalar)
   * ------------------------------------------------------------------- */
  class DynamicGrid {
    constructor(cell = 96) {
      this.cell = cell;
      this.map = new Map();
      this.stamp = 0;
    }
    key(cx, cy) {
      return cx * 73856093 + cy * 19349663;
    }
    _cells(o) {
      const c = this.cell;
      return [Math.floor(o.x / c), Math.floor((o.x + o.w) / c), Math.floor(o.y / c), Math.floor((o.y + o.h) / c)];
    }
    insert(o) {
      const [x0, x1, y0, y1] = this._cells(o);
      o._gc = [x0, x1, y0, y1];
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const k = this.key(cx, cy);
          let s = this.map.get(k);
          if (!s) {
            s = new Set();
            this.map.set(k, s);
          }
          s.add(o);
        }
      }
    }
    remove(o) {
      if (!o._gc) return;
      const [x0, x1, y0, y1] = o._gc;
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const s = this.map.get(this.key(cx, cy));
          if (s) s.delete(o);
        }
      }
      o._gc = null;
    }
    update(o) {
      const [x0, x1, y0, y1] = this._cells(o);
      const g = o._gc;
      if (g && g[0] === x0 && g[1] === x1 && g[2] === y0 && g[3] === y1) return;
      this.remove(o);
      this.insert(o);
    }
    query(x, y, w, h, out = []) {
      out.length = 0;
      this.stamp++;
      const c = this.cell;
      const x0 = Math.floor(x / c);
      const x1 = Math.floor((x + w) / c);
      const y0 = Math.floor(y / c);
      const y1 = Math.floor((y + h) / c);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const s = this.map.get(this.key(cx, cy));
          if (!s) continue;
          for (const o of s) {
            if (o._qs === this.stamp) continue;
            o._qs = this.stamp;
            if (o.x < x + w && o.x + o.w > x && o.y < y + h && o.y + o.h > y) out.push(o);
          }
        }
      }
      return out;
    }
  }

  /* ---------------------------------------------------------------------
   * Hareket çözümü
   * body: {x, y, w, h, vx, vy, onGround, dropThrough, canStep, snap, crouch}
   * Dönüş: {landed, impact, hitWall, hitHead, ground}
   * ------------------------------------------------------------------- */
  const tmp = [];
  const tmp2 = [];
  const MAX_STEP_PX = 10;

  function moveBody(body, dt, grid, opts = {}) {
    const res = { landed: false, impact: 0, hitWall: false, hitHead: false, ground: null };
    const wasGround = body.onGround;
    body.onGround = false;
    body.ground = null;
    const stepUp = opts.stepUp == null ? 0 : opts.stepUp;

    const dist = Math.max(Math.abs(body.vx * dt), Math.abs(body.vy * dt));
    const steps = Math.max(1, Math.ceil(dist / MAX_STEP_PX));
    const sdt = dt / steps;

    for (let s = 0; s < steps; s++) {
      /* ---------- Yatay ---------- */
      const dx = body.vx * sdt;
      if (dx !== 0) {
        body.x += dx;
        grid.query(body.x, body.y, body.w, body.h, tmp);
        for (let i = 0; i < tmp.length; i++) {
          const b = tmp[i];
          if (b.type !== 'solid') continue;
          if (!U.rectsOverlapXYWH(body.x, body.y, body.w, body.h, b.x, b.y, b.w, b.h)) continue;
          const lift = body.y + body.h - b.y;
          if (stepUp > 0 && (wasGround || body.onGround) && lift > 0 && lift <= stepUp && body.vy >= 0 && spaceFree(body.x, b.y - body.h - 0.01, body.w, body.h, grid)) {
            body.y = b.y - body.h - 0.01;
            continue;
          }
          if (dx > 0) body.x = b.x - body.w - 0.001;
          else body.x = b.x + b.w + 0.001;
          body.vx = 0;
          res.hitWall = true;
        }
        // Tek yönlü basamaklara çıkma
        if (stepUp > 0 && body.canStep && !body.crouch && (wasGround || body.onGround) && body.dropThrough <= 0) {
          const bottom = body.y + body.h;
          grid.query(body.x, bottom - stepUp - 1, body.w, stepUp + 1, tmp);
          let best = null;
          for (let i = 0; i < tmp.length; i++) {
            const b = tmp[i];
            if (b.type !== 'oneway' || !b.step) continue;
            const lift = bottom - b.y;
            if (lift > 0.5 && lift <= stepUp) {
              const overlap = Math.min(body.x + body.w, b.x + b.w) - Math.max(body.x, b.x);
              if (overlap < body.w * 0.3) continue;
              if (!best || b.y > best.y) best = b;
            }
          }
          if (best && spaceFree(body.x, best.y - body.h - 0.01, body.w, body.h, grid)) {
            body.y = best.y - body.h - 0.01;
            body.onGround = true;
          }
        }
      }

      /* ---------- Dikey ---------- */
      const prevBottom = body.y + body.h;
      const dy = body.vy * sdt;
      body.y += dy;
      grid.query(body.x, body.y, body.w, body.h, tmp);
      for (let i = 0; i < tmp.length; i++) {
        const b = tmp[i];
        if (!U.rectsOverlapXYWH(body.x, body.y, body.w, body.h, b.x, b.y, b.w, b.h)) continue;
        if (b.type === 'solid') {
          if (dy > 0) {
            body.y = b.y - body.h;
            if (!body.onGround) {
              res.landed = true;
              res.impact = Math.max(res.impact, body.vy);
            }
            body.vy = 0;
            body.onGround = true;
            body.ground = b;
          } else if (dy < 0) {
            body.y = b.y + b.h;
            body.vy = 0;
            res.hitHead = true;
          }
        } else if (b.type === 'oneway') {
          if (dy >= 0 && prevBottom <= b.y + 1 && body.dropThrough <= 0 && !body.ignoreOneway) {
            body.y = b.y - body.h;
            if (!body.onGround) {
              res.landed = true;
              res.impact = Math.max(res.impact, body.vy);
            }
            body.vy = 0;
            body.onGround = true;
            body.ground = b;
          }
        }
      }
    }

    /* ---------- Zemine yapışma (merdiven inişleri) ---------- */
    if (!body.onGround && wasGround && body.snap && body.vy >= 0 && !body.ignoreOneway) {
      const bottom = body.y + body.h;
      const snapDist = opts.snap || 24;
      grid.query(body.x, bottom, body.w, snapDist, tmp2);
      let best = null;
      for (let i = 0; i < tmp2.length; i++) {
        const b = tmp2[i];
        if (b.type === 'oneway' && body.dropThrough > 0) continue;
        if (b.y >= bottom - 0.5 && b.y - bottom <= snapDist) {
          const overlap = Math.min(body.x + body.w, b.x + b.w) - Math.max(body.x, b.x);
          if (overlap < body.w * 0.25) continue;
          if (!best || b.y < best.y) best = b;
        }
      }
      if (best) {
        body.y = best.y - body.h;
        body.vy = 0;
        body.onGround = true;
        body.ground = best;
      }
    }

    if (body.dropThrough > 0) body.dropThrough -= dt;
    res.ground = body.ground;
    return res;
  }

  function spaceFree(x, y, w, h, grid) {
    grid.query(x, y, w, h, tmp2);
    for (let i = 0; i < tmp2.length; i++) {
      const b = tmp2[i];
      if (b.type === 'solid' && U.rectsOverlapXYWH(x, y, w, h, b.x, b.y, b.w, b.h)) return false;
    }
    return true;
  }

  /** Bir noktanın altındaki ilk yüzeyi bulur (eşya yerleştirme vb.) */
  function surfaceBelow(grid, x, y, maxDist = 2000, includeOneway = true) {
    grid.query(x - 1, y, 2, maxDist, tmp2);
    let best = null;
    for (const b of tmp2) {
      if (b.type === 'none' || (b.type === 'oneway' && !includeOneway)) continue;
      if (b.y >= y && (!best || b.y < best.y)) best = b;
    }
    return best;
  }

  /** İki nokta arasında görüş hattı var mı? (duvar/döşeme engeller) */
  function lineOfSight(grid, x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    grid.query(minX, minY, Math.abs(x2 - x1) + 1, Math.abs(y2 - y1) + 1, tmp2);
    for (const b of tmp2) {
      if (b.type !== 'solid' || !b.blocksSight) continue;
      if (U.segmentIntersectsRect(x1, y1, x2, y2, b)) return false;
    }
    return true;
  }

  /**
   * Işık konisi: (x, y) noktasından aim ± spread aralığına n ışın atar, her ışın
   * görüşü kapatan ilk katı cisimde (duvar, döşeme, kapalı kapı) durur.
   * Dönüş: koninin çokgen köşeleri [x0, y0, x1, y1, ...] (merkez hariç).
   */
  const coneTmp = [];
  const coneBoxes = [];
  const conePts = [];
  function castCone(grid, x, y, aim, spread, range, n) {
    // Koninin sınır kutusundaki adayları bir kez topla
    const a0 = aim - spread;
    const a1 = aim + spread;
    let minX = x;
    let maxX = x;
    let minY = y;
    let maxY = y;
    for (let i = 0; i <= 4; i++) {
      const a = a0 + ((a1 - a0) * i) / 4;
      const ex = x + Math.cos(a) * range;
      const ey = y + Math.sin(a) * range;
      if (ex < minX) minX = ex;
      if (ex > maxX) maxX = ex;
      if (ey < minY) minY = ey;
      if (ey > maxY) maxY = ey;
    }
    grid.query(minX, minY, maxX - minX + 1, maxY - minY + 1, coneTmp);
    coneBoxes.length = 0;
    for (const b of coneTmp) if (b.type === 'solid' && b.blocksSight) coneBoxes.push(b);
    conePts.length = 0;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      let best = range;
      for (let j = 0; j < coneBoxes.length; j++) {
        const t = rayBox(x, y, dx, dy, coneBoxes[j], best);
        if (t < best) best = t;
      }
      conePts.push(x + dx * best, y + dy * best);
    }
    return conePts;
  }

  /** Işın-dikdörtgen kesişimi (slab yöntemi); kesişme yoksa max döner */
  function rayBox(x, y, dx, dy, b, max) {
    let tmin = 0;
    let tmax = max;
    if (Math.abs(dx) < 1e-9) {
      if (x < b.x || x > b.x + b.w) return max;
    } else {
      let t1 = (b.x - x) / dx;
      let t2 = (b.x + b.w - x) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return max;
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < b.y || y > b.y + b.h) return max;
    } else {
      let t1 = (b.y - y) / dy;
      let t2 = (b.y + b.h - y) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return max;
    }
    // Işık kaynağı bir cismin içindeyse (ör. kapı eşiği) o cismi yok say
    return tmin > 0 ? tmin : max;
  }

  RC.Physics = { StaticGrid, DynamicGrid, moveBody, spaceFree, surfaceBelow, lineOfSight, castCone };
})(window.RC);
