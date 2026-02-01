import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Block, BlockId } from "../app/types";

export function BlockSelect({
  value,
  options,
  onChange,
}: {
  value: BlockId;
  options: Block[];
  onChange: (id: BlockId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((b) => b.id === value) ?? options[0], [options, value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={wrap}>
      <button
        type="button"
        style={trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Куда добавить"
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ ...dot, background: selected?.color ?? "rgb(59,130,246)" }} />
          <span style={label}>{selected?.title ?? "Выбор"}</span>
        </span>
        <span style={chev}>▾</span>
      </button>

      {open && (
        <div style={menu} role="listbox">
          {options.map((b) => {
            const active = b.id === value;
            return (
              <button
                key={b.id}
                type="button"
                style={{ ...item, ...(active ? itemActive : null) }}
                onClick={() => {
                  onChange(b.id);
                  setOpen(false);
                }}
                role="option"
                aria-selected={active}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ ...dot, background: b.color }} />
                  <span style={itemLabel}>{b.title}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const wrap: CSSProperties = {
  position: "relative",
  flex: "0 0 auto",
};

const trigger: CSSProperties = {
  minWidth: 140,
  height: 42,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  cursor: "pointer",
};

const label: CSSProperties = {
  fontSize: 14,
  fontWeight: 650,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chev: CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
};

const menu: CSSProperties = {
  position: "absolute",
  top: 46,
  left: 0,
  zIndex: 50,
  width: "max(180px, 100%)",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  padding: 6,
};

const item: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid transparent",
  background: "transparent",
  color: "var(--cc-text)",
  padding: "10px 10px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const itemActive: CSSProperties = {
  background: "var(--cc-panel)",
  border: "1px solid var(--cc-border)",
};

const itemLabel: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const dot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
  flex: "0 0 auto",
};
