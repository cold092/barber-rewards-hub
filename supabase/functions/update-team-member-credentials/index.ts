import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Caller must be owner or admin
    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (!callerRole || (callerRole.role !== 'owner' && callerRole.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { member_user_id, email, password } = await req.json();

    if (!member_user_id) {
      return new Response(JSON.stringify({ error: 'ID do membro é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const newPassword = typeof password === 'string' ? password : '';

    if (!trimmedEmail && !newPassword) {
      return new Response(JSON.stringify({ error: 'Informe email ou senha para atualizar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (newPassword && newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'A senha precisa ter ao menos 8 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Same-organization check
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

    // Owner protection: only another owner can edit an owner
    const { data: targetRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', member_user_id)
      .maybeSingle();

    if (targetRole?.role === 'owner' && callerRole.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Apenas o Dono pode alterar credenciais de outro Dono' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates: Record<string, unknown> = { email_confirm: true };
    if (trimmedEmail) updates.email = trimmedEmail;
    if (newPassword) updates.password = newPassword;

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      member_user_id,
      updates
    );

    if (updateError) {
      const msg = updateError.message?.includes('already been registered')
        ? 'Este email já está em uso'
        : updateError.message || 'Erro ao atualizar credenciais';
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Revoke all active sessions/refresh tokens for the target user so they get
    // kicked out on the next request (access-token JWT still valid until expiry,
    // usually <1h — but no new refresh will succeed).
    try {
      await adminClient.auth.admin.signOut(member_user_id, 'global');
    } catch (signOutError) {
      console.warn('signOut failed (non-fatal):', signOutError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
