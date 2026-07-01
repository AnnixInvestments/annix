import { AiJsonError, parseAiJson, parseAiJsonArray, parseAiJsonObject } from "./ai-json";

describe("ai-json canonical parser", () => {
  describe("parseAiJsonObject (strict, fail-closed)", () => {
    it("parses a single clean object", () => {
      expect(parseAiJsonObject('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
    });

    it("ignores trailing prose after the object", () => {
      expect(parseAiJsonObject('{"a":1}\n\nHope this helps!')).toEqual({ a: 1 });
    });

    it("ignores leading prose before the object", () => {
      expect(parseAiJsonObject('Here is your JSON:\n{"a":1}')).toEqual({ a: 1 });
    });

    it("strips a ```json code fence", () => {
      expect(parseAiJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    });

    it("returns only the FIRST balanced object when two are present (injection guard)", () => {
      expect(parseAiJsonObject('{"a":1} garbage {"evil":2}')).toEqual({ a: 1 });
    });

    it("does not break balance on braces/quotes inside string values", () => {
      expect(parseAiJsonObject('{"a":"} not the end \\" still inside","b":2}')).toEqual({
        a: '} not the end " still inside',
        b: 2,
      });
    });

    it("throws AiJsonError when there is no object", () => {
      expect(() => parseAiJsonObject("no json here")).toThrow(AiJsonError);
    });

    it("throws AiJsonError when the root is an array, not an object", () => {
      expect(() => parseAiJsonObject("[1,2,3]")).toThrow(AiJsonError);
    });

    it("throws AiJsonError on a truncated object without repair", () => {
      expect(() => parseAiJsonObject('{"a":1,"b":')).toThrow(AiJsonError);
    });
  });

  describe("repair mode (jsonrepair, still fail-closed)", () => {
    it("repairs a trailing comma", () => {
      expect(parseAiJsonObject('{"a":1,}', { repair: true })).toEqual({ a: 1 });
    });

    it("still throws AiJsonError on unrepairable garbage", () => {
      expect(() => parseAiJsonObject("<<< not json at all", { repair: true })).toThrow(AiJsonError);
    });

    it("repair still returns only the first balanced object (merge protection holds)", () => {
      expect(parseAiJsonObject('{"a":1,} trailing {"evil":2}', { repair: true })).toEqual({ a: 1 });
    });
  });

  describe("parseAiJsonArray", () => {
    it("parses a bare array", () => {
      expect(parseAiJsonArray('[{"x":1},{"x":2}]')).toEqual([{ x: 1 }, { x: 2 }]);
    });

    it("throws AiJsonError when the root is an object, not an array", () => {
      expect(() => parseAiJsonArray('{"a":1}')).toThrow(AiJsonError);
    });
  });

  describe("parseAiJson<T> generic", () => {
    it("casts the parsed object to T", () => {
      const parsed = parseAiJson<{ a: number }>('{"a":1}');
      expect(parsed.a).toBe(1);
    });
  });
});
