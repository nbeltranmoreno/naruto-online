import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
// Obtén estos valores desde tu dashboard de Supabase:
// https://app.supabase.com/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Desactivar la autenticación de Supabase porque usamos Firebase
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
