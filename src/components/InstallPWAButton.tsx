import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __cc_deferredPWA?: BeforeInstallPromptEvent | null;
  }
}

function isStandalone() {
  // Android/Chrome: display-mode
  if (window.matchMedia("(display-mode: standalone)").matches) return true;

  // iOS Safari: navigator.standalone
  const anyNav = navigator as any;
  if (anyNav?.standalone) return true;

  return false;
}

export function InstallPWAButton() {
  // ✅ В установленном приложении кнопку никогда не показываем
  const [standalone, setStandalone] = useState(() => isStandalone());

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => window.__cc_deferredPWA ?? null
  );

  useEffect(() => {
    const onAvailable = () => {
      setStandalone(isStandalone());
      setDeferred(window.__cc_deferredPWA ?? null);
    };

    const onInstalled = () => {
      window.__cc_deferredPWA = null;
      setStandalone(true);
      setDeferred(null);
    };

    window.addEventListener("cc:pwa-available", onAvailable);
    window.addEventListener("cc:pwa-installed", onInstalled);

    // на всякий случай: если режим поменялся
    const mm = window.matchMedia("(display-mode: standalone)");
    const onMM = () => setStandalone(isStandalone());
    mm.addEventListener?.("change", onMM);

    return () => {
      window.removeEventListener("cc:pwa-available", onAvailable);
      window.removeEventListener("cc:pwa-installed", onInstalled);
      mm.removeEventListener?.("change", onMM);
    };
  }, []);

  if (standalone) return null;
  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;

        if (choice.outcome === "accepted") {
          window.__cc_deferredPWA = null;
          setDeferred(null);
        }
      }}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.35)",
        color: "white",
        cursor: "pointer",
      }}
      type="button"
    >
      Установить
    </button>
  );
}
