export type Rng = () => number;

// mulberry32 — tiny public-domain PRNG by bryc
// (https://github.com/bryc/code/blob/master/jshash/PRNGs.md).
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// xmur3 string hash → uint32 (decorrelates consecutive dates before mulberry32).
export const dateToSeed = (isoDate: string): number => {
  let h = 1779033703 ^ isoDate.length;
  for (let i = 0; i < isoDate.length; i++) {
    h = Math.imul(h ^ isoDate.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
};

// Current UTC date as YYYY-MM-DD (everyone gets the same daily board).
export const todayIso = (): string => new Date().toISOString().slice(0, 10);
