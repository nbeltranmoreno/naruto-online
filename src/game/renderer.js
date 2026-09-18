import { TILE, VIEW_W, VIEW_H } from './constants';
import { zonePixelSize } from './zones';
import { drawCharacter, drawAura, drawHealthBar, drawNameTag, shade } from './sprites';

// Estilo: colores vivos y planos, contornos oscuros y sombras en banda dura.
// Es el mismo criterio que en sprites.js, para que personajes y escenario
// parezcan del mismo dibujo.
const INK = '#241b33';

// El terreno de cada zona no cambia nunca, asi que se dibuja UNA vez en un canvas
// aparte y luego solo se copia el trozo que se ve. Por eso puede llevar mucho
// detalle sin costar nada por fotograma.
const zoneCache = new Map();

// Ruido con semilla: el mismo mapa se dibuja igual siempre
const noise = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function paintGround(ctx, ch, x, y, p, tx, ty) {
  const r = noise(tx, ty);

  switch (ch) {
    case 'r': {
      ctx.fillStyle = p.road;
      ctx.fillRect(x, y, TILE, TILE);
      // Gravilla y rodadas
      ctx.fillStyle = shade(p.road, -0.16);
      for (let i = 0; i < 7; i++) {
        const gx = x + noise(tx * 9 + i, ty) * TILE;
        const gy = y + noise(tx, ty * 9 + i) * TILE;
        ctx.beginPath();
        ctx.arc(gx, gy, 1 + noise(i, tx + ty) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = shade(p.road, 0.14);
      ctx.fillRect(x, y + 6 + r * 6, TILE, 2);
      break;
    }
    case 'W': {
      const g = ctx.createLinearGradient(x, y, x, y + TILE);
      g.addColorStop(0, '#3ba7dd');
      g.addColorStop(1, '#2b7fb8');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TILE, TILE);
      // Olas en linea, muy de dibujo animado
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const wy = y + 12 + i * 20 + r * 6;
        ctx.beginPath();
        ctx.moveTo(x + 6 + r * 8, wy);
        ctx.quadraticCurveTo(x + 16, wy - 3, x + 26 + r * 6, wy);
        ctx.stroke();
      }
      break;
    }
    case 'b': {
      ctx.fillStyle = '#a9743c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = shade('#a9743c', -0.35);
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= TILE; i += 12) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + TILE);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x, y + 2, TILE, 3);
      break;
    }
    case 'P': {
      ctx.fillStyle = shade(p.road, -0.05);
      ctx.fillRect(x, y, TILE, TILE);
      break;
    }
    default: {
      // Cesped: base viva, manchas mas oscuras y briznas
      ctx.fillStyle = p.grass;
      ctx.fillRect(x, y, TILE, TILE);

      ctx.fillStyle = shade(p.grass, -0.12);
      ctx.beginPath();
      ctx.ellipse(x + r * TILE, y + noise(ty, tx) * TILE, 14, 9, r * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = shade(p.grass, 0.3);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      const blades = ch === ',' ? 9 : 4;
      for (let i = 0; i < blades; i++) {
        const bx = x + noise(tx * 13 + i, ty * 7) * (TILE - 6) + 3;
        const by = y + noise(tx * 5, ty * 11 + i) * (TILE - 8) + 6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + 1.5, by - 4, bx + 3.5, by - 6);
        ctx.stroke();
      }

      // Alguna flor suelta
      if (ch === ',' && r > 0.72) {
        const fx = x + r * (TILE - 12) + 6;
        const fy = y + noise(ty, tx * 3) * (TILE - 12) + 6;
        ctx.fillStyle = r > 0.88 ? '#ffe37a' : '#ffffff';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f2a33c';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Sombra que proyectan arboles, rocas y casas sobre el suelo
function castShadow(ctx, cx, cy, rw, rh) {
  ctx.save();
  ctx.fillStyle = 'rgba(20,15,40,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintObject(ctx, ch, x, y, p, tx, ty) {
  const r = noise(tx, ty);

  if (ch === 'T') {
    const cx = x + TILE / 2;
    const tall = r > 0.66 ? 10 : 0;   // algunos arboles mas altos, para que no sean todos iguales
    castShadow(ctx, cx + 7, y + TILE - 5, 26, 10);

    // Tronco con raices marcadas
    ctx.fillStyle = '#7a4f2b';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 6, y + TILE - 3);
    ctx.lineTo(cx - 4, y + 16);
    ctx.lineTo(cx + 4, y + 16);
    ctx.lineTo(cx + 6, y + TILE - 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shade('#7a4f2b', -0.32);
    ctx.fillRect(cx + 1, y + 17, 4, TILE - 21);

    // Copa: varias masas superpuestas que suben por encima de la casilla
    const blobs = [
      [cx - 16, y + 6 - tall, 17],
      [cx + 16, y + 8 - tall, 16],
      [cx - 5, y - 6 - tall, 20],
      [cx + 8, y - 12 - tall, 17]
    ];
    ctx.beginPath();
    for (const [bx, by, br] of blobs) {
      ctx.moveTo(bx + br, by);
      ctx.arc(bx, by, br, 0, Math.PI * 2);
    }
    ctx.fillStyle = r > 0.85 ? '#4e9c3c' : '#41a84e';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Sombra de la parte baja y brillo arriba a la izquierda
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(20,60,30,0.32)';
    ctx.fillRect(x - TILE, y + 12 - tall, TILE * 3, TILE);
    ctx.fillStyle = '#6ed16f';
    ctx.beginPath();
    ctx.ellipse(cx - 12, y - 14 - tall, 15, 7, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(cx + 10, y - 20 - tall, 9, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (ch === 's') {
    castShadow(ctx, x + TILE / 2 + 4, y + TILE - 8, 16, 6);
    ctx.fillStyle = '#8d9099';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 38);
    ctx.lineTo(x + 12, y + 16);
    ctx.lineTo(x + 26, y + 10);
    ctx.lineTo(x + 41, y + 22);
    ctx.lineTo(x + 39, y + 38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a9adb6';
    ctx.beginPath();
    ctx.moveTo(x + 13, y + 17);
    ctx.lineTo(x + 26, y + 11);
    ctx.lineTo(x + 30, y + 20);
    ctx.lineTo(x + 16, y + 24);
    ctx.closePath();
    ctx.fill();
  } else if (ch === 'f') {
    ctx.fillStyle = '#a9743c';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    for (const px of [x + 6, x + 30]) {
      ctx.beginPath();
      ctx.roundRect(px, y + 10, 8, 32, 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.roundRect(x, y + 18, TILE, 7, 2);
    ctx.fill();
    ctx.stroke();
  }
  // Las casillas '#' y 'd' no se pintan sueltas: forman parte de una casa
  // entera, que se dibuja en paintBuildings.
}

// Una casa completa: tejado con alero, paredes, ventanas y puerta.
// Dibujar cada casilla por separado hacia que pareciesen cajas apiladas.
function drawHouse(ctx, x, y, w, h, r) {
  const roofs = [
    { tile: '#41527f', edge: '#2c3a60' },
    { tile: '#7a3f42', edge: '#5a2c2f' },
    { tile: '#46614f', edge: '#324838' }
  ];
  const roof = roofs[Math.floor(r * roofs.length) % roofs.length];
  const roofH = Math.min(h * 0.62, 46);
  const wallTop = y + roofH - 8;
  const wallH = y + h - wallTop;
  const over = 9; // vuelo del alero

  castShadow(ctx, x + w / 2 + 10, y + h - 4, w * 0.55, 11);

  // --- paredes ---
  ctx.fillStyle = '#f0dfbe';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.rect(x, wallTop, w, wallH);
  ctx.fill();
  ctx.stroke();

  // Zocalo y vigas de madera
  ctx.fillStyle = '#9a6238';
  ctx.fillRect(x, y + h - 9, w, 9);
  ctx.fillRect(x, wallTop, 6, wallH);
  ctx.fillRect(x + w - 6, wallTop, 6, wallH);
  // Sombra que el alero proyecta sobre la pared
  ctx.fillStyle = 'rgba(60,45,30,0.22)';
  ctx.fillRect(x, wallTop, w, 9);

  // --- ventanas ---
  const winCount = Math.max(1, Math.floor((w - 24) / 46));
  const step = (w - 20) / winCount;
  for (let i = 0; i < winCount; i++) {
    const wx = x + 10 + step * i + step / 2 - 15;
    const wy = wallTop + 16;
    if (wallH < 42) break;
    ctx.fillStyle = '#ffd97a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(wx, wy, 30, 22, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#9a6238';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx + 15, wy); ctx.lineTo(wx + 15, wy + 22);
    ctx.moveTo(wx, wy + 11); ctx.lineTo(wx + 30, wy + 11);
    ctx.stroke();
  }

  // --- puerta ---
  const dw = 30;
  const dx = x + w / 2 - dw / 2;
  const dh = Math.min(38, wallH - 6);
  ctx.fillStyle = '#7a4a26';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.roundRect(dx, y + h - dh, dw, dh, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(dx + 3, y + h - dh + 3, dw - 6, 5);
  ctx.fillStyle = '#e3c163';
  ctx.beginPath();
  ctx.arc(dx + dw - 7, y + h - dh / 2, 2.6, 0, Math.PI * 2);
  ctx.fill();

  // --- tejado a dos aguas con alero ---
  ctx.beginPath();
  ctx.moveTo(x - over, wallTop + 4);
  ctx.lineTo(x + w * 0.2, y);
  ctx.lineTo(x + w * 0.8, y);
  ctx.lineTo(x + w + over, wallTop + 4);
  ctx.closePath();
  ctx.fillStyle = roof.tile;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Hiladas de tejas
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - over, wallTop + 4);
  ctx.lineTo(x + w * 0.2, y);
  ctx.lineTo(x + w * 0.8, y);
  ctx.lineTo(x + w + over, wallTop + 4);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = roof.edge;
  ctx.lineWidth = 2;
  for (let ry = y + 8; ry < wallTop + 4; ry += 9) {
    ctx.beginPath();
    ctx.moveTo(x - over, ry);
    ctx.lineTo(x + w + over, ry);
    ctx.stroke();
  }
  // Brillo del lado iluminado
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.moveTo(x - over, wallTop + 4);
  ctx.lineTo(x + w * 0.2, y);
  ctx.lineTo(x + w * 0.42, y);
  ctx.lineTo(x + w * 0.1, wallTop + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Cumbrera
  ctx.fillStyle = roof.edge;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x + w * 0.2 - 3, y - 4, w * 0.6 + 6, 8, 3);
  ctx.fill();
  ctx.stroke();
}

// Busca los grupos de casillas '#'/'d' y dibuja una casa por cada grupo
function paintBuildings(ctx, zone) {
  const grid = zone.grid;
  const cols = grid[0].length;
  const isWall = (c) => c === '#' || c === 'd';
  const seen = new Set();

  for (let ty = 0; ty < grid.length; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (!isWall(grid[ty][tx]) || seen.has(ty * cols + tx)) continue;

      // Recorrido en anchura para hallar el rectangulo que ocupa la casa
      let minX = tx, maxX = tx, minY = ty, maxY = ty;
      const stack = [[tx, ty]];
      seen.add(ty * cols + tx);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (ny < 0 || ny >= grid.length || nx < 0 || nx >= cols) continue;
          if (!isWall(grid[ny][nx]) || seen.has(ny * cols + nx)) continue;
          seen.add(ny * cols + nx);
          stack.push([nx, ny]);
        }
      }

      drawHouse(
        ctx,
        minX * TILE, minY * TILE,
        (maxX - minX + 1) * TILE, (maxY - minY + 1) * TILE,
        noise(minX, minY)
      );
    }
  }
}

function buildZoneCanvas(zone) {
  if (zoneCache.has(zone.id)) return zoneCache.get(zone.id);

  const { w, h } = zonePixelSize(zone);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // Primero todo el suelo y despues los objetos: asi los arboles pueden
  // sobresalir por encima de la casilla de arriba sin recortarse.
  for (let ty = 0; ty < zone.grid.length; ty++) {
    for (let tx = 0; tx < zone.grid[ty].length; tx++) {
      const under = zone.grid[ty][tx];
      const ground = 'T#sfd'.includes(under) ? (under === 'd' ? 'r' : '.') : under;
      paintGround(ctx, ground, tx * TILE, ty * TILE, zone.palette, tx, ty);
    }
  }
  // Las casas se dibujan enteras antes que arboles y rocas, para que la
  // vegetacion pueda solaparse por delante de ellas.
  paintBuildings(ctx, zone);

  for (let ty = 0; ty < zone.grid.length; ty++) {
    for (let tx = 0; tx < zone.grid[ty].length; tx++) {
      paintObject(ctx, zone.grid[ty][tx], tx * TILE, ty * TILE, zone.palette, tx, ty);
    }
  }

  zoneCache.set(zone.id, c);
  // Gancho de depuracion: deja volcar el mapa entero a imagen desde la consola
  if (typeof window !== 'undefined') {
    window.__zonas = window.__zonas || {};
    window.__zonas[zone.id] = c;
  }
  return c;
}

// Arco blanco del golpe cuerpo a cuerpo, con estela. t va de 1 a 0.
function drawSlash(ctx, x, y, dir, t) {
  const a = Math.max(0, Math.min(1, t));
  const base = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 }[dir] ?? 0;
  ctx.save();
  ctx.translate(x, y - 26);
  ctx.rotate(base + (1 - a) * 1.5);
  ctx.globalAlpha = a;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(14, 0, 28, -0.95, 0.55);
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(14, 0, 28, -0.9, 0.5);
  ctx.stroke();
  ctx.restore();
}

// Estrella de impacto: el golpe seco tipico del anime
function drawBurst(ctx, b) {
  const a = Math.max(0, b.life / b.maxLife);
  const scale = 1 + (1 - a) * 1.4;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.rot);
  ctx.scale(scale, scale);
  ctx.globalAlpha = a;
  ctx.fillStyle = b.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const pts = 9;
  for (let i = 0; i < pts * 2; i++) {
    const rad = i % 2 === 0 ? 20 : 8;
    const ang = (i / (pts * 2)) * Math.PI * 2;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Bola de chakra que crece en las manos mientras se concentra el jutsu
function drawChakra(ctx, x, y, dir, t, color) {
  const k = 1 - Math.max(0, Math.min(1, t));
  const crece = Math.sin(k * Math.PI);
  if (crece <= 0.02) return;

  const [vx, vy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir] ?? [0, 1];
  const cx = x + vx * 20;
  const cy = y - 30 + vy * 10;
  const r = 4 + crece * 12;

  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, color);
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Chispas girando alrededor
  ctx.globalAlpha = 0.8 * crece;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = k * 14 + (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + 2), cy + Math.sin(a) * (r + 2) * 0.6);
    ctx.lineTo(cx + Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7) * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

// Lineas de velocidad detras del jugador cuando corre
function drawSpeedLines(ctx, x, y, dir, t) {
  const [vx, vy] = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[dir] ?? [0, -1];
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * 9;
    const len = 16 + Math.sin(t * 22 + i) * 7;
    ctx.lineWidth = 2.5 - i * 0.4;
    ctx.beginPath();
    ctx.moveTo(x + vx * 16 + (vy ? off : 0), y - 30 + vy * 10 + (vx ? off : 0));
    ctx.lineTo(x + vx * (16 + len) + (vy ? off : 0), y - 30 + vy * (10 + len) + (vx ? off : 0));
    ctx.stroke();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  // Hojas y polvo que flotan por la pantalla: cuestan nada y dan mucha vida
  const motes = Array.from({ length: 26 }, () => ({
    x: Math.random() * VIEW_W,
    y: Math.random() * VIEW_H,
    s: 1.5 + Math.random() * 3,
    vx: -8 - Math.random() * 18,
    vy: 6 + Math.random() * 14,
    rot: Math.random() * 6.3,
    spin: (Math.random() - 0.5) * 2
  }));

  function drawMotes(dt, zone) {
    const leafy = zone.id !== 'valle';
    ctx.save();
    for (const m of motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.spin * dt;
      if (m.x < -10) { m.x = VIEW_W + 10; m.y = Math.random() * VIEW_H; }
      if (m.y > VIEW_H + 10) { m.y = -10; m.x = Math.random() * VIEW_W; }

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      if (leafy) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = zone.id === 'bosque' ? '#9ad36f' : '#e8c86a';
        ctx.beginPath();
        ctx.ellipse(0, 0, m.s * 1.6, m.s * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, m.s * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // Tono de luz por zona, para que cada sitio tenga su ambiente
  const TINTS = {
    konoha: { color: 'rgba(255,214,140,0.10)', vignette: 0.28 },
    bosque: { color: 'rgba(60,120,80,0.18)', vignette: 0.42 },
    valle: { color: 'rgba(120,140,190,0.16)', vignette: 0.38 }
  };

  let lastTime = 0;

  function render(g) {
    const dt = Math.min(0.05, Math.max(0, g.time - lastTime));
    lastTime = g.time;

    const zone = g.zone;
    const bg = buildZoneCanvas(zone);
    const { w: worldW, h: worldH } = zonePixelSize(zone);

    // Camara centrada en el jugador pero sin salirse del mapa
    const camX = Math.round(Math.min(Math.max(g.player.x - VIEW_W / 2, 0), Math.max(0, worldW - VIEW_W)));
    const camY = Math.round(Math.min(Math.max(g.player.y - VIEW_H / 2, 0), Math.max(0, worldH - VIEW_H)));

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(bg, camX, camY, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

    ctx.save();
    ctx.translate(-camX, -camY);

    // Portales: remolino de luz
    for (const p of zone.portals) {
      const cx = (p.x + p.w / 2) * TILE;
      const cy = (p.y + p.h / 2) * TILE;
      const r = 26 + Math.sin(g.time * 3) * 4;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 16);
      grad.addColorStop(0, 'rgba(180,250,255,0.85)');
      grad.addColorStop(0.45, 'rgba(110,220,235,0.4)');
      grad.addColorStop(1, 'rgba(110,220,235,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r - 20, cy - r - 20, (r + 20) * 2, (r + 20) * 2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(g.time * 1.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.62, 0, 1.4);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Todo lo que pisa el suelo se ordena por Y: lo de abajo tapa a lo de arriba
    const actors = [];
    for (const e of g.enemies) if (e.alive) actors.push({ y: e.y, kind: 'enemy', ref: e });
    for (const r of g.remote.values()) if (r.zone === zone.id) actors.push({ y: r.y, kind: 'remote', ref: r });
    actors.push({ y: g.player.y, kind: 'player', ref: g.player });
    actors.sort((a, b) => a.y - b.y);

    for (const a of actors) {
      const o = a.ref;
      if (a.kind === 'enemy') {
        const t = o.def;
        if (o.type === 'jefe') drawAura(ctx, o.x, o.y, g.time);
        drawCharacter(ctx, o.x, o.y, {
          dir: o.dir, anim: o.anim, moving: o.moving, hurt: o.hurt,
          outfit: t.outfit, scale: t.scale, kind: t.kind,
          enemy: true, sheetId: o.type
        });
        drawHealthBar(ctx, o.x, o.y - 94 * t.scale, o.hp / o.maxHp, o.type === 'jefe' ? 56 : 34, 5);
        if (o.type === 'jefe') drawNameTag(ctx, o.x, o.y - 106, t.name, '#e9d5ff');
      } else if (a.kind === 'remote') {
        if (o.action === 'cast' && o.attackT > 0) drawChakra(ctx, o.x, o.y, o.dir, o.attackT, '#67e8f9');
        drawCharacter(ctx, o.x, o.y, {
          dir: o.dir, anim: o.anim, outfit: o.outfit, moving: o.moving,
          action: o.action, actionT: o.attackT
        });
        drawNameTag(ctx, o.x, o.y - 92, o.name + " Lv"  + o.level, '#7dd3fc');
        if (o.action === 'melee' && o.attackT > 0 && o.attackT < 0.62) drawSlash(ctx, o.x, o.y, o.dir, o.attackT);
      } else {
        if (o.moving && o.running) drawSpeedLines(ctx, o.x, o.y, o.dir, g.time);
        if (o.action === 'cast' && o.attackT > 0) {
          drawChakra(ctx, o.x, o.y, o.dir, o.attackT, o.jutsuColor || '#67e8f9');
        }
        drawCharacter(ctx, o.x, o.y, {
          dir: o.dir, anim: o.anim, outfit: o.outfit, moving: o.moving, hurt: o.hurt,
          action: o.action, actionT: o.attackT
        });
        drawNameTag(ctx, o.x, o.y - 92, o.name, '#fde68a');
        if (o.action === 'melee' && o.attackT > 0 && o.attackT < 0.62) drawSlash(ctx, o.x, o.y, o.dir, o.attackT);
      }
    }

    // Jutsus en vuelo
    for (const p of g.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // Estela
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(-p.vx * 0.035, -p.vy * 0.035, p.radius * 1.5, p.radius * 0.8,
        Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (p.kind === 'shuriken') {
        ctx.rotate(g.time * 22);
        ctx.fillStyle = '#c8d0db';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rad = i % 2 === 0 ? p.radius * 1.5 : p.radius * 0.5;
          const ang = (i / 8) * Math.PI * 2;
          const px = Math.cos(ang) * rad;
          const py = Math.sin(ang) * rad;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, p.radius * 1.6);
        gr.addColorStop(0, '#ffffff');
        gr.addColorStop(0.4, p.color);
        gr.addColorStop(1, p.color + '00');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Estrellas de impacto
    for (const b of g.bursts) drawBurst(ctx, b);

    // Numeros de dano y avisos flotantes
    ctx.save();
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.maxLife));
      ctx.font = (f.big ? '800 22px' : '800 16px') + ' ui-sans-serif, system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();

    ctx.restore();

    // --- capa de ambiente, ya en coordenadas de pantalla ---
    const tint = TINTS[zone.id] || TINTS.konoha;
    ctx.fillStyle = tint.color;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawMotes(dt, zone);

    // Vineteado: oscurece los bordes y centra la mirada
    const vg = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(8,6,20,${tint.vignette})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Destello rojo al recibir dano
    if (g.player.hurt > 0) {
      ctx.fillStyle = `rgba(220,40,40,${Math.min(0.32, g.player.hurt * 0.75)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  return { render };
}
