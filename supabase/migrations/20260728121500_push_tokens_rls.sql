-- Auditoría de seguridad 28 jul 2026
--
-- push_tokens es una tabla que EXISTE Y SE USA en producción (la lee
-- supabase/functions/notify-order/index.ts y la escribe
-- src/lib/pushNotifications.ts) pero, igual que pasó antes con
-- company_users/invoices (ver notas de reconciliación del 14 jul en
-- schema.sql), NO está definida en ningún migration ni en schema.sql — se
-- creó a mano en algún momento y nunca se documentó aquí. Este archivo NO
-- sabe con certeza sus columnas exactas; se infieren del código cliente:
--   user_id   UUID  (referencia a public.users/auth.users)
--   token     TEXT  (Expo push token)
--   platform  TEXT  ('ios' | 'android')
--   UNIQUE (user_id, token)  -- usado como onConflict en el upsert
--
-- Riesgo real encontrado: src/lib/pushNotifications.ts hace
--   supabase.from('push_tokens').upsert({ user_id: userId, token, platform })
-- directamente desde el cliente autenticado (rol "authenticated", con el
-- anon key). Si la tabla no tenía RLS activado, o lo tenía sin una política
-- que exija user_id = auth.uid(), CUALQUIER usuario autenticado podía
-- registrar su propio token de push contra el user_id de OTRA persona —
-- con eso empezaría a recibir en su móvil las notificaciones push (títulos,
-- resúmenes de pedidos) destinadas a esa otra persona. IMPORTANTE: antes de
-- ejecutar este archivo, comprobar en Supabase Studio que las columnas
-- reales coinciden con lo de arriba; si no, ajustar el CREATE TABLE (o
-- quitarlo y dejar solo el bloque RLS de abajo si la tabla ya existe).

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- El propio usuario gestiona (alta/baja) SOLO sus propios tokens de push.
-- La lectura para enviar notificaciones (notify-order) usa service role,
-- que ignora RLS — esta política solo protege la escritura desde el cliente.
DROP POLICY IF EXISTS "push_tokens_own" ON public.push_tokens;
CREATE POLICY "push_tokens_own" ON public.push_tokens
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
