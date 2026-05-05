export type PamSite = {
  pamIndex: number;
  pam: string;
  target: string;
  targetStart: number;
  cutIndex: number;
};

export type EditType = "knockout" | "insertion" | "substitution";

export type CrisprEdit =
  | { type: "knockout"; deleteCount: number }
  | { type: "insertion"; insert: string }
  | { type: "substitution"; deleteCount: number; insert: string };

export type EditResult = {
  edited: string;
  inserted: string;
  deleted: string;
  type: EditType;
  position: number;
};

export type ProteinComparison = {
  identical: boolean;
  lengthOriginal: number;
  lengthEdited: number;
  lengthChanged: boolean;
  changedAminoAcids: { position: number; from: string; to: string }[];
  prematureStop: boolean;
};

export type ImpactCategory =
  | "frameshift"
  | "premature-stop"
  | "in-frame-indel"
  | "missense"
  | "silent";

export type ImpactExplanation = {
  category: ImpactCategory;
  headline: string;
  studentExplanation: string;
  frameshift: boolean;
  prematureStop: boolean;
  netLengthChange: number;
};

export type DnaValidation =
  | { ok: true; sequence: string }
  | { ok: false; error: string };

const CODON_TABLE: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G",
};

export function validateDna(input: string): DnaValidation {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Please enter a DNA sequence." };
  const upper = trimmed.toUpperCase();
  if (!/^[ATCG]+$/.test(upper)) {
    return {
      ok: false,
      error: "DNA can only contain the letters A, T, C, or G.",
    };
  }
  return { ok: true, sequence: upper };
}

export function getCutSite(pamIndex: number): number {
  return pamIndex - 3;
}

export function findPamSites(
  sequence: string,
  protospacerLength = 20,
): PamSite[] {
  const seq = sequence.toUpperCase();
  const sites: PamSite[] = [];
  for (let i = 0; i + 3 <= seq.length; i++) {
    if (seq[i + 1] === "G" && seq[i + 2] === "G") {
      const cutIndex = i - 3;
      if (cutIndex < 0) continue;
      const targetStart = Math.max(0, i - protospacerLength);
      sites.push({
        pamIndex: i,
        pam: seq.slice(i, i + 3),
        target: seq.slice(targetStart, i),
        targetStart,
        cutIndex,
      });
    }
  }
  return sites;
}

export function applyCrisprEdit(
  sequence: string,
  cutIndex: number,
  edit: CrisprEdit,
): EditResult {
  const seq = sequence.toUpperCase();
  const left = seq.slice(0, cutIndex);
  switch (edit.type) {
    case "knockout": {
      const deleted = seq.slice(cutIndex, cutIndex + edit.deleteCount);
      return {
        edited: left + seq.slice(cutIndex + edit.deleteCount),
        inserted: "",
        deleted,
        type: "knockout",
        position: cutIndex,
      };
    }
    case "insertion": {
      return {
        edited: left + edit.insert + seq.slice(cutIndex),
        inserted: edit.insert,
        deleted: "",
        type: "insertion",
        position: cutIndex,
      };
    }
    case "substitution": {
      const deleted = seq.slice(cutIndex, cutIndex + edit.deleteCount);
      return {
        edited: left + edit.insert + seq.slice(cutIndex + edit.deleteCount),
        inserted: edit.insert,
        deleted,
        type: "substitution",
        position: cutIndex,
      };
    }
  }
}

export function transcribeDnaToMrna(dna: string): string {
  return dna.toUpperCase().replace(/T/g, "U");
}

export function translateMrnaToProtein(mrna: string): string {
  const seq = mrna.toUpperCase().replace(/U/g, "T");
  const startIdx = seq.indexOf("ATG");
  if (startIdx < 0) return "";
  let protein = "";
  for (let i = startIdx; i + 3 <= seq.length; i += 3) {
    const aa = CODON_TABLE[seq.slice(i, i + 3)];
    if (!aa) break;
    protein += aa;
    if (aa === "*") break;
  }
  return protein;
}

export function compareProteins(
  original: string,
  edited: string,
): ProteinComparison {
  const stripStop = (p: string) => (p.endsWith("*") ? p.slice(0, -1) : p);
  const o = stripStop(original);
  const e = stripStop(edited);

  const changed: { position: number; from: string; to: string }[] = [];
  const minLen = Math.min(o.length, e.length);
  for (let i = 0; i < minLen; i++) {
    if (o[i] !== e[i]) changed.push({ position: i, from: o[i], to: e[i] });
  }

  const origStop = original.indexOf("*");
  const editStop = edited.indexOf("*");
  const prematureStop =
    editStop >= 0 && (origStop < 0 || editStop < origStop);

  return {
    identical: original === edited,
    lengthOriginal: o.length,
    lengthEdited: e.length,
    lengthChanged: o.length !== e.length,
    changedAminoAcids: changed,
    prematureStop,
  };
}

export function explainProteinImpact(
  edit: EditResult,
  comparison: ProteinComparison,
): ImpactExplanation {
  const netLengthChange = edit.inserted.length - edit.deleted.length;
  const frameshift = netLengthChange !== 0 && netLengthChange % 3 !== 0;
  const pos = edit.position;

  if (frameshift) {
    const sign = netLengthChange > 0 ? `+${netLengthChange}` : `${netLengthChange}`;
    return {
      category: "frameshift",
      headline: "Frameshift mutation",
      studentExplanation: `CRISPR acted like molecular scissors at position ${pos}. Because this edit changed the DNA length by ${sign} bases — not a multiple of 3 — the reading frame shifted. From this point onward the cell may read the gene incorrectly, often producing a broken or shortened protein.`,
      frameshift: true,
      prematureStop: comparison.prematureStop,
      netLengthChange,
    };
  }

  if (comparison.prematureStop) {
    return {
      category: "premature-stop",
      headline: "Premature stop codon",
      studentExplanation: `CRISPR introduced a change at position ${pos} that creates a stop signal earlier than normal. The protein is truncated at amino acid ${comparison.lengthEdited}, well before its usual length of ${comparison.lengthOriginal}, and likely cannot do its full job.`,
      frameshift: false,
      prematureStop: true,
      netLengthChange,
    };
  }

  if (comparison.identical) {
    return {
      category: "silent",
      headline: "Silent change — no protein effect",
      studentExplanation: `The DNA changed at position ${pos}, but because of how the genetic code works (multiple codons can code for the same amino acid), the protein came out exactly the same. This is called a silent mutation.`,
      frameshift: false,
      prematureStop: false,
      netLengthChange,
    };
  }

  if (netLengthChange === 0 && comparison.changedAminoAcids.length > 0) {
    const n = comparison.changedAminoAcids.length;
    return {
      category: "missense",
      headline: n === 1 ? "Single amino acid swap" : `${n} amino acid swaps`,
      studentExplanation: `CRISPR changed the DNA at position ${pos}. The protein is the same length, but ${n} amino acid${n > 1 ? "s were" : " was"} swapped. Whether this matters depends on which amino acids changed and where they sit in the protein's structure.`,
      frameshift: false,
      prematureStop: false,
      netLengthChange,
    };
  }

  const codonsChanged = Math.abs(netLengthChange) / 3;
  return {
    category: "in-frame-indel",
    headline:
      netLengthChange > 0 ? "In-frame insertion" : "In-frame deletion",
    studentExplanation: `CRISPR ${netLengthChange > 0 ? "added" : "removed"} ${codonsChanged} amino acid${codonsChanged > 1 ? "s" : ""} at position ${pos}. The reading frame stayed intact, so the rest of the protein after this region is read normally — but the protein's shape may still change near the edit.`,
    frameshift: false,
    prematureStop: false,
    netLengthChange,
  };
}
