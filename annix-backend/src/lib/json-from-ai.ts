export class JsonFromAiError extends Error {
  constructor(
    message: string,
    public readonly rawContent: string,
  ) {
    super(message);
    this.name = "JsonFromAiError";
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
    const inner = extractJsonObject(cleaned);
    if (inner) {
      try {
        return JSON.parse(inner) as T;
      } catch (innerError) {
        const reason = innerError instanceof Error ? innerError.message : String(innerError);
        throw new JsonFromAiError(`Failed to parse AI response as JSON: ${reason}`, content);
      }
    }
    throw new JsonFromAiError("Failed to parse AI response as JSON: no JSON object found", content);
  }
}

function extractJsonObject(input: string): string | null {
  const firstBrace = input.indexOf("{");
  const lastBrace = input.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return input.slice(firstBrace, lastBrace + 1);
}
