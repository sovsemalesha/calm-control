import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Block, BlockId } from "../app/types";
import { BlockSelect } from "./BlockSelect";

export function AddBar({
  onAdd,
  defaultArea,
  blocks,
}: {
  onAdd: (payload: { area: BlockId; title: string; description?: string }) => void;
  defaultArea: BlockId;
  blocks: Block[];
}) {
  const opts = useMemo(() => blocks ?? [], [blocks]);

  const initialArea = useMemo<BlockId>(() => {
    const hasDefault = opts.some((b) => b.id === defaultArea);
    if (hasDefault) return defaultArea;
    const today = opts.find((b) => b.id === "today");
    return (today?.id ?? (opts[0]?.id ?? "today")) as BlockId;
  }, [opts, defaultArea]);

  const [area, setArea] = useState<BlockId>(initialArea);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // если блок удалили/переименовали и текущий area исчез — аккуратно перескочим
  useEffect(() => {
    if (!opts.length) return;
    if (opts.some((b) => b.id === area)) return;
    const today = opts.find((b) => b.id === "today");
    setArea((today?.id ?? opts[0].id) as BlockId);
  }, [opts, area]);

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    onAdd({ area, title: t, description });
    setTitle("");
    setDescription("");
  };

  return (
    <div style={wrap}>
      <BlockSelect value={area} options={opts} onChange={setArea} />

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={input}
        placeholder="Новая задача"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={input}
        placeholder="Описание (опционально)"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />

      <button style={btn} onClick={submit} title="Добавить">
        Добавить
      </button>
    </div>
  );
}

const wrap: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const input: CSSProperties = {
  flex: 1,
  minWidth: 140,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  padding: "10px 12px",
  background: "transparent",
  color: "var(--cc-text)",
  outline: "none",
};

const btn: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 650,
};
