import { Test, TestingModule } from "@nestjs/testing";
import { AnyUserAuthGuard, AuthenticatedUser } from "../../auth/guards/any-user-auth.guard";
import { WalkthroughEngine, type WalkthroughStepView } from "../capabilities";
import type { NixSessionOwner } from "../entities/nix-chat-session.entity";
import { NixWalkthroughController } from "./nix-walkthrough.controller";

describe("NixWalkthroughController", () => {
  let controller: NixWalkthroughController;
  let engine: jest.Mocked<WalkthroughEngine>;

  const authUser: AuthenticatedUser = {
    userId: 7,
    type: "customer",
  } as AuthenticatedUser;
  const owner: NixSessionOwner = { userId: 7, appScope: "customer" };
  const req = { authUser } as { authUser: AuthenticatedUser };

  beforeEach(async () => {
    const mockEngine: Partial<jest.Mocked<WalkthroughEngine>> = {
      start: jest.fn(),
      advance: jest.fn(),
      back: jest.fn(),
      skip: jest.fn(),
      stop: jest.fn(),
      state: jest.fn(),
      currentStepView: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NixWalkthroughController],
      providers: [{ provide: WalkthroughEngine, useValue: mockEngine }],
    })
      .overrideGuard(AnyUserAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(NixWalkthroughController);
    engine = module.get(WalkthroughEngine);
  });

  const stepView: WalkthroughStepView = {
    step: 1,
    totalSteps: 3,
    title: "Step 1",
    body: "Do the first thing",
    isLast: false,
    capabilityLabel: "Test capability",
  };

  it("start delegates to engine with the request owner", async () => {
    engine.start.mockResolvedValue(stepView);
    const result = await controller.start(42, { capabilityKey: "x.y" }, req);
    expect(engine.start).toHaveBeenCalledWith(42, owner, "x.y");
    expect(result).toEqual(stepView);
  });

  it("advance delegates to engine with the request owner", async () => {
    engine.advance.mockResolvedValue(stepView);
    expect(await controller.advance(42, req)).toEqual(stepView);
    expect(engine.advance).toHaveBeenCalledWith(42, owner);
  });

  it("back delegates to engine with the request owner", async () => {
    engine.back.mockResolvedValue(stepView);
    expect(await controller.back(42, req)).toEqual(stepView);
    expect(engine.back).toHaveBeenCalledWith(42, owner);
  });

  it("skip delegates to engine with the request owner", async () => {
    engine.skip.mockResolvedValue(stepView);
    expect(await controller.skip(42, req)).toEqual(stepView);
    expect(engine.skip).toHaveBeenCalledWith(42, owner);
  });

  it("stop delegates with default reason 'stopped' and the request owner", async () => {
    engine.stop.mockResolvedValue();
    const result = await controller.stop(42, {}, req);
    expect(engine.stop).toHaveBeenCalledWith(42, owner, "stopped");
    expect(result).toEqual({ ok: true });
  });

  it("stop honours an explicit reason", async () => {
    engine.stop.mockResolvedValue();
    await controller.stop(42, { reason: "abandoned" }, req);
    expect(engine.stop).toHaveBeenCalledWith(42, owner, "abandoned");
  });

  it("state delegates to engine with the request owner", async () => {
    engine.state.mockResolvedValue(null);
    expect(await controller.state(42, req)).toBeNull();
    expect(engine.state).toHaveBeenCalledWith(42, owner);
  });

  it("currentStep delegates to engine with the request owner", async () => {
    engine.currentStepView.mockResolvedValue(stepView);
    expect(await controller.currentStep(42, req)).toEqual(stepView);
    expect(engine.currentStepView).toHaveBeenCalledWith(42, owner);
  });

  it("derives the owner from authUser, never client input", async () => {
    engine.state.mockResolvedValue(null);
    const adminReq = {
      authUser: { userId: 99, type: "admin" } as AuthenticatedUser,
    };
    await controller.state(42, adminReq);
    expect(engine.state).toHaveBeenCalledWith(42, { userId: 99, appScope: "admin" });
  });
});
