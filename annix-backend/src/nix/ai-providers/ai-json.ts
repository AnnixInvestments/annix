import { jsonrepair } from "jsonrepair";
import { allowlistKeys } from "./untrusted-content";

export { allowlistKeys };

export interface AiJsonParseOptions {
  // Opt into a jsonrepair pass before giving up (for models that emit trailing
  // commas / unquoted keys / minor breakage). Still fails CLOSED — a response
  // that cannot be repaired throws AiJsonError, never returns null/partial.
  repair?: boolean;
}

/**
 * Thrown when an AI response cannot be turned into the expected JSON shape —
 * no JSON found, unbalanced/unterminated, malformed, or the wrong root type.
 * Parsing AI output fails CLOSED via this error (#401) rather than silently
 * accepting `null`/partial data from a greedy `match(/\{[\s\S]*\}/)`.
 */
export class AiJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiJsonError";
  }
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json|JSON)?\s*/, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

/**
 * Extracts the FIRST balanced `{...}` or `[...]` from text, respecting string
 * literals and escapes so braces inside string values don't unbalance it. This
 * is stricter than the codebase's prior greedy `match(/\{[\s\S]*\}/)`, which
 * grabbed everything up to the last brace (merging trailing prose or a second
 * object into the parse). Returns null when no balanced region exists.
 */
function extractBalanced(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === open) {
      depth++;
    } else if (char === close) {
      depth--;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseBalanced(content: string, open: string, close: string, repair: boolean): unknown {
  const text = stripCodeFences(content ?? "");
  const extracted = extractBalanced(text, open, close);
  if (extracted !== null) {
    try {
      return JSON.parse(extracted);
    } catch (error: unknown) {
      if (!repair) {
        throw new AiJsonError(`AI response JSON was malformed: ${errorMessage(error)}`);
      }
    }
  } else if (!repair) {
    throw new AiJsonError(`AI response contained no balanced JSON "${open}...${close}"`);
  }

  try {
    return JSON.parse(jsonrepair(extracted ?? text));
  } catch (error: unknown) {
    throw new AiJsonError(
      `AI response JSON was malformed even after repair: ${errorMessage(error)}`,
    );
  }
}

/** Parse an AI response expected to be a single JSON object. Fails closed. */
export function parseAiJsonObject(
  content: string,
  options?: AiJsonParseOptions,
): Record<string, unknown> {
  const parsed = parseBalanced(content, "{", "}", options?.repair ?? false);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AiJsonError("AI response was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

/** Parse an AI response expected to be a JSON array. Fails closed. */
export function parseAiJsonArray(content: string, options?: AiJsonParseOptions): unknown[] {
  const parsed = parseBalanced(content, "[", "]", options?.repair ?? false);
  if (!Array.isArray(parsed)) {
    throw new AiJsonError("AI response was not a JSON array");
  }
  return parsed;
}

/**
 * Generic object-parse entry — the canonical replacement for the deleted
 * `parseJsonFromAi<T>`. Always yields a JSON object (fails closed otherwise);
 * pass `{ repair: true }` for the lenient jsonrepair-backed behaviour the old
 * helper had.
 */
export function parseAiJson<T = Record<string, unknown>>(
  content: string,
  options?: AiJsonParseOptions,
): T {
  return parseAiJsonObject(content, options) as T;
}

/** Coerce an AI-extracted value to a finite number, or null. */
export function aiNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.eE+-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Coerce an AI-extracted value to a non-negative finite number within an
 * optional max — for prices/quantities the model must never report as negative
 * or absurd. Returns null on violation so callers can reject or default.
 */
export function aiNonNegativeNumber(value: unknown, options?: { max?: number }): number | null {
  const parsed = aiNumber(value);
  if (parsed === null || parsed < 0) {
    return null;
  }
  if (options?.max != null && parsed > options.max) {
    return null;
  }
  return parsed;
}
