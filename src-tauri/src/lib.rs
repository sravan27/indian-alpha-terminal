use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};

// ---------------------------------------------------------------------------
//  Shared SQLite connection state
// ---------------------------------------------------------------------------

pub struct DbState(pub Mutex<Option<Connection>>);

fn resolve_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    // 1. Production / packaged: ship brain.db inside the bundle resources.
    if let Ok(resource_path) = app.path().resolve("brain.db", BaseDirectory::Resource) {
        if resource_path.exists() {
            return Ok(resource_path);
        }
    }

    // 2. Dev: walk up from cwd / executable looking for a checked-in brain.db.
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("src-tauri").join("brain.db"));
        candidates.push(cwd.join("brain.db"));
        candidates.push(cwd.join("..").join("src-tauri").join("brain.db"));
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("brain.db"));
            candidates.push(parent.join("..").join("Resources").join("brain.db"));
            candidates.push(parent.join("..").join("..").join("brain.db"));
        }
    }
    for c in &candidates {
        if c.exists() {
            return Ok(c.clone());
        }
    }
    Err(format!(
        "brain.db not found. Looked in resource dir and: {}",
        candidates
            .iter()
            .map(|p| p.display().to_string())
            .collect::<Vec<_>>()
            .join(" | ")
    ))
}

fn ensure_connection(app: &AppHandle, state: &State<DbState>) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        let path = resolve_db_path(app)?;
        let conn = Connection::open_with_flags(
            &path,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
        // FTS5 + bm25 ranking is built-in — confirm at startup.
        conn.pragma_update(None, "query_only", "1").ok();
        *guard = Some(conn);
    }
    Ok(())
}

// ---------------------------------------------------------------------------
//  FTS5 query sanitisation
// ---------------------------------------------------------------------------
//
// User input arrives raw. SQLite FTS5 has its own DSL (NEAR, AND, NOT, ", *, ()).
// Naively interpolating user input either (a) corrupts the query when special
// characters appear or (b) opens an injection-style surface where the user can
// break out of the intended query shape. We instead:
//   1. Strip everything that isn't alphanumeric or whitespace.
//   2. Tokenise on whitespace, drop 1-char tokens.
//   3. Build a query that searches both the exact phrase AND a per-token
//      prefix conjunction so partial-word matches still work.
//
// This is conservative — it deliberately drops Unicode punctuation and
// FTS operators, both of which a podcast-search audience never types on
// purpose.

fn build_fts_query(raw: &str) -> Option<String> {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c.is_whitespace() {
                c
            } else {
                ' '
            }
        })
        .collect();

    let tokens: Vec<String> = cleaned
        .split_whitespace()
        .filter(|t| t.len() >= 2)
        .map(|t| t.to_lowercase())
        .collect();

    if tokens.is_empty() {
        return None;
    }

    if tokens.len() == 1 {
        return Some(format!("{}*", tokens[0]));
    }

    let phrase = tokens.join(" ");
    let prefix = tokens
        .iter()
        .map(|t| format!("{}*", t))
        .collect::<Vec<_>>()
        .join(" AND ");

    // Phrase match wins on rank; per-token prefix is the safety net.
    Some(format!("(\"{}\") OR ({})", phrase, prefix))
}

// ---------------------------------------------------------------------------
//  Public DTOs returned to the frontend
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub video_id: String,
    pub title: String,
    pub snippet: String,
    pub category: String,
    pub rank: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EpisodeMetadata {
    pub video_id: String,
    pub title: String,
    pub category: String,
    pub guests: String,
    pub strategies: String,
    pub market_gaps: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TranscriptExcerpt {
    pub start_sec: f64,
    pub duration: f64,
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OfflineStatus {
    pub db_path: String,
    pub db_size_bytes: u64,
    pub episode_count: i64,
    pub transcript_chunks: i64,
    pub fts_documents: i64,
    pub schema_version: String,
    pub bundled: bool,
}

// ---------------------------------------------------------------------------
//  Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn search_transcripts(
    app: AppHandle,
    state: State<DbState>,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<SearchResult>, String> {
    ensure_connection(&app, &state)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_mut().ok_or("DB not open")?;

    let fts_query = match build_fts_query(&query) {
        Some(q) => q,
        None => return Ok(Vec::new()),
    };
    let lim = limit.unwrap_or(25).clamp(1, 100);

    let mut stmt = conn
        .prepare(
            r#"
            SELECT
                t.video_id,
                t.title,
                snippet(transcripts_fts, 2, '<mark>', '</mark>', '…', 24) AS snippet,
                COALESCE(e.category, 'General')                        AS category,
                bm25(transcripts_fts)                                  AS rank
            FROM transcripts_fts t
            LEFT JOIN episodes e ON t.video_id = e.video_id
            WHERE transcripts_fts MATCH ?1
            ORDER BY rank
            LIMIT ?2
            "#,
        )
        .map_err(|e| e.to_string())?;

    let result_iter = stmt
        .query_map(rusqlite::params![fts_query, lim], |row| {
            Ok(SearchResult {
                video_id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                snippet: row.get(2).unwrap_or_default(),
                category: row.get(3).unwrap_or_default(),
                rank: row.get::<_, f64>(4).unwrap_or(0.0),
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for r in result_iter {
        if let Ok(res) = r {
            results.push(res);
        }
    }
    Ok(results)
}

#[tauri::command]
fn get_episode_intel(
    app: AppHandle,
    state: State<DbState>,
    video_id: String,
) -> Result<EpisodeMetadata, String> {
    ensure_connection(&app, &state)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_mut().ok_or("DB not open")?;

    let mut stmt = conn
        .prepare(
            r#"SELECT video_id, title, COALESCE(category, 'General'), COALESCE(guests, ''),
                      COALESCE(strategies, ''), COALESCE(market_gaps, '')
               FROM episodes
               WHERE video_id = ?1"#,
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map([&video_id], |row| {
            Ok(EpisodeMetadata {
                video_id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                category: row.get(2).unwrap_or_default(),
                guests: row.get(3).unwrap_or_default(),
                strategies: row.get(4).unwrap_or_default(),
                market_gaps: row.get(5).unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?;

    rows.next()
        .map(|r| r.map_err(|e| e.to_string()))
        .unwrap_or_else(|| Err(format!("Episode '{}' not in local index", video_id)))
}

#[tauri::command]
fn get_episode_excerpts(
    app: AppHandle,
    state: State<DbState>,
    video_id: String,
    query: String,
    limit: Option<i64>,
) -> Result<Vec<TranscriptExcerpt>, String> {
    ensure_connection(&app, &state)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_mut().ok_or("DB not open")?;

    let lim = limit.unwrap_or(8).clamp(1, 50);

    // If the user gave a query, find the matching chunks; otherwise just
    // return the first N as a starter excerpt for episode preview.
    let rows: Vec<TranscriptExcerpt> = if let Some(_) = build_fts_query(&query) {
        let q = query.to_lowercase();
        let mut stmt = conn
            .prepare(
                r#"SELECT start_sec, duration, text
                   FROM transcript_chunks
                   WHERE video_id = ?1
                     AND lower(text) LIKE '%' || ?2 || '%'
                   ORDER BY start_sec
                   LIMIT ?3"#,
            )
            .map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map(rusqlite::params![&video_id, q, lim], |row| {
                Ok(TranscriptExcerpt {
                    start_sec: row.get::<_, f64>(0).unwrap_or(0.0),
                    duration: row.get::<_, f64>(1).unwrap_or(0.0),
                    text: row.get(2).unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;
        iter.filter_map(Result::ok).collect()
    } else {
        let mut stmt = conn
            .prepare(
                r#"SELECT start_sec, duration, text
                   FROM transcript_chunks
                   WHERE video_id = ?1
                   ORDER BY start_sec
                   LIMIT ?2"#,
            )
            .map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map(rusqlite::params![&video_id, lim], |row| {
                Ok(TranscriptExcerpt {
                    start_sec: row.get::<_, f64>(0).unwrap_or(0.0),
                    duration: row.get::<_, f64>(1).unwrap_or(0.0),
                    text: row.get(2).unwrap_or_default(),
                })
            })
            .map_err(|e| e.to_string())?;
        iter.filter_map(Result::ok).collect()
    };

    Ok(rows)
}

#[tauri::command]
fn get_offline_status(
    app: AppHandle,
    state: State<DbState>,
) -> Result<OfflineStatus, String> {
    let resolved = resolve_db_path(&app)?;
    let bundled = app
        .path()
        .resolve("brain.db", BaseDirectory::Resource)
        .map(|p| p == resolved)
        .unwrap_or(false);
    let size = std::fs::metadata(&resolved).map(|m| m.len()).unwrap_or(0);

    ensure_connection(&app, &state)?;
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_mut().ok_or("DB not open")?;

    let episode_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM episodes", [], |r| r.get(0))
        .unwrap_or(0);
    let chunk_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM transcript_chunks", [], |r| r.get(0))
        .unwrap_or(0);
    let fts_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM transcripts_fts", [], |r| r.get(0))
        .unwrap_or(0);

    Ok(OfflineStatus {
        db_path: resolved.display().to_string(),
        db_size_bytes: size,
        episode_count,
        transcript_chunks: chunk_count,
        fts_documents: fts_count,
        schema_version: "v1".into(),
        bundled,
    })
}

// ---------------------------------------------------------------------------
//  Tauri entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DbState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            search_transcripts,
            get_episode_intel,
            get_episode_excerpts,
            get_offline_status,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
