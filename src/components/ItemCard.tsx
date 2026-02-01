import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Item } from "../app/types";

type Mode = "view" | "edit";

export function ItemCard({
  item,
  dotColor,
  onToggleDone,
  onRemove,
  onOpen,
  onDragStateChange,
}: {
  item: Item;
  dotColor: string;
  onToggleDone: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string, mode?: Mode) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}) {
  const [isHover, setIsHover] = useState(false);
  const draggingRef = useRef(false);

  const onDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
    draggingRef.current = true;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    e.dataTransfer.setDragImage(canvas, 0, 0);
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStateChange?.(true);
  };

  const onDragEnd = () => {
    onDragStateChange?.(false);
    setTimeout(() => (draggingRef.current = false), 0);
  };

  const openView = () => {
    if (draggingRef.current) return;
    onOpen(item.id, "view");
  };

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(item.id, "edit");
  };

  const remove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.id);
  };

  return (
    <div
      style={{ ...rowStyle, ...(isHover ? hoverStyle : null) }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onClick={openView}
      title="Клик — открыть • Перетащи — переместить"
    >
      <button
        style={{ ...dotBtn, background: item.isDone ? "rgb(34,197,94)" : dotColor }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(item.id);
        }}
        title={item.isDone ? "Вернуть" : "Отметить"}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...titleStyle, ...(item.isDone ? doneTitleStyle : null) }}>{item.title}</div>
      </div>

      <div style={{ ...actionsStyle, opacity: isHover ? 1 : 0, pointerEvents: isHover ? "auto" : "none" }}>
        <button style={iconBtn} title="Редактировать" onClick={openEdit}>
          ✎
        </button>
        <button style={iconBtn} title="Удалить" onClick={remove}>
          ×
        </button>
      </div>
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 6px",
  borderRadius: 10,
  cursor: "grab",
  transition: "background 140ms ease",
};

const hoverStyle: CSSProperties = { background: "rgba(127,127,127,0.08)" };

const dotBtn: CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  border: "none",
  padding: 0,
  cursor: "pointer",
  flex: "0 0 auto",
};

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.25,
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const doneTitleStyle: CSSProperties = { textDecoration: "line-through", opacity: 0.6 };

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  marginLeft: 6,
  transition: "opacity 140ms ease",
};

const iconBtn: CSSProperties = {
  width: 28,
  height: 28,
  border: "1px solid var(--cc-border)",
  borderRadius: 10,
  background: "transparent",
  cursor: "pointer",
  fontSize: 14,
  display: "grid",
  placeItems: "center",
};
