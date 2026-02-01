import type { CSSProperties } from "react";
import type { Block, BlockId, Item } from "../app/types";
import { Column } from "./Column";

export function CustomBlockModal({
  open,
  block,
  items,
  onClose,
  onOpenItem,
  actions,
}: {
  open: boolean;
  block: Block | null;
  items: Item[];
  onClose: () => void;
  onOpenItem: (id: string, mode?: "view" | "edit") => void;
  actions: {
    dropItemToArea: (itemId: string, area: BlockId) => void;
    toggleDone: (itemId: string) => void;
    editItem: (itemId: string, patch: { title?: string; description?: string }) => void;
    removeItem: (itemId: string) => void;
  };
}) {
  if (!open || !block) return null;

  return (
    <div
      style={overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modal}>
        <div style={head}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ ...dot, background: block.color }} />
            <div style={{ minWidth: 0 }}>
              <div style={headTitle}>{block.title}</div>
              <div style={headSub}>Задачи и заметки этого блока</div>
            </div>
          </div>

          <button style={xBtn} onClick={onClose} title="Закрыть">
            ×
          </button>
        </div>

        <div style={body}>
          <Column
            title={block.title}
            items={items}
            emptyText="Пусто."
            area={block.id}
            dotColor={block.color}
            canManage={false}
            onRenameBlock={() => {}}
            onDeleteBlock={() => {}}
            onDragEnterArea={() => {}}
            onDragLeaveArea={() => {}}
            onDragStateChange={() => {}}
            onOpenItem={onOpenItem}
            actions={actions}
          />
        </div>

        <div style={hint}>Клик вне окна — закрыть</div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 1700,
};

const modal: CSSProperties = {
  width: "min(860px, 100%)",
  borderRadius: 18,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
  boxShadow: "0 22px 70px rgba(0,0,0,0.45)",
  overflow: "hidden",
};

const head: CSSProperties = {
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  gap: 12,
};

const headTitle: CSSProperties = {
  fontSize: 16,
  fontWeight: 650,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const headSub: CSSProperties = { marginTop: 3, fontSize: 12, color: "var(--cc-muted)" };

const dot: CSSProperties = { width: 10, height: 10, borderRadius: 999, flex: "0 0 auto" };

const xBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 16,
};

const body: CSSProperties = { padding: 14, maxHeight: "72vh", overflow: "auto" };
const hint: CSSProperties = { padding: 12, fontSize: 12, color: "var(--cc-muted)" };
