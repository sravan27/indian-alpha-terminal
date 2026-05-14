/**
 * Copilot Engine
 * ===============
 * The "brain behind the brain" — a deterministic synthesis engine that
 * gives the copilot conversation memory, multi-source retrieval, and
 * citation-first responses.
 *
 * Architecture:
 *   1. Query → Intent Detection (person / sector / strategy / resource / how-to)
 *   2. Intent → Multi-source retrieval (brain JSON + FTS + library + clusters)
 *   3. Evidence stack → Ranked, deduplicated, cited
 *   4. Session context → Previous queries inform current retrieval
 *
 * 100% offline. No LLM. Deterministic. Microsecond cost.
 */

import type {
  BrainData,
  Episode,
  GuestNode,
  MasterPlaybook,
  TopicCluster,
  FounderLibrary,
  FounderLibraryItem,
  FounderLibrarySection,
} from "./brain-types";
import { searchTranscripts, getEpisodeExcerpts } from "./tauri-client";
import type { SearchResult, TranscriptExcerpt } from "./brain-types";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export type QueryIntent =
  | "person"     // "What did Aman Gupta say about hiring?"
  | "sector"     // "Tell me about D2C in India"
  | "strategy"   // "How should I price my product?"
  | "resource"   // "What books were recommended?"
  | "comparison" // "Compare D2C vs marketplace"
  | "howto"      // "How do I raise my first round?"
  | "general";   // Fallback

export interface CopilotEvidence {
  type: "episode" | "strategy" | "market-gap" | "playbook" | "library" | "operator" | "transcript";
  title: string;
  detail: string;
  citation: string;
  relevance: number;
  episodeId?: string;
  timestamp?: string;
  url?: string;
}

export interface CopilotResponse {
  answer: string;
  evidence: CopilotEvidence[];
  relatedThreads: string[];
  suggestedFollowups: string[];
  searchedSources: {
    episodes: number;
    strategies: number;
    transcriptChunks: number;
    libraryResources: number;
  };
}

export interface SessionMessage {
  role: "user" | "alpha";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
//  Session Context
// ---------------------------------------------------------------------------

export class CopilotSession {
  messages: SessionMessage[] = [];
  private topics: Set<string> = new Set();
  private mentionedPersons: Set<string> = new Set();
  private mentionedSectors: Set<string> = new Set();

  addUserMessage(content: string) {
    this.messages.push({ role: "user", content, timestamp: Date.now() });
    // Track context
    this.extractContextFromQuery(content);
  }

  addAlphaResponse(content: string) {
    this.messages.push({ role: "alpha", content, timestamp: Date.now() });
  }

  getRecentContext(): string {
    return this.messages
      .slice(-6)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
  }

  getContextualTerms(): string[] {
    return [
      ...this.topics,
      ...this.mentionedPersons,
      ...this.mentionedSectors,
    ];
  }

  private extractContextFromQuery(query: string) {
    const lower = query.toLowerCase();
    const sectors = [
      "d2c", "consumer", "health", "capital", "ai", "ev", "content",
      "hospitality", "education", "gaming", "real estate", "climate",
      "beauty", "skincare", "fintech", "saas", "ecommerce",
    ];
    for (const s of sectors) {
      if (lower.includes(s)) this.mentionedSectors.add(s);
    }
  }

  clear() {
    this.messages = [];
    this.topics.clear();
    this.mentionedPersons.clear();
    this.mentionedSectors.clear();
  }
}

// ---------------------------------------------------------------------------
//  Intent Detection
// ---------------------------------------------------------------------------

const PERSON_PATTERNS = [
  /what did (.+?) say/i,
  /tell me about (.+?)(?:\s*$|\s+and|\s+in)/i,
  /who is (.+)/i,
  /(.+?)(?:'s|'s) (?:view|opinion|take|strategy|advice)/i,
];

const SECTOR_KEYWORDS = [
  "d2c", "consumer", "health", "capital", "ai", "ev", "content",
  "hospitality", "education", "gaming", "real estate", "climate",
  "beauty", "skincare", "fintech", "saas", "ecommerce", "alcohol",
  "biotech", "restaurant", "craft beverage", "longevity", "wellness",
  "venture capital", "fundraising", "brand building", "creator economy",
];

const HOWTO_PATTERNS = [
  /how (?:do|should|can|to)/i,
  /what(?:'s| is) the (?:best|right) way/i,
  /steps to/i,
  /guide (?:to|for)/i,
  /playbook for/i,
];

const RESOURCE_PATTERNS = [
  /(?:book|tool|resource|fund|scheme|grant|app|platform)s?\b/i,
  /what (?:should I|can I) (?:read|use|try)/i,
  /recommend/i,
];

const COMPARISON_PATTERNS = [
  /compare|vs\.?|versus|difference between|better/i,
];

export function detectIntent(query: string, brain: BrainData): QueryIntent {
  const q = query.toLowerCase();

  // Check if query mentions a known guest
  const isPersonQuery = brain.guestNetwork?.some(
    (g) => q.includes(g.name.toLowerCase())
  );
  if (isPersonQuery) return "person";

  // Pattern-based detection
  for (const p of PERSON_PATTERNS) {
    if (p.test(query)) return "person";
  }
  if (COMPARISON_PATTERNS.some((p) => p.test(query))) return "comparison";
  if (HOWTO_PATTERNS.some((p) => p.test(query))) return "howto";
  if (RESOURCE_PATTERNS.some((p) => p.test(query))) return "resource";

  // Sector keyword match
  if (SECTOR_KEYWORDS.some((kw) => q.includes(kw))) return "sector";

  return "general";
}

// ---------------------------------------------------------------------------
//  Multi-Source Retrieval
// ---------------------------------------------------------------------------

function scoreTextMatch(text: string, queryTokens: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (lower.includes(token)) {
      score += token.length > 4 ? 3 : 1;
    }
  }
  return score;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

function findMatchingEpisodes(
  query: string,
  brain: BrainData,
  limit = 8,
): { episode: Episode; score: number }[] {
  const tokens = tokenize(query);
  const results: { episode: Episode; score: number }[] = [];

  for (const ep of brain.sourceCatalog ?? []) {
    const blob = [
      ep.title,
      ep.category,
      ...(ep.guests ?? []),
      ...(ep.tags ?? []),
      ...(ep.strategySnippets ?? []).map((s) => s.text),
      ...(ep.opportunitySnippets ?? []).map((s) => s.text),
    ].join(" ");

    const score = scoreTextMatch(blob, tokens);
    if (score > 0) {
      results.push({ episode: ep, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findMatchingOperators(
  query: string,
  brain: BrainData,
  limit = 5,
): GuestNode[] {
  const tokens = tokenize(query);
  const results: { guest: GuestNode; score: number }[] = [];

  for (const g of brain.guestNetwork ?? []) {
    const blob = [
      g.name,
      ...(g.categories ?? []),
      ...(g.coGuests ?? []),
    ].join(" ");

    const score = scoreTextMatch(blob, tokens);
    if (score > 0) {
      results.push({ guest: g, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.guest);
}

function findMatchingPlaybooks(
  query: string,
  brain: BrainData,
  limit = 3,
): MasterPlaybook[] {
  const tokens = tokenize(query);
  const results: { pb: MasterPlaybook; score: number }[] = [];

  for (const pb of brain.masterPlaybooks ?? []) {
    const blob = [
      pb.title,
      pb.subtitle,
      pb.category ?? "",
      pb.thesis ?? "",
      ...(pb.steps ?? []).map((s) => s.detail),
    ].join(" ");

    const score = scoreTextMatch(blob, tokens);
    if (score > 0) {
      results.push({ pb, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.pb);
}

function findMatchingLibraryItems(
  query: string,
  library: FounderLibrary | undefined,
  limit = 5,
): { item: FounderLibraryItem; section: string }[] {
  if (!library?.sections) return [];
  const tokens = tokenize(query);
  const results: { item: FounderLibraryItem; section: string; score: number }[] = [];

  for (const section of library.sections) {
    for (const item of section.items) {
      const blob = [item.name, item.description, item.kind ?? ""].join(" ");
      const score = scoreTextMatch(blob, tokens);
      if (score > 0) {
        results.push({ item, section: section.title, score });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findMatchingClusters(
  query: string,
  brain: BrainData,
  limit = 3,
): TopicCluster[] {
  const tokens = tokenize(query);
  const results: { cluster: TopicCluster; score: number }[] = [];

  for (const c of brain.topicClusters ?? []) {
    const blob = [
      c.category,
      ...(c.guests ?? []),
      ...(c.topStrategies ?? []),
      ...(c.marketGaps ?? []),
    ].join(" ");

    const score = scoreTextMatch(blob, tokens);
    if (score > 0) {
      results.push({ cluster: c, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.cluster);
}

// ---------------------------------------------------------------------------
//  Evidence Builder
// ---------------------------------------------------------------------------

function buildEvidenceStack(
  query: string,
  brain: BrainData,
  transcriptResults: SearchResult[],
): CopilotEvidence[] {
  const evidence: CopilotEvidence[] = [];
  const tokens = tokenize(query);

  // 1. Transcript search results (from Tauri FTS)
  for (const tr of transcriptResults) {
    const ep = brain.sourceCatalog?.find((e) => e.id === tr.video_id);
    evidence.push({
      type: "transcript",
      title: tr.title || ep?.title || tr.video_id,
      detail: tr.snippet.replace(/<\/?mark>/g, "**"),
      citation: `[${tr.title || tr.video_id}]`,
      relevance: Math.abs(tr.rank) * 10,
      episodeId: tr.video_id,
      url: ep?.sourceUrl,
    });
  }

  // 2. Strategy snippets from matched episodes
  const matchedEps = findMatchingEpisodes(query, brain, 6);
  for (const { episode, score } of matchedEps) {
    for (const strat of episode.strategySnippets ?? []) {
      const stratScore = scoreTextMatch(strat.text, tokens);
      if (stratScore > 0 || score > 4) {
        evidence.push({
          type: "strategy",
          title: `Strategy from "${episode.title}"`,
          detail: strat.text,
          citation: `[${episode.title} @ ${strat.timestamp || "—"}]`,
          relevance: stratScore + score,
          episodeId: episode.id,
          timestamp: strat.timestamp,
          url: episode.sourceUrl,
        });
      }
    }

    // 3. Market gaps
    for (const opp of episode.opportunitySnippets ?? []) {
      const oppScore = scoreTextMatch(opp.text, tokens);
      if (oppScore > 0 || score > 4) {
        evidence.push({
          type: "market-gap",
          title: `Market Gap — ${episode.category}`,
          detail: opp.text,
          citation: `[${episode.title}]`,
          relevance: oppScore + score,
          episodeId: episode.id,
          url: episode.sourceUrl,
        });
      }
    }
  }

  // 4. Playbooks
  const playbooks = findMatchingPlaybooks(query, brain, 2);
  for (const pb of playbooks) {
    const steps = (pb.steps ?? []).map((s) => `${s.step}. ${s.detail}`).join(" → ");
    evidence.push({
      type: "playbook",
      title: pb.title,
      detail: steps.slice(0, 400),
      citation: `[Playbook: ${pb.title}]`,
      relevance: 8,
      url: pb.sourceUrl,
    });
  }

  // 5. Library resources
  const libItems = findMatchingLibraryItems(query, brain.founderLibrary);
  for (const { item, section } of libItems) {
    evidence.push({
      type: "library",
      title: item.name,
      detail: item.description,
      citation: `[Library → ${section} → ${item.name}]`,
      relevance: 5,
      url: item.url,
    });
  }

  // 6. Operators
  const operators = findMatchingOperators(query, brain, 4);
  for (const op of operators) {
    const shows = op.shows?.join(", ") || "—";
    const cats = op.categories?.join(", ") || "—";
    evidence.push({
      type: "operator",
      title: op.name,
      detail: `Appeared on ${shows} across ${op.episodeCount} episode(s) covering ${cats}. ${op.isCrossShow ? "Cross-show validator." : ""}`,
      citation: `[Operator: ${op.name}]`,
      relevance: op.episodeCount * 2 + (op.isCrossShow ? 5 : 0),
    });
  }

  // Sort by relevance, dedupe by first 60 chars of detail
  const seen = new Set<string>();
  return evidence
    .sort((a, b) => b.relevance - a.relevance)
    .filter((e) => {
      const key = e.detail.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 15);
}

// ---------------------------------------------------------------------------
//  Response Composer
// ---------------------------------------------------------------------------

function composeResponse(
  query: string,
  intent: QueryIntent,
  evidence: CopilotEvidence[],
  brain: BrainData,
): CopilotResponse {
  const parts: string[] = [];
  const relatedThreads: string[] = [];
  const suggestedFollowups: string[] = [];

  const episodeEvidence = evidence.filter((e) => e.type === "transcript" || e.type === "strategy");
  const gapEvidence = evidence.filter((e) => e.type === "market-gap");
  const playbookEvidence = evidence.filter((e) => e.type === "playbook");
  const libraryEvidence = evidence.filter((e) => e.type === "library");
  const operatorEvidence = evidence.filter((e) => e.type === "operator");

  if (evidence.length === 0) {
    const meta = brain.meta;
    parts.push(
      `I searched ${meta?.indexedEpisodeCount ?? 0} episodes and ${(meta?.totalWordsProcessed ?? 0).toLocaleString()} words of transcripts — **this specific topic isn't covered in the corpus yet.**`,
      "",
      "Try a related search, or explore these entry points:",
    );
    // Suggest top clusters
    for (const c of (brain.topicClusters ?? []).slice(0, 5)) {
      parts.push(`• **${c.category}** — ${c.episodeCount} episodes`);
    }
  } else {
    // Lead with the strongest evidence
    if (intent === "person" && operatorEvidence.length > 0) {
      const op = operatorEvidence[0];
      parts.push(`**${op.title}** — ${op.detail}`);
      parts.push("");
    }

    // Strategies / transcript evidence
    if (episodeEvidence.length > 0) {
      parts.push("### Key Insights");
      for (const e of episodeEvidence.slice(0, 4)) {
        parts.push(`\n> ${e.detail}\n> — ${e.citation}`);
      }
      parts.push("");
    }

    // Market gaps
    if (gapEvidence.length > 0) {
      parts.push("### Market Gaps Identified");
      for (const e of gapEvidence.slice(0, 3)) {
        parts.push(`• ${e.detail} ${e.citation}`);
      }
      parts.push("");
    }

    // Playbooks
    if (playbookEvidence.length > 0) {
      parts.push("### Relevant Playbooks");
      for (const e of playbookEvidence.slice(0, 2)) {
        parts.push(`📋 **${e.title}** — ${e.detail.slice(0, 200)}…`);
      }
      parts.push("");
    }

    // Library resources
    if (libraryEvidence.length > 0) {
      parts.push("### Resources");
      for (const e of libraryEvidence.slice(0, 4)) {
        parts.push(`🔗 [${e.title}](${e.url || "#"}) — ${e.detail}`);
      }
      parts.push("");
    }

    // Related threads
    const clusters = findMatchingClusters(query, brain, 3);
    for (const c of clusters) {
      relatedThreads.push(c.category);
    }
  }

  // Generate follow-ups based on intent
  if (intent === "person" && operatorEvidence.length > 0) {
    const name = operatorEvidence[0].title;
    suggestedFollowups.push(
      `What strategies did ${name} recommend?`,
      `Show me all episodes with ${name}`,
      `What market gaps were discussed with ${name}?`,
    );
  } else if (intent === "sector") {
    suggestedFollowups.push(
      "What are the biggest market gaps here?",
      "Show me the playbook for this sector",
      "Who are the key operators?",
    );
  } else if (intent === "howto") {
    suggestedFollowups.push(
      "What tools should I use?",
      "Who has done this successfully?",
      "What are the common mistakes?",
    );
  } else {
    suggestedFollowups.push(
      "Tell me more about this",
      "What are the capital requirements?",
      "Show me related market gaps",
    );
  }

  return {
    answer: parts.join("\n"),
    evidence,
    relatedThreads,
    suggestedFollowups: suggestedFollowups.slice(0, 3),
    searchedSources: {
      episodes: brain.sourceCatalog?.length ?? 0,
      strategies: evidence.filter((e) => e.type === "strategy").length,
      transcriptChunks: evidence.filter((e) => e.type === "transcript").length,
      libraryResources: evidence.filter((e) => e.type === "library").length,
    },
  };
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

export async function synthesize(
  query: string,
  brain: BrainData,
  session: CopilotSession,
): Promise<CopilotResponse> {
  // Add user message to session
  session.addUserMessage(query);

  // Detect intent
  const intent = detectIntent(query, brain);

  // Enrich query with session context for follow-ups
  let enrichedQuery = query;
  const contextTerms = session.getContextualTerms();
  if (
    contextTerms.length > 0 &&
    query.split(" ").length < 6 &&
    /\b(that|this|more|those|it|they|them)\b/i.test(query)
  ) {
    // Short follow-up query — inject context
    enrichedQuery = `${query} ${contextTerms.slice(0, 3).join(" ")}`;
  }

  // Multi-source retrieval
  // 1. Try native FTS search (will return [] in web mode)
  let transcriptResults: SearchResult[] = [];
  try {
    transcriptResults = await searchTranscripts(enrichedQuery, 10);
  } catch {
    // Web fallback — no FTS available
  }

  // 2. Build evidence from all sources
  const evidence = buildEvidenceStack(enrichedQuery, brain, transcriptResults);

  // 3. Compose response
  const response = composeResponse(query, intent, evidence, brain);

  // Add response to session
  session.addAlphaResponse(response.answer);

  return response;
}

/**
 * Quick stats about the corpus — used when the copilot introduces itself.
 */
export function corpusStats(brain: BrainData): string {
  const meta = brain.meta;
  const eps = meta?.indexedEpisodeCount ?? 0;
  const words = meta?.totalWordsProcessed ?? 0;
  const strats = meta?.totalStrategies ?? 0;
  const gaps = meta?.totalMarketGaps ?? 0;
  const lib = meta?.totalLibraryResources ?? 0;
  const guests = meta?.guestCount ?? 0;

  return `${eps} episodes · ${(words / 1000).toFixed(0)}K words · ${strats} strategies · ${gaps} market gaps · ${guests} operators · ${lib} verified resources\n\nAll offline. All cited. Ask me anything.`;
}
