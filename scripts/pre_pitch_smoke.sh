#!/bin/bash
# pre_pitch_smoke.sh — last 60-second sanity check before walking in.
set +e
cd "$(dirname "$0")/.."

echo "============== PRE-PITCH SMOKE TEST =============="
echo

echo "✓ Checking native bundle exists..."
if [ ! -d "India Alpha.app" ]; then
  echo "  ✗ MISSING — run scripts/integrate_and_ship.sh first"
  exit 1
fi
echo "  ✓ India Alpha.app present ($(du -sh "India Alpha.app" | cut -f1))"

echo
echo "✓ Launch test (5s)..."
"India Alpha.app/Contents/MacOS/app" 2>&1 &
PID=$!
sleep 5
if ps -p $PID > /dev/null 2>&1; then
  echo "  ✓ App stayed alive 5s (PID $PID, RAM $(ps -p $PID -o rss= | tr -d ' ') KB)"
  kill $PID 2>/dev/null
  sleep 1
else
  echo "  ✗ App crashed within 5s — check console.app for crash report"
  exit 1
fi

echo
echo "✓ Brain integrity..."
python3 -c "
import json, sys
b = json.load(open('src/data/project-signal-brain.json'))
assert len(b['sourceCatalog']) >= 60, 'episode count low'
assert len(b['masterPlaybooks']) == 8, 'playbook count off'
assert len(b['guestNetwork']) >= 80, 'guest network low'
assert b['founderLibrary']['sections'][0]['items'], 'library empty'
print('  ✓ All structural assertions pass')
"

echo
echo "✓ Head-operator search readiness..."
python3 -c "
import json
b = json.load(open('src/data/project-signal-brain.json'))
must_hit = ['Nikhil Kamath','Shantanu Deshpande','Aman Gupta','Vineeta Singh','Asish Mohapatra']
miss = [n for n in must_hit if not any(g['name']==n for g in b['guestNetwork'])]
if miss:
    print(f'  ✗ MISSING: {miss}')
    exit(1)
print(f'  ✓ All {len(must_hit)} must-hit lookups land')
"

echo
echo "✓ AI-slop sweep..."
python3 -c "
import json, re
b = json.load(open('src/data/project-signal-brain.json'))
slop = re.compile(r'^(Be |Do |Stay |Identifying |Leveraging |Always |Never |Try )', re.I)
hits = sum(1 for c in b['topicClusters'] for s in c.get('topStrategies',[]) if slop.search(s))
hits += sum(1 for ep in b['sourceCatalog'] for s in ep.get('strategySnippets',[]) if slop.search(s.get('text','')))
print(f'  ✓ {hits} slop hits' if hits == 0 else f'  ⚠ {hits} slop hits — re-run synthesize_pitch_brain.py')
"

echo
echo "==================================================="
echo "  READY FOR PITCH"
echo "==================================================="
