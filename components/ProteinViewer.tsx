"use client";

import { useEffect, useRef, useState } from "react";

// Curated PDB structures for the GeneScope catalog. Where the gene's own
// human structure isn't well represented in the PDB, the entry is omitted
// and the viewer falls back to the "structure not yet available" card.
const geneToPdb: Record<string, string> = {
  // Cancer & tumor suppressors
  BRCA1: "1JM7", // BRCT/BARD1 RING heterodimer
  BRCA2: "1MIU", // BRC repeat bound to RAD51
  TP53: "1TUP", // DNA-binding domain on DNA
  RB1: "1AD6", // pocket domain
  APC: "3NMW", // armadillo repeat domain
  PTEN: "1D5R", // phosphatase + C2 domains
  MYC: "1NKP", // Myc-Max bHLH on DNA
  KRAS: "4OBE", // GTP-bound K-Ras
  EGFR: "2ITX", // kinase domain with inhibitor
  VHL: "1LM8", // pVHL/Elongin B/C complex

  // Brain & nervous system
  HTT: "6X9O", // huntingtin–HAP40 cryo-EM
  APP: "1OWT", // amyloid precursor E2 domain
  APOE: "1GS9", // APOE3 N-terminal domain
  SNCA: "1XQ8", // micelle-bound α-synuclein
  FMR1: "2QND", // FMRP KH1-KH2 domains
  MECP2: "3C2I", // MBD bound to methylated DNA
  SMN1: "4GLI", // SMN Tudor domain
  DMD: "1EG3", // dystrophin spectrin repeats

  // Blood & heart
  HBB: "1A3N", // full hemoglobin tetramer (β-chain)
  HBA1: "1A3N", // same tetramer (α-chain)
  F8: "2R7E", // Factor VIII
  F9: "2WPL", // Factor IX
  LDLR: "1N7D", // LDL receptor extracellular domain
  PCSK9: "2P4E", // PCSK9
  MYH7: "4DB1", // β-cardiac myosin motor domain
  LMNA: "1IFR", // lamin A/C Ig-fold tail

  // Metabolism & endocrine
  INS: "4INS", // insulin (historic)
  LEP: "1AX8", // leptin
  PAH: "1PAH", // phenylalanine hydroxylase
  G6PD: "1QKI", // glucose-6-phosphate dehydrogenase
  HFE: "1A6Z", // HFE/β2-microglobulin
  AR: "1E3G", // androgen receptor LBD

  // Lung, skin & connective tissue
  CFTR: "5UAK", // full CFTR cryo-EM
  SERPINA1: "1QLP", // α-1 antitrypsin
  FBN1: "1APJ", // fibrillin-1 cbEGF pair
  COL1A1: "1BKV", // collagen triple-helix peptide mimic
  // TYR  — no high-quality human tyrosinase structure (falls back)
  // MC1R — no published human MC1R structure yet (falls back)

  // Immune, vision & hearing
  CCR5: "4MBS", // CCR5 with maraviroc
  ADA: "1ADD", // adenosine deaminase
  IL2RG: "2B5I", // IL-2 receptor γ-chain ectodomain
  RHO: "1F88", // bovine rhodopsin (first GPCR)
  GJB2: "2ZW3", // connexin-26 hemichannel
  // USH2A — usherin is huge and largely without a full PDB (falls back)

  // Development & growth
  FGFR3: "1RY7", // FGFR3 kinase domain
  NF1: "6V6F", // neurofibromin dimer cryo-EM
  TSC1: "7DL2", // TSC complex
  SHH: "1VHH", // sonic hedgehog N-terminal domain
  BMP4: "6BDA", // BMP4 with type I receptor
};

type Status = "idle" | "loading" | "ready" | "error";

export default function ProteinViewer({ geneName }: { geneName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const upper = geneName.trim().toUpperCase();
  const pdbId = geneToPdb[upper];

  useEffect(() => {
    if (!pdbId) return;
    const target = containerRef.current;
    if (!target) return;

    let cancelled = false;
    let viewer: {
      removeAllModels?: () => void;
      clear?: () => void;
    } | null = null;

    setStatus("loading");
    setErrorMsg(null);

    (async () => {
      try {
        await import("3dmol");
        if (cancelled) return;

        const $3Dmol = (window as unknown as { $3Dmol?: Mol3DGlobal }).$3Dmol;
        if (!$3Dmol) throw new Error("3Dmol failed to attach to window.");

        target.innerHTML = "";
        viewer = $3Dmol.createViewer(target, {
          backgroundColor: "white",
          antialias: true,
        });

        $3Dmol.download(`pdb:${pdbId}`, viewer, { multimodel: false }, () => {
          if (cancelled || !viewer) return;
          const v = viewer as unknown as Mol3DViewer;
          v.setStyle({}, { cartoon: { color: "spectrum" } });
          v.zoomTo();
          v.render();
          setStatus("ready");
        });
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Failed to load viewer.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewer?.removeAllModels?.();
        viewer?.clear?.();
      } catch {
        /* ignore */
      }
      if (target) target.innerHTML = "";
    };
  }, [pdbId]);

  if (!pdbId) {
    return (
      <section className="glass-card overflow-hidden bg-card-gradient p-6 md:p-8">
        <header className="mb-3">
          <span className="section-title">Interactive 3D model</span>
          <h3 className="mt-1 bg-gradient-to-r from-helix-700 to-bio-teal bg-clip-text pb-1 text-2xl font-bold leading-[1.15] text-transparent md:text-3xl">
            Protein Structure Explorer
          </h3>
        </header>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-helix-200 bg-white/60 px-6 py-12 text-center">
          <span className="animate-helix text-4xl">🧬</span>
          <p className="text-base font-semibold text-slate-700">
            3D structure not yet available for this gene.
          </p>
          <p className="max-w-md text-sm text-slate-500">
            We haven&apos;t mapped a curated PDB entry to{" "}
            <span className="font-mono font-semibold">{upper}</span> yet. Try
            BRCA1, TP53, CFTR, HBB, or APOE for an interactive view.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card overflow-hidden bg-card-gradient p-6 md:p-8">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="section-title">Interactive 3D model</span>
          <h3 className="mt-1 bg-gradient-to-r from-helix-700 to-bio-teal bg-clip-text pb-1 text-2xl font-bold leading-[1.15] text-transparent md:text-3xl">
            Protein Structure Explorer
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-helix-200 bg-helix-50 px-3 py-1 font-semibold text-helix-800">
            Protein ID:{" "}
            <span className="font-mono tracking-wider">{pdbId}</span>
          </span>
          <a
            href={`https://www.rcsb.org/structure/${pdbId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-bio-teal/40 bg-bio-mint/30 px-3 py-1 font-semibold text-helix-800 transition hover:bg-bio-mint/50"
          >
            Source: RCSB PDB ↗
          </a>
        </div>
      </header>

      <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-white/70 bg-gradient-to-br from-slate-50 to-helix-50 shadow-inner md:h-[500px]">
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ position: "relative" }}
        />
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <span className="inline-block h-3 w-3 animate-helix rounded-full bg-bio-teal" />
              Loading structure {pdbId}…
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-50/90 px-6 text-center text-sm text-rose-700">
            Couldn&apos;t render the structure: {errorMsg}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Drag to rotate · scroll to zoom · right-click drag to pan
      </p>
    </section>
  );
}

type Mol3DViewer = {
  setStyle: (sel: object, style: object) => void;
  zoomTo: () => void;
  render: () => void;
  removeAllModels?: () => void;
  clear?: () => void;
};

type Mol3DGlobal = {
  createViewer: (el: HTMLElement, config: object) => Mol3DViewer;
  download: (
    src: string,
    viewer: object,
    options: object,
    callback: () => void,
  ) => void;
};
