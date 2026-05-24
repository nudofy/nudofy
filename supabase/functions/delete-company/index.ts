// delete-company · Borrado de empresa desde panel admin
// Recibe: { companyId: string }
// Borra los auth users de todos los agentes de la empresa, luego borra la empresa

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

    const { companyId } = await req.json();
    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId requerido' }), { status: 400, headers: CORS });
    }

    // Obtener todos los agentes de la empresa
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agents')
      .select('id, user_id')
      .eq('company_id', companyId);

    if (agentsError) {
      return new Response(JSON.stringify({ error: agentsError.message }), { status: 400, headers: CORS });
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
      return new Response(JSON.stringify({ error: companyError.message }), { status: 400, headers: CORS });
    }

    return new Response(JSON.stringify({ success: true }), { headers: CORS });

  } catch (e: any) {
    console.error('delete-company error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Error inesperado' }), { status: 500, headers: CORS });
  }
});
