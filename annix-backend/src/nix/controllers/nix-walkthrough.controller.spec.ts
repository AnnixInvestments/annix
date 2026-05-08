import { Test, TestingModule } from "@nestjs/testing";
import { AnyUserAuthGuard } from "../../auth/guards/any-user-auth.guard";
import { WalkthroughEngine, type WalkthroughStepView } from "../capabilities";
import { NixWalkthroughController } from "./nix-walkthrough.controller";

describe("NixWalkthroughController", () => {
  let controller: NixWalkthroughController;
  let engine: jest.Mocked<WalkthroughEngine>;

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

  it("start delegates to engine", async () => {
    engine.start.mockResolvedValue(stepView);
    const result = await controller.start(42, { capabilityKey: "x.y" });
    expect(engine.start).toHaveBeenCalledWith(42, "x.y");
    expect(result).toEqual(stepView);
  });

  it("advance delegates to engine", async () => {
    engine.advance.mockResolvedValue(stepView);
    expect(await controller.advance(42)).toEqual(stepView);
    expect(engine.advance).toHaveBeenCalledWith(42);
  });

  it("back delegates to engine", async () => {
    engine.back.mockResolvedValue(stepView);
    expect(await controller.back(42)).toEqual(stepView);
    expect(engine.back).toHaveBeenCalledWith(42);
  });

  it("skip delegates to engine", async () => {
    engine.skip.mockResolvedValue(stepView);
    expect(await controller.skip(42)).toEqual(stepView);
    expect(engine.skip).toHaveBeenCalledWith(42);
  });

  it("stop delegates with default reason 'stopped'", async () => {
    engine.stop.mockResolvedValue();
    const result = await controller.stop(42, {});
    expect(engine.stop).toHaveBeenCalledWith(42, "stopped");
    expect(result).toEqual({ ok: true });
  });

  it("stop honours an explicit reason", async () => {
    engine.stop.mockResolvedValue();
    await controller.stop(42, { reason: "abandoned" });
    expect(engine.stop).toHaveBeenCalledWith(42, "abandoned");
  });

  it("state delegates to engine", async () => {
    engine.state.mockResolvedValue(null);
    expect(await controller.state(42)).toBeNull();
    expect(engine.state).toHaveBeenCalledWith(42);
  });

  it("currentStep delegates to engine", async () => {
    engine.currentStepView.mockResolvedValue(stepView);
    expect(await controller.currentStep(42)).toEqual(stepView);
    expect(engine.currentStepView).toHaveBeenCalledWith(42);
  });
});
