/*
  Manner Wein - Scanner proxy (Cloudflare Worker, free plan)

  Only needed if the Scanner shows "could not be reached from this page (CORS)".
  It forwards read-only public market-data requests and adds the header browsers need.
  No API keys, no account data, and only the three exchange hosts below are allowed.

  SETUP (about 5 minutes)
  1. Sign in at https://dash.cloudflare.com  (free account)
  2. Workers & Pages > Create > Create Worker > give it a name > Deploy
  3. Edit code > delete the sample > paste this whole file > Deploy
  4. Copy the worker address, e.g. https://mw-scanner.yourname.workers.dev
  5. Paste it into "Proxy URL (optional)" on the Scanner page, then select "Test connection"
*/

const ALLOWED_HOSTS = ["contract.mexc.com", "fapi.binance.com", "api.bybit.com"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*"
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return new Response("Only GET is allowed", { status: 405, headers: CORS });

    const target = new URL(request.url).searchParams.get("url");
    if (!target) return new Response("Missing ?url=", { status: 400, headers: CORS });

    let url;
    try { url = new URL(target); } catch (e) { return new Response("Bad url", { status: 400, headers: CORS }); }
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.includes(url.hostname)) {
      return new Response("Host not allowed", { status: 403, headers: CORS });
    }

    const upstream = await fetch(url.toString(), {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (MannerWein Scanner)" },
      cf: { cacheTtl: 15, cacheEverything: true }
    });

    const headers = new Headers(upstream.headers);
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v));
    headers.delete("set-cookie");
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
