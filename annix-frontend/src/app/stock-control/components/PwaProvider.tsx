"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface ServiceWorkerState {
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  });
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsIos(isIosDevice);
    setIsStandalone(isInStandaloneMode);

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/stock-control-sw.js", {
          scope: "/stock-control",
        });

        setSwState({
          isRegistered: true,
          isUpdateAvailable: false,
          registration,
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setSwState((prev) => ({ ...prev, isUpdateAvailable: true }));
              setShowUpdatePrompt(true);
            }
          });
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          setSwState((prev) => ({ ...prev, isUpdateAvailable: true }));
          setShowUpdatePrompt(true);
        }

        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      } catch (error) {
        console.error("Stock Control service worker registration failed:", error);
      }
    };

    registerServiceWorker();

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    if (!isInStandaloneMode) {
      const dismissed = localStorage.getItem("stock-control-pwa-dismissed");
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          return;
        }
      }

      const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        setInstallPrompt(e);
        setShowInstallPrompt(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      if (isIosDevice) {
        setTimeout(() => setShowInstallPrompt(true), 3000);
      }

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleUpdate = () => {
    if (swState.registration?.waiting) {
      swState.registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const handleDismissUpdate = () => {
    setShowUpdatePrompt(false);
  };

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      setShowInstallPrompt(false);
    }

    setInstallPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem("stock-control-pwa-dismissed", Date.now().toString());
  };

  return (
    <>
      {children}

      {showUpdatePrompt && (
        <div className="fixed top-4 left-4 right-4 z-[60] md:left-auto md:right-4 md:max-w-sm">
          <div className="bg-teal-600 text-white rounded-xl shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Update Available</h3>
                <p className="text-sm text-teal-100 mt-1">
                  A new version of Stock Control is available.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleUpdate}
                    className="px-3 py-1.5 bg-white text-teal-600 text-sm font-medium rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Update Now
                  </button>
                  <button
                    onClick={handleDismissUpdate}
                    className="px-3 py-1.5 text-teal-100 text-sm font-medium hover:text-white transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissUpdate}
                className="flex-shrink-0 p-1 text-teal-200 hover:text-white"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstallPrompt && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 z-[60] md:left-auto md:right-4 md:max-w-sm animate-slide-up">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-teal-600 dark:text-teal-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Install Stock Control
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isIos
                    ? 'Tap the share button and select "Add to Home Screen" for the best experience.'
                    : "Install for quick access and offline support."}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {!isIos && (
                    <button
                      onClick={handleInstall}
                      className="px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Install
                    </button>
                  )}
                  <button
                    onClick={handleDismissInstall}
                    className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    {isIos ? "Got it" : "Not now"}
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismissInstall}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isIos && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">1.</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3V15"
                      />
                    </svg>
                    <span>Share</span>
                  </div>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">2.</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <style jsx>{`
            @keyframes slide-up {
              from {
                transform: translateY(100%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            .animate-slide-up {
              animation: slide-up 0.3s ease-out;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
