// Los personajes se dibujan por codigo (nada de imagenes) para que el juego
// arranque sin assets. Cada "traje" es solo una combinacion de colores, asi que
// meter sprites reales despues es cambiar estas funciones y nada mas.

export const OUTFITS = {
  naruto:  { name: 'Uzumaki',  suit: '#e8762c', trim: '#2f5fa8', hair: '#f2d24b', skin: '#f0c08a', band: true },
  sasuke:  { name: 'Uchiha',   suit: '#28477a', trim: '#d8d8e2', hair: '#2a2a35', skin: '#f0c9a0', band: true },
  sakura:  { name: 'Haruno',   suit: '#c94f6d', trim: '#f3dfe6', hair: '#ef94b8', skin: '#f5cfa6', band: true },
  kakashi: { name: 'Hatake',   suit: '#3c5a3f', trim: '#1e2a33', hair: '#c3c3d2', skin: '#f0c08a', band: true },
  bandido: { name: 'Bandido',  suit: '#5e4a36', trim: '#8c2f2f', hair: '#241f1b', skin: '#d9ab79', band: false },
  ronin:   { name: 'Ronin',    suit: '#3a3a4c', trim: '#8f7a3f', hair: '#1c1c24', skin: '#d9ab79', band: false },
  jefe:    { name: 'Desertor', suit: '#5b2f7a', trim: '#d8b23a', hair: '#1a1a22', skin: '#cfa070', band: false }
};

export const outfitOf = (id) => OUTFITS[id] || OUTFITS.naruto;

const px = (ctx, x, y, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

// Sombra ovalada bajo los pies: da sensacion de que el personaje pisa el suelo
export function drawShadow(ctx, x, y, w = 16, h = 6, alpha = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Dibuja un ninja. (x, y) son los pies del personaje.
// dir: 'down' | 'up' | 'left' | 'right'. anim: distancia recorrida (para el paso).
export function drawNinja(ctx, x, y, { dir = 'down', anim = 0, outfit = 'naruto', moving = false, scale = 1, hurt = 0 } = {}) {
  const o = outfitOf(outfit);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  // Parpadeo rojo al recibir un golpe
  if (hurt > 0) {
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(hurt * 40);
  }

  drawShadow(ctx, 0, 0, 16, 6);

  // Ciclo de paso de 4 fotogramas
  const frame = moving ? Math.floor(anim / 9) % 4 : 0;
  const legStep = [0, 2, 0, -2][frame];

  const left = -7;

  // Piernas
  px(ctx, left + 1, -8 + Math.max(0, legStep), 4, 8 - Math.max(0, legStep), '#2b3440');
  px(ctx, left + 8, -8 + Math.max(0, -legStep), 4, 8 - Math.max(0, -legStep), '#2b3440');
  // Sandalias
  px(ctx, left + 1, -2, 4, 2, '#1c232c');
  px(ctx, left + 8, -2, 4, 2, '#1c232c');

  // Torso
  px(ctx, left + 1, -20, 12, 12, o.suit);
  // Cremallera / banda del traje
  px(ctx, left + 6, -20, 2, 12, o.trim);

  // Brazos (el de delante se adelanta con el paso)
  const armSwing = moving ? legStep : 0;
  px(ctx, left - 2, -19 + armSwing, 3, 9, o.suit);
  px(ctx, left + 13, -19 - armSwing, 3, 9, o.suit);

  // Cabeza
  px(ctx, left + 2, -30, 10, 10, o.skin);

  // Pelo segun hacia donde mira
  if (dir === 'up') {
    px(ctx, left + 1, -31, 12, 9, o.hair);
  } else {
    px(ctx, left + 1, -31, 12, 4, o.hair);
    px(ctx, left + 1, -31, 2, 8, o.hair);
    px(ctx, left + 11, -31, 2, 8, o.hair);
  }

  // Banda ninja con la placa de metal
  if (o.band) {
    px(ctx, left + 1, -27, 12, 3, '#2f5fa8');
    if (dir !== 'up') px(ctx, left + 4, -27, 6, 3, '#c9ccd4');
  }

  // Cara (solo si mira hacia la camara o de lado)
  if (dir === 'down') {
    px(ctx, left + 4, -23, 2, 2, '#1c232c');
    px(ctx, left + 8, -23, 2, 2, '#1c232c');
  } else if (dir === 'left') {
    px(ctx, left + 3, -23, 2, 2, '#1c232c');
  } else if (dir === 'right') {
    px(ctx, left + 9, -23, 2, 2, '#1c232c');
  }

  ctx.restore();
}

// Lobo: cuatro patas, vista cenital simplificada
export function drawWolf(ctx, x, y, { dir = 'down', anim = 0, moving = false, hurt = 0 } = {}) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(hurt * 40);

  drawShadow(ctx, 0, 0, 20, 7);

  const frame = moving ? Math.floor(anim / 8) % 4 : 0;
  const step = [0, 2, 0, -2][frame];
  const fur = '#6b6b78';
  const furDark = '#4a4a56';

  // Patas
  px(ctx, -8, -6 + Math.max(0, step), 3, 6, furDark);
  px(ctx, 5, -6 + Math.max(0, -step), 3, 6, furDark);
  // Cuerpo
  px(ctx, -9, -14, 18, 9, fur);
  px(ctx, -9, -9, 18, 3, furDark);

  // Cabeza al lado que mira
  const hx = dir === 'left' ? -13 : dir === 'right' ? 6 : -4;
  const hy = dir === 'up' ? -19 : -16;
  px(ctx, hx, hy, 8, 7, fur);
  // Orejas
  px(ctx, hx, hy - 2, 2, 2, furDark);
  px(ctx, hx + 6, hy - 2, 2, 2, furDark);
  // Ojos
  px(ctx, hx + 1, hy + 2, 2, 2, '#e04b4b');
  px(ctx, hx + 5, hy + 2, 2, 2, '#e04b4b');

  ctx.restore();
}

// Aura del jefe: circulo pulsante para que se note que es especial
export function drawAura(ctx, x, y, t, color = '#a855f7') {
  ctx.save();
  const r = 22 + Math.sin(t * 3) * 3;
  const g = ctx.createRadialGradient(x, y - 12, 2, x, y - 12, r);
  g.addColorStop(0, `${color}88`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 12, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Barra de vida flotante sobre enemigos y jugadores
export function drawHealthBar(ctx, x, y, pct, w = 28, h = 4) {
  const left = Math.round(x - w / 2);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(left - 1, Math.round(y) - 1, w + 2, h + 2);
  ctx.fillStyle = '#2b3440';
  ctx.fillRect(left, Math.round(y), w, h);
  const c = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#ef4444';
  ctx.fillStyle = c;
  ctx.fillRect(left, Math.round(y), Math.max(0, Math.round(w * pct)), h);
}

// Nombre encima del personaje, con borde para que se lea sobre cualquier fondo
export function drawNameTag(ctx, x, y, text, color = '#e2e8f0') {
  ctx.save();
  ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
