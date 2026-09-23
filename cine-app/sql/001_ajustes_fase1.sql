-- =====================================================================
-- MIGRACIÓN 001 - Ajustes necesarios para esta refactorización
-- Correr esto en el SQL Editor de Supabase (Dashboard > SQL Editor).
-- =====================================================================

-- 1) La compra necesita guardar qué método de pago eligió el cliente.
--    (El código anterior intentaba leer esta columna pero nunca existió,
--    por eso estaba comentado en supabase.service.ts)
alter table public.compras
  add column if not exists metodo_pago text;

-- 2) Habilitar Realtime sobre "entradas": necesitamos que el mapa de
--    butacas reciba un evento cada vez que alguien compra una butaca,
--    para que se actualice en vivo sin refrescar la página.
--    (Si la tabla ya está en la publicación, Supabase tira error "already
--    a member of publication": en ese caso, ignorar el error y seguir)
alter publication supabase_realtime add table public.entradas;

-- 3) Índice para que la búsqueda de butacas ocupadas por función sea rápida
create index if not exists idx_entradas_funcion_id
  on public.entradas (funcion_id);

-- 4) Permitir reseñas de usuarios NO registrados (requisito del TP):
--    perfil_id debe poder quedar en null.
alter table public.resenas
  alter column perfil_id drop not null;

-- =====================================================================
-- IMPORTANTE - Revisar RLS (Row Level Security)
-- =====================================================================
-- Todo el control de permisos hoy vive en los Guards de Angular, que
-- corren en el navegador. Eso protege la UI, pero NO protege la base:
-- cualquiera que abra las devtools puede llamar directo a la REST API
-- de Supabase. Como mínimo deberían tener políticas RLS que garanticen:
--
--   * peliculas / generos / funciones / salas / productos_candy / cupones
--     / config_fidelizacion: SELECT público, pero INSERT/UPDATE/DELETE
--     solo si perfiles.rol = 'admin' del usuario autenticado.
--   * compras / entradas / compras_candy: un usuario solo puede
--     INSERT/SELECT sus propias filas (perfil_id = auth.uid()), excepto
--     el admin/empleado que necesita verlas todas (para validar QR y
--     ver reportes).
--   * resenas: INSERT público (incluye anónimos), pero UPDATE/DELETE
--     solo del propio autor o de un admin.
--   * logs_auditoria: solo INSERT desde el cliente autenticado como
--     admin/empleado, sin UPDATE/DELETE para nadie (registro inmutable).
--
-- Esto no lo puede correr el asistente por ustedes: hay que armarlo a
-- mano en Authentication > Policies de cada tabla, revisando caso por caso.
