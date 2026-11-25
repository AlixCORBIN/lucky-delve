// RNG seedé : ChaCha20 (RFC 8439) utilisé comme générateur de flux.
// Pourquoi ChaCha20 : clé de 256 bits (toute l'entropie de la graine est conservée),
// qualité cryptographique, uniquement des opérations 32 bits (rapide en JS, sans BigInt).
// Chaque flux (map, combat, loot, minigame) a son propre nonce : un tirage de combat
// en plus ne décale jamais la génération de la carte.

export const RNG_STREAMS = ['map', 'combat', 'loot', 'minigame'] as const;
export type RngStream = (typeof RNG_STREAMS)[number];

/** Graine canonique : 64 caractères hexadécimaux = 256 bits. */
export const SEED_HEX_LENGTH = 64;

export interface RngState {
  readonly key: readonly number[];
  readonly nonce: readonly number[];
  /** Position du prochain mot de 32 bits dans le flux. */
  readonly pos: number;
}
export type RngStreams = Readonly<Record<RngStream, RngState>>;

const SIGMA = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574];
const STREAM_TAG = 0x4c75636b; // « Luck » : sépare nos nonces de tout autre usage de la clé.

const rotl = (v: number, n: number): number => (v << n) | (v >>> (32 - n));

function quarter(x: Uint32Array, a: number, b: number, c: number, d: number): void {
  /* eslint-disable @typescript-eslint/no-non-null-assertion -- indices fixes 0..15 */
  x[a] = (x[a]! + x[b]!) | 0; x[d] = rotl(x[d]! ^ x[a]!, 16);
  x[c] = (x[c]! + x[d]!) | 0; x[b] = rotl(x[b]! ^ x[c]!, 12);
  x[a] = (x[a]! + x[b]!) | 0; x[d] = rotl(x[d]! ^ x[a]!, 8);
  x[c] = (x[c]! + x[d]!) | 0; x[b] = rotl(x[b]! ^ x[c]!, 7);
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
}

export function chachaBlock(key: readonly number[], counter: number, nonce: readonly number[]): Uint32Array {
  const input = new Uint32Array([...SIGMA, ...key, counter >>> 0, ...nonce]);
  const x = input.slice();
  for (let i = 0; i < 10; i++) {
    quarter(x, 0, 4, 8, 12); quarter(x, 1, 5, 9, 13); quarter(x, 2, 6, 10, 14); quarter(x, 3, 7, 11, 15);
    quarter(x, 0, 5, 10, 15); quarter(x, 1, 6, 11, 12); quarter(x, 2, 7, 8, 13); quarter(x, 3, 4, 9, 14);
  }
  for (let i = 0; i < 16; i++) x[i] = ((x[i] ?? 0) + (input[i] ?? 0)) >>> 0;
  return x;
}

// Cache du dernier bloc : l'état reste pur, on évite seulement de recalculer 16 fois le même bloc.
let cache: { key: readonly number[]; nonce: readonly number[]; counter: number; block: Uint32Array } | null = null;

function blockFor(state: RngState, counter: number): Uint32Array {
  if (cache && cache.key === state.key && cache.nonce === state.nonce && cache.counter === counter) return cache.block;
  const block = chachaBlock(state.key, counter, state.nonce);
  cache = { key: state.key, nonce: state.nonce, counter, block };
  return block;
}

function hash128(text: string, salt: number): number[] {
  let h1 = 1779033703 ^ salt;
  let h2 = 3144134277 ^ salt;
  let h3 = 1013904242 ^ salt;
  let h4 = 2773480762 ^ salt;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/**
 * Clé de 256 bits depuis la graine. Une graine hexadécimale de 64 caractères (random.org ou
 * crypto) est utilisée telle quelle ; une graine tapée à la main (?seed=abc) est hachée.
 */
export function seedKey(seed: string): number[] {
  const hex = seed.trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(hex)) {
    return Array.from({ length: 8 }, (_, i) => parseInt(hex.slice(i * 8, i * 8 + 8), 16) >>> 0);
  }
  return [...hash128(seed, 0x5eed0001), ...hash128(seed, 0x5eed0002)];
}

export function createRng(seed: string, stream: RngStream): RngState {
  return { key: seedKey(seed), nonce: [RNG_STREAMS.indexOf(stream), STREAM_TAG, 0], pos: 0 };
}

export function createStreams(seed: string): RngStreams {
  const key = seedKey(seed);
  const make = (stream: RngStream): RngState => ({ key, nonce: [RNG_STREAMS.indexOf(stream), STREAM_TAG, 0], pos: 0 });
  return { map: make('map'), combat: make('combat'), loot: make('loot'), minigame: make('minigame') };
}

export function nextUint32(state: RngState): [number, RngState] {
  const block = blockFor(state, Math.floor(state.pos / 16));
  return [block[state.pos % 16] ?? 0, { key: state.key, nonce: state.nonce, pos: state.pos + 1 }];
}

/** Flottant uniforme dans [0, 1), sur 53 bits (deux mots) pour ne pas biaiser les petites probabilités. */
export function nextFloat(state: RngState): [number, RngState] {
  const [hi, s1] = nextUint32(state);
  const [lo, s2] = nextUint32(s1);
  return [((hi >>> 5) * 67108864 + (lo >>> 6)) / 9007199254740992, s2];
}
