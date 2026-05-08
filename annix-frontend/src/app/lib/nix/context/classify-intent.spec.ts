import { describe, expect, it } from "vitest";
import type { NixCapability } from "@/app/lib/query/hooks";
import { bestIntent, classifyIntent } from "./classify-intent";

const fakeRfq: NixCapability = {
  key: "rfq.extract-boq",
  appCode: "rfq",
  label: "Extract BOQ",
  description: "Parses a customer BOQ into RFQ line items",
  intents: ["extract boq", "upload boq"],
  hasWalkthrough: false,
  hasExtractionProfile: true,
};

const fakeStockControl: NixCapability = {
  key: "stock-control.create-job-card",
  appCode: "stock-control",
  label: "Create a job card",
  description: "Walks through creating a new job card",
  intents: ["create job card", "new jc"],
  guideSlug: "creating-a-job-card",
  hasWalkthrough: true,
  hasExtractionProfile: false,
};

const fakeNoIntents: NixCapability = {
  key: "cv-assistant.something-else",
  appCode: "cv-assistant",
  label: "Something else",
  description: "Has no declared intents",
  hasWalkthrough: false,
  hasExtractionProfile: false,
};

describe("classifyIntent", () => {
  it("matches capabilities by their declared intent phrases", () => {
    const matches = classifyIntent("can you extract boq from this", [fakeRfq, fakeStockControl]);
    expect(matches).toHaveLength(1);
    expect(matches[0].key).toBe(fakeRfq.key);
  });

  it("is case-insensitive", () => {
    const matches = classifyIntent("CREATE JOB CARD please", [fakeRfq, fakeStockControl]);
    expect(matches).toHaveLength(1);
    expect(matches[0].key).toBe(fakeStockControl.key);
  });

  it("returns empty for non-matching phrases", () => {
    expect(classifyIntent("what is the weather", [fakeRfq, fakeStockControl])).toEqual([]);
  });

  it("returns empty for empty messages", () => {
    expect(classifyIntent("", [fakeRfq])).toEqual([]);
    expect(classifyIntent("   ", [fakeRfq])).toEqual([]);
  });

  it("skips capabilities with no declared intents", () => {
    expect(classifyIntent("anything", [fakeNoIntents])).toEqual([]);
  });

  it("returns multiple matches when several capabilities match", () => {
    const dual: NixCapability = {
      ...fakeRfq,
      key: "rfq.draft-pricing",
      intents: ["create job card pricing"],
    };
    const matches = classifyIntent("create job card pricing", [fakeStockControl, dual]);
    expect(matches).toHaveLength(2);
  });
});

describe("bestIntent", () => {
  it("returns the first matching capability", () => {
    const result = bestIntent("extract boq please", [fakeRfq, fakeStockControl]);
    expect(result?.key).toBe(fakeRfq.key);
  });

  it("returns null when no capability matches", () => {
    expect(bestIntent("nothing relevant", [fakeRfq, fakeStockControl])).toBeNull();
  });

  it("returns null for empty message", () => {
    expect(bestIntent("", [fakeRfq])).toBeNull();
  });
});
