-- Checkout de autoservicio (Stripe): falta el id de la suscripción activa
-- (stripe_customer_id ya existía en el schema, sin usar hasta ahora).
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
CREATE INDEX IF NOT EXISTS idx_agents_stripe_customer ON public.agents(stripe_customer_id);

NOTIFY pgrst, 'reload schema';
