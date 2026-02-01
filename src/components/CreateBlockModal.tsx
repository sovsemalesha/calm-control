import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";

const PALETTE: { name: string; color: string }[] = [
  { name: "Синий", color: "rgb(59,130,246)" },
  { name: "Бирюзовый", color: "rgb(20,184,166)" },
  { name: "Зелёный", color: "rgb(34,197,94)" },
  { name: "Жёлтый", color: "rgb(234,179,8)" },
  { name: "Оранжевый", color: "rgb(249,115,22)" },
  { name: "Красный", color: "rgb(239,68,68)" },
  { name: "Розовый", color: "rgb(236,72,153)" },
  { name: "Фиолетовый", color: "rgb(147,51,234)" },
  { name: "Серый", color: "rgb(148,163,184)" },
];

function closestPaletteColor(input: string): string {
  // если вход совпадает с палитрой — ок, иначе по умолчанию синий
  const hit = PALETTE.find((p) => p.color === input);
  return hit?.color ?? PALETTE[0]!.color;
}

export function CreateBlockModal({
  open,
  mode,
  initialTitle,
  initialColor,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialTitle: string;
  initialColor: string;
  onClose: () => void;
  onSubmit: (payload: { title: string; color: string }) => void;
}) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [color, setColor] = useState<string>(closestPaletteColor(initialColor));

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle ?? "");
    setColor(closestPaletteColor(initialColor));
  }, [open, initialTitle, initialColor]);

  const canSave = useMemo(() => title.trim().length > 0, [title]);

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
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {mode === "create" ? "Новый блок" : "Редактировать блок"}
          </div>
          <button style={xBtn} onClick={onClose} title="Закрыть">
            ×
          </button>
        </div>

        <div style={body}>
          <label style={label}>Название</label>
          <div style={titleRow}>
            <span style={{ ...previewDot, background: color }} />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: «Цели», «Заметки», «Список покупок»"
              style={input}
              autoFocus
            />
          </div>

          <label style={{ ...label, marginTop: 12 }}>Цвет</label>
          <div style={paletteRow}>
            {PALETTE.map((p) => {
              const active = p.color === color;
              return (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => setColor(p.color)}
                  title={p.name}
                  style={{
                    ...colorBtn,
                    outline: active ? "2px solid var(--cc-border)" : "2px solid transparent",
                    outlineOffset: 2,
                  }}
                >
                  <span style={{ ...colorDot, background: p.color }} />
                </button>
              );
            })}
          </div>

          <div style={footer}>
            <button style={btnGhost} onClick={onClose}>
              Отмена
            </button>
            <button
              style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
              disabled={!canSave}
              onClick={() => {
                const t = title.trim();
                if (!t) return;
                onSubmit({ title: t, color });
                onClose();
              }}
            >
              {mode === "create" ? "Создать" : "Сохранить"}
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
  zIndex: 2000,
  padding: 16,
};

const modal: CSSProperties = {
  width: "min(520px, 96vw)",
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

const titleRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const previewDot: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  flex: "0 0 auto",
  border: "1px solid rgba(0,0,0,0.10)",
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

const paletteRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const colorBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "transparent",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
};

const colorDot: CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: 999,
};

const footer: CSSProperties = {
  marginTop: 16,
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
