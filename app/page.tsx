"use client";

import { useState } from "react";

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

export default function HomePage() {
  const [gene, setGene] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneAnalysis | null>(null);

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12 md:py-16">
      <header className="flex flex-col items-center text-center">
        <div className="mb-6 flex items-center gap-3">
          <HelixMark />
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-helix-700">
            GeneScope
          </span>
        </div>
        <h1 className="bg-gradient-to-r from-helix-800 via-helix-600 to-bio-teal bg-clip-text text-4xl font-bold leading-tight text-transparent md:text-6xl">
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
      </section>

      {error && (
        <div className="mx-auto w-full max-w-3xl rounded-xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && !result && <LoadingSkeleton />}

      {result && <Results data={result} />}

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
