import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IssuableProductRepository } from "../repositories/issuable-product.repository";
import { LocationClassificationService } from "./location-classification.service";

describe("LocationClassificationService", () => {
  let service: LocationClassificationService;

  const mockProductRepo = {
    findUnassignedActive: jest.fn(),
    updateLocation: jest.fn().mockResolvedValue(undefined),
    updateLocationForIds: jest.fn().mockResolvedValue(0),
    findStockControlLocationByName: jest.fn(),
    insertStockControlLocation: jest.fn(),
  };

  const mockAiChatService = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationClassificationService,
        { provide: IssuableProductRepository, useValue: mockProductRepo },
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<LocationClassificationService>(LocationClassificationService);
    jest.clearAllMocks();
    mockProductRepo.updateLocation.mockResolvedValue(undefined);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("classifyUnassignedProducts", () => {
    it("returns empty list when no locations are provided", async () => {
      const result = await service.classifyUnassignedProducts(1, []);
      expect(result).toEqual([]);
    });

    it("returns empty list when no unassigned products exist", async () => {
      mockProductRepo.findUnassignedActive.mockResolvedValueOnce([]);
      const result = await service.classifyUnassignedProducts(1, [{ id: 1, name: "Paint Store" }]);
      expect(result).toEqual([]);
    });

    it("classifies products with token overlap to the matching location", async () => {
      mockProductRepo.findUnassignedActive.mockResolvedValueOnce([
        {
          id: 1,
          sku: "JOT-EPX",
          name: "Jotun Epoxy Base 20L",
          productType: "paint",
          description: null,
        },
      ]);
      const locations = [
        { id: 10, name: "Paint Store A" },
        { id: 20, name: "Rubber Bay" },
      ];
      const result = await service.classifyUnassignedProducts(1, locations);
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(1);
    });
  });

  describe("applyClassifications", () => {
    it("updates products with non-null location decisions", async () => {
      const result = await service.applyClassifications(1, [
        { productId: 1, locationId: 10 },
        { productId: 2, locationId: 20 },
        { productId: 3, locationId: null },
      ]);
      expect(result.updated).toBe(2);
      expect(mockProductRepo.updateLocation).toHaveBeenCalledTimes(2);
    });
  });
});
