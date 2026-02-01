import { useEffect, useState } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "../app/supabase";
import { startCloudSync, stopCloudSync } from "../app/cloudSync";

type Props = { children: React.ReactNode };

export function AuthGate({ children }: Props) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, s: Session | null) => {
        setSession(s);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ✅ запуск/остановка облачной синхронизации
  useEffect(() => {
    if (!session) {
      stopCloudSync();
      return;
    }
    startCloudSync(session);
    return () => {
      // при размонтировании — стоп
      stopCloudSync();
    };
  }, [session]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!session) return <AuthScreen />;

  return (
    <>
      {/* Кнопка выхода всегда доступна */}
      <div style={{ position: "fixed", right: 12, top: 12, zIndex: 99999 }}>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Выйти
        </button>
      </div>

      {children}
    </>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pass });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Auth error";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>calm-control</h2>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          placeholder="Password (min 6 chars)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        <button onClick={submit} disabled={busy || !email || pass.length < 6}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>

        {err && <div style={{ color: "tomato" }}>{err}</div>}

        <button
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          style={{
            background: "transparent",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
            textAlign: "left",
          }}
          type="button"
        >
          {mode === "signup" ? "I already have an account" : "Create account"}
        </button>
      </div>
    </div>
  );
}
