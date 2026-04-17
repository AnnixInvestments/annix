"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { RubberAuCocDto } from "@/app/lib/api/auRubberApi";

interface EmailTag {
  value: string;
  valid: boolean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function EmailTagInput(props: {
  label: string;
  tags: EmailTag[];
  onTagsChange: (tags: EmailTag[]) => void;
  placeholder: string;
  name: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addEmails = (raw: string) => {
    const parts = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const existing = new Set(props.tags.map((t) => t.value.toLowerCase()));
    const newTags = parts
      .filter((p) => !existing.has(p.toLowerCase()))
      .map((p) => ({ value: p, valid: isValidEmail(p) }));
    if (newTags.length > 0) {
      props.onTagsChange([...props.tags, ...newTags]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmails(inputValue);
        setInputValue("");
      }
    }
    if (e.key === "Backspace" && inputValue === "" && props.tags.length > 0) {
      props.onTagsChange(props.tags.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    addEmails(pasted);
    setInputValue("");
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmails(inputValue);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    props.onTagsChange(props.tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{props.label}</label>
      <div className="flex flex-wrap items-center gap-1 min-h-[38px] px-2 py-1 border border-gray-300 rounded-md focus-within:ring-1 focus-within:ring-yellow-500 focus-within:border-yellow-500 bg-white">
        {props.tags.map((tag, i) => {
          const tagKey = `${tag.value}-${i}`;
          return (
            <span
              key={tagKey}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm ${
                tag.valid ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
              }`}
            >
              {tag.value}
              <button type="button" onClick={() => removeTag(i)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          name={props.name}
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={props.tags.length === 0 ? props.placeholder : ""}
          className="flex-1 min-w-[150px] outline-none text-sm py-1"
        />
      </div>
    </div>
  );
}

export type CocEmailMode = "send" | "resend";

interface CocEmailModalProps {
  mode: CocEmailMode;
  cocs: RubberAuCocDto[];
  onClose: () => void;
  onSend: (params: {
    cocIds: number[];
    email: string;
    cc: string | undefined;
    bcc: string | undefined;
    customerName: string;
  }) => void;
  isSending: boolean;
}

export function CocEmailModal(props: CocEmailModalProps) {
  const rawPropsIsSending = props.isSending;
  const relevantCocs = useMemo(() => {
    if (props.mode === "send") {
      return props.cocs.filter((c) => c.status === "GENERATED");
    }
    return props.cocs.filter((c) => c.status === "SENT");
  }, [props.cocs, props.mode]);

  const customerOptions = useMemo(() => {
    const customerMap = new Map<string, { name: string; count: number; ids: number[] }>();
    for (const coc of relevantCocs) {
      const rawCocCustomerCompanyName = coc.customerCompanyName;
      const name = rawCocCustomerCompanyName || "Unknown";
      const existing = customerMap.get(name);
      if (existing) {
        existing.count++;
        existing.ids.push(coc.id);
      } else {
        customerMap.set(name, { name, count: 1, ids: [coc.id] });
      }
    }
    return Array.from(customerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [relevantCocs]);

  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    customerOptions.length === 1 ? customerOptions[0].name : "",
  );
  const [toTags, setToTags] = useState<EmailTag[]>([]);
  const [ccTags, setCcTags] = useState<EmailTag[]>([]);
  const [bccTags, setBccTags] = useState<EmailTag[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  const selectedCocIds = useMemo(() => {
    if (!selectedCustomer) {
      return relevantCocs.map((c) => c.id);
    }
    const match = customerOptions.find((o) => o.name === selectedCustomer);
    return match ? match.ids : [];
  }, [selectedCustomer, customerOptions, relevantCocs]);

  const selectedCocCount = selectedCocIds.length;

  const hasValidTo = toTags.length > 0 && toTags.every((t) => t.valid);
  const hasInvalidCc = ccTags.some((t) => !t.valid);
  const hasInvalidBcc = bccTags.some((t) => !t.valid);
  const canSend = hasValidTo && !hasInvalidCc && !hasInvalidBcc && selectedCocCount > 0;

  const handleSend = () => {
    if (!canSend) return;
    const toEmails = toTags.map((t) => t.value).join(", ");
    const ccEmails = ccTags.length > 0 ? ccTags.map((t) => t.value).join(", ") : undefined;
    const bccEmails = bccTags.length > 0 ? bccTags.map((t) => t.value).join(", ") : undefined;
    props.onSend({
      cocIds: selectedCocIds,
      email: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      customerName: selectedCustomer || "All Customers",
    });
  };

  const title = props.mode === "send" ? "Send CoCs to Customer" : "Resend CoCs to Customer";
  const buttonLabel = props.mode === "send" ? "Send" : "Resend";
  const buttonColor =
    props.mode === "send"
      ? "bg-purple-600 hover:bg-purple-700"
      : "bg-orange-500 hover:bg-orange-600";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={props.onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>

        <div className="space-y-4">
          {customerOptions.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2"
              >
                <option value="">All Customers ({relevantCocs.length} CoCs)</option>
                {customerOptions.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.name} ({opt.count} CoC{opt.count !== 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>
          )}

          {customerOptions.length === 1 && (
            <div className="bg-gray-50 rounded-md px-3 py-2">
              <span className="text-sm text-gray-600">Customer: </span>
              <span className="text-sm font-medium text-gray-900">{customerOptions[0].name}</span>
              <span className="text-sm text-gray-500 ml-1">
                ({customerOptions[0].count} CoC{customerOptions[0].count !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            <span className="text-sm text-blue-800">
              {selectedCocCount} certificate{selectedCocCount !== 1 ? "s" : ""} will be{" "}
              {props.mode === "send" ? "sent" : "resent"}
            </span>
          </div>

          <EmailTagInput
            label="To"
            name="coc-email-to"
            tags={toTags}
            onTagsChange={setToTags}
            placeholder="Enter email addresses"
          />

          <div className="flex gap-3">
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Add CC
              </button>
            )}
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Add BCC
              </button>
            )}
          </div>

          {showCc && (
            <EmailTagInput
              label="CC"
              name="coc-email-cc"
              tags={ccTags}
              onTagsChange={setCcTags}
              placeholder="CC email addresses"
            />
          )}

          {showBcc && (
            <EmailTagInput
              label="BCC"
              name="coc-email-bcc"
              tags={bccTags}
              onTagsChange={setBccTags}
              placeholder="BCC email addresses"
            />
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={props.onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={rawPropsIsSending || !canSend}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${buttonColor}`}
          >
            {props.isSending ? "Sending..." : `${buttonLabel} (${selectedCocCount})`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
