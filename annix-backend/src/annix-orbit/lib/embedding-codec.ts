// Embeddings are 768-dim Gemini vectors. Stored as a packed little-endian
// Float32 BSON Binary (~3 KB) instead of a decimal string (~9.5 KB) to keep the
// Orbit M0 cluster small. decodeEmbedding stays backward-compatible with the
// legacy "[0.1,0.2,...]" string format (and the utf8-coerced edge a Buffer-typed
// schema can produce for an un-migrated string doc), so reads never break mid-rollout.

export function encodeEmbedding(values: number[]): Buffer {
  const floats = Float32Array.from(values);
  return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
}

function parseLegacyString(raw: string): number[] | null {
  const trimmed = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (trimmed.length === 0) {
    return null;
  }
  const values = trimmed.split(",").map((part) => Number.parseFloat(part.trim()));
  if (values.length === 0 || values.some((value) => Number.isNaN(value))) {
    return null;
  }
  return values;
}

function bufferFrom(raw: unknown): Buffer | null {
  if (Buffer.isBuffer(raw)) {
    return raw;
  }
  const binary = raw as { buffer?: unknown };
  if (binary && Buffer.isBuffer(binary.buffer)) {
    return binary.buffer;
  }
  return null;
}

export function decodeEmbedding(raw: unknown): number[] | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw === "string") {
    return parseLegacyString(raw);
  }
  const buf = bufferFrom(raw);
  if (!buf || buf.length === 0) {
    return null;
  }
  if (buf[0] === 0x5b || buf.length % 4 !== 0) {
    return parseLegacyString(buf.toString("utf8"));
  }
  // BSON/driver buffers can be unaligned slices of a larger pool, so a direct
  // Float32Array view on buf.byteOffset may throw; copy into an aligned buffer.
  const aligned = new ArrayBuffer(buf.length);
  new Uint8Array(aligned).set(buf);
  return Array.from(new Float32Array(aligned));
}
