"use client";

import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useAlert } from "@/app/lib/hooks/useAlert";
import { type MarketingContactPayload, submitMarketingContact } from "@/app/lib/marketing/api";

const EMPTY: MarketingContactPayload = {
  name: "",
  email: "",
  phone: "",
  company: "",
  message: "",
};

export function MarketingContactForm() {
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const [form, setForm] = useState<MarketingContactPayload>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const companyValue = form.company === undefined ? "" : form.company;
  const phoneValue = form.phone === undefined ? "" : form.phone;

  function update(field: keyof MarketingContactPayload, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const message = await submitMarketingContact(form);
      showToast(message, "success");
      setForm(EMPTY);
    } catch (error) {
      const fallback = "Something went wrong — please try again.";
      const message = error instanceof Error ? error.message : fallback;
      alert({ message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {AlertDialog}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required value={form.name} onChange={(v) => update("name", v)} />
        <Field
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(v) => update("email", v)}
        />
        <Field label="Company" value={companyValue} onChange={(v) => update("company", v)} />
        <Field label="Phone" value={phoneValue} onChange={(v) => update("phone", v)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-white/70" htmlFor="message">
          How can we help?
        </label>
        <textarea
          id="message"
          required
          rows={5}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          placeholder="Tell us about your operation and what you're looking for."
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: "var(--brand-accent)" }}
      >
        {submitting ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const type = props.type ? props.type : "text";
  const required = props.required === true;
  const id = `contact-${props.label.toLowerCase()}`;
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-white/70" htmlFor={id}>
        {props.label}
        {required ? <span style={{ color: "var(--brand-accent)" }}> *</span> : null}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
      />
    </div>
  );
}
