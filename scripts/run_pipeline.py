#!/usr/bin/env python3
"""
🧠 India Alpha — Full Extraction Pipeline
==========================================
Runs the complete pipeline:
  1. Discover episodes from YouTube channels
  2. Extract transcripts from YouTube captions
  3. Extract intelligence using spaCy + Ollama
  4. Assemble final brain database

Requirements:
  - youtube-transcript-api, yt-dlp, spacy (installed)
  - ollama running locally with llama3.1:8b
  - Internet connection (for YouTube transcript extraction)
"""
import subprocess
import sys
import os
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def run_step(name, script):
    print(f"\n{'='*60}")
    print(f"🔄 {name}")
    print(f"{'='*60}\n")
    
    start = time.time()
    result = subprocess.run(
        [sys.executable, os.path.join(SCRIPT_DIR, script)],
        cwd=os.path.dirname(SCRIPT_DIR),
    )
    elapsed = time.time() - start
    
    if result.returncode != 0:
        print(f"\n❌ {name} failed (exit code {result.returncode})")
        return False
    
    print(f"\n⏱  {name} completed in {elapsed:.1f}s")
    return True

def main():
    print("🧠 India Alpha — Full Extraction Pipeline")
    print("=" * 60)
    print("This will:")
    print("  1. Discover all episodes from WTF & BarberShop")
    print("  2. Download transcripts from YouTube")
    print("  3. Extract intelligence with spaCy + Ollama")
    print("  4. Assemble the final brain database")
    print("=" * 60)
    
    start = time.time()
    
    steps = [
        ("Step 1: Episode Discovery", "pipeline/01_discover.py"),
        ("Step 2: Transcript Extraction", "pipeline/02_transcribe.py"),
        ("Step 3: Intelligence Extraction (spaCy + Ollama)", "pipeline/03_extract.py"),
        ("Step 4: Brain Assembly", "pipeline/04_assemble.py"),
    ]
    
    for name, script in steps:
        if not run_step(name, script):
            print(f"\n💥 Pipeline failed at: {name}")
            sys.exit(1)
    
    total = time.time() - start
    print(f"\n{'='*60}")
    print(f"✅ FULL PIPELINE COMPLETE in {total:.1f}s ({total/60:.1f} min)")
    print(f"   Brain saved to: src/data/project-signal-brain.json")
    print(f"   Refresh localhost:3000 to see the real data!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
