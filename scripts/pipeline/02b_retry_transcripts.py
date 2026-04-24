#!/usr/bin/env python3
"""
Retry transcript extraction using yt-dlp auto-subtitles for episodes
that failed with youtube-transcript-api (IP block).
Uses yt-dlp which has better anti-blocking than the transcript API.
"""
import json
import os
import sys
import subprocess
import tempfile
import time
import glob
import re

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
TRANSCRIPT_DIR = os.path.join(DATA_DIR, "transcripts")

def extract_with_ytdlp(video_id, title):
    """Use yt-dlp to download auto-generated subtitles in vtt format, then parse."""
    with tempfile.TemporaryDirectory() as tmpdir:
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--write-auto-sub",
            "--write-sub",
            "--sub-lang", "en,en-IN,hi",
            "--skip-download",
            "--sub-format", "vtt",
            "--extractor-args", "youtube:player_client=android",
            "-o", os.path.join(tmpdir, "%(id)s.%(ext)s"),
            f"https://www.youtube.com/watch?v={video_id}",
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        except subprocess.TimeoutExpired:
            return None
        
        # Find any subtitle file
        sub_files = glob.glob(os.path.join(tmpdir, f"{video_id}*.vtt"))
        if not sub_files:
            # Try json3 format
            cmd2 = [
                sys.executable, "-m", "yt_dlp",
                "--write-auto-sub",
                "--write-sub",
                "--sub-lang", "en,en-IN,hi",
                "--skip-download",
                "--sub-format", "json3",
                "--extractor-args", "youtube:player_client=android",
                "-o", os.path.join(tmpdir, "%(id)s.%(ext)s"),
                f"https://www.youtube.com/watch?v={video_id}",
            ]
            try:
                subprocess.run(cmd2, capture_output=True, text=True, timeout=60)
            except subprocess.TimeoutExpired:
                return None
            
            json_files = glob.glob(os.path.join(tmpdir, f"{video_id}*.json3"))
            if json_files:
                return parse_json3(json_files[0], video_id, title)
            return None
        
        return parse_vtt(sub_files[0], video_id, title)

def parse_vtt(filepath, video_id, title):
    """Parse VTT subtitle file into our transcript format."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse VTT timestamps and text
    chunks = []
    full_text = []
    
    # Match timestamp blocks
    pattern = r'(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n(.*?)(?=\n\n|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    seen_text = set()
    for start_ts, end_ts, text in matches:
        # Clean the text
        text = re.sub(r'<[^>]+>', '', text).strip()
        text = re.sub(r'\n', ' ', text).strip()
        
        if not text or text in seen_text:
            continue
        seen_text.add(text)
        
        start_secs = parse_timestamp(start_ts)
        end_secs = parse_timestamp(end_ts)
        
        chunks.append({
            "start": round(start_secs, 1),
            "duration": round(end_secs - start_secs, 1),
            "text": text,
        })
        full_text.append(text)
    
    if not full_text:
        return None
    
    joined = " ".join(full_text)
    return {
        "video_id": video_id,
        "title": title,
        "chunks": chunks,
        "full_text": joined,
        "word_count": len(joined.split()),
        "method": "yt-dlp-vtt",
    }

def parse_json3(filepath, video_id, title):
    """Parse json3 subtitle file."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    chunks = []
    full_text = []
    
    for event in data.get("events", []):
        text = ""
        for seg in event.get("segs", []):
            text += seg.get("utf8", "")
        text = text.strip()
        if text and text != "\n":
            chunks.append({
                "start": event.get("tStartMs", 0) / 1000,
                "duration": event.get("dDurationMs", 0) / 1000,
                "text": text,
            })
            full_text.append(text)
    
    if not full_text:
        return None
    
    joined = " ".join(full_text)
    return {
        "video_id": video_id,
        "title": title,
        "chunks": chunks,
        "full_text": joined,
        "word_count": len(joined.split()),
        "method": "yt-dlp-json3",
    }

def parse_timestamp(ts):
    """Convert HH:MM:SS.mmm to seconds."""
    parts = ts.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    secs = float(parts[2])
    return hours * 3600 + minutes * 60 + secs

def main():
    with open(os.path.join(DATA_DIR, "discovered_episodes.json")) as f:
        discovered = json.load(f)
    
    have = set(f.replace('.json', '') for f in os.listdir(TRANSCRIPT_DIR) if f.endswith('.json'))
    need = [e for e in discovered if e['video_id'] not in have]
    
    print(f"📝 Retrying {len(need)} episodes with yt-dlp...")
    print(f"   Already have: {len(have)} transcripts")
    
    success = 0
    failed = 0
    
    for i, ep in enumerate(need):
        vid = ep['video_id']
        print(f"   [{i+1}/{len(need)}] {ep['title'][:60]}...")
        
        result = extract_with_ytdlp(vid, ep['title'])
        
        if result and result.get('word_count', 0) > 100:
            out_path = os.path.join(TRANSCRIPT_DIR, f"{vid}.json")
            with open(out_path, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"      ✅ {result['word_count']} words ({result['method']})")
            success += 1
        else:
            print(f"      ❌ Failed")
            failed += 1
        
        # Small delay to avoid rate limiting
        time.sleep(0.5)
    
    total = len(have) + success
    print(f"\n✅ Retry complete: {success} new transcripts")
    print(f"   Total transcripts now: {total}")

if __name__ == "__main__":
    main()
