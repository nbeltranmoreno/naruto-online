import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { loadPlayer } from './hooks/usePlayerSave';
import StartScreen from './components/StartScreen';
import Game from './components/Game';

// Identidad de invitado: un id propio guardado en el navegador. Sirve para que
// el multijugador distinga a cada jugador aunque no haya iniciado sesion.
function guestUid() {
  let id = localStorage.getItem('ninja-guest-uid');
  if (!id) {
    id = 'guest-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    localStorage.setItem('ninja-guest-uid', id);
  }
  return id;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [loadingSave, setLoadingSave] = useState(false);

  useEffect(() => {
    // Si Firebase no esta configurado, se sigue pudiendo jugar como invitado
    let unsub = () => {};
    try {
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      });
    } catch (e) {
      console.warn('Firebase Auth no disponible:', e.message);
      setAuthReady(true);
    }
    return () => unsub();
  }, []);

  const startGame = async ({ name, outfit, sala }) => {
    const uid = user?.uid ?? guestUid();
    setLoadingSave(true);

    // El progreso vive en Supabase; si falla o es la primera vez, se empieza de cero
    let save = null;
    try {
      save = await loadPlayer(uid);
    } catch (e) {
      console.warn('Sin progreso guardado:', e.message);
    }

    setLoadingSave(false);
    setSession({ uid, name, sala, outfit: save?.outfit ?? outfit, save });
  };

  if (!authReady) {
    return <div className="min-h-full grid place-items-center text-slate-400">Cargando...</div>;
  }

  if (!session) {
    return <StartScreen user={user} loadingSave={loadingSave} onPlay={startGame} />;
  }

  return <Game session={session} onExit={() => setSession(null)} />;
}
