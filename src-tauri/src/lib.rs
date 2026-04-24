mod commands {
    use rusqlite::Connection;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, Debug)]
    pub struct SearchResult {
        pub video_id: String,
        pub title: String,
        pub snippet: String,
        pub category: String,
    }

    #[derive(Serialize, Deserialize, Debug)]
    pub struct EpisodeMetadata {
        pub video_id: String,
        pub title: String,
        pub category: String,
        pub guests: String,
        pub strategies: String,
        pub market_gaps: String,
    }

    #[tauri::command]
    pub fn search_transcripts(query: String) -> Result<Vec<SearchResult>, String> {
        let mut db_path = match std::env::current_dir() {
            Ok(p) => p,
            Err(e) => return Err(format!("Failed to get current dir: {}", e)),
        };
        
        if db_path.join("src-tauri").exists() {
            db_path.push("src-tauri");
        }
        db_path.push("brain.db");

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open DB at {:?}: {}", db_path, e))?;

        let mut stmt = conn.prepare(
            r#"
            SELECT 
                t.video_id,
                t.title,
                snippet(transcripts_fts, 2, '<b>', '</b>', '...', 32) as snippet,
                e.category
            FROM transcripts_fts t
            JOIN episodes e ON t.video_id = e.video_id
            WHERE transcripts_fts MATCH ?
            ORDER BY rank
            LIMIT 10
            "#
        ).map_err(|e| e.to_string())?;

        let fts_query = format!("\"{}\" OR {}*", query, query.replace(" ", " AND "));

        let result_iter = stmt.query_map([fts_query], |row| {
            Ok(SearchResult {
                video_id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                snippet: row.get(2).unwrap_or_default(),
                category: row.get(3).unwrap_or_default(),
            })
        }).map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for r in result_iter {
            if let Ok(res) = r {
                results.push(res);
            }
        }

        Ok(results)
    }

    #[tauri::command]
    pub fn get_episode_intel(video_id: String) -> Result<EpisodeMetadata, String> {
        let mut db_path = match std::env::current_dir() {
            Ok(p) => p,
            Err(e) => return Err(format!("Failed to get current dir: {}", e)),
        };
        if db_path.join("src-tauri").exists() {
            db_path.push("src-tauri");
        }
        db_path.push("brain.db");

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open DB at {:?}: {}", db_path, e))?;

        let mut stmt = conn.prepare(
            "SELECT video_id, title, category, guests, strategies, market_gaps FROM episodes WHERE video_id = ?"
        ).map_err(|e| e.to_string())?;

        let mut result_iter = stmt.query_map([video_id], |row| {
            Ok(EpisodeMetadata {
                video_id: row.get(0).unwrap_or_default(),
                title: row.get(1).unwrap_or_default(),
                category: row.get(2).unwrap_or_default(),
                guests: row.get(3).unwrap_or_default(),
                strategies: row.get(4).unwrap_or_default(),
                market_gaps: row.get(5).unwrap_or_default(),
            })
        }).map_err(|e| e.to_string())?;

        if let Some(r) = result_iter.next() {
            r.map_err(|e| e.to_string())
        } else {
            Err("Episode not found".to_string())
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        commands::search_transcripts, 
        commands::get_episode_intel
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
