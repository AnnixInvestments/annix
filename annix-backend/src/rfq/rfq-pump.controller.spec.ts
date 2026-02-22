import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CustomerAuthGuard } from "../customer/guards/customer-auth.guard";
import { now } from "../lib/datetime";
import { SupplierAuthGuard } from "../supplier/guards/supplier-auth.guard";
import { CreatePumpRfqDto } from "./dto/create-pump-rfq.dto";
import { CreatePumpRfqWithItemDto } from "./dto/create-pump-rfq-with-item.dto";
import { PumpCalculationResultDto } from "./dto/pump-calculation-result.dto";
import {
  PumpCategory,
  PumpMotorType,
  PumpSealType,
  PumpServiceType,
} from "./entities/pump-rfq.entity";
import { Rfq, RfqStatus } from "./entities/rfq.entity";
import { RfqController } from "./rfq.controller";
import { RfqService } from "./rfq.service";

describe("RfqController - Pump Endpoints", () => {
  let controller: RfqController;
  let service: RfqService;

  const mockGuard = { canActivate: jest.fn(() => true) };

  const mockRfqService = {
    calculatePumpRequirements: jest.fn(),
    createPumpRfq: jest.fn(),
    findAllRfqs: jest.fn(),
    findRfqById: jest.fn(),
  };

  const mockPumpCalculationResult: PumpCalculationResultDto = {
    hydraulicPowerKw: 13.6,
    estimatedMotorPowerKw: 22,
    estimatedEfficiency: 80,
    specificSpeed: 45,
    recommendedPumpType: "End suction centrifugal pump suitable for this duty",
    npshRequired: 3.5,
    bepFlowRate: 110,
    bepHead: 52,
    operatingPointPercentBep: 91,
    warnings: [],
    recommendations: [],
  };

  const mockRfq = {
    id: 1,
    rfqNumber: "RFQ-2026-0001",
    projectName: "Water Transfer Pump Station",
    description: "New centrifugal pump for water supply system",
    customerName: "Municipal Water Services",
    customerEmail: "procurement@municipal-water.co.za",
    customerPhone: "+27 11 555 0789",
    requiredDate: new Date("2026-06-30"),
    status: RfqStatus.DRAFT,
    notes: "API 610 compliance required",
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    items: [],
    drawings: [],
    documents: [],
    boqs: [],
  } as Rfq;

  const mockRequest = {
    customer: { userId: 1 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RfqController],
      providers: [{ provide: RfqService, useValue: mockRfqService }],
    })
      .overrideGuard(CustomerAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(SupplierAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RfqController>(RfqController);
    service = module.get<RfqService>(RfqService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("calculatePumpRequirements", () => {
    it("should calculate pump requirements for centrifugal pump", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_end_suction",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 100,
        totalHead: 50,
        npshAvailable: 8,
        operatingTemp: 25,
        fluidType: "water",
        specificGravity: 1.0,
        casingMaterial: "cast_iron",
        impellerMaterial: "bronze",
        sealType: PumpSealType.MECHANICAL_SINGLE,
        motorType: PumpMotorType.ELECTRIC_AC,
        voltage: "380V",
        frequency: "50Hz",
        quantityValue: 2,
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(mockPumpCalculationResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result).toEqual(mockPumpCalculationResult);
      expect(mockRfqService.calculatePumpRequirements).toHaveBeenCalledWith(dto);
    });

    it("should calculate requirements for high flow rate pump", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_multistage",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 500,
        totalHead: 200,
        npshAvailable: 10,
        operatingTemp: 40,
        fluidType: "water",
        specificGravity: 1.0,
        casingMaterial: "stainless_steel_316",
        impellerMaterial: "stainless_steel_316",
        quantityValue: 1,
      };

      const highFlowResult: PumpCalculationResultDto = {
        hydraulicPowerKw: 272,
        estimatedMotorPowerKw: 400,
        estimatedEfficiency: 80,
        specificSpeed: 25,
        recommendedPumpType: "Multistage pump recommended for high head",
        npshRequired: 8,
        bepFlowRate: 520,
        bepHead: 210,
        operatingPointPercentBep: 96,
        warnings: ["High power requirement - verify electrical supply"],
        recommendations: [],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(highFlowResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.estimatedMotorPowerKw).toBe(400);
      expect(result.warnings).toContain("High power requirement - verify electrical supply");
    });

    it("should calculate requirements for slurry pump", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "slurry",
        pumpCategory: PumpCategory.SPECIALTY,
        flowRate: 200,
        totalHead: 40,
        operatingTemp: 30,
        fluidType: "slurry",
        specificGravity: 1.5,
        viscosity: 50,
        solidsContent: 25,
        isAbrasive: true,
        casingMaterial: "high_chrome",
        impellerMaterial: "high_chrome",
        quantityValue: 1,
      };

      const slurryResult: PumpCalculationResultDto = {
        hydraulicPowerKw: 32.7,
        estimatedMotorPowerKw: 75,
        estimatedEfficiency: 60,
        specificSpeed: 60,
        recommendedPumpType: "Heavy duty slurry pump with wear-resistant materials",
        npshRequired: 5,
        bepFlowRate: 220,
        bepHead: 42,
        operatingPointPercentBep: 91,
        warnings: [
          "High solids content - regular wear parts inspection required",
          "Abrasive service - consider spare impeller inventory",
        ],
        recommendations: [],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(slurryResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.estimatedEfficiency).toBe(60);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should handle spare parts request calculation", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.SPARE_PARTS,
        pumpType: "centrifugal_multistage",
        fluidType: "process_water",
        casingMaterial: "stainless_steel_316",
        impellerMaterial: "stainless_steel_316",
        existingPumpModel: "KSB Etanorm 80-200",
        existingPumpSerial: "SN-2019-45678",
        spareParts: [
          { partNumber: "IMP-001", description: "Impeller", quantity: 1 },
          { partNumber: "MSL-001", description: "Mechanical Seal", quantity: 2 },
        ],
        quantityValue: 1,
      };

      const sparePartsResult: PumpCalculationResultDto = {
        hydraulicPowerKw: 0,
        estimatedMotorPowerKw: 0,
        estimatedEfficiency: 0,
        specificSpeed: 0,
        recommendedPumpType: "Spare parts for existing pump",
        npshRequired: 0,
        bepFlowRate: 0,
        bepHead: 0,
        operatingPointPercentBep: 0,
        warnings: [],
        recommendations: [],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(sparePartsResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.recommendedPumpType).toBe("Spare parts for existing pump");
    });

    it("should handle rental pump calculation", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.RENTAL,
        pumpType: "submersible_dewatering",
        pumpCategory: PumpCategory.SPECIALTY,
        flowRate: 150,
        totalHead: 30,
        fluidType: "water",
        casingMaterial: "cast_iron",
        impellerMaterial: "cast_iron",
        rentalDurationDays: 90,
        quantityValue: 2,
      };

      const rentalResult: PumpCalculationResultDto = {
        hydraulicPowerKw: 12.3,
        estimatedMotorPowerKw: 18.5,
        estimatedEfficiency: 80,
        specificSpeed: 80,
        recommendedPumpType: "Submersible dewatering pump for temporary use",
        npshRequired: 2,
        bepFlowRate: 160,
        bepHead: 32,
        operatingPointPercentBep: 94,
        warnings: [],
        recommendations: [],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(rentalResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.recommendedPumpType).toContain("temporary");
    });
  });

  describe("createPumpRfq", () => {
    it("should create a new pump RFQ", async () => {
      const dto: CreatePumpRfqWithItemDto = {
        rfq: {
          projectName: "Water Transfer Pump Station",
          description: "New centrifugal pump for water supply system",
          customerName: "Municipal Water Services",
          customerEmail: "procurement@municipal-water.co.za",
          customerPhone: "+27 11 555 0789",
          requiredDate: "2026-06-30",
          status: RfqStatus.DRAFT,
          notes: "API 610 compliance required",
        },
        pump: {
          serviceType: PumpServiceType.NEW_PUMP,
          pumpType: "centrifugal_end_suction",
          pumpCategory: PumpCategory.CENTRIFUGAL,
          flowRate: 100,
          totalHead: 50,
          npshAvailable: 8,
          operatingTemp: 25,
          fluidType: "water",
          specificGravity: 1.0,
          casingMaterial: "cast_iron",
          impellerMaterial: "bronze",
          sealType: PumpSealType.MECHANICAL_SINGLE,
          motorType: PumpMotorType.ELECTRIC_AC,
          voltage: "380V",
          frequency: "50Hz",
          quantityValue: 2,
        },
        itemDescription: "Centrifugal End Suction Pump - 100 m³/h @ 50m TDH",
        itemNotes: "Outdoor installation, weather protection required",
      };

      mockRfqService.createPumpRfq.mockResolvedValue({
        rfq: mockRfq,
        calculation: mockPumpCalculationResult,
      });

      const result = await controller.createPumpRfq(dto, mockRequest as any);

      expect(result.rfq).toEqual(mockRfq);
      expect(result.calculation).toEqual(mockPumpCalculationResult);
      expect(mockRfqService.createPumpRfq).toHaveBeenCalledWith(dto, 1);
    });

    it("should create spare parts RFQ", async () => {
      const dto: CreatePumpRfqWithItemDto = {
        rfq: {
          projectName: "KSB Pump Spare Parts",
          description: "Spare parts for existing pump",
          customerName: "Mining Corp SA",
          customerEmail: "maintenance@miningcorp.co.za",
          requiredDate: "2026-03-31",
          status: RfqStatus.DRAFT,
        },
        pump: {
          serviceType: PumpServiceType.SPARE_PARTS,
          pumpType: "centrifugal_multistage",
          fluidType: "process_water",
          casingMaterial: "stainless_steel_316",
          impellerMaterial: "stainless_steel_316",
          existingPumpModel: "KSB Etanorm 80-200",
          existingPumpSerial: "SN-2019-45678",
          spareParts: [{ partNumber: "IMP-001", description: "Impeller", quantity: 1 }],
          quantityValue: 1,
        },
        itemDescription: "Spare Parts Kit for KSB Etanorm 80-200",
      };

      const sparePartsRfq = {
        ...mockRfq,
        projectName: "KSB Pump Spare Parts",
      };

      mockRfqService.createPumpRfq.mockResolvedValue({
        rfq: sparePartsRfq,
        calculation: {
          ...mockPumpCalculationResult,
          recommendedPumpType: "Spare parts for existing pump",
        },
      });

      const result = await controller.createPumpRfq(dto, mockRequest as any);

      expect(result.rfq.projectName).toBe("KSB Pump Spare Parts");
    });

    it("should create repair service RFQ", async () => {
      const dto: CreatePumpRfqWithItemDto = {
        rfq: {
          projectName: "Pump Repair Service",
          description: "Repair of damaged slurry pump",
          customerName: "Chemical Plant Ltd",
          customerEmail: "ops@chemical-plant.co.za",
          requiredDate: "2026-02-28",
          status: RfqStatus.DRAFT,
          notes: "Pump seized - needs complete overhaul",
        },
        pump: {
          serviceType: PumpServiceType.REPAIR_SERVICE,
          pumpType: "slurry",
          fluidType: "slurry",
          casingMaterial: "high_chrome",
          impellerMaterial: "high_chrome",
          existingPumpModel: "Warman 6/4 AH",
          existingPumpSerial: "WM-2020-12345",
          quantityValue: 1,
        },
        itemDescription: "Complete overhaul of Warman 6/4 AH slurry pump",
        itemNotes: "Pump to be collected from site",
      };

      mockRfqService.createPumpRfq.mockResolvedValue({
        rfq: { ...mockRfq, projectName: "Pump Repair Service" },
        calculation: mockPumpCalculationResult,
      });

      const result = await controller.createPumpRfq(dto, mockRequest as any);

      expect(result.rfq.projectName).toBe("Pump Repair Service");
    });

    it("should create rental pump RFQ", async () => {
      const dto: CreatePumpRfqWithItemDto = {
        rfq: {
          projectName: "Emergency Dewatering",
          description: "Temporary pumps for flood control",
          customerName: "Construction Co",
          customerEmail: "site@construction.co.za",
          requiredDate: "2026-02-15",
          status: RfqStatus.DRAFT,
        },
        pump: {
          serviceType: PumpServiceType.RENTAL,
          pumpType: "submersible_dewatering",
          pumpCategory: PumpCategory.SPECIALTY,
          flowRate: 200,
          totalHead: 25,
          fluidType: "water",
          casingMaterial: "cast_iron",
          impellerMaterial: "cast_iron",
          rentalDurationDays: 30,
          quantityValue: 4,
        },
        itemDescription: "4x Submersible dewatering pumps - 30 day rental",
      };

      mockRfqService.createPumpRfq.mockResolvedValue({
        rfq: { ...mockRfq, projectName: "Emergency Dewatering" },
        calculation: mockPumpCalculationResult,
      });

      const result = await controller.createPumpRfq(dto, mockRequest as any);

      expect(result.rfq.projectName).toBe("Emergency Dewatering");
    });
  });

  describe("Pump calculation edge cases", () => {
    it("should handle low NPSH available warning", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_end_suction",
        flowRate: 100,
        totalHead: 50,
        npshAvailable: 2,
        operatingTemp: 25,
        fluidType: "water",
        specificGravity: 1.0,
        casingMaterial: "cast_iron",
        impellerMaterial: "bronze",
        quantityValue: 1,
      };

      const lowNpshResult: PumpCalculationResultDto = {
        ...mockPumpCalculationResult,
        npshRequired: 4,
        warnings: [
          "NPSHa (2m) is less than NPSHr (4m) - cavitation risk",
          "Consider booster pump or elevated suction tank",
        ],
        recommendations: ["Increase suction head or reduce friction losses"],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(lowNpshResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.npshRequired).toBe(4);
      expect(result.warnings.some((w) => w.includes("cavitation"))).toBe(true);
    });

    it("should handle high viscosity fluid", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "progressive_cavity",
        pumpCategory: PumpCategory.POSITIVE_DISPLACEMENT,
        flowRate: 20,
        totalHead: 30,
        operatingTemp: 40,
        fluidType: "heavy_oil",
        specificGravity: 0.95,
        viscosity: 1000,
        casingMaterial: "cast_iron",
        impellerMaterial: "stainless_steel_316",
        quantityValue: 1,
      };

      const viscousResult: PumpCalculationResultDto = {
        ...mockPumpCalculationResult,
        recommendedPumpType: "Progressive cavity pump for viscous fluid",
        warnings: [
          "High viscosity (1000 cP) - consider progressive cavity or gear pump",
          "Reduced flow rate expected due to viscosity",
        ],
        recommendations: [],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(viscousResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.warnings.some((w) => w.toLowerCase().includes("viscosity"))).toBe(true);
    });

    it("should handle corrosive fluid material recommendation", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_end_suction",
        flowRate: 50,
        totalHead: 40,
        operatingTemp: 60,
        fluidType: "sulfuric_acid",
        specificGravity: 1.84,
        isCorrosive: true,
        ph: 1,
        casingMaterial: "cast_iron",
        impellerMaterial: "cast_iron",
        quantityValue: 1,
      };

      const corrosiveResult: PumpCalculationResultDto = {
        ...mockPumpCalculationResult,
        warnings: [
          "Corrosive fluid with cast iron casing - upgrade to stainless steel or Hastelloy",
          "Low pH (1) requires chemical-resistant materials",
        ],
        recommendations: ["Use 316SS or Hastelloy wetted parts"],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(corrosiveResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.warnings.some((w) => w.toLowerCase().includes("corrosive"))).toBe(true);
    });

    it("should handle high temperature application", async () => {
      const dto: CreatePumpRfqDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_multistage",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 80,
        totalHead: 100,
        operatingTemp: 250,
        fluidType: "thermal_oil",
        specificGravity: 0.85,
        sealType: PumpSealType.MECHANICAL_DOUBLE,
        casingMaterial: "stainless_steel_316",
        impellerMaterial: "stainless_steel_316",
        quantityValue: 1,
      };

      const highTempResult: PumpCalculationResultDto = {
        ...mockPumpCalculationResult,
        warnings: [
          "High temperature (250°C) - verify material creep resistance",
          "Consider jacketed casing for thermal management",
          "Ensure seal flush plan API Plan 53 for hot service",
        ],
        recommendations: [],
      };

      mockRfqService.calculatePumpRequirements.mockResolvedValue(highTempResult);

      const result = await controller.calculatePumpRequirements(dto);

      expect(result.warnings.some((w) => w.toLowerCase().includes("temperature"))).toBe(true);
    });
  });
});
