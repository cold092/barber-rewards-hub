import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const VAPID_PUBLIC_KEY = "BIiH87otcPX1qhLMch4S48c2OTIIIr0f-_tLnfPqm-Bbh4Q7_im1e-CIsIPCUuoJUsfgtFDHB_eW3icgGVpFtc0";

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
  const pubKey = pubRaw.length === 65 ? pubRaw : (() => {
    const full = new Uint8Array(65);
    full[0] = 0x04;
    full.set(pubRaw, 65 - pubRaw.length);
    return full;
  })();
  const x = pubKey.slice(1, 33);
  const y = pubKey.slice(33, 65);
  const jwkPub = {
    kty: "EC", crv: "P-256",
    x: btoa(String.fromCharCode(...x)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...y)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  };
  const privateKey = await crypto.subtle.importKey("jwk", { ...jwkPub, d: privateKeyB64 }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return { privateKey, publicKeyBytes: pubKey };
}

function uint8ToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createVapidAuthHeader(endpoint: string, vapidPrivateKey: CryptoKey, vapidPublicBytes: Uint8Array, sub: string) {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const enc = new TextEncoder();
  const headerB64 = uint8ToBase64Url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payloadB64 = uint8ToBase64Url(enc.encode(JSON.stringify({ aud, exp, sub })));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, vapidPrivateKey, enc.encode(unsignedToken));
  const sigBytes = new Uint8Array(signature);
  let raw: Uint8Array;
  if (sigBytes.length === 64) {
    raw = sigBytes;
  } else {
    let offset = 2;
    const rLen = sigBytes[offset + 1]; offset += 2;
    const r = sigBytes.slice(offset, offset + rLen); offset += rLen + 1;
    const sLen = sigBytes[offset]; offset += 1;
    const s = sigBytes.slice(offset, offset + sLen);
    raw = new Uint8Array(64);
    raw.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    raw.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  }
  const token = `${unsignedToken}.${uint8ToBase64Url(raw)}`;
  return { authorization: `vapid t=${token}, k=${uint8ToBase64Url(vapidPublicBytes)}` };
}

async function encryptPayload(payload: string, subscriptionKey: string, subscriptionAuth: string) {
  const enc = new TextEncoder();
  const payloadBytes = enc.encode(payload);
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));
  const subscriberPubBytes = base64UrlToUint8Array(subscriptionKey);
  const subscriberPubKey = await crypto.subtle.importKey("raw", subscriberPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: subscriberPubKey }, localKeyPair.privateKey, 256));
  const authBytes = base64UrlToUint8Array(subscriptionAuth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authInfo = enc.encode("Content-Encoding: auth\0");
  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: authBytes, info: authInfo }, ikmKey, 256));
  const keyLabel = enc.encode("Content-Encoding: aesgcm\0");
  const nonceLabel = enc.encode("Content-Encoding: nonce\0");
  const p256Label = enc.encode("P-256\0");
  const context = new Uint8Array(p256Label.length + 2 + subscriberPubBytes.length + 2 + localPublicKeyRaw.length);
  let off = 0;
  context.set(p256Label, off); off += p256Label.length;
  context[off++] = 0; context[off++] = subscriberPubBytes.length;
  context.set(subscriberPubBytes, off); off += subscriberPubBytes.length;
  context[off++] = 0; context[off++] = localPublicKeyRaw.length;
  context.set(localPublicKeyRaw, off);
  const keyInfo = new Uint8Array(keyLabel.length + context.length);
  keyInfo.set(keyLabel); keyInfo.set(context, keyLabel.length);
  const nonceInfo = new Uint8Array(nonceLabel.length + context.length);
  nonceInfo.set(nonceLabel); nonceInfo.set(context, nonceLabel.length);
  const prkKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const contentKeyBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: keyInfo }, prkKey, 128));
  const nonceBits = new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96));
  const padded = new Uint8Array(2 + payloadBytes.length);
  padded[0] = 0; padded[1] = 0;
  padded.set(payloadBytes, 2);
  const aesKey = await crypto.subtle.importKey("raw", contentKeyBits, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonceBits }, aesKey, padded));
  return { body: encrypted, salt, localPublicKey: localPublicKeyRaw };
}

async function sendPushToUser(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  url: string,
  vapidPrivateKey: CryptoKey,
  vapidPublicBytes: Uint8Array
) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return 0;

  let sent = 0;
  const payloadStr = JSON.stringify({ title, body, icon: "/icon.svg", tag: "redemption-push", data: { url } });

  for (const sub of subs) {
    try {
      const { body: encrypted, salt, localPublicKey } = await encryptPayload(payloadStr, sub.p256dh, sub.auth);
      const { authorization } = await createVapidAuthHeader(sub.endpoint, vapidPrivateKey, vapidPublicBytes, "mailto:push@barbercrm.app");
      const pushRes = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          "Authorization": authorization,
          "TTL": "86400",
          "Content-Encoding": "aesgcm",
          "Encryption": `salt=${uint8ToBase64Url(salt)}`,
          "Crypto-Key": `dh=${uint8ToBase64Url(localPublicKey)};p256ecdsa=${uint8ToBase64Url(vapidPublicBytes)}`,
          "Content-Type": "application/octet-stream",
        },
        body: encrypted,
      });
      if (pushRes.status === 201 || pushRes.status === 200) sent++;
      else if (pushRes.status === 410 || pushRes.status === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    } catch (e) {
      console.error("Push error:", (e as Error).message);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { redemption_id, status } = await req.json();

    if (!redemption_id || !status) {
      return new Response(JSON.stringify({ error: "Missing redemption_id or status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateB64 = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get redemption details
    const { data: redemption, error: rErr } = await supabase
      .from("redemptions")
      .select("*")
      .eq("id", redemption_id)
      .single();

    if (rErr || !redemption) {
      return new Response(JSON.stringify({ error: "Redemption not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { privateKey, publicKeyBytes } = await importVapidKeys(VAPID_PUBLIC_KEY, vapidPrivateB64);

    const isApproved = status === "approved";
    const emoji = isApproved ? "✅" : "❌";
    const title = `${emoji} Resgate ${isApproved ? "aprovado" : "rejeitado"}`;
    let body = `${redemption.description} — ${redemption.points} pts`;
    if (redemption.admin_note) {
      body += ` • "${redemption.admin_note}"`;
    }

    const sent = await sendPushToUser(
      supabase,
      redemption.user_id,
      title,
      body,
      "/resgates",
      privateKey,
      publicKeyBytes
    );

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
