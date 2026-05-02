import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://nudofy.com',
  'https://app.nudofy.com',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const { name, email, phone, business_name, nif, plan } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Nombre y email son obligatorios' }), { status: 400, headers });
    }

    // Verificar que quien llama está autenticado
    const authHeader = req.headers.get('authorization') ?? '';
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } },
    );
    const { data: { user: callerUser }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers });
    }

    // Cliente admin con service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verificar que el caller es superadmin
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    if (adminEmail && callerUser.email !== adminEmail) {
      return new Response(JSON.stringify({ error: 'Sin permisos de administrador' }), { status: 403, headers });
    }

    // Generar contraseña temporal
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tempPassword = 'Nf';
    for (let i = 0; i < 6; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

    // Crear usuario Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: { role: 'agent' },
      email_confirm: true,
    });

    const alreadyExists = userError && userError.message.toLowerCase().includes('already');

    if (userError && !alreadyExists) {
      return new Response(JSON.stringify({ error: userError.message }), { status: 400, headers });
    }

    let userId: string;

    if (alreadyExists) {
      // Buscar el user_id existente
      const { data: existingAgent } = await supabaseAdmin
        .from('agents')
        .select('user_id')
        .eq('email', email)
        .single();

      if (existingAgent) {
        return new Response(JSON.stringify({ error: 'Ya existe un agente con ese email' }), { status: 409, headers });
      }

      // Obtener el user_id del auth
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existing = users.find((u: any) => u.email === email);
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Usuario existente no encontrado' }), { status: 400, headers });
      }
      userId = existing.id;
    } else {
      userId = userData!.user!.id;
    }

    // Insertar en agents
    const { error: agentError } = await supabaseAdmin.from('agents').insert({
      user_id: userId,
      name,
      email,
      phone: phone ?? null,
      business_name: business_name ?? null,
      nif: nif ?? null,
      plan: plan ?? 'pro',
      active: true,
    });

    if (agentError) {
      return new Response(JSON.stringify({ error: agentError.message }), { status: 400, headers });
    }

    // Enviar email de bienvenida con credenciales
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nudofy <no-reply@nudofy.app>',
        to: email,
        subject: 'Tu acceso a Nudofy',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
            <h2 style="color:#E73121;">Bienvenido a Nudofy</h2>
            <p>Hola ${name},</p>
            <p>Tu cuenta de agente ha sido creada. Estas son tus credenciales de acceso:</p>
            <div style="background:#f5f5f5;border-radius:10px;padding:16px;margin:20px 0;">
              <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin:4px 0;"><strong>Contraseña temporal:</strong>
                <span style="font-size:18px;font-weight:bold;letter-spacing:2px;">${tempPassword}</span>
              </p>
            </div>
            <p>Descarga la app <strong>Nudofy</strong> e inicia sesión con estas credenciales.</p>
            <p style="color:#999;font-size:12px;margin-top:24px;">
              Por seguridad, cambia tu contraseña desde tu perfil una vez dentro.
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.json().catch(() => ({}));
      console.error('Resend error:', JSON.stringify(resendError));
      // No fallamos — el agente está creado, solo el email falló
      return new Response(JSON.stringify({ success: true, warning: 'Agente creado pero el email no se pudo enviar' }), { headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders(null) });
  }
});
