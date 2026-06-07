"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function PopupShell(props: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { title, onClose, children } = props;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const docRef = globalThis.document;
  if (!docRef) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div
          className="flex items-center justify-between px-4 py-3 text-white"
          style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
        >
          <span className="text-sm font-semibold">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none text-white/80 transition-colors hover:text-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    docRef.body,
  );
}

export function AppDownloadGuidePopup(props: { phoneType: string | null; onClose: () => void }) {
  const { phoneType, onClose } = props;
  const initial = phoneType === "android" ? "android" : "apple";
  const [selected, setSelected] = useState<"apple" | "android">(initial);

  const imageUrl =
    selected === "android"
      ? "/orbit/onboarding/app-guide-android.jpeg"
      : "/orbit/onboarding/app-guide-ios.jpeg";

  const toggleClass = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
      active
        ? "bg-[var(--brand-accent,#FF8A00)] text-[#1a1a40]"
        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <PopupShell title="Add Annix Orbit to your home screen" onClose={onClose}>
      <div className="flex gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => setSelected("apple")}
          className={toggleClass(selected === "apple")}
        >
          iPhone
        </button>
        <button
          type="button"
          onClick={() => setSelected("android")}
          className={toggleClass(selected === "android")}
        >
          Android
        </button>
      </div>
      <div className="overflow-y-auto px-4 py-3">
        <img
          src={imageUrl}
          alt={`How to download the Annix Orbit app on ${selected === "android" ? "Android" : "iPhone"}`}
          className="w-full rounded-lg"
        />
      </div>
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
        >
          Got it
        </button>
      </div>
    </PopupShell>
  );
}

export function OnboardingImagePopup(props: {
  title: string;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}) {
  const { title, imageUrl, imageAlt, onClose } = props;
  return (
    <PopupShell title={title} onClose={onClose}>
      <div className="overflow-y-auto px-4 py-3">
        <img src={imageUrl} alt={imageAlt} className="w-full rounded-lg" />
      </div>
      <div className="border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
        >
          Got it
        </button>
      </div>
    </PopupShell>
  );
}
