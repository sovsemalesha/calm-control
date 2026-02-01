import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAppStore, todayKeyLocal } from "./app/store";
import type { Block, BlockId, Item, Reminder } from "./app/types";
import { Layout } from "./components/Layout";
import { TopBar } from "./components/TopBar";
import { Column } from "./components/Column";
import { TaskModal } from "./components/TaskModal";
import { CreateBlockModal } from "./components/CreateBlockModal";
import { ReminderModal } from "./components/ReminderModal";
import { TomorrowModal } from "./components/TomorrowModal";
import { HistoryModal } from "./components/HistoryModal";
import AddItemModal from "./components/AddItemModal";

type ThemeMode = "light" | "dark";
const THEME_KEY = "cc_theme";
const BLOCK_ORDER_KEY = "cc_block_order_v1";

function readTheme(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY);
  return v === "dark" ? "dark" : "light";
}

function findItemById(itemsByArea: Record<BlockId, Item[]>, id: string): Item | null {
  for (const k of Object.keys(itemsByArea) as BlockId[]) {
    const arr = itemsByArea[k] ?? [];
    const found = arr.find((x) => x.id === id);
    if (found) return found;
  }
  return null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function addDaysKeyLocal(baseKey: string, add: number) {
  const [y, m, d] = baseKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + add);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function readBlockOrder(): string[] {
  try {
    const raw = localStorage.getItem(BLOCK_ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}
function writeBlockOrder(ids: string[]) {
  try {
    localStorage.setItem(BLOCK_ORDER_KEY, JSON.stringify(ids));
  } catch {}
}

function closestBlockIdFromPoint(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!el) return null;
  const host = el.closest?.("[data-cc-block-id]") as HTMLElement | null;
  return host?.dataset?.ccBlockId ?? null;
}

type Ghost = {
  id: BlockId;
  x: number;
  y: number;
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
};

// ReminderModal умеет работать с любыми блоками (кроме "log").
// Но напоминания могут ссылаться на удалённый блок — в этом случае
// мягко откатываемся на "today" или первый доступный блок.
function safeReminderArea(x: string, blocks: Block[]): BlockId {
  const selectable = blocks.filter((b) => b.id !== "log");
  if (selectable.some((b) => b.id === x)) return x;
  if (selectable.some((b) => b.id === "today")) return "today";
  return selectable[0]?.id ?? "today";
}

export default function App() {
  const store = useAppStore();
  const { actions, derived, reminders } = store;

  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [focus, setFocus] = useState<BlockId | null>(null);

  const [dragOver, setDragOver] = useState<BlockId | null>(null);
  const [isDraggingTask, setIsDraggingTask] = useState(false);

  const pendingScrollYRef = useRef<number | null>(null);

  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalMode, setBlockModalMode] = useState<"create" | "edit">("create");
  const [editingBlockId, setEditingBlockId] = useState<BlockId | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>(() => todayKeyLocal());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [remModalOpen, setRemModalOpen] = useState(false);
  const [remModalMode, setRemModalMode] = useState<"create" | "edit">("create");
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const [blockOrder, setBlockOrder] = useState<string[]>(() => readBlockOrder());

  const [dragBlockId, setDragBlockId] = useState<BlockId | null>(null);
  const [dropBlockId, setDropBlockId] = useState<BlockId | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);

  const [ghost, setGhost] = useState<Ghost | null>(null);

  // ✅ модалка добавления задачи в конкретный блок
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemArea, setAddItemArea] = useState<BlockId>("today");

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") actions.deliverDueReminders();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [actions]);

  useLayoutEffect(() => {
    if (pendingScrollYRef.current == null) return;
    window.scrollTo({ top: pendingScrollYRef.current, left: 0, behavior: "auto" });
    pendingScrollYRef.current = null;
  }, [focus, dragOver, dropBlockId]);

  const subtitle = useMemo(() => {
    if (derived.status === "empty") return "Тихо. Можно ничего не добавлять.";
    if (derived.status === "ok") return "Достаточно. Не нужно тащить лишнее в «Сегодня».";
    return "«Сегодня» перегружено. Можно вернуть часть в «Фон».";
  }, [derived.status]);

  const visualActive: BlockId | null = (dragOver ?? focus) as BlockId | null;

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
    alignItems: "start",
  };

  const shellStyleBase: CSSProperties = {
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 18,
    position: "relative",
  };

  const panelStyle = (id: BlockId): CSSProperties => ({
    borderRadius: 18,
    transition: "box-shadow 180ms ease, transform 120ms ease, outline-color 120ms ease, opacity 120ms ease",
    boxShadow: visualActive === id ? "0 18px 44px var(--cc-shadow)" : "0 0 0 rgba(0,0,0,0)",
    transform: dropBlockId === id ? "scale(1.01)" : "scale(1)",
    outline: dropBlockId === id ? "2px solid var(--cc-border)" : "2px solid transparent",
    outlineOffset: -2,
    opacity: dragBlockId === id ? 0.35 : 1,
  });

  const setFocusSafe = (next: BlockId | null) => {
    if (isDraggingTask || dragBlockId) return;
    pendingScrollYRef.current = window.scrollY;
    setFocus(next);
  };

  const onDragEnterArea = (id: BlockId) => setDragOver(id);
  const onDragLeaveArea = (id: BlockId) => setDragOver((cur) => (cur === id ? null : cur));
  const onDragStateChange = (v: boolean) => {
    setIsDraggingTask(v);
    if (!v) setDragOver(null);
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const openItem = (id: string, mode: "view" | "edit" = "view") => {
    setModalItemId(id);
    setModalMode(mode);
  };

  const blocksToShowUnsorted: Block[] = useMemo(
    () => derived.blocks.filter((b) => b.id !== "log"),
    [derived.blocks]
  );

  const blocksToShow: Block[] = useMemo(() => {
    const byId = new Map<string, Block>();
    for (const b of blocksToShowUnsorted) byId.set(b.id, b);

    const ids = blocksToShowUnsorted.map((b) => b.id);
    const cleaned = blockOrder.filter((id) => byId.has(id));
    for (const id of ids) if (!cleaned.includes(id)) cleaned.push(id);

    const prevCleaned = blockOrder.filter((id) => byId.has(id));
    if (cleaned.join("|") !== prevCleaned.join("|") || cleaned.length !== blockOrder.length) {
      setBlockOrder(cleaned);
      writeBlockOrder(cleaned);
    }

    return cleaned.map((id) => byId.get(id)!).filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocksToShowUnsorted, blockOrder]);

  const modalItem = useMemo(() => {
    if (!modalItemId) return null;
    return findItemById(derived.itemsByArea, modalItemId);
  }, [derived.itemsByArea, modalItemId]);

  useEffect(() => {
    if (modalItemId && !modalItem) setModalItemId(null);
  }, [modalItemId, modalItem]);

  const modalDotColor = useMemo(() => {
    if (!modalItem) return "rgb(249,115,22)";
    return derived.blockById[modalItem.area]?.color ?? "rgb(249,115,22)";
  }, [derived.blockById, modalItem]);

  const openCreateBlock = () => {
    setEditingBlockId(null);
    setBlockModalMode("create");
    setBlockModalOpen(true);
  };

  const openRenameBlock = (id: BlockId) => {
    setEditingBlockId(id);
    setBlockModalMode("edit");
    setBlockModalOpen(true);
  };

  const submitBlock = (payload: { title: string; color: string }) => {
    if (blockModalMode === "create") {
      actions.addBlock(payload);
      return;
    }
    if (blockModalMode === "edit" && editingBlockId) {
      actions.renameBlock(editingBlockId, payload);
    }
  };

  const deleteBlock = (b: Block) => {
    const ok = window.confirm(`Удалить блок «${b.title}»?\nВсе задачи из него будут перенесены в «Фон».`);
    if (!ok) return;
    actions.removeBlock(b.id);
    setBlockOrder((cur) => {
      const next = cur.filter((id: string) => id !== b.id);
      writeBlockOrder(next);
      return next;
    });
  };

  const editingBlock = useMemo(() => {
    if (!editingBlockId) return null;
    return derived.blocks.find((b) => b.id === editingBlockId) ?? null;
  }, [derived.blocks, editingBlockId]);

  const remindersByDay = useMemo<Record<string, Reminder[]>>(() => {
    const map: Record<string, Reminder[]> = {};
    for (const r of reminders) {
      if (r.deliveredAt) continue;
      (map[r.date] ??= []).push(r);
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => b.createdAt - a.createdAt);
    return map;
  }, [reminders]);

  const tomorrowKey = useMemo(() => addDaysKeyLocal(todayKeyLocal(), 1), []);
  const tomorrowList = useMemo(() => remindersByDay[tomorrowKey] ?? [], [remindersByDay, tomorrowKey]);

  const tomorrowText = useMemo(() => {
    if (tomorrowList.length === 0) return "Завтра: нет напоминаний";
    const first = tomorrowList[0]?.title ?? "напоминание";
    return tomorrowList.length === 1 ? `Завтра: ${first}` : `Завтра: ${first} +${tomorrowList.length - 1}`;
  }, [tomorrowList]);

  const openCreateReminderForTomorrow = () => {
    setSelectedDay(tomorrowKey);
    setEditingReminder(null);
    setRemModalMode("create");
    setRemModalOpen(true);
  };

  const openEditReminder = (r: Reminder) => {
    setEditingReminder(r);
    setRemModalMode("edit");
    setRemModalOpen(true);
  };

  const logItems = derived.itemsByArea["log"] ?? [];

  const swapBlocks = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    setBlockOrder((cur) => {
      const list = cur.slice();
      const ia = list.indexOf(a);
      const ib = list.indexOf(b);
      if (ia === -1 || ib === -1) return cur;
      const tmp = list[ia];
      list[ia] = list[ib];
      list[ib] = tmp;
      writeBlockOrder(list);
      return list;
    });
  };

  useEffect(() => {
    if (!dragBlockId) return;

    const onMove = (ev: PointerEvent) => {
      if (dragPointerIdRef.current != null && ev.pointerId !== dragPointerIdRef.current) return;

      const id = closestBlockIdFromPoint(ev.clientX, ev.clientY);
      if (!id || id === dragBlockId) setDropBlockId(null);
      else setDropBlockId(id as BlockId);

      setGhost((g) => {
        if (!g) return g;
        return { ...g, x: ev.clientX - g.offsetX, y: ev.clientY - g.offsetY };
      });
    };

    const onUp = (ev: PointerEvent) => {
      if (dragPointerIdRef.current != null && ev.pointerId !== dragPointerIdRef.current) return;

      const from = dragBlockId;
      const to = dropBlockId;

      dragPointerIdRef.current = null;
      setDragBlockId(null);
      setDropBlockId(null);
      setGhost(null);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (from && to) swapBlocks(from, to);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragBlockId, dropBlockId]);

  const startBlockDrag = (e: React.PointerEvent, id: BlockId) => {
    const target = e.target as HTMLElement;
    const blockEl = target.closest?.("[data-cc-block-id]") as HTMLElement | null;
    const rect = blockEl?.getBoundingClientRect();

    dragPointerIdRef.current = e.pointerId;
    setDragBlockId(id);
    setDropBlockId(null);

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    if (rect) {
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      setGhost({ id, x: rect.left, y: rect.top, w: rect.width, h: rect.height, offsetX, offsetY });
    } else {
      setGhost({ id, x: e.clientX - 140, y: e.clientY - 120, w: 280, h: 240, offsetX: 140, offsetY: 24 });
    }
  };

  const ghostBlock = useMemo(() => {
    if (!ghost) return null;
    return blocksToShow.find((b) => b.id === ghost.id) ?? null;
  }, [ghost, blocksToShow]);

  const canManageBlock = (b: Block) => {
    if (b.id === "log") return false;
    if (!b.builtIn) return true;
    return b.id === "backlog" || b.id === "today" || b.id === "important";
  };

  // ✅ плюсик: открываем модалку и запоминаем блок
  const openAddForBlock = (id: BlockId) => {
    setAddItemArea(id);
    setAddItemOpen(true);
  };

  return (
    <Layout theme={theme}>
      <TopBar
        subtitle={subtitle}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAddBlock={openCreateBlock}
        selectedDay={selectedDay}
        onSelectDay={(d) => setSelectedDay(d)}
        onAddReminderForSelectedDay={() => {
          setEditingReminder(null);
          setRemModalMode("create");
          setRemModalOpen(true);
        }}
        remindersByDay={remindersByDay}
        blockById={derived.blockById}
        tomorrowText={tomorrowText}
        onTomorrowToggle={() => setTomorrowOpen((v) => !v)}
        calendarOpen={calendarOpen}
        setCalendarOpen={setCalendarOpen}
        onOpenHistory={() => setHistoryOpen(true)}
        onRemoveReminder={actions.removeReminder}
        onEditReminder={openEditReminder}
      />

      <div style={gridStyle}>
        {blocksToShow.map((b) => {
          const items = derived.itemsByArea[b.id] ?? [];
          const canManage = canManageBlock(b);

          return (
            <div
              key={b.id}
              data-cc-block-id={b.id}
              onMouseEnter={() => setFocusSafe(b.id)}
              onMouseLeave={() => setFocusSafe(null)}
              style={{ ...shellStyleBase, ...panelStyle(b.id) }}
            >
              <Column
                title={b.title}
                items={items}
                emptyText="Пусто."
                area={b.id}
                dotColor={b.color}
                canManage={canManage}
                onAddItem={() => openAddForBlock(b.id)}
                onRenameBlock={() => openRenameBlock(b.id)}
                onDeleteBlock={() => deleteBlock(b)}
                onStartBlockDrag={(e) => startBlockDrag(e, b.id)}
                isBlockDragging={dragBlockId === b.id}
                onDragEnterArea={onDragEnterArea}
                onDragLeaveArea={onDragLeaveArea}
                onDragStateChange={onDragStateChange}
                onOpenItem={openItem}
                actions={{
                  dropItemToArea: actions.dropItemToArea,
                  toggleDone: actions.toggleDone,
                  editItem: actions.editItem,
                  removeItem: actions.removeItem,
                }}
              />
            </div>
          );
        })}
      </div>

      {ghost && ghostBlock && (
        <div
          style={{
            position: "fixed",
            left: ghost.x,
            top: ghost.y,
            width: ghost.w,
            height: ghost.h,
            zIndex: 9999,
            pointerEvents: "none",
            transform: "rotate(-0.8deg) scale(1.02)",
            boxShadow: "0 26px 70px rgba(0,0,0,0.25)",
            borderRadius: 18,
            overflow: "hidden",
            background: "var(--cc-bg)",
            border: "1px solid var(--cc-border)",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              background: "var(--cc-panel)",
              borderBottom: "1px solid var(--cc-border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 650,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 999, background: ghostBlock.color }} />
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ghostBlock.title}</div>
          </div>
          <div style={{ padding: 12, color: "var(--cc-muted)", fontSize: 12 }}>Перемещение…</div>
        </div>
      )}

      <AddItemModal
        open={addItemOpen}
        blockTitle={derived.blockById[addItemArea]?.title ?? "Блок"}
        blockColor={derived.blockById[addItemArea]?.color ?? "rgb(59,130,246)"}
        onClose={() => setAddItemOpen(false)}
        onSubmit={(p: { title: string; description: string }) => {
          actions.addItem({ area: addItemArea, title: p.title, description: p.description });
        }}
      />

      <TomorrowModal
        open={tomorrowOpen}
        title="Завтра"
        dateKey={tomorrowKey}
        reminders={tomorrowList}
        blockById={derived.blockById}
        onClose={() => setTomorrowOpen(false)}
        onAdd={openCreateReminderForTomorrow}
        onEdit={(r) => {
          setSelectedDay(r.date);
          setTomorrowOpen(false);
          openEditReminder(r);
        }}
        onRemove={actions.removeReminder}
      />

      <HistoryModal
        open={historyOpen}
        items={logItems}
        blockById={derived.blockById}
        onClose={() => setHistoryOpen(false)}
        onRemoveItem={actions.removeItem}
      />

      <TaskModal
        open={!!modalItemId}
        item={modalItem}
        startInEdit={modalMode === "edit"}
        dotColor={modalDotColor}
        onClose={() => setModalItemId(null)}
        onToggleDone={actions.toggleDone}
        onEdit={actions.editItem}
        onRemove={actions.removeItem}
      />

      <CreateBlockModal
        open={blockModalOpen}
        mode={blockModalMode}
        initialTitle={blockModalMode === "edit" ? editingBlock?.title ?? "" : ""}
        initialColor={blockModalMode === "edit" ? editingBlock?.color ?? "rgb(59,130,246)" : "rgb(59,130,246)"}
        onClose={() => setBlockModalOpen(false)}
        onSubmit={(payload) => {
          submitBlock(payload);
          setBlockModalOpen(false);
        }}
      />

      <ReminderModal
        open={remModalOpen}
        date={selectedDay}
        mode={remModalMode}
        blocks={derived.blocks}
        initial={
          editingReminder
            ? {
                id: editingReminder.id,
                title: editingReminder.title,
                description: editingReminder.description ?? "",
                area: safeReminderArea(editingReminder.area, derived.blocks),
                date: editingReminder.date,
              }
            : undefined
        }
        onClose={() => setRemModalOpen(false)}
        onSubmit={(p) => {
          if (p.id) {
            actions.editReminder(p.id, { title: p.title, description: p.description, area: p.area, date: p.date });
          } else {
            actions.addReminder({ date: p.date, area: p.area, title: p.title, description: p.description });
          }
        }}
      />
    </Layout>
  );
}
