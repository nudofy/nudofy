import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, clientName } = await req.json();

    if (!email) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400, headers: corsHeaders });

    // Cliente admin (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Generar contraseña temporal
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tempPassword = 'Nf';
    for (let i = 0; i < 6; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

    // Crear usuario
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: { role: 'client' },
      email_confirm: true,
    });

    const alreadyExists = userError && userError.message.toLowerCase().includes('already');

    if (userError && !alreadyExists) {
      return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers: corsHeaders });
    }

    // Si ya existe → enviar email de recuperación de contraseña
    if (alreadyExists) {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
      });
      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), { status: 400, headers: corsHeaders });
      }
      const recoveryLink = linkData.properties?.action_link ?? '';
      const resendRecovery = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Nudofy <onboarding@resend.dev>',
          to: email,
          subject: 'Recupera tu acceso al portal Nudofy',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
              <h2 style="color:#E73121;">Acceso al portal Nudofy</h2>
              <p>Hola${clientName ? ` ${clientName}` : ''},</p>
              <p>Tu agente ha solicitado el restablecimiento de tu contraseña. Pulsa el botón para establecer una nueva:</p>
              <a href="${recoveryLink}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#E73121;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Restablecer contraseña</a>
              <p style="color:#999;font-size:12px;margin-top:24px;">Si no esperabas este email, ignóralo.</p>
            </div>
          `,
        }),
      });
      if (!resendRecovery.ok) {
        return new Response(JSON.stringify({ error: 'Error enviando email de recuperación' }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ success: true, type: 'recovery' }), { headers: corsHeaders });
    }

    // Usuario nuevo → enviar credenciales
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nudofy <onboarding@resend.dev>',
        to: email,
        subject: 'Tu acceso al portal Nudofy',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
            <h2 style="color:#E73121;">Bienvenido a Nudofy</h2>
            <p>Hola${clientName ? ` ${clientName}` : ''},</p>
            <p>Tu agente te ha dado acceso al portal de pedidos. Estas son tus credenciales:</p>
            <div style="background:#f5f5f5;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin:4px 0;"><strong>Contraseña temporal:</strong> <span style="font-size:18px;font-weight:bold;letter-spacing:2px;">${tempPassword}</span></p>
            </div>
            <p>Descarga la app <strong>Nudofy</strong> e inicia sesión con estas credenciales.</p>
            <p style="color:#999;font-size:12px;margin-top:24px;">Por seguridad, cambia tu contraseña desde tu perfil una vez dentro.</p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.json();
      return new Response(JSON.stringify({ error: 'Error enviando email', detail: resendError }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
