import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // order_id + status obligatorios.
    // recipients opcional para reenvíos manuales: array de emails destino.
    const { order_id, status, recipients } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: 'order_id requerido' }), { status: 400, headers: CORS });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Cargar pedido completo ──────────────────────────────────────────
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, total, status, notes, created_at,
        agent:agents(id, user_id, name, email, company_id),
        client:clients(name, fiscal_name, email, user_id),
        supplier:suppliers(name, email),
        catalog:catalogs(name),
        items:order_items(quantity, unit_price, total, product:products(name, reference))
      `)
      .eq('id', order_id)
      .single();

    if (error || !order) return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), { status: 404, headers: CORS });

    const agent    = order.agent    as any;
    const client   = order.client   as any;
    const supplier = order.supplier as any;
    const catalog  = order.catalog  as any;
    const items    = (order.items   as any[]) ?? [];
    const orderStatus = status ?? order.status;

    // ── Resolver destinatarios por defecto ─────────────────────────────
    let defaultRecipients: { email: string; type: 'agent' | 'company' | 'supplier' | 'client'; user_id?: string }[] = [];

    if (agent?.email) defaultRecipients.push({ email: agent.email, type: 'agent', user_id: agent.user_id });

    if (agent?.company_id) {
      const { data: companyAgents } = await supabase
        .from('agents')
        .select('user_id')
        .eq('company_id', agent.company_id);

      if (companyAgents?.length) {
        const userIds = companyAgents.map((a: any) => a.user_id);
        const { data: adminUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('role', 'company_admin')
          .in('id', userIds)
          .maybeSingle();
        if (adminUser?.email && adminUser.email !== agent.email) {
          defaultRecipients.push({ email: adminUser.email, type: 'company', user_id: adminUser.id });
        }
      }
    } else {
      if (supplier?.email) defaultRecipients.push({ email: supplier.email, type: 'supplier' });
      if (client?.email)   defaultRecipients.push({ email: client.email, type: 'client', user_id: client.user_id });
    }

    const finalRecipients: { email: string; type: string; user_id?: string }[] = recipients
      ? (recipients as string[]).map(e => {
          const found = defaultRecipients.find(r => r.email === e);
          return { email: e, type: found?.type ?? 'custom', user_id: found?.user_id };
        })
      : defaultRecipients;

    // ── Construir HTML ─────────────────────────────────────────────────
    const clientName = client?.fiscal_name || client?.name || '—';
    const statusLabel = orderStatus === 'sent_to_supplier' ? 'Enviado al proveedor' : 'Confirmado';

    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;">${item.product?.name ?? '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;color:#888;">${item.product?.reference ?? ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">${Number(item.unit_price).toFixed(2)} €</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${Number(item.total).toFixed(2)} €</td>
      </tr>`).join('');

    function buildHtml(type: string) {
      const intros: Record<string, string> = {
        agent:    `Has confirmado un pedido de <strong>${clientName}</strong> al proveedor <strong>${supplier?.name ?? '—'}</strong>.`,
        company:  `El agente <strong>${agent?.name}</strong> de tu empresa ha confirmado un pedido de <strong>${clientName}</strong>.`,
        supplier: `El agente <strong>${agent?.name}</strong> ha realizado un nuevo pedido.`,
        client:   `Tu agente <strong>${agent?.name}</strong> ha realizado un pedido en tu nombre.`,
        custom:   `Resumen del pedido <strong>${order.order_number ?? ''}</strong>.`,
      };
      return `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
          <div style="background:#E73121;padding:18px 24px;border-radius:10px 10px 0 0;">
            <h2 style="color:white;margin:0;font-size:18px;">Nudofy · Pedido ${statusLabel}</h2>
          </div>
          <div style="background:#fafafa;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 10px 10px;">
            <p style="margin:0 0 20px;">${intros[type] ?? intros.custom}</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
              <thead>
                <tr style="background:#f0f0f0;">
                  <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;">Producto</th>
                  <th style="padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#666;">Ref.</th>
                  <th style="padding:8px 10px;text-align:center;font-size:11px;text-transform:uppercase;color:#666;">Uds.</th>
                  <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase;color:#666;">P.unit.</th>
                  <th style="padding:8px 10px;text-align:right;font-size:11px;text-transform:uppercase;color:#666;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <p style="text-align:right;font-size:17px;font-weight:700;margin:0 0 16px;">Total: ${Number(order.total).toFixed(2)} €</p>
            ${order.notes ? `<div style="background:#fff;border-left:3px solid #E73121;padding:10px 14px;border-radius:4px;font-size:13px;margin-bottom:16px;"><strong>Notas:</strong> ${order.notes}</div>` : ''}
            <p style="color:#aaa;font-size:11px;margin:0;">Pedido nº ${order.order_number ?? order.id.slice(0,8).toUpperCase()} · Catálogo: ${catalog?.name ?? '—'} · Cliente: ${clientName}</p>
          </div>
        </div>`;
    }

    // ── Mensajes push por tipo ─────────────────────────────────────────
    function buildPushMessage(type: string): { title: string; body: string } {
      const num = order.order_number ?? order.id.slice(0, 8).toUpperCase();
      const messages: Record<string, { title: string; body: string }> = {
        agent:    { title: 'Pedido confirmado', body: `Pedido ${num} de ${clientName} confirmado` },
        company:  { title: 'Nuevo pedido', body: `${agent?.name} confirmó el pedido ${num} de ${clientName}` },
        supplier: { title: 'Nuevo pedido recibido', body: `${agent?.name} te ha enviado el pedido ${num}` },
        client:   { title: 'Pedido realizado', body: `Tu agente confirmó el pedido ${num}` },
        custom:   { title: `Pedido ${num}`, body: `Estado: ${statusLabel}` },
      };
      return messages[type] ?? messages.custom;
    }

    // ── Enviar emails ──────────────────────────────────────────────────
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!;
    const FROM = 'Nudofy <no-reply@nudofy.app>';

    async function sendEmail(to: string, subject: string, html: string) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to, subject, html }),
      });
      if (!res.ok) console.warn('[notify-order] Resend error', to, await res.text());
    }

    // ── Enviar push notifications ──────────────────────────────────────
    async function sendPushToUser(userId: string, type: string) {
      if (!userId) return;

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId);

      if (!tokens?.length) return;

      const { title, body } = buildPushMessage(type);
      const messages = tokens.map(({ token }: { token: string }) => ({
        to: token,
        title,
        body,
        sound: 'default',
        data: { order_id: order.id, order_number: order.order_number },
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) console.warn('[notify-order] Expo push error:', await res.text());
    }

    const subject = `Pedido ${order.order_number ?? ''} · ${supplier?.name ?? ''}`;

    await Promise.allSettled([
      // Emails
      ...finalRecipients.map(r => sendEmail(r.email, subject, buildHtml(r.type))),
      // Push notifications
      ...finalRecipients
        .filter(r => r.user_id)
        .map(r => sendPushToUser(r.user_id!, r.type)),
    ]);

    return new Response(JSON.stringify({ success: true, sent: finalRecipients.length }), { headers: CORS });

  } catch (e: any) {
    console.error('[notify-order]', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
