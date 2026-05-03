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
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new JsonFromAiError(`Failed to parse AI response as JSON: ${reason}`, content);
  }
}
