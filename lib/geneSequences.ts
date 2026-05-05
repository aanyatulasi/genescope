// Synthetic DNA generated deterministically per gene symbol — not real human sequence.

export const EDUCATIONAL_SEQUENCE_NOTE =
  "Educational simulation sequence — not the full real gene sequence.";

export type GeneSequence = {
  symbol: string;
  sequence: string;
  isEducational: true;
  note: string;
};

const BASES = ["A", "T", "C", "G"] as const;
const STOP_CODONS = ["TAA", "TAG", "TGA"];

const NON_STOP_CODONS: string[] = (() => {
  const out: string[] = [];
  for (const a of BASES)
    for (const b of BASES)
      for (const c of BASES) {
        const codon = `${a}${b}${c}`;
        if (!STOP_CODONS.includes(codon)) out.push(codon);
      }
  return out;
})();

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

export function generateEducationalSequence(
  symbol: string,
  length = 150,
): string {
  const rand = mulberry32(hashSeed(symbol.toUpperCase()));

  const utr5 = 6;
  const utr3 = 6;
  const codonCount = Math.max(
    1,
    Math.floor((length - utr5 - 3 - 3 - utr3) / 3),
  );

  let seq = "";
  for (let i = 0; i < utr5; i++) seq += pick(rand, BASES);
  seq += "ATG";
  for (let i = 0; i < codonCount; i++) seq += pick(rand, NON_STOP_CODONS);
  seq += pick(rand, STOP_CODONS);
  for (let i = 0; i < utr3; i++) seq += pick(rand, BASES);

  return seq;
}

const SEQUENCE_OVERRIDES: Record<string, string> = {};

export function getGeneSequence(symbol: string): GeneSequence {
  const upper = symbol.trim().toUpperCase();
  const sequence =
    SEQUENCE_OVERRIDES[upper] ?? generateEducationalSequence(upper);
  return {
    symbol: upper,
    sequence,
    isEducational: true,
    note: EDUCATIONAL_SEQUENCE_NOTE,
  };
}
