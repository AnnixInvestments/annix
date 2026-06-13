"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nowMillis } from "@/app/lib/datetime";

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
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

const DISMISS_KEY = "orbit-pwa-dismissed";

// Public early-access landing pages must not register the service worker or
// offer install — early-access registrants should not be able to install the
// app until they're granted access.
const PWA_SUPPRESSED_PREFIXES = ["/annix/orbit/seeker/register-interest"];

export function OrbitPwaProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const pathname = usePathname();
  const pwaSuppressed = pathname
    ? PWA_SUPPRESSED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    : false;
  const [swState, setSwState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    registration: null,
  });
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(window) would throw
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (pwaSuppressed) {
      return;
    }

    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations
          .filter((r) => r.scope.includes("/annix/orbit"))
          .forEach((r) => r.unregister());
      });
      return;
    }

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standaloneMatch = window.matchMedia("(display-mode: standalone)").matches;
    const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean })
      .standalone;
    const isInStandaloneMode = standaloneMatch || navigatorStandalone === true;

    setIsIos(isIosDevice);
    setIsStandalone(isInStandaloneMode);

    let updateInterval: ReturnType<typeof setInterval> | null = null;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/orbit-sw.js", {
          scope: "/annix/orbit",
        });

        setSwState({ isUpdateAvailable: false, registration });

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

        updateInterval = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      } catch (error) {
        console.error("Annix Orbit service worker registration failed:", error);
      }
    };

    registerServiceWorker();

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    if (isInStandaloneMode) {
      return () => {
        if (updateInterval) clearInterval(updateInterval);
        navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      };
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const daysSinceDismissed = (nowMillis() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return () => {
          if (updateInterval) clearInterval(updateInterval);
          navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
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
      if (updateInterval) clearInterval(updateInterval);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [pwaSuppressed]);

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
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowInstallPrompt(false);
    }
    setInstallPrompt(null);
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem(DISMISS_KEY, nowMillis().toString());
  };

  return (
    <>
      {children}

      {showUpdatePrompt && !pwaSuppressed && (
        <div className="fixed top-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:max-w-sm">
          <div
            className="text-white rounded-xl shadow-xl p-4"
            style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold">Update available</h3>
                <p className="text-sm text-white/80 mt-1">A new version of Annix Orbit is ready.</p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    className="px-3 py-1.5 bg-white text-sm font-medium rounded-lg hover:bg-white/90 transition-colors"
                    style={{ color: "var(--brand-navbar, #323288)" }}
                  >
                    Update now
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissUpdate}
                    className="px-3 py-1.5 text-white/80 text-sm font-medium hover:text-white transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissUpdate}
                className="flex-shrink-0 p-1 text-white/70 hover:text-white"
                aria-label="Dismiss"
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

      {showInstallPrompt && !isStandalone && !pwaSuppressed && (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:max-w-sm animate-orbit-slide-up">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-xl bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: "url('/branding/annix-orbit-icon.png')" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Install Annix Orbit
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isIos
                    ? 'Tap the share button and choose "Add to Home Screen" to install.'
                    : "Add Orbit to your home screen for one-tap access."}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {!isIos && (
                    <button
                      type="button"
                      onClick={handleInstall}
                      className="px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                      style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
                    >
                      Install
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDismissInstall}
                    className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    {isIos ? "Got it" : "Not now"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissInstall}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Dismiss"
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
            @keyframes orbit-slide-up {
              from {
                transform: translateY(100%);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
            .animate-orbit-slide-up {
              animation: orbit-slide-up 0.3s ease-out;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
