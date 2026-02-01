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

export function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => window.__cc_deferredPWA ?? null
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const updateFromGlobal = () => {
      setDeferred(window.__cc_deferredPWA ?? null);
    };

    const onAvailable = () => updateFromGlobal();
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    // если уже запущено как PWA — кнопку не показываем
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener("cc:pwa-available", onAvailable);
    window.addEventListener("cc:pwa-installed", onInstalled);

    return () => {
      window.removeEventListener("cc:pwa-available", onAvailable);
      window.removeEventListener("cc:pwa-installed", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;

        // если приняли — браузер сам покажет установку; мы убираем кнопку
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
