import { SEED_HEX_LENGTH } from './core/rng';

// D'où vient la graine d'une partie. Le core reste pur : c'est ici, au boot, qu'on touche au réseau.
// 1. ?seed=… dans l'adresse (rejouer une partie) ;
// 2. random.org, via notre fonction Supabase qui garde la clé API secrète côté serveur ;
// 3. sinon crypto.getRandomValues (aléa du système, même qualité, jamais d'écran bloqué).

export type SeedSource = 'url' | 'randomOrg' | 'crypto';
export interface Seed {
  readonly seed: string;
  readonly source: SeedSource;
}

const ENDPOINT: string = import.meta.env.VITE_SEED_ENDPOINT ?? '';
const TIMEOUT_MS = 2500;
const HEX = new RegExp(`^[0-9a-f]{${SEED_HEX_LENGTH}}$`);

function cryptoSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(SEED_HEX_LENGTH / 8));
  return [...words].map((w) => w.toString(16).padStart(8, '0')).join('');
}

async function remoteSeed(): Promise<string | null> {
  if (!ENDPOINT) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, { signal: controller.signal });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const seed = typeof body === 'object' && body !== null && 'seed' in body ? String(body.seed).toLowerCase() : '';
    return HEX.test(seed) ? seed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function obtainSeed(fromUrl: string | null): Promise<Seed> {
  if (fromUrl) return { seed: fromUrl, source: 'url' };
  const remote = await remoteSeed();
  return remote ? { seed: remote, source: 'randomOrg' } : { seed: cryptoSeed(), source: 'crypto' };
}
