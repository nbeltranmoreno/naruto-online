// Codigos de sala: lo que se le pasa a un amigo para jugar en el mismo mundo.
//
// Se leen en voz alta y se escriben a mano, asi que el alfabeto deja fuera los
// caracteres que se confunden: 0/O, 1/I/L. Y da igual escribirlo en minusculas.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LARGO = 5;

export function crearCodigo() {
  let codigo = '';
  const valores = new Uint32Array(LARGO);
  crypto.getRandomValues(valores);
  for (let i = 0; i < LARGO; i++) {
    codigo += ALFABETO[valores[i] % ALFABETO.length];
  }
  return codigo;
}

// Deja el codigo en su forma buena: mayusculas y sin nada que no sea del
// alfabeto. Lo que no encaja se descarta, y entonces el codigo queda corto y
// se avisa de que no vale; es mas claro que cambiarlo por otro a escondidas.
export function normalizarCodigo(texto) {
  return [...String(texto || '').toUpperCase()]
    .filter((c) => ALFABETO.includes(c))
    .join('')
    .slice(0, LARGO);
}

export const codigoValido = (codigo) =>
  typeof codigo === 'string' &&
  codigo.length === LARGO &&
  [...codigo].every((c) => ALFABETO.includes(c));

// La sala viaja en la direccion, para poder compartirla en un solo enlace
export function codigoDeLaUrl() {
  try {
    const p = new URLSearchParams(window.location.search).get('sala');
    const c = normalizarCodigo(p);
    return codigoValido(c) ? c : null;
  } catch {
    return null;
  }
}

export function enlaceDeSala(base, codigo) {
  return `${base}?sala=${codigo}`;
}
