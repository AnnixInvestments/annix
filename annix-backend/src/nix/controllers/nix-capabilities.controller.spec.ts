import { Test, TestingModule } from "@nestjs/testing";
import { AnyUserAuthGuard } from "../../auth/guards/any-user-auth.guard";
import type { INixCapability } from "../capabilities";
import { NixCapabilityRegistry } from "../capabilities";
import { NixCapabilitiesController } from "./nix-capabilities.controller";

describe("NixCapabilitiesController", () => {
  let controller: NixCapabilitiesController;
  let registry: NixCapabilityRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NixCapabilitiesController],
      providers: [NixCapabilityRegistry],
    })
      .overrideGuard(AnyUserAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(NixCapabilitiesController);
    registry = module.get(NixCapabilityRegistry);
  });

  const fakeRfq: INixCapability = {
    key: "rfq.extract-boq",
    appCode: "rfq",
    label: "Extract BOQ",
    description: "Parses a customer BOQ into RFQ line items",
    intents: ["extract boq", "upload boq"],
  };

  const fakeStockControl: INixCapability = {
    key: "stock-control.create-job-card",
    appCode: "stock-control",
    label: "Create a job card",
    description: "Walks through creating a new job card",
    intents: ["create job card"],
    guideSlug: "creating-a-job-card",
  };

  const fakeWithWalkthrough: INixCapability = {
    key: "annix-orbit.post-job",
    appCode: "annix-orbit",
    label: "Post a job",
    description: "Walk through posting a job",
    intents: ["post a job"],
    guideSlug: "posting-a-job-with-nix",
    walkthrough: { key: "post-job", label: "Post a job", guideSlug: "posting-a-job-with-nix" },
  };

  it("list() returns all capabilities as DTOs", () => {
    registry.register(fakeRfq);
    registry.register(fakeStockControl);

    const dtos = controller.list();
    expect(dtos).toHaveLength(2);
    const rfqDto = dtos.find((d) => d.key === fakeRfq.key);
    expect(rfqDto).toBeDefined();
    expect(rfqDto?.appCode).toBe("rfq");
    expect(rfqDto?.intents).toEqual(["extract boq", "upload boq"]);
    expect(rfqDto?.hasWalkthrough).toBe(false);
    expect(rfqDto?.hasExtractionProfile).toBe(false);
  });

  it("list() filters by appCode when provided", () => {
    registry.register(fakeRfq);
    registry.register(fakeStockControl);

    const scOnly = controller.list("stock-control");
    expect(scOnly).toHaveLength(1);
    expect(scOnly[0].key).toBe(fakeStockControl.key);
    expect(scOnly[0].guideSlug).toBe("creating-a-job-card");
  });

  it("list() returns empty for unknown appCode", () => {
    registry.register(fakeRfq);
    expect(controller.list("non-existent-app")).toEqual([]);
  });

  it("list() flags hasWalkthrough on capabilities with a walkthrough definition", () => {
    registry.register(fakeWithWalkthrough);
    const [dto] = controller.list();
    expect(dto.hasWalkthrough).toBe(true);
  });

  it("apps() returns one entry per app with capability count", () => {
    registry.register(fakeRfq);
    registry.register(fakeStockControl);
    registry.register(fakeWithWalkthrough);

    const apps = controller.apps();
    expect(apps).toHaveLength(3);
    const cv = apps.find((a) => a.appCode === "annix-orbit");
    expect(cv?.capabilityCount).toBe(1);
  });

  it("apps() returns alphabetically sorted entries", () => {
    registry.register(fakeStockControl);
    registry.register(fakeRfq);
    registry.register(fakeWithWalkthrough);

    const apps = controller.apps();
    expect(apps.map((a) => a.appCode)).toEqual(["annix-orbit", "rfq", "stock-control"]);
  });

  it("apps() counts multiple capabilities for the same app", () => {
    registry.register(fakeRfq);
    registry.register({
      ...fakeRfq,
      key: "rfq.draft-pricing",
      label: "Draft pricing",
      description: "Drafts a pricing breakdown",
    });

    const apps = controller.apps();
    const rfqApp = apps.find((a) => a.appCode === "rfq");
    expect(rfqApp?.capabilityCount).toBe(2);
  });

  it("apps() returns empty when no capabilities are registered", () => {
    expect(controller.apps()).toEqual([]);
  });
});
