import { SEED_HEX_LENGTH } from './core/rng';

// D'où vient la graine d'une partie. Le core reste pur : c'est ici, au boot, qu'on touche au réseau.
// 1. ?seed=… dans l'adresse (rejouer une partie) ;
// 2. random.org : son interface HTTP publique (sans clé, quota par visiteur), ou une
//    fonction Supabase qui garde une clé API secrète si VITE_SEED_ENDPOINT est défini ;
// 3. sinon crypto.getRandomValues (aléa du système, même qualité, jamais d'écran bloqué).

export type SeedSource = 'url' | 'randomOrg' | 'crypto';
export interface Seed {
  readonly seed: string;
  readonly source: SeedSource;
}

// 16 entiers de 16 bits = 256 bits, en hexadécimal, un par ligne.
const RANDOM_ORG_PUBLIC = 'https://www.random.org/integers/?num=16&min=0&max=65535&col=1&base=16&format=plain&rnd=new';
const ENDPOINT: string = import.meta.env.VITE_SEED_ENDPOINT ?? '';
const TIMEOUT_MS = 2500;
const HEX = new RegExp(`^[0-9a-f]{${SEED_HEX_LENGTH}}$`);

function cryptoSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(SEED_HEX_LENGTH / 8));
  return [...words].map((w) => w.toString(16).padStart(8, '0')).join('');
}

/** Réponse de random.org (lignes hexadécimales) ou de notre fonction ({ seed }), ramenée à 64 hex. */
export function parseSeed(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) {
    try {
      const data: unknown = JSON.parse(trimmed);
      const seed = typeof data === 'object' && data !== null && 'seed' in data ? String(data.seed).toLowerCase() : '';
      return HEX.test(seed) ? seed : null;
    } catch {
      return null;
    }
  }
  const words = trimmed.split(/\s+/);
  if (words.length !== 16 || !words.every((w) => /^[0-9a-f]{1,4}$/i.test(w))) return null;
  return words.map((w) => w.toLowerCase().padStart(4, '0')).join('');
}

async function remoteSeed(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT || RANDOM_ORG_PUBLIC, { signal: controller.signal });
    return res.ok ? parseSeed(await res.text()) : null;
  } catch {
    // Réseau coupé, CORS ou CSP de l'artefact : on retombe sur crypto sans bloquer le jeu.
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
