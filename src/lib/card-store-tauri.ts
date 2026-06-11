import { invoke } from "@tauri-apps/api/core";
import type { CardStore } from "./card-store";
import type { Card, ColumnId } from "./types.ts";

/** Raw card shape returned by the Rust backend (snake_case fields). */
interface RawCard {
  id: number;
  name: string;
  content: string;
  tags: string[];
  column: string;
  created_at: number;
  due_date: string | null;
  archived: boolean | null;
  score: number;
  done_at: number | null;
}

/** Tauri-backed CardStore — delegates all mutations to the Rust backend
 *  via IPC (invoke). Keeps a local cache for synchronous reads. */
export function createTauriCardStore(): CardStore & { init: () => Promise<void> } {
  let _cards: Card[] = [];
  const _listeners = new Set<() => void>();

  function _notify() {
    for (const fn of _listeners) fn();
  }

  /** Normalize an id parameter to a numeric value for IPC calls. */
  function _toNumber(id: number | string): number {
    return typeof id === "number" ? id : Number(id);
  }

  /** Parse a raw card from the backend (snake_case fields → camelCase). */
  function _parse(raw: RawCard): Card {
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

    async add(col: ColumnId, name: string, content: string, tags: string[], dueDate?: string) {
      const raw = await invoke<RawCard>("add_card", {
        column: col,
        name,
        content,
        tags,
        dueDate: dueDate ?? null,
      });

      const card = _parse(raw);

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

      return card;
    },

    async update(
      id: number | string,
      data: { name?: string; content?: string; tags?: string[]; dueDate?: string },
    ) {
      const sid = String(id);

      await invoke("update_card", {
        id: _toNumber(id),
        name: data.name ?? null,
        content: data.content ?? null,
        tags: data.tags ?? null,
        dueDate: data.dueDate ?? null,
      });

      const updateFields: Partial<Card> = {};
      if (data.name !== undefined) updateFields.name = data.name;
      if (data.content !== undefined) updateFields.content = data.content;
      if (data.tags !== undefined) updateFields.tags = data.tags;
      if (data.dueDate !== undefined) updateFields.dueDate = data.dueDate;

      _cards = _cards.map((c) => (c.id === sid ? { ...c, ...updateFields } : c));
      _notify();
    },

    async moveToColumn(id: number | string, target: ColumnId) {
      const sid = String(id);
      await invoke("move_to_column", { id: _toNumber(id), target });
      _cards = _cards.map((c) => (c.id === sid ? { ...c, column: target } : c));
      _notify();
    },

    async moveWithinColumn(id: number | string, direction: -1 | 1) {
      const sid = String(id);
      const idx = _cards.findIndex((c) => c.id === sid);
      if (idx === -1) return;
      const col = _cards[idx].column;
      for (let i = idx + direction; i >= 0 && i < _cards.length; i += direction) {
        if (_cards[i].column === col && !_cards[i].archived && !_cards[i].doneAt) {
          await invoke("move_within_column", { id: _toNumber(id), direction });
          const arr = [..._cards];
          [arr[idx], arr[i]] = [arr[i], arr[idx]];
          _cards = arr;
          _notify();
          return;
        }
      }
    },

    async archive(id: number | string) {
      const sid = String(id);
      await invoke("archive_card", { id: _toNumber(id) });
      _cards = _cards.map((c) => (c.id === sid ? { ...c, archived: true } : c));
      _notify();
    },

    async restore(id: number | string, col: ColumnId) {
      const sid = String(id);
      await invoke("restore_card", { id: _toNumber(id), column: col });
      _cards = _cards.map((c) => (c.id === sid ? { ...c, archived: false, column: col } : c));
      _notify();
    },

    async markDone(id: number | string) {
      const sid = String(id);
      await invoke("mark_done", { id: _toNumber(id) });
      _cards = _cards.map((c) => (c.id === sid ? { ...c, doneAt: Date.now() } : c));
      _notify();
    },

    async unmarkDone(id: number | string) {
      const sid = String(id);
      await invoke("unmark_done", { id: _toNumber(id) });
      _cards = _cards.map((c) => (c.id === sid ? { ...c, doneAt: undefined } : c));
      _notify();
    },

    async endOfDay() {
      await invoke("end_of_day");
      const raw = await invoke<RawCard[]>("get_cards");
      _cards = raw.map(_parse);
      _notify();
    },

    async getWeeklyReview(): Promise<Card[]> {
      const raw = await invoke<RawCard[]>("get_weekly_review");
      return raw.map(_parse);
    },
  };
}
