import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      return new Response(JSON.stringify({ error: 'user_id y new_password son obligatorios' }), { status: 400, headers: CORS });
    }
    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), { status: 400, headers: CORS });
    }

    // Verificar que quien llama es admin
    const authHeader = req.headers.get('authorization') ?? '';
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } },
    );
    const { data: { user: callerUser }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: CORS });
    }

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
        return new Response(JSON.stringify({ error: 'Sin permisos' }), { status: 403, headers: CORS });
      }
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: CORS });
    }

    return new Response(JSON.stringify({ success: true }), { headers: CORS });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
