import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";

export const DEFAULT_SUPPLIER_NAMES: Record<SupplierCocType, string> = {
  [SupplierCocType.COMPOUNDER]: "S&N Rubber",
  [SupplierCocType.CALENDARER]: "Impilo",
  [SupplierCocType.CALENDER_ROLL]: "S&N Rubber",
};

// Subject marker that flags an inbound email as carrying AU Industries' OWN
// outbound customer documents (a customer Tax Invoice + the matching unsigned
// customer Delivery Note), as opposed to supplier documents. Sage is configured
// to prepend this to those emails sent to the au-rubber inbound mailbox.
export const CUSTOMER_EMAIL_SUBJECT_MARKER = "[CUST]";

// Safety belt: a customer-marked email is only treated as customer-direction
// when it also comes from one of these sender domains. Override with the
// AU_RUBBER_CUSTOMER_DOC_SENDER_DOMAINS env var (comma-separated).
export const DEFAULT_CUSTOMER_DOC_SENDER_DOMAINS = ["auind.co.za"];

// AU Industries is US — the issuer/supplier on outgoing customer delivery
// notes. It must never be resolved or shown as the customer (the TO party).
// Matches the spellings the AI extracts ("AU Industries (Pty) Ltd", "AU Rubber",
// "auind.co.za") while avoiding false positives on names that merely contain
// "au" (e.g. "Beau Industries") via the leading word boundary.
export function isAuSelfCompanyName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return /\bau (industr|rubber)/.test(normalized) || /\bauind\b/.test(normalized);
}
