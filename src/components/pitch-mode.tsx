"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pause,
  Play,
  Sparkles,
  X,
  CheckCircle2,
  PlayCircle,
  Users,
  BookOpen,
  Landmark,
  ExternalLink,
} from "lucide-react";
import { buildTheses, type InvestmentThesis } from "@/lib/theses-engine";
import { SEVERITY_COLOR } from "@/lib/intelligence-engine";
import type { BrainData, MasterPlaybook } from "@/lib/brain-types";

/**
 * Pitch Mode — fullscreen, cinematic deck.
 *
 *   ⌘.        toggle
 *   esc       close
 *   ←  →     manual navigate
 *   space     pause / resume autoplay
 *
 * Deck order:
 *   1.  Title (audience-named)
 *   2.  Data foundation (verifiable counts)
 *   3.  Verified playbook spotlights (each dossier)
 *   4.  Top investment theses (cinematic)
 *   5.  Founder Library — what's inside
 *   6.  Ask / outro
 */

const ROTATE_MS = 6800;

type Slide =
  | { kind: "title"; audienceLine: string }
  | { kind: "data" }
  | { kind: "playbook"; pb: MasterPlaybook }
  | { kind: "thesis"; thesis: InvestmentThesis }
  | { kind: "library" }
  | { kind: "ask" };

export function PitchMode({
  data,
  open,
  onClose,
}: {
  data: BrainData;
  open: boolean;
  onClose: () => void;
}) {
  const theses = useMemo(() => buildTheses(data, 3), [data]);
  const playbooks = useMemo(
    () => (data.masterPlaybooks ?? []).filter((pb) => pb.verified).slice(0, 4),
    [data.masterPlaybooks],
  );

  const slides = useMemo<Slide[]>(() => {
    const audienceLine = data.creators.map((c) => c.name).join("  ·  ");
    const out: Slide[] = [
      { kind: "title", audienceLine },
      { kind: "data" },
    ];
    for (const pb of playbooks) out.push({ kind: "playbook", pb });
    for (const t of theses) out.push({ kind: "thesis", thesis: t });
    if (data.founderLibrary) out.push({ kind: "library" });
    out.push({ kind: "ask" });
    return out;
  }, [data, playbooks, theses]);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // reset to first slide each time pitch mode opens
  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  // auto-rotate
  useEffect(() => {
    if (!open || paused || slides.length === 0) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [open, paused, slides.length]);

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % Math.max(1, slides.length));
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + slides.length) % Math.max(1, slides.length));
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, slides.length]);

  if (!open || slides.length === 0) return null;
  const slide = slides[idx];

  const sectionLabel =
    slide.kind === "title"
      ? "Cover"
      : slide.kind === "data"
      ? "Foundation"
      : slide.kind === "playbook"
      ? "Verified Playbook"
      : slide.kind === "thesis"
      ? "Investment Thesis"
      : slide.kind === "library"
      ? "Founder Library"
      : "Ask";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[180] bg-[#04040a] overflow-hidden"
        >
          {/* Background hairline grid + glow */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                backgroundSize: "64px 64px",
              }}
            />
          </div>
          <div className="absolute -top-40 left-1/3 w-[60vw] h-[60vh] bg-indigo-500/10 blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[50vw] h-[40vh] bg-violet-500/10 blur-[140px] pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 px-12 py-8 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] font-bold text-stone-500 z-10">
            <div className="flex items-center gap-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>India Alpha · Pitch Deck</span>
              <span className="text-stone-700">·</span>
              <span className="text-emerald-300">{sectionLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPaused((p) => !p)}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {paused ? "Play" : "Pause"}
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" /> Esc
              </button>
            </div>
          </div>

          {/* Slide */}
          <div className="absolute inset-0 flex items-center justify-center px-16">
            <motion.div
              key={`${slide.kind}-${idx}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              className="max-w-[1240px] w-full"
            >
              {slide.kind === "title" && <TitleSlide audience={slide.audienceLine} data={data} />}
              {slide.kind === "data" && <DataSlide data={data} />}
              {slide.kind === "playbook" && <PlaybookSlide pb={slide.pb} />}
              {slide.kind === "thesis" && <ThesisSlide t={slide.thesis} />}
              {slide.kind === "library" && <LibrarySlide data={data} />}
              {slide.kind === "ask" && <AskSlide data={data} />}
            </motion.div>
          </div>

          {/* Bottom progress + nav */}
          <div className="absolute bottom-0 inset-x-0 px-12 py-7 z-10">
            <div className="flex items-center gap-6">
              <div className="flex-1 flex items-center gap-1">
                {slides.map((_, i) => {
                  const active = i === idx;
                  return (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`h-[3px] rounded-full transition-all ${
                        active ? "w-12 bg-white" : "w-6 bg-white/[0.08] hover:bg-white/[0.18]"
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  );
                })}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] font-bold text-stone-500 tabular-nums">
                {String(idx + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </div>
            </div>
            <div className="mt-3 text-center text-[9px] uppercase tracking-[0.24em] text-stone-700 font-medium">
              ←  → navigate · space pause · esc close
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
//  Slides
// ---------------------------------------------------------------------------

function TitleSlide({ audience, data }: { audience: string; data: BrainData }) {
  const meta = data.meta;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 font-bold mb-6 flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5" /> Built for: {audience}
      </div>
      <h1 className="text-[clamp(56px,7vw,108px)] font-semibold text-white tracking-[-0.03em] leading-[1.0] mb-8 max-w-[18ch]">
        Verified founder intelligence —
        <span className="text-stone-400"> from your own conversations.</span>
      </h1>
      <p className="text-[18px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)] max-w-[60ch]">
        India Alpha turns {meta.indexedEpisodeCount} indexed episodes of{" "}
        <span className="text-white">WTF</span> and{" "}
        <span className="text-white">The BarberShop</span> into a single,
        offline-native intelligence terminal — playbooks, theses, and a
        link-verified founder resource library a young Indian builder can
        ship from on Monday morning.
      </p>
    </div>
  );
}

function DataSlide({ data }: { data: BrainData }) {
  const meta = data.meta;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-6">
        Foundation · what powers the product
      </div>
      <h1 className="text-[clamp(40px,5.4vw,76px)] font-semibold text-white tracking-[-0.025em] leading-[1.05] mb-12 max-w-[24ch]">
        Pure signal. Zero hallucination. Zero network.
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-10">
        <PitchMetric
          label="Indexed Episodes"
          value={`${meta.indexedEpisodeCount}`}
          sub="WTF + BarberShop"
          tone="indigo"
        />
        <PitchMetric
          label="Verified Playbooks"
          value={`${meta.verifiedPlaybookCount ?? meta.playbookCount}`}
          sub="hand-curated"
          tone="emerald"
        />
        <PitchMetric
          label="Operators"
          value={`${meta.guestCount}`}
          sub={`${meta.crossShowGuestCount ?? 0} cross-show`}
          tone="violet"
        />
        <PitchMetric
          label="Library Resources"
          value={`${meta.totalLibraryResources ?? 0}`}
          sub="link-verified"
          tone="cyan"
        />
      </div>
      <div className="mt-12 max-w-3xl text-[14px] text-stone-400 font-[family-name:var(--font-signal-mono)] leading-relaxed border-l-2 border-emerald-400/40 pl-5">
        {meta.note ?? meta.extractionMethod}
      </div>
    </div>
  );
}

function PlaybookSlide({ pb }: { pb: MasterPlaybook }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 font-bold mb-6 flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5" /> Verified Playbook · {pb.category}
        {pb.creator && (
          <>
            <span className="text-stone-700">·</span>
            <span className="text-stone-300">{pb.creator}</span>
          </>
        )}
      </div>
      <h1 className="text-[clamp(36px,4.8vw,68px)] font-semibold text-white tracking-[-0.025em] leading-[1.05] mb-6 max-w-[26ch]">
        {pb.title}
      </h1>
      {pb.thesis && (
        <p className="text-[18px] text-indigo-100 leading-relaxed font-[family-name:var(--font-signal-mono)] max-w-[64ch] mb-10 border-l-2 border-indigo-400/40 pl-5">
          {pb.thesis}
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 max-w-[64ch] mb-10">
        {pb.steps.slice(0, 4).map((s) => (
          <div key={s.step} className="flex items-start gap-3">
            <span className="text-[11px] font-bold text-emerald-300/60 tabular-nums shrink-0 mt-1">
              {String(s.step).padStart(2, "0")}
            </span>
            <p className="text-[14px] text-stone-200 leading-snug">{s.detail}</p>
          </div>
        ))}
      </div>
      {pb.sourceUrl && (
        <a
          href={pb.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-[12px] font-semibold text-stone-400 hover:text-white transition-colors uppercase tracking-[0.16em]"
        >
          <PlayCircle className="w-4 h-4" /> Watch source episode
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function ThesisSlide({ t }: { t: InvestmentThesis }) {
  const colors = SEVERITY_COLOR[t.severity];
  return (
    <div>
      <div className="flex items-center gap-3 mb-6 text-[11px] font-bold uppercase tracking-[0.22em]">
        <span className="text-stone-500 tabular-nums">Thesis #{String(t.rank).padStart(2, "0")}</span>
        <span className="text-stone-700">·</span>
        <span className="text-stone-300">{t.category}</span>
        <span className="text-stone-700">·</span>
        <span className={`flex items-center gap-1.5 ${colors.text}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current signal-pulse" />
          {t.severity}
        </span>
      </div>
      <h1 className="text-[clamp(36px,4.8vw,72px)] font-semibold text-white tracking-[-0.025em] leading-[1.05] mb-10 max-w-[26ch]">
        {t.headline}
      </h1>
      <div className="flex items-center flex-wrap gap-x-10 gap-y-4 mb-8">
        <PitchMetric label="Investability" value={`${t.investability}`} sub="composite" tone="indigo" />
        <PitchMetric label="Addressable Market" value={t.tam} sub="TAM" tone="emerald" />
        <PitchMetric label="Capital Window" value={t.capital} sub={t.capitalRange} tone="violet" />
        <PitchMetric label="Time to Signal" value={t.timeline} sub="first proof" tone="cyan" />
      </div>
      {t.operators.length > 0 && (
        <div className="flex items-center gap-2 mb-6 text-[11px] uppercase tracking-[0.18em] text-amber-200/80 font-semibold">
          <Users className="w-3.5 h-3.5" />
          Operators in transcript: {t.operators.slice(0, 4).map((o) => o.name).join(" · ")}
        </div>
      )}
      <div className="bg-white/[0.03] border-l-2 border-rose-400/40 pl-5 pr-6 py-4 max-w-3xl rounded-r-lg">
        <div className="text-[9px] uppercase tracking-[0.22em] font-bold text-rose-300 mb-1.5">
          First-principles counter
        </div>
        <p className="text-[15px] text-stone-200 leading-relaxed font-[family-name:var(--font-signal-mono)]">
          {t.counter}
        </p>
      </div>
    </div>
  );
}

function LibrarySlide({ data }: { data: BrainData }) {
  const lib = data.founderLibrary;
  if (!lib) return null;
  const sections = lib.sections;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300 font-bold mb-6 flex items-center gap-2">
        <Landmark className="w-3.5 h-3.5" /> Founder Library · link-verified
      </div>
      <h1 className="text-[clamp(40px,5.2vw,76px)] font-semibold text-white tracking-[-0.025em] leading-[1.05] mb-8 max-w-[22ch]">
        Every rail a young Indian founder needs — in one place.
      </h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {sections.map((s) => (
          <div key={s.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200 font-bold mb-2">
              {s.title}
            </div>
            <div className="text-[28px] font-semibold text-white tabular-nums leading-none mb-3">
              {s.items.length}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-3">{s.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskSlide({ data }: { data: BrainData }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 font-bold mb-6">
        The ask
      </div>
      <h1 className="text-[clamp(48px,6.4vw,98px)] font-semibold text-white tracking-[-0.03em] leading-[1.0] mb-10 max-w-[18ch]">
        Buy it. Brand it. Ship it on day one.
      </h1>
      <p className="text-[18px] text-stone-300 leading-relaxed font-[family-name:var(--font-signal-mono)] max-w-[64ch] mb-10">
        India Alpha is a finished, native macOS intelligence terminal. It runs
        100 % offline, ships a bundled SQLite FTS5 index of every transcript,
        and is ready to be re-skinned as a paid product for the WTF / BarberShop
        community.
      </p>
      <div className="grid grid-cols-3 gap-x-12">
        <PitchMetric label="What you get" value="100%" sub="finished product" tone="emerald" />
        <PitchMetric label="Network calls" value="0" sub="fully offline" tone="indigo" />
        <PitchMetric label="Episodes indexed" value={`${data.meta.indexedEpisodeCount}`} sub="day-one corpus" tone="violet" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Atom: a single metric column
// ---------------------------------------------------------------------------

function PitchMetric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "indigo" | "emerald" | "violet" | "cyan";
}) {
  const text: Record<string, string> = {
    indigo: "text-indigo-200",
    emerald: "text-emerald-200",
    violet: "text-violet-200",
    cyan: "text-cyan-200",
  };
  return (
    <div>
      <div className={`text-[9px] font-bold uppercase tracking-[0.22em] ${text[tone]} mb-1.5`}>{label}</div>
      <div className="text-[clamp(28px,3vw,40px)] font-semibold text-white tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mt-1.5 font-medium">
        {sub}
      </div>
    </div>
  );
}
