// delete-agent · Borrado de agente desde panel admin
// Recibe: { agentId: string }
// Elimina el usuario de auth.users → cascada borra public.users + agents

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

    const { agentId } = await req.json();
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'agentId requerido' }), { status: 400, headers });
    }

    // Obtener user_id del agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agente no encontrado' }), { status: 404, headers });
    }

    // 1. Borrar de auth si tiene user_id
    if (agent.user_id) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(agent.user_id);
      if (deleteError && !deleteError.message.includes('not found')) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers });
      }
    }

    // 2. Borrar fila de agents explícitamente (no depender de cascade)
    const { error: agentDeleteError } = await supabaseAdmin
      .from('agents')
      .delete()
      .eq('id', agentId);
    if (agentDeleteError) {
      return new Response(JSON.stringify({ error: agentDeleteError.message }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });

  } catch (e: any) {
    console.error('delete-agent error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500, headers });
  }
});
