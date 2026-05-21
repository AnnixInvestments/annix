import { Test, TestingModule } from "@nestjs/testing";
import type { INixCapability } from "./nix-capability.interface";
import { NixCapabilityRegistry } from "./nix-capability-registry.service";

describe("NixCapabilityRegistry", () => {
  let registry: NixCapabilityRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NixCapabilityRegistry],
    }).compile();

    registry = module.get(NixCapabilityRegistry);
  });

  const fakeRfq: INixCapability = {
    key: "rfq.extract-boq",
    appCode: "rfq",
    label: "Extract BOQ from document",
    description: "Parses a customer BOQ into RFQ line items",
    intents: ["extract boq", "upload boq", "read boq"],
  };

  const fakeStockControl: INixCapability = {
    key: "stock-control.create-job-card",
    appCode: "stock-control",
    label: "Create a job card",
    description: "Walks through creating a new job card",
    intents: ["create job card", "new jc", "make a job card"],
    guideSlug: "creating-a-job-card",
  };

  const fakeAnnixOrbit: INixCapability = {
    key: "cv-assistant.post-job",
    appCode: "cv-assistant",
    label: "Post a job",
    description: "Walks through posting a new job listing",
    intents: ["post a job", "create job posting", "advertise role"],
    guideSlug: "posting-a-job-with-nix",
  };

  it("registers and retrieves a capability by key", () => {
    registry.register(fakeRfq);

    expect(registry.isRegistered(fakeRfq.key)).toBe(true);
    expect(registry.capability(fakeRfq.key)).toEqual(fakeRfq);
  });

  it("returns null for unregistered keys", () => {
    expect(registry.capability("does-not-exist")).toBeNull();
    expect(registry.isRegistered("does-not-exist")).toBe(false);
  });

  it("filters capabilities by appCode", () => {
    registry.register(fakeRfq);
    registry.register(fakeStockControl);
    registry.register(fakeAnnixOrbit);

    const rfqCaps = registry.forApp("rfq");
    expect(rfqCaps).toHaveLength(1);
    expect(rfqCaps[0].key).toBe(fakeRfq.key);

    const scCaps = registry.forApp("stock-control");
    expect(scCaps).toHaveLength(1);
    expect(scCaps[0].key).toBe(fakeStockControl.key);

    const noneCaps = registry.forApp("admin");
    expect(noneCaps).toEqual([]);
  });

  it("findByIntent matches against declared intents", () => {
    registry.register(fakeRfq);
    registry.register(fakeStockControl);
    registry.register(fakeAnnixOrbit);

    const boqMatches = registry.findByIntent("can you extract boq from this drawing");
    expect(boqMatches).toHaveLength(1);
    expect(boqMatches[0].key).toBe(fakeRfq.key);

    const jcMatches = registry.findByIntent("I want to create job card for this work");
    expect(jcMatches).toHaveLength(1);
    expect(jcMatches[0].key).toBe(fakeStockControl.key);

    const jobMatches = registry.findByIntent("help me post a job for a senior engineer");
    expect(jobMatches).toHaveLength(1);
    expect(jobMatches[0].key).toBe(fakeAnnixOrbit.key);
  });

  it("findByIntent returns empty for non-matching phrases", () => {
    registry.register(fakeRfq);
    expect(registry.findByIntent("what is the weather today")).toEqual([]);
    expect(registry.findByIntent("")).toEqual([]);
  });

  it("findByIntent is case-insensitive", () => {
    registry.register(fakeStockControl);
    const upperMatches = registry.findByIntent("CREATE JOB CARD please");
    expect(upperMatches).toHaveLength(1);
    expect(upperMatches[0].key).toBe(fakeStockControl.key);
  });

  it("findByGuideSlug returns the matching capability", () => {
    registry.register(fakeStockControl);
    registry.register(fakeAnnixOrbit);

    expect(registry.findByGuideSlug("creating-a-job-card")?.key).toBe(fakeStockControl.key);
    expect(registry.findByGuideSlug("posting-a-job-with-nix")?.key).toBe(fakeAnnixOrbit.key);
    expect(registry.findByGuideSlug("does-not-exist")).toBeNull();
  });

  it("registeredApps returns sorted unique app codes", () => {
    registry.register(fakeStockControl);
    registry.register(fakeAnnixOrbit);
    registry.register(fakeRfq);

    expect(registry.registeredApps()).toEqual(["cv-assistant", "rfq", "stock-control"]);
  });

  it("re-registration replaces the previous capability", () => {
    registry.register(fakeRfq);
    const replaced: INixCapability = {
      ...fakeRfq,
      label: "Updated label",
    };
    registry.register(replaced);

    expect(registry.capability(fakeRfq.key)?.label).toBe("Updated label");
    expect(registry.all()).toHaveLength(1);
  });

  it("all() returns every registered capability", () => {
    registry.register(fakeRfq);
    registry.register(fakeStockControl);
    expect(registry.all()).toHaveLength(2);
  });

  describe("matchWalkthroughIntent", () => {
    it("detects 'walk me through X' and matches a capability with walkthrough/guide", () => {
      registry.register(fakeStockControl);
      const match = registry.matchWalkthroughIntent("walk me through create job card");
      expect(match).not.toBeNull();
      expect(match?.capability.key).toBe(fakeStockControl.key);
      expect(match?.remainder).toBe("create job card");
    });

    it("recognises multiple trigger phrasings", () => {
      registry.register(fakeStockControl);

      expect(registry.matchWalkthroughIntent("step by step create job card")).not.toBeNull();
      expect(registry.matchWalkthroughIntent("guide me through create job card")).not.toBeNull();
      expect(registry.matchWalkthroughIntent("show me how to make a job card")).not.toBeNull();
      expect(registry.matchWalkthroughIntent("hold my hand new jc")).not.toBeNull();
    });

    it("excludes capabilities with no walkthrough/guideSlug", () => {
      registry.register(fakeRfq);
      const match = registry.matchWalkthroughIntent("walk me through extract boq");
      expect(match).toBeNull();
    });

    it("falls back to label substring match when intents do not match", () => {
      registry.register(fakeAnnixOrbit);
      const match = registry.matchWalkthroughIntent("walk me through post a job");
      expect(match?.capability.key).toBe(fakeAnnixOrbit.key);
    });

    it("returns null when no trigger phrase is present", () => {
      registry.register(fakeStockControl);
      expect(registry.matchWalkthroughIntent("how do I create a job card")).toBeNull();
    });

    it("returns null when no remainder follows the trigger", () => {
      registry.register(fakeStockControl);
      expect(registry.matchWalkthroughIntent("walk me through")).toBeNull();
    });

    it("returns null when remainder matches no capability", () => {
      registry.register(fakeStockControl);
      expect(registry.matchWalkthroughIntent("walk me through baking a cake")).toBeNull();
    });

    it("is case-insensitive", () => {
      registry.register(fakeStockControl);
      const match = registry.matchWalkthroughIntent("WALK ME THROUGH CREATE JOB CARD");
      expect(match).not.toBeNull();
    });
  });
});
