use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub name: String,
    pub content: String,
    pub tags: Vec<String>,
    pub column: String,
    pub created_at: u64,
    pub due_date: Option<String>,
    pub archived: Option<bool>,
    pub done: Option<bool>,
}

// ---------------------------------------------------------------------------
// In-memory store managed by Tauri
// ---------------------------------------------------------------------------

struct Store {
    cards: Vec<Card>,
    next_id: u64,
}

impl Store {
    fn sample() -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Self {
            cards: vec![
                Card {
                    id: "1".into(),
                    name: "Setup CI/CD pipeline".into(),
                    content: "Configure GitHub Actions for the project. Need to set up tests and deployment.".into(),
                    tags: vec!["devops".into(), "setup".into()],
                    column: "today".into(),
                    created_at: now - 7200000,
                    due_date: None,
                    archived: None,
                    done: None,
                },
                Card {
                    id: "2".into(),
                    name: "Review PR #42".into(),
                    content: "Review the authentication refactor PR from the team.".into(),
                    tags: vec!["review".into()],
                    column: "today".into(),
                    created_at: now - 3600000,
                    due_date: None,
                    archived: None,
                    done: None,
                },
                Card {
                    id: "3".into(),
                    name: "Design database schema".into(),
                    content: "Draft the initial schema for the user and project tables.".into(),
                    tags: vec!["design".into(), "db".into()],
                    column: "backlog".into(),
                    created_at: now - 86400000,
                    due_date: None,
                    archived: None,
                    done: None,
                },
                Card {
                    id: "4".into(),
                    name: "Write API documentation".into(),
                    content: "Document all REST endpoints with examples.".into(),
                    tags: vec!["docs".into()],
                    column: "backlog".into(),
                    created_at: now - 172800000,
                    due_date: None,
                    archived: None,
                    done: None,
                },
                Card {
                    id: "5".into(),
                    name: "Check Slack thread".into(),
                    content: "Team asked about the deployment timeline, need to respond.".into(),
                    tags: vec!["communication".into()],
                    column: "today".into(),
                    created_at: now - 3600000,
                    due_date: Some("2026-06-10".into()),
                    archived: None,
                    done: None,
                },
                Card {
                    id: "6".into(),
                    name: "Follow up on client email".into(),
                    content: "Client requested changes to the dashboard layout.".into(),
                    tags: vec!["client".into()],
                    column: "backlog".into(),
                    created_at: now - 7200000,
                    due_date: Some("2026-06-11".into()),
                    archived: None,
                    done: None,
                },
            ],
            next_id: 7,
        }
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_cards(store: State<Mutex<Store>>) -> Vec<Card> {
    store.lock().unwrap().cards.clone()
}

#[tauri::command]
fn add_card(
    store: State<Mutex<Store>>,
    column: String,
    name: String,
    content: String,
    tags: Vec<String>,
    due_date: Option<String>,
) -> Card {
    let mut s = store.lock().unwrap();
    let id = s.next_id.to_string();
    s.next_id += 1;

    let card = Card {
        id,
        name,
        content,
        tags,
        column: column.clone(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64,
        due_date,
        archived: None,
        done: None,
    };

    // Insertion logic: today cards go after the first existing today card
    if column == "today" {
        let first_today_idx = s.cards.iter().position(|c| c.column == "today");
        match first_today_idx {
            None => s.cards.push(card.clone()),
            Some(idx) => s.cards.insert(idx + 1, card.clone()),
        }
    } else {
        s.cards.push(card.clone());
    }

    card
}

#[tauri::command]
fn update_card(
    store: State<Mutex<Store>>,
    id: String,
    name: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
    due_date: Option<String>,
) {
    let mut s = store.lock().unwrap();
    if let Some(card) = s.cards.iter_mut().find(|c| c.id == id) {
        if let Some(v) = name {
            card.name = v;
        }
        if let Some(v) = content {
            card.content = v;
        }
        if let Some(v) = tags {
            card.tags = v;
        }
        // Empty string means "clear due date"
        card.due_date = match due_date {
            Some(ref v) if v.is_empty() => None,
            Some(v) => Some(v),
            None => card.due_date.clone(),
        };
    }
}

#[tauri::command]
fn move_to_column(store: State<Mutex<Store>>, id: String, target: String) {
    let mut s = store.lock().unwrap();
    if let Some(card) = s.cards.iter_mut().find(|c| c.id == id) {
        card.column = target;
    }
}

#[tauri::command]
fn move_within_column(store: State<Mutex<Store>>, id: String, direction: i8) {
    let mut s = store.lock().unwrap();
    let idx = match s.cards.iter().position(|c| c.id == id) {
        Some(i) => i,
        None => return,
    };
    let col = s.cards[idx].column.clone();
    let step = if direction > 0 { 1 } else { -1 };
    let mut swap_i = (idx as isize + step) as usize;
    while swap_i < s.cards.len() {
        if s.cards[swap_i].column == col && !s.cards[swap_i].archived.unwrap_or(false) {
            s.cards.swap(idx, swap_i);
            return;
        }
        swap_i = (swap_i as isize + step) as usize;
    }
}

#[tauri::command]
fn archive_card(store: State<Mutex<Store>>, id: String) {
    let mut s = store.lock().unwrap();
    if let Some(card) = s.cards.iter_mut().find(|c| c.id == id) {
        card.archived = Some(true);
    }
}

#[tauri::command]
fn restore_card(store: State<Mutex<Store>>, id: String, column: String) {
    let mut s = store.lock().unwrap();
    if let Some(card) = s.cards.iter_mut().find(|c| c.id == id) {
        card.archived = Some(false);
        card.column = column;
    }
}

#[tauri::command]
fn mark_done(store: State<Mutex<Store>>, id: String) {
    let mut s = store.lock().unwrap();
    if let Some(card) = s.cards.iter_mut().find(|c| c.id == id) {
        card.done = Some(true);
    }
}

#[tauri::command]
fn unmark_done(store: State<Mutex<Store>>, id: String) {
    let mut s = store.lock().unwrap();
    if let Some(card) = s.cards.iter_mut().find(|c| c.id == id) {
        card.done = Some(false);
    }
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(Store::sample()))
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
