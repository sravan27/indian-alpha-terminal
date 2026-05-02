/**
 * Strict types for the bundled, hand-curated intelligence payload.
 *
 * The shape mirrors the runtime contents of
 * `src/data/project-signal-brain.json`. This file is the contract — if the
 * data pipeline emits a new field, add it here so the UI can rely on it
 * rather than reaching through `as any`.
 */

export interface BrainMeta {
  productName: string;
  generatedAt: string;
  indexedEpisodeCount: number;
  deepExtractedCount?: number;
  resourceCount?: number;
  creatorCount?: number;
  guestCount: number;
  categoryCount: number;
  playbookCount: number;
  verifiedPlaybookCount?: number;
  crossShowGuestCount: number;
  totalWordsProcessed?: number;
  totalStrategies?: number;
  totalMarketGaps?: number;
  totalLibraryResources?: number;
  extractionMethod: string;
  note?: string;
}

export interface Creator {
  id: string;
  name: string;
  show: string;
  handle: string;
  description: string;
  sourceUrl: string;
}

export interface FounderTool {
  name: string;
  url: string;
  description: string;
}

export interface TopicCluster {
  id: string;
  category: string;
  episodeCount: number;
  episodeIds: string[];
  guests: string[];
  guestCount: number;
  topStrategies: string[];
  marketGaps: string[];
  resources: string[];
  founderTools: FounderTool[];
  color?: string;
}

export interface GuestNode {
  id: string;
  name: string;
  episodeIds: string[];
  episodeCount: number;
  shows: string[];
  categories: string[];
  coGuests: string[];
  isCrossShow: boolean;
}

export interface PlaybookStep {
  step: number;
  title: string;
  detail: string;
}

export interface PlaybookResource {
  name: string;
  description: string;
  url?: string;
}

export interface MasterPlaybook {
  id: string;
  title: string;
  subtitle: string;
  steps: PlaybookStep[];
  episodeIds: string[];
  resources: PlaybookResource[];
  category?: string;
  /** Hand-curated dossier metadata (populated when verified is true) */
  thesis?: string;
  summary?: string;
  audience?: string;
  marketGap?: string;
  tags?: string[];
  creator?: string;
  published?: string;
  duration?: string;
  sourceUrl?: string;
  videoId?: string;
  verified?: boolean;
}

export interface Snippet {
  text: string;
  startSeconds: number;
  endSeconds: number;
  timestamp: string;
  relevance: number;
  episodeId: string;
}

export interface RelatedEpisode {
  id: string;
  title: string;
  reason: string;
}

export interface Episode {
  id: string;
  creatorId: string;
  publishedOrder: number;
  duration: string;
  title: string;
  guests: string[];
  tags: string[];
  sourceUrl: string;
  status: string;
  category: string;
  strategySnippets: Snippet[];
  opportunitySnippets: Snippet[];
  resourceMentions: string[];
  highlightSnippets: Snippet[];
  resourceString: string;
  founderTools: FounderTool[];
  booksMentioned: string[];
  toolsMentioned: string[];
  quotableMoments: string[];
  targetAudience: string;
  wordCount: number;
  extractionMethod: string;
  entitiesPersons: string[];
  entitiesOrgs: string[];
  entitiesProducts: string[];
  entitiesMoney: string[];
  relatedEpisodes: RelatedEpisode[];
}

export interface FounderLibraryItem {
  name: string;
  url: string;
  description: string;
  kind: string;
  tag?: string;
}

export interface FounderLibrarySection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  items: FounderLibraryItem[];
}

export interface FounderLibrary {
  _about?: {
    title: string;
    purpose: string;
    verifiedAt: string;
    rule: string;
  };
  sections: FounderLibrarySection[];
}

export interface BrainData {
  meta: BrainMeta;
  creators: Creator[];
  topicClusters: TopicCluster[];
  guestNetwork: GuestNode[];
  masterPlaybooks: MasterPlaybook[];
  crossShowGuests: string[];
  sourceCatalog: Episode[];
  founderToolsByCategory: Record<string, FounderTool[]>;
  resourceFamilies?: unknown[];
  founderLibrary?: FounderLibrary;
}

// ---------------------------------------------------------------------------
//  Tauri command DTOs (must match `src-tauri/src/lib.rs`)
// ---------------------------------------------------------------------------

export interface SearchResult {
  video_id: string;
  title: string;
  snippet: string;
  category: string;
  rank: number;
}

export interface EpisodeMetadata {
  video_id: string;
  title: string;
  category: string;
  guests: string;
  strategies: string;
  market_gaps: string;
}

export interface TranscriptExcerpt {
  start_sec: number;
  duration: number;
  text: string;
}

export interface OfflineStatus {
  db_path: string;
  db_size_bytes: number;
  episode_count: number;
  transcript_chunks: number;
  fts_documents: number;
  schema_version: string;
  bundled: boolean;
}
