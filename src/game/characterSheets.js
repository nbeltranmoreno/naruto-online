// AQUI SE CONECTA EL ARTE DE VERDAD.
//
// Cada personaje puede tener una hoja de sprites. Mientras no la tenga, se
// dibuja por codigo y el juego funciona igual. En cuanto pongas la imagen y
// descomentes su linea, ese personaje pasa a verse con el arte real.
//
// COMO ANADIR UN PERSONAJE
// 1. Guarda la imagen en  public/sprites/  (por ejemplo public/sprites/naruto.png)
// 2. Descomenta su entrada aqui abajo y ajusta frameW/frameH al tamano real
//    de UN fotograma (no de la imagen entera).
// 3. Elige el 'layout' segun como este organizada la hoja:
//      'rpgmaker' -> 4 filas (abajo, izquierda, derecha, arriba) x 3 fotogramas
//      'basic4'   -> igual pero 4 fotogramas por fila
//      'lpc'      -> hojas LPC de 64x64 (las filas 8-11 son el ciclo de andar)
// 4. 'scale' ajusta el tamano en pantalla. Con casillas de 48px, un personaje
//    se ve bien ocupando entre 60 y 80 pixeles de alto.
//
// DONDE CONSEGUIR SPRITES
//   itch.io/game-assets/free/tag-sprites   y   opengameart.org
// Busca "top down character sprite sheet" o "LPC character".
// Ojo con la licencia: para publicar el juego necesitas que permita uso
// publico (CC0, CC-BY o similar) y citar al autor si lo pide.

import { TILE } from './constants';

const base = import.meta.env.BASE_URL;

export const CHARACTER_SHEETS = {
  // Ejemplo listo para usar: descomenta y ajusta los numeros a tu imagen.
  //
  // naruto: {
  //   src: base + 'sprites/naruto.png',
  //   frameW: 32,          // ancho de UN fotograma
  //   frameH: 48,          // alto de UN fotograma
  //   layout: 'rpgmaker',
  //   scale: 1.6,          // 48 * 1.6 = 77px de alto en pantalla
  //   animStep: 11,        // pixeles recorridos por fotograma de animacion
  //   smooth: false        // false = pixel art nitido; true = arte suavizado
  // },
  //
  // kakashi: {
  //   src: base + 'sprites/kakashi.png',
  //   frameW: 64, frameH: 64, layout: 'lpc', scale: 1.1, smooth: false
  // }
};

// Los enemigos tambien pueden llevar su hoja, con la misma forma
export const ENEMY_SHEETS = {
  // bandido: { src: base + 'sprites/bandido.png', frameW: 32, frameH: 48, layout: 'rpgmaker', scale: 1.6 }
};

// Tamano de referencia, por si hace falta encajar una hoja con la casilla
export const REFERENCE_TILE = TILE;
