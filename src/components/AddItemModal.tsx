import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

export default function AddItemModal({
  open,
  blockTitle,
  blockColor,
  onClose,
  onSubmit,
}: {
  open: boolean;
  blockTitle: string;
  blockColor: string;
  onClose: () => void;
  onSubmit: (p: { title: string; description: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDesc("");
  }, [open]);

  const canAdd = useMemo(() => title.trim().length > 0, [title]);

  if (!open) return null;

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div
        style={modal}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div style={top}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: blockColor }} />
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Новая задача — {blockTitle}
            </div>
          </div>

          <button style={xBtn} onClick={onClose} title="Закрыть">
            ×
          </button>
        </div>

        <div style={body}>
          <label style={label}>Заголовок</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: «Созвон»"
            style={input}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && canAdd) {
                onSubmit({ title: title.trim(), description: desc.trim() });
                onClose();
              }
            }}
          />

          <label style={{ ...label, marginTop: 12 }}>Описание</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Опционально: детали…"
            style={textarea}
          />

          <div style={footer}>
            <button style={btnGhost} onClick={onClose}>
              Отмена
            </button>
            <button
              style={{
                ...btnPrimary,
                opacity: canAdd ? 1 : 0.5,
                cursor: canAdd ? "pointer" : "not-allowed",
              }}
              disabled={!canAdd}
              onClick={() => {
                if (!canAdd) return;
                onSubmit({ title: title.trim(), description: desc.trim() });
                onClose();
              }}
            >
              Добавить
            </button>
          </div>

          <div style={hint}>Ctrl/⌘ + Enter — быстро добавить</div>
        </div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 3000,
  padding: 16,
};

const modal: CSSProperties = {
  width: "min(560px, 96vw)",
  borderRadius: 18,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  boxShadow: "0 30px 90px rgba(0,0,0,0.30)",
  overflow: "hidden",
};

const top: CSSProperties = {
  padding: "12px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "var(--cc-panel)",
  borderBottom: "1px solid var(--cc-border)",
  gap: 12,
};

const xBtn: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 18,
  lineHeight: 1,
};

const body: CSSProperties = {
  padding: 14,
  display: "flex",
  flexDirection: "column",
};

const label: CSSProperties = {
  fontSize: 12,
  color: "var(--cc-muted)",
  marginBottom: 6,
};

const input: CSSProperties = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  outline: "none",
  fontSize: 14,
};

const textarea: CSSProperties = {
  width: "100%",
  minHeight: 110,
  resize: "vertical",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  outline: "none",
  fontSize: 14,
  lineHeight: 1.35,
};

const footer: CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const btnGhost: CSSProperties = {
  height: 38,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
};

const btnPrimary: CSSProperties = {
  height: 38,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  cursor: "pointer",
  fontWeight: 700,
};

const hint: CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "var(--cc-muted)",
};
