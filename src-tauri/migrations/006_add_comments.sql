CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    edited_at INTEGER,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_card ON comments (card_id, created_at);
