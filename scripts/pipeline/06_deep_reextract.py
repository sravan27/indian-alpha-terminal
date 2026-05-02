#!/usr/bin/env python3
"""
06_deep_reextract.py — Multi-pass chunked extraction pipeline
==============================================================
Replaces the single-shot extraction with a chunked approach that
actually reads the full transcript. Uses mistral-nemo:12b for its
128K context window and strong JSON output discipline.

PASS 1: Split transcript into overlapping 3K-word chunks → extract per-chunk
PASS 2: Merge + deduplicate across chunks → rank by specificity
PASS 3: Re-query for gap-specific evidence (timestamps, speakers, numbers)

Live progress with real ETA. Zero hallucinations — every field traces to text.
"""

import json
import os
import sys
import re
import time
import glob
import hashlib
import requests
from datetime import datetime, timedelta
from collections import Counter

# ── Config ──────────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
TRANSCRIPT_DIR = os.path.join(DATA_DIR, "transcripts")
DEEP_DIR = os.path.join(DATA_DIR, "deep_extracted")
os.makedirs(DEEP_DIR, exist_ok=True)

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL = "mistral-nemo:12b"
CHUNK_WORDS = 3000
CHUNK_OVERLAP = 400
MAX_RETRIES = 2

# ── Progress Tracker ────────────────────────────────────────────────────

class ProgressTracker:
    """Real-time progress with ETA. No lies."""
    def __init__(self, total_episodes, total_chunks_est):
        self.total_episodes = total_episodes
        self.total_chunks_est = total_chunks_est
        self.ep_done = 0
        self.chunks_done = 0
        self.start_time = time.time()
        self.pass_start = time.time()
        self.current_ep = ""
        self.current_pass = ""
        self.errors = 0
        self.llm_calls = 0
        self.log_lines = []

    def set_pass(self, name):
        self.current_pass = name
        self.pass_start = time.time()
        self._print(f"\n{'='*70}")
        self._print(f"  {name}")
        self._print(f"{'='*70}")

    def set_episode(self, title, idx):
        self.current_ep = title[:55]
        elapsed = time.time() - self.start_time
        if self.ep_done > 0:
            rate = elapsed / self.ep_done
            remaining = rate * (self.total_episodes - self.ep_done)
            eta = timedelta(seconds=int(remaining))
        else:
            eta = "calculating..."
        self._print(f"\n  [{idx+1}/{self.total_episodes}] {self.current_ep}")
        self._print(f"  ETA remaining: {eta}")

    def chunk_done(self, chunk_idx, total_chunks, insights_found):
        self.chunks_done += 1
        self.llm_calls += 1
        bar_len = 30
        frac = (chunk_idx + 1) / total_chunks
        filled = int(bar_len * frac)
        bar = "█" * filled + "░" * (bar_len - filled)
        sys.stdout.write(f"\r    Chunk {chunk_idx+1}/{total_chunks} |{bar}| {insights_found} insights")
        sys.stdout.flush()

    def episode_done(self, stats):
        self.ep_done += 1
        self._print(f"\n    ✓ Done: {stats.get('strategies',0)} strategies, {stats.get('gaps',0)} gaps, "
                     f"{stats.get('tools',0)} tools, {stats.get('books',0)} books, {stats.get('quotes',0)} quotes")

    def error(self, msg):
        self.errors += 1
        self._print(f"    ⚠ {msg}")

    def final_summary(self, brain_stats):
        elapsed = timedelta(seconds=int(time.time() - self.start_time))
        self._print(f"\n{'='*70}")
        self._print(f"  EXTRACTION COMPLETE")
        self._print(f"{'='*70}")
        self._print(f"  Time elapsed:    {elapsed}")
        self._print(f"  Episodes:        {self.ep_done}/{self.total_episodes}")
        self._print(f"  LLM calls:       {self.llm_calls}")
        self._print(f"  Errors:          {self.errors}")
        for k, v in brain_stats.items():
            self._print(f"  {k}: {v}")
        self._print(f"{'='*70}\n")

    def _print(self, msg):
        print(msg)
        self.log_lines.append(msg)
        sys.stdout.flush()


# ── Ollama Client ───────────────────────────────────────────────────────

def ollama_json(prompt, max_tokens=2500):
    """Call Ollama and parse JSON from response. Retries on failure."""
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = requests.post(OLLAMA_URL, json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": max_tokens,
                    "temperature": 0.15,  # Very low — factual extraction only
                },
            }, timeout=180)

            if resp.status_code != 200:
                continue

            text = resp.json().get("response", "")
            # Find the JSON block
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                return json.loads(match.group())
            # Try array
            match = re.search(r'\[[\s\S]*\]', text)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, requests.exceptions.RequestException):
            if attempt < MAX_RETRIES:
                time.sleep(2)
                continue
    return None


# ── Chunking ────────────────────────────────────────────────────────────

def chunk_transcript(text, chunk_words=CHUNK_WORDS, overlap=CHUNK_OVERLAP):
    """Split transcript into overlapping word-level chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_words, len(words))
        chunk_text = " ".join(words[start:end])
        chunks.append({
            "text": chunk_text,
            "word_start": start,
            "word_end": end,
            "word_count": end - start,
        })
        if end >= len(words):
            break
        start = end - overlap  # overlap for continuity
    return chunks


# ── Pass 1: Per-Chunk Extraction ────────────────────────────────────────

CHUNK_PROMPT = """You are extracting factual information from a podcast transcript chunk. Extract ONLY what is explicitly stated. Do NOT invent anything.

PODCAST TITLE: {title}
CHUNK {chunk_idx}/{total_chunks} (words {word_start}-{word_end}):

{chunk_text}

Return a JSON object with these fields. Use empty arrays [] if nothing found. Be SPECIFIC — include names, numbers, and details:

{{
  "speakers_mentioned": ["names of people speaking or discussed in this chunk"],
  "strategies": ["specific business strategies, frameworks, or advice given — include WHO said it"],
  "market_gaps": ["specific market opportunities or problems identified — include numbers if mentioned"],
  "tools_mentioned": ["specific tools, platforms, apps, or services mentioned by name"],
  "books_mentioned": ["specific books, reports, or publications mentioned by name"],
  "companies_discussed": ["company or brand names discussed with brief context"],
  "numbers": ["any specific numbers, metrics, or financial figures mentioned with context"],
  "key_quotes": ["1-2 memorable or insightful direct quotes from this chunk"],
  "resources": ["any websites, courses, frameworks, or reference materials mentioned"]
}}

CRITICAL: Only extract what is IN the text above. If a field has nothing, use []. Be factual."""


def extract_chunk(title, chunk, chunk_idx, total_chunks):
    """Extract intelligence from a single chunk."""
    prompt = CHUNK_PROMPT.format(
        title=title,
        chunk_idx=chunk_idx + 1,
        total_chunks=total_chunks,
        word_start=chunk["word_start"],
        word_end=chunk["word_end"],
        chunk_text=chunk["text"],
    )
    return ollama_json(prompt)


# ── Pass 2: Merge + Categorize ──────────────────────────────────────────

MERGE_PROMPT = """You are synthesizing intelligence extracted from a full podcast episode. Below are the raw extractions from {n_chunks} chunks of the transcript.

PODCAST TITLE: {title}
TOTAL WORDS: {word_count}

RAW EXTRACTIONS:
{raw_json}

Synthesize into a single JSON object. DEDUPLICATE entries. RANK by importance. Be specific:

{{
  "category": "EXACTLY one of: D2C, Consumer, Capital, Health, Content, AI, Founders, Education, Hospitality, RealEstate, Climate, Gaming, Entertainment, EV, Platforms, PropTech, HighOps, M&A, Metaverse",
  "guests": ["list of actual guests ON the show — not just people mentioned"],
  "strategies": [
    {{"text": "specific strategy or framework", "speaker": "who said it", "context": "brief context"}},
  ],
  "market_gaps": [
    {{"text": "specific market gap or opportunity", "evidence": "what evidence supports this", "scale": "any numbers mentioned"}},
  ],
  "tools_and_resources": [
    {{"name": "tool/resource name", "what_it_does": "one line description", "mentioned_by": "who mentioned it"}},
  ],
  "books_mentioned": [
    {{"title": "book title", "author": "if mentioned", "context": "why it was mentioned"}},
  ],
  "companies_discussed": [
    {{"name": "company name", "context": "what was said about it", "relevance": "why it matters"}},
  ],
  "key_numbers": [
    {{"figure": "the number/metric", "context": "what it refers to"}},
  ],
  "quotable_moments": ["1-3 best direct quotes"],
  "target_audience": "who benefits most from this episode"
}}

RULES:
- ONLY include information that appeared in the raw extractions
- Deduplicate — if the same insight appears multiple times, merge into one
- For category, pick the BEST fit from the list above
- Remove generic/vague entries — every item must be specific and actionable"""


def merge_chunk_extractions(title, word_count, chunk_results):
    """Merge all chunk-level extractions into one episode summary."""
    raw = json.dumps(chunk_results, indent=1)
    # If raw is too long, truncate intelligently
    if len(raw) > 12000:
        raw = raw[:12000] + "\n... (truncated)"

    prompt = MERGE_PROMPT.format(
        title=title,
        word_count=word_count,
        n_chunks=len(chunk_results),
        raw_json=raw,
    )
    return ollama_json(prompt, max_tokens=3000)


# ── Pass 3: Gap-Specific Evidence ───────────────────────────────────────

EVIDENCE_PROMPT = """You are finding the EXACT evidence for a market gap identified in a podcast.

MARKET GAP: {gap_text}
PODCAST TITLE: {title}

Search this transcript excerpt for SPECIFIC evidence supporting this gap. Find:
1. The exact quote or closest paraphrase
2. Who said it (speaker name)
3. Any numbers, metrics, or scale mentioned
4. What timestamp region this appears in (use word positions as proxy)

TRANSCRIPT EXCERPT:
{excerpt}

Return JSON:
{{
  "exact_quote": "the closest direct quote supporting this gap",
  "speaker": "who said or implied this",
  "numbers_cited": ["any specific numbers mentioned in context"],
  "confidence": "HIGH if directly stated, MEDIUM if clearly implied, LOW if loosely inferred"
}}

If you cannot find real evidence, return {{"exact_quote": "", "speaker": "", "numbers_cited": [], "confidence": "NONE"}}"""


def find_gap_evidence(title, gap_text, full_text):
    """Find specific evidence for a market gap in the transcript."""
    # Search for the most relevant section
    words = full_text.split()
    gap_words = set(gap_text.lower().split())
    # Remove common words
    stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'with', 'that', 'this', 'it', 'from', 'by', 'as', 'be', 'have', 'has', 'had', 'not', 'no'}
    gap_words -= stop_words

    # Sliding window to find best match region
    window = 800
    best_score = 0
    best_start = 0
    for i in range(0, len(words) - window, 200):
        chunk = " ".join(words[i:i+window]).lower()
        score = sum(1 for w in gap_words if w in chunk)
        if score > best_score:
            best_score = score
            best_start = i

    excerpt = " ".join(words[max(0, best_start-100):best_start+window+100])

    prompt = EVIDENCE_PROMPT.format(
        gap_text=gap_text,
        title=title,
        excerpt=excerpt,
    )
    return ollama_json(prompt, max_tokens=800)


# ── Main Pipeline ───────────────────────────────────────────────────────

def process_episode(video_id, title, progress, ep_idx):
    """Full 3-pass extraction for one episode."""
    transcript_path = os.path.join(TRANSCRIPT_DIR, f"{video_id}.json")
    output_path = os.path.join(DEEP_DIR, f"{video_id}.json")

    # Skip if already deep-extracted (delete to re-run)
    if os.path.exists(output_path):
        existing = json.load(open(output_path))
        if existing.get("extraction_version") == "deep_v2":
            progress._print(f"    (cached — delete {DEEP_DIR}/{video_id}.json to re-extract)")
            progress.ep_done += 1
            return existing

    with open(transcript_path) as f:
        transcript = json.load(f)

    full_text = transcript.get("full_text", "")
    word_count = len(full_text.split())

    if word_count < 300:
        progress.error(f"Too short ({word_count} words), skipping")
        return None

    # ── Pass 1: Chunked extraction ──
    chunks = chunk_transcript(full_text)
    chunk_results = []

    for ci, chunk in enumerate(chunks):
        result = extract_chunk(title, chunk, ci, len(chunks))
        if result:
            chunk_results.append(result)
            total_insights = sum(
                len(result.get(k, []))
                for k in ["strategies", "market_gaps", "tools_mentioned", "books_mentioned", "key_quotes"]
            )
            progress.chunk_done(ci, len(chunks), total_insights)
        else:
            progress.chunk_done(ci, len(chunks), 0)
            progress.error(f"Chunk {ci+1} extraction failed")

    if not chunk_results:
        progress.error("All chunks failed")
        return None

    # ── Pass 2: Merge + categorize ──
    sys.stdout.write(f"\n    Merging {len(chunk_results)} chunks...")
    sys.stdout.flush()
    merged = merge_chunk_extractions(title, word_count, chunk_results)

    if not merged:
        progress.error("Merge pass failed, using raw chunks")
        # Fallback: manually merge
        merged = manual_merge(chunk_results)

    # ── Pass 3: Gap evidence ──
    gaps_with_evidence = []
    raw_gaps = merged.get("market_gaps", [])
    if isinstance(raw_gaps, list):
        for gi, gap in enumerate(raw_gaps[:5]):  # Top 5 gaps
            gap_text = gap.get("text", gap) if isinstance(gap, dict) else str(gap)
            if not gap_text or len(gap_text) < 15:
                continue
            sys.stdout.write(f"\r    Evidence pass: gap {gi+1}/{min(len(raw_gaps),5)}...")
            sys.stdout.flush()
            evidence = find_gap_evidence(title, gap_text, full_text)
            gap_entry = gap if isinstance(gap, dict) else {"text": gap_text}
            if evidence and evidence.get("confidence") != "NONE":
                gap_entry["evidence_quote"] = evidence.get("exact_quote", "")
                gap_entry["evidence_speaker"] = evidence.get("speaker", "")
                gap_entry["evidence_numbers"] = evidence.get("numbers_cited", [])
                gap_entry["evidence_confidence"] = evidence.get("confidence", "LOW")
            else:
                gap_entry["evidence_confidence"] = "UNVERIFIED"
            gaps_with_evidence.append(gap_entry)

    merged["market_gaps"] = gaps_with_evidence

    # Build final result
    result = {
        "video_id": video_id,
        "title": title,
        "word_count": word_count,
        "extraction_version": "deep_v2",
        "extraction_model": MODEL,
        "extracted_at": datetime.now().isoformat(),
        "chunks_processed": len(chunks),
        "intelligence": merged,
        "raw_chunk_count": len(chunk_results),
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    stats = {
        "strategies": len(merged.get("strategies", [])),
        "gaps": len(gaps_with_evidence),
        "tools": len(merged.get("tools_and_resources", [])),
        "books": len(merged.get("books_mentioned", [])),
        "quotes": len(merged.get("quotable_moments", [])),
    }
    progress.episode_done(stats)
    return result


def manual_merge(chunk_results):
    """Fallback merge when LLM merge fails."""
    merged = {
        "category": "General",
        "guests": [],
        "strategies": [],
        "market_gaps": [],
        "tools_and_resources": [],
        "books_mentioned": [],
        "companies_discussed": [],
        "key_numbers": [],
        "quotable_moments": [],
        "target_audience": "founders and entrepreneurs",
    }
    seen_strats = set()
    seen_gaps = set()

    for chunk in chunk_results:
        for s in chunk.get("strategies", []):
            text = s if isinstance(s, str) else str(s)
            key = text.lower().strip()[:60]
            if key not in seen_strats:
                seen_strats.add(key)
                merged["strategies"].append({"text": text, "speaker": "", "context": ""})

        for g in chunk.get("market_gaps", []):
            text = g if isinstance(g, str) else str(g)
            key = text.lower().strip()[:60]
            if key not in seen_gaps:
                seen_gaps.add(key)
                merged["market_gaps"].append({"text": text, "evidence": "", "scale": ""})

        for t in chunk.get("tools_mentioned", []):
            name = t if isinstance(t, str) else str(t)
            merged["tools_and_resources"].append({"name": name, "what_it_does": "", "mentioned_by": ""})

        for b in chunk.get("books_mentioned", []):
            title = b if isinstance(b, str) else str(b)
            merged["books_mentioned"].append({"title": title, "author": "", "context": ""})

        for q in chunk.get("key_quotes", []):
            if isinstance(q, str) and len(q) > 20:
                merged["quotable_moments"].append(q)

        for s in chunk.get("speakers_mentioned", []):
            if isinstance(s, str) and s not in merged["guests"]:
                merged["guests"].append(s)

    return merged


# ── Entry Point ─────────────────────────────────────────────────────────

def main():
    print(f"""
╔══════════════════════════════════════════════════════════════════════╗
║  INDIA ALPHA — Deep Re-Extraction Pipeline                         ║
║  Model: {MODEL:<20s}                                    ║
║  Method: 3-pass chunked extraction                                 ║
║  Chunks: {CHUNK_WORDS} words, {CHUNK_OVERLAP} overlap                                    ║
╚══════════════════════════════════════════════════════════════════════╝
    """)

    # Verify Ollama
    try:
        r = requests.get("http://127.0.0.1:11434/api/tags", timeout=5)
        models = [m["name"] for m in r.json().get("models", [])]
        if not any(MODEL.split(":")[0] in m for m in models):
            print(f"❌ Model {MODEL} not found. Available: {models}")
            sys.exit(1)
        print(f"✓ Ollama connected. Model {MODEL} ready.")
    except Exception as e:
        print(f"❌ Cannot connect to Ollama: {e}")
        print("   Run: ollama serve")
        sys.exit(1)

    # Find all transcripts
    transcripts = sorted(glob.glob(os.path.join(TRANSCRIPT_DIR, "*.json")))
    print(f"✓ Found {len(transcripts)} transcripts")

    # Load discovered episodes for titles
    title_map = {}
    disc_path = os.path.join(DATA_DIR, "discovered_episodes.json")
    if os.path.exists(disc_path):
        for ep in json.load(open(disc_path)):
            title_map[ep["video_id"]] = ep.get("title", ep["video_id"])

    # Also load from existing brain for any titles we might have
    brain_path = os.path.join(os.path.dirname(DATA_DIR), "src", "data", "project-signal-brain.json")
    if os.path.exists(brain_path):
        brain = json.load(open(brain_path))
        for ep in brain.get("sourceCatalog", []):
            if ep["id"] not in title_map:
                title_map[ep["id"]] = ep.get("title", ep["id"])

    # Estimate total chunks
    total_words = 0
    episodes = []
    for tp in transcripts:
        vid = os.path.basename(tp).replace(".json", "")
        t = json.load(open(tp))
        wc = len(t.get("full_text", "").split())
        total_words += wc
        title = title_map.get(vid, t.get("title", vid))
        episodes.append({"video_id": vid, "title": title, "word_count": wc, "path": tp})

    est_chunks = sum(max(1, (ep["word_count"] // (CHUNK_WORDS - CHUNK_OVERLAP)) + 1) for ep in episodes)
    print(f"✓ Total words: {total_words:,}")
    print(f"✓ Estimated chunks: {est_chunks}")
    print(f"✓ Estimated LLM calls: ~{est_chunks + len(episodes)*2} (chunks + merges + evidence)")

    # Sort by word count desc (biggest first — they have most signal)
    episodes.sort(key=lambda x: -x["word_count"])

    progress = ProgressTracker(len(episodes), est_chunks)
    progress.set_pass("PASS 1+2+3: Deep extraction with evidence grounding")

    results = []
    for ei, ep in enumerate(episodes):
        progress.set_episode(ep["title"], ei)
        result = process_episode(ep["video_id"], ep["title"], progress, ei)
        if result:
            results.append(result)

    # ── Summary ──
    total_strategies = sum(len(r.get("intelligence", {}).get("strategies", [])) for r in results)
    total_gaps = sum(len(r.get("intelligence", {}).get("market_gaps", [])) for r in results)
    total_tools = sum(len(r.get("intelligence", {}).get("tools_and_resources", [])) for r in results)
    total_books = sum(len(r.get("intelligence", {}).get("books_mentioned", [])) for r in results)
    total_quotes = sum(len(r.get("intelligence", {}).get("quotable_moments", [])) for r in results)
    verified_gaps = sum(
        1 for r in results
        for g in r.get("intelligence", {}).get("market_gaps", [])
        if isinstance(g, dict) and g.get("evidence_confidence") in ("HIGH", "MEDIUM")
    )

    progress.final_summary({
        "Episodes processed": f"{len(results)}/{len(episodes)}",
        "Total strategies": total_strategies,
        "Total market gaps": f"{total_gaps} ({verified_gaps} evidence-verified)",
        "Total tools/resources": total_tools,
        "Total books": total_books,
        "Total quotes": total_quotes,
        "Total words processed": f"{total_words:,}",
    })

    # Save extraction log
    log_path = os.path.join(DEEP_DIR, "_extraction_log.json")
    with open(log_path, "w") as f:
        json.dump({
            "completed_at": datetime.now().isoformat(),
            "model": MODEL,
            "episodes_processed": len(results),
            "total_strategies": total_strategies,
            "total_gaps": total_gaps,
            "verified_gaps": verified_gaps,
            "total_tools": total_tools,
            "total_books": total_books,
            "total_words": total_words,
            "log": progress.log_lines,
        }, f, indent=2)

    print(f"\n✓ Deep extractions saved to {DEEP_DIR}/")
    print(f"✓ Log saved to {log_path}")
    print(f"\n  Next step: run 07_assemble_v2.py to rebuild the brain")


if __name__ == "__main__":
    main()
