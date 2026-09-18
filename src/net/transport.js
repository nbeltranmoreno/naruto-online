import mqtt from 'mqtt';

// Canal por el que hablan los jugadores de una misma sala.
//
// Por que asi: hace falta algo en internet que reparta los mensajes entre
// todos. Se usan servidores MQTT publicos, que no piden registro ni clave, de
// modo que el juego funciona sin montar ni pagar nada. Todos los jugadores son
// iguales: no hay anfitrion, asi que si uno se va, la sala sigue.
//
// Lo que se manda son posiciones y golpes, nada personal. Aun asi, el canal es
// publico: cualquiera que adivine el codigo de sala puede entrar. Por eso los
// codigos se generan al azar y no se reutilizan entre partidas.
const SERVIDORES = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

const temaDeSala = (sala) => `ninja-online/v1/${sala}`;

export function abrirCanal({ sala, uid, alRecibir, alCambiarEstado = () => {} }) {
  let cliente = null;
  let servidorActual = 0;
  let cerrado = false;
  let conectado = false;

  const tema = temaDeSala(sala);

  const conectar = () => {
    if (cerrado) return;
    const url = SERVIDORES[servidorActual % SERVIDORES.length];

    cliente = mqtt.connect(url, {
      // El identificador tiene que ser unico: si dos clientes comparten uno,
      // el servidor echa al anterior y entran en un bucle de reconexion.
      clientId: `ninja_${uid.slice(-8)}_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 2500,
      connectTimeout: 8000,
      keepalive: 30
    });

    cliente.on('connect', () => {
      conectado = true;
      alCambiarEstado({ conectado: true, servidor: url });
      cliente.subscribe(tema, { qos: 0 });
    });

    cliente.on('message', (_tema, carga) => {
      try {
        const datos = JSON.parse(carga.toString());
        // Los mensajes propios rebotan de vuelta: hay que ignorarlos
        if (!datos || datos.uid === uid) return;
        alRecibir(datos);
      } catch {
        // Mensaje que no es nuestro o viene roto: se descarta sin mas
      }
    });

    cliente.on('error', () => {
      conectado = false;
      alCambiarEstado({ conectado: false });
    });

    cliente.on('close', () => {
      if (conectado) alCambiarEstado({ conectado: false });
      conectado = false;
    });

    // Si un servidor no responde, se prueba con el siguiente de la lista
    cliente.on('offline', () => {
      conectado = false;
      alCambiarEstado({ conectado: false });
      servidorActual++;
      if (!cerrado && SERVIDORES.length > 1) {
        cliente.end(true, () => { if (!cerrado) conectar(); });
      }
    });
  };

  conectar();

  return {
    estaConectado: () => conectado,
    enviar: (datos) => {
      if (!conectado || !cliente) return;
      // qos 0: si se pierde una posicion da igual, enseguida llega la siguiente
      cliente.publish(tema, JSON.stringify({ ...datos, uid }), { qos: 0 });
    },
    cerrar: () => {
      cerrado = true;
      if (cliente) {
        try {
          cliente.publish(tema, JSON.stringify({ t: 'bye', uid }), { qos: 0 });
        } catch {
          // Si ya estaba caido, no pasa nada: los demas lo daran por ido solo
        }
        cliente.end(true);
      }
      conectado = false;
    }
  };
}
