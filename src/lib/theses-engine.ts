/**
 * Theses Engine
 * --------------
 * Synthesises the top "investable theses" across the corpus by
 * clustering high-severity market gaps within a category and stitching
 * them together with the supporting evidence, operators, and an honest
 * counter-argument.
 *
 * Pure transformation. Memoise at the call site.
 */

import type { BrainData, Episode, GuestNode, MasterPlaybook, Snippet } from "./brain-types";
import {
  buildAlphaSignals,
  counterArgument,
  operatorIQ,
  profileFor,
  SEVERITY_RANK,
  type AlphaSignal,
  type Severity,
  type CapitalTier,
  type TamTier,
  type Timeline,
  type RegLoad,
} from "./intelligence-engine";

export interface InvestmentThesis {
  id: string;
  rank: number;
  category: string;
  hypothesis: string;
  /** One-line headline distilled from the hypothesis */
  headline: string;
  severity: Severity;
  tam: TamTier;
  capital: CapitalTier;
  timeline: Timeline;
  reg: RegLoad;
  investability: number;
  evidence: { text: string; episodeTitle: string; episodeId: string }[];
  operators: GuestNode[];
  playbook: MasterPlaybook | null;
  counter: string;
  supportingEpisodes: { id: string; title: string }[];
  capitalRange: string;
}

const CAPITAL_RANGES: Record<CapitalTier, string> = {
  "PRE-SEED": "₹50L – ₹2 Cr",
  "SEED": "₹2 Cr – ₹15 Cr",
  "SERIES A": "₹15 Cr – ₹60 Cr",
  "SERIES B+": "₹60 Cr – ₹250 Cr",
  "GROWTH": "₹250 Cr – ₹1,000 Cr",
  "PE": "₹1,000 Cr+",
};

function distilHeadline(text: string, max = 300): string {
  // Strip leading conjunctions / "Severe lack of …" pattern.
  let h = text.replace(/^(severe lack of|absence of|critical shortage of|no )/i, "Indian market lacks ");
  h = h.replace(/\.$/, "");
  if (h.length > max) h = h.slice(0, max - 1).replace(/[\s,;:]+\S*$/, "") + "…";
  return h;
}

export function buildTheses(brain: BrainData, n = 12): InvestmentThesis[] {
  const signals = buildAlphaSignals(brain);
  if (signals.length === 0) return [];

  // Group by category, pick the strongest signal per category, then rank.
  const byCat = new Map<string, AlphaSignal[]>();
  signals.forEach((s) => {
    if (!byCat.has(s.episode.category)) byCat.set(s.episode.category, []);
    byCat.get(s.episode.category)!.push(s);
  });

  const cluster: AlphaSignal[] = [];
  byCat.forEach((arr) => {
    arr.sort((a, b) => b.investability - a.investability);
    cluster.push(arr[0]);
  });
  // If we have fewer categories than n, fill with next-best signals from larger clusters.
  if (cluster.length < n) {
    const fallback = signals.filter((s) => !cluster.includes(s));
    while (cluster.length < n && fallback.length > 0) {
      cluster.push(fallback.shift()!);
    }
  }
  cluster.sort((a, b) => b.investability - a.investability);
  cluster.length = Math.min(n, cluster.length);

  // Compose theses
  return cluster.map((sig, idx) => {
    const supporting = brain.sourceCatalog.filter(
      (ep) => ep.category === sig.episode.category && ep.id !== sig.episode.id,
    );
    type SnippetWithEp = Snippet & { _ep?: Episode };
    const evidence: InvestmentThesis["evidence"] = ([
      ...sig.episode.strategySnippets.slice(0, 2),
      ...supporting.flatMap((ep) =>
        ep.strategySnippets.slice(0, 1).map((s: Snippet): SnippetWithEp => ({
          ...s,
          _ep: ep,
        })),
      ),
    ] as SnippetWithEp[])
      .slice(0, 3)
      .map((s) => ({
        text: s.text,
        episodeTitle: s._ep?.title ?? sig.episode.title,
        episodeId: s._ep?.id ?? sig.episode.id,
      }))
      .filter((_, i, arr) => i === arr.findIndex((x) => x.text === arr[i].text));

    const operators = sig.operators
      .slice()
      .sort((a, b) => operatorIQ(b) - operatorIQ(a))
      .slice(0, 4);

    const profile = profileFor(sig.episode.category);
    return {
      id: `thesis-${idx + 1}`,
      rank: idx + 1,
      category: sig.episode.category,
      hypothesis: sig.gap,
      headline: distilHeadline(sig.gap),
      severity: sig.severity,
      tam: profile.tam,
      capital: profile.capital,
      timeline: profile.timeline,
      reg: profile.reg,
      investability: sig.investability,
      evidence,
      operators,
      playbook: sig.playbook,
      counter: counterArgument(profile),
      supportingEpisodes: [
        { id: sig.episode.id, title: sig.episode.title },
        ...supporting.slice(0, 3).map((e) => ({ id: e.id, title: e.title })),
      ],
      capitalRange: CAPITAL_RANGES[profile.capital],
    };
  });
}

// ---------------------------------------------------------------------------
//  Workspace synthesis — what shows up when "Initialize Workspace" fires
// ---------------------------------------------------------------------------

export interface WorkspacePlan {
  thesisHeadline: string;
  capitalRange: string;
  capitalTier: CapitalTier;
  timeline: Timeline;
  /** 90-day execution sprint */
  ninetyDay: { phase: string; milestone: string; metric: string }[];
  /** Critical hires for the first cohort of execution */
  keyHires: { role: string; rationale: string }[];
  /** Regulatory + compliance must-clear list */
  regulatoryChecklist: { item: string; authority: string; severity: "MUST" | "SHOULD" | "WATCH" }[];
  /** Burn ladder (₹) — illustrative, derived from capital tier */
  burnLadder: { month: string; spendRange: string; signal: string }[];
  /** Founder stack pulled from playbook resources, falling back to brain.founderToolsByCategory */
  stack: { name: string; description: string; url?: string }[];
  /** A single decisive question the founder must answer before raising */
  decisiveQuestion: string;
}

const REG_BY_LOAD: Record<RegLoad, { item: string; authority: string; severity: "MUST" | "SHOULD" | "WATCH" }[]> = {
  HEAVY: [
    { item: "Sector-specific licence (CDSCO / SEBI / RBI / IRDAI)", authority: "Statutory", severity: "MUST" },
    { item: "Data localisation + DPDP Act compliance", authority: "MeitY", severity: "MUST" },
    { item: "GST registration + e-invoicing", authority: "GSTN", severity: "MUST" },
    { item: "Audit trail per Companies Act 2013 §128", authority: "MCA", severity: "SHOULD" },
    { item: "Sector watchdog FAQ tracking", authority: "Industry body", severity: "WATCH" },
  ],
  MEDIUM: [
    { item: "GST registration + e-invoicing", authority: "GSTN", severity: "MUST" },
    { item: "DPDP Act compliance + privacy policy", authority: "MeitY", severity: "MUST" },
    { item: "State-level shop & establishment licences", authority: "State Govt", severity: "SHOULD" },
    { item: "Trademark filing for brand mark", authority: "IPO", severity: "SHOULD" },
  ],
  LIGHT: [
    { item: "GST registration", authority: "GSTN", severity: "MUST" },
    { item: "Privacy policy + DPDP-aligned consent", authority: "MeitY", severity: "SHOULD" },
    { item: "Trademark filing", authority: "IPO", severity: "WATCH" },
  ],
  NONE: [
    { item: "Trademark filing for product mark", authority: "IPO", severity: "SHOULD" },
    { item: "Privacy policy + cookie consent", authority: "MeitY", severity: "WATCH" },
  ],
};

const BURN_BY_TIER: Record<CapitalTier, { month: string; spendRange: string; signal: string }[]> = {
  "PRE-SEED": [
    { month: "M1–M3", spendRange: "₹6–10 L", signal: "Working prototype + 50 design partners signed" },
    { month: "M4–M6", spendRange: "₹10–18 L", signal: "Paid pilot conversion ≥ 30%" },
    { month: "M7–M9", spendRange: "₹18–28 L", signal: "ARR ≥ ₹50 L · founder OS dialled" },
  ],
  "SEED": [
    { month: "M1–M3", spendRange: "₹35–60 L", signal: "Founding team + GTM hire onboarded" },
    { month: "M4–M6", spendRange: "₹60 L–₹1 Cr", signal: "Repeatable pipeline + ARR ≥ ₹2 Cr" },
    { month: "M7–M12", spendRange: "₹1.2–2 Cr", signal: "ARR ≥ ₹6 Cr · Net retention ≥ 110%" },
  ],
  "SERIES A": [
    { month: "Q1", spendRange: "₹2–4 Cr", signal: "VP-grade leadership in Sales + Product" },
    { month: "Q2", spendRange: "₹4–7 Cr", signal: "ARR ≥ ₹15 Cr · payback < 12 months" },
    { month: "Q3", spendRange: "₹7–12 Cr", signal: "Multi-segment expansion validated" },
    { month: "Q4", spendRange: "₹10–18 Cr", signal: "Series B story drafted · pipeline > target × 3" },
  ],
  "SERIES B+": [
    { month: "Q1", spendRange: "₹8–15 Cr", signal: "Geo / segment expansion live" },
    { month: "Q2", spendRange: "₹14–25 Cr", signal: "ARR ≥ ₹50 Cr · LTV/CAC ≥ 3.5×" },
    { month: "Q3", spendRange: "₹20–35 Cr", signal: "First M&A execution" },
    { month: "Q4", spendRange: "₹25–45 Cr", signal: "Pre-IPO planning + governance upgrade" },
  ],
  "GROWTH": [
    { month: "H1", spendRange: "₹40–80 Cr", signal: "Inorganic acquisition closed · margin discipline" },
    { month: "H2", spendRange: "₹70–120 Cr", signal: "EBITDA breakeven trajectory · DRHP in motion" },
  ],
  "PE": [
    { month: "Y1", spendRange: "₹150–300 Cr", signal: "100-day plan · cap table cleanup · ESOP refresh" },
    { month: "Y2", spendRange: "₹300–600 Cr", signal: "Margin expansion · platform consolidation" },
  ],
};

const HIRES_BY_CATEGORY: Record<string, { role: string; rationale: string }[]> = {
  "D2C": [
    { role: "Head of Performance", rationale: "Owns CAC payback ≤ 6 months across Meta + Quick-commerce" },
    { role: "Supply Chain Lead", rationale: "Decouples 3PL dependency at scale; protects unit economics" },
    { role: "Brand Director", rationale: "Builds the moat once paid acquisition plateaus" },
  ],
  "Capital": [
    { role: "Quant / Risk Lead", rationale: "Owns the model; SEBI-grade documentation discipline" },
    { role: "Compliance Officer", rationale: "Mandatory for AIF / PMS structures from day one" },
    { role: "Distribution Head", rationale: "Wealth-manager + family-office relationship layer" },
  ],
  "Health": [
    { role: "Medical Affairs Lead", rationale: "Clinical credibility + CDSCO interface" },
    { role: "Operations Director", rationale: "Multi-city clinical ops with NABH-grade SOPs" },
    { role: "Insurance Partnerships", rationale: "Cashless network — the real distribution moat" },
  ],
  "AI": [
    { role: "Applied Research Lead", rationale: "Owns model selection / fine-tune budget discipline" },
    { role: "ML Platform Engineer", rationale: "Inference cost control as scale arrives" },
    { role: "Enterprise GTM", rationale: "ACV ≥ ₹40 L deals are won by people, not product" },
  ],
  "Founders": [
    { role: "Chief of Staff", rationale: "Founder leverage; OKR + cadence operator" },
    { role: "Recruiter (in-house)", rationale: "Talent dictates pace; agencies can't ship velocity" },
  ],
  "Education": [
    { role: "Curriculum Director", rationale: "Outcome-led pedagogy is the only moat that compounds" },
    { role: "Counselling Lead", rationale: "Owns conversion + parent NPS in tier-2/3" },
    { role: "Tech / Mobile Lead", rationale: "JavaScript + offline-first PWAs for low-bandwidth users" },
  ],
};

const FALLBACK_HIRES = [
  { role: "Head of Distribution", rationale: "Indian markets reward distribution muscle over product flair" },
  { role: "Finance Controller", rationale: "Cap table + GST + ESOP discipline from day one" },
  { role: "Brand / Comms Lead", rationale: "Operator-grade narrative is a 12-month asset" },
];

export function buildWorkspacePlan(
  brain: BrainData,
  source: { category: string; hypothesis: string; playbook?: MasterPlaybook | null; capital?: CapitalTier; timeline?: Timeline; reg?: RegLoad },
): WorkspacePlan {
  const profile = profileFor(source.category);
  const capital: CapitalTier = source.capital ?? profile.capital;
  const timeline: Timeline = source.timeline ?? profile.timeline;
  const reg: RegLoad = source.reg ?? profile.reg;

  const stack =
    source.playbook?.resources?.slice(0, 5) ??
    brain.founderToolsByCategory?.[source.category]?.slice(0, 5) ??
    [];

  const ninetyDay = [
    { phase: "Days 0–30", milestone: "Team-of-3 + thesis whitepaper signed off", metric: "Founder OS shipped · 5 design partners locked" },
    { phase: "Days 31–60", milestone: "Live MVP + 3 paid pilots", metric: "Activation > 60% · NPS ≥ 40" },
    { phase: "Days 61–90", milestone: "Repeatable GTM motion + first hire", metric: "Pipeline coverage ≥ 3× · payback < 12 months" },
  ];

  const keyHires =
    HIRES_BY_CATEGORY[source.category] ??
    HIRES_BY_CATEGORY[source.category.split(",")[0]?.trim() ?? ""] ??
    FALLBACK_HIRES;

  return {
    thesisHeadline: distilHeadline(source.hypothesis, 110),
    capitalRange: CAPITAL_RANGES[capital],
    capitalTier: capital,
    timeline,
    ninetyDay,
    keyHires: keyHires.slice(0, 3),
    regulatoryChecklist: REG_BY_LOAD[reg],
    burnLadder: BURN_BY_TIER[capital],
    stack: stack.map((s) => ({ name: s.name, description: s.description, url: s.url })),
    decisiveQuestion:
      reg === "HEAVY"
        ? "Can you compress regulatory time-to-yes from 18 months to 9, and still hold capital discipline?"
        : profile.tam === "₹10K Cr+"
        ? "What is your distribution moat in year 2, when capital flows in and incumbents notice?"
        : "What proof point in 90 days makes a Series A inevitable?",
  };
}
