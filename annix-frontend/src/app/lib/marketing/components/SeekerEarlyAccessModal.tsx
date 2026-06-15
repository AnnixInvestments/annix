"use client";

import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { submitMarketingContact } from "@/app/lib/marketing/api";

const NAVY = "#0a1733";
const CARD = "#11244e";

export function SeekerEarlyAccessModal(props: { triggerClassName: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [consent, setConsent] = useState(false);
  const [regState, setRegState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cState, setCState] = useState<"idle" | "saving" | "done" | "error">("idle");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const canRegister =
    consent &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    email.trim() !== "" &&
    mobile.trim() !== "" &&
    regState !== "saving";

  const submitRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canRegister) return;
    setRegState("saving");
    try {
      await annixOrbitApiClient.submitEarlyAccess({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        mobileNumber: mobile.trim(),
        consentToContact: consent,
        source: "marketing-orbit-learn-more",
      });
      setRegState("done");
    } catch {
      setRegState("error");
    }
  };

  const canContact =
    cName.trim() !== "" && cEmail.trim() !== "" && cPhone.trim() !== "" && cState !== "saving";

  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canContact) return;
    setCState("saving");
    try {
      await submitMarketingContact({
        name: cName.trim(),
        email: cEmail.trim(),
        phone: cPhone.trim(),
        message: "Consultant callback request — Annix Orbit Seeker (product page).",
      });
      setCState("done");
    } catch {
      setCState("error");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[var(--brand-accent,#FF8A00)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent,#FF8A00)]";

  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="relative my-8 w-full max-w-lg rounded-2xl p-6 sm:p-8"
        style={{ backgroundColor: CARD, border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <p
          className="text-xs font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--brand-accent, #FF8A00)" }}
        >
          Annix Orbit Seeker
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">Get early access</h2>
        <p className="mt-2 text-sm text-white/70">
          Join the early-access list and be first in line when Orbit Seeker launches.
        </p>

        {regState === "done" ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <p className="text-sm text-white/85">
              You're on the list — we'll be in touch as launch approaches.
            </p>
          </div>
        ) : (
          <form onSubmit={submitRegister} className="mt-5 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                className={inputClass}
                placeholder="Surname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <input
              type="email"
              className={inputClass}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className={inputClass}
              placeholder="Mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <label className="flex items-start gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                I agree to be contacted about Annix Orbit Seeker early access and updates.
              </span>
            </label>
            {regState === "error" ? (
              <p className="text-sm text-red-300">Something went wrong — please try again.</p>
            ) : null}
            <button
              type="submit"
              disabled={!canRegister}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-slate-900 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
            >
              {regState === "saving" ? "Joining…" : "Join the early-access list"}
            </button>
          </form>
        )}

        <div className="my-6 border-t border-white/10" />

        <h3 className="text-sm font-semibold text-white">Prefer a consultant to contact you?</h3>
        {cState === "done" ? (
          <div className="mt-3 flex items-start gap-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <p className="text-sm text-white/85">
              Thanks — a consultant will reach out to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={submitContact} className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                className={inputClass}
                placeholder="Name"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                required
              />
              <input
                type="email"
                className={inputClass}
                placeholder="Email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                required
              />
            </div>
            <input
              className={inputClass}
              placeholder="Phone number"
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              required
            />
            {cState === "error" ? (
              <p className="text-sm text-red-300">Something went wrong — please try again.</p>
            ) : null}
            <button
              type="submit"
              disabled={!canContact}
              className="w-full rounded-lg border border-white/20 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cState === "saving" ? "Sending…" : "Request a callback"}
            </button>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={props.triggerClassName}>
        Learn more <ArrowRight className="h-4 w-4" />
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
