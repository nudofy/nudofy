-- i18n: añade inglés como tercer idioma soportado (además de ES/FR)

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_preferred_language_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_preferred_language_check
  CHECK (preferred_language IN ('es', 'fr', 'en'));
