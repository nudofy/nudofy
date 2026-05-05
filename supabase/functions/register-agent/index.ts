// register-agent · Auto-registro desde nudofy.app/registro
// Recibe: { name, email, password, dpa_version }
// Crea usuario Auth + registro en agents con plan free_pro (15 días de trial)
// Envía email de bienvenida con Resend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://nudofy.app',
  'https://www.nudofy.app',
  'http://localhost:3000', // development
];

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
    const { name, email, password, dpa_version } = await req.json();

    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Nombre, email y contraseña son obligatorios' }),
        { status: 400, headers }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verificar si ya existe un agente con este email
    const { data: existingAgent } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existingAgent) {
      return new Response(
        JSON.stringify({ error: 'Ya existe una cuenta con este email. Descarga la app e inicia sesión.' }),
        { status: 409, headers }
      );
    }

    // Crear usuario en Supabase Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      user_metadata: { role: 'agent', name },
      email_confirm: true, // skip email confirmation — we send our own welcome email
    });

    if (userError) {
      if (userError.message.toLowerCase().includes('already')) {
        return new Response(
          JSON.stringify({ error: 'Ya existe una cuenta con este email. Descarga la app e inicia sesión.' }),
          { status: 409, headers }
        );
      }
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers }
      );
    }

    const userId = userData.user!.id;

    // Trial de 15 días
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 15);

    // Insertar en agents
    const { error: agentError } = await supabaseAdmin.from('agents').insert({
      user_id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      plan: 'free_pro',
      plan_expires_at: trialExpiry.toISOString(),
      active: true,
      accepted_dpa_at: dpa_version ? new Date().toISOString() : null,
    });

    if (agentError) {
      // Rollback: eliminar el usuario de auth si falla la inserción
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: agentError.message }),
        { status: 400, headers }
      );
    }

    // Email de bienvenida
    const trialEndStr = trialExpiry.toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Nudofy <nudofyapp@gmail.com>',
          to: email.trim().toLowerCase(),
          subject: '¡Bienvenido a Nudofy! Tu prueba gratuita ha comenzado',
          html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e5e5;">

    <!-- Header -->
    <div style="background:#1a1a1a;padding:28px 32px;">
      <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">
        Nudofy<span style="color:#e63946;">.</span>
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">
        ¡Hola, ${name.trim()}! 👋
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
        Tu cuenta en Nudofy está lista. Tienes <strong>15 días de acceso completo</strong>
        para probar todo sin limitaciones.
      </p>

      <!-- Trial badge -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">
          Tu período de prueba
        </p>
        <p style="margin:0;font-size:15px;color:#166534;">
          Acceso gratuito hasta el <strong>${trialEndStr}</strong>
        </p>
      </div>

      <!-- Steps -->
      <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1a1a1a;">
        ¿Por dónde empiezo?
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:24px;margin-right:12px;">1</span>
            <span style="font-size:14px;color:#333;">Descarga la app Nudofy en tu móvil</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:24px;margin-right:12px;">2</span>
            <span style="font-size:14px;color:#333;">Añade tu primer proveedor y su catálogo</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#1a1a1a;color:#fff;font-size:12px;font-weight:700;text-align:center;line-height:24px;margin-right:12px;">3</span>
            <span style="font-size:14px;color:#333;">Crea tu primer pedido y envíalo al proveedor</span>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <a href="https://nudofy.app/precios"
         style="display:block;background:#1a1a1a;color:#fff;text-align:center;padding:14px;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;margin-bottom:24px;">
        Ver planes →
      </a>

      <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
        ¿Tienes alguna duda? Responde a este email o escríbenos a
        <a href="mailto:nudofyapp@gmail.com" style="color:#e63946;text-decoration:none;">nudofyapp@gmail.com</a>.
        Estamos aquí para ayudarte.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5;">
      <p style="margin:0;font-size:12px;color:#999;text-align:center;">
        Nudofy · nudofy.app ·
        <a href="https://nudofy.app/baja" style="color:#999;text-decoration:none;">Darme de baja</a>
      </p>
    </div>
  </div>
</body>
</html>`,
        }),
      });

      if (!resendRes.ok) {
        const resendBody = await resendRes.json().catch(() => ({}));
        console.error('Resend welcome email failed:', JSON.stringify(resendBody));
        // No bloqueamos — el agente está creado, el email de bienvenida es secundario
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers }
    );

  } catch (e: any) {
    console.error('register-agent error:', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Error inesperado' }),
      { status: 500, headers: corsHeaders(null) }
    );
  }
});
