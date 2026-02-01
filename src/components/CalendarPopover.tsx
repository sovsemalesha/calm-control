import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Block, Reminder } from "../app/types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function dateKey(y: number, m0: number, d: number) {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

function pickDayColor(rems: Reminder[], blockById: Record<string, Block>): string | null {
  if (!rems.length) return null;

  if (rems.some((r) => r.area === "important")) return blockById["important"]?.color ?? "rgb(239,68,68)";
  if (rems.some((r) => r.area === "today")) return blockById["today"]?.color ?? "rgb(59,130,246)";
  if (rems.some((r) => r.area === "backlog")) return blockById["backlog"]?.color ?? "rgb(249,115,22)";

  const first = rems[0];
  return blockById[first.area]?.color ?? null;
}

export function CalendarPopover({
  open,
  onClose,
  selected,
  onSelectDay,
  remindersByDay,
  blockById,
  onAddForSelectedDay,
  onRemoveReminder,
  onEditReminder,
}: {
  open: boolean;
  onClose: () => void;
  selected: string; // YYYY-MM-DD
  onSelectDay: (date: string) => void;

  remindersByDay: Record<string, Reminder[]>;
  blockById: Record<string, Block>;

  onAddForSelectedDay: () => void;
  onRemoveReminder: (id: string) => void;
  onEditReminder: (rem: Reminder) => void;
}) {
  // Esc закрывает
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedDate = useMemo(() => {
    const [y, m, d] = selected.split("-").map((x) => Number(x));
    return new Date(y, m - 1, d);
  }, [selected]);

  const [cursorY, setCursorY] = useState<number>(selectedDate.getFullYear());
  const [cursorM0, setCursorM0] = useState<number>(selectedDate.getMonth());

  useEffect(() => {
    setCursorY(selectedDate.getFullYear());
    setCursorM0(selectedDate.getMonth());
  }, [selectedDate]);

  const [mode, setMode] = useState<"month" | "year">("month");
  useEffect(() => {
    if (!open) setMode("month");
  }, [open]);

  const cursorBase = useMemo(() => new Date(cursorY, cursorM0, 1), [cursorY, cursorM0]);
  const monthName = cursorBase.toLocaleString(undefined, { month: "long" });
  const year = cursorBase.getFullYear();

  const monthWeeks = useMemo(() => {
    const first = new Date(cursorY, cursorM0, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(cursorY, cursorM0 + 1, 0).getDate();

    const weeks: Array<Array<number | null>> = [];
    let day = 1 - startDow;
    for (let w = 0; w < 6; w++) {
      const row: Array<number | null> = [];
      for (let i = 0; i < 7; i++) {
        row.push(day >= 1 && day <= daysInMonth ? day : null);
        day++;
      }
      weeks.push(row);
      if (day > daysInMonth) break;
    }
    return weeks;
  }, [cursorY, cursorM0]);

  const selectedRems = remindersByDay[selected] ?? [];

  if (!open) return null;

  const goPrevMonth = () => {
    let y = cursorY;
    let m = cursorM0 - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setCursorY(y);
    setCursorM0(m);
  };

  const goNextMonth = () => {
    let y = cursorY;
    let m = cursorM0 + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setCursorY(y);
    setCursorM0(m);
  };

  const yearMonths = Array.from({ length: 12 }).map((_, i) => {
    const dt = new Date(year, i, 1);
    const title = dt.toLocaleString(undefined, { month: "short" });
    return { m0: i, title };
  });

  const monthHasColor = (y: number, m0: number): string | null => {
    const prefix = `${y}-${pad2(m0 + 1)}-`;
    const relevant: Reminder[] = [];
    for (const k of Object.keys(remindersByDay)) {
      if (!k.startsWith(prefix)) continue;
      relevant.push(...(remindersByDay[k] ?? []));
    }
    return pickDayColor(relevant, blockById);
  };

  return (
    <div style={popWrap}>
      <div style={popHead}>
        <button style={navBtn} onClick={goPrevMonth} title="Предыдущий месяц">
          ◀
        </button>

        <button
          style={headTitleBtn}
          onClick={() => setMode((m) => (m === "month" ? "year" : "month"))}
          title={mode === "month" ? "Показать весь год" : "Вернуться к месяцу"}
        >
          <span style={{ textTransform: "capitalize" }}>{monthName}</span> {year}
        </button>

        <button style={navBtn} onClick={goNextMonth} title="Следующий месяц">
          ▶
        </button>

        <button style={xBtn} onClick={onClose} title="Закрыть">
          ×
        </button>
      </div>

      {mode === "year" ? (
        <div style={yearGrid}>
          {yearMonths.map((m) => {
            const c = monthHasColor(year, m.m0);
            const isCur = m.m0 === cursorM0;
            return (
              <button
                key={m.m0}
                type="button"
                style={{
                  ...monthBtn,
                  ...(isCur ? monthBtnActive : null),
                  ...(c ? { boxShadow: `0 0 0 2px ${c} inset` } : null),
                }}
                onClick={() => {
                  setCursorM0(m.m0);
                  setMode("month");
                }}
                title="Открыть месяц"
              >
                {m.title}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div style={dowRow}>
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((t) => (
              <div key={t} style={dowCell}>
                {t}
              </div>
            ))}
          </div>

          <div style={grid}>
            {monthWeeks.flat().map((d, idx) => {
              if (!d) return <div key={idx} style={cellEmpty} />;

              const key = dateKey(cursorY, cursorM0, d);
              const isSel = key === selected;

              const rems = remindersByDay[key] ?? [];
              const dayColor = pickDayColor(rems, blockById);

              return (
                <button
                  key={idx}
                  type="button"
                  style={{
                    ...cellBtn,
                    ...(isSel ? cellBtnActive : null),
                    ...(dayColor ? { boxShadow: `0 0 0 2px ${dayColor} inset` } : null),
                  }}
                  onClick={() => onSelectDay(key)}
                  title={rems.length ? `Событий: ${rems.length}` : "Пусто"}
                >
                  <span style={{ fontWeight: 600 }}>{d}</span>
                </button>
              );
            })}
          </div>

          <div style={dayPanel}>
            <div style={dayPanelHead}>
              <div style={{ fontWeight: 650 }}>{selected}</div>
              <button style={smallBtn} onClick={onAddForSelectedDay} title="Добавить напоминание">
                + Добавить
              </button>
            </div>

            {selectedRems.length === 0 ? (
              <div style={muted}>На этот день напоминаний нет.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedRems.map((r) => {
                  const c = blockById[r.area]?.color ?? "rgba(127,127,127,0.6)";
                  return (
                    <div key={r.id} style={remRow}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ ...dot, background: c }} />
                        <span style={remTitle} title={r.title}>
                          {r.title}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                        <button style={miniBtn} onClick={() => onEditReminder(r)} title="Редактировать">
                          ✎
                        </button>
                        <button style={miniBtn} onClick={() => onRemoveReminder(r.id)} title="Удалить">
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={hint}>Клик по дню — выбрать • Заголовок месяца — обзор года</div>
        </>
      )}
    </div>
  );
}

const popWrap: CSSProperties = {
  position: "absolute",
  top: 44,
  right: 0,
  width: 380,
  borderRadius: 16,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  padding: 10,
  zIndex: 60,
};

const popHead: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
};

const navBtn: CSSProperties = {
  width: 34,
  height: 32,
  borderRadius: 10,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 13,
};

const headTitleBtn: CSSProperties = {
  flex: 1,
  height: 32,
  borderRadius: 10,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  cursor: "pointer",
  fontWeight: 650,
  fontSize: 13,
};

const xBtn: CSSProperties = {
  width: 34,
  height: 32,
  borderRadius: 10,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 16,
};

const yearGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
};

const monthBtn: CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  cursor: "pointer",
  fontWeight: 600,
  textTransform: "capitalize",
};

const monthBtnActive: CSSProperties = {
  background: "var(--cc-cardSolid)",
};

const dowRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginBottom: 6,
};
const dowCell: CSSProperties = { fontSize: 12, color: "var(--cc-muted)", textAlign: "center" };

const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 };
const cellEmpty: CSSProperties = { height: 36 };

const cellBtn: CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  cursor: "pointer",
  padding: "6px 8px",
  textAlign: "left",
};

const cellBtnActive: CSSProperties = { background: "var(--cc-cardSolid)" };

const dayPanel: CSSProperties = {
  marginTop: 10,
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  padding: 10,
};

const dayPanelHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
};

const smallBtn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  padding: "8px 10px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

const muted: CSSProperties = { fontSize: 12, color: "var(--cc-muted)" };

const remRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 8px",
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
};

const remTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

const miniBtn: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 10,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  color: "var(--cc-text)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontSize: 14,
  lineHeight: 1,
};

const dot: CSSProperties = { width: 10, height: 10, borderRadius: 999, flex: "0 0 auto" };
const hint: CSSProperties = { marginTop: 10, fontSize: 12, color: "var(--cc-muted)" };
