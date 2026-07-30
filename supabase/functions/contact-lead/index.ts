// contact-lead · Formulario de contacto de nudofy-web (/contacto)
// Recibe: { name, email, reason, message, website? }
// Guarda el lead en contact_leads y avisa por email a nudofyapp@gmail.com.
// "website" es un honeypot: campo oculto que un humano nunca rellena.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const ALLOWED_ORIGINS = [
  'https://nudofy.com',
  'https://www.nudofy.com',
  'http://localhost:3000', // desarrollo local
];

const VALID_REASONS = ['ventas', 'soporte', 'facturacion', 'prensa', 'otro'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_EMAIL = 'nudofyapp@gmail.com';

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

  try {
    const { name, email, reason, message, website } = await req.json();

    // Honeypot: un bot rellena campos ocultos, un humano no lo ve.
    // Devolvemos éxito falso para no delatar el filtro.
    if (typeof website === 'string' && website.trim() !== '') {
      return new Response(JSON.stringify({ success: true }), { headers });
    }

    if (!name || !email || !reason || !message) {
      return new Response(
        JSON.stringify({ error: 'Nombre, email, motivo y mensaje son obligatorios' }),
        { status: 400, headers },
      );
    }
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedMessage = String(message).trim();

    if (trimmedName.length < 2 || trimmedName.length > 200) {
      return new Response(JSON.stringify({ error: 'Nombre inválido' }), { status: 400, headers });
    }
    if (!EMAIL_RE.test(trimmedEmail) || trimmedEmail.length > 200) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400, headers });
    }
    if (!VALID_REASONS.includes(reason)) {
      return new Response(JSON.stringify({ error: 'Motivo inválido' }), { status: 400, headers });
    }
    if (trimmedMessage.length < 5 || trimmedMessage.length > 5000) {
      return new Response(JSON.stringify({ error: 'Mensaje inválido' }), { status: 400, headers });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('NUDOFY_SECRET_KEY')!,
    );

    const { error: insertError } = await supabaseAdmin.from('contact_leads').insert({
      name: trimmedName,
      email: trimmedEmail,
      reason,
      message: trimmedMessage,
    });

    if (insertError) {
      console.error('contact-lead: error al guardar', insertError.message);
      return new Response(JSON.stringify({ error: 'No se pudo enviar el mensaje' }), { status: 500, headers });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Nudofy <no-reply@nudofy.app>',
          to: NOTIFY_EMAIL,
          reply_to: trimmedEmail,
          subject: `[Contacto] ${reason} — ${trimmedName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
              <h2 style="color:#E73121;">Nuevo mensaje de contacto</h2>
              <p><strong>Nombre:</strong> ${trimmedName}</p>
              <p><strong>Email:</strong> ${trimmedEmail}</p>
              <p><strong>Motivo:</strong> ${reason}</p>
              <p><strong>Mensaje:</strong></p>
              <p style="white-space:pre-wrap;background:#f5f5f5;border-radius:8px;padding:12px;">${trimmedMessage}</p>
            </div>
          `,
        }),
      });
      if (!resendRes.ok) {
        const resendBody = await resendRes.json().catch(() => ({}));
        console.error('contact-lead: Resend falló', JSON.stringify(resendBody));
        // No bloqueamos — el lead ya está guardado en BD, el email es secundario
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers });

  } catch (e: any) {
    console.error('contact-lead error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500, headers: corsHeaders(null) });
  }
});
