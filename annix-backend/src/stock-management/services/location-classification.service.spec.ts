import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { IssuableProduct } from "../entities/issuable-product.entity";
import { LocationClassificationService } from "./location-classification.service";

describe("LocationClassificationService", () => {
  let service: LocationClassificationService;

  const mockProductRepo = {
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockAiChatService = {
    chat: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationClassificationService,
        { provide: getRepositoryToken(IssuableProduct), useValue: mockProductRepo },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<LocationClassificationService>(LocationClassificationService);
    jest.clearAllMocks();
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
      mockProductRepo.find.mockResolvedValueOnce([]);
      const result = await service.classifyUnassignedProducts(1, [{ id: 1, name: "Paint Store" }]);
      expect(result).toEqual([]);
    });

    it("classifies products with token overlap to the matching location", async () => {
      mockProductRepo.find.mockResolvedValueOnce([
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
      expect(mockProductRepo.update).toHaveBeenCalledTimes(2);
    });
  });
});
