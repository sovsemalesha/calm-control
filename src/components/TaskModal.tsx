import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Item } from "../app/types";
import { formatTime } from "../app/date";

export function TaskModal({
  item,
  open,
  startInEdit = false,
  dotColor,
  onClose,
  onToggleDone,
  onEdit,
  onRemove,
}: {
  item: Item | null;
  open: boolean;
  startInEdit?: boolean;
  dotColor: string;
  onClose: () => void;
  onToggleDone: (id: string) => void;
  onEdit: (id: string, patch: { title?: string; description?: string }) => void;
  onRemove: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setIsEditing(startInEdit);
    setTitle(item.title);
    setDesc(item.description);
  }, [open, item, startInEdit]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (isEditing && item) save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditing, item, title, desc]);

  const meta = useMemo(() => {
    if (!item) return "";
    if (item.isDone && item.doneAt) return `сделано в ${formatTime(item.doneAt)}`;
    return `создано в ${formatTime(item.createdAt)}`;
  }, [item]);

  if (!open || !item) return null;

  const save = () => {
    onEdit(item.id, { title: title.trim(), description: desc.trim() });
    setIsEditing(false);
  };

  const remove = () => {
    onRemove(item.id);
    onClose();
  };

  const dot = item.isDone ? "rgb(34,197,94)" : dotColor;

  return (
    <div
      style={overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={modal}>
        <div style={topRow}>
          <button style={{ ...dotBtn, background: dot }} onClick={() => onToggleDone(item.id)} title="Статус" />

          <div style={{ flex: 1, minWidth: 0 }}>
            {!isEditing ? <div style={modalTitle}>{item.title}</div> : <input value={title} onChange={(e) => setTitle(e.target.value)} style={titleInput} autoFocus />}
            <div style={metaText}>{meta}</div>
          </div>

          <div style={topActions}>
            {!isEditing ? (
              <>
                <button style={iconBtn} title="Редактировать" onClick={() => setIsEditing(true)}>✎</button>
                <button style={iconBtn} title="Удалить" onClick={remove}>×</button>
              </>
            ) : (
              <>
                <button style={iconBtn} title="Сохранить" onClick={save}>✓</button>
                <button style={iconBtn} title="Отмена" onClick={() => { setTitle(item.title); setDesc(item.description); setIsEditing(false); }}>×</button>
              </>
            )}
            <button style={iconBtn} title="Закрыть" onClick={onClose}>×</button>
          </div>
        </div>

        <div style={body}>
          {!isEditing ? (
            <div style={descText}>{item.description?.trim() ? item.description : <span style={{ opacity: 0.6 }}>Без описания.</span>}</div>
          ) : (
            <>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={descArea} placeholder="Описание" />
              <div style={hint}>Ctrl+Enter — сохранить • Esc — закрыть</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "grid", placeItems: "center", padding: 16, zIndex: 1000 };
const modal: CSSProperties = { width: "min(720px, 100%)", borderRadius: 18, border: "1px solid var(--cc-border)", background: "var(--cc-bg)", color: "var(--cc-text)", boxShadow: "0 22px 70px rgba(0,0,0,0.45)", overflow: "hidden" };
const topRow: CSSProperties = { display: "flex", gap: 12, alignItems: "flex-start", padding: 14, borderBottom: "1px solid var(--cc-border)", background: "var(--cc-panel)" };
const dotBtn: CSSProperties = { width: 12, height: 12, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", marginTop: 7, flex: "0 0 auto" };
const modalTitle: CSSProperties = { fontSize: 16, fontWeight: 750, lineHeight: 1.25, wordBreak: "break-word" };
const metaText: CSSProperties = { marginTop: 6, fontSize: 12, color: "var(--cc-muted)" };
const topActions: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flex: "0 0 auto" };
const iconBtn: CSSProperties = { width: 30, height: 30, borderRadius: 10, border: "1px solid var(--cc-border)", background: "transparent", color: "var(--cc-text)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1, opacity: 0.9 };
const body: CSSProperties = { padding: 14 };
const descText: CSSProperties = { whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.35, fontSize: 14 };
const titleInput: CSSProperties = { width: "100%", borderRadius: 12, border: "1px solid var(--cc-border)", padding: "8px 10px", background: "transparent", color: "var(--cc-text)", fontSize: 15, fontWeight: 700, outline: "none" };
const descArea: CSSProperties = { width: "100%", minHeight: 160, borderRadius: 12, border: "1px solid var(--cc-border)", padding: "10px 10px", background: "transparent", color: "var(--cc-text)", fontSize: 14, outline: "none", resize: "vertical" };
const hint: CSSProperties = { marginTop: 8, fontSize: 12, color: "var(--cc-muted)" };
