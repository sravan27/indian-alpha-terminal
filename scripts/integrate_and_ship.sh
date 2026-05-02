#!/bin/bash
# integrate_and_ship.sh — runs after deep extraction finishes.
# Re-synthesises the brain with the new episodes, rebuilds the native
# bundle, and runs the audit.
set -e
cd "$(dirname "$0")/.."

echo "=========================================="
echo "  INDIA ALPHA · INTEGRATE & SHIP"
echo "=========================================="

echo
echo "→ 1/4  Re-synthesising brain..."
python3 scripts/synthesize_pitch_brain.py

echo
echo "→ 2/4  Type check + web build..."
npx tsc --noEmit && echo "  ✓ tsc clean"
npm run build 2>&1 | tail -3

echo
echo "→ 3/4  Rebuilding native .app + .dmg..."
npx --yes @tauri-apps/cli build 2>&1 | tail -6
rm -rf "India Alpha.app" "India Alpha.dmg"
cp -r "src-tauri/target/release/bundle/macos/India Alpha.app" .
cp "src-tauri/target/release/bundle/dmg/India Alpha_0.1.0_aarch64.dmg" "India Alpha.dmg"

echo
echo "→ 4/4  Final audit..."
python3 -c "
import json
b = json.load(open('src/data/project-signal-brain.json'))
m = b['meta']
stub = sum(1 for e in b['sourceCatalog'] if e.get('stub'))
deep = len(b['sourceCatalog']) - stub
print(f'  generated: {m[\"generatedAt\"]}')
print(f'  episodes: {len(b[\"sourceCatalog\"])} ({deep} deep + {stub} stubs)')
print(f'  playbooks: {len(b[\"masterPlaybooks\"])} | clusters: {len(b[\"topicClusters\"])}')
print(f'  guests: {len(b[\"guestNetwork\"])} | cross-show: {len(b.get(\"crossShowGuests\",[]))}')
print(f'  strategies: {m[\"totalStrategies\"]} | gaps: {m[\"totalMarketGaps\"]} | library: {m[\"totalLibraryResources\"]}')
"

echo
echo "→ Head-operator search readiness:"
python3 -c "
import json
b = json.load(open('src/data/project-signal-brain.json'))
checks = ['Nikhil Kamath','Shantanu Deshpande','Aman Gupta','Vineeta Singh','Asish Mohapatra','Ronnie Screwvala','Kishore Biyani','Tanmay Bhat','Bryan Johnson','Carl Pei','Rohit Bansal','Toshan Tamhane','Mukesh Bansal','Ankur Warikoo','Bhavna Suresh','Ranveer Allahbadia','Prajakta Koli','Kiran Mazumdar-Shaw']
hit=0
for n in checks:
    if any(g['name']==n for g in b['guestNetwork']): hit+=1
    else: print(f'  ✗ {n}')
print(f'  hit: {hit}/{len(checks)}')
"

echo
ls -la "India Alpha.app" "India Alpha.dmg" 2>&1 | grep -v '^total'
echo
echo "=========================================="
echo "  ✓ SHIPPED"
echo "=========================================="
