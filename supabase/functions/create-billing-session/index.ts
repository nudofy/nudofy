// create-billing-session · Autoservicio de cambio de plan (Stripe)
// Recibe: { targetPlan: 'basic'|'pro'|'agency', successUrl, cancelUrl }
// Devuelve: { url } — Checkout Session (alta nueva) o Billing Portal (ya tiene suscripción)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const ALLOWED_ORIGINS = [
  'https://nudofy.com',
  'https://app.nudofy.com',
  'http://localhost:8081', // desarrollo local
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const PLAN_PRICE_ENV: Record<string, string> = {
  basic: 'STRIPE_PRICE_BASIC',
  pro: 'STRIPE_PRICE_PRO',
  agency: 'STRIPE_PRICE_AGENCY',
};

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('NUDOFY_SECRET_KEY')!,
    );

    // Verificar JWT del caller contra GoTrue directamente (auth.getUser() falla
    // en este runtime — mismo problema conocido que en invite-agent/delete-agent).
    const authHeader = req.headers.get('authorization') ?? '';
    const callerJwt = authHeader.replace(/^Bearer\s+/i, '');
    const callerRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, authorization: `Bearer ${callerJwt}` },
    });
    if (!callerRes.ok) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers });
    }
    const callerUser: { id: string; email: string } = await callerRes.json();

    // Solo el dueño de la cuenta (quien se registró, role company_admin) puede
    // gestionar la facturación — un agente invitado no.
    const { data: callerProfile } = await supabaseAdmin
      .from('users').select('role').eq('id', callerUser.id).single();
    if (!callerProfile || callerProfile.role !== 'company_admin') {
      return new Response(JSON.stringify({ error: 'Solo el administrador de la cuenta puede cambiar el plan' }), { status: 403, headers });
    }

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, email, name, plan, company_id, stripe_customer_id, stripe_subscription_id, active')
      .eq('user_id', callerUser.id)
      .single();
    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agente no encontrado' }), { status: 404, headers });
    }

    const { targetPlan, successUrl, cancelUrl } = await req.json();

    // Defensa en profundidad: Stripe redirige el navegador/WebView del
    // usuario a estas URLs tras el pago — no hay forma de que esto afecte a
    // otro usuario, pero como esta función acepta la URL tal cual del body,
    // se restringe a los esquemas/orígenes propios de la app en vez de
    // confiar ciegamente en lo recibido (evita que quede como open redirect
    // si en el futuro se reutiliza este valor en otro sitio).
    const isAllowedRedirect = (url: string) =>
      typeof url === 'string' && (
        url.startsWith('nudofy://') ||
        ALLOWED_ORIGINS.some(o => url.startsWith(o + '/') || url === o)
      );
    if (!isAllowedRedirect(successUrl) || !isAllowedRedirect(cancelUrl)) {
      return new Response(JSON.stringify({ error: 'successUrl/cancelUrl inválidas' }), { status: 400, headers });
    }

    // Ya tiene una suscripción activa: gestionar el cambio/cancelación desde el
    // Billing Portal de Stripe (evita reimplementar prorrateo a mano).
    if (agent.stripe_subscription_id && agent.active && agent.stripe_customer_id) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: agent.stripe_customer_id,
        return_url: successUrl,
        configuration: Deno.env.get('STRIPE_PORTAL_CONFIG_ID'),
      });
      return new Response(JSON.stringify({ url: portalSession.url }), { headers });
    }

    // Alta nueva: validar el plan objetivo y crear (o reutilizar) el Customer.
    if (!targetPlan || !(targetPlan in PLAN_PRICE_ENV)) {
      return new Response(JSON.stringify({ error: 'targetPlan inválido' }), { status: 400, headers });
    }
    const priceId = Deno.env.get(PLAN_PRICE_ENV[targetPlan]);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Falta configurar ${PLAN_PRICE_ENV[targetPlan]}` }), { status: 500, headers });
    }

    let customerId = agent.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.name,
        metadata: { agent_id: agent.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from('agents').update({ stripe_customer_id: customerId }).eq('id', agent.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      customer_update: { name: 'auto', address: 'auto' },
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { agent_id: agent.id, target_plan: targetPlan },
      subscription_data: { metadata: { agent_id: agent.id, target_plan: targetPlan } },
    });

    return new Response(JSON.stringify({ url: session.url }), { headers });

  } catch (e: any) {
    console.error('create-billing-session error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500, headers });
  }
});
