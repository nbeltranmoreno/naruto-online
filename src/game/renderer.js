import { TILE, VIEW_W, VIEW_H } from './constants';
import { zonePixelSize } from './zones';
import { drawNinja, drawWolf, drawAura, drawHealthBar, drawNameTag } from './sprites';

// El terreno de cada zona no cambia nunca, asi que se dibuja UNA vez en un canvas
// aparte y luego solo se copia el trozo que se ve. Sin esto habria que pintar
// miles de casillas en cada fotograma.
const zoneCache = new Map();

function paintGround(ctx, ch, x, y, p, seed) {
  switch (ch) {
    case 'r':
      ctx.fillStyle = p.road;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(x + (seed % 20), y + ((seed * 7) % 24), 3, 2);
      break;
    case 'W':
      ctx.fillStyle = '#2f6ea8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(x + 4, y + 8 + (seed % 6), 14, 2);
      ctx.fillRect(x + 14, y + 20 - (seed % 5), 12, 2);
      break;
    case 'b':
      ctx.fillStyle = '#8a6135';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let i = 0; i < TILE; i += 8) ctx.fillRect(x + i, y, 1, TILE);
      break;
    case 'd':
      ctx.fillStyle = p.grassDark;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(x + 8, y + 6, 16, 26);
      break;
    case 'P':
      ctx.fillStyle = p.road;
      ctx.fillRect(x, y, TILE, TILE);
      break;
    case ',':
      ctx.fillStyle = p.grass;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = p.grassDark;
      ctx.fillRect(x + 6, y + 18, 5, 3);
      ctx.fillRect(x + 18, y + 10, 6, 3);
      ctx.fillRect(x + 12, y + 24, 4, 3);
      break;
    default:
      ctx.fillStyle = p.grass;
      ctx.fillRect(x, y, TILE, TILE);
      // Manchas suaves para que el cesped no sea un color plano
      if (seed % 5 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(x + (seed % 16), y + (seed % 14), 10, 8);
      }
  }
}

function paintObject(ctx, ch, x, y, p, seed) {
  if (ch === 'T') {
    // Tronco y copa que sobresale hacia arriba: da profundidad al bosque
    ctx.fillStyle = '#5b3a20';
    ctx.fillRect(x + 13, y + 16, 6, 14);
    ctx.fillStyle = '#1f5c2a';
    ctx.beginPath();
    ctx.arc(x + 16, y + 10, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b7a36';
    ctx.beginPath();
    ctx.arc(x + 12 + (seed % 4), y + 6, 10, 0, Math.PI * 2);
    ctx.fill();
  } else if (ch === '#') {
    ctx.fillStyle = '#b08b5e';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#8e6c45';
    ctx.fillRect(x, y, TILE, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, y + TILE - 3, TILE, 3);
    if (seed % 3 === 0) {
      ctx.fillStyle = '#6ea8d8';
      ctx.fillRect(x + 9, y + 12, 14, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 15, y + 12, 2, 12);
    }
  } else if (ch === 's') {
    ctx.fillStyle = '#7d7f86';
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 20, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a9ca3';
    ctx.beginPath();
    ctx.ellipse(x + 13, y + 16, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (ch === 'f') {
    ctx.fillStyle = '#8a6a44';
    ctx.fillRect(x + 4, y + 8, 4, 22);
    ctx.fillRect(x + 22, y + 8, 4, 22);
    ctx.fillRect(x, y + 12, TILE, 4);
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
      const ground = under === 'T' || under === '#' || under === 's' || under === 'f' ? '.' : under;
      paintGround(ctx, ground, tx * TILE, ty * TILE, zone.palette, tx * 31 + ty * 17);
    }
  }
  for (let ty = 0; ty < zone.grid.length; ty++) {
    for (let tx = 0; tx < zone.grid[ty].length; tx++) {
      paintObject(ctx, zone.grid[ty][tx], tx * TILE, ty * TILE, zone.palette, tx * 31 + ty * 17);
    }
  }

  zoneCache.set(zone.id, c);
  return c;
}

// Arco blanco del golpe cuerpo a cuerpo. t va de 1 a 0 mientras dura.
function drawSlash(ctx, x, y, dir, t) {
  const a = Math.max(0, Math.min(1, t));
  const base = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 }[dir] ?? 0;
  ctx.save();
  ctx.translate(x, y - 16);
  ctx.rotate(base);
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(10, 0, 20, -0.9 + (1 - a) * 1.6, 0.5 + (1 - a) * 1.6);
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function render(g) {
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

    // Portales: halo que late, para que se vea que ahi se cambia de zona
    for (const p of zone.portals) {
      const cx = (p.x + p.w / 2) * TILE;
      const cy = (p.y + p.h / 2) * TILE;
      const r = 16 + Math.sin(g.time * 3) * 3;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 10);
      grad.addColorStop(0, 'rgba(129,230,217,0.75)');
      grad.addColorStop(1, 'rgba(129,230,217,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r - 12, cy - r - 12, (r + 12) * 2, (r + 12) * 2);
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
        if (t.kind === 'wolf') {
          drawWolf(ctx, o.x, o.y, { dir: o.dir, anim: o.anim, moving: o.moving, hurt: o.hurt });
        } else {
          drawNinja(ctx, o.x, o.y, { dir: o.dir, anim: o.anim, outfit: t.outfit, moving: o.moving, scale: t.scale, hurt: o.hurt });
        }
        drawHealthBar(ctx, o.x, o.y - 40 * t.scale, o.hp / o.maxHp, o.type === 'jefe' ? 42 : 26, 4);
        if (o.type === 'jefe') drawNameTag(ctx, o.x, o.y - 48, t.name, '#e9d5ff');
      } else if (a.kind === 'remote') {
        drawNinja(ctx, o.x, o.y, { dir: o.dir, anim: o.anim, outfit: o.outfit, moving: o.moving });
        drawNameTag(ctx, o.x, o.y - 40, o.name + ' Lv' + o.level, '#7dd3fc');
        if (o.attackT > 0) drawSlash(ctx, o.x, o.y, o.dir, o.attackT);
      } else {
        drawNinja(ctx, o.x, o.y, { dir: o.dir, anim: o.anim, outfit: o.outfit, moving: o.moving, hurt: o.hurt });
        drawNameTag(ctx, o.x, o.y - 40, o.name, '#fde68a');
        if (o.attackT > 0) drawSlash(ctx, o.x, o.y, o.dir, o.attackT);
      }
    }

    // Jutsus en vuelo
    for (const p of g.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      if (p.kind === 'shuriken') {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.translate(p.x, p.y);
        ctx.rotate(g.time * 18);
        ctx.beginPath();
        ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Numeros de dano y avisos flotantes
    ctx.save();
    ctx.font = 'bold 14px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const f of g.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();

    ctx.restore();
  }

  return { render };
}
