#!/usr/bin/env python3
"""
Retry transcript ingestion for episodes that failed or were IP-blocked.

Uses youtube_transcript_api as the primary method (more reliable for
subtitle-only fetching) with yt-dlp as fallback.

Outputs json3-compatible files to data/transcripts/<video_id>.json so
the downstream synthesize_pitch_brain.py picks them up automatically.

100% offline after download — no LLM, no cloud API.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
TRANSCRIPT_DIR = DATA_DIR / "transcripts"
DEEP_DIR = DATA_DIR / "deep_extracted"
DISCOVERED_PATH = DATA_DIR / "discovered_episodes.json"
RESULTS_PATH = DATA_DIR / "ingest" / "retry_results.json"

TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)
(DATA_DIR / "ingest").mkdir(parents=True, exist_ok=True)


def get_missing_video_ids() -> list[dict[str, Any]]:
    """Return discovered episodes that don't have transcripts yet."""
    if not DISCOVERED_PATH.exists():
        print("ERROR: discovered_episodes.json not found")
        return []

    discovered = json.loads(DISCOVERED_PATH.read_text())
    have = {f.stem for f in TRANSCRIPT_DIR.glob("*.json")}

    missing = []
    for ep in discovered:
        vid = ep.get("video_id", "")
        if vid and vid not in have:
            missing.append(ep)
    return missing


def fetch_via_youtube_transcript_api(video_id: str) -> list[dict[str, Any]] | None:
    """Try fetching via youtube_transcript_api v1.2+ (pure HTTP, no browser needed)."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import (
            TranscriptsDisabled,
            NoTranscriptFound,
            VideoUnavailable,
        )
    except ImportError:
        print("  [WARN] youtube_transcript_api not installed")
        return None

    try:
        api = YouTubeTranscriptApi()
        transcript_list = api.list(video_id)

        transcript = None
        # Priority: manual English → auto English → any auto → any manual
        for lang_code in ["en", "en-US", "en-GB", "en-IN"]:
            try:
                transcript = transcript_list.find_transcript([lang_code])
                break
            except NoTranscriptFound:
                continue

        if transcript is None:
            try:
                transcript = transcript_list.find_generated_transcript(["en"])
            except NoTranscriptFound:
                # Try translating from Hindi or any available
                for t in transcript_list:
                    try:
                        transcript = t.translate("en")
                        break
                    except Exception:
                        continue

        if transcript is None:
            return None

        entries = transcript.fetch()
        # Convert to our standard format — entries are FetchedTranscriptSnippet objects
        segments = []
        for entry in entries:
            text = (entry.text if hasattr(entry, 'text') else entry.get("text", "")).strip()
            start = entry.start if hasattr(entry, 'start') else entry.get("start", 0)
            duration = entry.duration if hasattr(entry, 'duration') else entry.get("duration", 0)
            if not text or text.startswith("[") or len(text.split()) < 3:
                continue
            segments.append({
                "text": text,
                "start_sec": start,
                "duration": duration,
            })
        return segments if segments else None

    except (TranscriptsDisabled, VideoUnavailable) as e:
        print(f"  [SKIP] {type(e).__name__}: {e}")
        return None
    except Exception as e:
        print(f"  [ERR] youtube_transcript_api: {e}")
        return None


def fetch_via_ytdlp(video_id: str) -> list[dict[str, Any]] | None:
    """Fallback: use yt-dlp to download subtitles."""
    import subprocess
    import tempfile

    url = f"https://www.youtube.com/watch?v={video_id}"
    with tempfile.TemporaryDirectory() as tmpdir:
        outtmpl = os.path.join(tmpdir, "%(id)s.%(ext)s")
        result = subprocess.run(
            [
                sys.executable, "-m", "yt_dlp",
                "--skip-download",
                "--write-auto-sub",
                "--sub-langs", "en.*",
                "--sub-format", "json3",
                "-o", outtmpl,
                url,
            ],
            capture_output=True, text=True, timeout=60,
        )

        # Look for json3 output
        json3_files = list(Path(tmpdir).glob("*.json3"))
        if not json3_files:
            stderr_last = (result.stderr or "").strip().splitlines()
            err = stderr_last[-1] if stderr_last else "no output"
            print(f"  [SKIP] yt-dlp: {err[:120]}")
            return None

        payload = json.loads(json3_files[0].read_text())
        segments = []
        for event in payload.get("events", []):
            segs = event.get("segs")
            if not segs:
                continue
            text = "".join(part.get("utf8", "") for part in segs).strip()
            if not text or text.startswith("[") or len(text.split()) < 3:
                continue
            start = event.get("tStartMs", 0) / 1000
            duration = event.get("dDurationMs", 0) / 1000
            segments.append({
                "text": text,
                "start_sec": start,
                "duration": duration,
            })
        return segments if segments else None


def save_transcript(video_id: str, segments: list[dict[str, Any]]) -> int:
    """Save transcript in the format expected by the pipeline."""
    output_path = TRANSCRIPT_DIR / f"{video_id}.json"
    output_path.write_text(json.dumps({
        "video_id": video_id,
        "segments": segments,
        "segment_count": len(segments),
        "word_count": sum(len(s["text"].split()) for s in segments),
        "source": "retry_blocked_episodes",
    }, ensure_ascii=False, indent=2))
    word_count = sum(len(s["text"].split()) for s in segments)
    return word_count


def run_deep_extraction(video_id: str, title: str, creator_id: str,
                        segments: list[dict[str, Any]]) -> bool:
    """Run deterministic deep extraction on transcript segments.
    
    Extracts strategies, market gaps, and quotable moments using the same
    keyword-scoring approach as the main ingest pipeline. No LLM needed.
    """
    full_text = " ".join(s["text"] for s in segments).lower()
    word_count = sum(len(s["text"].split()) for s in segments)

    # Strategy extraction (same terms as ingest_project_signal.py)
    STRATEGY_TERMS = [
        "build", "start", "focus", "distribution", "brand", "customer",
        "market", "retention", "profit", "pricing", "margin", "wealth",
        "hire", "team", "capital", "scale", "founder", "audience",
        "community", "product",
    ]
    STRATEGY_SIGNAL = [
        "should", "need", "have to", "must", "don't", "first",
        "then", "because", "when you",
    ]
    OPPORTUNITY_TERMS = [
        "opportunity", "gap", "problem", "broken", "missing",
        "underserved", "underpenetrated", "white space", "category",
        "india", "tier 2", "tier 3", "consumer",
    ]
    BAD_PHRASES = [
        "welcome to", "thank you so much", "what happened",
        "how are you", "i remember", "calling me here",
    ]

    strategies = []
    market_gaps = []
    quotable = []

    for seg in segments:
        text = seg["text"].strip()
        lowered = text.lower()
        words = text.split()

        if len(words) < 8 or len(words) > 60:
            continue
        if any(bp in lowered for bp in BAD_PHRASES):
            continue

        # Score for strategies
        strat_score = sum(2 for t in STRATEGY_TERMS if t in lowered)
        strat_score += sum(3 for t in STRATEGY_SIGNAL if t in lowered)
        if strat_score >= 8 and sum(1 for t in STRATEGY_TERMS if t in lowered) >= 2:
            strategies.append({
                "text": text,
                "speaker": "",
                "timestamp": f"{int(seg['start_sec']//60)}:{int(seg['start_sec']%60):02d}",
            })

        # Score for market gaps
        opp_score = sum(2 for t in OPPORTUNITY_TERMS if t in lowered)
        if opp_score >= 6:
            market_gaps.append({
                "text": text,
                "evidence": "",
                "evidence_quote": "",
                "evidence_speaker": "",
                "evidence_confidence": "MEDIUM",
            })

        # Quotable moments (concise, punchy)
        if 12 <= len(words) <= 35 and strat_score >= 4:
            quotable.append(text)

    # Dedupe by first 60 chars
    def dedupe(items, key="text", limit=6):
        seen = set()
        out = []
        for item in items:
            k = (item[key] if isinstance(item, dict) else item).lower()[:60]
            if k not in seen:
                seen.add(k)
                out.append(item)
            if len(out) >= limit:
                break
        return out

    strategies = dedupe(strategies, limit=6)
    market_gaps = dedupe(market_gaps, limit=4)
    quotable = dedupe([{"text": q} for q in quotable], limit=3)

    # Detect category from content
    category = detect_category(full_text, title)

    # Detect guests from title (basic pattern: "Ft." or "ft." or "with" followed by names)
    guests = extract_guests_from_title(title)

    deep = {
        "video_id": video_id,
        "title": title,
        "creator_id": creator_id,
        "word_count": word_count,
        "extraction_version": "deep_v2_retry",
        "intelligence": {
            "category": category,
            "guests": guests,
            "strategies": strategies,
            "market_gaps": market_gaps,
            "quotable_moments": [q["text"] for q in quotable],
            "target_audience": "",
        },
    }

    out_path = DEEP_DIR / f"{video_id}.json"
    out_path.write_text(json.dumps(deep, ensure_ascii=False, indent=2))
    return True


def detect_category(text: str, title: str) -> str:
    """Heuristic category detection from transcript content and title."""
    title_lower = title.lower()
    blob = f"{title_lower} {text[:3000]}"

    category_signals = [
        ("D2C", ["d2c", "direct to consumer", "shopify", "ecommerce", "e-commerce"]),
        ("AI", ["artificial intelligence", "chatgpt", "machine learning", "ai ", "llm"]),
        ("Health", ["health", "wellness", "longevity", "medical", "biotech", "pharma"]),
        ("Capital", ["venture capital", "fundrais", "investor", "vc ", "angel invest", "funding"]),
        ("Consumer", ["consumer", "brand", "beauty", "skincare", "fashion", "fmcg"]),
        ("EV", ["electric vehicle", " ev ", "charging", "battery", "mobility"]),
        ("Content", ["content", "creator", "youtube", "social media", "influenc"]),
        ("Hospitality", ["restaurant", "hotel", "hospitality", "food", "café", "cafe"]),
        ("Education", ["education", "edtech", "learning", "school", "university"]),
        ("Founders", ["founder", "entrepreneur", "startup", "mental health", "psychology"]),
        ("RealEstate", ["real estate", "property", "housing", "construction"]),
        ("Climate", ["climate", "sustainability", "renewable", "solar", "green"]),
        ("Gaming", ["gaming", "esports", "game dev"]),
        ("M&A", ["acquisition", "merger", "m&a", "buyout"]),
    ]

    scores = {}
    for cat, keywords in category_signals:
        score = sum(1 for kw in keywords if kw in blob)
        if score > 0:
            scores[cat] = score

    if scores:
        return max(scores, key=scores.get)
    return "General"


def extract_guests_from_title(title: str) -> list[str]:
    """Extract guest names from episode title."""
    import re

    guests = []
    # Common patterns: "Ft.", "ft.", "with", "x", "feat."
    patterns = [
        r"(?:Ft\.|ft\.|Feat\.|feat\.)\s*(.+?)(?:\||$)",
        r"(?:with|w/)\s+(.+?)(?:\||$)",
    ]
    for pattern in patterns:
        m = re.search(pattern, title)
        if m:
            raw = m.group(1).strip()
            # Split on common delimiters
            parts = re.split(r"\s*[,&]\s*|\s+and\s+|\s+\+\s+", raw)
            for p in parts:
                name = p.strip().rstrip(".")
                # Filter out non-names (too short, contains common non-name words)
                if len(name) > 3 and " " in name and not any(
                    w in name.lower() for w in ["episode", "part", "season", "full"]
                ):
                    guests.append(name)
    return guests


def main():
    missing = get_missing_video_ids()
    print(f"\n{'='*60}")
    print(f"  Indian Alpha — Transcript Retry")
    print(f"  {len(missing)} episodes to attempt")
    print(f"{'='*60}\n")

    if not missing:
        print("All discovered episodes have transcripts. Nothing to do.")
        return

    results = {"success": [], "failed": [], "skipped": []}
    total = len(missing)

    for i, ep in enumerate(missing, 1):
        vid = ep.get("video_id", "")
        title = ep.get("title", "Unknown")[:80]
        creator = ep.get("creator_id", "unknown")
        print(f"\n[{i}/{total}] {vid} — {title}")

        # Try youtube_transcript_api first
        segments = fetch_via_youtube_transcript_api(vid)
        method = "youtube_transcript_api"

        if segments is None:
            # Fallback to yt-dlp
            segments = fetch_via_ytdlp(vid)
            method = "yt-dlp"

        if segments is None:
            print(f"  ✗ FAILED — no transcript available")
            results["failed"].append({"video_id": vid, "title": title, "error": "no transcript"})
            continue

        word_count = save_transcript(vid, segments)
        print(f"  ✓ {method} — {len(segments)} segments, {word_count:,} words")

        # Run deep extraction
        run_deep_extraction(vid, ep.get("title", ""), creator, segments)
        print(f"  ✓ Deep extracted")

        results["success"].append({
            "video_id": vid,
            "title": title,
            "method": method,
            "segments": len(segments),
            "words": word_count,
        })

        # Be polite to YouTube — small delay between requests
        if i < total:
            time.sleep(1.5)

    # Save results
    RESULTS_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2))

    print(f"\n{'='*60}")
    print(f"  RESULTS")
    print(f"  Success: {len(results['success'])}")
    print(f"  Failed:  {len(results['failed'])}")
    print(f"  Total words added: {sum(r['words'] for r in results['success']):,}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
