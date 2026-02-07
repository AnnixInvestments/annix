import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { now } from "../lib/datetime";
import { CreatePumpProductDto } from "./dto/create-pump-product.dto";
import { UpdatePumpProductDto } from "./dto/update-pump-product.dto";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "./entities/pump-product.entity";
import { PumpCurveDigitizerService } from "./pump-curve-digitizer.service";
import { PumpDataImportService } from "./pump-data-import.service";
import { PumpDatasheetService } from "./pump-datasheet.service";
import { PumpManufacturerApiService } from "./pump-manufacturer-api.service";
import { PumpProductController } from "./pump-product.controller";
import { PumpProductService } from "./pump-product.service";

describe("PumpProductController", () => {
  let controller: PumpProductController;
  let service: PumpProductService;

  const mockPumpProductRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPumpProductService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySku: jest.fn(),
    findByCategory: jest.fn(),
    findByManufacturer: jest.fn(),
    manufacturers: jest.fn(),
    update: jest.fn(),
    updateStock: jest.fn(),
    remove: jest.fn(),
    fullTextSearch: jest.fn(),
    findByIds: jest.fn(),
    findSimilar: jest.fn(),
  };

  const mockDataImportService = {
    importFromCsv: jest.fn(),
    importFromJson: jest.fn(),
    generateCsvTemplate: jest.fn(),
  };

  const mockDatasheetService = {
    uploadDatasheet: jest.fn(),
    uploadProductImage: jest.fn(),
    uploadPumpCurve: jest.fn(),
    updatePumpCurveData: jest.fn(),
    deleteDatasheet: jest.fn(),
    downloadDatasheet: jest.fn(),
  };

  const mockManufacturerApiService = {
    availableManufacturers: jest.fn(),
    checkAvailability: jest.fn(),
    fetchProductsFromManufacturer: jest.fn(),
    mapToCreateDto: jest.fn(),
  };

  const mockCurveDigitizerService = {
    digitizeCurve: jest.fn(),
    createFromManualEntry: jest.fn(),
    analyzeCurve: jest.fn(),
  };

  const mockProduct = {
    id: 1,
    sku: "KSB-ETN-50-200",
    title: "KSB Etanorm 50-200",
    description: "Single-stage end suction pump",
    pumpType: "end_suction",
    category: PumpProductCategory.CENTRIFUGAL,
    status: PumpProductStatus.ACTIVE,
    manufacturer: "KSB",
    modelNumber: "ETN 50-200",
    flowRateMin: 20,
    flowRateMax: 100,
    headMin: 20,
    headMax: 65,
    motorPowerKw: 7.5,
    listPrice: 45000,
    stockQuantity: 3,
    certifications: ["ISO 9001", "CE"],
    applications: ["water_supply", "hvac"],
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PumpProductController],
      providers: [
        { provide: PumpProductService, useValue: mockPumpProductService },
        { provide: PumpDataImportService, useValue: mockDataImportService },
        { provide: PumpDatasheetService, useValue: mockDatasheetService },
        { provide: PumpManufacturerApiService, useValue: mockManufacturerApiService },
        { provide: PumpCurveDigitizerService, useValue: mockCurveDigitizerService },
        {
          provide: getRepositoryToken(PumpProduct),
          useValue: mockPumpProductRepo,
        },
      ],
    }).compile();

    controller = module.get<PumpProductController>(PumpProductController);
    service = module.get<PumpProductService>(PumpProductService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a new pump product", async () => {
      const createDto: CreatePumpProductDto = {
        sku: "KSB-ETN-50-200",
        title: "KSB Etanorm 50-200",
        pumpType: "end_suction",
        category: PumpProductCategory.CENTRIFUGAL,
        manufacturer: "KSB",
      };

      mockPumpProductService.create.mockResolvedValue(mockProduct);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockProduct);
      expect(mockPumpProductService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe("findAll", () => {
    it("should return paginated list of products", async () => {
      const mockResponse = {
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPumpProductService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll("1", "10");

      expect(result).toEqual(mockResponse);
      expect(mockPumpProductService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
        category: undefined,
        manufacturer: undefined,
        status: undefined,
        minFlowRate: undefined,
        maxFlowRate: undefined,
        minHead: undefined,
        maxHead: undefined,
      });
    });

    it("should filter by category", async () => {
      const mockResponse = {
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockPumpProductService.findAll.mockResolvedValue(mockResponse);

      await controller.findAll(undefined, undefined, undefined, PumpProductCategory.CENTRIFUGAL);

      expect(mockPumpProductService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          category: PumpProductCategory.CENTRIFUGAL,
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a product by id", async () => {
      mockPumpProductService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockProduct);
      expect(mockPumpProductService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe("findBySku", () => {
    it("should return a product by SKU", async () => {
      mockPumpProductService.findBySku.mockResolvedValue(mockProduct);

      const result = await controller.findBySku("KSB-ETN-50-200");

      expect(result).toEqual(mockProduct);
      expect(mockPumpProductService.findBySku).toHaveBeenCalledWith("KSB-ETN-50-200");
    });
  });

  describe("findByCategory", () => {
    it("should return products by category", async () => {
      mockPumpProductService.findByCategory.mockResolvedValue([mockProduct]);

      const result = await controller.findByCategory(PumpProductCategory.CENTRIFUGAL);

      expect(result).toEqual([mockProduct]);
      expect(mockPumpProductService.findByCategory).toHaveBeenCalledWith(
        PumpProductCategory.CENTRIFUGAL,
      );
    });
  });

  describe("findByManufacturer", () => {
    it("should return products by manufacturer", async () => {
      mockPumpProductService.findByManufacturer.mockResolvedValue([mockProduct]);

      const result = await controller.findByManufacturer("KSB");

      expect(result).toEqual([mockProduct]);
      expect(mockPumpProductService.findByManufacturer).toHaveBeenCalledWith("KSB");
    });
  });

  describe("manufacturers", () => {
    it("should return list of manufacturers", async () => {
      const manufacturers = ["KSB", "Grundfos", "Sulzer"];
      mockPumpProductService.manufacturers.mockResolvedValue(manufacturers);

      const result = await controller.manufacturers();

      expect(result).toEqual(manufacturers);
      expect(mockPumpProductService.manufacturers).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a product", async () => {
      const updateDto: UpdatePumpProductDto = {
        title: "Updated Title",
        listPrice: 50000,
      };

      const updatedProduct = { ...mockProduct, ...updateDto };
      mockPumpProductService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedProduct);
      expect(mockPumpProductService.update).toHaveBeenCalledWith(1, updateDto);
    });
  });

  describe("updateStock", () => {
    it("should update product stock quantity", async () => {
      const updatedProduct = { ...mockProduct, stockQuantity: 10 };
      mockPumpProductService.updateStock.mockResolvedValue(updatedProduct);

      const result = await controller.updateStock(1, 10);

      expect(result).toEqual(updatedProduct);
      expect(mockPumpProductService.updateStock).toHaveBeenCalledWith(1, 10);
    });
  });

  describe("remove", () => {
    it("should delete a product", async () => {
      mockPumpProductService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(mockPumpProductService.remove).toHaveBeenCalledWith(1);
    });
  });
});
