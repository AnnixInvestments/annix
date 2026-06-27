import { jsonrepair } from "jsonrepair";

export class JsonFromAiError extends Error {
  readonly rawContent: string;

  constructor(message: string, rawContent: string) {
    super(message);
    this.name = "JsonFromAiError";
    Object.defineProperty(this, "rawContent", {
      value: rawContent,
      enumerable: false,
      writable: false,
    });
  }
}

export function stripAiCodeFences(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("```")) {
    const withoutFirstFence = trimmed.replace(/^```(?:json)?\s*/i, "");
    return withoutFirstFence.replace(/```$/, "").trim();
  }
  return trimmed;
}

export function parseJsonFromAi<T>(content: string): T {
  const cleaned = stripAiCodeFences(content);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall through to extract + repair
  }

  const inner = extractJsonObject(cleaned);
  const candidate = inner ?? cleaned;

  if (inner) {
    try {
      return JSON.parse(inner) as T;
    } catch {
      // Fall through to repair
    }
  }

  try {
    const repaired = jsonrepair(candidate);
    const parsed = JSON.parse(repaired);
    if (!isJsonObject(parsed)) {
      throw new JsonFromAiError("AI response repaired but did not yield a JSON object.", content);
    }
    return parsed as T;
  } catch (repairError) {
    if (repairError instanceof JsonFromAiError) throw repairError;
    const reason = repairError instanceof Error ? repairError.message : String(repairError);
    throw new JsonFromAiError(
      `Failed to parse AI response as JSON (after repair attempt): ${reason}`,
      content,
    );
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractJsonObject(input: string): string | null {
  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return input.slice(firstBrace, lastBrace + 1);
}
