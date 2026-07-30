import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const { name, email, phone, business_name, nif, plan, company_id, role } = await req.json();

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Nombre y email son obligatorios' }), { status: 400, headers });
    }

    // Verificar que quien llama está autenticado.
    // Nota: supabase-js@2 auth.getUser(jwt) falla en este runtime (esm.sh
    // resuelve una versión con un bug de fetch interno) — se valida el JWT
    // directamente contra el endpoint GoTrue en su lugar.
    const authHeader = req.headers.get('authorization') ?? '';
    const callerJwt = authHeader.replace(/^Bearer\s+/i, '');
    const callerRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, authorization: `Bearer ${callerJwt}` },
    });
    if (!callerRes.ok) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers });
    }
    const callerUser: { id: string; email: string } = await callerRes.json();

    // Cliente admin con service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('NUDOFY_SECRET_KEY')!,
    );

    // Verificar permisos: superadmin o company_admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const isSuperAdmin = adminEmail && callerUser.email === adminEmail;
    let callerIsNudofyAdmin = false;
    if (!isSuperAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from('users').select('role').eq('id', callerUser.id).single();
      const allowedRoles = ['nudofy_admin', 'company_admin'];
      if (!callerProfile || !allowedRoles.includes(callerProfile.role)) {
        return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403, headers });
      }
      callerIsNudofyAdmin = callerProfile.role === 'nudofy_admin';
    }

    // El company_id NUNCA se acepta tal cual del body si quien llama es un
    // company_admin normal: antes de este fix (auditoría 28 jul 2026) un
    // company_admin podía mandar el company_id de OTRA empresa y colar un
    // agente suyo dentro de ella — esa cuenta luego pasaría el filtro de
    // "agents_same_company_select"/"companies_own_select" de RLS y vería el
    // equipo y los datos de la empresa ajena (fuga cross-tenant). Solo
    // isSuperAdmin/nudofy_admin puede asignar un company_id arbitrario
    // (lo necesitan desde el panel admin al dar de alta la empresa+admin de
    // otro cliente); un company_admin siempre queda forzado a SU PROPIA
    // empresa, ignorando lo que venga en el body.
    let effectiveCompanyId: string | null = company_id ?? null;
    if (!isSuperAdmin && !callerIsNudofyAdmin) {
      const { data: callerAgentRow } = await supabaseAdmin
        .from('agents')
        .select('company_id')
        .eq('user_id', callerUser.id)
        .maybeSingle();
      effectiveCompanyId = callerAgentRow?.company_id ?? null;
    }

    // Generar contraseña temporal
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tempPassword = 'Nf';
    for (let i = 0; i < 6; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

    // Crear usuario Auth.
    // El rol solicitado NUNCA se acepta tal cual del body: un company_admin
    // podría pedir role:"nudofy_admin" y auto-otorgarse superadmin. Solo
    // isSuperAdmin/nudofy_admin puede asignar cualquier rol; el resto de
    // callers (company_admin) solo puede crear agent/company_admin.
    const requestedRole = role ?? 'agent';
    const callerCanAssignAnyRole = isSuperAdmin || callerIsNudofyAdmin;
    const rolesAssignableByCompanyAdmin = ['agent', 'company_admin'];
    if (!callerCanAssignAnyRole && !rolesAssignableByCompanyAdmin.includes(requestedRole)) {
      return new Response(JSON.stringify({ error: 'Rol no permitido' }), { status: 403, headers });
    }
    const effectiveRole = requestedRole;
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: { role: effectiveRole },
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
      company_id: effectiveCompanyId,
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
            <p>Descarga la app <a href="https://apps.apple.com/es/app/nudofy/id6761891090" style="color:#E73121;"><strong>Nudofy</strong></a> (iOS — Android disponible próximamente) e inicia sesión con estas credenciales.</p>
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
