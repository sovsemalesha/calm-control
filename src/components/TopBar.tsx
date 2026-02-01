import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Block, Reminder } from "../app/types";
import { CalendarPopover } from "./CalendarPopover";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatNow(d: Date) {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}  ${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;
}

export function TopBar({
  subtitle,
  theme,
  onToggleTheme,
  onAddBlock,

  selectedDay,
  onSelectDay,
  onAddReminderForSelectedDay,

  remindersByDay,
  blockById,

  tomorrowText,
  onTomorrowToggle,

  calendarOpen,
  setCalendarOpen,

  onOpenHistory,

  onRemoveReminder,
  onEditReminder,
}: {
  subtitle: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onAddBlock: () => void;

  selectedDay: string;
  onSelectDay: (date: string) => void;
  onAddReminderForSelectedDay: () => void;

  remindersByDay: Record<string, Reminder[]>;
  blockById: Record<string, Block>;

  tomorrowText: string;
  onTomorrowToggle: () => void;

  calendarOpen: boolean;
  setCalendarOpen: (v: boolean) => void;

  onOpenHistory: () => void;

  onRemoveReminder: (id: string) => void;
  onEditReminder: (rem: Reminder) => void;
}) {
  const [nowStr, setNowStr] = useState(() => formatNow(new Date()));
  useEffect(() => {
    const tick = () => setNowStr(formatNow(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const tomorrowStrong = useMemo(() => tomorrowText, [tomorrowText]);

  // outside click — считаем “внутри” и кнопку даты, и сам календарь
  const calWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!calendarOpen) return;

    const onDown = (e: MouseEvent) => {
      const el = calWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setCalendarOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCalendarOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [calendarOpen, setCalendarOpen]);

  return (
    <div style={bar}>
      <div>
        <div style={title}>Calm Control</div>
        <div style={sub}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button style={tomorrowBtn} title="Открыть/закрыть окно «Завтра»" onClick={onTomorrowToggle}>
          {tomorrowStrong}
        </button>

        <div ref={calWrapRef} style={{ position: "relative" }}>
          <button style={btn} onClick={() => setCalendarOpen(!calendarOpen)} title="Открыть/закрыть календарь">
            {nowStr}
          </button>

          <CalendarPopover
            open={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            selected={selectedDay}
            onSelectDay={(d) => onSelectDay(d)}
            remindersByDay={remindersByDay}
            blockById={blockById}
            onAddForSelectedDay={() => {
              setCalendarOpen(false);
              onAddReminderForSelectedDay();
            }}
            onRemoveReminder={onRemoveReminder}
            onEditReminder={(r) => {
              setCalendarOpen(false);
              onEditReminder(r);
            }}
          />
        </div>

        <button style={btn} onClick={onOpenHistory} title="Открыть историю выполненных задач">
          История
        </button>

        <button style={btn} onClick={onAddBlock} title="Создать блок">
          + Блок
        </button>

        <button style={btn} onClick={onToggleTheme} title="Тема">
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>
    </div>
  );
}

const bar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
};

const title: CSSProperties = { fontSize: 18, fontWeight: 650 };
const sub: CSSProperties = { marginTop: 4, fontSize: 12, color: "var(--cc-muted)" };

const btn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const tomorrowBtn: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 650,
  fontSize: 14,
  maxWidth: 360,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
