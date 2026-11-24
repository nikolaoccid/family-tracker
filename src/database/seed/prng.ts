/** Small deterministic generator (mulberry32) so the demo data is the same on every run. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let hash = 2166136261;
  for (const ch of text) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Stable UUID-shaped id from a name, so re-running the seed addresses the same rows. */
export function stableUuid(name: string): string {
  const random = createRandom(seedFrom(name));
  const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = '89ab'[Math.floor(random() * 4)];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
