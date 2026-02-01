import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { registerSW } from "virtual:pwa-register";

// ✅ Регистрируем SW
registerSW({ immediate: true });

// ✅ Ловим beforeinstallprompt максимально рано (до авторизации/рендера UI)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __cc_deferredPWA?: BeforeInstallPromptEvent | null;
  }
}

window.__cc_deferredPWA = window.__cc_deferredPWA ?? null;

window.addEventListener("beforeinstallprompt", (e: Event) => {
  e.preventDefault();
  window.__cc_deferredPWA = e as BeforeInstallPromptEvent;

  // сообщаем компонентам, что событие поймано
  window.dispatchEvent(new Event("cc:pwa-available"));
});

window.addEventListener("appinstalled", () => {
  window.__cc_deferredPWA = null;
  window.dispatchEvent(new Event("cc:pwa-installed"));
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
