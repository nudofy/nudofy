// expire-trials · Cron diario que desactiva agentes con trial vencido
// Invocar desde Supabase Dashboard → Edge Functions → Schedule:
//   cron: "0 3 * * *"  (cada día a las 3:00 UTC)
// O manualmente: POST /functions/v1/expire-trials  (con Authorization: Bearer SERVICE_ROLE_KEY)
//
// Un trial es cualquier agente con plan_expires_at en el pasado que sigue activo,
// SIN importar el nombre del plan: register-agent crea los trials con el plan de
// pago elegido (pro/basic/agency) + fecha de expiración, no con 'free_pro'.
// Filtrar por nombre de plan dejaba escapar todos los trials de planes de pago.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  // Solo aceptar POST (desde cron o llamada manual)
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date().toISOString();

  // Cualquier agente activo cuyo plan_expires_at ya pasó = trial vencido.
  const { data: expired, error: fetchError } = await supabase
    .from('agents')
    .select('id, user_id, name, email, plan, plan_expires_at')
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

  const expiredIds = expired.map((a: any) => a.id);

  // 1. Desactivar todos de una sola query
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

  // 2. Crear notificación in-app para cada usuario
  const notifications = expired
    .filter((a: any) => a.user_id)
    .map((a: any) => ({
      user_id: a.user_id,
      type: 'trial_expired',
      title: 'Tu prueba gratuita ha terminado',
      body: 'Elige un plan para seguir usando Nudofy sin interrupciones.',
      read: false,
    }));
  if (notifications.length > 0) {
    const { error: notifError } = await supabase.from('notifications').insert(notifications);
    if (notifError) console.error('Error creando notificaciones:', notifError.message);
  }

  // 3. Enviar email a cada agente (no bloqueante — si falla, el agente ya está desactivado)
  if (RESEND_API_KEY) {
    await Promise.allSettled(
      expired
        .filter((a: any) => a.email)
        .map((a: any) =>
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Nudofy <hola@nudofy.app>',
              to: a.email,
              subject: 'Tu prueba de Nudofy ha terminado',
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                  <h2 style="color:#E73121;">Tu prueba gratuita ha terminado</h2>
                  <p>Hola ${a.name ?? ''},</p>
                  <p>Tu periodo de prueba de 15 días en Nudofy ha finalizado. Para seguir
                     gestionando tus clientes, catálogos y pedidos, elige el plan que mejor
                     se adapte a tu negocio.</p>
                  <a href="https://nudofy.com/precios"
                     style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;margin-top:8px;">
                    Ver planes
                  </a>
                  <p style="color:#999;font-size:12px;margin-top:24px;">
                    ¿Dudas? Escríbenos a <a href="mailto:nudofyapp@gmail.com" style="color:#E73121;">nudofyapp@gmail.com</a>.
                  </p>
                </div>`,
            }),
          }),
        ),
    );
  }

  console.log(`Trials vencidos desactivados: ${expired.length}`, expiredIds);

  return new Response(
    JSON.stringify({
      deactivated: expired.length,
      agents: expired.map((a: any) => ({ id: a.id, name: a.name, email: a.email, plan: a.plan, expired_at: a.plan_expires_at })),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
