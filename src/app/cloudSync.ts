import type { Session } from "@supabase/supabase-js";
import { cloudPull, cloudPushAll } from "./cloud";
import { useAppStore } from "./store";
import type { Block, Item, Reminder } from "./types";

let active = false;
let stopFn: null | (() => void) = null;

function debounce(fn: () => void, ms: number) {
  let t: number | null = null;
  return () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

function snapshotFromStore(s: { blocks: Block[]; items: Item[]; reminders: Reminder[] }) {
  return {
    blocks: s.blocks.map((b) => ({ ...b })),
    items: s.items.map((it) => ({ ...it })),
    reminders: s.reminders.map((r) => ({ ...r })),
  };
}

function stableHash(snap: { blocks: Block[]; items: Item[]; reminders: Reminder[] }) {
  // дешёвый хеш: порядок у тебя стабильный, поэтому stringify годится
  // (для больших объёмов можно оптимизировать)
  try {
    return JSON.stringify(snap);
  } catch {
    return String(Date.now());
  }
}

export async function startCloudSync(session: Session) {
  if (active) return;
  active = true;

  // 1) Pull
  try {
    const snap = await cloudPull(session);
    useAppStore.getState().actions.setAll({
      blocks: snap.blocks,
      items: snap.items,
      reminders: snap.reminders,
    });
  } catch (e) {
    console.error("[cloudSync] pull failed:", e);
  }

  // 2) Push (debounced)
  const pushNow = async () => {
    const s = useAppStore.getState();
    const snap = snapshotFromStore(s);
    try {
      await cloudPushAll(session, snap);
    } catch (e) {
      console.error("[cloudSync] push failed:", e);
    }
  };

  const pushDebounced = debounce(pushNow, 600);

  // 3) Subscribe (совместимо со старыми сигнатурами zustand)
  let last = stableHash(snapshotFromStore(useAppStore.getState()));

  const unsub = useAppStore.subscribe((state) => {
    const currentSnap = snapshotFromStore(state);
    const h = stableHash(currentSnap);
    if (h === last) return;
    last = h;
    pushDebounced();
  });

  stopFn = () => {
    try {
      unsub();
    } catch {}
    stopFn = null;
    active = false;
  };
}

export function stopCloudSync() {
  stopFn?.();
}
