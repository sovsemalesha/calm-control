import { supabase } from "./supabase";

export type PublicProfile = {
  id: string;
  full_name: string;
};

export type ContactRow = {
  id: number;
  owner_id: string;
  contact_user_id: string;
  created_at: string;
};

export type MessageRow = {
  id: number;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export async function getMyUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error("No user");
  return id;
}

export async function getMyFullName(): Promise<string> {
  const me = await getMyUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", me)
    .maybeSingle();

  if (error) throw error;
  return (data?.full_name ?? "") as string;
}

/**
 * ✅ Диагностическая версия:
 * - делает upsert
 * - СРАЗУ возвращает, что реально записалось в БД
 * - если не записалось — кидает понятную ошибку
 */
export async function setMyFullName(fullName: string): Promise<string> {
  const me = await getMyUserId();
  const v = fullName.trim();
  if (!v) throw new Error("Пустое имя");

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: me, full_name: v }, { onConflict: "id" })
    .select("full_name")
    .maybeSingle();

  if (error) throw error;

  const saved = (data?.full_name ?? "") as string;

  if (saved.trim() !== v) {
    // Это ключевой сигнал: upsert не записал то, что должен
    // Значит либо таблица/колонка не та, либо есть триггер/правило, которое затирает значение
    throw new Error(
      `Имя не сохранилось в БД. Ожидал "${v}", получил "${saved || "(пусто)"}".`
    );
  }

  return saved;
}

// Поиск пользователя по email через RPC (без раскрытия email всем)
export async function findUserByEmail(email: string): Promise<PublicProfile | null> {
  const e = email.trim();
  if (!e) return null;

  const { data, error } = await supabase.rpc("find_profile_by_email", { q_email: e });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;

  return { id: row.id as string, full_name: (row.full_name ?? "") as string };
}

export async function listMyContacts(): Promise<PublicProfile[]> {
  const me = await getMyUserId();

  const { data: rows, error } = await supabase
    .from("contacts")
    .select("contact_user_id, created_at")
    .eq("owner_id", me)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const ids = (rows ?? []).map((r: any) => r.contact_user_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: profiles, error: e2 } = await supabase
    .from("profiles_public")
    .select("id,full_name")
    .in("id", ids);

  if (e2) throw e2;

  const map = new Map<string, PublicProfile>();
  for (const p of (profiles ?? []) as any[]) {
    map.set(p.id, { id: p.id, full_name: p.full_name ?? "" });
  }

  return ids.map((id) => map.get(id)).filter(Boolean) as PublicProfile[];
}

export async function addContactByEmail(email: string): Promise<PublicProfile> {
  const me = await getMyUserId();
  const p = await findUserByEmail(email);
  if (!p) throw new Error("Пользователь не найден");
  if (p.id === me) throw new Error("Нельзя добавить самого себя");

  const { error } = await supabase.from("contacts").insert({
    owner_id: me,
    contact_user_id: p.id,
  } satisfies Partial<ContactRow> as any);

  if (error) throw error;
  return p;
}

export async function removeContact(contactUserId: string): Promise<void> {
  const me = await getMyUserId();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("owner_id", me)
    .eq("contact_user_id", contactUserId);

  if (error) throw error;
}

export async function getOrCreateDmChat(otherUserId: string): Promise<string> {
  const me = await getMyUserId();
  if (me === otherUserId) throw new Error("Нельзя чат с самим собой");

  const a = me < otherUserId ? me : otherUserId;
  const b = me < otherUserId ? otherUserId : me;

  const { data: existing, error: e0 } = await supabase
    .from("dm_pairs")
    .select("chat_id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();

  if (e0) throw e0;
  if (existing?.chat_id) return existing.chat_id as string;

  const { data: chat, error: e1 } = await supabase.from("chats").insert({}).select("id").single();
  if (e1) throw e1;
  const chatId = chat.id as string;

  const { error: e2 } = await supabase.from("chat_members").insert([
    { chat_id: chatId, user_id: me },
    { chat_id: chatId, user_id: otherUserId },
  ]);
  if (e2) throw e2;

  const { error: e3 } = await supabase.from("dm_pairs").insert({ user_a: a, user_b: b, chat_id: chatId });
  if (e3) throw e3;

  return chatId;
}

export async function listMessages(chatId: string, limit = 50): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id,chat_id,sender_id,body,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as any;
}

export async function sendMessage(chatId: string, body: string): Promise<void> {
  const me = await getMyUserId();
  const text = body.trim();
  if (!text) return;

  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    sender_id: me,
    body: text,
  } satisfies Partial<MessageRow> as any);

  if (error) throw error;
}
