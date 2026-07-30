// stripe-webhook · Recibe eventos de Stripe y actualiza el plan del agente.
// Sin verificación de JWT de Supabase — Stripe no manda uno; la autenticación
// es la firma en la cabecera `stripe-signature` contra STRIPE_WEBHOOK_SECRET.
// No confundir con el resto de Edge Functions del proyecto (invite-agent,
// delete-agent...), que sí validan un JWT de Supabase contra GoTrue.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_BASIC') ?? '']: 'basic',
  [Deno.env.get('STRIPE_PRICE_PRO') ?? '']: 'pro',
  [Deno.env.get('STRIPE_PRICE_AGENCY') ?? '']: 'agency',
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const signature = req.headers.get('stripe-signature');
  const body = await req.text(); // raw, sin parsear — imprescindible para verificar la firma

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err: any) {
    console.error('stripe-webhook: firma inválida', err.message);
    return new Response(`Webhook signature error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('NUDOFY_SECRET_KEY')!,
  );

  // Tras cualquier cambio de plan de un agente, replicarlo en su empresa (si
  // tiene) y en el resto de agentes de esa empresa — usePlanLimits/useFeatureGate
  // comprueban agents.plan, no companies.plan (misma lógica que
  // app/(admin)/empresa/[id].tsx:confirmPlanChange, duplicada aquí porque una
  // Edge Function en Deno no puede importar código del cliente RN).
  async function applyPlanChange(agentId: string, plan: string) {
    const { data: agent } = await supabaseAdmin
      .from('agents').select('company_id').eq('id', agentId).single();
    if (agent?.company_id) {
      await supabaseAdmin.from('companies').update({ plan }).eq('id', agent.company_id);
      await supabaseAdmin.from('agents').update({ plan }).eq('company_id', agent.company_id);
    }
  }

  async function findAgentIdByCustomer(customerId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from('agents').select('id').eq('stripe_customer_id', customerId).single();
    return data?.id ?? null;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const agentId = session.metadata?.agent_id ?? (session.customer ? await findAgentIdByCustomer(session.customer as string) : null);
        const targetPlan = session.metadata?.target_plan;
        if (agentId && targetPlan) {
          await supabaseAdmin.from('agents').update({
            plan: targetPlan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_expires_at: null,
            active: true,
          }).eq('id', agentId);
          await applyPlanChange(agentId, targetPlan);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const agentId = subscription.metadata?.agent_id ?? await findAgentIdByCustomer(subscription.customer as string);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;
        if (agentId && plan) {
          await supabaseAdmin.from('agents').update({
            plan,
            stripe_subscription_id: subscription.id,
          }).eq('id', agentId);
          await applyPlanChange(agentId, plan);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const agentId = subscription.metadata?.agent_id ?? await findAgentIdByCustomer(subscription.customer as string);
        if (agentId) {
          await supabaseAdmin.from('agents').update({ active: false }).eq('id', agentId);
        }
        break;
      }

      default:
        // Evento no manejado — se ignora sin error.
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('stripe-webhook error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500 });
  }
});
