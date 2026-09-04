"use client";

import { useEffect, useState } from "react";
import { Icon, paths } from "./icons";
import { Button } from "./ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true // iOS Safari
  );
}

export function InstallApp({ variant = "card" }: { variant?: "card" | "button" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!ready || installed) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    if (isIos()) {
      setShowIosHelp(true);
      return;
    }
    // Neither prompt available nor iOS — most likely desktop Firefox/Safari without
    // PWA install support, or the browser already decided not to offer it yet.
    setShowIosHelp(true);
  }

  const canPrompt = !!deferredPrompt;

  if (variant === "button") {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-1.5 rounded-lg border border-ink-900/12 px-2.5 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-900/5"
        title="Install app"
      >
        <Icon path={paths.download ?? paths.arrowRight} className="h-4 w-4" />
        Install
      </button>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brass-400/20 text-brass-600">
          <Icon path={paths.download ?? paths.arrowRight} className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-base font-semibold text-ink-950">Install House Management</h3>
          <p className="mt-1 text-sm text-ink-600">
            Add it to your home screen for quick, full-screen access — works like a regular app, on your phone or
            computer.
          </p>

          {!showIosHelp ? (
            <Button onClick={handleInstall} className="mt-3">
              {canPrompt ? "Install app" : "Install app"}
            </Button>
          ) : (
            <div className="mt-3 rounded-lg bg-brass-400/10 p-3 text-sm text-ink-800">
              {isIos() ? (
                <p>
                  Tap the <strong>Share</strong> icon <span aria-hidden>􀈂</span> in Safari's toolbar, then choose{" "}
                  <strong>Add to Home Screen</strong>.
                </p>
              ) : (
                <p>
                  Open your browser's menu and look for <strong>Install app</strong> or{" "}
                  <strong>Add to Home Screen</strong>. On Chrome, it's usually behind the ⋮ menu or an install icon in
                  the address bar.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
