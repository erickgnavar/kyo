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
  done?: boolean;
}
