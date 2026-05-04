import { JsonFromAiError, parseJsonFromAi, stripAiCodeFences } from "./json-from-ai";

describe("stripAiCodeFences", () => {
  it("returns content unchanged when no fence is present", () => {
    expect(stripAiCodeFences("plain {a:1}")).toBe("plain {a:1}");
  });

  it("strips ```json fences", () => {
    expect(stripAiCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips bare ``` fences", () => {
    expect(stripAiCodeFences('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe("parseJsonFromAi", () => {
  it("parses raw JSON", () => {
    expect(parseJsonFromAi<{ a: number }>('{"a":1}').a).toBe(1);
  });

  it("parses code-fenced JSON", () => {
    expect(parseJsonFromAi<{ a: number }>('```json\n{"a":1}\n```').a).toBe(1);
  });

  it("extracts a JSON object embedded in surrounding prose", () => {
    const raw = `Here is the assignment you asked for:\n{"a":1,"b":"x"}\nLet me know if you need changes.`;
    const result = parseJsonFromAi<{ a: number; b: string }>(raw);
    expect(result.a).toBe(1);
    expect(result.b).toBe("x");
  });

  it("throws JsonFromAiError on empty input", () => {
    expect(() => parseJsonFromAi("")).toThrow(JsonFromAiError);
  });

  it("repairs trailing commas via jsonrepair", () => {
    const result = parseJsonFromAi<{ a: number; b: number }>('{"a":1,"b":2,}');
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });

  it("repairs single-quoted strings via jsonrepair", () => {
    const result = parseJsonFromAi<{ a: string }>("{'a':'hello'}");
    expect(result.a).toBe("hello");
  });

  it("repairs missing closing brace via jsonrepair", () => {
    const result = parseJsonFromAi<{ a: number }>('{"a":1');
    expect(result.a).toBe(1);
  });
});
