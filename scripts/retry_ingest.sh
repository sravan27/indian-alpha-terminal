#!/bin/bash
# Retry the missing 114 episodes when YouTube unblocks (or on a different network).
# Idempotent — safe to re-run as many times as you like.
set -e
cd "$(dirname "$0")/.."

echo "=== Probing YouTube reachability ==="
PROBE_VID="dQw4w9WgXcQ"  # public, always-available video used as a network litmus test
if python3 -c "
import sys
from youtube_transcript_api import YouTubeTranscriptApi
try:
    YouTubeTranscriptApi().fetch('$PROBE_VID', languages=['en'])
    sys.exit(0)
except Exception as e:
    print(f'block: {e}'.split(chr(10))[0])
    sys.exit(2)
"; then
    echo "✓ Reachable. Kicking off the orchestrator."
else
    echo "✗ YouTube still blocking this network."
    echo "  Options:"
    echo "    1. Wait — IP blocks usually clear in 1–24 hours."
    echo "    2. Switch network: phone hotspot, different wifi, or a VPN."
    echo "    3. Re-run this script later — it picks up where it left off."
    exit 2
fi

echo
nohup python3 -u scripts/run_full_ingest.py > /dev/null 2>&1 &
echo "Started orchestrator PID=$!"
echo "Monitor with: bash scripts/ingest_status.sh"
echo "Tail log:     tail -f data/ingest/run.log"
