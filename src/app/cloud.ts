import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Block, Item, Reminder } from "./types";

type CloudSnapshot = {
  blocks: Block[];
  items: Item[];
  reminders: Reminder[];
  // todayLimit пока оставляем локально (можно добавить позже отдельной таблицей)
};

function qIn(ids: string[]) {
  // postgrest expects: ( "a","b","c" )
  // аккуратно экранируем кавычки
  const escaped = ids.map((x) => `"${String(x).replaceAll('"', '\\"')}"`);
  return `(${escaped.join(",")})`;
}

export async function cloudPull(session: Session): Promise<CloudSnapshot> {
  const userId = session.user.id;

  const [bRes, iRes, rRes] = await Promise.all([
    supabase.from("blocks").select("*").eq("user_id", userId),
    supabase.from("items").select("*").eq("user_id", userId),
    supabase.from("reminders").select("*").eq("user_id", userId),
  ]);

  if (bRes.error) throw bRes.error;
  if (iRes.error) throw iRes.error;
  if (rRes.error) throw rRes.error;

  const blocks: Block[] = (bRes.data ?? []).map((x: any) => ({
    id: String(x.id),
    title: String(x.title ?? ""),
    color: String(x.color ?? "rgb(59,130,246)"),
    builtIn: Boolean(x.built_in ?? x.builtin ?? false),
  }));

  const items: Item[] = (iRes.data ?? []).map((x: any) => ({
    id: String(x.id),
    area: String(x.area ?? "backlog"),
    title: String(x.title ?? ""),
    description: String(x.description ?? ""),
    createdAt: Number(x.created_at ?? x.createdAt ?? Date.now()),
    isDone: Boolean(x.is_done ?? x.isDone ?? false),
    doneAt: x.done_at === null || x.done_at === undefined ? null : Number(x.done_at),
  }));

  const reminders: Reminder[] = (rRes.data ?? []).map((x: any) => ({
    id: String(x.id),
    date: String(x.date ?? ""),
    area: String(x.area ?? "today"),
    title: String(x.title ?? ""),
    description: String(x.description ?? ""),
    createdAt: Number(x.created_at ?? x.createdAt ?? Date.now()),
    deliveredAt:
      x.delivered_at === null || x.delivered_at === undefined ? null : Number(x.delivered_at),
  }));

  // сортировки — как в локальном сторе
  blocks.sort((a, b) => (a.builtIn === b.builtIn ? 0 : a.builtIn ? -1 : 1));
  items.sort((a, b) => b.createdAt - a.createdAt);
  reminders.sort((a, b) => b.createdAt - a.createdAt);

  return { blocks, items, reminders };
}

export async function cloudPushAll(session: Session, snap: CloudSnapshot): Promise<void> {
  const userId = session.user.id;

  // 1) UPSERT blocks
  const blocksRows = snap.blocks.map((b) => ({
    id: b.id,
    user_id: userId,
    title: b.title,
    color: b.color,
    built_in: !!b.builtIn,
  }));

  const upB = await supabase.from("blocks").upsert(blocksRows, { onConflict: "id" });
  if (upB.error) throw upB.error;

  // 2) UPSERT items
  const itemsRows = snap.items.map((it) => ({
    id: it.id,
    user_id: userId,
    area: it.area,
    title: it.title,
    description: it.description,
    created_at: it.createdAt,
    is_done: it.isDone,
    done_at: it.doneAt ?? null,
  }));

  const upI = await supabase.from("items").upsert(itemsRows, { onConflict: "id" });
  if (upI.error) throw upI.error;

  // 3) UPSERT reminders
  const remRows = snap.reminders.map((r) => ({
    id: r.id,
    user_id: userId,
    date: r.date,
    area: r.area,
    title: r.title,
    description: r.description,
    created_at: r.createdAt,
    delivered_at: r.deliveredAt ?? null,
  }));

  const upR = await supabase.from("reminders").upsert(remRows, { onConflict: "id" });
  if (upR.error) throw upR.error;

  // 4) Удаления: чтобы облако отражало текущее состояние (если ты удалил локально)
  // blocks
  const bIds = snap.blocks.map((x) => x.id);
  if (bIds.length === 0) {
    const del = await supabase.from("blocks").delete().eq("user_id", userId);
    if (del.error) throw del.error;
  } else {
    const del = await supabase
      .from("blocks")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", qIn(bIds));
    if (del.error) throw del.error;
  }

  // items
  const iIds = snap.items.map((x) => x.id);
  if (iIds.length === 0) {
    const del = await supabase.from("items").delete().eq("user_id", userId);
    if (del.error) throw del.error;
  } else {
    const del = await supabase
      .from("items")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", qIn(iIds));
    if (del.error) throw del.error;
  }

  // reminders
  const rIds = snap.reminders.map((x) => x.id);
  if (rIds.length === 0) {
    const del = await supabase.from("reminders").delete().eq("user_id", userId);
    if (del.error) throw del.error;
  } else {
    const del = await supabase
      .from("reminders")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", qIn(rIds));
    if (del.error) throw del.error;
  }
}
