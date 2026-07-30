// delete-company · Borrado de empresa desde panel admin
// Recibe: { companyId: string }
// Borra los auth users de todos los agentes de la empresa, luego borra la empresa

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

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('NUDOFY_SECRET_KEY')!,
    );

    // ── Verificar que quien llama es un admin de Nudofy ──────────────────
    // getUser() de supabase-js falla en este runtime (esm.sh) — validar el
    // JWT directamente contra GoTrue.
    const authHeader = req.headers.get('authorization') ?? '';
    const callerJwt = authHeader.replace(/^Bearer\s+/i, '');
    const callerRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, authorization: `Bearer ${callerJwt}` },
    });
    if (!callerRes.ok) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers });
    }
    const callerUser: { id: string; email: string } = await callerRes.json();

    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const isSuperAdmin = adminEmail && callerUser.email === adminEmail;
    if (!isSuperAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from('users').select('role').eq('id', callerUser.id).single();
      if (!callerProfile || callerProfile.role !== 'nudofy_admin') {
        return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403, headers });
      }
    }

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId requerido' }), { status: 400, headers });
    }

    // Obtener todos los agentes de la empresa
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agents')
      .select('id, user_id')
      .eq('company_id', companyId);

    if (agentsError) {
      return new Response(JSON.stringify({ error: agentsError.message }), { status: 400, headers });
    }

    // Borrar auth users de cada agente
    for (const agent of agents ?? []) {
      if (agent.user_id) {
        await supabaseAdmin.auth.admin.deleteUser(agent.user_id);
      }
    }

    // Borrar filas de agents
    if ((agents ?? []).length > 0) {
      await supabaseAdmin.from('agents').delete().eq('company_id', companyId);
    }

    // Borrar company_users (si existe la tabla)
    await supabaseAdmin.from('company_users').delete().eq('company_id', companyId);

    // Borrar la empresa
    const { error: companyError } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (companyError) {
      return new Response(JSON.stringify({ error: companyError.message }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });

  } catch (e: any) {
    console.error('delete-company error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500, headers });
  }
});
