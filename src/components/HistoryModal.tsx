import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Block, Item } from "../app/types";

type Range = "today" | "week" | "all";

function dayStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function HistoryModal({
  open,
  items,
  blockById,
  onClose,
  onRemoveItem,
}: {
  open: boolean;
  items: Item[]; // items из area=log (выполненные)
  blockById: Record<string, Block>;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>("week");

  const filtered = useMemo(() => {
    const now = Date.now();
    const startToday = dayStart(now);
    const weekAgo = startToday - 6 * 24 * 3600 * 1000;

    const qq = q.trim().toLowerCase();

    return items.filter((it) => {
      const t = (it.title ?? "").toLowerCase();
      const d = (it.description ?? "").toLowerCase();
      const okQ = !qq || t.includes(qq) || d.includes(qq);

      const doneAt = it.doneAt ?? it.createdAt ?? 0;
      const okRange =
        range === "all" ? true : range === "today" ? doneAt >= startToday : doneAt >= weekAgo;

      return okQ && okRange;
    });
  }, [items, q, range]);

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
            <div style={headTitle}>История</div>
            <div style={headSub}>Выполненные задачи</div>
          </div>

          <button style={xBtn} onClick={onClose} title="Закрыть">
            ×
          </button>
        </div>

        <div style={toolbar}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск…"
            style={search}
          />

          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...chip, ...(range === "today" ? chipActive : null) }}
              onClick={() => setRange("today")}
            >
              Сегодня
            </button>
            <button
              style={{ ...chip, ...(range === "week" ? chipActive : null) }}
              onClick={() => setRange("week")}
            >
              Неделя
            </button>
            <button
              style={{ ...chip, ...(range === "all" ? chipActive : null) }}
              onClick={() => setRange("all")}
            >
              Всё
            </button>
          </div>
        </div>

        <div style={body}>
          {filtered.length === 0 ? (
            <div style={muted}>Пока ничего нет.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((it) => {
                const c = blockById["log"]?.color ?? "rgb(34,197,94)";
                const ts = it.doneAt ?? it.createdAt ?? 0;
                const when = ts ? new Date(ts).toLocaleString() : "";

                return (
                  <div key={it.id} style={row}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <span style={{ ...dot, background: c }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={rTitle} title={it.title}>
                          {it.title}
                        </div>
                        {it.description ? (
                          <div style={rDesc} title={it.description}>
                            {it.description}
                          </div>
                        ) : null}
                        {when ? <div style={time}>{when}</div> : null}
                      </div>
                    </div>

                    <button style={iconBtn} onClick={() => onRemoveItem(it.id)} title="Удалить из истории">
                      ×
                    </button>
                  </div>
                );
              })}
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
  zIndex: 1500,
};

const modal: CSSProperties = {
  width: "min(760px, 100%)",
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

const toolbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  padding: 12,
  borderBottom: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  flexWrap: "wrap",
};

const search: CSSProperties = {
  flex: "1 1 260px",
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  padding: "10px 12px",
  outline: "none",
};

const chip: CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const chipActive: CSSProperties = {
  background: "var(--cc-cardSolid)",
};

const body: CSSProperties = { padding: 14, maxHeight: "70vh", overflow: "auto" };

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
  maxWidth: 560,
};

const time: CSSProperties = { marginTop: 6, fontSize: 11, color: "var(--cc-muted)" };

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
const hint: CSSProperties = { padding: 12, fontSize: 12, color: "var(--cc-muted)" };
