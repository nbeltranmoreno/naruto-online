// Teclado del juego. Guarda que teclas estan pulsadas y ademas apunta las
// pulsaciones "de una vez" (atacar, lanzar jutsu) para que no se repitan solas.
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'attack', KeyJ: 'attack',
  KeyK: 'jutsu',
  KeyE: 'interact'
};

export function createInput() {
  const held = new Set();
  const pressed = new Set();   // pulsaciones pendientes de consumir
  let selectSlot = null;       // 1, 2 o 3 si se pulso un numero

  const onKeyDown = (e) => {
    // Las teclas del juego no deben desplazar la pagina
    if (KEYMAP[e.code] || /^Digit[123]$/.test(e.code)) e.preventDefault();

    if (/^Digit([123])$/.test(e.code)) {
      selectSlot = Number(e.code.slice(-1));
      return;
    }
    const action = KEYMAP[e.code];
    if (!action) return;
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  };

  const onKeyUp = (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  };

  // Si la ventana pierde el foco se sueltan las teclas: evita quedarse andando solo
  const onBlur = () => { held.clear(); pressed.clear(); };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    isDown: (action) => held.has(action),
    // Devuelve true una sola vez por pulsacion
    consume: (action) => {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    consumeSlot: () => {
      const s = selectSlot;
      selectSlot = null;
      return s;
    },
    clear: onBlur,
    destroy: () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    }
  };
}
