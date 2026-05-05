// expire-trials · Cron diario que desactiva agentes con trial vencido
// Invocar desde Supabase Dashboard → Edge Functions → Schedule:
//   cron: "0 3 * * *"  (cada día a las 3:00 UTC)
// O manualmente: POST /functions/v1/expire-trials  (con Authorization: Bearer SERVICE_ROLE_KEY)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Solo aceptar POST (desde cron o llamada manual)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Buscar agentes con plan free/free_pro cuyo plan_expires_at ya pasó y todavía están activos
  const now = new Date().toISOString();

  const { data: expired, error: fetchError } = await supabase
    .from('agents')
    .select('id, name, email, plan, plan_expires_at')
    .in('plan', ['free', 'free_pro'])
    .not('plan_expires_at', 'is', null)
    .lt('plan_expires_at', now)
    .eq('active', true);

  if (fetchError) {
    console.error('Error fetching expired agents:', fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deactivated: 0, message: 'No hay trials vencidos' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Desactivar todos de una sola query
  const expiredIds = expired.map((a: any) => a.id);

  const { error: updateError } = await supabase
    .from('agents')
    .update({ active: false })
    .in('id', expiredIds);

  if (updateError) {
    console.error('Error deactivating agents:', updateError);
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`Trials vencidos desactivados: ${expired.length}`, expiredIds);

  return new Response(
    JSON.stringify({
      deactivated: expired.length,
      agents: expired.map((a: any) => ({ id: a.id, name: a.name, email: a.email, expired_at: a.plan_expires_at })),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
