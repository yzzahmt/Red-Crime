/* =========================================================================
 *  RED CRIME - Prosedürel bölüm üretici
 *  Bölüm yapılandırmasından (katlar, genişlik, bahçe, bodrum...) tam bir ev
 *  üretir: döşemeler, duvarlar, merdivenler, bodrum merdiveni, odalar,
 *  mobilyalar, pencereler, lambalar, gıcırdayan tahtalar, bahçe, havuz,
 *  kulübe, kasa, anahtar ve BİNLERCE eşya.
 * ========================================================================= */
(function (RC) {
  'use strict';

  const U = RC.U;
  const C = RC.Config;
  const FD = () => RC.Furniture.DEFS;

  const THEMES = {
    cozy: {
      wood: ['#8a5a34', '#a0703a', '#7a4a2a'],
      fabric: ['#7a8fb0', '#b0706a', '#6a9a7a', '#a08a5a'],
      accent: ['#e8b04a', '#c23a55', '#4a8fc0'],
      cabinet: '#e8e0cc',
      top: '#6a4a2a',
      appliance: '#f0ece0',
      curtain: ['#8a1b2a', '#2a4d8f', '#6a7a3a'],
      floor: '#8a5a3a',
      stone: '#b8a890',
    },
    classic: {
      wood: ['#6b3f22', '#8a5a34', '#5b3a24'],
      fabric: ['#8a2a2a', '#2a4a6a', '#5a6a3a', '#7a5a8a'],
      accent: ['#ffd24a', '#e8283c'],
      cabinet: '#d9d0bc',
      top: '#2a2a30',
      appliance: '#e8e8ec',
      curtain: ['#6a1b2a', '#1b3a5a'],
      floor: '#6b4428',
      stone: '#a89f90',
    },
    modern: {
      wood: ['#c9a57a', '#e0c9a6', '#3a3a40'],
      fabric: ['#5a6070', '#c0c4cc', '#2a3a4a', '#d06a4a'],
      accent: ['#4aa8ff', '#ff8c2e', '#3ddc84'],
      cabinet: '#f4f4f6',
      top: '#1a1a1e',
      appliance: '#d9dde4',
      curtain: ['#c0c4cc', '#5a6070'],
      floor: '#b8966a',
      stone: '#c8c8cc',
    },
    luxury: {
      wood: ['#3a2418', '#5b3a24', '#1a1a1e'],
      fabric: ['#1b2a5a', '#5a1b2a', '#2a5a4a', '#e8e0cc'],
      accent: ['#ffd24a', '#c0c4cc'],
      cabinet: '#2a2a30',
      top: '#e8e4dc',
      appliance: '#c0c4cc',
      curtain: ['#5a1b2a', '#1b2a5a', '#3a2a1a'],
      floor: '#4a3020',
      stone: '#e8e4dc',
    },
    gallery: {
      wood: ['#2a2a30', '#c9a57a', '#e0d0b0'],
      fabric: ['#8a1b2a', '#2a2a30', '#e8e0cc', '#1b3a5a'],
      accent: ['#ffd24a', '#e8283c'],
      cabinet: '#f4f4f6',
      top: '#1a1a1e',
      appliance: '#d9dde4',
      curtain: ['#8a1b2a', '#2a2a30'],
      floor: '#c8b89a',
      stone: '#f0ece4',
    },
    sport: {
      wood: ['#3a3a40', '#c9a57a', '#1f4a2c'],
      fabric: ['#1f7a4a', '#e8e8ec', '#2a3a5a', '#e8283c'],
      accent: ['#ffd24a', '#3ddc84', '#4aa8ff'],
      cabinet: '#f4f4f6',
      top: '#1a1a1e',
      appliance: '#c0c4cc',
      curtain: ['#1f4a2c', '#2a3a5a'],
      floor: '#a88a64',
      stone: '#d8d8dc',
    },
    waterfront: {
      wood: ['#6b3f22', '#8a5a34', '#e8dcc0'],
      fabric: ['#2a4d8f', '#e8e0cc', '#8a2a3a', '#4a6a5a'],
      accent: ['#ffd24a', '#4aa8ff'],
      cabinet: '#f0e8d8',
      top: '#3a2a20',
      appliance: '#e8e8ec',
      curtain: ['#2a4d8f', '#e8e0cc', '#8a2a3a'],
      floor: '#7a5230',
      stone: '#e8e0d0',
    },
    oligarch: {
      wood: ['#1a1a1e', '#3a2418', '#8a6a2a'],
      fabric: ['#5a0a1a', '#1a1a2a', '#8a6a2a', '#2a2a30'],
      accent: ['#ffd24a', '#c0c4cc'],
      cabinet: '#1a1a1e',
      top: '#d9c9a0',
      appliance: '#2a2a30',
      curtain: ['#5a0a1a', '#8a6a2a', '#1a1a2a'],
      floor: '#2a1a12',
      stone: '#e8e0c8',
    },
    mansion: {
      wood: ['#5b3a24', '#6b3f22', '#3a2418'],
      fabric: ['#6a1b2a', '#1b3a5a', '#3a5a2a', '#8a6a2a'],
      accent: ['#ffd24a', '#e8283c', '#c0c4cc'],
      cabinet: '#e8e0cc',
      top: '#3a2a20',
      appliance: '#e8e8ec',
      curtain: ['#6a1b2a', '#8a6a2a', '#1b3a5a'],
      floor: '#5a3a24',
      stone: '#d8d0c0',
    },
  };

  /** Oda tipine göre mobilya listeleri (sıralı öncelik) */
  const ROOM_FURNITURE = {
    living: ['sofa', 'tvstand', 'bookshelf', 'coffeetable', 'armchair', 'vitrine', 'fireplace', 'plantstand', 'grandclock', 'armchair'],
    kitchen: ['counter', 'fridge', 'stove', 'counter', 'rack'],
    dining: ['diningtable', 'vitrine', 'consoletable', 'grandclock', 'plantstand'],
    hall: ['consoletable', 'pedestal', 'grandclock', 'plantstand', 'chest', 'pedestal'],
    bedroom: ['bed', 'nightstand', 'wardrobe', 'dresser', 'bookshelf'],
    master: ['doublebed', 'nightstand', 'wardrobe', 'vanity', 'dresser', 'nightstand'],
    kids: ['bunkbed', 'toychest', 'desk', 'bookshelf', 'toychest'],
    study: ['desk', 'bookshelf', 'globestand', 'bookshelf', 'chest', 'vitrine'],
    library: ['bookshelf', 'bookshelf', 'armchair', 'bookshelf', 'globestand', 'pedestal', 'bookshelf'],
    bathroom: ['bathtub', 'sink', 'toilet', 'bathshelf', 'washer'],
    storage: ['rack', 'boxes', 'rack', 'chest', 'furnace', 'boxes'],
    wine: ['winerack', 'boxes', 'winerack', 'chest', 'winerack'],
    workshop: ['workbench', 'rack', 'boxes', 'rack'],
    game: ['pooltable', 'bar', 'tvstand', 'armchair', 'vitrine'],
    treasure: ['vitrine', 'pedestal', 'vitrine', 'pedestal', 'chest', 'pedestal', 'vitrine'],
    dressing: ['wardrobe', 'vanity', 'wardrobe', 'dresser', 'wardrobe'],
    music: ['piano', 'drumkit', 'bookshelf', 'armchair', 'plantstand'],
    gallery: ['pedestal', 'vitrine', 'pedestal', 'armchair', 'pedestal', 'vitrine', 'pedestal'],
    showroom: ['displaycase', 'vitrine', 'displaycase', 'cashdesk', 'vitrine', 'displaycase'],
    techshow: ['techstand', 'vitrine', 'techstand', 'rack', 'techstand'],
    office: ['desk', 'bookshelf', 'chest', 'consoletable', 'plantstand'],
    security: ['cot', 'monitors', 'rack', 'nightstand'],
    vault: ['lockers', 'lockers', 'vitrine', 'chest'],
    lobby: ['bankcounter', 'plantstand', 'consoletable', 'armchair'],
    exhibit: ['pedestal', 'vitrine', 'pedestal', 'displaycase', 'pedestal'],
    cashier: ['cashdesk', 'bankcounter', 'rack'],
    trophy: ['vitrine', 'vitrine', 'tvstand', 'armchair', 'vitrine'],
    gym: ['rack', 'boxes', 'rack', 'chest'],
  };

  /** Boşlukları dolduran ek mobilyalar */
  const FILLER = {
    living: ['bookshelf', 'vitrine', 'consoletable', 'plantstand'],
    kitchen: ['rack', 'counter'],
    dining: ['vitrine', 'consoletable', 'plantstand'],
    hall: ['consoletable', 'pedestal', 'bookshelf'],
    bedroom: ['dresser', 'bookshelf', 'nightstand'],
    master: ['dresser', 'vitrine', 'nightstand'],
    kids: ['bookshelf', 'toychest', 'nightstand'],
    study: ['bookshelf', 'vitrine', 'chest'],
    library: ['bookshelf', 'vitrine'],
    bathroom: ['bathshelf', 'washer'],
    storage: ['rack', 'boxes', 'chest'],
    wine: ['winerack', 'chest'],
    workshop: ['rack', 'workbench'],
    game: ['vitrine', 'bookshelf', 'armchair'],
    treasure: ['vitrine', 'pedestal', 'chest'],
    dressing: ['dresser', 'wardrobe', 'vanity'],
    music: ['bookshelf', 'plantstand', 'armchair'],
    gallery: ['pedestal', 'vitrine'],
    showroom: ['displaycase', 'vitrine'],
    techshow: ['techstand', 'rack'],
    office: ['bookshelf', 'chest', 'dresser'],
    security: ['rack', 'boxes'],
    vault: ['lockers', 'chest'],
    lobby: ['plantstand', 'armchair'],
    exhibit: ['pedestal', 'vitrine'],
    cashier: ['cashdesk', 'rack'],
    trophy: ['vitrine', 'bookshelf'],
    gym: ['rack', 'boxes'],
  };

  /** Üstüne başka eşya konabilen yassı eşyalar */
  const STACKABLE = new Set(['bookset', 'cash', 'plate', 'tileplate', 'record', 'stamps', 'lokum', 'cigarbox', 'jewelbox', 'laptop', 'console', 'wallet', 'coins', 'goldbar', 'tray', 'cartridge', 'keyboard', 'can', 'toolbox', 'musicbox', 'makeup', 'bricks', 'chessset', 'typewriter', 'medkit', 'cheese', 'microwave', 'radio', 'turntable', 'projector', 'speaker']);

  const SHELF_FURN = new Set(['bookshelf', 'vitrine', 'rack', 'winerack', 'bathshelf', 'wallshelf']);

  /* =====================================================================
   * ÜRETİCİ
   * =================================================================== */
  function generate(levelIndex, seed) {
    const cfg = C.LEVELS[levelIndex];
    const rng = new U.RNG(seed == null ? cfg.seed : seed);
    const theme = THEMES[cfg.theme] || THEMES.cozy;
    const FH = C.FLOOR_H;
    const SLAB = C.SLAB;
    const WALL = C.WALL;

    const W = {
      cfg,
      levelIndex,
      theme,
      grid: new RC.Physics.StaticGrid(128),
      solids: [],
      floors: [],
      floorByK: {},
      rooms: [],
      stairs: [],
      ladders: [],
      furniture: [],
      hideSpots: [],
      items: [],
      itemGrid: new RC.Physics.DynamicGrid(96),
      lamps: [],
      windows: [],
      decor: [],
      creaky: [],
      bedSpots: [],
      surfaces: [],
      pool: null,
      shed: null,
      dog: null,
      safe: null,
      keyItem: null,
      valueTotal: 0,
    };

    /* ------------------------ Ana ölçüler ------------------------ */
    const streetX0 = -300;
    const gardenX0 = C.STREET_W;
    const houseX = gardenX0 + cfg.garden;
    const houseW = cfg.width;
    const houseR = houseX + houseW;
    const innerL = houseX + WALL;
    const innerR = houseR - WALL;
    const backyard = 520;
    const worldR = houseR + backyard;
    const topY = -cfg.floors * FH;
    W.house = { x: houseX, w: houseW, r: houseR, innerL, innerR, floors: cfg.floors, basement: cfg.basement, topY };
    W.garden = { x0: gardenX0, x1: houseX };
    W.street = { x0: streetX0, x1: gardenX0 };
    W.backyard = { x0: houseR, x1: worldR };
    W.bounds = { x: streetX0, y: topY - 320, w: worldR - streetX0, h: (cfg.basement ? FH + 120 : 160) - (topY - 320) };

    const addSolid = (x, y, w, h, props = {}) => {
      if (w <= 0 || h <= 0) return null;
      const b = Object.assign({ x, y, w, h, type: 'solid', blocksSight: true }, props);
      W.solids.push(b);
      W.grid.add(b);
      return b;
    };
    const addOneway = (x, y, w, props = {}) => {
      if (w <= 0) return null;
      const b = Object.assign({ x, y, w, h: 6, type: 'oneway', blocksSight: false }, props);
      W.solids.push(b);
      W.grid.add(b);
      return b;
    };

    /* ------------------------ Havuz (bahçe) ------------------------ */
    const groundHoles = [];
    if (cfg.pool) {
      const pw = 520;
      const px = gardenX0 + Math.floor(cfg.garden * 0.55);
      W.pool = { x0: px, x1: px + pw, y0: 18, y1: 110, depth: 110 };
      groundHoles.push([px, px + pw]);
    }
    if (cfg.basement) groundHoles.push([houseX, houseR]);

    /* ------------------------ Zemin ------------------------ */
    {
      let cursor = streetX0 - 800;
      const endX = worldR + 800;
      groundHoles.sort((a, b) => a[0] - b[0]);
      for (const [h0, h1] of groundHoles) {
        addSolid(cursor, 0, h0 - cursor, 900, { kind: 'ground' });
        cursor = h1;
      }
      addSolid(cursor, 0, endX - cursor, 900, { kind: 'ground' });
      if (W.pool) addSolid(W.pool.x0, W.pool.y1, W.pool.x1 - W.pool.x0, 800, { kind: 'poolbed' });
    }

    /* ------------------------ Katlar ------------------------ */
    const kList = [];
    if (cfg.basement) kList.push(-1);
    for (let k = 0; k < cfg.floors; k++) kList.push(k);
    const floorY = (k) => (k === -1 ? FH : -k * FH);
    W.floorY = floorY;

    // Merdiven geometrisi
    const nSteps = Math.round(FH / C.STEP_H);
    const run = (nSteps - 1) * C.STEP_W;
    const stairEnd = (k) => (k % 2 === 0 ? 'R' : 'L');
    const stairInfo = (k) => {
      const end = stairEnd(k);
      if (end === 'R') {
        const xb = innerR - 40;
        const xt = xb - run;
        return { end, xb, xt, x0: xt, x1: xb, hole: [xt, innerR] };
      }
      const xb = innerL + 40;
      const xt = xb + run;
      return { end, xb, xt, x0: xb, x1: xt, hole: [innerL, xt] };
    };

    // Bodrum merdiveni (el merdiveni)
    let ladder = null;
    if (cfg.basement) {
      const lx = Math.round(houseX + houseW * 0.42);
      ladder = { x: lx, w: 44, yTop: -8, yBottom: FH, k0: -1, k1: 0, hole: [lx - 30, lx + 30] };
      W.ladders.push(ladder);
    }

    for (const k of kList) {
      const y = floorY(k);
      const f = { k, y, ceil: y - FH + SLAB, rooms: [], blocked: [] };
      W.floors.push(f);
      W.floorByK[k] = f;

      // Döşeme
      if (k === -1) {
        // Bodrum zemini: dış zemin [houseX, houseR] aralığında delik bırakır,
        // bu yüzden bodrumun kendi katı zemini olmalı. Zemin blokları kadar
        // derin (y=900'e kadar) tutulur; ince bir levha hızlı düşüşte tünellemeye açıktır.
        addSolid(houseX, FH, houseW, 900 - FH, { kind: 'basementFloor', floorK: -1 });
        addSolid(houseX, SLAB, WALL, FH - SLAB, { kind: 'wall' });
        addSolid(houseR - WALL, SLAB, WALL, FH - SLAB, { kind: 'wall' });
        f.walk = [innerL + 24, innerR - 24];
        continue;
      }

      // Bu kattaki döşeme (k=0 ve bodrum yoksa zemin zaten var)
      const holes = [];
      if (k >= 1) {
        const si = stairInfo(k - 1);
        holes.push(si.hole);
      }
      if (k === 0 && ladder) holes.push(ladder.hole);
      if (k >= 1 || (k === 0 && cfg.basement)) {
        holes.sort((a, b) => a[0] - b[0]);
        let cx = houseX;
        for (const [h0, h1] of holes) {
          addSolid(cx, y, h0 - cx, SLAB, { kind: 'slab', floorK: k });
          cx = h1;
        }
        addSolid(cx, y, houseR - cx, SLAB, { kind: 'slab', floorK: k });
      }
      if (k === 0 && ladder) {
        // Kapak (tek yönlü)
        addOneway(ladder.hole[0], y, ladder.hole[1] - ladder.hole[0], { kind: 'trapdoor', trapdoor: true });
      }
      f.holes = holes;

      // Duvarlar
      if (k === 0) {
        addSolid(houseX, y - FH + SLAB, WALL, FH - SLAB - C.DOOR_H, { kind: 'wall' });
        W.frontDoor = { x: houseX, y, h: C.DOOR_H };
      } else {
        addSolid(houseX, y - FH + SLAB, WALL, FH - SLAB, { kind: 'wall' });
      }
      addSolid(houseR - WALL, y - FH + SLAB, WALL, FH - SLAB, { kind: 'wall' });

      // Yürünebilir alan (ev sahibi için)
      if (k === 0) {
        f.walk = [streetX0 + 360, innerR - 24];
      } else {
        const si = stairInfo(k - 1);
        f.walk = si.end === 'R' ? [innerL + 24, si.xt] : [si.xt, innerR - 24];
      }
    }
    // Tavan / çatı döşemesi
    addSolid(houseX - 30, topY, houseW + 60, SLAB, { kind: 'roof' });

    // Merdivenler
    for (let k = 0; k < cfg.floors - 1; k++) {
      const si = stairInfo(k);
      const y = floorY(k);
      const steps = [];
      for (let i = 0; i < nSteps - 1; i++) {
        const top = y - (i + 1) * C.STEP_H;
        const sx = si.end === 'R' ? si.xb - (i + 1) * C.STEP_W : si.xb + i * C.STEP_W;
        steps.push(addOneway(sx, top, C.STEP_W, { kind: 'step', step: true, stairK: k }));
      }
      const st = {
        k,
        end: si.end,
        xb: si.xb,
        xt: si.xt,
        x0: si.x0,
        x1: si.x1,
        bottom: { x: si.xb + (si.end === 'R' ? -6 : 6), y },
        top: { x: si.xt, y: floorY(k + 1) },
        steps,
      };
      W.stairs.push(st);
      W.floorByK[k].blocked.push([si.x0 - 20, si.x1 + 30]);
      W.floorByK[k + 1].blocked.push([si.hole[0] - 10, si.hole[1] + 20]);
    }
    if (ladder) {
      W.floorByK[0].blocked.push([ladder.hole[0] - 36, ladder.hole[1] + 36]);
      W.floorByK[-1].blocked.push([ladder.x - 50, ladder.x + 50]);
    }
    // Ön kapı önünü boş bırak
    W.floorByK[0].blocked.push([innerL - 10, innerL + 90]);

    /* ------------------------ Odalar ------------------------ */
    const roomPlan = planRooms(cfg, kList, rng);
    for (const f of W.floors) {
      const types = roomPlan[f.k];
      const widths = splitWidths(innerR - innerL, types.length, rng);
      let x = innerL;
      for (let i = 0; i < types.length; i++) {
        const rt = types[i];
        const def = C.ROOM_TYPES[rt];
        const room = {
          id: W.rooms.length,
          k: f.k,
          type: rt,
          name: def.name,
          x0: x,
          x1: x + widths[i],
          y0: f.ceil,
          y1: f.y,
          wall: rng.pick(def.wall),
          pattern: def.pattern,
          floorStyle: rt === 'kitchen' || rt === 'bathroom' ? 'tile' : f.k === -1 && rt !== 'treasure' && rt !== 'game' ? 'concrete' : 'wood',
          windows: [],
          lamp: null,
          furniture: [],
        };
        x += widths[i];
        W.rooms.push(room);
        f.rooms.push(room);
      }
    }

    /* ------------------------ Oda kapıları ------------------------ */
    W.doors = [];
    {
      const resType = cfg.kind ? 'security' : 'master';
      const masterWithRes = new Set(W.rooms.filter((r) => r.type === resType).slice(0, cfg.residents.length));
      for (const f of W.floors) {
        for (let i = 1; i < f.rooms.length; i++) {
          const r = f.rooms[i];
          const bx = r.x0;
          if (f.blocked.some(([a, b]) => bx > a - 36 && bx < b + 36)) {
            r.arch = true;
            continue;
          }
          const door = {
            id: W.doors.length,
            x: bx,
            k: f.k,
            y: f.y,
            h: 204,
            left: f.rooms[i - 1],
            right: r,
            closed: false,
            locked: false,
            openT: 1,
            lockLevel: 1 + Math.floor(levelIndex / 3),
            swing: 1,
          };
          door.body = addSolid(bx - 6, f.y - door.h, 12, door.h, { kind: 'door', door, type: 'none' });
          r.doorLeft = door;
          W.doors.push(door);
          f.blocked.push([bx - 46, bx + 46]);
        }
      }
      const setClosed = (d, locked) => {
        d.closed = true;
        d.locked = locked;
        d.openT = 0;
        d.body.type = 'solid';
      };
      for (const d of W.doors) {
        if (masterWithRes.has(d.left) || masterWithRes.has(d.right)) {
          setClosed(d, !!cfg.bedroomLocked);
          d.bedroom = true;
        }
      }
      const VAL = { treasure: 4, study: 3, library: 2, gallery: 3, dressing: 2, trophy: 2, wine: 1, master: 1 };
      const score = (d) => (VAL[d.left.type] || 0) + (VAL[d.right.type] || 0) + rng.float(0, 1.5);
      const others = W.doors.filter((d) => !d.closed).sort((a, b) => score(b) - score(a));
      let nl = cfg.lockedDoors || 0;
      let nc = cfg.closedDoors || 0;
      for (const d of others) {
        if (nl > 0) {
          setClosed(d, true);
          nl--;
        } else if (nc > 0 && rng.chance(0.7)) {
          setClosed(d, false);
          nc--;
        }
      }
    }

    /* ------------------------ Dış kapı ------------------------ */
    // Eve giriş kilitli dış kapıdan: dışarıdan matkap + maymuncukla kırılır
    // (bkz. Minigames.LockpickGame). İçeriden mandalla açılır.
    {
      const fd = {
        id: W.doors.length,
        x: houseX + WALL / 2,
        k: 0,
        y: 0,
        h: C.DOOR_H,
        left: null,
        right: W.floorByK[0].rooms[0] || null,
        closed: true,
        locked: true,
        exterior: true,
        openT: 0,
        lockLevel: 1 + Math.floor(levelIndex / 3),
        swing: 1,
      };
      fd.body = addSolid(houseX, -C.DOOR_H, WALL, C.DOOR_H, { kind: 'door', door: fd, type: 'solid' });
      W.doors.push(fd);
      W.frontDoor.door = fd;
    }

    /* ------------------------ Mobilya yerleşimi ------------------------ */
    const residents = cfg.residents.map((r, i) => ({ ...r, index: i }));
    const masterRooms = W.rooms.filter((r) => r.type === 'master');
    masterRooms.sort((a, b) => b.k - a.k);

    const palFor = (roomType) => ({
      wood: rng.pick(theme.wood),
      fabric: rng.pick(theme.fabric),
      accent: rng.pick(theme.accent),
      cabinet: theme.cabinet,
      top: theme.top,
      appliance: theme.appliance,
      curtain: rng.pick(theme.curtain),
      stone: theme.stone,
      leaf: '#24502f',
    });

    const makeFurn = (type, x, yBottom, room, pal, extra = {}) => {
      const def = FD()[type];
      const w = extra.w || def.w;
      const h = extra.h || def.h;
      const inst = {
        id: W.furniture.length,
        type,
        name: def.name,
        x,
        y: yBottom - h,
        w,
        h,
        pal,
        palKey: pal.wood + pal.fabric + pal.accent + pal.curtain + (pal.leaf || ''),
        hide: def.hide || null,
        layer: def.layer || 'back',
        room,
        k: room ? room.k : 0,
        state: extra.state || {},
        surfaces: [],
        def,
      };
      // Yüzeyler → tek yönlü platform + eşya yerleşim alanları
      const surfs = def.surfaces(w, h);
      for (const s of surfs) {
        if (!s.max) continue;
        const sx0 = x + (s.x0 || 0);
        const sx1 = x + (s.x1 == null ? w - (s.x0 || 0) : s.x1);
        const sy = inst.y + s.y;
        const surf = { furn: inst, x0: sx0, x1: sx1, y: sy, max: s.max, inner: !!s.inner, only: s.only || null, room };
        inst.surfaces.push(surf);
        W.surfaces.push(surf);
        addOneway(sx0, sy, sx1 - sx0, { kind: 'furniture', furn: inst });
      }
      W.furniture.push(inst);
      if (inst.hide) W.hideSpots.push(inst);
      if (room) room.furniture.push(inst);
      if (def.light) W.lamps.push({ x: x + w / 2, y: inst.y + (def.light.offY || h * 0.6), r: def.light.radius, color: def.light.color, kind: 'furniture', room, always: !!def.garden });
      return inst;
    };
    W.makeFurn = makeFurn;

    let resIdx = 0;
    for (const room of W.rooms) {
      const f = W.floorByK[room.k];
      const pal = palFor(room.type);
      let list = (ROOM_FURNITURE[room.type] || ['boxes']).slice();
      if (room.type === 'security' && cfg.kind) {
        const r = residents[resIdx];
        if (r) {
          resIdx++;
          room.resident = r;
        } else list = list.filter((t) => t !== 'cot');
      }
      if (room.type === 'master') {
        const r = residents[resIdx];
        if (r) {
          resIdx++;
          room.resident = r;
        } else {
          // Sahipsiz ebeveyn odası → misafir yatak odası gibi
          list[0] = 'bed';
        }
      }
      // Serbest aralıklar
      const free = subtractRanges([[room.x0 + 16, room.x1 - 16]], f.blocked);
      const occupied = [];
      for (const type of list) {
        const def = FD()[type];
        if (!def) continue;
        let w = def.w;
        if (type === 'counter') w = U.clamp(Math.floor((room.x1 - room.x0) * 0.4), 150, 280);
        const spot = findSpot(free, w, rng, 10 + rng.int(0, 30));
        if (!spot) continue;
        const inst = makeFurn(type, spot, f.y, room, pal, { w });
        occupied.push([spot, spot + w]);
        if ((type === 'doublebed' || type === 'cot') && room.resident) {
          W.bedSpots.push({ furn: inst, resident: room.resident, room });
        }
        if (type === 'counter' && room.type === 'kitchen' && w >= 150) {
          const uc = Math.min(w, 200);
          makeFurn('uppercab', spot + (w - uc) / 2, f.y - 170, room, pal, { w: uc });
        }
      }
      // Boş kalan zemini dolduran ek mobilyalar (raf, vitrin, şifonyer...)
      const fillers = FILLER[room.type] || ['boxes'];
      let fcount = 0;
      while (fcount < 6) {
        const type = rng.pick(fillers);
        const def = FD()[type];
        const spot = findSpot(free, def.w, rng, 8 + rng.int(0, 16));
        if (spot == null) {
          // Daha küçük bir dolgu dene
          const small = fillers.map((t) => FD()[t]).filter((d) => d.w < def.w);
          if (!small.length) break;
          const d2 = U.minBy(small, (d) => d.w);
          const sp2 = findSpot(free, d2.w, rng, 8);
          if (sp2 == null) break;
          makeFurn(Object.keys(FD()).find((k) => FD()[k] === d2), sp2, f.y, room, pal);
          occupied.push([sp2, sp2 + d2.w]);
        } else {
          makeFurn(type, spot, f.y, room, pal);
          occupied.push([spot, spot + def.w]);
        }
        fcount++;
      }
      if (room.type === 'exhibit' && room.k === 0 && !W.dino && cfg.kind === 'museum') {
        const sp = findSpot(free, 320, rng, 10);
        if (sp != null) W.dino = makeFurn('dinosaur', sp, f.y, room, pal);
      }
      room.occupied = occupied;

      // Pencereler (uzun mobilyaların olmadığı yerlerde)
      const tallRanges = room.furniture.filter((fu) => fu.h > 120 || fu.def.wall).map((fu) => [fu.x - 20, fu.x + fu.w + 20]);
      const winCount = room.k === -1 ? 0 : (room.x1 - room.x0) > 560 ? 2 : 1;
      const winFree = subtractRanges([[room.x0 + 40, room.x1 - 40]], tallRanges);
      for (let i = 0; i < winCount; i++) {
        const ww = 96;
        const wx = findSpot(winFree, ww + 100, rng, 20);
        if (wx == null) break;
        const win = { x: wx + 50, y: f.y - 230, w: ww, h: 120, room };
        room.windows.push(win);
        W.windows.push(win);
        // Perdeler (saklanma yeri)
        if (rng.chance(0.75) && room.type !== 'bathroom' && room.type !== 'kitchen') {
          makeFurn('curtain', win.x - 40, f.y - 6, room, pal, { h: FH - SLAB - 20 });
          makeFurn('curtain', win.x + win.w - 4, f.y - 6, room, pal, { h: FH - SLAB - 20 });
        }
      }

      // Tavan lambası
      room.lamp = { x: (room.x0 + room.x1) / 2, y: f.ceil + 22 };
      W.lamps.push({ x: room.lamp.x, y: room.lamp.y + 16, r: Math.max(380, (room.x1 - room.x0) * 0.8), color: '#fff2cc', kind: 'ceiling', room });

      // Gıcırdayan tahtalar
      if (room.floorStyle === 'wood' && rng.chance(0.55 + levelIndex * 0.08)) {
        const cf = subtractRanges([[room.x0 + 30, room.x1 - 30]], f.blocked);
        const n = rng.int(1, 2);
        for (let i = 0; i < n; i++) {
          const cw = rng.int(64, 120);
          const cx = findSpot(cf, cw, rng, 30, true);
          if (cx != null) W.creaky.push({ x0: cx, x1: cx + cw, y: f.y, k: room.k });
        }
      }
    }

    /* ------------------------ Kasa ------------------------ */
    {
      const prefs = cfg.kind ? ['vault', 'treasure', 'office', 'security'] : ['treasure', 'study', 'library', 'master', 'dressing', 'storage', 'living'];
      let safeRoom = null;
      for (const p of prefs) {
        const cand = W.rooms.filter((r) => r.type === p);
        if (cand.length) {
          safeRoom = rng.pick(cand);
          break;
        }
      }
      if (!safeRoom) safeRoom = W.rooms[0];
      const f = W.floorByK[safeRoom.k];
      const occ = safeRoom.furniture.filter((fu) => !fu.def.wall && fu.type !== 'curtain').map((fu) => [fu.x - 8, fu.x + fu.w + 8]);
      let free = subtractRanges([[safeRoom.x0 + 20, safeRoom.x1 - 20]], [...f.blocked, ...occ]);
      const safeType = cfg.kind === 'bank' ? 'bigsafe' : 'safe';
      const safeW = FD()[safeType].w;
      let sx = findSpot(free, safeW + 4, rng, 10);
      if (sx == null) {
        // Yer yoksa bir mobilyayı kaldır
        const victim = safeRoom.furniture.find((fu) => !fu.def.wall && fu.type !== 'doublebed' && fu.type !== 'curtain' && fu.w >= 80);
        if (victim) {
          removeFurniture(W, victim);
          sx = victim.x;
        } else {
          sx = (safeRoom.x0 + safeRoom.x1) / 2 - 38;
        }
      }
      const pal = palFor(safeRoom.type);
      W.safe = makeFurn(safeType, sx, f.y, safeRoom, pal, { state: { open: false } });
      W.safe.isSafe = true;
      W.safeRoom = safeRoom;
    }

    /* ------------------------ Bahçe & sokak ------------------------ */
    buildOutdoor(W, cfg, rng, palFor, addSolid, addOneway);

    /* ------------------------ Eşyalar ------------------------ */
    const valueMul = 1 + levelIndex * 0.18;
    const valueCap = cfg.target * C.ITEM_VALUE_CAP;
    W.valueCap = valueCap;
    const makeItem = (def, x, bottomY, room, opts = {}) => {
      const it = new RC.Item(def, x, bottomY - def.h, rng, {
        valueMul: opts.valueMul || valueMul,
        valueCap,
        rarityBoost: opts.rarityBoost || (room && room.type === 'treasure' ? 2.2 : 1),
        wall: opts.wall,
        room,
      });
      it.k = room ? room.k : 0;
      W.items.push(it);
      W.itemGrid.insert(it);
      return it;
    };
    W.makeItem = makeItem;

    const pickDef = (roomType, place, maxW, maxH, only) => {
      let pool = RC.Items.poolFor(roomType, place);
      if (only === 'wine') pool = pool.filter((d) => d.draw === 'bottle' || d.draw === 'glass' || d.draw === 'jar');
      const fits = pool.filter((d) => d.w <= maxW && d.h <= maxH);
      if (!fits.length) return null;
      if (place === 'shelf') {
        // Raflarda küçük eşyalar daha sık (yoğun, dolu raflar)
        let total = 0;
        for (const d of fits) total += d.w8 * (40 / (d.w + 10));
        let r = rng.next() * total;
        for (const d of fits) {
          r -= d.w8 * (40 / (d.w + 10));
          if (r <= 0) return d;
        }
        return fits[fits.length - 1];
      }
      return rng.weighted(fits, 'w8');
    };

    const fillSurface = (surf, density) => {
      const roomType = surf.room ? surf.room.type : 'storage';
      const place = surf.inner || SHELF_FURN.has(surf.furn.type) ? 'shelf' : 'table';
      let x = surf.x0 + rng.float(1, 6);
      let guard = 0;
      while (x < surf.x1 - 6 && guard++ < 60) {
        const def = pickDef(roomType, place, surf.x1 - x, surf.max, surf.only);
        if (!def) break;
        if (rng.chance(density)) {
          const base = makeItem(def, x, surf.y, surf.room);
          // Yassı eşyaların üstüne yığın yap (tabak, kitap seti, deste...)
          let top = base;
          let used = def.h;
          let layers = 0;
          while (STACKABLE.has(top.def.draw) && layers < 4 && rng.chance(0.75)) {
            const pool = RC.Items.poolFor(roomType, place).filter((d) => STACKABLE.has(d.draw) && d.w <= top.w + 8 && d.h <= surf.max - used);
            if (!pool.length) break;
            const d2 = rng.weighted(pool, 'w8');
            const nx = top.x + (top.w - d2.w) / 2;
            const it2 = makeItem(d2, nx, top.y, surf.room);
            it2.stackedOn = top;
            used += d2.h;
            top = it2;
            layers++;
          }
          x += def.w + rng.float(1, place === 'shelf' ? 3 : 10);
        } else {
          x += def.w * 0.8 + 6;
        }
      }
    };

    // 1) Mobilya yüzeyleri
    for (const s of W.surfaces) {
      if (s.furn.isSafe) continue;
      fillSurface(s, 0.9);
    }

    // 2) Duvar eşyaları (tablolar, saatler, aynalar...)
    for (const room of W.rooms) {
      const f = W.floorByK[room.k];
      const blocked = room.furniture.filter((fu) => fu.h > 110 || fu.def.wall).map((fu) => [fu.x - 10, fu.x + fu.w + 10]);
      for (const win of room.windows) blocked.push([win.x - 50, win.x + win.w + 50]);
      const free = subtractRanges([[room.x0 + 30, room.x1 - 30]], [...blocked, ...f.blocked]);
      let tries = Math.floor((room.x1 - room.x0) / 170);
      while (tries-- > 0) {
        const def = pickDef(room.type, 'wall', 80, 72);
        if (!def) break;
        const wx = findSpot(free, def.w + 30, rng, 10);
        if (wx == null) break;
        const cy = f.y - rng.int(182, 200);
        makeItem(def, wx + 15, cy + def.h / 2, room, { wall: true });
      }
    }

    // 3) Yerdeki büyük eşyalar
    for (const room of W.rooms) {
      const f = W.floorByK[room.k];
      const occ = room.furniture.filter((fu) => !fu.def.wall && fu.type !== 'curtain').map((fu) => [fu.x - 4, fu.x + fu.w + 4]);
      const free = subtractRanges([[room.x0 + 20, room.x1 - 20]], [...occ, ...f.blocked]);
      // Yer: önce büyük eşyalar, sonra boşlukları küçük eşya yığınlarıyla doldur
      let n = rng.int(3, 6);
      while (n-- > 0) {
        const def = pickDef(room.type, 'floor', 90, 90);
        if (!def) break;
        const fx = findSpot(free, def.w + 8, rng, 4);
        if (fx == null) break;
        makeItem(def, fx + 4, f.y, room);
      }
      let piles = rng.int(2, 4);
      while (piles-- > 0) {
        const pw = rng.int(50, 90);
        const px = findSpot(free, pw, rng, 6, true);
        if (px == null) break;
        let x = px;
        while (x < px + pw - 8) {
          const def = pickDef(room.type, 'shelf', px + pw - x, 30);
          if (!def) break;
          const base = makeItem(def, x, f.y, room);
          if (STACKABLE.has(def.draw) && rng.chance(0.7)) {
            const pool = RC.Items.poolFor(room.type, 'shelf').filter((d) => STACKABLE.has(d.draw) && d.w <= def.w + 6 && d.h <= 24);
            if (pool.length) {
              const d2 = rng.weighted(pool, 'w8');
              makeItem(d2, base.x + (def.w - d2.w) / 2, base.y, room).stackedOn = base;
            }
          }
          x += def.w + rng.float(1, 4);
        }
      }
    }

    // 4) Hedefe ulaşmak için iki sıra duvar rafı ekle
    //    A sırası: yerden 118 px (zıplayarak erişilir)
    //    B sırası: yerden 214 px (A rafına çıkıp zıplayarak erişilir)
    const tierFree = new Map();
    const getFree = (room, tier) => {
      const key = room.id + tier;
      if (tierFree.has(key)) return tierFree.get(key);
      const f = W.floorByK[room.k];
      const blocked = [...f.blocked];
      for (const win of room.windows) blocked.push([win.x - 50, win.x + win.w + 50]);
      for (const fu of room.furniture) {
        if (fu.type === 'wallshelf') continue;
        const tall = tier === 'A' ? fu.h > 82 || fu.def.wall : fu.h > 150 || fu.def.wall;
        if (tall) blocked.push([fu.x - 6, fu.x + fu.w + 6]);
      }
      if (tier === 'B') for (const it of W.items) if (it.wall && it.room === room) blocked.push([it.x - 8, it.x + it.w + 8]);
      const free = subtractRanges([[room.x0 + 18, room.x1 - 18]], blocked);
      tierFree.set(key, free);
      return free;
    };
    let guard = 0;
    let fails = 0;
    while (W.items.length < cfg.items && guard++ < 3000 && fails < 600) {
      const room = rng.pick(W.rooms);
      const f = W.floorByK[room.k];
      const tier = rng.chance(0.6) ? 'A' : 'B';
      const free = getFree(room, tier);
      const sw = rng.int(100, 170);
      const sx = findSpot(free, sw, rng, 4);
      if (sx == null) {
        fails++;
        continue;
      }
      const pal = palFor(room.type);
      const shelfY = f.y - (tier === 'A' ? 118 : 214);
      const inst = makeFurn('wallshelf', sx, shelfY + FD().wallshelf.h, room, pal, { w: sw });
      inst.tier = tier;
      for (const s2 of inst.surfaces) {
        s2.max = tier === 'A' ? 34 : 44;
        fillSurface(s2, 1);
      }
    }

    // 5) Fazlaysa rastgele azalt (ucuz eşyaları öncelikle)
    if (W.items.length > cfg.items * 1.08) {
      const removable = W.items.filter((it) => !it.wall && it.value < 300);
      rng.shuffle(removable);
      let excess = W.items.length - cfg.items;
      for (const it of removable) {
        if (excess <= 0) break;
        W.itemGrid.remove(it);
        U.removeFrom(W.items, it);
        excess--;
      }
    }

    /* ------------------------ Anahtar ------------------------ */
    {
      const candidates = W.surfaces.filter((s) => !s.furn.isSafe && s.room && s.room !== W.safeRoom && s.x1 - s.x0 > 30);
      const other = candidates.filter((s) => s.room.k !== W.safeRoom.k);
      const pickFrom = other.length && rng.chance(0.7) ? other : candidates;
      const s = rng.pick(pickFrom);
      if (s) {
        const kx = rng.float(s.x0 + 2, Math.max(s.x0 + 3, s.x1 - RC.Items.KEY.w - 2));
        // Anahtarın bulunduğu yerdeki eşyaları kaldır (üst üste binmesin)
        for (const it of W.items.slice()) {
          if (!it.wall && Math.abs(it.y + it.h - s.y) < 2 && it.x < kx + 24 && it.x + it.w > kx - 4) {
            W.itemGrid.remove(it);
            U.removeFrom(W.items, it);
          }
        }
        W.keyItem = makeItem(RC.Items.KEY, kx, s.y, s.room);
      }
    }

    /* ------------------------ Çekmeceler ve dolaplar (gizli eşyalar) ------------------------ */
    {
      const CONT = {
        nightstand: [1, 3, 'Çekmece'],
        dresser: [3, 6, 'Şifonyer çekmecesi'],
        desk: [2, 5, 'Masa çekmecesi'],
        wardrobe: [3, 7, 'Gardırop'],
        chest: [3, 6, 'Sandık'],
        toychest: [2, 5, 'Oyuncak sandığı'],
        counter: [2, 5, 'Mutfak dolabı'],
        vanity: [2, 4, 'Makyaj çekmecesi'],
        consoletable: [1, 3, 'Dresuar çekmecesi'],
        tvstand: [1, 4, 'TV ünitesi dolabı'],
        workbench: [2, 4, 'Tezgâh çekmecesi'],
        fridge: [2, 5, 'Buzdolabı'],
        boxes: [2, 5, 'Koliler'],
        bar: [2, 5, 'Bar dolabı'],
        uppercab: [2, 4, 'Üst dolap'],
        lockers: [8, 14, 'Kiralık kasalar'],
        cashdesk: [3, 7, 'Kasa çekmecesi'],
      };
      for (const f of W.furniture) {
        const c = CONT[f.type];
        if (!c || !f.room) continue;
        const roomType = f.type === 'fridge' ? 'kitchen' : f.room.type;
        let pool = RC.Items.poolFor(roomType, 'shelf').filter((d) => d.h <= 40 && d.w <= 40);
        if (f.type === 'fridge') pool = RC.Items.LIST.filter((d) => ['cheese', 'jar', 'can', 'bread', 'bottle', 'caviar'].includes(d.draw) || d.id === 'caviar');
        if (!pool.length) pool = RC.Items.poolFor('storage', 'shelf');
        if (!pool.length) continue;
        const n = rng.int(c[0], c[1]);
        const defs = [];
        for (let i = 0; i < n; i++) defs.push(rng.weighted(pool, 'w8'));
        // Çekmecelerde daha sık değerli eşya
        if (rng.chance(0.35)) {
          const good = RC.Items.LIST.filter((d) => d.small && d.val[1] > 2500 && (d.rooms === '*' || d.rooms.includes(roomType)));
          if (good.length) defs.push(rng.pick(good));
        }
        f.container = { open: false, defs, label: c[2], t: 0, seed: rng.int(1, 99999) };
        W.hiddenCount = (W.hiddenCount || 0) + defs.length;
      }
    }

    /* ------------------------ Güvenlik sistemleri ------------------------ */
    buildSecurity(W, cfg, rng, levelIndex);

    // Sakinlerin yerleri
    W.residentsCfg = residents;

    // Toplam değer
    W.valueTotal = U.sum(W.items, (it) => it.value);

    return W;
  }

  /* =====================================================================
   * Güvenlik: kameralar, lazerler, alarm paneli, bekçiler
   * =================================================================== */
  function buildSecurity(W, cfg, rng, levelIndex) {
    const sec = cfg.security || {};
    W.cameras = [];
    W.lasers = [];
    W.panel = null;
    W.guardSpawns = [];
    const makeCam = (x, y, dir, outdoor, room) => {
      // Duvara monte dış kameralar kendi altlarını göremez: tarama dik aşağıya
      // inmez, montaj noktasının hemen altı (ön kapı önü) kör noktadır.
      // Aksi hâlde dış kapıyı kırarken oyuncu her taramada yakalanıyordu.
      const down = outdoor ? 1.0 : 1.35;
      const a0 = dir > 0 ? 0.18 : Math.PI - down;
      const a1 = dir > 0 ? down : Math.PI - 0.18;
      return {
        x,
        y,
        dir,
        a0,
        a1,
        angle: rng.float(a0, a1),
        sweep: rng.chance(0.5) ? 1 : -1,
        speed: rng.float(0.32, 0.55) * (1 + levelIndex * 0.03),
        pause: 0,
        range: outdoor ? 540 : 430,
        spread: 0.3,
        k: room ? room.k : 0,
        room: room || null,
        outdoor,
        detect: 0,
        disabled: false,
        blink: rng.float(0, 2),
      };
    };
    let camN = sec.cameras || 0;
    if (camN > 0 && cfg.garden >= 600) {
      W.cameras.push(makeCam(W.house.x - 16, -238, -1, true, null));
      camN--;
    }
    if (camN > 3 && cfg.garden >= 1300) {
      W.cameras.push(makeCam(W.garden.x0 + Math.floor(cfg.garden * 0.35), -250, 1, true, null));
      camN--;
    }
    const PRIO = { treasure: 5, hall: 4, gallery: 4, study: 3, living: 3, library: 2, trophy: 3, dining: 2, wine: 2, storage: 1, game: 1, kitchen: 1 };
    const camRooms = W.rooms
      .filter((r) => r.type !== 'master' && r.type !== 'bathroom')
      .map((r) => ({ r, s: (PRIO[r.type] || 0) + rng.float(0, 2) }))
      .sort((a, b) => b.s - a.s)
      .map((o) => o.r);
    for (const r of camRooms) {
      if (camN <= 0) break;
      const side = rng.chance(0.5) ? 'L' : 'R';
      const x = side === 'L' ? r.x0 + 22 : r.x1 - 22;
      W.cameras.push(makeCam(x, r.y0 + 34, side === 'L' ? 1 : -1, false, r));
      camN--;
    }

    // Lazerler
    let lz = sec.lasers || 0;
    let tries = 0;
    const used = {};
    const laserRooms = W.rooms.filter((r) => r.type !== 'master');
    while (lz > 0 && tries++ < 300 && laserRooms.length) {
      const r = rng.pick(laserRooms);
      const f = W.floorByK[r.k];
      const taken = used[r.k] || (used[r.k] = []);
      const free = subtractRanges([[r.x0 + 40, r.x1 - 40]], [...f.blocked, ...taken]);
      const width = rng.int(140, 230);
      const x = findSpot(free, width, rng, 10, true);
      if (x == null) continue;
      const high = rng.chance(0.5);
      W.lasers.push({
        x0: x,
        x1: x + width,
        y: f.y - (high ? 40 : 13),
        floorY: f.y,
        high,
        k: r.k,
        room: r,
        blink: !!sec.blink && rng.chance(0.6),
        on: true,
        period: rng.float(2.0, 3.2),
        offT: rng.float(0.9, 1.5),
        phase: rng.float(0, 3),
        disabled: false,
      });
      taken.push([x - 30, x + width + 30]);
      lz--;
    }

    // Hareket sensörleri (PIR): bölgede ayakta hareket edersen alarm
    W.motions = [];
    let mn = sec.motion || 0;
    tries = 0;
    while (mn > 0 && tries++ < 200) {
      const r = rng.pick(laserRooms);
      if (!r) break;
      const f = W.floorByK[r.k];
      if (W.motions.some((m) => m.room === r)) continue;
      const side = rng.chance(0.5) ? 'L' : 'R';
      const zw = Math.min(r.x1 - r.x0 - 80, rng.int(220, 340));
      const zx = side === 'L' ? r.x0 + 30 : r.x1 - 30 - zw;
      W.motions.push({ x: side === 'L' ? r.x0 + 26 : r.x1 - 26, y: r.y0 + 40, zx0: zx, zx1: zx + zw, k: r.k, floorY: f.y, room: r, acc: 0, disabled: false, blink: rng.float(0, 2) });
      mn--;
    }
    // Basınç plakaları: üstüne basarsan alarm (zıplayarak geç)
    W.plates = [];
    let pn = sec.plates || 0;
    tries = 0;
    while (pn > 0 && tries++ < 300) {
      const r = rng.pick(laserRooms);
      if (!r) break;
      const f = W.floorByK[r.k];
      const taken = used[r.k] || (used[r.k] = []);
      const free = subtractRanges([[r.x0 + 40, r.x1 - 40]], [...f.blocked, ...taken]);
      const pw = rng.int(70, 110);
      const x = findSpot(free, pw, rng, 10, true);
      if (x == null) continue;
      W.plates.push({ x0: x, x1: x + pw, y: f.y, k: r.k, room: r, disabled: false, pressT: 0 });
      taken.push([x - 40, x + pw + 40]);
      pn--;
    }
    // Tarayan lazerler: oda boyunca gidip gelen dikey ışın
    W.sweepers = [];
    let sn = sec.sweepers || 0;
    tries = 0;
    while (sn > 0 && tries++ < 200) {
      const r = rng.pick(laserRooms);
      if (!r || W.sweepers.some((q) => q.room === r)) continue;
      const f = W.floorByK[r.k];
      const x0 = r.x0 + 50;
      const x1 = r.x1 - 50;
      if (x1 - x0 < 200) continue;
      W.sweepers.push({ x0, x1, x: rng.float(x0, x1), dir: rng.chance(0.5) ? 1 : -1, speed: rng.float(70, 120), top: f.y - 150, y: f.y, k: r.k, room: r, disabled: false });
      sn--;
    }

    if (sec.panel) {
      W.panel = { x: W.house.innerL + 108, y: -168, w: 34, h: 46, k: 0, disabled: false };
    }

    // Bekçi başlangıç noktaları (zemin kat odaları)
    const f0 = W.floorByK[0];
    for (let i = 0; i < (sec.guards || 0); i++) {
      const r = f0.rooms[Math.floor(((i + 0.5) / (sec.guards || 1)) * f0.rooms.length)] || f0.rooms[0];
      W.guardSpawns.push({ k: 0, x: (r.x0 + r.x1) / 2 });
    }
  }

  /* =====================================================================
   * Oda planı
   * =================================================================== */
  function planRooms(cfg, kList, rng) {
    const plan = {};
    const F = cfg.floors;
    const widthPerRoom = 560;
    const perFloor = Math.max(2, Math.round((cfg.width - 48) / widthPerRoom));
    const residents = cfg.residents.length;

    for (const k of kList) {
      let types = [];
      if (cfg.roomPlan && cfg.roomPlan[k]) {
        plan[k] = cfg.roomPlan[k].slice();
        continue;
      }
      if (k === -1) {
        types = ['storage', 'wine', 'workshop', 'game'];
        if (cfg.theme === 'mansion') types = ['treasure', 'wine', 'storage', 'workshop', 'game'];
        if (cfg.theme === 'modern') types = ['storage', 'workshop', 'wine', 'game'];
      } else if (F === 1) {
        types = ['living', 'kitchen', 'master', 'bathroom', 'study'];
      } else if (k === 0) {
        types = ['living', 'kitchen', 'dining', 'hall', 'music', 'game', 'library'];
        if (cfg.theme === 'gallery') types = ['hall', 'gallery', 'living', 'gallery', 'kitchen', 'dining'];
        if (cfg.theme === 'sport') types = ['living', 'trophy', 'kitchen', 'game', 'dining', 'hall'];
        if (cfg.theme === 'oligarch') types = ['hall', 'living', 'dining', 'kitchen', 'library', 'music'];
      } else if (k === F - 1) {
        types = ['master', 'bathroom', 'dressing', 'bedroom', 'study'];
      } else {
        types = ['study', 'kids', 'library', 'bathroom', 'bedroom', 'music'];
        if (cfg.theme === 'gallery') types = ['gallery', 'study', 'gallery', 'bathroom', 'library'];
        if (cfg.theme === 'sport') types = ['gym', 'trophy', 'bathroom', 'bedroom', 'game'];
        if (cfg.theme === 'oligarch') types = ['study', 'library', 'gallery', 'bathroom', 'bedroom'];
      }
      if (k === -1 && (cfg.theme === 'oligarch' || cfg.theme === 'sport' || cfg.theme === 'waterfront')) types = ['treasure', 'wine', 'storage', 'game', 'workshop'];
      // İkinci sakin için ikinci ebeveyn odası (bir alt kat)
      if (residents > 1 && k === F - 2 && k >= 1) types = ['master', ...types.filter((t) => t !== 'master')];
      if (residents > 1 && F === 1 && k === 0) types.splice(2, 0, 'master');

      let n = Math.min(types.length, perFloor);
      if (k === -1) n = Math.min(types.length, Math.max(2, perFloor - 1));
      const keep = types.slice(0, n);
      // Sabit odalar dışında karıştır (ebeveyn odası ortada olsun)
      const head = keep.filter((t) => t === 'master');
      const rest = rng.shuffle(keep.filter((t) => t !== 'master'));
      if (head.length) {
        const pos = Math.floor(rest.length / 2);
        rest.splice(pos, 0, ...head);
      }
      plan[k] = rest;
    }
    return plan;
  }

  function splitWidths(total, n, rng) {
    const ws = [];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const w = rng.float(0.8, 1.25);
      ws.push(w);
      sum += w;
    }
    const out = ws.map((w) => Math.floor((w / sum) * total));
    const diff = total - U.sum(out);
    out[out.length - 1] += diff;
    return out;
  }

  /* =====================================================================
   * Aralık yardımcıları
   * =================================================================== */
  function subtractRanges(ranges, blocks) {
    let out = ranges.map((r) => r.slice());
    for (const [b0, b1] of blocks) {
      const next = [];
      for (const [a0, a1] of out) {
        if (b1 <= a0 || b0 >= a1) {
          next.push([a0, a1]);
          continue;
        }
        if (b0 > a0) next.push([a0, b0]);
        if (b1 < a1) next.push([b1, a1]);
      }
      out = next;
    }
    return out.filter((r) => r[1] - r[0] > 2);
  }

  /** Serbest aralıklardan w genişliğinde bir yer bulur ve onu tüketir */
  function findSpot(free, w, rng, gap = 10, random = false) {
    const fits = free.filter((r) => r[1] - r[0] >= w + gap);
    if (!fits.length) return null;
    let r;
    if (random) r = rng.pick(fits);
    else r = fits[0];
    const slack = r[1] - r[0] - w - gap;
    const x = random ? r[0] + gap / 2 + rng.float(0, slack) : r[0] + gap / 2 + Math.min(slack, rng.float(0, Math.min(slack, 60)));
    // Kullanılan kısmı çıkar
    const idx = free.indexOf(r);
    free.splice(idx, 1);
    if (x - r[0] > 4) free.push([r[0], x - 2]);
    if (r[1] - (x + w) > 4) free.push([x + w + 2, r[1]]);
    free.sort((a, b) => a[0] - b[0]);
    return x;
  }

  function removeFurniture(W, inst) {
    U.removeFrom(W.furniture, inst);
    U.removeFrom(W.hideSpots, inst);
    if (inst.room) U.removeFrom(inst.room.furniture, inst);
    for (const s of inst.surfaces) U.removeFrom(W.surfaces, s);
    // Yüzey platformlarını devre dışı bırak
    for (const b of W.solids) {
      if (b.furn === inst) {
        b.type = 'none';
      }
    }
  }

  /* =====================================================================
   * Dış mekân: sokak, bahçe, havuz, kulübe, köpek
   * =================================================================== */
  function buildOutdoor(W, cfg, rng, palFor, addSolid, addOneway) {
    const g0 = W.garden.x0;
    const g1 = W.garden.x1;
    const gardenRoom = { id: -1, k: 0, type: 'garden', name: 'Bahçe', x0: g0, x1: g1, y0: -C.FLOOR_H, y1: 0, furniture: [], windows: [], outdoor: true };
    W.gardenRoom = gardenRoom;
    const pal = palFor('garden');
    pal.leaf = '#24502f';

    // Kamyon
    W.truck = { x: 150, y: 0, w: 340, h: 156 };
    W.truck.zone = { x: W.truck.x + W.truck.w - 30, y: -170, w: 150, h: 170 };
    W.spawn = { x: W.truck.x + W.truck.w + 80, y: -60 };

    // Sokak lambaları
    for (const lx of [40, 720]) {
      W.decor.push({ type: 'streetlamp', x: lx, y: 0 });
      W.lamps.push({ x: lx + 40, y: -206, r: 280, color: '#ffe0a0', kind: 'street', always: true });
    }

    // Bahçe çiti
    W.decor.push({ type: 'fence', x: g0 - 10, y: 0, w: 80 });
    W.decor.push({ type: 'gate', x: g0 + 70, y: 0 });

    const occupied = [[g0 - 20, g0 + 200]];
    if (W.pool) occupied.push([W.pool.x0 - 40, W.pool.x1 + 40]);
    occupied.push([g1 - 90, g1 + 10]); // kapı önü

    // Büyük bahçe öğeleri
    const big = [];
    if (cfg.shed) big.push('shed');
    if (cfg.dog) big.push('doghouse');
    if (cfg.garden > 1500) big.push('fountain', 'gardentable', 'bench', 'bench');
    else if (cfg.garden > 500) big.push('bench');

    const freeG = subtractRanges([[g0 + 60, g1 - 60]], occupied);
    for (const t of big) {
      const def = FD()[t];
      const x = findSpot(freeG, def.w + 40, rng, 40, true);
      if (x == null) continue;
      const inst = W.makeFurn(t, x + 20, 0, gardenRoom, pal);
      if (t === 'shed') {
        W.shed = inst;
        // Kulübe içi raflar
        W.makeFurn('rack', x + 60, 0, { ...gardenRoom, type: 'storage' }, pal);
        W.makeFurn('workbench', x + 200, 0, { ...gardenRoom, type: 'workshop' }, pal);
      }
      if (t === 'doghouse') {
        W.dog = { x: x + 20 + def.w + 30, homeX: x + 20 + def.w / 2, y: 0, range: [g0 + 120, g1 - 60] };
      }
    }

    // Ağaçlar (dekor)
    const treeCount = cfg.urban ? 0 : Math.max(1, Math.floor(cfg.garden / 380));
    for (let i = 0; i < treeCount; i++) {
      const tx = g0 + 120 + ((i + 0.5) * (cfg.garden - 200)) / treeCount + rng.float(-60, 60);
      W.decor.push({ type: 'tree', x: tx, y: 0, s: rng.float(0.9, 1.35), seed: rng.int(1, 9999) });
    }
    // Arka bahçe ağaçları
    W.decor.push({ type: 'tree', x: W.backyard.x0 + 260, y: 0, s: 1.2, seed: rng.int(1, 9999) });

    // Çalılar (saklanma)
    const bushCount = cfg.urban ? 1 : Math.max(2, Math.floor(cfg.garden / 260));
    for (let i = 0; i < bushCount; i++) {
      const bw = rng.int(90, 150);
      const x = findSpot(freeG, bw + 20, rng, 20, true);
      if (x == null) break;
      const tall = rng.chance(0.35);
      const type = tall ? 'hedge' : 'bush';
      W.makeFurn(type, x + 10, 0, gardenRoom, pal, { w: tall ? bw + 40 : bw, h: tall ? 104 : rng.int(62, 80), state: { seed: rng.int(1, 999) } });
    }
    // Çiçek tarhları
    const fbCount = Math.max(1, Math.floor(cfg.garden / 500));
    for (let i = 0; i < fbCount; i++) {
      const x = findSpot(freeG, 150, rng, 10, true);
      if (x == null) break;
      W.makeFurn('flowerbed', x, 0, gardenRoom, pal, { state: { seed: rng.int(1, 999) } });
    }
    // Bahçe lambaları
    const lampCount = Math.max(1, Math.floor(cfg.garden / 700));
    for (let i = 0; i < lampCount; i++) {
      const x = findSpot(freeG, 40, rng, 10, true);
      if (x == null) break;
      W.makeFurn('lamppost', x + 10, 0, gardenRoom, pal);
    }
    // Arka bahçe
    W.makeFurn('bush', W.backyard.x0 + 60, 0, { ...gardenRoom, x0: W.backyard.x0, x1: W.backyard.x1 }, pal, { w: 120, h: 70, state: { seed: 77 } });

    // Bahçe eşyaları (daha sonra, eşya oluşturucu hazır olduğunda)
    W._gardenFree = freeG;
    W._gardenRoom = gardenRoom;
    W.postItems = (makeItem) => {
      let n = Math.max(3, Math.floor(cfg.garden / 160));
      while (n-- > 0) {
        const pool = RC.Items.poolFor('garden', 'garden');
        const def = rng.weighted(pool, 'w8');
        const x = findSpot(freeG, def.w + 10, rng, 6, true);
        if (x == null) break;
        makeItem(def, x + 5, 0, gardenRoom);
      }
    };
  }

  /** Bahçe eşyalarını ekleyen son adım (generate içinden çağrılmaz; world hazır olunca) */
  function finalize(W) {
    if (W.postItems) {
      W.postItems(W.makeItem);
      W.postItems = null;
      W.valueTotal = U.sum(W.items, (it) => it.value);
    }
    return W;
  }

  RC.LevelGen = {
    generate: (i, seed) => finalize(generate(i, seed)),
    THEMES,
    subtractRanges,
  };
})(window.RC);
