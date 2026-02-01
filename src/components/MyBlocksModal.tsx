import type { CSSProperties } from "react";
import type { Block, BlockId } from "../app/types";

export function MyBlocksModal({
  open,
  blocks,
  onClose,
  onOpenBlock,
  onCreate,
  onRename,
  onDelete,
}: {
  open: boolean;
  blocks: Block[]; // только custom (не builtIn)
  onClose: () => void;
  onOpenBlock: (id: BlockId) => void;
  onCreate: () => void;
  onRename: (id: BlockId) => void;
  onDelete: (b: Block) => void;
}) {
  if (!open) return null;

  return (
    <div
      style={overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modal}>
        <div style={head}>
          <div>
            <div style={headTitle}>Мои блоки</div>
            <div style={headSub}>Заметки, цели, списки — всё, что ты создаёшь сам</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={btn} onClick={onCreate} title="Создать блок">
              + Создать
            </button>
            <button style={xBtn} onClick={onClose} title="Закрыть">
              ×
            </button>
          </div>
        </div>

        <div style={body}>
          {blocks.length === 0 ? (
            <div style={muted}>Пока нет кастомных блоков. Нажми “+ Создать”.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {blocks.map((b) => (
                <div key={b.id} style={row}>
                  <button style={openBtn} onClick={() => onOpenBlock(b.id)} title="Открыть блок">
                    <span style={{ ...dot, background: b.color }} />
                    <span style={rowTitle}>{b.title}</span>
                  </button>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={iconBtn} onClick={() => onRename(b.id)} title="Переименовать">
                      ✎
                    </button>
                    <button style={iconBtn} onClick={() => onDelete(b)} title="Удалить">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  zIndex: 1600,
};

const modal: CSSProperties = {
  width: "min(720px, 100%)",
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

const headTitle: CSSProperties = { fontSize: 16, fontWeight: 650 };
const headSub: CSSProperties = { marginTop: 3, fontSize: 12, color: "var(--cc-muted)" };

const btn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

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

const body: CSSProperties = { padding: 14, maxHeight: "70vh", overflow: "auto" };

const row: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const openBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  border: "none",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  padding: 6,
  borderRadius: 12,
  minWidth: 0,
  flex: "1 1 auto",
  textAlign: "left",
};

const dot: CSSProperties = { width: 10, height: 10, borderRadius: 999, flex: "0 0 auto" };

const rowTitle: CSSProperties = {
  fontWeight: 650,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const iconBtn: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 14,
};

const muted: CSSProperties = { fontSize: 13, color: "var(--cc-muted)" };
const hint: CSSProperties = { padding: 12, fontSize: 12, color: "var(--cc-muted)" };
