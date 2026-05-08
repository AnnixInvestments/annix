import { resolve } from "node:path";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NixChatSession, type WalkthroughState } from "../entities/nix-chat-session.entity";
import type { INixCapability } from "./nix-capability.interface";
import { NixCapabilityRegistry } from "./nix-capability-registry.service";
import { NixGuideLoader } from "./nix-guide-loader.service";
import { WalkthroughEngine } from "./walkthrough-engine.service";

describe("WalkthroughEngine", () => {
  let engine: WalkthroughEngine;
  let registry: NixCapabilityRegistry;
  let sessionRepo: jest.Mocked<Repository<NixChatSession>>;
  let session: NixChatSession;

  beforeEach(async () => {
    process.env.NIX_GUIDES_ROOT = resolve(__dirname, "__fixtures__");

    session = {
      id: 1,
      userId: 1,
      rfqId: 0,
      conversationHistory: [],
      userPreferences: {},
      sessionContext: {},
      walkthroughState: null,
      isActive: true,
      lastInteractionAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as NixChatSession;

    const mockRepo: Partial<jest.Mocked<Repository<NixChatSession>>> = {
      findOne: jest.fn().mockImplementation(async () => session),
      save: jest.fn().mockImplementation(async (s) => {
        Object.assign(session, s);
        return session;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalkthroughEngine,
        NixCapabilityRegistry,
        NixGuideLoader,
        { provide: getRepositoryToken(NixChatSession), useValue: mockRepo },
      ],
    }).compile();

    engine = module.get(WalkthroughEngine);
    registry = module.get(NixCapabilityRegistry);
    sessionRepo = module.get(getRepositoryToken(NixChatSession));
  });

  afterEach(() => {
    process.env.NIX_GUIDES_ROOT = undefined;
  });

  const inlineCapability: INixCapability = {
    key: "test-app.inline-walkthrough",
    appCode: "test-app",
    label: "Inline walkthrough",
    description: "A capability with inline steps",
    walkthrough: {
      key: "inline",
      label: "Inline walkthrough",
      steps: [
        { kind: "instruction", title: "Step 1", body: "Do the first thing" },
        { kind: "instruction", title: "Step 2", body: "Do the second thing" },
        { kind: "instruction", title: "Step 3", body: "Do the third thing" },
      ],
    },
  };

  const guideCapability: INixCapability = {
    key: "test-app.guide-walkthrough",
    appCode: "test-app",
    label: "Guide-backed walkthrough",
    description: "A capability whose steps come from a how-to guide",
    guideSlug: "sample-guide",
  };

  describe("start", () => {
    it("starts a walkthrough using inline steps", async () => {
      registry.register(inlineCapability);

      const view = await engine.start(1, inlineCapability.key);

      expect(view.step).toBe(1);
      expect(view.totalSteps).toBe(3);
      expect(view.title).toBe("Step 1");
      expect(view.body).toBe("Do the first thing");
      expect(view.isLast).toBe(false);
      expect(session.walkthroughState).toMatchObject({
        capabilityKey: inlineCapability.key,
        currentStep: 0,
        totalSteps: 3,
      });
    });

    it("starts a walkthrough using guide H2 partitions", async () => {
      registry.register(guideCapability);

      const view = await engine.start(1, guideCapability.key);

      expect(view.totalSteps).toBe(3);
      expect(view.title).toMatch(/Step 1/);
      expect(session.walkthroughState?.guideSlug).toBe("sample-guide");
    });

    it("throws when capability is unknown", async () => {
      await expect(engine.start(1, "not-registered")).rejects.toThrow(NotFoundException);
    });

    it("throws when capability has no resolvable steps", async () => {
      registry.register({
        key: "test-app.empty",
        appCode: "test-app",
        label: "Empty",
        description: "Has no walkthrough or guideSlug",
      });
      await expect(engine.start(1, "test-app.empty")).rejects.toThrow(NotFoundException);
    });
  });

  describe("advance", () => {
    beforeEach(() => {
      registry.register(inlineCapability);
    });

    it("advances to the next step and records history", async () => {
      await engine.start(1, inlineCapability.key);
      const view = await engine.advance(1);

      expect(view).not.toBeNull();
      expect(view?.step).toBe(2);
      expect(view?.title).toBe("Step 2");
      expect(session.walkthroughState?.currentStep).toBe(1);
      expect(session.walkthroughState?.stepHistory).toHaveLength(1);
      expect(session.walkthroughState?.stepHistory[0]).toMatchObject({
        step: 0,
        title: "Step 1",
        action: "advanced",
      });
    });

    it("returns null and marks completed when past the last step", async () => {
      await engine.start(1, inlineCapability.key);
      await engine.advance(1);
      await engine.advance(1);
      const view = await engine.advance(1);

      expect(view).toBeNull();
      expect(session.walkthroughState?.endedAt).toBeDefined();
      expect(session.walkthroughState?.endReason).toBe("completed");
    });
  });

  describe("back", () => {
    beforeEach(() => {
      registry.register(inlineCapability);
    });

    it("moves to previous step", async () => {
      await engine.start(1, inlineCapability.key);
      await engine.advance(1);
      const view = await engine.back(1);

      expect(view?.step).toBe(1);
      expect(session.walkthroughState?.currentStep).toBe(0);
    });

    it("clamps at step 0 — never goes negative", async () => {
      await engine.start(1, inlineCapability.key);
      const view = await engine.back(1);

      expect(view?.step).toBe(1);
      expect(session.walkthroughState?.currentStep).toBe(0);
    });
  });

  describe("skip", () => {
    beforeEach(() => {
      registry.register(inlineCapability);
    });

    it("skips current step with 'skipped' action in history", async () => {
      await engine.start(1, inlineCapability.key);
      const view = await engine.skip(1);

      expect(view?.step).toBe(2);
      expect(session.walkthroughState?.stepHistory[0].action).toBe("skipped");
    });
  });

  describe("stop", () => {
    beforeEach(() => {
      registry.register(inlineCapability);
    });

    it("ends the walkthrough with the supplied reason", async () => {
      await engine.start(1, inlineCapability.key);
      await engine.stop(1, "abandoned");

      expect(session.walkthroughState?.endedAt).toBeDefined();
      expect(session.walkthroughState?.endReason).toBe("abandoned");
    });

    it("is a no-op when called twice", async () => {
      await engine.start(1, inlineCapability.key);
      await engine.stop(1, "stopped");
      const firstEnd = session.walkthroughState?.endedAt;
      await engine.stop(1, "abandoned");
      expect(session.walkthroughState?.endedAt).toBe(firstEnd);
      expect(session.walkthroughState?.endReason).toBe("stopped");
    });
  });

  describe("state + currentStepView", () => {
    beforeEach(() => {
      registry.register(inlineCapability);
    });

    it("returns the persisted walkthrough state", async () => {
      await engine.start(1, inlineCapability.key);
      const state = await engine.state(1);
      expect(state?.capabilityKey).toBe(inlineCapability.key);
    });

    it("returns null current view when no walkthrough is active", async () => {
      const view = await engine.currentStepView(1);
      expect(view).toBeNull();
    });

    it("returns null current view when ended", async () => {
      await engine.start(1, inlineCapability.key);
      await engine.stop(1);
      const view = await engine.currentStepView(1);
      expect(view).toBeNull();
    });
  });

  describe("stuckContext", () => {
    it("returns step view + parsed guide for a guide-backed walkthrough", async () => {
      registry.register(guideCapability);
      await engine.start(1, guideCapability.key);

      const ctx = await engine.stuckContext(1);
      expect(ctx).not.toBeNull();
      expect(ctx?.step.title).toMatch(/Step 1/);
      expect(ctx?.guide?.slug).toBe("sample-guide");
      expect(session.walkthroughState?.stepHistory[0].action).toBe("stuck");
    });

    it("returns null guide for inline-step capabilities", async () => {
      registry.register(inlineCapability);
      await engine.start(1, inlineCapability.key);

      const ctx = await engine.stuckContext(1);
      expect(ctx?.guide).toBeNull();
      expect(ctx?.step.title).toBe("Step 1");
    });
  });

  describe("session lookup", () => {
    it("throws when session does not exist", async () => {
      sessionRepo.findOne.mockResolvedValueOnce(null);
      await expect(engine.start(1, "anything")).rejects.toThrow(NotFoundException);
    });
  });

  it("persists state across operations", async () => {
    registry.register(inlineCapability);
    await engine.start(1, inlineCapability.key);
    await engine.advance(1);

    const fetched = await engine.state(1);
    expect(fetched?.currentStep).toBe(1);
    expect(fetched?.stepHistory).toHaveLength(1);

    const partialState: Partial<WalkthroughState> | null | undefined = fetched;
    expect(partialState).toBeTruthy();
  });
});
