import { normalizeInterviewPrep } from "./nix-seeker-assist.service";

describe("normalizeInterviewPrep", () => {
  const empty = {
    roleSummary: "",
    likelyQuestions: [],
    starTalkingPoints: [],
    gapsToBridge: [],
    companyContext: [],
    questionsToAsk: [],
    logistics: [],
  };

  it("returns an all-empty pack for null/undefined/primitive input", () => {
    expect(normalizeInterviewPrep(null)).toEqual(empty);
    expect(normalizeInterviewPrep(undefined)).toEqual(empty);
    expect(normalizeInterviewPrep("not json")).toEqual(empty);
    expect(normalizeInterviewPrep(42)).toEqual(empty);
  });

  it("defaults every missing field so the modal never maps over undefined", () => {
    const result = normalizeInterviewPrep({ roleSummary: "Welder at Acme" });
    expect(result.roleSummary).toBe("Welder at Acme");
    expect(result.likelyQuestions).toEqual([]);
    expect(result.starTalkingPoints).toEqual([]);
    expect(result.gapsToBridge).toEqual([]);
    expect(result.logistics).toEqual([]);
  });

  it("coerces non-array fields to empty arrays and non-string summary to empty", () => {
    const result = normalizeInterviewPrep({
      roleSummary: { nope: true },
      likelyQuestions: "should be an array",
      gapsToBridge: 5,
    });
    expect(result.roleSummary).toBe("");
    expect(result.likelyQuestions).toEqual([]);
    expect(result.gapsToBridge).toEqual([]);
  });

  it("filters non-object question entries and defaults their fields", () => {
    const result = normalizeInterviewPrep({
      likelyQuestions: [
        { question: "Why this role?", whyAsked: "motivation" },
        "garbage",
        null,
        { question: "Tell me about a conflict" },
      ],
    });
    expect(result.likelyQuestions).toEqual([
      { question: "Why this role?", whyAsked: "motivation" },
      { question: "Tell me about a conflict", whyAsked: "" },
    ]);
  });

  it("defaults missing STAR pointers to an empty array", () => {
    const result = normalizeInterviewPrep({
      starTalkingPoints: [
        { competency: "Leadership", prompt: "Describe leading a team" },
        { competency: "Safety", prompt: "A near-miss", pointers: ["Stopped the line", 7, null] },
      ],
    });
    expect(result.starTalkingPoints[0].pointers).toEqual([]);
    expect(result.starTalkingPoints[1].pointers).toEqual(["Stopped the line"]);
  });

  it("filters non-string entries out of string lists", () => {
    const result = normalizeInterviewPrep({
      gapsToBridge: ["No forklift licence", 0, null, "Limited Excel"],
      questionsToAsk: ["What does success look like?"],
    });
    expect(result.gapsToBridge).toEqual(["No forklift licence", "Limited Excel"]);
    expect(result.questionsToAsk).toEqual(["What does success look like?"]);
  });

  it("passes a well-formed pack through unchanged", () => {
    const valid = {
      roleSummary: "Senior Boilermaker",
      likelyQuestions: [{ question: "Q1", whyAsked: "W1" }],
      starTalkingPoints: [{ competency: "C", prompt: "P", pointers: ["one", "two"] }],
      gapsToBridge: ["g"],
      companyContext: ["c"],
      questionsToAsk: ["q"],
      logistics: ["l"],
    };
    expect(normalizeInterviewPrep(valid)).toEqual(valid);
  });
});
