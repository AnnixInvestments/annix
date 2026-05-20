/**
 * Backend creates a delivery note with an auto-generated placeholder number
 * (e.g. `DN-1779195360118`) the moment the upload lands, then renames it to the
 * real number once Gemini extraction finishes a few seconds later. Showing the
 * raw placeholder to users in that window looks like a bug — mask it instead.
 */
const PLACEHOLDER_DN_RE = /^DN-\d+$/;

export interface DeliveryNoteDisplayName {
  display: string;
  isPlaceholder: boolean;
}

export function formatDeliveryNoteNumber(
  deliveryNoteNumber: string | null | undefined,
): DeliveryNoteDisplayName {
  const name = deliveryNoteNumber ? deliveryNoteNumber : "";
  const isPlaceholder = !name || PLACEHOLDER_DN_RE.test(name);
  return {
    display: isPlaceholder ? "Extracting…" : name,
    isPlaceholder,
  };
}
