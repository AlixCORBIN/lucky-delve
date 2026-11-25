// RNG seedé sfc32 : rapide, état sérialisable (4 entiers), bonne qualité statistique.
// Chaque flux (map, combat, loot, minigame) a son propre état dérivé de la seed,
// pour qu'un tirage de combat en plus ne décale pas la génération de la carte.

export const RNG_STREAMS = ['map', 'combat', 'loot', 'minigame'] as const;
export type RngStream = (typeof RNG_STREAMS)[number];

export type RngState = readonly [number, number, number, number];
export type RngStreams = Readonly<Record<RngStream, RngState>>;

function hashString(text: string): RngState {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
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

export function createRng(seed: string, stream: RngStream): RngState {
  let state = hashString(`${seed}:${stream}`);
  // Quelques tours à vide : les premiers tirages de sfc32 sont corrélés à la seed.
  for (let i = 0; i < 12; i++) state = nextUint32(state)[1];
  return state;
}

export function createStreams(seed: string): RngStreams {
  return {
    map: createRng(seed, 'map'),
    combat: createRng(seed, 'combat'),
    loot: createRng(seed, 'loot'),
    minigame: createRng(seed, 'minigame'),
  };
}

export function nextUint32(state: RngState): [number, RngState] {
  let [a, b, c, d] = state;
  a >>>= 0;
  b >>>= 0;
  c >>>= 0;
  d >>>= 0;
  let t = (a + b) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  d = (d + 1) | 0;
  t = (t + d) | 0;
  c = (c + t) | 0;
  return [t >>> 0, [a >>> 0, b >>> 0, c >>> 0, d >>> 0]];
}

/** Flottant uniforme dans [0, 1). */
export function nextFloat(state: RngState): [number, RngState] {
  const [n, next] = nextUint32(state);
  return [n / 4294967296, next];
}
