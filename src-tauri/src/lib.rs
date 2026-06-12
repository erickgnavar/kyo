use rusqlite::Connection;
use rusqlite_migration::{Migrations, M};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: i64,
    pub name: String,
    pub content: String,
    pub tags: Vec<String>,
    pub column: String,
    pub created_at: u64,
    pub due_date: Option<String>,
    pub archived: Option<bool>,
    pub score: i64,
    pub done_at: Option<i64>,
}

fn row_to_card(row: &rusqlite::Row) -> rusqlite::Result<Card> {
    let tags_json: String = row.get("tags")?;
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

    Ok(Card {
        id: row.get("id")?,
        name: row.get("name")?,
        content: row.get("content")?,
        tags,
        column: row.get("column_name")?,
        created_at: row.get("created_at")?,
        due_date: row.get("due_date")?,
        archived: row
            .get::<_, i32>("archived")
            .map(|v| if v == 1 { Some(true) } else { None })?,
        score: row.get("score")?,
        done_at: row.get("done_at")?,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: i64,
    pub card_id: i64,
    pub body: String,
    pub created_at: i64,
    pub edited_at: Option<i64>,
}

fn row_to_comment(row: &rusqlite::Row) -> rusqlite::Result<Comment> {
    Ok(Comment {
        id: row.get("id")?,
        card_id: row.get("card_id")?,
        body: row.get("body")?,
        created_at: row.get("created_at")?,
        edited_at: row.get("edited_at")?,
    })
}

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

const MIGRATIONS: &[M] = &[
    M::up(include_str!("../migrations/001_init.sql")),
    M::up(include_str!("../migrations/002_add_score.sql")),
    M::up(include_str!("../migrations/003_add_done_at.sql")),
    M::up(include_str!("../migrations/004_drop_done_column.sql")),
    M::up(include_str!("../migrations/005_autoincrement_id.sql")),
    M::up(include_str!("../migrations/006_add_comments.sql")),
];

fn migrate(conn: &mut Connection) {
    Migrations::new(MIGRATIONS.to_vec())
        .to_latest(conn)
        .expect("migrations failed");
}

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------

fn open_db(app: &tauri::App) -> Connection {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    let db_path = app_dir.join("kyo.db");

    let mut conn = Connection::open(&db_path).expect("failed to open database");
    // WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL;")
        .expect("failed to set WAL mode");
    // Enable foreign keys
    conn.execute_batch("PRAGMA foreign_keys=ON;")
        .expect("failed to enable foreign keys");

    migrate(&mut conn);

    conn
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

#[tauri::command]
fn get_cards(db: State<Mutex<Connection>>) -> Vec<Card> {
    let conn = db.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, name, content, tags, column_name, created_at, due_date, archived, score, done_at
             FROM cards ORDER BY
               CASE WHEN column_name = 'backlog' THEN -score ELSE 0 END,
               sort_order",
        )
        .unwrap();
    stmt.query_map([], row_to_card)
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
}

#[tauri::command]
fn add_card(
    db: State<Mutex<Connection>>,
    column: String,
    name: String,
    content: String,
    tags: Vec<String>,
    due_date: Option<String>,
) -> Card {
    let conn = db.lock().unwrap();
    let tags_json = serde_json::to_string(&tags).unwrap();
    let now = now_ms();

    // Compute sort_order: if today, insert after first today card
    let sort_order: i64 = if column == "today" {
        let first_today: Option<i64> = conn
            .query_row(
                "SELECT sort_order FROM cards
                 WHERE column_name = 'today' AND archived = 0
                 ORDER BY sort_order LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();

        match first_today {
            None => 0,
            Some(order) => {
                // Shift all subsequent today cards down by 1, insert after first
                conn.execute(
                    "UPDATE cards SET sort_order = sort_order + 1
                     WHERE column_name = 'today' AND archived = 0 AND sort_order > ?1",
                    rusqlite::params![order],
                )
                .unwrap();
                order + 1
            }
        }
    } else {
        // Backlog: append at the end
        let max_order: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM cards WHERE column_name = 'backlog' AND archived = 0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        max_order + 1
    };

    // Omit id — SQLite's AUTOINCREMENT will assign it
    conn.execute(
        "INSERT INTO cards (name, content, tags, column_name, created_at, sort_order, due_date, archived, score, done_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, 0, NULL)",
        rusqlite::params![name, content, tags_json, column, now, sort_order, due_date],
    )
    .unwrap();

    let new_id = conn.last_insert_rowid();

    // Read back the inserted card
    conn.query_row(
        "SELECT id, name, content, tags, column_name, created_at, due_date, archived, score, done_at
         FROM cards WHERE id = ?1",
        rusqlite::params![new_id],
        row_to_card,
    )
    .unwrap()
}

#[tauri::command]
fn update_card(
    db: State<Mutex<Connection>>,
    id: i64,
    name: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    due_date: Option<String>,
) {
    let conn = db.lock().unwrap();

    if let Some(v) = name {
        conn.execute(
            "UPDATE cards SET name = ?1 WHERE id = ?2",
            rusqlite::params![v, id],
        )
        .unwrap();
    }
    if let Some(v) = content {
        conn.execute(
            "UPDATE cards SET content = ?1 WHERE id = ?2",
            rusqlite::params![v, id],
        )
        .unwrap();
    }
    if let Some(v) = tags {
        let json = serde_json::to_string(&v).unwrap();
        conn.execute(
            "UPDATE cards SET tags = ?1 WHERE id = ?2",
            rusqlite::params![json, id],
        )
        .unwrap();
    }
    // Empty string means clear the due date
    match due_date {
        Some(ref v) if v.is_empty() => {
            conn.execute(
                "UPDATE cards SET due_date = NULL WHERE id = ?1",
                rusqlite::params![id],
            )
            .unwrap();
        }
        Some(v) => {
            conn.execute(
                "UPDATE cards SET due_date = ?1 WHERE id = ?2",
                rusqlite::params![v, id],
            )
            .unwrap();
        }
        None => {}
    }
}

#[tauri::command]
fn move_to_column(db: State<Mutex<Connection>>, id: i64, target: String) {
    let conn = db.lock().unwrap();

    let new_order: i64 = if target == "today" {
        // Insert after the first today card
        let first_today: Option<i64> = conn
            .query_row(
                "SELECT sort_order FROM cards
                 WHERE column_name = 'today' AND archived = 0
                 ORDER BY sort_order LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();

        match first_today {
            None => 0,
            Some(order) => {
                conn.execute(
                    "UPDATE cards SET sort_order = sort_order + 1
                     WHERE column_name = 'today' AND archived = 0 AND sort_order > ?1",
                    rusqlite::params![order],
                )
                .unwrap();
                order + 1
            }
        }
    } else {
        // Backlog: append at the end
        let max_order: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) FROM cards
                 WHERE column_name = 'backlog' AND archived = 0",
                [],
                |row| row.get(0),
            )
            .unwrap();
        max_order + 1
    };

    conn.execute(
        "UPDATE cards SET column_name = ?1, sort_order = ?2 WHERE id = ?3",
        rusqlite::params![target, new_order, id],
    )
    .unwrap();
}

#[tauri::command]
fn move_within_column(db: State<Mutex<Connection>>, id: i64, direction: i8) {
    let conn = db.lock().unwrap();

    // Read all visible cards in the same column in current order
    let col: String = conn
        .query_row(
            "SELECT column_name FROM cards WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .unwrap();

    let cards: Vec<(i64, i64)> = conn
        .prepare(
            "SELECT id, sort_order FROM cards
             WHERE column_name = ?1 AND archived = 0 AND done_at IS NULL
             ORDER BY sort_order",
        )
        .unwrap()
        .query_map(rusqlite::params![col], |row| {
            let cid: i64 = row.get(0)?;
            let order: i64 = row.get(1)?;
            Ok((cid, order))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    let pos = cards.iter().position(|(cid, _)| cid == &id);
    if pos.is_none() {
        return;
    }
    let pos = pos.unwrap();
    let swap_pos = (pos as isize + direction as isize) as usize;
    if swap_pos >= cards.len() {
        return;
    }

    let a_id = &cards[pos].0;
    let b_id = &cards[swap_pos].0;
    let a_order = cards[pos].1;
    let b_order = cards[swap_pos].1;

    // Swap sort_orders
    conn.execute(
        "UPDATE cards SET sort_order = ?1 WHERE id = ?2",
        rusqlite::params![a_order, b_id],
    )
    .unwrap();
    conn.execute(
        "UPDATE cards SET sort_order = ?1 WHERE id = ?2",
        rusqlite::params![b_order, a_id],
    )
    .unwrap();
}

#[tauri::command]
fn archive_card(db: State<Mutex<Connection>>, id: i64) {
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE cards SET archived = 1 WHERE id = ?1",
        rusqlite::params![id],
    )
    .unwrap();
}

#[tauri::command]
fn restore_card(db: State<Mutex<Connection>>, id: i64, column: String) {
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE cards SET archived = 0, column_name = ?1 WHERE id = ?2",
        rusqlite::params![column, id],
    )
    .unwrap();
}

#[tauri::command]
fn mark_done(db: State<Mutex<Connection>>, id: i64) {
    let conn = db.lock().unwrap();
    let now = now_ms() as i64;
    conn.execute(
        "UPDATE cards SET done_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )
    .unwrap();
}

#[tauri::command]
fn unmark_done(db: State<Mutex<Connection>>, id: i64) {
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE cards SET done_at = NULL WHERE id = ?1",
        rusqlite::params![id],
    )
    .unwrap();
}

#[tauri::command]
fn get_weekly_review(db: State<Mutex<Connection>>) -> Vec<Card> {
    let conn = db.lock().unwrap();
    let week_ago = now_ms() as i64 - 7 * 24 * 60 * 60 * 1000;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, content, tags, column_name, created_at, due_date, archived, score, done_at
             FROM cards WHERE done_at >= ?1
             ORDER BY done_at DESC",
        )
        .unwrap();
    stmt.query_map(rusqlite::params![week_ago], row_to_card)
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
}

#[tauri::command]
fn end_of_day(db: State<Mutex<Connection>>) {
    let conn = db.lock().unwrap();
    conn.execute(
        "UPDATE cards
         SET column_name = 'backlog',
             score = score + 1
         WHERE column_name = 'today' AND archived = 0 AND done_at IS NULL",
        [],
    )
    .unwrap();
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_comments(db: State<Mutex<Connection>>, card_id: i64) -> Vec<Comment> {
    let conn = db.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, card_id, body, created_at, edited_at
             FROM comments WHERE card_id = ?1
             ORDER BY created_at ASC",
        )
        .unwrap();
    stmt.query_map(rusqlite::params![card_id], row_to_comment)
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
}

#[tauri::command]
fn add_comment(db: State<Mutex<Connection>>, card_id: i64, body: String) -> Comment {
    let conn = db.lock().unwrap();
    let now = now_ms() as i64;
    conn.execute(
        "INSERT INTO comments (card_id, body, created_at) VALUES (?1, ?2, ?3)",
        rusqlite::params![card_id, body, now],
    )
    .unwrap();
    let new_id = conn.last_insert_rowid();
    conn.query_row(
        "SELECT id, card_id, body, created_at, edited_at FROM comments WHERE id = ?1",
        rusqlite::params![new_id],
        row_to_comment,
    )
    .unwrap()
}

#[tauri::command]
fn update_comment(db: State<Mutex<Connection>>, id: i64, body: String) {
    let conn = db.lock().unwrap();
    let now = now_ms() as i64;
    conn.execute(
        "UPDATE comments SET body = ?1, edited_at = ?2 WHERE id = ?3",
        rusqlite::params![body, now, id],
    )
    .unwrap();
}

#[tauri::command]
fn delete_comment(db: State<Mutex<Connection>>, id: i64) {
    let conn = db.lock().unwrap();
    conn.execute("DELETE FROM comments WHERE id = ?1", rusqlite::params![id])
        .unwrap();
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = open_db(app);
            app.manage(Mutex::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_cards,
            add_card,
            update_card,
            move_to_column,
            move_within_column,
            archive_card,
            restore_card,
            mark_done,
            unmark_done,
            end_of_day,
            get_weekly_review,
            get_comments,
            add_comment,
            update_comment,
            delete_comment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
