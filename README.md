# kyo

A keyboard-driven work tracking app. Three columns — Backlog, Today, Upcoming — managed entirely via
the keyboard.

## Features

- **Three-column layout**: Backlog, Today, and auto-generated Upcoming view for cards with due dates
- **Keyboard-first**: navigate, reorder, move, edit, archive, and mark done entirely via shortcuts
- **Score**: cards carried over at End of Day gain a score — backlog sorts by priority
- **Command palette** (`⌘K`): search cards by name, trigger End of Day
- **Markdown**: card content renders as rich text with preview in the editor
- **Tag autocomplete**: suggests existing tags as you type
- **SQLite** backend with versioned migrations

## Stack

- **Frontend**: Svelte 5 + SvelteKit (SPA)
- **Backend**: Rust + Tauri 2
- **Database**: SQLite (via rusqlite + migrations)
- **Package manager**: pnpm
- **Runtime**: Node 24, pnpm (managed via mise)

## Quick start

```bash
mise trust
mise install
pnpm install
pnpm tauri dev
```

## Just recipes

```bash
just format          # biome + cargo fmt
just check           # format-check + lint
just tauri-dev       # pnpm tauri dev
just version         # print current version
just bump-version 0.2.0  # bump and tag a release
```
