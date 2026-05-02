#!/bin/bash
# Quick status of the running ingest. Run anytime.
set -e
cd "$(dirname "$0")/.."

DISC=$(python3 -c "import json; print(len(json.load(open('data/discovered_episodes.json'))))")
TRANS=$(ls data/transcripts/ 2>/dev/null | wc -l | tr -d ' ')
DEEP=$(ls data/deep_extracted/*.json 2>/dev/null | grep -v '_extraction_log' | wc -l | tr -d ' ')

echo "================ INDIA ALPHA · INGEST STATUS ================"
echo "  Discovered episodes:  $DISC"
echo "  Transcripts on disk:  $TRANS  (gap: $((DISC - TRANS)))"
echo "  Deep-extracted:       $DEEP  (gap: $((DISC - DEEP)))"
echo
echo "  Background PIDs:"
pgrep -fl "run_full_ingest|02_transcribe|06_deep_reextract" 2>/dev/null | sed 's/^/    /' || echo "    (none — orchestrator finished or never started)"
echo
echo "  Last 8 log lines:"
tail -n 8 data/ingest/run.log 2>/dev/null | sed 's/^/    /'
echo "============================================================="
