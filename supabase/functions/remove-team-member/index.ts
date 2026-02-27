import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin/owner
    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (!callerRole || (callerRole.role !== 'owner' && callerRole.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem remover membros' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { member_user_id } = await req.json();
    if (!member_user_id) {
      return new Response(JSON.stringify({ error: 'ID do membro é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prevent self-deletion
    if (member_user_id === caller.id) {
      return new Response(JSON.stringify({ error: 'Você não pode remover a si mesmo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check target is in same organization
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', caller.id)
      .maybeSingle();

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', member_user_id)
      .maybeSingle();

    if (!callerProfile || !targetProfile || callerProfile.organization_id !== targetProfile.organization_id) {
      return new Response(JSON.stringify({ error: 'Membro não encontrado na sua organização' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete role, profile, and auth user
    await adminClient.from('user_roles').delete().eq('user_id', member_user_id);
    await adminClient.from('profiles').delete().eq('user_id', member_user_id);
    await adminClient.auth.admin.deleteUser(member_user_id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
