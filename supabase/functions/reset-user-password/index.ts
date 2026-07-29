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
  const headers = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: 'user_id y new_password son obligatorios' }), { status: 400, headers });
    }
    if (new_password.length < 8) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }), { status: 400, headers });
    }

    // Verificar que quien llama es admin.
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Solo superadmin o nudofy_admin
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const isSuperAdmin = adminEmail && callerUser.email === adminEmail;
    if (!isSuperAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from('users').select('role').eq('id', callerUser.id).single();
      if (!callerProfile || callerProfile.role !== 'nudofy_admin') {
        return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403, headers });
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
});
