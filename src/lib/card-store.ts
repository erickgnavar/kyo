import type { Card, ColumnId } from "./types.ts";

// ---------------------------------------------------------------------------
// Interface — swap the factory below for an API-backed version later
// ---------------------------------------------------------------------------

export interface CardStore {
  /** Latest snapshot of all cards (including archived). */
  readonly cards: Card[];
  /** Subscribe to data changes. Returns an unsubscribe function. */
  onUpdate(fn: () => void): () => void;

  getById(id: string): Card | undefined;
  getByColumn(col: ColumnId): Card[];
  getArchived(): Card[];
  getDone(): Card[];

  add(
    col: ColumnId,
    name: string,
    content: string,
    tags: string[],
    dueDate?: string,
  ): Card;
  update(
    id: string,
    data: {
      name?: string;
      content?: string;
      tags?: string[];
      dueDate?: string;
    },
  ): void;
  moveToColumn(id: string, target: ColumnId): void;
  moveWithinColumn(id: string, direction: -1 | 1): void;
  archive(id: string): void;
  restore(id: string, col: ColumnId): void;
  markDone(id: string): void;
  unmarkDone(id: string): void;
}

// ---------------------------------------------------------------------------
// In-memory implementation (swap this file's factory later for an API client)
// ---------------------------------------------------------------------------

function sampleCards(): Card[] {
  return [
    {
      id: "1",
      name: "Setup CI/CD pipeline",
      content:
        "Configure GitHub Actions for the project. Need to set up tests and deployment.",
      tags: ["devops", "setup"],
      column: "today",
      createdAt: Date.now() - 7200000,
    },
    {
      id: "2",
      name: "Review PR #42",
      content: "Review the authentication refactor PR from the team.",
      tags: ["review"],
      column: "today",
      createdAt: Date.now() - 3600000,
    },
    {
      id: "3",
      name: "Design database schema",
      content: "Draft the initial schema for the user and project tables.",
      tags: ["design", "db"],
      column: "backlog",
      createdAt: Date.now() - 86400000,
    },
    {
      id: "4",
      name: "Write API documentation",
      content: "Document all REST endpoints with examples.",
      tags: ["docs"],
      column: "backlog",
      createdAt: Date.now() - 172800000,
    },
    {
      id: "5",
      name: "Check Slack thread",
      content: "Team asked about the deployment timeline, need to respond.",
      tags: ["communication"],
      column: "today",
      createdAt: Date.now() - 3600000,
      dueDate: "2026-06-10",
    },
    {
      id: "6",
      name: "Follow up on client email",
      content: "Client requested changes to the dashboard layout.",
      tags: ["client"],
      column: "backlog",
      createdAt: Date.now() - 7200000,
      dueDate: "2026-06-11",
    },
  ];
}

function maxId(cards: Card[]): number {
  return cards.reduce((max, c) => Math.max(max, Number(c.id)), 0);
}

export function createInMemoryCardStore(): CardStore {
  const _initial = sampleCards();
  let _cards: Card[] = _initial;
  let _nextId = maxId(_initial) + 1;
  const _listeners = new Set<() => void>();

  function _notify() {
    for (const fn of _listeners) fn();
  }

  return {
    get cards() {
      return _cards;
    },

    onUpdate(fn: () => void) {
      _listeners.add(fn);
      return () => _listeners.delete(fn);
    },

    getById(id: string) {
      return _cards.find((c) => c.id === id);
    },

    getByColumn(col: ColumnId) {
      return _cards.filter((c) => c.column === col && !c.archived && !c.done);
    },

    getArchived() {
      return _cards.filter((c) => c.archived && !c.done);
    },

    getDone() {
      return _cards.filter((c) => c.done);
    },

    add(
      col: ColumnId,
      name: string,
      content: string,
      tags: string[],
      dueDate?: string,
    ) {
      const card: Card = {
        id: String(_nextId++),
        name,
        content,
        tags,
        column: col,
        createdAt: Date.now(),
        dueDate: dueDate || undefined,
      };

      if (col === "today") {
        const todayCards = _cards.filter(
          (c) => c.column === "today" && !c.archived,
        );
        if (todayCards.length === 0) {
          _cards = [..._cards, card];
        } else {
          const firstTodayIdx = _cards.findIndex((c) => c.column === "today");
          _cards = [
            ..._cards.slice(0, firstTodayIdx + 1),
            card,
            ..._cards.slice(firstTodayIdx + 1),
          ];
        }
      } else {
        _cards = [..._cards, card];
      }
      _notify();
      return card;
    },

    update(
      id: string,
      data: {
        name?: string;
        content?: string;
        tags?: string[];
        dueDate?: string;
      },
    ) {
      _cards = _cards.map((c) => (c.id === id ? { ...c, ...data } : c));
      _notify();
    },

    moveToColumn(id: string, target: ColumnId) {
      _cards = _cards.map((c) => (c.id === id ? { ...c, column: target } : c));
      _notify();
    },

    moveWithinColumn(id: string, direction: -1 | 1) {
      const idx = _cards.findIndex((c) => c.id === id);
      if (idx === -1) return;
      const col = _cards[idx].column;
      for (
        let i = idx + direction;
        i >= 0 && i < _cards.length;
        i += direction
      ) {
        if (_cards[i].column === col && !_cards[i].archived) {
          const arr = [..._cards];
          [arr[idx], arr[i]] = [arr[i], arr[idx]];
          _cards = arr;
          _notify();
          return;
        }
      }
    },

    archive(id: string) {
      _cards = _cards.map((c) => (c.id === id ? { ...c, archived: true } : c));
      _notify();
    },

    restore(id: string, col: ColumnId) {
      _cards = _cards.map((c) =>
        c.id === id ? { ...c, archived: false, column: col } : c,
      );
      _notify();
    },

    markDone(id: string) {
      _cards = _cards.map((c) => (c.id === id ? { ...c, done: true } : c));
      _notify();
    },

    unmarkDone(id: string) {
      _cards = _cards.map((c) => (c.id === id ? { ...c, done: false } : c));
      _notify();
    },
  };
}
