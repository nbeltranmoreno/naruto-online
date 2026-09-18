import { TILE, WALK_SPEED, RUN_SPEED, BODY_W, BODY_H } from './constants';
import { getZone, isSolidTile, tileAt, zonePixelSize } from './zones';
import { statsForLevel, xpToNext, addXp, ENEMY_TYPES, jutsuBySlot, unlockedJutsus } from './progression';

// ---------- utilidades de colision ----------

// Caja de colision de un personaje: solo los pies, para poder solaparse
// visualmente con arboles y paredes sin quedarse atascado.
function boxAt(x, y) {
  return { x: x - BODY_W / 2, y: y - BODY_H, w: BODY_W, h: BODY_H };
}

function boxHitsSolid(zone, b) {
  const pts = [
    [b.x, b.y], [b.x + b.w, b.y],
    [b.x, b.y + b.h], [b.x + b.w, b.y + b.h],
    [b.x + b.w / 2, b.y + b.h / 2]
  ];
  return pts.some(([px, py]) => isSolidTile(tileAt(zone, px, py)));
}

// Mueve en X e Y por separado: asi deslizas por las paredes en vez de frenarte en seco
function moveWithCollision(zone, ent, dx, dy) {
  if (dx) {
    const nx = ent.x + dx;
    if (!boxHitsSolid(zone, boxAt(nx, ent.y))) ent.x = nx;
  }
  if (dy) {
    const ny = ent.y + dy;
    if (!boxHitsSolid(zone, boxAt(ent.x, ny))) ent.y = ny;
  }
  const { w, h } = zonePixelSize(zone);
  ent.x = Math.min(Math.max(ent.x, 8), w - 8);
  ent.y = Math.min(Math.max(ent.y, 12), h - 4);
}

// Busca una casilla libre cerca de un punto (los spawners pueden caer sobre un arbol)
function freeSpotNear(zone, tx, ty, radius) {
  for (let i = 0; i < 80; i++) {
    const ox = Math.round((Math.random() * 2 - 1) * radius);
    const oy = Math.round((Math.random() * 2 - 1) * radius);
    const cx = (tx + ox) * TILE + TILE / 2;
    const cy = (ty + oy) * TILE + TILE / 2;
    if (!boxHitsSolid(zone, boxAt(cx, cy))) return { x: cx, y: cy };
  }
  // Ultimo recurso: barrido por toda la zona
  for (let y = 1; y < zone.grid.length - 1; y++) {
    for (let x = 1; x < zone.grid[0].length - 1; x++) {
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (!boxHitsSolid(zone, boxAt(cx, cy))) return { x: cx, y: cy };
    }
  }
  return { x: TILE * 2, y: TILE * 2 };
}

const dirFromVector = (dx, dy) =>
  Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

const dirVector = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// ---------- el juego ----------

export function createGame(opts) {
  const {
    name = 'Ninja',
    outfit = 'naruto',
    level = 1,
    xp = 0,
    zoneId = 'konoha',
    x = null,
    y = null,
    input,
    onAttackBroadcast = () => {}
  } = opts;

  const base = statsForLevel(level);
  const startZone = getZone(zoneId);
  const startPos = x != null && y != null
    ? { x, y }
    : { x: startZone.spawn.x * TILE + TILE / 2, y: startZone.spawn.y * TILE + TILE / 2 };

  const g = {
    time: 0,
    zone: startZone,
    player: {
      x: startPos.x, y: startPos.y,
      dir: 'down', anim: 0, moving: false,
      hp: base.maxHp, maxHp: base.maxHp,
      chakra: base.maxChakra, maxChakra: base.maxChakra,
      level, xp,
      name, outfit,
      attackCd: 0, attackT: 0, jutsuCd: 0,
      invuln: 0, hurt: 0,
      slot: 1, running: false,
      dead: false, respawnT: 0
    },
    enemiesByZone: {},
    enemies: [],
    projectiles: [],
    floaters: [],
    bursts: [],
    remote: new Map(),
    kills: 0,
    portalCd: 0
  };

  // ---------- enemigos ----------

  function makeEnemy(zone, spawner) {
    const def = ENEMY_TYPES[spawner.type];
    const spot = freeSpotNear(zone, spawner.x, spawner.y, spawner.radius);
    return {
      type: spawner.type, def,
      home: { x: spawner.x, y: spawner.y, radius: spawner.radius },
      x: spot.x, y: spot.y,
      dir: 'down', anim: 0, moving: false,
      hp: def.hp, maxHp: def.hp,
      alive: true, hurt: 0, atkCd: 0, respawnT: 0,
      wanderT: Math.random() * 2, wanderDx: 0, wanderDy: 0,
      knockX: 0, knockY: 0
    };
  }

  function enemiesFor(zone) {
    if (!g.enemiesByZone[zone.id]) {
      const list = [];
      for (const s of zone.spawners) {
        for (let i = 0; i < s.count; i++) list.push(makeEnemy(zone, s));
      }
      g.enemiesByZone[zone.id] = list;
    }
    return g.enemiesByZone[zone.id];
  }

  g.enemies = enemiesFor(g.zone);

  // ---------- avisos flotantes ----------

  function floater(x, y, text, color, life = 0.9, big = false) {
    g.floaters.push({ x, y, text, color, life, maxLife: life, vy: -40, big });
  }

  // Estrella de impacto en el punto del golpe
  function burst(x, y, color = '#ffe37a', life = 0.24) {
    g.bursts.push({ x, y, color, life, maxLife: life, rot: Math.random() * Math.PI });
  }

  // ---------- combate ----------

  // Zona a la que llega el golpe cuerpo a cuerpo, delante del personaje
  function meleeBox(p) {
    switch (p.dir) {
      case 'right': return { x: p.x + 4, y: p.y - 56, w: 52, h: 54 };
      case 'left': return { x: p.x - 56, y: p.y - 56, w: 52, h: 54 };
      case 'up': return { x: p.x - 28, y: p.y - 92, w: 56, h: 52 };
      default: return { x: p.x - 28, y: p.y - 16, w: 56, h: 56 };
    }
  }

  const pointInBox = (px, py, b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;

  function damageEnemy(e, amount, fromX, fromY) {
    e.hp -= amount;
    e.hurt = 0.28;
    floater(e.x, e.y - 72, String(Math.round(amount)), '#ffd6d6');
    burst(e.x, e.y - 30, '#ffe37a');
    // Empujon en la direccion del golpe
    const dx = e.x - fromX;
    const dy = e.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    e.knockX = (dx / d) * 190;
    e.knockY = (dy / d) * 190;

    if (e.hp <= 0) {
      e.alive = false;
      e.respawnT = 14;
      g.kills++;
      burst(e.x, e.y - 30, '#ffffff', 0.35);
      const before = g.player.level;
      const res = addXp(g.player.level, g.player.xp, e.def.xp);
      g.player.level = res.level;
      g.player.xp = res.xp;
      floater(e.x, e.y - 88, '+' + e.def.xp + ' XP', '#86efac', 1.2);
      if (res.level > before) {
        const st = statsForLevel(res.level);
        g.player.maxHp = st.maxHp;
        g.player.maxChakra = st.maxChakra;
        g.player.hp = st.maxHp;
        g.player.chakra = st.maxChakra;
        floater(g.player.x, g.player.y - 96, '¡NIVEL ' + res.level + '!', '#fde68a', 2, true);
        burst(g.player.x, g.player.y - 34, '#fde68a', 0.5);
        const nuevo = unlockedJutsus(res.level).find((j) => j.level === res.level);
        if (nuevo) floater(g.player.x, g.player.y - 120, 'Nuevo jutsu: ' + nuevo.name, '#67e8f9', 2.4);
      }
    }
  }

  function damagePlayer(amount) {
    const p = g.player;
    if (p.invuln > 0 || p.dead) return;
    p.hp -= amount;
    p.invuln = 0.65;
    p.hurt = 0.35;
    floater(p.x, p.y - 76, '-' + Math.round(amount), '#ff6b6b');
    burst(p.x, p.y - 30, '#ff8a8a', 0.22);
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      p.respawnT = 3;
      // Al morir se pierde parte de la experiencia del nivel actual
      p.xp = Math.max(0, Math.floor(p.xp * 0.9));
    }
  }

  function doMelee() {
    const p = g.player;
    if (p.attackCd > 0 || p.dead) return;
    p.attackCd = 0.38;
    p.attackT = 1;
    onAttackBroadcast();

    const box = meleeBox(p);
    const dmg = statsForLevel(p.level).meleeDamage;
    for (const e of g.enemies) {
      if (!e.alive) continue;
      if (pointInBox(e.x, e.y - 24, box)) damageEnemy(e, dmg, p.x, p.y);
    }
  }

  function castJutsu(slot) {
    const p = g.player;
    const j = jutsuBySlot(slot);
    if (!j || p.dead) return;
    if (p.level < j.level) { floater(p.x, p.y - 88, 'Bloqueado (Nv ' + j.level + ')', '#fca5a5'); return; }
    if (p.jutsuCd > 0) return;
    if (p.chakra < j.cost) { floater(p.x, p.y - 88, 'Sin chakra', '#93c5fd'); return; }

    p.chakra -= j.cost;
    p.jutsuCd = 0.45;
    p.attackT = 1;
    onAttackBroadcast();

    const [vx, vy] = dirVector[p.dir];
    g.projectiles.push({
      x: p.x + vx * 26, y: p.y - 30 + vy * 14,
      vx: vx * j.speed, vy: vy * j.speed,
      radius: j.radius, color: j.color, kind: j.id,
      damage: j.damage(p.level), pierce: j.pierce,
      life: j.life, hits: new Set()
    });
  }

  // ---------- zonas ----------

  function changeZone(toId, at) {
    g.zone = getZone(toId);
    g.enemies = enemiesFor(g.zone);
    g.player.x = at.x * TILE + TILE / 2;
    g.player.y = at.y * TILE + TILE / 2;
    g.projectiles.length = 0;
    g.bursts.length = 0;
    g.portalCd = 0.9;
    floater(g.player.x, g.player.y - 96, g.zone.name, '#a5f3fc', 2, true);
  }

  function checkPortals() {
    if (g.portalCd > 0) return;
    const tx = Math.floor(g.player.x / TILE);
    const ty = Math.floor(g.player.y / TILE);
    for (const p of g.zone.portals) {
      if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) {
        changeZone(p.to, p.at);
        return;
      }
    }
  }

  // ---------- bucle ----------

  function update(dt) {
    g.time += dt;
    const p = g.player;

    if (g.portalCd > 0) g.portalCd -= dt;

    // --- muerte y reaparicion ---
    if (p.dead) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) {
        const st = statsForLevel(p.level);
        p.dead = false;
        p.hp = st.maxHp;
        p.chakra = st.maxChakra;
        p.invuln = 1.5;
        changeZone('konoha', getZone('konoha').spawn);
      }
    }

    // --- entrada del jugador ---
    let dx = 0, dy = 0;
    if (!p.dead && input) {
      if (input.isDown('left')) dx -= 1;
      if (input.isDown('right')) dx += 1;
      if (input.isDown('up')) dy -= 1;
      if (input.isDown('down')) dy += 1;

      if (input.consume('attack')) doMelee();
      const slot = input.consumeSlot();
      if (slot) {
        p.slot = slot;
        castJutsu(slot);
      }
      if (input.consume('jutsu')) castJutsu(p.slot);
    }

    if (dx || dy) {
      // Normalizar: moverse en diagonal no debe ser mas rapido
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      p.running = !!(input && input.isDown('run'));
      const speed = p.running ? RUN_SPEED : WALK_SPEED;
      moveWithCollision(g.zone, p, dx * speed * dt, dy * speed * dt);
      p.dir = dirFromVector(dx, dy);
      p.anim += speed * dt * 0.35;
      p.moving = true;
    } else {
      p.moving = false;
      p.running = false;
      p.anim += dt * 60;
    }

    // Temporizadores del jugador
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.jutsuCd = Math.max(0, p.jutsuCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    p.attackT = Math.max(0, p.attackT - dt / 0.25);

    // El chakra se recupera siempre; la vida solo en zona segura
    p.chakra = Math.min(p.maxChakra, p.chakra + 7 * dt);
    if (g.zone.safe && !p.dead) p.hp = Math.min(p.maxHp, p.hp + 6 * dt);

    checkPortals();

    // --- enemigos ---
    for (const e of g.enemies) {
      if (!e.alive) {
        e.respawnT -= dt;
        if (e.respawnT <= 0) {
          const spot = freeSpotNear(g.zone, e.home.x, e.home.y, e.home.radius);
          e.x = spot.x; e.y = spot.y;
          e.hp = e.maxHp;
          e.alive = true;
        }
        continue;
      }

      e.hurt = Math.max(0, e.hurt - dt);
      e.atkCd = Math.max(0, e.atkCd - dt);

      // Empujon del ultimo golpe recibido
      if (e.knockX || e.knockY) {
        moveWithCollision(g.zone, e, e.knockX * dt, e.knockY * dt);
        e.knockX *= 0.82;
        e.knockY *= 0.82;
        if (Math.abs(e.knockX) < 4) e.knockX = 0;
        if (Math.abs(e.knockY) < 4) e.knockY = 0;
      }

      const ddx = p.x - e.x;
      const ddy = p.y - e.y;
      const dist = Math.hypot(ddx, ddy);

      if (!p.dead && dist < e.def.aggro) {
        // Persecucion
        const nx = ddx / (dist || 1);
        const ny = ddy / (dist || 1);
        if (dist > 30) {
          moveWithCollision(g.zone, e, nx * e.def.speed * dt, ny * e.def.speed * dt);
          e.anim += e.def.speed * dt * 0.4;
          e.moving = true;
        } else {
          e.moving = false;
        }
        e.dir = dirFromVector(ddx, ddy);

        // Golpe por contacto
        if (dist < 40 && e.atkCd <= 0) {
          e.atkCd = 1.1;
          damagePlayer(e.def.damage);
        }
      } else {
        // Deambular cerca de su sitio
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 1.2 + Math.random() * 2.2;
          if (Math.random() < 0.45) {
            e.wanderDx = 0; e.wanderDy = 0;
          } else {
            const a = Math.random() * Math.PI * 2;
            e.wanderDx = Math.cos(a);
            e.wanderDy = Math.sin(a);
          }
        }
        if (e.wanderDx || e.wanderDy) {
          const sp = e.def.speed * 0.4;
          moveWithCollision(g.zone, e, e.wanderDx * sp * dt, e.wanderDy * sp * dt);
          e.dir = dirFromVector(e.wanderDx, e.wanderDy);
          e.anim += sp * dt * 0.4;
          e.moving = true;
        } else {
          e.moving = false;
        }
      }
    }

    // --- jutsus en vuelo ---
    for (let i = g.projectiles.length - 1; i >= 0; i--) {
      const pr = g.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;

      let remove = pr.life <= 0 || isSolidTile(tileAt(g.zone, pr.x, pr.y + 20));

      if (!remove) {
        for (const e of g.enemies) {
          if (!e.alive || pr.hits.has(e)) continue;
          if (Math.hypot(e.x - pr.x, e.y - 26 - pr.y) < pr.radius + 20) {
            pr.hits.add(e);
            damageEnemy(e, pr.damage, pr.x, pr.y);
            pr.pierce--;
            if (pr.pierce <= 0) { remove = true; break; }
          }
        }
      }

      if (remove) {
        if (pr.life > 0) burst(pr.x, pr.y, pr.color, 0.2);
        g.projectiles.splice(i, 1);
      }
    }

    // --- estrellas de impacto ---
    for (let i = g.bursts.length - 1; i >= 0; i--) {
      g.bursts[i].life -= dt;
      if (g.bursts[i].life <= 0) g.bursts.splice(i, 1);
    }

    // --- avisos flotantes ---
    for (let i = g.floaters.length - 1; i >= 0; i--) {
      const f = g.floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= 0.94;
      if (f.life <= 0) g.floaters.splice(i, 1);
    }

    // --- jugadores remotos (suavizado hacia la ultima posicion recibida) ---
    const now = Date.now();
    for (const [uid, r] of g.remote) {
      const k = Math.min(1, dt * 12);
      const before = { x: r.x, y: r.y };
      r.x += (r.tx - r.x) * k;
      r.y += (r.ty - r.y) * k;
      const moved = Math.hypot(r.x - before.x, r.y - before.y);
      r.moving = moved > 0.3;
      r.anim += moved * 0.35;
      r.attackT = Math.max(0, (r.attackT || 0) - dt / 0.25);
      if (now - r.lastSeen > 20000) g.remote.delete(uid);
    }
  }

  // ---------- api publica ----------

  return {
    state: g,
    update,
    attack: doMelee,
    cast: castJutsu,
    selectSlot: (s) => { g.player.slot = s; },

    // Lo que se manda a los amigos por la red
    netSnapshot: () => ({
      x: Math.round(g.player.x),
      y: Math.round(g.player.y),
      dir: g.player.dir,
      moving: g.player.moving,
      zone: g.zone.id,
      level: g.player.level,
      name: g.player.name,
      outfit: g.player.outfit
    }),

    // Lo que recibimos de un amigo
    applyRemote: (uid, data) => {
      let r = g.remote.get(uid);
      if (!r) {
        r = {
          x: data.x, y: data.y, tx: data.x, ty: data.y,
          dir: 'down', anim: 0, moving: false, attackT: 0,
          name: data.name || 'Ninja', level: data.level || 1,
          outfit: data.outfit || 'sasuke', zone: data.zone || 'konoha',
          lastSeen: Date.now()
        };
        g.remote.set(uid, r);
      }
      r.tx = data.x;
      r.ty = data.y;
      r.dir = data.dir || r.dir;
      r.zone = data.zone || r.zone;
      r.name = data.name || r.name;
      r.level = data.level || r.level;
      r.outfit = data.outfit || r.outfit;
      r.lastSeen = Date.now();
    },

    remoteAttack: (uid) => {
      const r = g.remote.get(uid);
      if (r) r.attackT = 1;
    },

    removeRemote: (uid) => { g.remote.delete(uid); },

    // Resumen para la interfaz de React
    hud: () => ({
      hp: Math.round(g.player.hp),
      maxHp: g.player.maxHp,
      chakra: Math.round(g.player.chakra),
      maxChakra: g.player.maxChakra,
      level: g.player.level,
      xp: Math.round(g.player.xp),
      xpNext: xpToNext(g.player.level),
      zoneName: g.zone.name,
      zoneId: g.zone.id,
      safe: g.zone.safe,
      slot: g.player.slot,
      jutsus: unlockedJutsus(g.player.level).map((j) => ({ slot: j.slot, name: j.name, cost: j.cost })),
      dead: g.player.dead,
      respawnT: Math.max(0, g.player.respawnT),
      kills: g.kills,
      online: [...g.remote.values()].filter((r) => r.zone === g.zone.id).length,
      onlineTotal: g.remote.size
    }),

    // Datos que se guardan en Supabase
    saveData: () => ({
      level: g.player.level,
      xp: Math.round(g.player.xp),
      hp: Math.round(g.player.hp),
      chakra: Math.round(g.player.chakra),
      zoneid: g.zone.id,
      posx: Math.round(g.player.x),
      posy: Math.round(g.player.y),
      outfit: g.player.outfit
    })
  };
}
