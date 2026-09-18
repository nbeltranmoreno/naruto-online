import { getSheet, sheetUsable, drawSheetFrame } from './spritesheet';
import { CHARACTER_SHEETS, ENEMY_SHEETS } from './characterSheets';

// Los personajes se dibujan por codigo, sin imagenes, con criterio de dibujo
// animado: color plano, una sola banda de sombra dura, un brillo duro y
// contorno grueso de color violeta oscuro (nunca negro puro).
//
// Esto es el respaldo: en cuanto se configure una hoja de sprites en
// characterSheets.js, drawCharacter usa el arte real en su lugar.
//
// Proporciones: el personaje mide unos 74px y la cabeza ocupa casi el 40%.
// Esa cabeza grande respecto al cuerpo es lo que lo hace leerse como anime y
// no como un muneco; ademas, a vista cenital, la cara se ve aunque sea pequena.

export const OUTFITS = {
  naruto:  { name: 'Uzumaki',  suit: '#f28522', trim: '#1e3a8a', hair: '#ffd93d', skin: '#ffd9ae', eyes: '#3fa9f5', band: true },
  sasuke:  { name: 'Uchiha',   suit: '#2b5296', trim: '#e2e8f0', hair: '#2f2f40', skin: '#ffdcb8', eyes: '#3a3a48', band: true },
  sakura:  { name: 'Haruno',   suit: '#e0466f', trim: '#ffe9f0', hair: '#ff9ec4', skin: '#ffdfbc', eyes: '#3fbf7f', band: true },
  kakashi: { name: 'Hatake',   suit: '#46694a', trim: '#1e2a33', hair: '#d7d7e6', skin: '#ffd9ae', eyes: '#55606e', band: true },
  bandido: { name: 'Bandido',  suit: '#6b543b', trim: '#8f3434', hair: '#2b241d', skin: '#e0b184', eyes: '#6b452f', band: false },
  ronin:   { name: 'Ronin',    suit: '#3f3f55', trim: '#a08845', hair: '#22222c', skin: '#e0b184', eyes: '#51404a', band: false },
  jefe:    { name: 'Desertor', suit: '#6b3892', trim: '#e6c043', hair: '#1d1d26', skin: '#d6a677', eyes: '#e0343c', band: false }
};

export const outfitOf = (id) => OUTFITS[id] || OUTFITS.naruto;

// Color de los contornos
const INK = '#2a2036';

// ---------- utilidades ----------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// amt > 0 aclara, amt < 0 oscurece
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (v) => {
    const n = amt > 0 ? v + (255 - v) * amt : v * (1 + amt);
    return Math.max(0, Math.min(255, Math.round(n)));
  };
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Pinta una silueta con sombreado plano: relleno, banda de sombra abajo,
// brillo arriba y contorno. `bounds` es la caja que ocupa, para recortar.
function cel(ctx, path, color, bounds, { ink = 2, shadowAt = 0.58, light = 0.28, dark = -0.3 } = {}) {
  const [bx, by, bw, bh] = bounds;
  path();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = shade(color, dark);
  ctx.fillRect(bx, by + bh * shadowAt, bw, bh * (1 - shadowAt) + 1);
  ctx.fillStyle = shade(color, light);
  ctx.fillRect(bx, by, bw, Math.max(1.5, bh * 0.15));
  ctx.restore();

  if (ink) {
    path();
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// Rectangulo redondeado con el mismo sombreado
function part(ctx, x, y, w, h, color, { r = 3, ink = 2 } = {}) {
  cel(ctx, () => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }, color, [x, y, w, h], { ink });
}

// Sombra en el suelo
export function drawShadow(ctx, x, y, rw = 22, rh = 8, alpha = 0.32) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, rw);
  g.addColorStop(0, `rgba(25,15,45,${alpha})`);
  g.addColorStop(0.62, `rgba(25,15,45,${alpha * 0.45})`);
  g.addColorStop(1, 'rgba(25,15,45,0)');
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, rh / rw);
  ctx.translate(-x, -y);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rw, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- ninja ----------
// (x, y) son los pies.
export function drawNinja(ctx, x, y, opts = {}) {
  const {
    dir = 'down', anim = 0, outfit = 'naruto',
    moving = false, scale = 1, hurt = 0
  } = opts;

  const o = outfitOf(outfit);
  const side = dir === 'left' || dir === 'right';
  const back = dir === 'up';
  const flip = dir === 'left' ? -1 : 1;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  drawShadow(ctx, 0, 0, 22 * scale, 8 * scale);
  ctx.scale(scale * (side ? flip : 1), scale);
  if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 38));

  // Ciclo de paso
  const phase = anim * 0.13;
  const swing = moving ? Math.sin(phase) : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * 2.2 : Math.sin(anim * 0.026) * 0.7;
  ctx.translate(0, -bob);

  const dark = (c) => shade(c, -0.22);

  // ---------- piernas ----------
  const legPairs = side
    ? [[-5, -swing * 8, dark(o.suit)], [-5, swing * 8, o.suit]]
    : [[-11.5, 0, dark(o.suit)], [2.5, 0, o.suit]];

  legPairs.forEach(([lx, off, col], i) => {
    const lift = Math.max(0, (i === 0 ? -swing : swing) * 4);
    ctx.save();
    ctx.translate(off * 0.85, -lift);
    // Pantalon
    part(ctx, lx, -27, 9, 20, shade(col, -0.45), { r: 3 });
    // Venda del tobillo
    ctx.fillStyle = '#efeadd';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(lx - 0.5, -9, 10, 5, 1.5);
    ctx.fill();
    ctx.stroke();
    // Sandalia
    part(ctx, lx - 1.5, -5, 12, 5, '#2f3642', { r: 2, ink: 1.8 });
    ctx.restore();
  });

  // ---------- brazo de detras ----------
  const armAngleBack = side ? swing * 9 : swing * 6;
  const drawArm = (ax, off, col) => {
    ctx.save();
    ctx.translate(0, off * 0.35);
    part(ctx, ax, -46, 7.5, 18, col, { r: 3.5 });
    // Mano: ovalo alineado con el brazo, no una bola suelta
    cel(ctx, () => { ctx.beginPath(); ctx.ellipse(ax + 3.7, -27.5, 3.8, 4.4, 0, 0, Math.PI * 2); },
      o.skin, [ax, -32, 8, 9], { ink: 1.5 });
    ctx.restore();
  };

  if (side) drawArm(-4.5, armAngleBack, shade(o.suit, -0.32));
  else drawArm(9, armAngleBack, shade(o.suit, -0.14));

  // ---------- torso ----------
  // Silueta con hombros anchos y cintura estrecha
  const torsoPath = () => {
    ctx.beginPath();
    const halfTop = side ? 9 : 13.5;
    const halfBot = side ? 8 : 10.5;
    ctx.moveTo(-halfTop, -48);
    ctx.quadraticCurveTo(-halfTop - 2, -36, -halfBot, -25);
    ctx.lineTo(halfBot, -25);
    ctx.quadraticCurveTo(halfTop + 2, -36, halfTop, -48);
    ctx.closePath();
  };
  cel(ctx, torsoPath, o.suit, [-16, -48, 32, 23], { ink: 2.2 });

  // Cremallera y cuello alto de la chaqueta
  ctx.save();
  torsoPath();
  ctx.clip();
  if (!back) {
    ctx.fillStyle = o.trim;
    ctx.fillRect(side ? -1.5 : -2.5, -47, side ? 3 : 5, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(side ? -1.5 : -2.5, -47, 1.2, 22);
  }
  // Hombreras mas claras
  ctx.fillStyle = shade(o.suit, 0.2);
  ctx.fillRect(-16, -48, 32, 4);
  ctx.restore();

  // Cuello de la chaqueta
  part(ctx, side ? -7 : -9, -51, side ? 14 : 18, 6, shade(o.suit, -0.12), { r: 2.5, ink: 1.8 });

  // Cinturon estrecho, y la bolsa de armas pequena en la cadera
  part(ctx, side ? -8 : -11, -28, side ? 16 : 22, 3.5, '#453626', { r: 1.5, ink: 1.4 });
  if (!back) part(ctx, side ? 5 : 8, -31, 6, 8, '#54422e', { r: 1.5, ink: 1.4 });

  // ---------- brazo de delante ----------
  if (side) drawArm(-4.5, -armAngleBack, o.suit);
  else drawArm(-17, -armAngleBack, o.suit);

  // ---------- cabeza ----------
  // Centro de la cara y radios. La cara es ancha y con barbilla corta.
  const cxF = side ? 1.5 : 0;
  const cyF = -60;
  const rxF = side ? 12 : 14;
  const ryF = 15;

  // Cuello
  part(ctx, -4.5, -50, 9, 5, shade(o.skin, -0.3), { r: 2, ink: 1.6 });

  const facePath = () => {
    ctx.beginPath();
    ctx.moveTo(cxF - rxF, cyF - 2);
    ctx.bezierCurveTo(cxF - rxF, cyF - ryF - 3, cxF + rxF, cyF - ryF - 3, cxF + rxF, cyF - 2);
    ctx.bezierCurveTo(cxF + rxF, cyF + 8, cxF + rxF * 0.52, cyF + ryF, cxF, cyF + ryF);
    ctx.bezierCurveTo(cxF - rxF * 0.52, cyF + ryF, cxF - rxF, cyF + 8, cxF - rxF, cyF - 2);
    ctx.closePath();
  };

  facePath();
  ctx.fillStyle = o.skin;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Sombra que proyecta el pelo sobre la frente
  ctx.fillStyle = shade(o.skin, -0.14);
  ctx.fillRect(cxF - rxF, cyF - ryF - 4, rxF * 2, 10);
  // Sombra del lado opuesto a la luz
  ctx.fillStyle = shade(o.skin, -0.09);
  ctx.fillRect(cxF + rxF * 0.4, cyF - ryF, rxF, ryF * 2 + 4);
  ctx.restore();
  facePath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Oreja de perfil
  if (side) {
    cel(ctx, () => { ctx.beginPath(); ctx.ellipse(cxF - rxF + 1, cyF + 2, 3, 4.5, 0, 0, Math.PI * 2); },
      shade(o.skin, -0.08), [cxF - rxF - 2, cyF - 3, 6, 10], { ink: 1.5 });
  }

  // ---------- pelo ----------
  const hairTop = cyF - ryF - 4;

  // Pelo: silueta de mechones. Las puntas son irregulares a proposito; si todas
  // miden lo mismo el resultado parece una corona, no una melena.
  const hw = rxF + 1.5;
  // Largo de cada pico, alternando punta y valle. Irregular = natural.
  const CROWN = [6, 1.5, 9, 2, 5, 1, 10, 2.5, 7, 1.5, 8, 2, 5];
  const steps = side ? 7 : CROWN.length - 1;

  const hairPath = () => {
    ctx.beginPath();
    // Corona: de la sien izquierda a la derecha pasando por arriba
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Empieza y acaba algo por encima de las sienes: si baja hasta la altura
      // de la cara, el pelo parece el ala de un sombrero.
      const ang = Math.PI * (0.92 - t * 0.84);
      const rr = hw + CROWN[i % CROWN.length];
      const px = cxF + Math.cos(ang) * rr;
      const py = cyF - 3 - Math.sin(ang) * (rr * 1.02);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }

    if (back) {
      // De espaldas no hay flequillo: la melena baja recta
      ctx.lineTo(cxF + hw, cyF + 10);
      ctx.lineTo(cxF - hw, cyF + 10);
    } else {
      // Flequillo: cae hacia un lado, con dos mechones marcados
      ctx.lineTo(cxF + hw - 1, cyF - 7);
      ctx.quadraticCurveTo(cxF + hw * 0.55, cyF - 3, cxF + hw * 0.2, cyF - 8);
      ctx.quadraticCurveTo(cxF - hw * 0.1, cyF - 2, cxF - hw * 0.45, cyF - 9);
      ctx.quadraticCurveTo(cxF - hw * 0.7, cyF - 4, cxF - hw + 1, cyF - 8);
    }
    ctx.closePath();
  };

  hairPath();
  ctx.fillStyle = o.hair;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shade(o.hair, -0.3);
  ctx.fillRect(cxF - hw - 14, cyF - 11, hw * 2 + 28, 26);
  // Franja de brillo: el reflejo en banda es marca de la casa del anime
  ctx.fillStyle = shade(o.hair, 0.5);
  ctx.beginPath();
  ctx.ellipse(cxF - 2, cyF - 21, hw * 0.78, 3, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(o.hair, 0.25);
  ctx.beginPath();
  ctx.ellipse(cxF - 2, cyF - 16, hw * 0.55, 1.8, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  hairPath();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();

  // ---------- banda ninja ----------
  // Va en la parte alta de la frente, justo bajo el flequillo: nunca sobre los ojos
  if (o.band) {
    // Justo bajo el flequillo y por encima de las cejas
    const bandY = cyF - 7;
    part(ctx, cxF - hw + 1, bandY, hw * 2 - 2, 6, '#2f4a91', { r: 1.5, ink: 1.6 });

    if (!back) {
      const pw = side ? 11 : 16;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cxF - pw / 2, bandY + 0.6, pw, 4.8, 1.2);
      ctx.fillStyle = '#ccd4de';
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = '#f2f6fb';
      ctx.fillRect(cxF - 14, bandY, 30, 2);
      ctx.fillStyle = '#919aa8';
      ctx.fillRect(cxF - 14, bandY + 3.6, 30, 3);
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(cxF - pw / 2, bandY + 0.6, pw, 4.8, 1.2);
      ctx.stroke();
      // Espiral de la hoja
      ctx.strokeStyle = '#5d6673';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(cxF, bandY + 3, 1.7, 0.5, 5.1);
      ctx.stroke();
    }

    // Cinta que ondea por detras
    const wave = Math.sin(anim * 0.1) * 2.5;
    ctx.fillStyle = '#263c77';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cxF - hw + 2, bandY + 4);
    ctx.quadraticCurveTo(cxF - hw - 9, bandY + 12 + wave, cxF - hw - 6, bandY + 22 + wave);
    ctx.lineTo(cxF - hw - 1, bandY + 19 + wave * 0.6);
    ctx.quadraticCurveTo(cxF - hw - 3, bandY + 12, cxF - hw + 5, bandY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // ---------- cara ----------
  // Ojo grande de anime: blanco, iris con degradado, pupila, dos brillos y
  // una linea de pestanas gruesa arriba.
  const animeEye = (ex, ey, rx, ry) => {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.save();
    ctx.clip();
    const ig = ctx.createLinearGradient(ex, ey - ry, ex, ey + ry);
    ig.addColorStop(0, shade(o.eyes, -0.5));
    ig.addColorStop(0.5, o.eyes);
    ig.addColorStop(1, shade(o.eyes, 0.45));
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.6, rx * 0.8, ry * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#17131f';
    ctx.beginPath();
    ctx.ellipse(ex, ey + 0.6, rx * 0.33, ry * 0.46, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sombra del parpado superior
    ctx.fillStyle = 'rgba(40,25,60,0.3)';
    ctx.fillRect(ex - rx, ey - ry, rx * 2, ry * 0.45);
    ctx.restore();

    // Brillos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex - rx * 0.34, ey - ry * 0.36, rx * 0.3, ry * 0.25, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(ex + rx * 0.36, ey + ry * 0.4, rx * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Nada de contorno cerrado: un ojo rodeado de linea entera parece una gafa.
    // Solo la linea de pestanas arriba, gruesa, y un trazo fino y suave abajo.
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(ex, ey, rx * 1.02, Math.PI * 1.02, Math.PI * 2.02);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(42,32,54,0.45)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(ex, ey, rx * 1.0, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
    ctx.restore();
  };

  if (!back) {
    const eyeY = cyF + 4;

    if (side) {
      animeEye(cxF + 4, eyeY, 3.6, 4.7);
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      // Nariz
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cxF + 9.5, eyeY - 1.5);
      ctx.lineTo(cxF + 12.5, eyeY + 2.5);
      ctx.lineTo(cxF + 9, eyeY + 3.5);
      ctx.stroke();
      // Ceja
      ctx.strokeStyle = shade(o.hair, -0.3);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cxF + 0.5, eyeY - 7.5);
      ctx.lineTo(cxF + 7.5, eyeY - 8.2);
      ctx.stroke();
      // Boca
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cxF + 5, eyeY + 8);
      ctx.lineTo(cxF + 9, eyeY + 8);
      ctx.stroke();
    } else {
      animeEye(cxF - 6.2, eyeY, 3.9, 5);
      animeEye(cxF + 6.2, eyeY, 3.9, 5);

      // Cejas
      ctx.strokeStyle = shade(o.hair, -0.3);
      ctx.lineWidth = 2.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cxF - 10, eyeY - 8.5); ctx.lineTo(cxF - 2.5, eyeY - 9.5);
      ctx.moveTo(cxF + 10, eyeY - 8.5); ctx.lineTo(cxF + 2.5, eyeY - 9.5);
      ctx.stroke();

      // Nariz: apenas una marca, como en el anime
      ctx.strokeStyle = 'rgba(70,45,70,0.4)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cxF + 0.5, eyeY + 5); ctx.lineTo(cxF + 2, eyeY + 6.6);
      ctx.stroke();

      // Boca
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cxF - 2.4, eyeY + 9.4);
      ctx.quadraticCurveTo(cxF, eyeY + 10.8, cxF + 2.4, eyeY + 9.4);
      ctx.stroke();

      // Marcas en las mejillas del Uzumaki
      if (outfit === 'naruto') {
        ctx.strokeStyle = 'rgba(80,50,50,0.5)';
        ctx.lineWidth = 1.1;
        for (const s of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cxF + s * 8.5, eyeY + 2.5 + i * 2.6);
            ctx.lineTo(cxF + s * 12.5, eyeY + 2.5 + i * 2.6);
            ctx.stroke();
          }
        }
      }
    }
  }

  ctx.restore();
}

// ---------- lobo ----------
export function drawWolf(ctx, x, y, { dir = 'down', anim = 0, moving = false, hurt = 0 } = {}) {
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'left' ? -1 : 1;

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  drawShadow(ctx, 0, 0, 26, 9);
  ctx.scale(side ? flip : 1, 1);
  if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 38));

  const fur = '#74727f';
  const phase = anim * 0.16;
  const swing = moving ? Math.sin(phase) : 0;

  // Patas
  for (const [lx, s] of [[-13, 1], [-7, -1], [6, -1], [12, 1]]) {
    part(ctx, lx, -19, 6, 19 + s * swing * 2.5, shade(fur, -0.45), { r: 2.5, ink: 1.6 });
  }

  // Cola
  ctx.save();
  ctx.translate(side ? -17 : 0, -26);
  ctx.rotate(Math.sin(anim * 0.12) * 0.28);
  part(ctx, -13, -4, 15, 8, shade(fur, -0.24), { r: 4, ink: 1.8 });
  ctx.restore();

  // Cuerpo
  cel(ctx, () => { ctx.beginPath(); ctx.roundRect(-18, -36, 36, 20, 9); }, fur, [-18, -36, 36, 20], { ink: 2.2 });

  // Cabeza
  const hx = side ? 13 : 0;
  const hy = side ? -39 : dir === 'up' ? -44 : -41;
  cel(ctx, () => { ctx.beginPath(); ctx.roundRect(hx - 10, hy, 20, 16, 6); }, shade(fur, 0.08), [hx - 10, hy, 20, 16], { ink: 2 });

  // Orejas
  ctx.fillStyle = shade(fur, -0.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * 8, hy + 2);
    ctx.lineTo(hx + s * 6, hy - 8);
    ctx.lineTo(hx + s * 1, hy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Hocico
  part(ctx, hx - 5, hy + 10, 10, 8, shade(fur, 0.24), { r: 3.5, ink: 1.8 });
  ctx.fillStyle = '#1d1a24';
  ctx.beginPath();
  ctx.ellipse(hx, hy + 16, 2.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ojos con brillo rojo, muy de bestia de anime
  for (const ex of side ? [hx + 3] : [hx - 5, hx + 5]) {
    ctx.fillStyle = '#ff5757';
    ctx.beginPath();
    ctx.ellipse(ex, hy + 6, 2.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,230,0.95)';
    ctx.beginPath();
    ctx.arc(ex + 0.7, hy + 5.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Aura del jefe
export function drawAura(ctx, x, y, t, color = '#a855f7') {
  ctx.save();
  const r = 44 + Math.sin(t * 3) * 6;
  const g = ctx.createRadialGradient(x, y - 30, 4, x, y - 30, r);
  g.addColorStop(0, `${color}66`);
  g.addColorStop(0.6, `${color}22`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 30, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Barra de vida flotante
export function drawHealthBar(ctx, x, y, pct, w = 34, h = 5) {
  const left = Math.round(x - w / 2);
  const top = Math.round(y);
  ctx.save();
  ctx.fillStyle = 'rgba(15,10,25,0.75)';
  ctx.beginPath(); ctx.roundRect(left - 1.5, top - 1.5, w + 3, h + 3, 3); ctx.fill();
  ctx.fillStyle = '#20262f';
  ctx.beginPath(); ctx.roundRect(left, top, w, h, 2); ctx.fill();

  const c = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444';
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(left, top, Math.max(0, w * Math.max(0, pct)), h, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(left, top, Math.max(0, w * Math.max(0, pct)), 1.6);
  ctx.restore();
}

// Punto unico por el que pasa el dibujo de TODOS los personajes.
// Si hay una hoja de sprites configurada y cargada, usa el arte real;
// si no, dibuja por codigo. El resto del juego no sabe cual de las dos es.
export function drawCharacter(ctx, x, y, opts = {}) {
  const tabla = opts.enemy ? ENEMY_SHEETS : CHARACTER_SHEETS;
  const sheet = getSheet(tabla[opts.sheetId || opts.outfit]);

  if (sheetUsable(sheet) && drawSheetFrame(ctx, sheet, x, y, opts)) return;

  if (opts.kind === 'wolf') drawWolf(ctx, x, y, opts);
  else drawNinja(ctx, x, y, opts);
}

// Nombre encima del personaje
export function drawNameTag(ctx, x, y, text, color = '#e2e8f0') {
  ctx.save();
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(12,8,22,0.92)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
