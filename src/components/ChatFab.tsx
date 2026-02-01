import type { CSSProperties } from "react";

export function ChatFab({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? "Закрыть чат" : "Открыть чат"}
      style={{
        ...fab,
        transform: open ? "scale(0.98)" : "scale(1)",
      }}
    >
      💬
    </button>
  );
}

const fab: CSSProperties = {
  position: "fixed",
  right: 14,
  bottom: 14,
  zIndex: 9998,
  width: 52,
  height: 52,
  borderRadius: 18,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  boxShadow: "0 18px 44px var(--cc-shadow)",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: 900,
};
