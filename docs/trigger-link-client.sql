-- ─── Trigger: auto-enlazar clients.user_id al aceptar invitación ─────────
-- Cuando un cliente acepta la invitación por email, Supabase crea una fila
-- en auth.users con su email. Este trigger busca el cliente con ese mismo
-- email y le asigna user_id automáticamente, para que el portal le
-- reconozca al hacer login.
--
-- Cómo aplicar: pegar el bloque entero en Supabase → SQL Editor → Run.
-- Es idempotente (CREATE OR REPLACE + DROP IF EXISTS).

CREATE OR REPLACE FUNCTION public.link_client_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Enlaza al primer cliente sin user_id que tenga el mismo email
  UPDATE public.clients
     SET user_id = NEW.id
   WHERE email = NEW.email
     AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_client_on_signup_trigger ON auth.users;

CREATE TRIGGER link_client_on_signup_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_client_on_signup();

-- ─── Backfill (opcional) ────────────────────────────────────────────────
-- Para enlazar clientes ya existentes que aceptaron antes de instalar el
-- trigger. Ejecutar UNA sola vez:
--
-- UPDATE public.clients c
--    SET user_id = u.id
--   FROM auth.users u
--  WHERE c.email = u.email
--    AND c.user_id IS NULL;
