"use client";

import { useState } from "react";
import { type QuoteCustomerSnapshot, useSaveQuoteCustomer } from "@/app/lib/query/hooks";
import {
  type NewCustomerInput,
  type QuoteCustomer,
  useCreateStockControlCustomer,
  useStockControlCustomers,
} from "@/app/lib/query/hooks/stock-control";

export interface CustomerCardProps {
  sessionId: number;
  /** Customer FK currently assigned to the session (null when one-off / unset). */
  customerCompanyId: number | null;
  /** Customer details snapshot persisted on the session — drives the display. */
  customerSnapshot: QuoteCustomerSnapshot | null;
}

/**
 * Sits at the top of the QuoteView. Three states:
 *
 *  - **No customer assigned** → renders an "+ Add customer" CTA.
 *  - **Customer assigned** → renders the customer block (To: name, contact,
 *    address, email) + a "Change" button that re-opens the picker.
 *  - **Picker open** → autocomplete dropdown of master customers
 *    (GET /stock-control/customers) plus a "+ New customer" inline form
 *    with a "Save for future use" tick-box.
 *
 * Save flow:
 *  - Pick existing → POST /nix/sessions/:id/customer with the company's
 *    full details copied into the snapshot at quote time, plus companyId.
 *  - New + save: POST /stock-control/customers first (inserts a Company
 *    row), then POST /nix/sessions/:id/customer with the new companyId +
 *    snapshot.
 *  - New + don't save: POST /nix/sessions/:id/customer with companyId =
 *    null + snapshot only — one-off customer lives on this quote only.
 */
export function CustomerCard(props: CustomerCardProps) {
  const { sessionId, customerCompanyId, customerSnapshot } = props;
  const [pickerOpen, setPickerOpen] = useState(false);

  const saveCustomer = useSaveQuoteCustomer();

  const handleSelectExisting = (customer: QuoteCustomer) => {
    saveCustomer.mutate(
      {
        sessionId,
        companyId: customer.id,
        snapshot: customerFromMaster(customer),
      },
      { onSuccess: () => setPickerOpen(false) },
    );
  };

  const handleSaveNew = (input: NewCustomerSubmission) => {
    saveCustomer.mutate(
      {
        sessionId,
        companyId: input.companyId,
        snapshot: input.snapshot,
      },
      { onSuccess: () => setPickerOpen(false) },
    );
  };

  const handleClear = () => {
    saveCustomer.mutate({ sessionId, companyId: null, snapshot: null });
  };

  if (!customerSnapshot) {
    return (
      <section className="bg-white border border-amber-300 rounded-lg p-4 space-y-3">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">Customer</h2>
          <span className="text-xs text-amber-700">
            No customer assigned — add one before sending the quote.
          </span>
        </header>
        {!pickerOpen ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-dashed border-amber-500 text-amber-800 bg-amber-50 rounded-md hover:bg-amber-100"
          >
            <span aria-hidden>+</span> Add customer
          </button>
        ) : (
          <CustomerPicker
            onSelectExisting={handleSelectExisting}
            onSaveNew={handleSaveNew}
            onCancel={() => setPickerOpen(false)}
            isSaving={saveCustomer.isPending}
          />
        )}
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">Customer</h2>
        <div className="flex items-center gap-2">
          {!pickerOpen && (
            <>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs text-[#323288] font-medium hover:underline"
              >
                Change
              </button>
              <span className="text-gray-300">·</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-red-700 hover:underline"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </header>
      {!pickerOpen ? (
        <CustomerBlock snapshot={customerSnapshot} companyId={customerCompanyId} />
      ) : (
        <CustomerPicker
          onSelectExisting={handleSelectExisting}
          onSaveNew={handleSaveNew}
          onCancel={() => setPickerOpen(false)}
          isSaving={saveCustomer.isPending}
        />
      )}
    </section>
  );
}

function CustomerBlock(props: { snapshot: QuoteCustomerSnapshot; companyId: number | null }) {
  const { snapshot, companyId } = props;
  const addressParts = [
    snapshot.streetAddress,
    snapshot.city,
    snapshot.province,
    snapshot.postalCode,
    snapshot.country,
  ]
    .filter((p): p is string => Boolean(p && p.length > 0))
    .join(", ");
  return (
    <div className="text-sm text-gray-800 space-y-0.5">
      <p className="font-semibold text-gray-900">
        {snapshot.name}
        {companyId === null && (
          <span className="ml-2 text-[10px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
            One-off
          </span>
        )}
      </p>
      {snapshot.contactPerson && <p className="text-gray-700">Attn: {snapshot.contactPerson}</p>}
      {addressParts.length > 0 && <p className="text-gray-600 text-xs">{addressParts}</p>}
      <div className="text-xs text-gray-600 space-x-3 pt-0.5">
        {snapshot.email && <span>📧 {snapshot.email}</span>}
        {snapshot.phone && <span>📞 {snapshot.phone}</span>}
        {snapshot.vatNumber && <span>VAT: {snapshot.vatNumber}</span>}
      </div>
    </div>
  );
}

interface NewCustomerSubmission {
  companyId: number | null;
  snapshot: QuoteCustomerSnapshot;
}

function CustomerPicker(props: {
  onSelectExisting: (customer: QuoteCustomer) => void;
  onSaveNew: (input: NewCustomerSubmission) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { onSelectExisting, onSaveNew, onCancel, isSaving } = props;
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const customers = useStockControlCustomers(search);

  if (showNewForm) {
    return <NewCustomerForm onSubmit={onSaveNew} onCancel={() => setShowNewForm(false)} />;
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search customers…"
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
      />
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
        {customers.isLoading && <p className="px-3 py-2 text-xs text-gray-500 italic">Loading…</p>}
        {customers.data && customers.data.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-500 italic">
            No matching customers. Click "+ New customer" to create one.
          </p>
        )}
        {customers.data?.map((customer) => (
          <button
            key={customer.id}
            type="button"
            onClick={() => onSelectExisting(customer)}
            disabled={isSaving}
            className="w-full text-left px-3 py-1.5 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50 disabled:opacity-50"
          >
            <span className="font-medium text-gray-900">{customer.name}</span>
            {customer.city && <span className="text-xs text-gray-500 ml-2">{customer.city}</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="text-xs font-medium text-[#323288] hover:underline"
        >
          + New customer
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function NewCustomerForm(props: {
  onSubmit: (input: NewCustomerSubmission) => void;
  onCancel: () => void;
}) {
  const { onSubmit, onCancel } = props;
  const [form, setForm] = useState<NewCustomerInput>(emptyForm());
  const [saveForFuture, setSaveForFuture] = useState(true);
  const createCustomer = useCreateStockControlCustomer();

  const update = <K extends keyof NewCustomerInput>(key: K, value: NewCustomerInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    if (trimmedName.length === 0) return;
    const snapshot = toSnapshot({ ...form, name: trimmedName });
    if (saveForFuture) {
      createCustomer.mutate(
        { ...form, name: trimmedName },
        {
          onSuccess: (saved) => {
            onSubmit({ companyId: saved.id, snapshot });
          },
        },
      );
    } else {
      onSubmit({ companyId: null, snapshot });
    }
  };

  const isPending = createCustomer.isPending;

  // Hoist nullable form fields to local consts before piping into Field
  // value props — the SWC-safe pattern: member access on the left of a
  // logical-fallback operator gets miscompiled, so we read into a local
  // identifier first.
  const contactPerson = form.contactPerson;
  const email = form.email;
  const phone = form.phone;
  const vatNumber = form.vatNumber;
  const registrationNumber = form.registrationNumber;
  const streetAddress = form.streetAddress;
  const city = form.city;
  const province = form.province;
  const postalCode = form.postalCode;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Field
          label="Company name"
          required
          value={form.name}
          onChange={(v) => update("name", v)}
          placeholder="e.g. Mining Pressure Systems (Pty) Ltd"
        />
        <Field
          label="Contact person"
          value={contactPerson || ""}
          onChange={(v) => update("contactPerson", v || null)}
        />
        <Field
          label="Email"
          type="email"
          value={email || ""}
          onChange={(v) => update("email", v || null)}
        />
        <Field label="Phone" value={phone || ""} onChange={(v) => update("phone", v || null)} />
        <Field
          label="VAT number"
          value={vatNumber || ""}
          onChange={(v) => update("vatNumber", v || null)}
        />
        <Field
          label="Registration number"
          value={registrationNumber || ""}
          onChange={(v) => update("registrationNumber", v || null)}
        />
        <Field
          label="Street address"
          value={streetAddress || ""}
          onChange={(v) => update("streetAddress", v || null)}
          className="md:col-span-2"
        />
        <Field label="City" value={city || ""} onChange={(v) => update("city", v || null)} />
        <Field
          label="Province"
          value={province || ""}
          onChange={(v) => update("province", v || null)}
        />
        <Field
          label="Postal code"
          value={postalCode || ""}
          onChange={(v) => update("postalCode", v || null)}
        />
        <Field
          label="Country"
          value={form.country}
          onChange={(v) => update("country", v || "South Africa")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 pt-1">
        <input
          type="checkbox"
          checked={saveForFuture}
          onChange={(event) => setSaveForFuture(event.target.checked)}
          className="h-4 w-4 accent-[#323288]"
        />
        Save for future use
      </label>
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending || form.name.trim().length === 0}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-[#323288] text-white rounded hover:bg-[#2a2a73] disabled:opacity-50"
        >
          {isPending ? "Saving…" : saveForFuture ? "Save customer" : "Use for this quote only"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const { label, value, onChange, type, placeholder, required, className } = props;
  return (
    <label className={`flex flex-col gap-0.5 text-xs ${className ?? ""}`}>
      <span className="font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600 ml-0.5">*</span>}
      </span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#323288]/30"
      />
    </label>
  );
}

function emptyForm(): NewCustomerInput {
  return {
    name: "",
    contactPerson: null,
    email: null,
    phone: null,
    vatNumber: null,
    registrationNumber: null,
    streetAddress: null,
    city: null,
    province: null,
    postalCode: null,
    country: "South Africa",
  };
}

function customerFromMaster(customer: QuoteCustomer): QuoteCustomerSnapshot {
  return {
    name: customer.name,
    contactPerson: customer.contactPerson,
    email: customer.email,
    phone: customer.phone,
    vatNumber: customer.vatNumber,
    registrationNumber: customer.registrationNumber,
    streetAddress: customer.streetAddress,
    city: customer.city,
    province: customer.province,
    postalCode: customer.postalCode,
    country: customer.country,
  };
}

function toSnapshot(input: NewCustomerInput): QuoteCustomerSnapshot {
  return {
    name: input.name,
    contactPerson: input.contactPerson,
    email: input.email,
    phone: input.phone,
    vatNumber: input.vatNumber,
    registrationNumber: input.registrationNumber,
    streetAddress: input.streetAddress,
    city: input.city,
    province: input.province,
    postalCode: input.postalCode,
    country: input.country,
  };
}
