/**
 * Intelligence Engine
 * --------------------
 * Pure, deterministic transformation layer. Takes the curated BrainData
 * and derives the operator-grade metrics that the Bloomberg-style views
 * consume:
 *
 *   • Severity        — how urgent is this market gap?
 *   • TAM tier        — addressable market in INR crores
 *   • Capital tier    — round size required to chase the gap
 *   • Timeline        — time-to-first-revenue or time-to-signal
 *   • Regulatory load — CDSCO / SEBI / RBI / NONE
 *   • Operator IQ     — composite trust score for a verified guest
 *   • Investability   — composite VC-attractiveness score (0-100)
 *   • Counter-args    — first-principles dissent to keep the directory honest
 *
 * No network. No LLM. Microsecond-cost. Memoise at the call site.
 */

import type {
  BrainData,
  Episode,
  GuestNode,
  MasterPlaybook,
  Snippet,
} from "./brain-types";

// ---------------------------------------------------------------------------
//  Tier vocabularies
// ---------------------------------------------------------------------------

export type Severity = "CRITICAL" | "URGENT" | "FORMING" | "EMERGENT" | "MONITOR";
export type TamTier = "₹10K Cr+" | "₹1K Cr" | "₹100 Cr" | "₹10 Cr" | "₹<10 Cr";
export type CapitalTier = "PRE-SEED" | "SEED" | "SERIES A" | "SERIES B+" | "GROWTH" | "PE";
export type Timeline = "30D" | "90D" | "180D" | "12M" | "24M+";
export type RegLoad = "NONE" | "LIGHT" | "MEDIUM" | "HEAVY";

export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 5,
  URGENT: 4,
  FORMING: 3,
  EMERGENT: 2,
  MONITOR: 1,
};

export const SEVERITY_COLOR: Record<Severity, { bg: string; text: string; ring: string }> = {
  CRITICAL: { bg: "bg-rose-500/15", text: "text-rose-300", ring: "ring-rose-500/30" },
  URGENT:   { bg: "bg-amber-500/15", text: "text-amber-300", ring: "ring-amber-500/30" },
  FORMING:  { bg: "bg-indigo-500/15", text: "text-indigo-200", ring: "ring-indigo-500/30" },
  EMERGENT: { bg: "bg-cyan-500/15", text: "text-cyan-300", ring: "ring-cyan-500/30" },
  MONITOR:  { bg: "bg-stone-500/15", text: "text-stone-300", ring: "ring-stone-500/30" },
};

export const CAPITAL_COLOR: Record<CapitalTier, string> = {
  "PRE-SEED": "text-emerald-300",
  "SEED": "text-emerald-300",
  "SERIES A": "text-indigo-300",
  "SERIES B+": "text-violet-300",
  "GROWTH": "text-fuchsia-300",
  "PE": "text-amber-300",
};

// ---------------------------------------------------------------------------
//  Per-category heuristics
// ---------------------------------------------------------------------------

interface CategoryProfile {
  tam: TamTier;
  capital: CapitalTier;
  timeline: Timeline;
  reg: RegLoad;
  /** sector-level investability bonus (0-25) */
  vcBoost: number;
}

const DEFAULT_PROFILE: CategoryProfile = {
  tam: "₹100 Cr",
  capital: "SEED",
  timeline: "12M",
  reg: "LIGHT",
  vcBoost: 8,
};

const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  "D2C":                            { tam: "₹1K Cr",   capital: "SERIES A", timeline: "12M",  reg: "MEDIUM", vcBoost: 18 },
  "Consumer":                       { tam: "₹1K Cr",   capital: "SERIES A", timeline: "12M",  reg: "MEDIUM", vcBoost: 16 },
  "Consumer Electronics":           { tam: "₹10K Cr+", capital: "SERIES B+",timeline: "24M+", reg: "MEDIUM", vcBoost: 12 },
  "Capital":                        { tam: "₹10K Cr+", capital: "GROWTH",   timeline: "24M+", reg: "HEAVY",  vcBoost: 22 },
  "Health":                         { tam: "₹1K Cr",   capital: "SERIES A", timeline: "180D", reg: "HEAVY",  vcBoost: 19 },
  "Content":                        { tam: "₹100 Cr",  capital: "SEED",     timeline: "90D",  reg: "NONE",   vcBoost: 10 },
  "AI":                             { tam: "₹10K Cr+", capital: "SERIES B+",timeline: "180D", reg: "LIGHT",  vcBoost: 24 },
  "Founders":                       { tam: "₹100 Cr",  capital: "PRE-SEED", timeline: "90D",  reg: "LIGHT",  vcBoost: 7  },
  "Founders, Capital":              { tam: "₹1K Cr",   capital: "SEED",     timeline: "12M",  reg: "MEDIUM", vcBoost: 14 },
  "Platforms":                      { tam: "₹10K Cr+", capital: "SERIES B+",timeline: "24M+", reg: "MEDIUM", vcBoost: 18 },
  "EV":                             { tam: "₹10K Cr+", capital: "GROWTH",   timeline: "24M+", reg: "HEAVY",  vcBoost: 20 },
  "Hospitality":                    { tam: "₹100 Cr",  capital: "SEED",     timeline: "12M",  reg: "MEDIUM", vcBoost: 9  },
  "Education":                      { tam: "₹1K Cr",   capital: "SERIES A", timeline: "12M",  reg: "MEDIUM", vcBoost: 13 },
  "RealEstate":                     { tam: "₹10K Cr+", capital: "GROWTH",   timeline: "24M+", reg: "HEAVY",  vcBoost: 15 },
  "Climate":                        { tam: "₹10K Cr+", capital: "SERIES B+",timeline: "24M+", reg: "HEAVY",  vcBoost: 17 },
  "Gaming":                         { tam: "₹100 Cr",  capital: "SERIES A", timeline: "12M",  reg: "MEDIUM", vcBoost: 11 },
  "M&A":                            { tam: "₹10K Cr+", capital: "PE",       timeline: "24M+", reg: "HEAVY",  vcBoost: 16 },
  "Entertainment":                  { tam: "₹1K Cr",   capital: "SERIES A", timeline: "12M",  reg: "LIGHT",  vcBoost: 12 },
  "D2C Supply Chain Infrastructure":{ tam: "₹10K Cr+", capital: "SERIES B+",timeline: "12M",  reg: "MEDIUM", vcBoost: 21 },
  "Metaverse":                      { tam: "₹100 Cr",  capital: "SERIES A", timeline: "24M+", reg: "LIGHT",  vcBoost: 6  },
  // ── Previously missing — caused fallback to generic ₹100 Cr SEED ──
  "General":                        { tam: "₹100 Cr",  capital: "SEED",     timeline: "12M",  reg: "LIGHT",  vcBoost: 5  },
  "High-Performance Operations":    { tam: "₹100 Cr",  capital: "PRE-SEED", timeline: "180D", reg: "NONE",   vcBoost: 8  },
  "PropTech":                       { tam: "₹10K Cr+", capital: "SERIES A", timeline: "12M",  reg: "HEAVY",  vcBoost: 16 },
  "PropTech & Infrastructure":      { tam: "₹10K Cr+", capital: "SERIES A", timeline: "12M",  reg: "HEAVY",  vcBoost: 16 },
};

export function profileFor(category: string): CategoryProfile {
  return CATEGORY_PROFILES[category] ?? DEFAULT_PROFILE;
}

// ---------------------------------------------------------------------------
//  Severity scoring
// ---------------------------------------------------------------------------

/**
 * Severity reflects how urgent / executable a market gap is, not how big.
 * Heuristic: longer, more specific gaps that show up across multiple sources
 * with regulatory pressure are usually CRITICAL — they imply a window that
 * is open *now*.
 */
export function severityOf(gap: string, episode: Episode, brain: BrainData): Severity {
  const len = gap.length;
  const wordCount = gap.split(/\s+/).filter(Boolean).length;
  const profile = profileFor(episode.category);
  const regWeight = profile.reg === "HEAVY" ? 25 : profile.reg === "MEDIUM" ? 15 : profile.reg === "LIGHT" ? 8 : 0;

  // Rough cross-episode signal: how many other episodes mention any of the
  // four most "characteristic" words from this gap.
  const tokens = gap
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 6)
    .slice(0, 4);
  let crossEpisodeHits = 0;
  brain.sourceCatalog.forEach((other) => {
    if (other.id === episode.id) return;
    const blob =
      other.opportunitySnippets.map((s) => s.text).join(" ") +
      other.strategySnippets.map((s) => s.text).join(" ");
    if (tokens.some((t) => blob.toLowerCase().includes(t))) crossEpisodeHits++;
  });

  // Base score from detail (shorter = generic; longer = specific)
  let score = 0;
  score += Math.min(40, wordCount * 1.6);
  score += Math.min(20, len / 12);
  score += Math.min(20, crossEpisodeHits * 6);
  score += regWeight;

  // Capital-heavy gaps signal larger windows
  if (profile.capital === "GROWTH" || profile.capital === "PE") score += 10;
  if (profile.tam === "₹10K Cr+") score += 5;

  // Specificity bonus: gaps with numbers / currency are more actionable
  const hasNumbers = /\d/.test(gap);
  const hasCurrency = /[₹$%]|crore|lakh|billion|million/i.test(gap);
  if (hasNumbers) score += 8;
  if (hasCurrency) score += 6;

  // Evidence grounding bonus (from deep extraction)
  const opp = episode.opportunitySnippets?.find((s: Snippet) => s.text === gap);
  const oppExtra = opp as unknown as Record<string, unknown> | undefined;
  if (oppExtra?.confidence === "HIGH") score += 10;
  else if (oppExtra?.confidence === "MEDIUM") score += 5;

  // Map to band
  if (score >= 85) return "CRITICAL";
  if (score >= 70) return "URGENT";
  if (score >= 55) return "FORMING";
  if (score >= 40) return "EMERGENT";
  return "MONITOR";
}

// ---------------------------------------------------------------------------
//  Operator IQ
// ---------------------------------------------------------------------------

/**
 * Composite trust score for a guest. Higher = more reliable signal.
 *  +30  cross-show validator
 *  +10  per episode (cap 40)
 *  + 4  per co-guest (cap 16)
 *  + 8  per category covered (cap 14)
 */
export function operatorIQ(g: GuestNode): number {
  let s = 0;
  if (g.isCrossShow) s += 30;
  s += Math.min(40, g.episodeCount * 10);
  s += Math.min(16, (g.coGuests?.length ?? 0) * 4);
  s += Math.min(14, (g.categories?.length ?? 0) * 8);
  return Math.min(100, Math.round(s));
}

// ---------------------------------------------------------------------------
//  Investability score (composite; for sortable Alpha Matrix)
// ---------------------------------------------------------------------------

export function investability(
  gap: string,
  episode: Episode,
  brain: BrainData,
): { score: number; severity: Severity; profile: CategoryProfile } {
  const sev = severityOf(gap, episode, brain);
  const profile = profileFor(episode.category);

  let score = 0;
  score += SEVERITY_RANK[sev] * 12;            // 12-60
  score += profile.vcBoost;                    // 0-25

  // Longer, more specific gap → higher quality signal
  score += Math.min(15, Math.floor(gap.length / 18));

  // Episode richness
  score += Math.min(10, episode.strategySnippets.length * 1.5);

  return { score: Math.min(100, Math.round(score)), severity: sev, profile };
}

// ---------------------------------------------------------------------------
//  Counter-arguments
// ---------------------------------------------------------------------------

const REG_COUNTERS: Record<RegLoad, string> = {
  HEAVY: "Regulatory burden (CDSCO / SEBI / RBI) compresses time-to-revenue and inflates legal capex.",
  MEDIUM: "GST + state-level compliance friction can erode 15-20% of early-stage margin if mishandled.",
  LIGHT: "Limited regulatory moat means a fast follower can replicate distribution within 9–12 months.",
  NONE: "Open-field execution → moat must come from speed and brand, not licensing.",
};

const CAPITAL_COUNTERS: Record<CapitalTier, string> = {
  "PRE-SEED": "Indian pre-seed cheque sizes have compressed; founders must self-fund through MVP signal.",
  "SEED": "Seed-extension / bridge rounds are now the dominant pattern; plan for 18-month runway, not 12.",
  "SERIES A": "Indian Series A is gated by ARR ≥ ₹10 Cr or DPI proxies — soft signal alone won't clear.",
  "SERIES B+": "Capital is concentrated in tier-1 funds; secondary buyout path is mandatory for early backers.",
  "GROWTH": "Late-stage capital availability has thinned post-2024; PIPE + SPV stacks now common.",
  "PE": "Indian PE buyouts demand EBITDA ≥ ₹50 Cr and clean cap tables; founder dilution can exceed 60%.",
};

const TAM_COUNTERS: Record<TamTier, string> = {
  "₹10K Cr+": "Large TAM attracts incumbents — distribution moat, not product, decides the winner.",
  "₹1K Cr": "Mid-TAM markets often plateau before unit economics turn; pricing pressure is constant.",
  "₹100 Cr": "Niche TAM caps exit multiples — strategic acquirer landscape must be mapped on day one.",
  "₹10 Cr": "Sub-segment TAM means service-revenue or vertical SaaS pivot is needed for venture-scale outcome.",
  "₹<10 Cr": "Lifestyle business risk; not VC-fundable without TAM expansion narrative.",
};

export function counterArgument(profile: CategoryProfile): string {
  // Pick the strongest dissent vector
  if (profile.reg === "HEAVY") return REG_COUNTERS.HEAVY;
  if (profile.tam === "₹10K Cr+") return TAM_COUNTERS["₹10K Cr+"];
  if (profile.capital === "GROWTH" || profile.capital === "PE") return CAPITAL_COUNTERS[profile.capital];
  if (profile.reg === "MEDIUM") return REG_COUNTERS.MEDIUM;
  return CAPITAL_COUNTERS[profile.capital];
}

// ---------------------------------------------------------------------------
//  Convenience aggregators consumed by Alpha Matrix / Theses / Workspaces
// ---------------------------------------------------------------------------

export interface AlphaSignal {
  id: string;
  episode: Episode;
  gap: string;
  severity: Severity;
  profile: CategoryProfile;
  investability: number;
  playbook: MasterPlaybook | null;
  operators: GuestNode[];
  counter: string;
}

export function buildAlphaSignals(
  brain: BrainData,
  filter?: { creatorId?: string; category?: string; query?: string },
): AlphaSignal[] {
  const q = (filter?.query ?? "").toLowerCase();
  const out: AlphaSignal[] = [];
  const guestByName = new Map(brain.guestNetwork.map((g) => [g.name, g] as const));
  const playbookByCategory = new Map<string, MasterPlaybook>();
  for (const pb of brain.masterPlaybooks ?? []) {
    if (pb.category) playbookByCategory.set(pb.category, pb);
  }

  brain.sourceCatalog.forEach((ep, idx) => {
    if (filter?.creatorId && ep.creatorId !== filter.creatorId) return;
    if (filter?.category && filter.category !== "All" && ep.category !== filter.category) return;

    ep.opportunitySnippets.forEach((opp, gIdx) => {
      const gap = opp.text;
      if (q && !gap.toLowerCase().includes(q) && !ep.category.toLowerCase().includes(q)) return;

      const inv = investability(gap, ep, brain);
      const operators = (ep.guests ?? [])
        .map((name) => guestByName.get(name))
        .filter((g): g is GuestNode => Boolean(g));

      // Best-effort playbook match
      const pb =
        playbookByCategory.get(ep.category) ??
        (brain.masterPlaybooks ?? []).find((p) =>
          p.id.toLowerCase().includes(ep.category.toLowerCase().split(/[\s,]/)[0]),
        ) ??
        (brain.masterPlaybooks ?? [])[(idx + gIdx) % Math.max(1, brain.masterPlaybooks?.length ?? 1)] ??
        null;

      out.push({
        id: `${ep.id}-${gIdx}`,
        episode: ep,
        gap,
        severity: inv.severity,
        profile: inv.profile,
        investability: inv.score,
        playbook: pb,
        operators,
        counter: counterArgument(inv.profile),
      });
    });
  });

  // Default ordering: investability desc, then severity rank desc
  out.sort((a, b) => {
    if (b.investability !== a.investability) return b.investability - a.investability;
    return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  });
  return out;
}

// ---------------------------------------------------------------------------
//  Snippet helpers — pick the most evidence-rich strategy/insight pair
// ---------------------------------------------------------------------------

export function topEvidence(snippets: Snippet[], n = 3): Snippet[] {
  return [...snippets]
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
    .slice(0, n);
}

// ---------------------------------------------------------------------------
//  Number / money formatters used across the UI
// ---------------------------------------------------------------------------

export function compactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
