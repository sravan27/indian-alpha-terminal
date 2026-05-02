#!/usr/bin/env python3
"""
Full Ingest Coordinator
=======================

End-to-end backfill:

    1. Pull every missing YouTube transcript via 02_transcribe.py
       (skips already-cached, idempotent)
    2. Run 3-pass deep extraction via 06_deep_reextract.py
       (uses local Ollama mistral-nemo:12b, idempotent)
    3. Re-run synthesize_pitch_brain.py to integrate the new
       episodes into the canonical brain.json

Designed to run unattended overnight. Logs to data/ingest/run.log so
you can `tail -f data/ingest/run.log` from another terminal.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LOG_DIR = DATA_DIR / "ingest"
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_PATH = LOG_DIR / "run.log"

PIPELINE_DIR = ROOT / "scripts" / "pipeline"


def log(msg: str) -> None:
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n"
    print(line, end="", flush=True)
    with open(LOG_PATH, "a") as fh:
        fh.write(line)


def step(name: str, script: Path) -> int:
    log(f"=== START: {name} ({script.name}) ===")
    t0 = time.time()
    proc = subprocess.run(
        [sys.executable, str(script)],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    dt = time.time() - t0
    log(f"=== END  : {name} (rc={proc.returncode}, {dt/60:.1f} min) ===")
    if proc.stdout:
        with open(LOG_PATH, "a") as fh:
            fh.write(proc.stdout)
            fh.write("\n")
    return proc.returncode


def gap_summary() -> dict:
    transcripts_dir = DATA_DIR / "transcripts"
    deep_dir = DATA_DIR / "deep_extracted"
    discovered_path = DATA_DIR / "discovered_episodes.json"
    discovered = json.loads(discovered_path.read_text()) if discovered_path.exists() else []
    have_t = {p.stem for p in transcripts_dir.glob("*.json")}
    have_d = {p.stem for p in deep_dir.glob("*.json") if not p.stem.startswith("_")}
    missing_t = [e["video_id"] for e in discovered if e["video_id"] not in have_t]
    missing_d = [e["video_id"] for e in discovered if e["video_id"] not in have_d]
    return {
        "discovered": len(discovered),
        "transcribed": len(have_t),
        "deep_extracted": len(have_d),
        "missing_transcripts": len(missing_t),
        "missing_deep": len(missing_d),
    }


def main() -> int:
    log("===== INDIA ALPHA · FULL INGEST =====")
    pre = gap_summary()
    log(f"Pre-state: {json.dumps(pre)}")

    if pre["missing_transcripts"] == 0 and pre["missing_deep"] == 0:
        log("Everything already ingested. Re-running synthesis only.")
    else:
        if pre["missing_transcripts"] > 0:
            rc = step(
                "Stage 1 · YouTube transcripts (yt-dlp + transcript-api)",
                PIPELINE_DIR / "02_transcribe.py",
            )
            if rc != 0:
                log("Stage 1 failed; continuing to Stage 2 with whatever transcripts succeeded.")

        post_t = gap_summary()
        log(f"After Stage 1: {json.dumps(post_t)}")

        if post_t["missing_deep"] > 0:
            rc = step(
                "Stage 2 · Deep extraction (mistral-nemo:12b, 3-pass chunked)",
                PIPELINE_DIR / "06_deep_reextract.py",
            )
            if rc != 0:
                log("Stage 2 had a non-zero exit; partial results still flow into synthesis.")

    rc = step(
        "Stage 3 · Pitch-ready synthesis (deterministic, no LLM)",
        ROOT / "scripts" / "synthesize_pitch_brain.py",
    )

    final = gap_summary()
    log(f"Final state: {json.dumps(final)}")
    log("===== DONE =====")
    return 0 if rc == 0 else rc


if __name__ == "__main__":
    sys.exit(main())
