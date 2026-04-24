#!/usr/bin/env python3
"""
Step 5: Offline SQLite Vector/FTS Builder
Compiles the extracted podcast datasets into a hyper-fast SQLite database
equipped with FTS5 (Full Text Search). This transforms the UI into an AI Oracle.
"""
import sqlite3
import json
import os
import glob

# Paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "..", "data")
EXTRACTED_DIR = os.path.join(DATA_DIR, "extracted")
TRANSCRIPT_DIR = os.path.join(DATA_DIR, "transcripts")
TAURI_DIR = os.path.join(ROOT_DIR, "..", "src-tauri")

DB_PATH = os.path.join(TAURI_DIR, "brain.db")

def init_db(conn):
    c = conn.cursor()
    # 1. Episodes table (metadata)
    c.execute("""
        CREATE TABLE IF NOT EXISTS episodes (
            video_id TEXT PRIMARY KEY,
            title TEXT,
            duration INT,
            category TEXT,
            guests TEXT,
            entities TEXT,
            market_gaps TEXT,
            strategies TEXT
        )
    """)
    
    # 2. Virtual FTS5 table for lightning fast text search across transcripts
    c.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
            video_id UNINDEXED,
            title,
            text
        )
    """)
    
    # 3. Chunks table to align specific timestamps (for highlights)
    c.execute("""
        CREATE TABLE IF NOT EXISTS transcript_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id TEXT,
            start_sec REAL,
            duration REAL,
            text TEXT,
            FOREIGN KEY(video_id) REFERENCES episodes(video_id)
        )
    """)
    conn.commit()

def build_db():
    print(f"📦 Compiling Offline Brain to {DB_PATH}")
    
    # Clear existing DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    c = conn.cursor()
    
    # 1. Load Extracted Intelligence (Metadata)
    count = 0
    words = 0
    extracted_files = glob.glob(os.path.join(EXTRACTED_DIR, "*.json"))
    
    for ext_file in extracted_files:
        with open(ext_file, "r") as f:
            data = json.load(f)
            
        video_id = data.get("video_id")
        if not video_id: continue
        
        intel = data.get("intelligence", {})
        cat = intel.get("category", "General")
        if isinstance(cat, list): cat = cat[0] if cat else "General"
        
        guests = json.dumps(intel.get("guests", []))
        entities = json.dumps(data.get("entities", {}))
        market_gaps = json.dumps(intel.get("market_gaps", []))
        strategies = json.dumps(intel.get("strategies", []))
        
        c.execute("""
            INSERT OR IGNORE INTO episodes 
            (video_id, title, duration, category, guests, entities, market_gaps, strategies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            video_id, data.get("title", ""), data.get("word_count", 0), 
            cat, guests, entities, market_gaps, strategies
        ))
        
        # Now load the raw transcript to FTS table
        raw_transcript_path = os.path.join(TRANSCRIPT_DIR, f"{video_id}.json")
        if os.path.exists(raw_transcript_path):
            with open(raw_transcript_path, "r") as tf:
                raw_data = json.load(tf)
                full_text = raw_data.get("full_text", "")
                words += len(full_text.split())
                
                # Insert FTS entire blob
                c.execute("""
                    INSERT INTO transcripts_fts (video_id, title, text)
                    VALUES (?, ?, ?)
                """, (video_id, data.get("title", ""), full_text))
                
                # Insert chunks for precise timestamp highlighting
                chunks = raw_data.get("chunks", [])
                for chunk in chunks:
                    c.execute("""
                        INSERT INTO transcript_chunks (video_id, start_sec, duration, text)
                        VALUES (?, ?, ?, ?)
                    """, (video_id, chunk.get("start", 0), chunk.get("duration", 0), chunk.get("text", "")))
        
        count += 1
        
    conn.commit()
    conn.close()
    
    print(f"✅ SQLite Brain Online.")
    print(f"   Indexed Episodes: {count}")
    print(f"   Words Loaded to FTS: {words:,}")

if __name__ == "__main__":
    build_db()
