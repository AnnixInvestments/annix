"use client";

import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { extractErrorMessage, throwIfNotOk } from "@/app/lib/api/apiError";
import { BrandingProvider } from "@/app/lib/branding/BrandingProvider";
import { API_BASE_URL } from "@/lib/api-config";

const UMBRELLA_BRAND = "annix-investments";

interface ConsentPreview {
  firstName: string | null;
  maskedEmail: string;
  currentPhone: string | null;
  alreadyOptedIn: boolean;
}

async function fetchConsentPreview(token: string): Promise<ConsentPreview> {
  const response = await fetch(
    `${API_BASE_URL}/public/whatsapp-consent/${encodeURIComponent(token)}`,
  );
  await throwIfNotOk(response);
  return response.json();
}

async function submitConsent(
  token: string,
  whatsappPhone: string,
  consent: boolean,
): Promise<{ optedIn: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/public/whatsapp-consent/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappPhone, consent }),
    },
  );
  await throwIfNotOk(response);
  return response.json();
}

/** Light SA-number tidy-up for the input: turns a local 0XX number into the
 *  +27 form. The backend remains the source of truth for parsing/validation. */
function normaliseSaPhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("0") && digits.length >= 10) {
    return `+27${digits.slice(1)}`;
  }
  if (digits.startsWith("27") && !digits.startsWith("+")) {
    return `+${digits}`;
  }
  return digits;
}

function CardShell(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--brand-navbar,#323288)] shadow-lg">
            <svg
              className="w-9 h-9 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.207zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
            </svg>
          </div>
        </div>
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10">{props.children}</div>
        <p className="mt-6 text-center text-xs text-white/80">
          Powered by Annix · We never share your number with third parties.
        </p>
      </div>
    </div>
  );
}

function ConsentContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<ConsentPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setLoadError("This link is invalid or has expired.");
      return;
    }
    let active = true;
    fetchConsentPreview(token)
      .then((data) => {
        if (!active) return;
        const startingPhone = data.currentPhone;
        setPreview(data);
        setPhone(startingPhone || "");
      })
      .catch(() => {
        if (!active) return;
        setLoadError("This link is invalid or has expired.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const greeting = useMemo(() => {
    const firstName = preview ? preview.firstName : null;
    return firstName ? `Hi ${firstName},` : "Hi there,";
  }, [preview]);

  const phoneIsValid = phone.trim().length >= 6;
  const canSubmit = consent && phoneIsValid && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!token) {
      setSubmitError("This link is invalid or has expired.");
      return;
    }
    if (!consent) {
      setSubmitError("Please tick the consent box so we can message you.");
      return;
    }
    setIsSubmitting(true);
    try {
      await submitConsent(token, normaliseSaPhone(phone), true);
      setDone(true);
    } catch (err) {
      setSubmitError(
        extractErrorMessage(err, "We couldn't save your preference. Please try again."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <CardShell>
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-navbar,#323288)] mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Loading…</p>
        </div>
      </CardShell>
    );
  }

  if (loadError) {
    return (
      <CardShell>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Link unavailable</h1>
          <p className="mt-2 text-sm text-gray-600">{loadError}</p>
          <p className="mt-2 text-xs text-gray-400">Ask the Annix team to send you a fresh link.</p>
        </div>
      </CardShell>
    );
  }

  if (done) {
    return (
      <CardShell>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">You're all set — thanks!</h1>
          <p className="mt-2 text-sm text-gray-600">
            We'll send your Annix updates to WhatsApp. You can reply STOP at any time to opt out.
          </p>
        </div>
      </CardShell>
    );
  }

  const alreadyOptedIn = preview ? preview.alreadyOptedIn : false;
  if (alreadyOptedIn) {
    return (
      <CardShell>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">You're already opted in</h1>
          <p className="mt-2 text-sm text-gray-600">
            You're set up to receive Annix updates on WhatsApp — nothing more to do.
          </p>
        </div>
      </CardShell>
    );
  }

  const maskedEmail = preview ? preview.maskedEmail : "";

  return (
    <CardShell>
      <h1 className="text-xl font-bold text-gray-900">{greeting}</h1>
      <p className="mt-2 text-sm text-gray-600">
        Annix would like to send you updates on WhatsApp{maskedEmail ? ` for ${maskedEmail}` : ""} —
        things like account notices and the latest from your portal. Confirm your number below to
        opt in.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="whatsappPhone" className="block text-sm font-medium text-gray-700">
            WhatsApp number
          </label>
          <input
            id="whatsappPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone((current) => normaliseSaPhone(current))}
            placeholder="+27 …"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--brand-navbar,#323288)] focus:ring-[var(--brand-navbar,#323288)] text-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500">
            South African numbers are converted to the +27 format automatically.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--brand-navbar,#323288)] focus:ring-[var(--brand-navbar,#323288)]"
          />
          <span>I consent to receive WhatsApp messages from Annix (POPIA).</span>
        </label>

        {submitError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex justify-center py-2.5 px-4 rounded-md shadow-sm text-sm font-semibold text-white bg-[var(--brand-navbar,#323288)] hover:bg-[var(--brand-navbar-active,#252560)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-navbar,#323288)] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving…" : "Confirm"}
        </button>
      </form>
    </CardShell>
  );
}

export default function WhatsAppConsentPage() {
  return (
    <BrandingProvider brand={UMBRELLA_BRAND}>
      <ConsentContent />
    </BrandingProvider>
  );
}
