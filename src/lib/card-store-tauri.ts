import { invoke } from "@tauri-apps/api/core";
import type { CardStore } from "./card-store";
import type { Card, ColumnId } from "./types.ts";

/** Tauri-backed CardStore — delegates all mutations to the Rust backend
 *  via IPC (invoke). Keeps a local cache for synchronous reads. */
export function createTauriCardStore(): CardStore & { init: () => Promise<void> } {
  let _cards: Card[] = [];
  const _listeners = new Set<() => void>();
  let _tempIdCounter = 0;

  function _notify() {
    for (const fn of _listeners) fn();
  }

  /** Generate a temporary string ID for optimistic updates. */
  function _tempId(): string {
    return `temp-${--_tempIdCounter}`;
  }

  /** Normalize an id parameter to a numeric value for IPC calls. */
  function _toNumber(id: number | string): number {
    return typeof id === "number" ? id : Number(id);
  }

  /** Parse a raw card from the backend (snake_case fields → camelCase). */
  function _parse(raw: any): Card {
    return {
      id: String(raw.id),
      name: raw.name,
      content: raw.content,
      tags: raw.tags ?? [],
      column: raw.column as ColumnId,
      createdAt: raw.created_at,
      dueDate: raw.due_date ?? undefined,
      archived: raw.archived ?? undefined,
      score: raw.score ?? 0,
      doneAt: raw.done_at ?? undefined,
    };
  }

  return {
    async init() {
      _cards = (await invoke<any[]>("get_cards")).map(_parse);
      _notify();
    },

    get cards() {
      return _cards;
    },

    onUpdate(fn: () => void) {
      _listeners.add(fn);
      return () => _listeners.delete(fn);
    },

    getById(id: number | string) {
      return _cards.find((c) => c.id === String(id));
    },

    getByColumn(col: ColumnId) {
      return _cards.filter((c) => c.column === col && !c.archived && !c.doneAt);
    },

    getArchived() {
      return _cards.filter((c) => c.archived && !c.doneAt);
    },

    getDone() {
      return _cards.filter((c) => c.doneAt);
    },

    add(col: ColumnId, name: string, content: string, tags: string[], dueDate?: string) {
      // Optimistic local update
      const id = _tempId();
      const card: Card = {
        id,
        name,
        content,
        tags,
        column: col,
        createdAt: Date.now(),
        dueDate: dueDate || undefined,
      };

      if (col === "today") {
        const todayCards = _cards.filter((c) => c.column === "today" && !c.archived && !c.doneAt);
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

      // Fire-and-forget to backend
      invoke("add_card", {
        column: col,
        name,
        content,
        tags,
        dueDate: dueDate ?? null,
      }).then((raw: any) => {
        // On success, reconcile: replace our temporary id with the backend's id
        if (raw?.id) {
          _cards = _cards.map((c) => (c.id === id ? _parse(raw) : c));
          _notify();
        }
      });

      return card;
    },

    update(
      id: number | string,
      data: { name?: string; content?: string; tags?: string[]; dueDate?: string },
    ) {
      // Optimistic local update
      const sid = String(id);
      const updateFields: Partial<Card> = {};
      if (data.name !== undefined) updateFields.name = data.name;
      if (data.content !== undefined) updateFields.content = data.content;
      if (data.tags !== undefined) updateFields.tags = data.tags;
      if (data.dueDate !== undefined) updateFields.dueDate = data.dueDate;

      _cards = _cards.map((c) => (c.id === sid ? { ...c, ...updateFields } : c));
      _notify();

      invoke("update_card", {
        id: _toNumber(id),
        name: data.name ?? null,
        content: data.content ?? null,
        tags: data.tags ?? null,
        dueDate: data.dueDate ?? null,
      });
    },

    moveToColumn(id: number | string, target: ColumnId) {
      const sid = String(id);
      _cards = _cards.map((c) => (c.id === sid ? { ...c, column: target } : c));
      _notify();
      invoke("move_to_column", { id: _toNumber(id), target });
    },

    moveWithinColumn(id: number | string, direction: -1 | 1) {
      const sid = String(id);
      const idx = _cards.findIndex((c) => c.id === sid);
      if (idx === -1) return;
      const col = _cards[idx].column;
      for (let i = idx + direction; i >= 0 && i < _cards.length; i += direction) {
        if (_cards[i].column === col && !_cards[i].archived && !_cards[i].doneAt) {
          const arr = [..._cards];
          [arr[idx], arr[i]] = [arr[i], arr[idx]];
          _cards = arr;
          _notify();
          invoke("move_within_column", { id: _toNumber(id), direction });
          return;
        }
      }
    },

    archive(id: number | string) {
      const sid = String(id);
      _cards = _cards.map((c) => (c.id === sid ? { ...c, archived: true } : c));
      _notify();
      invoke("archive_card", { id: _toNumber(id) });
    },

    restore(id: number | string, col: ColumnId) {
      const sid = String(id);
      _cards = _cards.map((c) => (c.id === sid ? { ...c, archived: false, column: col } : c));
      _notify();
      invoke("restore_card", { id: _toNumber(id), column: col });
    },

    markDone(id: number | string) {
      const sid = String(id);
      _cards = _cards.map((c) => (c.id === sid ? { ...c, doneAt: Date.now() } : c));
      _notify();
      invoke("mark_done", { id: _toNumber(id) });
    },

    unmarkDone(id: number | string) {
      const sid = String(id);
      _cards = _cards.map((c) => (c.id === sid ? { ...c, doneAt: undefined } : c));
      _notify();
      invoke("unmark_done", { id: _toNumber(id) });
    },

    endOfDay() {
      // Optimistically clear today column, then refresh from backend
      const todayIds = _cards
        .filter((c) => c.column === "today" && !c.archived && !c.doneAt)
        .map((c) => c.id);
      _cards = _cards.map((c) =>
        todayIds.includes(c.id) ? { ...c, column: "backlog", score: (c.score ?? 0) + 1 } : c,
      );
      _notify();

      invoke("end_of_day").then(() => {
        // Reconcile with backend after the mutation
        invoke("get_cards").then((raw: any) => {
          _cards = raw.map(_parse);
          _notify();
        });
      });
    },

    async getWeeklyReview(): Promise<Card[]> {
      const raw = await invoke<any[]>("get_weekly_review");
      return raw.map(_parse);
    },
  };
}
