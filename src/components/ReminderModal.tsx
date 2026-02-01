import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Block, BlockId } from "../app/types";

type Mode = "create" | "edit";

type Initial = {
  id: string;
  title: string;
  description: string;
  area: BlockId;
  date: string;
};

function clampText(s: string) {
  return s.trim();
}

export function ReminderModal({
  open,
  date,
  mode,
  initial,
  blocks,
  onClose,
  onSubmit,
}: {
  open: boolean;
  date: string;
  mode: Mode;
  initial?: Initial;
  blocks: Block[];
  onClose: () => void;
  onSubmit: (p: { id?: string; title: string; description: string; area: BlockId; date: string }) => void;
}) {
  const selectableBlocks = useMemo(() => blocks.filter((b) => b.id !== "log"), [blocks]);

  const defaultArea: BlockId = useMemo(() => {
    const hasToday = selectableBlocks.some((b) => b.id === "today");
    if (hasToday) return "today";
    return selectableBlocks[0]?.id ?? "today";
  }, [selectableBlocks]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [area, setArea] = useState<BlockId>(defaultArea);

  // dropdown
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    setPickerOpen(false);

    if (mode === "edit" && initial) {
      setTitle(initial.title ?? "");
      setDesc(initial.description ?? "");

      const ok = selectableBlocks.some((b) => b.id === initial.area);
      setArea(ok ? initial.area : defaultArea);
      return;
    }

    // create
    setTitle("");
    setDesc("");
    setArea(defaultArea);
  }, [open, mode, initial, defaultArea, selectableBlocks]);

  // close dropdown by outside click
  useEffect(() => {
    if (!pickerOpen) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (pickerRef.current && pickerRef.current.contains(t)) return;
      setPickerOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  // esc closes modal, and dropdown first
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pickerOpen) {
        e.preventDefault();
        setPickerOpen(false);
        return;
      }
      e.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pickerOpen, onClose]);

  const canSave = clampText(title).length > 0;

  const areaBlock = useMemo(() => selectableBlocks.find((b) => b.id === area) ?? null, [selectableBlocks, area]);

  if (!open) return null;

  const headerText = mode === "edit" ? "Редактировать напоминание" : "Новое напоминание";

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div
        style={modal}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div style={top}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div style={{ fontWeight: 650, fontSize: 14 }}>{headerText}</div>
            <div style={{ fontSize: 12, color: "var(--cc-muted)" }}>{date}</div>
          </div>

          <button style={xBtn} onClick={onClose} title="Закрыть">
            ×
          </button>
        </div>

        <div style={body}>
          <label style={label}>Куда попадёт</label>

          {/* ✅ Custom dropdown */}
          <div ref={pickerRef} style={{ position: "relative" }}>
            <button
              type="button"
              style={pickerButton}
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              title="Выбрать блок"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: areaBlock?.color ?? "rgb(59,130,246)",
                    border: "1px solid var(--cc-border)",
                    flex: "0 0 auto",
                  }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {areaBlock?.title ?? "Блок"}
                </span>
              </span>

              <span style={{ opacity: 0.7, fontSize: 14, lineHeight: 1 }}>{pickerOpen ? "▴" : "▾"}</span>
            </button>

            {pickerOpen && (
              <div style={pickerMenu}>
                {selectableBlocks.length === 0 ? (
                  <div style={pickerEmpty}>Нет блоков</div>
                ) : (
                  selectableBlocks.map((b) => {
                    const active = b.id === area;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        style={{
                          ...pickerItem,
                          ...(active ? pickerItemActive : null),
                        }}
                        onClick={() => {
                          setArea(b.id);
                          setPickerOpen(false);
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: b.color,
                            border: "1px solid var(--cc-border)",
                            flex: "0 0 auto",
                          }}
                        />
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {b.title}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <label style={{ ...label, marginTop: 12 }}>Заголовок</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
            placeholder="Например: «Сдать отчёт»"
            autoFocus
          />

          <label style={{ ...label, marginTop: 12 }}>Описание</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            style={textarea}
            placeholder="Опционально…"
          />

          <div style={footer}>
            <button style={btnGhost} onClick={onClose}>
              Отмена
            </button>

            <button
              style={{
                ...btnPrimary,
                opacity: canSave ? 1 : 0.5,
                cursor: canSave ? "pointer" : "not-allowed",
              }}
              disabled={!canSave}
              onClick={() => {
                if (!canSave) return;
                onSubmit({
                  id: initial?.id,
                  title: clampText(title),
                  description: desc.trim(),
                  area,
                  date,
                });
                onClose();
              }}
            >
              {mode === "edit" ? "Сохранить" : "Добавить"}
            </button>
          </div>
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
  fontWeight: 650,
};

/* Dropdown styles */
const pickerButton: CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  gap: 10,
};

const pickerMenu: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "calc(100% + 8px)",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  boxShadow: "0 20px 70px rgba(0,0,0,0.22)",
  overflow: "hidden",
  zIndex: 10,
  maxHeight: 260,
  overflowY: "auto",
};

const pickerItem: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
  background: "transparent",
  border: "none",
  color: "var(--cc-text)",
  textAlign: "left",
};

const pickerItemActive: CSSProperties = {
  background: "var(--cc-panel)",
};

const pickerEmpty: CSSProperties = {
  padding: 12,
  color: "var(--cc-muted)",
  fontSize: 13,
};
