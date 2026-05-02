#!/usr/bin/env python3
"""
extract_high_leverage.py — pull the highest-impact missing transcripts
========================================================================

Targets the 17 episodes that move the needle for the Nikhil/Shantanu pitch:

  - 4 dossier anchors that aren't yet indexed (Solara, baby-care, hospitality,
    D2C-opportunity, brand-build, influence) — promotes the verified playbooks
    from "subtitle only" to "full deep-extracted transcript"
  - 13 seed-list episodes featuring head operators they will name-drop
    (Aman Gupta, Vineeta Singh, Asish Mohapatra, Ankur Warikoo, Rohit Kapoor,
     Toshan Tamhane, Bryan Johnson, Kiran Mazumdar-Shaw, etc.)

Pulls auto-captions via yt-dlp + Chrome browser cookies (bypasses the
plain youtube-transcript-api IP block), converts to our internal
transcript shape, and writes to `data/transcripts/<videoId>.json`.

Then run `python3 scripts/pipeline/06_deep_reextract.py` and
`python3 scripts/synthesize_pitch_brain.py`.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRANSCRIPT_DIR = ROOT / "data" / "transcripts"
TRANSCRIPT_DIR.mkdir(parents=True, exist_ok=True)

TARGETS: list[tuple[str, str]] = [
    # --- Dossier anchors (BarberShop dossiers without indexed transcripts) ---
    ("of4V9JDnj7g", "BarberShop · Solara scale"),
    ("5kyQU4NsOVY", "BarberShop · baby-care opportunity"),
    ("I57n5qEC7dU", "BarberShop · asset-light hospitality"),
    ("-b12vdrC_-8", "BarberShop · D2C 20B opportunity"),
    # WTF dossiers — both already in the indexed set but pull again if stale
    ("hjiZ11lKCrU", "WTF · brand build (Kishore, Raj, Ananth)"),
    ("JjDjDvNgkFo", "WTF · influence (Tanmay, Prajakta, Ranveer)"),

    # --- Headline BarberShop episodes ---
    ("5EXdVDEpWIs", "BarberShop S1E1 · Aman Gupta · boAt"),
    ("C1pQE1aLX7A", "BarberShop S1 finale · Vineeta Singh · SUGAR"),
    ("gIhdMxEce0M", "BarberShop · Asish Mohapatra · OfBusiness Pt 1"),
    ("VwEG4LYf0ag", "BarberShop · Asish Mohapatra · OfBusiness Pt 2"),
    ("5HLxbOMXCck", "BarberShop · Ankur Warikoo"),
    ("7Hgjat4MVeM", "BarberShop · Rohit Kapoor · OYO/Swiggy"),
    ("h-TJU3LenZk", "BarberShop · Toshan Tamhane Pt 1"),
    ("iTeZ_lEGfi8", "BarberShop · Toshan Tamhane Pt 2"),
    ("UbRzbCIMXdI", "BarberShop · Rohit Bansal · Snapdeal Pt 2"),

    # --- Headline WTF episodes ---
    ("zCTm1wHcfkI", "WTF Ep#9 · Venture Capital"),
    ("6HE6d0lKh4o", "WTF Ep#6 · Health (Suniel Shetty, Mukesh Bansal)"),
    ("fEUoJSTYtyc", "WTF Ep#21 · Longevity (Bryan Johnson)"),
    ("SkU3J2vWUK8", "WTF Ep#2 · Social Media OGs"),
    ("0JDsFpU6pGQ", "WTF Ep#18 · Alcohol $70B"),
    ("iuyy1bIgR1s", "WTF Ep#14 · EV"),
    ("g0CjWbgsdTQ", "WTF Ep#24 · 2025 VC"),
    ("01qfxLY2rhQ", "WTF Ep#5 · EdTech (Ronnie Screwvala)"),
    ("hNV6urpwrk8", "WTF Ep#8 · Content (Ajay Bijli)"),
    ("M72Wu2rZE7Y", "WTF Ep#12 · Restaurant Game"),
    ("VIlfHB7Jk2s", "WTF Ep#17 · Gaming"),
    ("2q7-cTPwf-g", "WTF Ep#15 · Climate"),
    ("wHQiewz8k9g", "WTF Ep#22 · Craft Beverages"),
    ("58i057QXl1A", "WTF Ep#7 · Kiran Mazumdar-Shaw"),
]


def fetch_one(video_id: str, label: str) -> tuple[str, str, int]:
    out_path = TRANSCRIPT_DIR / f"{video_id}.json"
    if out_path.exists():
        existing = json.loads(out_path.read_text())
        wc = existing.get("word_count", 0)
        if wc > 200:
            return (video_id, "SKIP exists", wc)

    with tempfile.TemporaryDirectory() as tmp:
        cmd = [
            "yt-dlp",
            "--cookies-from-browser", "chrome",
            "--write-auto-sub",
            "--sub-langs", "en",
            "--skip-download",
            "--sub-format", "json3",
            "-f", "all",
            "--no-warnings",
            "--quiet",
            "-P", tmp,
            f"https://www.youtube.com/watch?v={video_id}",
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if r.returncode != 0:
            return (video_id, f"yt-dlp-err: {r.stderr[-160:].strip()}", 0)

        # Find the json3 file regardless of name (yt-dlp uses video title)
        files = list(Path(tmp).glob("*.en.json3"))
        if not files:
            return (video_id, "no-json3-file", 0)

        with open(files[0]) as fh:
            raw = json.load(fh)

        chunks = []
        full_text_parts = []
        events = raw.get("events", [])
        for ev in events:
            start = ev.get("tStartMs", 0) / 1000.0
            duration = ev.get("dDurationMs", 0) / 1000.0
            segs = ev.get("segs") or []
            text = "".join(s.get("utf8", "") for s in segs).strip()
            if not text:
                continue
            chunks.append(
                {
                    "start": round(start, 1),
                    "duration": round(duration, 1),
                    "text": text,
                }
            )
            full_text_parts.append(text)

        full_text = " ".join(full_text_parts)
        full_text = re.sub(r"\s+", " ", full_text).strip()
        wc = len(full_text.split())

        # Read title from the source filename (yt-dlp embeds it)
        title = files[0].stem.replace(f"[{video_id}]", "").rstrip(" .").strip()
        title = re.sub(r"\s*\.en\s*$", "", title)

        out_path.write_text(
            json.dumps(
                {
                    "video_id": video_id,
                    "title": title,
                    "chunks": chunks,
                    "full_text": full_text,
                    "word_count": wc,
                    "method": "yt-dlp+cookies(chrome)",
                },
                ensure_ascii=False,
            )
        )
        return (video_id, "OK", wc)


def main() -> int:
    print(f"Targeting {len(TARGETS)} high-leverage episodes")
    print(f"Output: {TRANSCRIPT_DIR}")
    print()

    results: list[tuple[str, str, str, int]] = []
    # Light parallelism — yt-dlp is rate-sensitive
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(fetch_one, vid, label): (vid, label) for vid, label in TARGETS}
        for f in as_completed(futures):
            vid, label = futures[f]
            try:
                v, status, wc = f.result()
            except Exception as e:
                v, status, wc = vid, f"EXC: {e}", 0
            tick = "✓" if "OK" in status or status == "SKIP exists" else "✗"
            print(f"  {tick}  {vid}  {wc:>6}w  {label}")
            results.append((vid, label, status, wc))

    okc = sum(1 for r in results if "OK" in r[2] or r[2] == "SKIP exists")
    print()
    print(f"=== Done: {okc}/{len(TARGETS)} have transcripts ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
