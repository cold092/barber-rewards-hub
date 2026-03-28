import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REWARD_PLANS: Record<string, { points: number; price: number }> = {
  prata_corte: { points: 30, price: 45 },
  prata_completo: { points: 50, price: 70 },
  gold_corte: { points: 80, price: 110 },
  gold_completo: { points: 120, price: 160 },
  vip_corte: { points: 200, price: 220 },
  vip_completo: { points: 400, price: 320 },
};

const REFERRAL_BONUS = 10;
const CHAIN_PERCENT = 0.3;

interface ReconciliationResult {
  profile_id: string;
  name: string;
  db_lifetime: number;
  expected_lifetime: number;
  db_wallet: number;
  diff: number;
  fixed: boolean;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check for plan overrides in crm_settings
    const { data: overrideRows } = await supabase
      .from("crm_settings")
      .select("setting_value")
      .eq("setting_key", "plan_overrides")
      .limit(1);

    const planOverrides: Record<string, { points?: number; price?: number }> =
      overrideRows?.[0]?.setting_value &&
      typeof overrideRows[0].setting_value === "object"
        ? (overrideRows[0].setting_value as Record<string, { points?: number; price?: number }>)
        : {};

    const getPlanPoints = (planId: string): number => {
      const base = REWARD_PLANS[planId];
      if (!base) return 0;
      const override = planOverrides[planId];
      if (override && typeof override.points === "number") return override.points;
      return base.points;
    };

    // Load all profiles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, name, lifetime_points, wallet_balance");

    if (pErr) throw pErr;

    // Load all referrals
    const { data: referrals, error: rErr } = await supabase
      .from("referrals")
      .select("id, referrer_id, status, is_client, converted_plan_id, referred_by_lead_id");

    if (rErr) throw rErr;

    const results: ReconciliationResult[] = [];
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry_run") !== "false";

    for (const profile of profiles || []) {
      const myReferrals = (referrals || []).filter(
        (r) => r.referrer_id === profile.id
      );

      let expectedLifetime = 0;

      // Direct referrals: +10 each
      const directRefs = myReferrals.filter((r) => !r.referred_by_lead_id);
      expectedLifetime += directRefs.length * REFERRAL_BONUS;

      // Conversions
      for (const ref of myReferrals) {
        if (
          ref.converted_plan_id &&
          (ref.status === "converted" || ref.is_client)
        ) {
          const planPts = getPlanPoints(ref.converted_plan_id);
          if (ref.referred_by_lead_id) {
            // Chain: barber gets 30%
            expectedLifetime += Math.round(planPts * CHAIN_PERCENT);
          } else {
            // Direct: barber gets 100%
            expectedLifetime += planPts;
          }
        }
      }

      const diff = expectedLifetime - (profile.lifetime_points || 0);

      if (diff !== 0) {
        let fixed = false;

        if (!dryRun) {
          const { error: updateErr } = await supabase
            .from("profiles")
            .update({
              lifetime_points: expectedLifetime,
              wallet_balance: Math.max(
                0,
                (profile.wallet_balance || 0) + diff
              ),
            })
            .eq("id", profile.id);

          fixed = !updateErr;
          if (updateErr) console.error(`Error updating ${profile.name}:`, updateErr);
        }

        results.push({
          profile_id: profile.id,
          name: profile.name,
          db_lifetime: profile.lifetime_points || 0,
          expected_lifetime: expectedLifetime,
          db_wallet: profile.wallet_balance || 0,
          diff,
          fixed,
        });
      }
    }

    return new Response(
      JSON.stringify({
        mode: dryRun ? "dry_run" : "applied",
        timestamp: new Date().toISOString(),
        discrepancies_found: results.length,
        details: results,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("Reconciliation error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
