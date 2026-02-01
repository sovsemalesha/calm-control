import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Block, BlockId, Item, Reminder } from "./types";

export function todayKeyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Derived = {
  blocks: Block[];
  blockById: Record<string, Block>;
  itemsByArea: Record<string, Item[]>;
  status: "empty" | "ok" | "warn";
  todayLimit: number;
};

type State = {
  blocks: Block[];
  items: Item[];
  reminders: Reminder[];
  todayLimit: number;

  derived: Derived;

  actions: {
    addItem: (p: { title: string; description?: string; area: BlockId }) => void;
    editItem: (id: string, patch: { title?: string; description?: string }) => void;
    removeItem: (id: string) => void;

    toggleDone: (id: string) => void;
    dropItemToArea: (id: string, area: BlockId) => void;

    addBlock: (p: { title: string; color: string }) => void;
    renameBlock: (id: BlockId, p: { title: string; color: string }) => void;
    removeBlock: (id: BlockId) => void;

    addReminder: (p: { date: string; area: BlockId; title: string; description?: string }) => void;
    editReminder: (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => void;
    removeReminder: (id: string) => void;
    deliverDueReminders: () => void;

    setAll: (p: { blocks: Block[]; items: Item[]; reminders: Reminder[]; todayLimit?: number }) => void;
  };
};

const BUILTIN: Block[] = [
  { id: "backlog", title: "Фон", color: "rgb(249,115,22)", builtIn: true },
  { id: "today", title: "Сегодня", color: "rgb(59,130,246)", builtIn: true },
  { id: "important", title: "Важно", color: "rgb(239,68,68)", builtIn: true },
  { id: "log", title: "Лог", color: "rgb(34,197,94)", builtIn: true },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function recompute(blocks: Block[], items: Item[], todayLimit: number): Derived {
  const blockById: Record<string, Block> = {};
  for (const b of blocks) blockById[b.id] = b;

  const itemsByArea: Record<string, Item[]> = {};
  for (const it of items) {
    (itemsByArea[it.area] ??= []).push(it);
  }

  for (const k of Object.keys(itemsByArea)) {
    itemsByArea[k].sort((a, b) => b.createdAt - a.createdAt);
  }

  const todayCount = (itemsByArea["today"] ?? []).filter((x) => !x.isDone).length;
  const status: "empty" | "ok" | "warn" =
    items.length === 0 ? "empty" : todayCount <= todayLimit ? "ok" : "warn";

  return { blocks, blockById, itemsByArea, status, todayLimit };
}

function canEditBlock(id: BlockId) {
  return id === "backlog" || id === "today" || id === "important";
}

function normalizeBlocks(incoming: Block[]): Block[] {
  const byId = new Map<string, Block>();
  for (const b of incoming) byId.set(b.id, b);

  for (const b of BUILTIN) {
    if (!byId.has(b.id)) byId.set(b.id, b);
    else {
      const existing = byId.get(b.id)!;
      byId.set(b.id, { ...existing, builtIn: true });
    }
  }

  const out: Block[] = [];
  for (const b of byId.values()) {
    const title = (b.title ?? "").trim();
    const color = (b.color ?? "rgb(59,130,246)").trim();
    out.push({
      id: String(b.id),
      title: title || String(b.id),
      color,
      builtIn: b.builtIn ?? false,
    });
  }

  out.sort((a, b) => (a.builtIn === b.builtIn ? 0 : a.builtIn ? -1 : 1));
  return out;
}

function normalizeItems(incoming: Item[], blocks: Block[]): Item[] {
  const blockIds = new Set(blocks.map((b) => b.id));
  return incoming
    .map((it) => {
      const area = blockIds.has(it.area) ? it.area : "backlog";
      return {
        ...it,
        id: String(it.id),
        area,
        title: (it.title ?? "").trim(),
        description: (it.description ?? "").trim(),
        createdAt: Number(it.createdAt ?? Date.now()),
        isDone: Boolean(it.isDone),
        doneAt: it.doneAt === undefined ? null : it.doneAt,
      } as Item;
    })
    .filter((it) => it.title.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeReminders(incoming: Reminder[], blocks: Block[]): Reminder[] {
  const blockIds = new Set(blocks.map((b) => b.id).filter((x) => x !== "log"));
  return incoming
    .map((r) => {
      const area = blockIds.has(r.area) ? r.area : "today";
      return {
        ...r,
        id: String(r.id),
        date: String(r.date),
        area,
        title: (r.title ?? "").trim(),
        description: (r.description ?? "").trim(),
        createdAt: Number(r.createdAt ?? Date.now()),
        deliveredAt: r.deliveredAt === undefined ? null : r.deliveredAt,
      } as Reminder;
    })
    .filter((r) => r.title.length > 0 && r.date.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export const useAppStore = create<State>()(
  persist(
    (set) => {
      const initialBlocks = [...BUILTIN];
      const initialItems: Item[] = [];
      const initialReminders: Reminder[] = [];
      const initialTodayLimit = 5;

      return {
        blocks: initialBlocks,
        items: initialItems,
        reminders: initialReminders,
        todayLimit: initialTodayLimit,

        derived: recompute(initialBlocks, initialItems, initialTodayLimit),

        actions: {
          setAll: ({ blocks, items, reminders, todayLimit }) => {
            set((s) => {
              const nextBlocks = normalizeBlocks(blocks ?? []);
              const nextItems = normalizeItems(items ?? [], nextBlocks);
              const nextReminders = normalizeReminders(reminders ?? [], nextBlocks);
              const nextTodayLimit = typeof todayLimit === "number" ? todayLimit : s.todayLimit;

              return {
                ...s,
                blocks: nextBlocks,
                items: nextItems,
                reminders: nextReminders,
                todayLimit: nextTodayLimit,
                derived: recompute(nextBlocks, nextItems, nextTodayLimit),
              };
            });
          },

          addItem: ({ title, description, area }) => {
            const t = title.trim();
            if (!t) return;

            set((s) => {
              const now = Date.now();
              const it: Item = {
                id: uid("item"),
                area,
                title: t,
                description: (description ?? "").trim(),
                createdAt: now,
                isDone: false,
                doneAt: null,
              };

              const items = [it, ...s.items];
              return { ...s, items, derived: recompute(s.blocks, items, s.todayLimit) };
            });
          },

          editItem: (id, patch) => {
            set((s) => {
              const items = s.items.map((it) => {
                if (it.id !== id) return it;
                return {
                  ...it,
                  title: patch.title !== undefined ? patch.title : it.title,
                  description: patch.description !== undefined ? patch.description : it.description,
                };
              });
              return { ...s, items, derived: recompute(s.blocks, items, s.todayLimit) };
            });
          },

          removeItem: (id) => {
            set((s) => {
              const items = s.items.filter((it) => it.id !== id);
              return { ...s, items, derived: recompute(s.blocks, items, s.todayLimit) };
            });
          },

          toggleDone: (id) => {
            set((s) => {
              const now = Date.now();
              const items = s.items.map((it) => {
                if (it.id !== id) return it;

                const nextDone = !it.isDone;

                if (nextDone) return { ...it, isDone: true, doneAt: now, area: "log" };
                return { ...it, isDone: false, doneAt: null, area: "today" };
              });

              return { ...s, items, derived: recompute(s.blocks, items, s.todayLimit) };
            });
          },

          dropItemToArea: (id, area) => {
            set((s) => {
              const now = Date.now();
              const items = s.items.map((it) => {
                if (it.id !== id) return it;

                if (area === "log") return { ...it, area, isDone: true, doneAt: now };
                if (it.area === "log" && area !== "log") return { ...it, area, isDone: false, doneAt: null };
                return { ...it, area };
              });

              return { ...s, items, derived: recompute(s.blocks, items, s.todayLimit) };
            });
          },

          addBlock: ({ title, color }) => {
            const t = title.trim();
            if (!t) return;

            set((s) => {
              const b: Block = { id: uid("block"), title: t, color, builtIn: false };
              const blocks = [...s.blocks, b];
              return { ...s, blocks, derived: recompute(blocks, s.items, s.todayLimit) };
            });
          },

          renameBlock: (id, p) => {
            set((s) => {
              if (id === "log") return s;

              const target = s.blocks.find((b) => b.id === id);
              if (!target) return s;

              if (target.builtIn && !canEditBlock(id)) return s;

              const blocks = s.blocks.map((b) =>
                b.id === id ? { ...b, title: p.title.trim(), color: p.color } : b
              );

              return { ...s, blocks, derived: recompute(blocks, s.items, s.todayLimit) };
            });
          },

          removeBlock: (id) => {
            set((s) => {
              const target = s.blocks.find((b) => b.id === id);
              if (!target) return s;
              if (target.builtIn) return s;

              const items = s.items.map((it) => (it.area === id ? { ...it, area: "backlog" } : it));
              const blocks = s.blocks.filter((b) => b.id !== id);

              return { ...s, blocks, items, derived: recompute(blocks, items, s.todayLimit) };
            });
          },

          addReminder: ({ date, area, title, description }) => {
            const t = title.trim();
            if (!t) return;

            set((s) => {
              const r: Reminder = {
                id: uid("rem"),
                date,
                area,
                title: t,
                description: (description ?? "").trim(),
                createdAt: Date.now(),
                deliveredAt: null,
              };
              return { ...s, reminders: [r, ...s.reminders] };
            });
          },

          editReminder: (id, patch) => {
            set((s) => {
              const reminders = s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r));
              return { ...s, reminders };
            });
          },

          removeReminder: (id) => {
            set((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
          },

          deliverDueReminders: () => {
            set((s) => {
              const today = todayKeyLocal();
              const now = Date.now();

              const newItems: Item[] = [];
              const reminders = s.reminders.map((r) => {
                if (r.deliveredAt) return r;
                if (r.date > today) return r;

                const it: Item = {
                  id: uid("item"),
                  area: r.area,
                  title: r.title,
                  description: r.description ?? "",
                  createdAt: now,
                  isDone: false,
                  doneAt: null,
                };
                newItems.push(it);

                return { ...r, deliveredAt: now };
              });

              const items = [...newItems, ...s.items];
              return { ...s, reminders, items, derived: recompute(s.blocks, items, s.todayLimit) };
            });
          },
        },
      };
    },
    {
      name: "calm-control-store-v1",
      partialize: (s) => ({
        blocks: s.blocks,
        items: s.items,
        reminders: s.reminders,
        todayLimit: s.todayLimit,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        (state as any).derived = recompute(
          (state as any).blocks ?? [...BUILTIN],
          (state as any).items ?? [],
          (state as any).todayLimit ?? 5
        );
      },
    }
  )
);
