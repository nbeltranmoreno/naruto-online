// Soporte para sprites de verdad (imagenes hechas por dibujantes).
//
// El juego sabe dibujar los personajes de dos maneras:
//   1. Con una imagen de spritesheet, si hay una configurada para ese personaje.
//   2. Con el dibujo por codigo de sprites.js, si no la hay.
//
// Asi se puede ir metiendo arte poco a poco: el personaje que tenga imagen la
// usa y el resto sigue funcionando. Ver characterSheets.js para configurarlos.

const cache = new Map();

// Formas tipicas en las que viene organizada una hoja de sprites.
// `rows` dice en que fila esta cada direccion y `frames` cuantos fotogramas
// tiene el ciclo de andar.
export const LAYOUTS = {
  // El clasico de RPG Maker y de casi todos los packs sueltos:
  // 4 filas (abajo, izquierda, derecha, arriba) x 3 fotogramas.
  // El ciclo va 0-1-2-1 para que el paso sea de ida y vuelta.
  rpgmaker: {
    rows: { down: 0, left: 1, right: 2, up: 3 },
    frames: 3,
    order: [0, 1, 2, 1],
    idle: 1
  },
  // Igual pero con 4 fotogramas por fila
  basic4: {
    rows: { down: 0, left: 1, right: 2, up: 3 },
    frames: 4,
    order: [0, 1, 2, 3],
    idle: 0
  },
  // LPC (Liberated Pixel Cup), el formato de los packs libres grandes:
  // hoja de 64x64 donde las filas 8 a 11 son el ciclo de andar.
  // El fotograma 0 de cada fila es la pose quieta, por eso el ciclo empieza en 1.
  lpc: {
    rows: { up: 8, left: 9, down: 10, right: 11 },
    frames: 8,
    order: [1, 2, 3, 4, 5, 6, 7, 8],
    idle: 0
  }
};

// Carga (una sola vez) la imagen de un personaje.
// Devuelve null si no hay hoja configurada, y mientras carga devuelve
// un objeto con ready = false, para que se siga dibujando por codigo.
export function getSheet(def) {
  if (!def || !def.src) return null;

  let s = cache.get(def.src);
  if (!s) {
    s = { def, img: new Image(), ready: false, failed: false };
    s.img.onload = () => { s.ready = true; };
    s.img.onerror = () => {
      s.failed = true;
      console.warn('No se pudo cargar el sprite:', def.src);
    };
    s.img.src = def.src;
    cache.set(def.src, s);
  }
  return s;
}

export const sheetUsable = (s) => !!(s && s.ready && !s.failed);

// Dibuja el fotograma que toca. (x, y) son los pies del personaje, igual que
// en el dibujo por codigo, para que el resto del juego no note la diferencia.
export function drawSheetFrame(ctx, sheet, x, y, { dir = 'down', anim = 0, moving = false, scale = 1, hurt = 0 } = {}) {
  const d = sheet.def;
  const layout = typeof d.layout === 'string' ? LAYOUTS[d.layout] : d.layout;
  if (!layout) return false;

  const row = layout.rows[dir] ?? layout.rows.down ?? 0;

  // El fotograma sale de la distancia recorrida, no del reloj: asi la
  // animacion va acompasada al movimiento y no patina.
  const step = d.animStep || 11;
  const col = moving
    ? layout.order[Math.floor(anim / step) % layout.order.length]
    : layout.idle;

  const fw = d.frameW;
  const fh = d.frameH;
  const sx = (d.offsetX || 0) + col * fw;
  const sy = (d.offsetY || 0) + row * fh;

  const s = (d.scale || 1) * scale;
  // anchorX/anchorY: donde estan los pies dentro del fotograma.
  // Por defecto, centro abajo.
  const ax = d.anchorX != null ? d.anchorX : fw / 2;
  const ay = d.anchorY != null ? d.anchorY : fh;

  ctx.save();
  if (hurt > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(hurt * 38));
  // Sombra propia, que las hojas de sprites no suelen traerla
  if (d.shadow !== false) {
    ctx.save();
    ctx.fillStyle = 'rgba(25,15,45,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, 13 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.imageSmoothingEnabled = d.smooth !== false;
  ctx.drawImage(
    sheet.img,
    sx, sy, fw, fh,
    Math.round(x - ax * s), Math.round(y - ay * s),
    Math.round(fw * s), Math.round(fh * s)
  );
  ctx.restore();
  return true;
}
