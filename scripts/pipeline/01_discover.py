#!/usr/bin/env python3
"""
Step 1: Discover all episodes from both YouTube channels using yt-dlp.
Extracts video IDs, titles, durations, publish dates.
"""
import json
import subprocess
import sys
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

CHANNELS = [
    {
        "id": "nikhil-kamath",
        "name": "Nikhil Kamath",
        "show": "WTF with Nikhil Kamath",
        "handle": "WTF",
        "url": "https://www.youtube.com/@nikhil.kamath",
        "min_duration": 1800,
    },
    {
        "id": "shantanu-deshpande",
        "name": "Shantanu Deshpande",
        "show": "The BarberShop with Shantanu",
        "handle": "The BarberShop",
        "url": "https://www.youtube.com/@thebarbershopwithshantanu6670",
        "min_duration": 1800,
    },
]

def discover_channel(channel):
    """Use yt-dlp to get metadata for all videos from a channel."""
    print(f"\n🔍 Discovering episodes from {channel['show']}...")
    
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--flat-playlist",
        "--dump-json",
        "--no-download",
        f"{channel['url']}/videos",
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        episodes = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            try:
                data = json.loads(line)
                dur = data.get("duration", 0) or 0
                # Filter: only long-form episodes (>30 min)
                if dur < channel.get("min_duration", 1800):
                    continue
                episodes.append({
                    "video_id": data.get("id", ""),
                    "title": data.get("title", ""),
                    "duration": int(dur),
                    "duration_str": format_duration(int(dur)),
                    "url": f"https://www.youtube.com/watch?v={data.get('id', '')}",
                    "creator_id": channel["id"],
                    "show": channel["show"],
                    "handle": channel["handle"],
                })
            except (json.JSONDecodeError, TypeError):
                continue
        
        print(f"   Found {len(episodes)} episodes (>{channel.get('min_duration',1800)//60} min)")
        return episodes
    except subprocess.TimeoutExpired:
        print(f"   ⚠️ Timeout discovering {channel['show']}")
        return []
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []

def format_duration(seconds):
    if not seconds:
        return "0:00"
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def main():
    all_episodes = []
    
    for channel in CHANNELS:
        episodes = discover_channel(channel)
        all_episodes.extend(episodes)
    
    # Sort by title
    all_episodes.sort(key=lambda x: x["title"])
    
    # Save
    output_path = os.path.join(DATA_DIR, "discovered_episodes.json")
    with open(output_path, "w") as f:
        json.dump(all_episodes, f, indent=2)
    
    print(f"\n✅ Discovered {len(all_episodes)} total episodes")
    print(f"   Saved to {output_path}")
    
    # Print summary
    for channel in CHANNELS:
        count = len([e for e in all_episodes if e["creator_id"] == channel["id"]])
        print(f"   {channel['show']}: {count} episodes")

if __name__ == "__main__":
    main()
