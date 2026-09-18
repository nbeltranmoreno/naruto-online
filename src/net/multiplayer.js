import { abrirCanal } from './transport';
import { NET_TICK } from '../game/constants';

// Multijugador por salas. Todos los que entran con el mismo codigo comparten
// mundo: se mandan su posicion varias veces por segundo y los golpes cuando
// ocurren. No hay servidor propio ni base de datos de por medio.
//
// Tipos de mensaje:
//   's'   estado (posicion, direccion, zona, nivel, nombre)
//   'a'   ataque, para que se vea el gesto
//   'hi'  acabo de entrar: pide a los demas que se presenten
//   'bye' me voy
export function connectMultiplayer({ uid, sala, game, onRoster = () => {} }) {
  let timer = null;
  let ultimoEnviado = '';
  let ticksQuieto = 0;

  const canal = abrirCanal({
    sala,
    uid,
    alCambiarEstado: ({ conectado }) => {
      if (conectado) {
        // Avisar de que estamos aqui y pedir a los demas su posicion, para no
        // tener que esperar a que se muevan para verlos aparecer.
        canal.enviar({ t: 'hi' });
        enviarEstado(true);
      }
      onRoster(game.state.remote.size + 1);
    },
    alRecibir: (m) => {
      if (m.t === 's') {
        game.applyRemote(m.uid, m);
        onRoster(game.state.remote.size + 1);
      } else if (m.t === 'a') {
        game.remoteAttack(m.uid, m.action);
      } else if (m.t === 'hi') {
        // Alguien acaba de entrar: que sepa donde estamos
        enviarEstado(true);
      } else if (m.t === 'bye') {
        game.removeRemote(m.uid);
        onRoster(game.state.remote.size + 1);
      }
    }
  });

  function enviarEstado(forzar = false) {
    const snap = game.netSnapshot();
    const clave = JSON.stringify(snap);
    // Si no ha cambiado nada no se manda... pero cada cierto tiempo si, para
    // que los demas no nos den por desconectados estando quietos.
    if (!forzar && clave === ultimoEnviado && ticksQuieto < 15) {
      ticksQuieto++;
      return;
    }
    ticksQuieto = 0;
    ultimoEnviado = clave;
    canal.enviar({ t: 's', ...snap });
  }

  timer = setInterval(enviarEstado, NET_TICK);

  return {
    sala,
    isConnected: () => canal.estaConectado(),
    // Se llama cuando el jugador local ataca, para que los demas vean el gesto
    sendAttack: (action) => canal.enviar({ t: 'a', action }),
    disconnect: () => {
      if (timer) clearInterval(timer);
      canal.cerrar();
    }
  };
}
