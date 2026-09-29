"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWARegister() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if (sessionStorage.getItem("pwa-dismissed")) setHidden(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || hidden) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };
  const dismiss = () => {
    sessionStorage.setItem("pwa-dismissed", "1");
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-neon-cyan/30 bg-base-850/95 p-3 shadow-glow backdrop-blur">
      <div className="flex-1 text-sm text-white">
        <p className="font-semibold">Install IT HUB app</p>
        <p className="text-xs text-white/60">Quick access from your home screen</p>
      </div>
      <button onClick={install} className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm">
        <Download size={14} /> Install
      </button>
      <button onClick={dismiss} aria-label="Dismiss" className="p-1 text-white/50 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
