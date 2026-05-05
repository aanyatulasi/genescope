"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyCrisprEdit,
  compareProteins,
  explainProteinImpact,
  findPamSites,
  transcribeDnaToMrna,
  translateMrnaToProtein,
  validateDna,
  type EditType,
  type EditResult,
  type ImpactExplanation,
  type PamSite,
  type ProteinComparison,
} from "@/lib/crispr";
import { getGeneSequence } from "@/lib/geneSequences";

type SimulationOutput = {
  edit: EditResult;
  comparison: ProteinComparison;
  impact: ImpactExplanation;
  originalProtein: string;
  editedProtein: string;
  originalMrna: string;
  editedMrna: string;
};

const BASE_COLOR: Record<string, string> = {
  A: "text-emerald-600",
  T: "text-rose-600",
  C: "text-sky-600",
  G: "text-amber-600",
  U: "text-rose-600",
};

const CHUNK_SIZE = 10;
const LINE_LENGTH = 60;

export default function CrisprSimulator({ geneName }: { geneName: string }) {
  const { sequence, note } = useMemo(
    () => getGeneSequence(geneName),
    [geneName],
  );
  const pamSites = useMemo(() => findPamSites(sequence), [sequence]);

  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [selectedSiteIdx, setSelectedSiteIdx] = useState<number | null>(0);
  const [manualTarget, setManualTarget] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSite, setManualSite] = useState<PamSite | null>(null);

  const [editType, setEditType] = useState<EditType>("knockout");
  const [knockoutSize, setKnockoutSize] = useState(2);
  const [insertPayload, setInsertPayload] = useState("ATG");
  const [substitutePayload, setSubstitutePayload] = useState("GGG");
  const [substituteDeleteCount, setSubstituteDeleteCount] = useState(2);
  const [editError, setEditError] = useState<string | null>(null);
  const [output, setOutput] = useState<SimulationOutput | null>(null);

  useEffect(() => {
    setSelectedSiteIdx(pamSites.length > 0 ? 0 : null);
    setManualTarget("");
    setManualSite(null);
    setManualError(null);
    setOutput(null);
    setEditError(null);
  }, [geneName, pamSites.length]);

  const activeSite: PamSite | null =
    mode === "auto"
      ? selectedSiteIdx !== null && selectedSiteIdx < pamSites.length
        ? pamSites[selectedSiteIdx]
        : null
      : manualSite;

  function handleManualSubmit() {
    setOutput(null);
    const v = validateDna(manualTarget);
    if (!v.ok) {
      setManualError(v.error);
      setManualSite(null);
      return;
    }
    if (v.sequence.length < 3) {
      setManualError("Target must be at least 3 bases.");
      setManualSite(null);
      return;
    }
    const idx = sequence.indexOf(v.sequence);
    if (idx < 0) {
      setManualError(
        `Target "${v.sequence}" not found in this gene's educational sequence.`,
      );
      setManualSite(null);
      return;
    }
    const targetEnd = idx + v.sequence.length;
    const pam = sequence.slice(targetEnd, targetEnd + 3);
    if (pam.length < 3) {
      setManualError(
        "Your target is too close to the end of the sequence — no room for a PAM.",
      );
      setManualSite(null);
      return;
    }
    if (!/^.GG$/.test(pam)) {
      setManualError(
        `Found your target, but the next 3 bases are "${pam}" — not a valid NGG PAM, so Cas9 wouldn't bind here.`,
      );
      setManualSite(null);
      return;
    }
    const cutIndex = targetEnd - 3;
    if (cutIndex < 0) {
      setManualError("Cut site falls outside the sequence.");
      setManualSite(null);
      return;
    }
    setManualError(null);
    setManualSite({
      pamIndex: targetEnd,
      pam,
      target: v.sequence,
      targetStart: idx,
      cutIndex,
    });
    setOutput(null);
  }

  function handleSimulate() {
    setOutput(null);
    if (!activeSite) {
      setEditError("Choose a target site first.");
      return;
    }
    const cut = activeSite.cutIndex;
    let edit;
    if (editType === "knockout") {
      if (knockoutSize < 1) {
        setEditError("Knockout size must be at least 1 base.");
        return;
      }
      edit = { type: "knockout" as const, deleteCount: knockoutSize };
    } else if (editType === "insertion") {
      const v = validateDna(insertPayload);
      if (!v.ok) {
        setEditError(v.error);
        return;
      }
      edit = { type: "insertion" as const, insert: v.sequence };
    } else {
      const v = validateDna(substitutePayload);
      if (!v.ok) {
        setEditError(v.error);
        return;
      }
      if (substituteDeleteCount < 1) {
        setEditError("Replace count must be at least 1.");
        return;
      }
      edit = {
        type: "substitution" as const,
        deleteCount: substituteDeleteCount,
        insert: v.sequence,
      };
    }
    setEditError(null);
    const editResult = applyCrisprEdit(sequence, cut, edit);
    const originalMrna = transcribeDnaToMrna(sequence);
    const editedMrna = transcribeDnaToMrna(editResult.edited);
    const originalProtein = translateMrnaToProtein(originalMrna);
    const editedProtein = translateMrnaToProtein(editedMrna);
    const comparison = compareProteins(originalProtein, editedProtein);
    const impact = explainProteinImpact(editResult, comparison);
    setOutput({
      edit: editResult,
      comparison,
      impact,
      originalMrna,
      editedMrna,
      originalProtein,
      editedProtein,
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="glass-card overflow-hidden bg-bio-gradient p-8 text-white">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-bio-mint">
          <span>CRISPR simulation</span>
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Editing {geneName}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-100/90 md:text-base">
          Find a PAM site, design a guide, simulate a knockout, insertion, or
          substitution, and watch how the protein changes.
        </p>
        <p className="mt-2 text-xs text-bio-mint/90">{note}</p>
      </div>

      <StepCard
        step="Step 1"
        title="Choose target"
        body="Pick where Cas9 will cut. Auto-detect scans the sequence for NGG PAM sites; manual mode lets you paste your own target sequence."
      >
        <DnaDisplay sequence={sequence} activeSite={activeSite} />

        <div className="mt-5 flex flex-wrap gap-2">
          <ModeButton
            active={mode === "auto"}
            onClick={() => setMode("auto")}
            label="Auto-detect PAM sites"
          />
          <ModeButton
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            label="Manual target"
          />
        </div>

        {mode === "auto" && (
          <AutoTargetList
            sites={pamSites}
            selectedIdx={selectedSiteIdx}
            onSelect={(i) => {
              setSelectedSiteIdx(i);
              setOutput(null);
            }}
          />
        )}

        {mode === "manual" && (
          <ManualTargetForm
            value={manualTarget}
            onChange={(v) => {
              setManualTarget(v.toUpperCase());
              setManualError(null);
            }}
            onSubmit={handleManualSubmit}
            error={manualError}
            site={manualSite}
          />
        )}
      </StepCard>

      <StepCard
        step="Step 2"
        title="Simulate edit"
        body="Choose what Cas9 does at the cut. Knockouts delete bases, insertions add new DNA, and substitutions swap a stretch for something else."
      >
        {!activeSite ? (
          <p className="rounded-xl border border-helix-200 bg-white/60 px-4 py-3 text-sm text-slate-600">
            Select a target in Step 1 to enable editing.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <EditTypeButton
                active={editType === "knockout"}
                onClick={() => setEditType("knockout")}
                title="Knockout"
                desc="Delete bases around the cut"
              />
              <EditTypeButton
                active={editType === "insertion"}
                onClick={() => setEditType("insertion")}
                title="Insertion"
                desc="Insert new DNA at the cut"
              />
              <EditTypeButton
                active={editType === "substitution"}
                onClick={() => setEditType("substitution")}
                title="Substitution"
                desc="Replace bases with new DNA"
              />
            </div>

            <div className="mt-4 rounded-xl border border-helix-100 bg-white/70 p-4">
              {editType === "knockout" && (
                <NumberInput
                  label="Bases to delete"
                  value={knockoutSize}
                  onChange={setKnockoutSize}
                  min={1}
                  max={20}
                />
              )}
              {editType === "insertion" && (
                <DnaInput
                  label="DNA to insert"
                  value={insertPayload}
                  onChange={setInsertPayload}
                  placeholder="e.g. ATG"
                />
              )}
              {editType === "substitution" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberInput
                    label="Bases to replace"
                    value={substituteDeleteCount}
                    onChange={setSubstituteDeleteCount}
                    min={1}
                    max={20}
                  />
                  <DnaInput
                    label="Replace with"
                    value={substitutePayload}
                    onChange={setSubstitutePayload}
                    placeholder="e.g. GGG"
                  />
                </div>
              )}
            </div>

            {editError && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                {editError}
              </p>
            )}

            <button
              type="button"
              onClick={handleSimulate}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-helix-600 to-bio-teal px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-glow transition hover:from-helix-700 hover:to-bio-teal"
            >
              Simulate edit
            </button>
          </>
        )}
      </StepCard>

      <StepCard
        step="Step 3"
        title="See protein impact"
        body="Watch how the DNA edit ripples through transcription and translation to reshape the protein."
      >
        {!output ? (
          <p className="rounded-xl border border-helix-200 bg-white/60 px-4 py-3 text-sm text-slate-600">
            Run a simulation in Step 2 to see the protein impact here.
          </p>
        ) : (
          <ImpactPanel output={output} />
        )}
      </StepCard>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-relaxed text-amber-900">
        <strong className="font-semibold">Educational simulation only.</strong>{" "}
        This does not perform real genetic analysis and should not be used for
        medical decisions.
      </div>
    </section>
  );
}

function StepCard({
  step,
  title,
  body,
  children,
}: {
  step: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card overflow-hidden bg-card-gradient p-6 md:p-8">
      <div className="flex items-baseline gap-3">
        <span className="rounded-full bg-helix-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-helix-700">
          {step}
        </span>
        <h3 className="bg-gradient-to-r from-helix-700 to-bio-teal bg-clip-text text-2xl font-bold leading-tight text-transparent md:text-3xl">
          {title}
        </h3>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
        {body}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
        active
          ? "bg-gradient-to-r from-helix-600 to-bio-teal text-white shadow-glow"
          : "border border-helix-200 bg-white/70 text-helix-800 hover:bg-helix-50"
      }`}
    >
      {label}
    </button>
  );
}

function EditTypeButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
        active
          ? "border-bio-teal bg-bio-mint/30 shadow-sm"
          : "border-helix-200 bg-white/70 hover:bg-helix-50"
      }`}
    >
      <span className="text-sm font-bold text-helix-800">{title}</span>
      <span className="text-xs leading-snug text-slate-600">{desc}</span>
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-helix-200 bg-white px-3 py-2 text-base outline-none transition focus:border-helix-500 focus:ring-2 focus:ring-helix-200"
      />
    </label>
  );
}

function DnaInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={placeholder}
        spellCheck={false}
        className="rounded-lg border border-helix-200 bg-white px-3 py-2 font-mono text-base tracking-wider outline-none transition focus:border-helix-500 focus:ring-2 focus:ring-helix-200"
      />
    </label>
  );
}

function AutoTargetList({
  sites,
  selectedIdx,
  onSelect,
}: {
  sites: PamSite[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}) {
  if (sites.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
        No NGG PAM sites found in this educational sequence.
      </p>
    );
  }
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {sites.length} candidate site{sites.length === 1 ? "" : "s"}
      </p>
      <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {sites.map((s, i) => {
          const active = i === selectedIdx;
          return (
            <button
              key={`${s.pamIndex}-${i}`}
              type="button"
              onClick={() => onSelect(i)}
              className={`rounded-lg border p-3 text-left text-xs transition ${
                active
                  ? "border-bio-teal bg-bio-mint/30 shadow-sm"
                  : "border-helix-200 bg-white/70 hover:bg-helix-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-helix-800">
                  PAM @ {s.pamIndex}
                </span>
                <span className="text-[10px] text-slate-500">
                  cut @ {s.cutIndex}
                </span>
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-700">
                <BaseString s={s.target} />
                <span className="rounded bg-bio-mint/40 px-0.5">
                  <BaseString s={s.pam} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ManualTargetForm({
  value,
  onChange,
  onSubmit,
  error,
  site,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string | null;
  site: PamSite | null;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        <span>Target DNA sequence (the protospacer just upstream of the PAM)</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. paste a stretch of A/T/C/G"
            spellCheck={false}
            className="flex-1 rounded-lg border border-helix-200 bg-white px-3 py-2 font-mono text-base tracking-wider outline-none transition focus:border-helix-500 focus:ring-2 focus:ring-helix-200"
          />
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-lg bg-gradient-to-r from-helix-600 to-bio-teal px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-glow transition hover:from-helix-700 hover:to-bio-teal"
          >
            Find target
          </button>
        </div>
      </label>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      {site && (
        <div className="rounded-xl border border-helix-200 bg-white/70 px-4 py-3 text-sm">
          <p className="text-slate-700">
            Found target at index{" "}
            <span className="font-mono font-semibold">{site.targetStart}</span>{" "}
            with PAM{" "}
            <span className="rounded bg-bio-mint/40 px-1 font-mono">
              {site.pam}
            </span>{" "}
            at <span className="font-mono">{site.pamIndex}</span>. Cut site:{" "}
            <span className="font-mono font-semibold">{site.cutIndex}</span>.
          </p>
        </div>
      )}
    </div>
  );
}

function DnaDisplay({
  sequence,
  activeSite,
}: {
  sequence: string;
  activeSite: PamSite | null;
}) {
  const lines: string[] = [];
  for (let i = 0; i < sequence.length; i += LINE_LENGTH) {
    lines.push(sequence.slice(i, i + LINE_LENGTH));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-helix-100 bg-white/80 p-4">
      <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Legend />
      </div>
      <div className="font-mono text-sm leading-7">
        {lines.map((line, lineIdx) => {
          const lineStart = lineIdx * LINE_LENGTH;
          return (
            <div key={lineIdx} className="flex items-baseline gap-3">
              <span className="w-10 select-none text-right text-[11px] text-slate-400">
                {lineStart}
              </span>
              <span className="whitespace-nowrap">
                {line.split("").map((base, j) => {
                  const absIdx = lineStart + j;
                  const isCut =
                    activeSite !== null && absIdx === activeSite.cutIndex;
                  const inTarget =
                    activeSite !== null &&
                    absIdx >= activeSite.targetStart &&
                    absIdx < activeSite.pamIndex;
                  const inPam =
                    activeSite !== null &&
                    absIdx >= activeSite.pamIndex &&
                    absIdx < activeSite.pamIndex + 3;
                  const cls = inPam
                    ? "bg-bio-mint/50 rounded"
                    : inTarget
                      ? "bg-helix-100 rounded"
                      : "";
                  return (
                    <span key={j} className="relative">
                      {isCut && (
                        <span
                          aria-hidden
                          className="absolute -left-[2px] top-0 h-full w-[2px] bg-rose-500"
                        />
                      )}
                      {j > 0 && j % CHUNK_SIZE === 0 && (
                        <span className="inline-block w-1" />
                      )}
                      <span className={`${BASE_COLOR[base] ?? ""} ${cls}`}>
                        {base}
                      </span>
                    </span>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium normal-case tracking-normal text-slate-500">
      <span>
        <span className="text-emerald-600">A</span>{" "}
        <span className="text-rose-600">T</span>{" "}
        <span className="text-sky-600">C</span>{" "}
        <span className="text-amber-600">G</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-helix-100" /> target
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded bg-bio-mint/50" /> PAM
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-[2px] bg-rose-500" /> cut site
      </span>
    </div>
  );
}

function BaseString({ s }: { s: string }) {
  return (
    <>
      {s.split("").map((b, i) => (
        <span key={i} className={BASE_COLOR[b] ?? ""}>
          {b}
        </span>
      ))}
    </>
  );
}

function ImpactPanel({ output }: { output: SimulationOutput }) {
  const { edit, comparison, impact, originalProtein, editedProtein } = output;

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`rounded-xl border p-5 ${categoryStyle(impact.category)}`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
          {impact.category.replace("-", " ")}
        </p>
        <h4 className="mt-1 text-xl font-bold">{impact.headline}</h4>
        <p className="mt-2 text-sm leading-relaxed">
          {impact.studentExplanation}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Edit type" value={edit.type} />
        <Stat label="Edit position" value={`${edit.position}`} />
        <Stat
          label="Net Δ length"
          value={
            impact.netLengthChange >= 0
              ? `+${impact.netLengthChange} bp`
              : `${impact.netLengthChange} bp`
          }
        />
        <Stat
          label="Bases deleted"
          value={edit.deleted || "—"}
          mono
        />
        <Stat
          label="Bases inserted"
          value={edit.inserted || "—"}
          mono
        />
        <Stat
          label="Frameshift / early stop"
          value={
            impact.frameshift
              ? "Frameshift"
              : impact.prematureStop
                ? "Premature stop"
                : "Neither"
          }
        />
      </div>

      <DiffBlock title="DNA before / after">
        <SequenceCompare
          sequence={originalSequenceFromOutput(output)}
          edited={edit.edited}
          editPosition={edit.position}
          deletedLen={edit.deleted.length}
          insertedLen={edit.inserted.length}
        />
      </DiffBlock>

      <DiffBlock title="Protein before / after">
        <ProteinCompare
          original={originalProtein}
          edited={editedProtein}
          comparison={comparison}
        />
      </DiffBlock>
    </div>
  );
}

function originalSequenceFromOutput(output: SimulationOutput): string {
  const left = output.edit.edited.slice(0, output.edit.position);
  const right = output.edit.edited.slice(
    output.edit.position + output.edit.inserted.length,
  );
  return left + output.edit.deleted + right;
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-helix-100 bg-white/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold text-slate-800 ${mono ? "font-mono break-all" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function DiffBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-helix-100 bg-white/70 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function SequenceCompare({
  sequence,
  edited,
  editPosition,
  deletedLen,
  insertedLen,
}: {
  sequence: string;
  edited: string;
  editPosition: number;
  deletedLen: number;
  insertedLen: number;
}) {
  const window = 30;
  const start = Math.max(0, editPosition - window);
  const origEnd = Math.min(sequence.length, editPosition + deletedLen + window);
  const editEnd = Math.min(edited.length, editPosition + insertedLen + window);

  return (
    <div className="space-y-3 overflow-x-auto font-mono text-sm">
      <Row label="Original">
        <span className="text-slate-400">
          {sequence.slice(start, editPosition)}
        </span>
        <span className="rounded bg-rose-100 px-0.5 text-rose-700 line-through">
          {sequence.slice(editPosition, editPosition + deletedLen) || (
            <span className="not-italic no-underline">|</span>
          )}
        </span>
        <span className="text-slate-400">
          {sequence.slice(editPosition + deletedLen, origEnd)}
        </span>
      </Row>
      <Row label="Edited">
        <span className="text-slate-400">
          {edited.slice(start, editPosition)}
        </span>
        <span className="rounded bg-emerald-100 px-0.5 text-emerald-700">
          {edited.slice(editPosition, editPosition + insertedLen) || (
            <span>|</span>
          )}
        </span>
        <span className="text-slate-400">
          {edited.slice(editPosition + insertedLen, editEnd)}
        </span>
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-16 flex-none text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="whitespace-pre-wrap break-all">{children}</div>
    </div>
  );
}

function ProteinCompare({
  original,
  edited,
  comparison,
}: {
  original: string;
  edited: string;
  comparison: ProteinComparison;
}) {
  const changedSet = new Set(
    comparison.changedAminoAcids.map((c) => c.position),
  );
  const renderProtein = (p: string, asEdited: boolean) =>
    p.split("").map((aa, i) => {
      const changed = changedSet.has(i);
      const stop = aa === "*";
      let cls = "";
      if (stop) cls = "text-rose-600 font-bold";
      else if (changed && asEdited) cls = "bg-emerald-100 text-emerald-800 rounded";
      else if (changed) cls = "bg-rose-100 text-rose-800 rounded";
      return (
        <span key={i} className={cls}>
          {aa}
        </span>
      );
    });

  return (
    <div className="space-y-3 overflow-x-auto font-mono text-sm">
      <Row label="Original">
        <span className="break-all">
          {renderProtein(original, false)}
        </span>
        <span className="ml-3 text-[11px] text-slate-400">
          ({comparison.lengthOriginal} aa)
        </span>
      </Row>
      <Row label="Edited">
        <span className="break-all">
          {renderProtein(edited, true)}
        </span>
        <span className="ml-3 text-[11px] text-slate-400">
          ({comparison.lengthEdited} aa)
        </span>
      </Row>
    </div>
  );
}

function categoryStyle(category: ImpactExplanation["category"]): string {
  switch (category) {
    case "frameshift":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "premature-stop":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "in-frame-indel":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "missense":
      return "border-sky-200 bg-sky-50 text-sky-900";
    case "silent":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
}
