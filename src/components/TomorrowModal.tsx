import type { CSSProperties } from "react";
import type { Block, Reminder } from "../app/types";

export function TomorrowModal({
  open,
  title,
  dateKey,
  reminders,
  blockById,
  onClose,
  onAdd,
  onEdit,
  onRemove,
}: {
  open: boolean;
  title: string; // "Завтра"
  dateKey: string; // YYYY-MM-DD
  reminders: Reminder[];
  blockById: Record<string, Block>;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (r: Reminder) => void;
  onRemove: (id: string) => void;
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
            <div style={headTitle}>{title}</div>
            <div style={headSub}>{dateKey}</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={btn} onClick={onAdd} title="Добавить напоминание на завтра">
              + Добавить
            </button>
            <button style={xBtn} onClick={onClose} title="Закрыть">
              ×
            </button>
          </div>
        </div>

        <div style={body}>
          {reminders.length === 0 ? (
            <div style={muted}>На завтра напоминаний нет.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reminders.map((r) => {
                const c = blockById[r.area]?.color ?? "rgba(127,127,127,0.6)";
                return (
                  <div key={r.id} style={row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ ...dot, background: c }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={rTitle} title={r.title}>
                          {r.title}
                        </div>
                        {r.description ? (
                          <div style={rDesc} title={r.description}>
                            {r.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
                      <button style={iconBtn} onClick={() => onEdit(r)} title="Редактировать">
                        ✎
                      </button>
                      <button style={iconBtn} onClick={() => onRemove(r.id)} title="Удалить">
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={hint}>Клик вне окна — закрыть • Esc тоже закроет (если нужно — добавим)</div>
        </div>
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
  zIndex: 1400,
};

const modal: CSSProperties = {
  width: "min(700px, 100%)",
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

const body: CSSProperties = { padding: 14 };

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

const row: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const dot: CSSProperties = { width: 10, height: 10, borderRadius: 999, flex: "0 0 auto" };

const rTitle: CSSProperties = {
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const rDesc: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: "var(--cc-muted)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 520,
};

const iconBtn: CSSProperties = {
  width: 30,
  height: 30,
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
const hint: CSSProperties = { marginTop: 12, fontSize: 12, color: "var(--cc-muted)" };
