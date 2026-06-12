export type ColumnId = "today" | "backlog";

export interface Card {
  id: string;
  name: string;
  content: string;
  tags: string[];
  column: ColumnId;
  createdAt: number;
  dueDate?: string;
  archived?: boolean;
  score?: number;
  doneAt?: number;
}

export interface Comment {
  id: string;
  cardId: string;
  body: string;
  createdAt: number;
  editedAt?: number;
}
