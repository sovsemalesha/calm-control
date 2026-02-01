import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  addContactByEmail,
  getMyFullName,
  getMyUserId,
  getOrCreateDmChat,
  listMessages,
  listMyContacts,
  removeContact,
  sendMessage,
  setMyFullName,
  type MessageRow,
  type PublicProfile,
} from "../app/chatApi";
import { supabase } from "../app/supabase";

type Mode = "contacts" | "chat";

export function ChatPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [meId, setMeId] = useState<string>("");
  const [meName, setMeName] = useState<string>("");

  const [mode, setMode] = useState<Mode>("contacts");

  const [contacts, setContacts] = useState<PublicProfile[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [addEmailDraft, setAddEmailDraft] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const [activePeer, setActivePeer] = useState<PublicProfile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string>("");

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");

  const [err, setErr] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const visible = open;

  useEffect(() => {
    if (!visible) return;
    setErr(null);

    (async () => {
      try {
        const id = await getMyUserId();
        setMeId(id);

        const full = await getMyFullName();
        setMeName(full);
        setNameDraft(full);
      } catch (e: any) {
        setErr(e?.message ?? "Ошибка");
      }
    })();
  }, [visible]);

  const refreshContacts = async () => {
    setLoadingContacts(true);
    setErr(null);
    try {
      const list = await listMyContacts();
      setContacts(list);
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    refreshContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const queueScrollBottom = () => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  };

  const openChatWith = async (peer: PublicProfile) => {
    setErr(null);
    setActivePeer(peer);
    setMode("chat");

    setLoadingMessages(true);
    setMessages([]);
    try {
      const chatId = await getOrCreateDmChat(peer.id);
      setActiveChatId(chatId);
      const list = await listMessages(chatId, 80);
      setMessages(list);
      queueScrollBottom();
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    if (!activeChatId) return;

    const channel = supabase
      .channel(`cc_chat_${activeChatId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${activeChatId}` },
        (payload) => {
          const row = payload.new as any as MessageRow;
          setMessages((cur) => (cur.some((m) => m.id === row.id) ? cur : [...cur, row]));
          queueScrollBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, activeChatId]);

  const doSaveName = async () => {
    const v = nameDraft.trim();
    if (!v) return;

    setSavingName(true);
    setErr(null);

    setMeName(v);
    setNameDraft(v);

    try {
      await setMyFullName(v);
      try {
        const full = await getMyFullName();
        setMeName(full);
        setNameDraft(full);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка");
      try {
        const full = await getMyFullName();
        setMeName(full);
        setNameDraft(full);
      } catch {
        // ignore
      }
    } finally {
      setSavingName(false);
    }
  };

  const doAddContact = async () => {
    const e = addEmailDraft.trim();
    if (!e) return;
    setAddingUser(true);
    setErr(null);
    try {
      await addContactByEmail(e);
      setAddEmailDraft("");
      await refreshContacts();
    } catch (er: any) {
      setErr(er?.message ?? "Ошибка");
    } finally {
      setAddingUser(false);
    }
  };

  const doRemoveContact = async (id: string) => {
    setErr(null);
    try {
      await removeContact(id);
      await refreshContacts();
      if (activePeer?.id === id) {
        setActivePeer(null);
        setActiveChatId("");
        setMode("contacts");
        setMessages([]);
      }
    } catch (er: any) {
      setErr(er?.message ?? "Ошибка");
    }
  };

  const doSend = async () => {
    if (!activeChatId) return;
    const text = messageDraft.trim();
    if (!text) return;

    setSending(true);
    setErr(null);
    try {
      await sendMessage(activeChatId, text);
      setMessageDraft("");
      queueScrollBottom();
    } catch (er: any) {
      setErr(er?.message ?? "Ошибка");
    } finally {
      setSending(false);
    }
  };

  const headerTitle = useMemo(() => {
    if (mode === "chat" && activePeer) return `Чат: ${activePeer.full_name || "Без имени"}`;
    return "Чат";
  }, [mode, activePeer]);

  const meLabel = meName?.trim() ? meName.trim() : "Без имени";

  if (!visible) return null;

  return (
    <div style={wrap} role="dialog" aria-label="Chat panel">
      <div style={panel}>
        <div style={top}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={pill}>💬</div>
            <div style={{ minWidth: 0 }}>
              <div style={topTitle}>{headerTitle}</div>
              <div style={topSub}>вы: {meLabel}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {mode === "chat" && (
              <button
                type="button"
                style={iconBtn}
                title="Назад к контактам"
                onClick={() => {
                  setMode("contacts");
                  setActivePeer(null);
                  setActiveChatId("");
                  setMessages([]);
                }}
              >
                ←
              </button>
            )}
            <button type="button" style={iconBtn} title="Закрыть" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {err && <div style={errBox}>{err}</div>}

        {mode === "contacts" && (
          <div style={body}>
            <div style={section}>
              <div style={sectionTitle}>Имя и фамилия</div>

              <div style={row}>
                <input
                  style={input}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="например: Иван Петров"
                />
                <button type="button" style={btn} onClick={doSaveName} disabled={savingName}>
                  {savingName ? "…" : "Сохранить"}
                </button>
              </div>

              <div style={hint}>Это имя будет отображаться в чате.</div>
            </div>

            <div style={section}>
              <div style={sectionTitle}>Добавить контакт по email</div>

              <div style={row}>
                <input
                  style={input}
                  value={addEmailDraft}
                  onChange={(e) => setAddEmailDraft(e.target.value)}
                  placeholder="email пользователя"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") doAddContact();
                  }}
                />
                <button type="button" style={btn} onClick={doAddContact} disabled={addingUser}>
                  {addingUser ? "…" : "Добавить"}
                </button>
              </div>

              <div style={hint}>Email используется только для поиска.</div>
            </div>

            <div style={{ ...section, paddingBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={sectionTitle}>Контакты</div>
                <button type="button" style={miniBtn} onClick={refreshContacts} disabled={loadingContacts}>
                  {loadingContacts ? "…" : "Обновить"}
                </button>
              </div>

              {contacts.length === 0 ? (
                <div style={empty}>Пока нет контактов.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {contacts.map((c) => (
                    <div key={c.id} style={contactRow}>
                      <button type="button" style={contactBtn} onClick={() => openChatWith(c)} title="Открыть чат">
                        <span style={avatar}>{(c.full_name || "U").slice(0, 1).toUpperCase()}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                          {c.full_name || "Без имени"}
                        </span>
                      </button>
                      <button type="button" style={dangerBtn} title="Удалить контакт" onClick={() => doRemoveContact(c.id)}>
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...section, paddingBottom: 14 }}>
              <button type="button" style={logoutBtn} onClick={() => supabase.auth.signOut()} title="Выйти">
                Выйти
              </button>
            </div>
          </div>
        )}

        {mode === "chat" && (
          <div style={chatBody}>
            <div style={messagesBox} ref={listRef}>
              {loadingMessages ? (
                <div style={empty}>Загрузка…</div>
              ) : messages.length === 0 ? (
                <div style={empty}>Сообщений пока нет. Напиши первым.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {messages.map((m) => {
                    const mine = m.sender_id === meId;
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <div style={{ ...bubble, ...(mine ? bubbleMine : bubblePeer) }}>
                          {m.body}
                          <div style={time}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={composer}>
              <input
                style={input}
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                placeholder="сообщение…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSend();
                }}
              />
              <button type="button" style={btn} onClick={doSend} disabled={sending}>
                {sending ? "…" : "Отпр."}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const wrap: CSSProperties = { position: "fixed", right: 14, bottom: 14, zIndex: 9999 };

const panel: CSSProperties = {
  width: "min(440px, calc(100vw - 28px))",
  height: "min(580px, calc(100vh - 28px))",
  borderRadius: 18,
  overflow: "hidden",
  background: "var(--cc-bg)",
  border: "1px solid var(--cc-border)",
  boxShadow: "0 26px 70px rgba(0,0,0,0.25)",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
};

const top: CSSProperties = {
  padding: "10px 12px",
  background: "var(--cc-panel)",
  borderBottom: "1px solid var(--cc-border)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  boxSizing: "border-box",
};

const pill: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxSizing: "border-box",
};

const topTitle: CSSProperties = { fontSize: 14, fontWeight: 750, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const topSub: CSSProperties = { marginTop: 2, fontSize: 11, color: "var(--cc-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

const body: CSSProperties = { padding: 12, overflowY: "auto", overflowX: "hidden", boxSizing: "border-box" };
const chatBody: CSSProperties = { display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" };
const messagesBox: CSSProperties = { flex: 1, padding: 12, overflowY: "auto", overflowX: "hidden", boxSizing: "border-box" };

const composer: CSSProperties = {
  padding: 12,
  borderTop: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  display: "flex",
  gap: 8,
  boxSizing: "border-box",
};

const section: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "rgba(255,255,255,0.02)",
  marginBottom: 10,
  boxSizing: "border-box",
};

const sectionTitle: CSSProperties = { fontSize: 12, fontWeight: 750, marginBottom: 8 };
const hint: CSSProperties = { marginTop: 6, fontSize: 11, color: "var(--cc-muted)" };

const row: CSSProperties = { display: "flex", gap: 8, alignItems: "center", minWidth: 0 };

const input: CSSProperties = {
  flex: 1,
  minWidth: 0,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-bg)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  outline: "none",
  fontWeight: 600,
  boxSizing: "border-box",
};

const btn: CSSProperties = {
  flexShrink: 0,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 800,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

const miniBtn: CSSProperties = {
  flexShrink: 0,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

const iconBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "var(--cc-panel)",
  color: "var(--cc-text)",
  cursor: "pointer",
  fontWeight: 900,
  boxSizing: "border-box",
};

const contactRow: CSSProperties = { display: "flex", gap: 8, alignItems: "center", minWidth: 0 };

const contactBtn: CSSProperties = {
  flex: 1,
  minWidth: 0,
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "rgba(255,255,255,0.02)",
  color: "var(--cc-text)",
  padding: "10px 10px",
  cursor: "pointer",
  fontWeight: 750,
  display: "flex",
  alignItems: "center",
  gap: 10,
  boxSizing: "border-box",
};

const avatar: CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  flexShrink: 0,
  boxSizing: "border-box",
};

const dangerBtn: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  background: "rgba(255,255,255,0.02)",
  color: "var(--cc-text)",
  cursor: "pointer",
  fontWeight: 900,
  boxSizing: "border-box",
};

const bubble: CSSProperties = {
  maxWidth: 300,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid var(--cc-border)",
  fontWeight: 650,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  boxSizing: "border-box",
};

const bubbleMine: CSSProperties = { background: "rgba(59,130,246,0.18)" };
const bubblePeer: CSSProperties = { background: "rgba(255,255,255,0.04)" };

const time: CSSProperties = { marginTop: 6, fontSize: 10, color: "var(--cc-muted)", fontWeight: 700 };
const empty: CSSProperties = { padding: 12, color: "var(--cc-muted)", fontWeight: 650, fontSize: 12 };

const errBox: CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid var(--cc-border)",
  background: "rgba(239,68,68,0.10)",
  color: "var(--cc-text)",
  fontSize: 12,
  fontWeight: 650,
  boxSizing: "border-box",
};

const logoutBtn: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--cc-border)",
  background: "rgba(255,255,255,0.02)",
  color: "var(--cc-text)",
  padding: "10px 12px",
  cursor: "pointer",
  fontWeight: 850,
  boxSizing: "border-box",
};
