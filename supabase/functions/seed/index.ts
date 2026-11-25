// Fonction Edge « seed » : renvoie { seed } = 256 bits tirés sur random.org, en hexadécimal.
// La clé API random.org vit uniquement dans le secret RANDOM_ORG_API_KEY du projet Supabase.
// Si random.org échoue, on répond 503 : le jeu retombe alors sur crypto.getRandomValues.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const apiKey = Deno.env.get('RANDOM_ORG_API_KEY');
  if (!apiKey) return json({ error: 'missing_key' }, 503);
  try {
    const res = await fetch('https://api.random.org/json-rpc/4/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'generateBlobs',
        params: { apiKey, n: 1, size: 256, format: 'hex' },
        id: crypto.randomUUID(),
      }),
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    const seed = String(data?.result?.random?.data?.[0] ?? '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(seed)) return json({ error: 'random_org' }, 503);
    return json({ seed, source: 'random.org' });
  } catch {
    return json({ error: 'random_org' }, 503);
  }
});
