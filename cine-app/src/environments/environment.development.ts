// Entorno de DESARROLLO.
// OJO: este archivo se sube al repo solo porque la clave es la "publishable/anon key"
// de Supabase, que está pensada para ser pública (la seguridad real la da el RLS
// configurado en la base). Si en algún momento usan una service_role key, esa NUNCA
// va en el frontend ni se sube a Git.
export const environment = {
  production: false,
  supabaseUrl: 'https://qbcspocdnhaubiapddhd.supabase.co',
  supabaseKey: 'sb_publishable_uvySuR-Hb_8mVYytJg7g_g_kFPNMLBk',
};
