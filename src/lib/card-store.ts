import type { Card, ColumnId } from "./types.ts";

// ---------------------------------------------------------------------------
// Interface for the card data store.
// Swap the factory import in +page.svelte to switch backend.
// ---------------------------------------------------------------------------

export interface CardStore {
  /** Latest snapshot of all cards (including archived). */
  readonly cards: Card[];
  /** Subscribe to data changes. Returns an unsubscribe function. */
  onUpdate(fn: () => void): () => void;

  getById(id: number | string): Card | undefined;
  getByColumn(col: ColumnId): Card[];
  getArchived(): Card[];
  getDone(): Card[];

  add(col: ColumnId, name: string, content: string, tags: string[], dueDate?: string): Card;
  update(
    id: number | string,
    data: {
      name?: string;
      content?: string;
      tags?: string[];
      dueDate?: string;
    },
  ): void;
  moveToColumn(id: number | string, target: ColumnId): void;
  moveWithinColumn(id: number | string, direction: -1 | 1): void;
  archive(id: number | string): void;
  restore(id: number | string, col: ColumnId): void;
  markDone(id: number | string): void;
  unmarkDone(id: number | string): void;
  endOfDay(): void;
  getWeeklyReview(): Promise<Card[]>;
}
