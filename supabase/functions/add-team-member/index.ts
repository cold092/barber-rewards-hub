import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is owner or admin
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (!roleData || (roleData.role !== 'owner' && roleData.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's organization_id
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile?.organization_id) {
      return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Nome, email e senha são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validRoles = ['owner', 'barber'];
    const assignedRole = validRoles.includes(role) ? role : 'barber';

    // Create user via admin API (bypasses email confirmation)
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      const msg = createError.message.includes('already been registered')
        ? 'Este email já está cadastrado'
        : createError.message;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = newUserData.user.id;

    // Create profile with same organization_id
    const { error: profileError } = await adminClient.from('profiles').insert({
      user_id: newUserId,
      name,
      organization_id: callerProfile.organization_id,
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return new Response(JSON.stringify({ error: 'Erro ao criar perfil do colaborador' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Assign selected role
    const { error: roleError } = await adminClient.from('user_roles').insert({
      user_id: newUserId,
      role: assignedRole,
    });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      return new Response(JSON.stringify({ error: 'Erro ao atribuir papel de colaborador' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, userId: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
