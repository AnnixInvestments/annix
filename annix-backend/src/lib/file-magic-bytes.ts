/**
 * Magic-byte (file-signature) sniffing for upload allowlists. Validates the
 * ACTUAL leading bytes of a buffer rather than trusting the client-declared
 * `mimetype`, which is trivially spoofable. Used to gate unauthenticated Nix
 * uploads to genuine document/image inputs before any Gemini/vision spend.
 *
 * OOXML formats (`.docx`/`.xlsx`/`.pptx`) are ZIP containers and share the
 * `PK\x03\x04` signature, so they cannot be told apart at the byte level — the
 * "ooxml" kind covers all of them, which is the correct allowlist behaviour
 * (both Word specs and Excel BOQs are valid Nix inputs).
 */
export type UploadSignatureKind = "pdf" | "png" | "jpg" | "ooxml";

function startsWith(buffer: Buffer, signature: readonly number[]): boolean {
  if (buffer.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => buffer[index] === byte);
}

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46] as const; // %PDF
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const ZIP_LOCAL_SIGNATURE = [0x50, 0x4b, 0x03, 0x04] as const; // PK.. (docx/xlsx)
const ZIP_EMPTY_SIGNATURE = [0x50, 0x4b, 0x05, 0x06] as const;
const ZIP_SPANNED_SIGNATURE = [0x50, 0x4b, 0x07, 0x08] as const;

/**
 * Returns the detected allowed kind for the buffer, or `null` when the leading
 * bytes match none of the allowed document/image signatures.
 */
export function detectUploadSignature(buffer: Buffer): UploadSignatureKind | null {
  if (startsWith(buffer, PDF_SIGNATURE)) {
    return "pdf";
  }
  if (startsWith(buffer, PNG_SIGNATURE)) {
    return "png";
  }
  if (startsWith(buffer, JPG_SIGNATURE)) {
    return "jpg";
  }
  if (
    startsWith(buffer, ZIP_LOCAL_SIGNATURE) ||
    startsWith(buffer, ZIP_EMPTY_SIGNATURE) ||
    startsWith(buffer, ZIP_SPANNED_SIGNATURE)
  ) {
    return "ooxml";
  }
  return null;
}

/**
 * True when the buffer's real bytes are one of the allowed upload kinds
 * (PDF, PNG, JPEG, or an OOXML/ZIP Office document).
 */
export function isAllowedUploadSignature(buffer: Buffer): boolean {
  return detectUploadSignature(buffer) !== null;
}
