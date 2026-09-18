import { TILE } from './constants';

// Leyenda de casillas:
//   .  cesped        ,  cesped con mata     r  camino de tierra
//   T  arbol         W  agua                #  pared de edificio
//   d  puerta        s  roca                f  valla
//   b  puente        P  portal a otra zona
export const SOLID = new Set(['T', 'W', '#', 's', 'f']);

export const isSolidTile = (ch) => SOLID.has(ch);

// Generador pseudoaleatorio con semilla: el mapa sale igual para todos los jugadores
const rngFrom = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

// Constructor de mapas: se empieza con cesped y se van aplicando formas encima
class MapBuilder {
  constructor(w, h, fill = '.') {
    this.w = w;
    this.h = h;
    this.grid = Array.from({ length: h }, () => Array(w).fill(fill));
  }

  set(x, y, ch) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.grid[y][x] = ch;
    return this;
  }

  rect(x, y, w, h, ch) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }

  // Marco de arboles alrededor del mapa para que no se pueda salir
  border(ch = 'T', thickness = 1) {
    for (let t = 0; t < thickness; t++) {
      for (let i = 0; i < this.w; i++) { this.set(i, t, ch); this.set(i, this.h - 1 - t, ch); }
      for (let j = 0; j < this.h; j++) { this.set(t, j, ch); this.set(this.w - 1 - t, j, ch); }
    }
    return this;
  }

  hRoad(y, x1, x2) { for (let i = x1; i <= x2; i++) { this.set(i, y, 'r'); this.set(i, y + 1, 'r'); } return this; }
  vRoad(x, y1, y2) { for (let j = y1; j <= y2; j++) { this.set(x, j, 'r'); this.set(x + 1, j, 'r'); } return this; }

  // Casa: paredes solidas con una puerta decorativa abajo en el centro
  house(x, y, w, h) {
    this.rect(x, y, w, h, '#');
    this.set(x + Math.floor(w / 2), y + h - 1, 'd');
    return this;
  }

  // Esparce casillas sueltas por sitios libres (arboles, matas, rocas)
  scatter(ch, count, rng) {
    let placed = 0;
    let guard = count * 40;
    while (placed < count && guard-- > 0) {
      const x = 2 + Math.floor(rng() * (this.w - 4));
      const y = 2 + Math.floor(rng() * (this.h - 4));
      if (this.grid[y][x] !== '.') continue;
      this.set(x, y, ch);
      placed++;
    }
    return this;
  }

  done() { return this.grid; }
}

function buildKonoha() {
  const b = new MapBuilder(44, 30);
  const rng = rngFrom(1001);

  b.border('T', 2);
  b.hRoad(14, 2, 41);
  b.vRoad(20, 2, 29);

  // Barrio norte
  b.house(5, 4, 6, 4);
  b.house(14, 4, 5, 4);
  b.house(27, 4, 7, 5);
  b.house(36, 5, 5, 4);
  // Barrio sur
  b.house(5, 19, 6, 5);
  b.house(14, 21, 5, 4);
  b.house(26, 19, 8, 5);
  b.house(37, 21, 4, 4);

  // Plaza empedrada arriba y abajo del cruce
  b.rect(17, 11, 8, 2, 'r');
  b.rect(17, 17, 8, 2, 'r');

  // Estanque decorativo al suroeste
  b.rect(4, 26, 7, 2, 'W');

  b.scatter(',', 60, rng);
  b.scatter('T', 26, rng);

  // Portal al bosque, en el extremo este de la calle principal
  b.set(42, 14, 'P'); b.set(42, 15, 'P');

  return {
    id: 'konoha',
    name: 'Aldea de la Hoja',
    safe: true,
    grid: b.done(),
    spawn: { x: 20, y: 15 },
    portals: [{ x: 42, y: 14, w: 1, h: 2, to: 'bosque', at: { x: 3, y: 15 } }],
    spawners: [],
    palette: { grass: '#3f8f45', grassDark: '#347a3a', road: '#c2a06a' }
  };
}

function buildBosque() {
  const b = new MapBuilder(48, 34);
  const rng = rngFrom(2002);

  b.border('T', 2);
  b.hRoad(15, 2, 22);
  b.vRoad(22, 8, 16);
  b.hRoad(8, 22, 45);

  b.scatter('T', 230, rng);
  b.scatter(',', 90, rng);
  b.scatter('s', 18, rng);

  // Claro central despejado para pelear
  b.rect(30, 18, 10, 8, '.');
  b.rect(31, 19, 8, 6, ',');

  b.set(1, 15, 'P'); b.set(1, 16, 'P');
  b.set(46, 8, 'P'); b.set(46, 9, 'P');

  return {
    id: 'bosque',
    name: 'Bosque de la Muerte',
    safe: false,
    grid: b.done(),
    spawn: { x: 3, y: 15 },
    portals: [
      { x: 1, y: 15, w: 1, h: 2, to: 'konoha', at: { x: 40, y: 15 } },
      { x: 46, y: 8, w: 1, h: 2, to: 'valle', at: { x: 3, y: 12 } }
    ],
    spawners: [
      { x: 14, y: 22, type: 'bandido', count: 3, radius: 6 },
      { x: 34, y: 22, type: 'bandido', count: 3, radius: 5 },
      { x: 36, y: 12, type: 'lobo', count: 3, radius: 6 },
      { x: 10, y: 8, type: 'lobo', count: 2, radius: 5 }
    ],
    palette: { grass: '#2f6b38', grassDark: '#275a30', road: '#a8874f' }
  };
}

function buildValle() {
  const b = new MapBuilder(46, 32);
  const rng = rngFrom(3003);

  b.border('s', 2);
  // Rio que parte el valle, con un puente en el centro
  b.rect(20, 2, 6, 28, 'W');
  b.rect(20, 14, 6, 3, 'b');
  b.hRoad(15, 2, 43);

  b.scatter('s', 60, rng);
  b.scatter(',', 70, rng);
  b.scatter('T', 24, rng);

  // Explanada del jefe al este
  b.rect(34, 20, 9, 8, '.');

  b.set(1, 12, 'P'); b.set(1, 13, 'P');

  return {
    id: 'valle',
    name: 'Valle del Fin',
    safe: false,
    grid: b.done(),
    spawn: { x: 3, y: 12 },
    portals: [{ x: 1, y: 12, w: 1, h: 2, to: 'bosque', at: { x: 44, y: 8 } }],
    spawners: [
      { x: 10, y: 22, type: 'ronin', count: 3, radius: 5 },
      { x: 12, y: 6, type: 'ronin', count: 2, radius: 5 },
      { x: 34, y: 8, type: 'lobo', count: 3, radius: 5 },
      { x: 38, y: 24, type: 'jefe', count: 1, radius: 3 }
    ],
    palette: { grass: '#4a6b3a', grassDark: '#3e5c31', road: '#9c8560' }
  };
}

export const ZONES = {
  konoha: buildKonoha(),
  bosque: buildBosque(),
  valle: buildValle()
};

export const getZone = (id) => ZONES[id] || ZONES.konoha;

// Consulta de colision en coordenadas de pixeles
export function tileAt(zone, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || ty >= zone.grid.length || tx >= zone.grid[0].length) return 'T';
  return zone.grid[ty][tx];
}

export const zonePixelSize = (zone) => ({
  w: zone.grid[0].length * TILE,
  h: zone.grid.length * TILE
});
