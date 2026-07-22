-- i18n: idioma preferido del usuario (fase 1, cimientos i18next — ES/FR)
-- Guardado en public.users porque es la tabla de perfil común a los 3 roles
-- (admin/agente/cliente) y ya se carga entera en AuthContext.fetchProfile().

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'es'
  CHECK (preferred_language IN ('es', 'fr'));
