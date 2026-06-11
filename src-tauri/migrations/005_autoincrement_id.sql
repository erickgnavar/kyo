-- Convert id from TEXT to INTEGER PRIMARY KEY AUTOINCREMENT
-- SQLite doesn't support ALTER TABLE to change primary key type,
-- so we recreate the table and copy data.

CREATE TABLE cards_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    column_name TEXT NOT NULL DEFAULT 'backlog' CHECK (
        column_name IN ('backlog', 'today')
    ),
    created_at INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
    score INTEGER NOT NULL DEFAULT 0,
    done_at INTEGER
);

INSERT INTO cards_new (id, name, content, tags, column_name, created_at, sort_order, due_date, archived, score, done_at)
SELECT CAST(id AS INTEGER), name, content, tags, column_name, created_at, sort_order, due_date, archived, score, done_at
FROM cards;

DROP TABLE cards;

ALTER TABLE cards_new RENAME TO cards;

CREATE INDEX idx_cards_column ON cards (column_name, archived, sort_order);
