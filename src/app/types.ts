export type ThemeMode = "light" | "dark";

export type BlockId = string;

export type Block = {
  id: BlockId;
  title: string;
  color: string; // css color
  builtIn?: boolean;
};

export type Item = {
  id: string;
  area: BlockId;
  title: string;
  description: string;
  createdAt: number;
  isDone: boolean;
  doneAt?: number | null;
};

export type Reminder = {
  id: string;
  date: string; // YYYY-MM-DD (локальная дата)
  area: BlockId; // куда попадет (today/backlog)
  title: string;
  description: string;
  createdAt: number;
  deliveredAt?: number | null; // чтобы не создавать задачу повторно
};
