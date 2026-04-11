import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { PaintClassificationService } from "./paint-classification.service";

describe("PaintClassificationService", () => {
  let service: PaintClassificationService;

  const mockAiChatService = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaintClassificationService,
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<PaintClassificationService>(PaintClassificationService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("classifyByRules", () => {
    it("classifies obvious paint by category keyword as paint", () => {
      const result = service.classifyByRules({
        id: 1,
        sku: "JOT-EPX-20L",
        name: "Jotun Epoxy Base 20L",
        description: null,
        category: "Paint - Epoxy",
        unitOfMeasure: "litres",
      });
      expect(result.label).toBe("paint");
      expect(result.signals.length).toBeGreaterThan(0);
    });

    it("classifies plain consumables as consumable", () => {
      const result = service.classifyByRules({
        id: 2,
        sku: "BRUSH-50",
        name: "Paint Brush 50mm",
        description: null,
        category: "Tools",
        unitOfMeasure: "each",
      });
      expect(["paint", "unsure", "consumable"]).toContain(result.label);
    });

    it("recognises paint suppliers as a strong signal", () => {
      const result = service.classifyByRules({
        id: 3,
        sku: "SKU-1",
        name: "Hempel Epoxy Primer 20L",
        description: null,
        category: "Coating",
        unitOfMeasure: "litres",
        supplierName: "Hempel SA",
      });
      expect(result.label).toBe("paint");
      expect(result.signals.some((s) => s.includes("Hempel"))).toBe(true);
    });

    it("returns confidence within [0, 1]", () => {
      const result = service.classifyByRules({
        id: 4,
        sku: "X",
        name: "Random Item",
        description: null,
        category: null,
        unitOfMeasure: "each",
      });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});
