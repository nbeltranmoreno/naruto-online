-- Esquema de Ninja Online
-- IMPORTANTE: PostgreSQL pasa los nombres a minusculas, por eso las columnas se
-- escriben ya en minusculas (zoneid, posx, posy) y se mapean a camelCase en JS.

-- Funcion compartida para mantener updatedat al dia
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Progreso de cada jugador
CREATE TABLE IF NOT EXISTS ninja_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  userid TEXT UNIQUE NOT NULL,
  name TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  hp INTEGER DEFAULT 100,
  chakra INTEGER DEFAULT 50,
  zoneid TEXT DEFAULT 'konoha',
  posx REAL DEFAULT 0,
  posy REAL DEFAULT 0,
  outfit TEXT DEFAULT 'naruto',
  createdat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedat TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ninja_players_user ON ninja_players(userid);
-- Para la tabla de clasificacion: ordenar por nivel y experiencia
CREATE INDEX IF NOT EXISTS idx_ninja_players_rank ON ninja_players(level DESC, xp DESC);

DROP TRIGGER IF EXISTS update_ninja_players_updated_at ON ninja_players;
CREATE TRIGGER update_ninja_players_updated_at
    BEFORE UPDATE ON ninja_players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Politicas permisivas (modo desarrollo), igual que en AppHabitos
ALTER TABLE ninja_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Jugadores pueden leer" ON ninja_players;
CREATE POLICY "Jugadores pueden leer"
  ON ninja_players FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Jugadores pueden insertar" ON ninja_players;
CREATE POLICY "Jugadores pueden insertar"
  ON ninja_players FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Jugadores pueden actualizar" ON ninja_players;
CREATE POLICY "Jugadores pueden actualizar"
  ON ninja_players FOR UPDATE
  USING (true);
