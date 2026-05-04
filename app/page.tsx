"use client";

import { useState } from "react";
import ProteinViewer from "@/components/ProteinViewer";

type GeneAnalysis = {
  geneName: string;
  simpleSummary: string;
  normalFunction: string;
  proteinFunction: string;
  associatedDiseases: string[];
  inheritancePattern: string;
  importanceInBiotech: string;
  studentExplanation: string;
  researchQuestions: string[];
  educationalDisclaimer: string;
};

const EXAMPLE_GENES = ["BRCA1", "TP53", "CFTR", "HBB", "APOE", "FMR1"];

type CatalogGene = { symbol: string; note: string };
type CatalogCategory = { category: string; genes: CatalogGene[] };

const GENE_CATALOG: CatalogCategory[] = [
  {
    category: "Cancer & tumor suppressors",
    genes: [
      { symbol: "BRCA1", note: "Breast/ovarian DNA repair" },
      { symbol: "BRCA2", note: "DNA repair & cancer risk" },
      { symbol: "TP53", note: "Guardian of the genome" },
      { symbol: "RB1", note: "Retinoblastoma suppressor" },
      { symbol: "APC", note: "Colon cancer / Wnt path" },
      { symbol: "PTEN", note: "PI3K pathway brake" },
      { symbol: "MYC", note: "Master oncogene" },
      { symbol: "KRAS", note: "RAS oncogene, ~25% of cancers" },
      { symbol: "EGFR", note: "Growth-factor receptor target" },
      { symbol: "VHL", note: "Von Hippel–Lindau" },
    ],
  },
  {
    category: "Brain & nervous system",
    genes: [
      { symbol: "HTT", note: "Huntington's disease" },
      { symbol: "APP", note: "Amyloid precursor / Alzheimer's" },
      { symbol: "APOE", note: "Alzheimer's risk variant" },
      { symbol: "SNCA", note: "α-synuclein / Parkinson's" },
      { symbol: "FMR1", note: "Fragile X syndrome" },
      { symbol: "MECP2", note: "Rett syndrome" },
      { symbol: "SMN1", note: "Spinal muscular atrophy" },
      { symbol: "DMD", note: "Duchenne muscular dystrophy" },
    ],
  },
  {
    category: "Blood & heart",
    genes: [
      { symbol: "HBB", note: "Sickle cell / β-thalassemia" },
      { symbol: "HBA1", note: "α-thalassemia" },
      { symbol: "F8", note: "Hemophilia A" },
      { symbol: "F9", note: "Hemophilia B" },
      { symbol: "LDLR", note: "Familial hypercholesterolemia" },
      { symbol: "PCSK9", note: "Cholesterol drug target" },
      { symbol: "MYH7", note: "Hypertrophic cardiomyopathy" },
      { symbol: "LMNA", note: "Laminopathies" },
    ],
  },
  {
    category: "Metabolism & endocrine",
    genes: [
      { symbol: "INS", note: "Insulin (first protein sequenced)" },
      { symbol: "LEP", note: "Leptin / appetite hormone" },
      { symbol: "PAH", note: "Phenylketonuria (PKU)" },
      { symbol: "G6PD", note: "Favism / hemolytic anemia" },
      { symbol: "HFE", note: "Hereditary hemochromatosis" },
      { symbol: "AR", note: "Androgen receptor" },
    ],
  },
  {
    category: "Lung, skin & connective tissue",
    genes: [
      { symbol: "CFTR", note: "Cystic fibrosis" },
      { symbol: "SERPINA1", note: "α-1 antitrypsin deficiency" },
      { symbol: "FBN1", note: "Marfan syndrome" },
      { symbol: "COL1A1", note: "Osteogenesis imperfecta" },
      { symbol: "TYR", note: "Tyrosinase / albinism" },
      { symbol: "MC1R", note: "Red hair / UV response" },
    ],
  },
  {
    category: "Immune, vision & hearing",
    genes: [
      { symbol: "CCR5", note: "HIV co-receptor" },
      { symbol: "ADA", note: "SCID ('bubble boy' disease)" },
      { symbol: "IL2RG", note: "X-linked SCID" },
      { symbol: "RHO", note: "Rhodopsin / retinitis pigmentosa" },
      { symbol: "GJB2", note: "Connexin 26 / hereditary deafness" },
      { symbol: "USH2A", note: "Usher syndrome" },
    ],
  },
  {
    category: "Development & growth",
    genes: [
      { symbol: "FGFR3", note: "Achondroplasia" },
      { symbol: "NF1", note: "Neurofibromatosis type 1" },
      { symbol: "TSC1", note: "Tuberous sclerosis" },
      { symbol: "SHH", note: "Sonic hedgehog signaling" },
      { symbol: "BMP4", note: "Bone morphogenetic protein" },
    ],
  },
];

const TOTAL_CATALOG_GENES = GENE_CATALOG.reduce(
  (acc, c) => acc + c.genes.length,
  0,
);

export default function HomePage() {
  const [gene, setGene] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneAnalysis | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  async function analyze(target: string) {
    const trimmed = target.trim();
    if (!trimmed) {
      setError("Please enter a gene name.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze-gene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gene: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
      } else {
        setResult(json.data as GeneAnalysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    analyze(gene);
  }

  function handleExampleClick(example: string) {
    setGene(example);
    analyze(example);
  }

  function handleCatalogClick(symbol: string) {
    setBrowseOpen(false);
    setGene(symbol);
    analyze(symbol);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12 md:py-16">
      <header className="flex flex-col items-center text-center">
        <div className="mb-6 flex items-center gap-3">
          <HelixMark />
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-helix-700">
            GeneScope
          </span>
        </div>
        <h1 className="bg-gradient-to-r from-helix-800 via-helix-600 to-bio-teal bg-clip-text pb-2 text-4xl font-bold leading-[1.15] text-transparent md:text-6xl">
          Explore the human genome
          <br className="hidden md:block" /> one gene at a time.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-slate-600 md:text-lg">
          Type a gene symbol and Claude will walk you through what it does,
          which diseases it touches, and why scientists care — written for
          curious students and lifelong learners.
        </p>
      </header>

      <section className="glass-card mx-auto w-full max-w-3xl bg-card-gradient p-6 md:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="gene" className="sr-only">
            Gene symbol
          </label>
          <input
            id="gene"
            value={gene}
            onChange={(e) => setGene(e.target.value.toUpperCase())}
            placeholder="Try BRCA1, TP53, CFTR..."
            spellCheck={false}
            maxLength={32}
            className="flex-1 rounded-xl border border-helix-200 bg-white/80 px-4 py-3 text-lg font-medium tracking-wide text-slate-900 outline-none transition focus:border-helix-500 focus:ring-2 focus:ring-helix-200"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-helix-600 to-bio-teal px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white shadow-glow transition hover:from-helix-700 hover:to-bio-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing…" : "Analyze gene"}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="section-title">Try one</span>
          {EXAMPLE_GENES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleExampleClick(g)}
              disabled={loading}
              className="gene-pill disabled:cursor-not-allowed disabled:opacity-60"
            >
              {g}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-helix-100 pt-4">
          <button
            type="button"
            onClick={() => setBrowseOpen((v) => !v)}
            aria-expanded={browseOpen}
            aria-controls="gene-catalog"
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-helix-700 transition hover:bg-helix-50"
          >
            <span>
              {browseOpen
                ? "Hide gene library"
                : `Browse ${TOTAL_CATALOG_GENES} more genes`}
            </span>
            <span
              className={`text-xs transition-transform ${
                browseOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            >
              ▾
            </span>
          </button>

          {browseOpen && (
            <div
              id="gene-catalog"
              className="mt-3 grid gap-5 sm:grid-cols-2"
            >
              {GENE_CATALOG.map((cat) => (
                <div key={cat.category}>
                  <h4 className="section-title mb-2">{cat.category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {cat.genes.map((g) => (
                      <button
                        key={g.symbol}
                        type="button"
                        onClick={() => handleCatalogClick(g.symbol)}
                        disabled={loading}
                        title={g.note}
                        className="flex flex-col items-start gap-0.5 rounded-lg border border-helix-200 bg-white/70 px-3 py-2 text-left transition hover:border-helix-400 hover:bg-helix-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="font-mono text-sm font-bold tracking-wider text-helix-800">
                          {g.symbol}
                        </span>
                        <span className="line-clamp-1 text-[11px] leading-tight text-slate-500">
                          {g.note}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && !result && <LoadingSkeleton />}

      {result && (
        <>
          <Results data={result} />
          <ProteinViewer geneName={result.geneName} />
        </>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-slate-500">
        Built for learning. Powered by Claude. Not medical advice.
      </footer>
    </main>
  );
}

function HelixMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-helix-500 to-bio-teal shadow-glow">
      <span className="animate-helix text-lg">🧬</span>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="glass-card h-40 animate-pulse bg-white/40"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

function Results({ data }: { data: GeneAnalysis }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="glass-card overflow-hidden bg-bio-gradient p-8 text-white">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-bio-mint">
          <span>Gene profile</span>
        </div>
        <h2 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
          {data.geneName}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-100/90 md:text-lg">
          {data.simpleSummary}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Normal function" accent="from-helix-100 to-helix-50">
          <p>{data.normalFunction}</p>
        </Card>

        <Card title="Protein & molecular role" accent="from-bio-mint/30 to-helix-50">
          <p>{data.proteinFunction}</p>
        </Card>

        <Card title="Associated diseases" accent="from-rose-100 to-helix-50">
          {data.associatedDiseases.length === 0 ? (
            <p className="text-slate-500">None reported.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {data.associatedDiseases.map((d) => (
                <li
                  key={d}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                >
                  {d}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Inheritance pattern" accent="from-violet-100 to-helix-50">
          <p>{data.inheritancePattern}</p>
        </Card>

        <Card
          title="Why it matters in biotech"
          accent="from-bio-mint/40 to-bio-teal/20"
          wide
        >
          <p>{data.importanceInBiotech}</p>
        </Card>

        <Card
          title="Student-friendly explanation"
          accent="from-amber-100 to-helix-50"
          wide
        >
          <p>{data.studentExplanation}</p>
        </Card>
      </div>

      <div className="glass-card bg-white/80 p-6 md:p-8">
        <h3 className="section-title">Research questions to explore</h3>
        <ol className="mt-4 space-y-3">
          {data.researchQuestions.map((q, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-to-br from-helix-500 to-bio-teal text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="text-slate-700">{q}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-relaxed text-amber-900">
        <strong className="font-semibold">Educational note:</strong>{" "}
        {data.educationalDisclaimer}
      </div>
    </section>
  );
}

function Card({
  title,
  children,
  accent,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  accent: string;
  wide?: boolean;
}) {
  return (
    <article
      className={`glass-card relative overflow-hidden p-6 ${wide ? "md:col-span-2" : ""}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-70 ${accent}`}
      />
      <h3 className="section-title">{title}</h3>
      <div className="mt-3 text-[0.95rem] leading-relaxed text-slate-700">
        {children}
      </div>
    </article>
  );
}
