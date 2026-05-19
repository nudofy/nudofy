// delete-agent · Borrado de agente desde panel admin
// Recibe: { agentId: string }
// Elimina el usuario de auth.users → cascada borra public.users + agents

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { agentId } = await req.json();
    if (!agentId) {
      return new Response(JSON.stringify({ error: 'agentId requerido' }), { status: 400, headers: CORS });
    }

    // Obtener user_id del agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: 'Agente no encontrado' }), { status: 404, headers: CORS });
    }

    // Si tiene user_id, borrar de auth (cascada borra todo)
    if (agent.user_id) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(agent.user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: CORS });
      }
    } else {
      // Sin user_id: borrar solo de agents
      const { error: deleteError } = await supabaseAdmin
        .from('agents')
        .delete()
        .eq('id', agentId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: CORS });
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: CORS });

  } catch (e: any) {
    console.error('delete-agent error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500, headers: CORS });
  }
});
