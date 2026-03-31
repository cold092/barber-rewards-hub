import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const VAPID_PUBLIC_KEY = "BIiH87otcPX1qhLMch4S48c2OTIIIr0f-_tLnfPqm-Bbh4Q7_im1e-CIsIPCUuoJUsfgtFDHB_eW3icgGVpFtc0";

// Web Push helpers
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const pubRaw = base64UrlToUint8Array(publicKeyB64);
  const privRaw = base64UrlToUint8Array(privateKeyB64);

  // Build uncompressed point (0x04 + x + y) if needed
  const pubKey = pubRaw.length === 65 ? pubRaw : (() => {
    const full = new Uint8Array(65);
    full[0] = 0x04;
    full.set(pubRaw, 65 - pubRaw.length);
    return full;
  })();

  const x = pubKey.slice(1, 33);
  const y = pubKey.slice(33, 65);

  const jwkPub = {
    kty: "EC",
    crv: "P-256",
    x: btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...y)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  };

  const jwkPriv = {
    ...jwkPub,
    d: privateKeyB64,
  };

  const privateKey = await crypto.subtle.importKey("jwk", jwkPriv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { privateKey, publicKeyBytes: pubKey };
}

function uint8ToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidAuthHeader(endpoint: string, vapidPrivateKey: CryptoKey, vapidPublicBytes: Uint8Array, sub: string) {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp, sub };

  const enc = new TextEncoder();
  const headerB64 = uint8ToBase64Url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ToBase64Url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    vapidPrivateKey,
    enc.encode(unsignedToken)
  );

  // Convert DER to raw r||s
  const sigBytes = new Uint8Array(signature);
  let raw: Uint8Array;
  if (sigBytes.length === 64) {
    raw = sigBytes;
  } else {
    // DER decode
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    offset += 2;
    const r = sigBytes.slice(offset, offset + rLen);
    offset += rLen + 1;
    const sLen = sigBytes[offset];
    offset += 1;
    const s = sigBytes.slice(offset, offset + sLen);

    raw = new Uint8Array(64);
    raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  }

  const token = `${unsignedToken}.${uint8ToBase64Url(raw)}`;
  const pubB64 = uint8ToBase64Url(vapidPublicBytes);
  return { authorization: `vapid t=${token}, k=${pubB64}` };
}

// ECDH + HKDF + AES-GCM encryption for Web Push payload
async function encryptPayload(
  payload: string,
  subscriptionKey: string, // p256dh base64url
  subscriptionAuth: string // auth base64url
): Promise<{ body: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payload);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  // Import subscriber's public key
  const subscriberPubBytes = base64UrlToUint8Array(subscriptionKey);
  const subscriberPubKey = await crypto.subtle.importKey("raw", subscriberPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberPubKey }, localKeyPair.privateKey, 256));

  const authBytes = base64UrlToUint8Array(subscriptionAuth);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM
  const authInfo = enc.encode("Content-Encoding: auth\0");
  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authBytes, info: authInfo }, ikmKey, 256));

  // Context for key/nonce derivation
  const keyLabel = enc.encode("Content-Encoding: aesgcm\0");
  const nonceLabel = enc.encode("Content-Encoding: nonce\0");

  // Build context: "P-256\0" + len(subscriberPub) + subscriberPub + len(localPub) + localPub
  const p256Label = enc.encode("P-256\0");
  const context = new Uint8Array(p256Label.length + 2 + subscriberPubBytes.length + 2 + localPublicKeyRaw.length);
  let off = 0;
  context.set(p256Label, off); off += p256Label.length;
  context[off++] = 0; context[off++] = subscriberPubBytes.length;
  context.set(subscriberPubBytes, off); off += subscriberPubBytes.length;
  context[off++] = 0; context[off++] = localPublicKeyRaw.length;
  context.set(localPublicKeyRaw, off);

  const keyInfo = new Uint8Array(keyLabel.length + context.length);
  keyInfo.set(keyLabel);
  keyInfo.set(context, keyLabel.length);

  const nonceInfo = new Uint8Array(nonceLabel.length + context.length);
  nonceInfo.set(nonceLabel);
  nonceInfo.set(context, nonceLabel.length);

  const prkKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const contentKeyBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: keyInfo }, prkKey, 128));
  const nonceBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96));

  // Pad payload (2 bytes padding length + padding + payload)
  const padded = new Uint8Array(2 + payloadBytes.length);
  padded[0] = 0;
  padded[1] = 0;
  padded.set(payloadBytes, 2);

  const aesKey = await crypto.subtle.importKey("raw", contentKeyBits, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits }, aesKey, padded));

  return { body: encrypted, salt, localPublicKey: localPublicKeyRaw };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateB64 = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get follow-ups that are due (overdue or today)
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: dueReferrals, error: refErr } = await supabase
      .from("referrals")
      .select("id, lead_name, lead_phone, follow_up_date, follow_up_note, status, referrer_id")
      .not("follow_up_date", "is", null)
      .neq("status", "converted")
      .lte("follow_up_date", endOfDay.toISOString())
      .order("follow_up_date", { ascending: true });

    if (refErr) {
      console.error("Error fetching referrals:", refErr);
      return new Response(JSON.stringify({ error: refErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!dueReferrals || dueReferrals.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No due follow-ups" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Group by referrer_id
    const byReferrer = new Map<string, typeof dueReferrals>();
    for (const r of dueReferrals) {
      const arr = byReferrer.get(r.referrer_id) || [];
      arr.push(r);
      byReferrer.set(r.referrer_id, arr);
    }

    // Get all unique referrer user IDs
    const referrerIds = [...byReferrer.keys()];

    // Also get admin/owner users to notify them about all follow-ups
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "owner"]);

    const adminUserIds = (adminRoles || []).map((r: { user_id: string }) => r.user_id);

    // Collect all user IDs that need notifications
    const allUserIds = [...new Set([...referrerIds, ...adminUserIds])];

    // Get push subscriptions for these users
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", allUserIds);

    if (subErr || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Import VAPID keys
    const { privateKey, publicKeyBytes } = await importVapidKeys(VAPID_PUBLIC_KEY, vapidPrivateB64);

    let sentCount = 0;
    const errors: string[] = [];

    for (const sub of subscriptions) {
      // Determine which referrals this user should see
      const isAdmin = adminUserIds.includes(sub.user_id);
      const userReferrals = isAdmin ? dueReferrals : (byReferrer.get(sub.user_id) || []);

      if (userReferrals.length === 0) continue;

      const overdueCount = userReferrals.filter((r: { follow_up_date: string }) => new Date(r.follow_up_date) < now).length;
      const todayCount = userReferrals.length - overdueCount;

      let title = "📋 Follow-ups pendentes";
      let body = "";
      if (overdueCount > 0 && todayCount > 0) {
        body = `${overdueCount} atrasado${overdueCount > 1 ? "s" : ""} e ${todayCount} para hoje`;
      } else if (overdueCount > 0) {
        body = `${overdueCount} follow-up${overdueCount > 1 ? "s" : ""} atrasado${overdueCount > 1 ? "s" : ""}`;
        title = "⚠️ Follow-ups atrasados";
      } else {
        body = `${todayCount} follow-up${todayCount > 1 ? "s" : ""} para hoje`;
        title = "🔔 Follow-ups de hoje";
      }

      // First lead name as preview
      body += ` — ${userReferrals[0].lead_name}`;
      if (userReferrals.length > 1) body += ` +${userReferrals.length - 1}`;

      const payloadStr = JSON.stringify({ title, body, icon: "/icon.svg", tag: "follow-up-push", data: { url: "/leads" } });

      try {
        const { body: encrypted, salt, localPublicKey } = await encryptPayload(payloadStr, sub.p256dh, sub.auth);
        const { authorization } = await createVapidAuthHeader(sub.endpoint, privateKey, publicKeyBytes, "mailto:push@barbercrm.app");

        const pushRes = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Authorization": authorization,
            "TTL": "86400",
            "Content-Encoding": "aesgcm",
            "Encryption": `salt=${uint8ToBase64Url(salt)}`,
            "Crypto-Key": `dh=${uint8ToBase64Url(localPublicKey)};p256ecdsa=${uint8ToBase64Url(publicKeyBytes)}`,
            "Content-Type": "application/octet-stream",
          },
          body: encrypted,
        });

        if (pushRes.status === 201 || pushRes.status === 200) {
          sentCount++;
        } else if (pushRes.status === 410 || pushRes.status === 404) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          const errText = await pushRes.text();
          errors.push(`${pushRes.status}: ${errText}`);
        }
      } catch (e) {
        errors.push(`Push error: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, total: subscriptions.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
