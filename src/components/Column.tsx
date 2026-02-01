import type { CSSProperties } from "react";
import { useMemo, useRef, useState } from "react";
import type { BlockId, Item } from "../app/types";

function getIsDone(item: Item): boolean {
  return Boolean(item.isDone);
}

export function Column({
  title,
  items,
  emptyText,
  area,
  dotColor,
  canManage,

  onAddItem,
  onRenameBlock,
  onDeleteBlock,

  onStartBlockDrag,
  isBlockDragging,

  onDragEnterArea,
  onDragLeaveArea,
  onDragStateChange,
  onOpenItem,
  actions,
}: {
  title: string;
  items: Item[];
  emptyText: string;
  area: BlockId;
  dotColor: string;
  canManage: boolean;

  onAddItem?: () => void; // ✅ теперь optional
  onRenameBlock: () => void;
  onDeleteBlock: () => void;

  onStartBlockDrag?: (e: React.PointerEvent) => void;
  isBlockDragging?: boolean;

  onDragEnterArea: (area: BlockId) => void;
  onDragLeaveArea: (area: BlockId) => void;
  onDragStateChange: (v: boolean) => void;
  onOpenItem: (id: string, mode?: "view" | "edit") => void;
  actions: {
    dropItemToArea: (itemId: string, area: BlockId) => void;
    toggleDone: (itemId: string) => void;
    editItem: (itemId: string, patch: { title?: string; description?: string }) => void;
    removeItem: (itemId: string) => void;
  };
}) {
  const shown = useMemo(() => items, [items]);

  return (
    <div style={wrap}>
      <div
        style={{
          ...head,
          cursor: onStartBlockDrag ? "grab" : "default",
          opacity: isBlockDragging ? 0.6 : 1,
        }}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-cc-head-btn]")) return;
          if (e.button !== 0) return;
          onStartBlockDrag?.(e);
        }}
        title={onStartBlockDrag ? "Потяни за шапку, чтобы переставить блок" : undefined}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ ...dot, background: dotColor }} />
          <div style={headTitle}>{title}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onAddItem && (
            <button data-cc-head-btn style={headBtn} onClick={onAddItem} title="Добавить задачу">
              ＋
            </button>
          )}

          {canManage && (
            <>
              <button data-cc-head-btn style={headBtn} onClick={onRenameBlock} title="Редактировать блок">
                ✎
              </button>
              <button data-cc-head-btn style={headBtn} onClick={onDeleteBlock} title="Удалить блок">
                ×
              </button>
            </>
          )}
        </div>
      </div>

      <div
        style={list}
        onDragEnter={() => onDragEnterArea(area)}
        onDragLeave={() => onDragLeaveArea(area)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id) actions.dropItemToArea(id, area);
          onDragStateChange(false);
        }}
      >
        {shown.length === 0 ? (
          <div style={empty}>{emptyText}</div>
        ) : (
          shown.map((it) => (
            <TaskRow
              key={it.id}
              item={it}
              blockColor={dotColor}
              onOpen={onOpenItem}
              actions={actions}
              onDragStateChange={onDragStateChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskRow({
  item,
  blockColor,
  onOpen,
  actions,
  onDragStateChange,
}: {
  item: Item;
  blockColor: string;
  onOpen: (id: string, mode?: "view" | "edit") => void;
  actions: {
    toggleDone: (itemId: string) => void;
    removeItem: (itemId: string) => void;
  };
  onDragStateChange: (v: boolean) => void;
}) {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const isDone = getIsDone(item);
  const dotCol = isDone ? "rgb(34,197,94)" : blockColor;

  const makeGhost = (titleText: string, dotColorGhost: string, w: number) => {
    const ghost = document.createElement("div");
    ghost.style.width = `${Math.max(220, Math.min(w, 520))}px`;
    ghost.style.padding = "10px 12px";
    ghost.style.borderRadius = "14px";
    ghost.style.border = "1px solid rgba(0,0,0,0.10)";
    ghost.style.boxShadow = "0 22px 60px rgba(0,0,0,0.22)";
    ghost.style.background = "rgba(255,255,255,0.95)";
    ghost.style.backdropFilter = "blur(6px)";
    ghost.style.transform = "rotate(-1deg) scale(1.02)";
    ghost.style.display = "flex";
    ghost.style.alignItems = "center";
    ghost.style.gap = "10px";
    ghost.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
    ghost.style.fontWeight = "600";
    ghost.style.color = "#111";
    ghost.style.pointerEvents = "none";
    ghost.style.position = "fixed";
    ghost.style.left = "-10000px";
    ghost.style.top = "-10000px";
    ghost.style.zIndex = "9999";

    const dotEl = document.createElement("span");
    dotEl.style.width = "8px";
    dotEl.style.height = "8px";
    dotEl.style.borderRadius = "999px";
    dotEl.style.flex = "0 0 auto";
    dotEl.style.background = dotColorGhost;

    const text = document.createElement("div");
    text.textContent = titleText;
    text.style.whiteSpace = "nowrap";
    text.style.overflow = "hidden";
    text.style.textOverflow = "ellipsis";

    ghost.appendChild(dotEl);
    ghost.appendChild(text);
    return ghost;
  };

  return (
    <div
      ref={rowRef}
      style={{
        ...row,
        opacity: dragging ? 0.35 : 1,
        transition: "opacity 120ms ease",
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStateChange(true);
        setDragging(true);

        const rect = rowRef.current?.getBoundingClientRect();
        const w = rect?.width ?? 320;

        const ghost = makeGhost(item.title, dotCol, w);
        document.body.appendChild(ghost);

        const offsetX = rect ? Math.min(Math.max(16, e.clientX - rect.left), rect.width - 16) : 24;
        const offsetY = rect ? Math.min(Math.max(10, e.clientY - rect.top), rect.height - 10) : 16;

        try {
          e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
        } catch {}

        window.setTimeout(() => ghost.remove(), 0);
      }}
      onDragEnd={() => {
        onDragStateChange(false);
        setDragging(false);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(item.id, "view")}
    >
      <div style={left}>
        <span style={{ ...smallDot, background: dotCol }} />
        <div style={rowTitle}>{item.title}</div>
      </div>

      <div
        style={{
          ...actionsSlot,
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? "auto" : "none",
        }}
      >
        <button
          style={miniBtn}
          onClick={(ev) => {
            ev.stopPropagation();
            actions.toggleDone(item.id);
          }}
          title={isDone ? "Снять выполнение" : "Отметить выполнено"}
        >
          ✓
        </button>

        <button
          style={miniBtn}
          onClick={(ev) => {
            ev.stopPropagation();
            onOpen(item.id, "edit");
          }}
          title="Редактировать"
        >
          ✎
        </button>

        <button
          style={miniBtn}
          onClick={(ev) => {
            ev.stopPropagation();
            actions.removeItem(item.id);
          }}
          title="Удалить"
        >
          ×
        </button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
};

const head: CSSProperties = {
  padding: "10px 12px",
  background: "var(--cc-panel)",
  borderBottom: "1px solid var(--cc-border)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  userSelect: "none",
};

const dot: CSSProperties = { width: 10, height: 10, borderRadius: 999, flex: "0 0 auto" };

const headTitle: CSSProperties = {
  fontWeight: 650,
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const headBtn: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 10,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  lineHeight: 1,
};

const list: CSSProperties = {
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  overflow: "auto",
  height: "100%",
};

const empty: CSSProperties = { fontSize: 13, color: "var(--cc-muted)", padding: 10 };

const row: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  padding: "10px 10px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  boxSizing: "border-box",
};

const left: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  flex: "1 1 auto",
};

const smallDot: CSSProperties = { width: 8, height: 8, borderRadius: 999, flex: "0 0 auto" };

const rowTitle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 600,
};

const actionsSlot: CSSProperties = {
  width: 100,
  flex: "0 0 100px",
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  alignItems: "center",
  transition: "opacity 120ms ease",
};

const miniBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 10,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  lineHeight: 1,
};
