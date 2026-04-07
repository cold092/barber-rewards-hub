const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()
    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const normalizedPhone = phone.replace(/\D/g, '')

    // Search converted clients/leads by phone
    const { data: referrals, error } = await supabaseAdmin
      .from('referrals')
      .select('id, lead_name, lead_phone, lead_points, is_client, status, client_user_id')
      .or('is_client.eq.true,status.eq.converted')

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const match = (referrals || []).find(r => {
      const refPhone = r.lead_phone.replace(/\D/g, '')
      return refPhone.includes(normalizedPhone) || normalizedPhone.includes(refPhone)
    })

    if (!match) {
      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (match.client_user_id) {
      return new Response(
        JSON.stringify({ found: false, already_linked: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        found: true,
        id: match.id,
        name: match.lead_name,
        phone: match.lead_phone,
        points: match.lead_points,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
