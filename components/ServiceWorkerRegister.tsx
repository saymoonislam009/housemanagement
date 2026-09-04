"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloaded = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Check for a newer service worker whenever the app regains focus, and
        // periodically in the background — this is what makes an installed PWA
        // actually pick up new deploys instead of feeling "stuck" on an old version.
        const checkForUpdate = () => reg.update().catch(() => {});
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) checkForUpdate();
        });
        const interval = setInterval(checkForUpdate, 60 * 60 * 1000);
        return () => clearInterval(interval);
      })
      .catch(() => {
        // Non-fatal — the app works fine without it, this only affects installability.
      });

    // The new service worker (which calls skipWaiting + clients.claim) takes over
    // control of the page here — reload once so the fresh HTML/JS is actually used,
    // rather than leaving the old page running under a new worker.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);
  return null;
}
