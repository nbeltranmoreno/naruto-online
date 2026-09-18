// Niveles, estadisticas y jutsus. Todo el "cuanto pega" y "cuanto aguanta"
// sale de aqui, para poder equilibrar el juego tocando un solo archivo.

// Experiencia necesaria para pasar del nivel actual al siguiente
export const xpToNext = (level) => Math.floor(30 * Math.pow(level, 1.45));

export const statsForLevel = (level) => ({
  maxHp: 100 + (level - 1) * 18,
  maxChakra: 50 + (level - 1) * 10,
  meleeDamage: 8 + level * 2
});

export const JUTSUS = [
  {
    id: 'shuriken', slot: 1, name: 'Shuriken', level: 1, cost: 6,
    damage: (lvl) => 10 + lvl * 2, speed: 330, radius: 5, pierce: 1, life: 1.1, color: '#cbd5e1'
  },
  {
    id: 'katon', slot: 2, name: 'Bola de Fuego', level: 3, cost: 18,
    damage: (lvl) => 22 + lvl * 3, speed: 230, radius: 12, pierce: 3, life: 1.0, color: '#fb923c'
  },
  {
    id: 'rasengan', slot: 3, name: 'Rasengan', level: 6, cost: 32,
    damage: (lvl) => 45 + lvl * 5, speed: 190, radius: 16, pierce: 99, life: 0.75, color: '#67e8f9'
  }
];

export const jutsuBySlot = (slot) => JUTSUS.find((j) => j.slot === slot);
export const unlockedJutsus = (level) => JUTSUS.filter((j) => level >= j.level);

// Tipos de enemigo. 'kind' decide como se dibuja (ninja o lobo).
export const ENEMY_TYPES = {
  bandido: { kind: 'ninja', outfit: 'bandido', hp: 30, damage: 6, speed: 62, xp: 12, aggro: 175, scale: 1, name: 'Bandido' },
  lobo:    { kind: 'wolf',  outfit: null,      hp: 24, damage: 5, speed: 96, xp: 10, aggro: 225, scale: 1, name: 'Lobo' },
  ronin:   { kind: 'ninja', outfit: 'ronin',   hp: 58, damage: 11, speed: 72, xp: 26, aggro: 200, scale: 1.05, name: 'Ronin' },
  jefe:    { kind: 'ninja', outfit: 'jefe',    hp: 240, damage: 20, speed: 64, xp: 160, aggro: 270, scale: 1.4, name: 'Ninja Desertor' }
};

// Suma experiencia y sube de nivel las veces que haga falta.
// Devuelve el estado nuevo y cuantos niveles se subieron.
export function addXp(level, xp, amount) {
  let newLevel = level;
  let newXp = xp + amount;
  let gained = 0;
  while (newXp >= xpToNext(newLevel)) {
    newXp -= xpToNext(newLevel);
    newLevel++;
    gained++;
  }
  return { level: newLevel, xp: newXp, levelsGained: gained };
}
