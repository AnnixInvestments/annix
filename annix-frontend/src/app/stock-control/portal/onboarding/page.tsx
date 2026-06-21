"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useCompleteOnboarding } from "@/app/lib/query/hooks";

interface FormState {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
}

const INITIAL_STATE: FormState = {
  legalName: "",
  tradingName: "",
  registrationNumber: "",
  vatNumber: "",
  streetAddress: "",
  city: "",
  province: "",
  postalCode: "",
  phone: "",
  email: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useStockControlAuth();
  const completeOnboarding = useCompleteOnboarding();

  const profileEmail = profile?.email;
  const profileCompanyName = profile?.companyName;
  const profileOnboardingComplete = profile?.onboardingComplete;
  const initialEmail = profileEmail ?? "";
  const initialLegalName = profileCompanyName ?? "";

  useEffect(() => {
    if (profileOnboardingComplete) {
      router.replace("/stock-control/portal/dashboard");
    }
  }, [profileOnboardingComplete, router]);

  const [form, setForm] = useState<FormState>({
    ...INITIAL_STATE,
    email: initialEmail,
    legalName: initialLegalName,
  });
  const [error, setError] = useState<string | null>(null);

  const required = (value: string) => value.trim().length > 0;
  const formValid =
    required(form.legalName) &&
    required(form.registrationNumber) &&
    required(form.streetAddress) &&
    required(form.city) &&
    required(form.postalCode) &&
    required(form.phone) &&
    required(form.email);

  const handleField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setError("Please complete every required field before submitting.");
      return;
    }
    setError(null);

    try {
      await completeOnboarding.mutateAsync({
        legalName: form.legalName.trim(),
        tradingName: form.tradingName.trim() ? form.tradingName.trim() : undefined,
        registrationNumber: form.registrationNumber.trim(),
        vatNumber: form.vatNumber.trim() ? form.vatNumber.trim() : undefined,
        streetAddress: form.streetAddress.trim(),
        city: form.city.trim(),
        province: form.province.trim() ? form.province.trim() : undefined,
        postalCode: form.postalCode.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      await refreshProfile();
      router.push("/stock-control/portal/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Welcome — let's set up your company</h1>
        <p className="mt-1 text-sm text-gray-600">
          A few details so invoices, certificates, and customer-facing documents come out correctly.
          You can edit any of this later under Settings.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Legal company name"
              required
              value={form.legalName}
              onChange={(v) => handleField("legalName", v)}
              placeholder="Acme Industrial (Pty) Ltd"
            />
            <Field
              label="Trading name (optional)"
              value={form.tradingName}
              onChange={(v) => handleField("tradingName", v)}
              placeholder="Acme"
            />
            <Field
              label="Registration number"
              required
              value={form.registrationNumber}
              onChange={(v) => handleField("registrationNumber", v)}
              placeholder="2020/123456/07"
            />
            <Field
              label="VAT number (optional)"
              value={form.vatNumber}
              onChange={(v) => handleField("vatNumber", v)}
              placeholder="4XXXXXXXXX"
            />
          </div>

          <Field
            label="Street address"
            required
            value={form.streetAddress}
            onChange={(v) => handleField("streetAddress", v)}
            placeholder="123 Industrial Road"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label="City"
              required
              value={form.city}
              onChange={(v) => handleField("city", v)}
            />
            <Field
              label="Province (optional)"
              value={form.province}
              onChange={(v) => handleField("province", v)}
            />
            <Field
              label="Postal code"
              required
              value={form.postalCode}
              onChange={(v) => handleField("postalCode", v)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Phone"
              required
              type="tel"
              value={form.phone}
              onChange={(v) => handleField("phone", v)}
              placeholder="+27 11 000 0000"
            />
            <Field
              label="Primary contact email"
              required
              type="email"
              value={form.email}
              onChange={(v) => handleField("email", v)}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={!formValid || completeOnboarding.isPending}
              className="inline-flex items-center rounded-md bg-[var(--sc-primary,#323288)] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--sc-primary-hover,#252560)] disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {completeOnboarding.isPending ? "Saving…" : "Complete setup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  const labelText = props.required ? `${props.label} *` : props.label;
  const propType = props.type;
  const inputType = propType || "text";
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700">{labelText}</span>
      <input
        type={inputType}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--sc-primary,#323288)] focus:outline-none focus:ring-1 focus:ring-[var(--sc-primary,#323288)]"
      />
    </label>
  );
}
