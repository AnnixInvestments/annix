import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import { CustomerAuthGuard } from "../src/customer/guards/customer-auth.guard";
import { now } from "../src/lib/datetime";
import {
  PumpCategory,
  PumpMotorType,
  PumpRfq,
  PumpSealType,
  PumpServiceType,
} from "../src/rfq/entities/pump-rfq.entity";
import { Rfq, RfqStatus } from "../src/rfq/entities/rfq.entity";
import { RfqItem, RfqItemType } from "../src/rfq/entities/rfq-item.entity";
import { RfqModule } from "../src/rfq/rfq.module";

describe("RfqController - Pump RFQ Endpoints (e2e)", () => {
  let app: INestApplication;

  const mockPumpRfq: Partial<PumpRfq> = {
    id: 1,
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
    markupPercentage: 15,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const mockRfq: Partial<Rfq> = {
    id: 1,
    rfqNumber: "RFQ-2026-0001",
    projectName: "Water Transfer Pump Station",
    description: "New centrifugal pump for water supply system",
    customerName: "Municipal Water Services",
    customerEmail: "procurement@municipal-water.co.za",
    status: RfqStatus.DRAFT,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
    items: [],
  };

  const mockRfqItem: Partial<RfqItem> = {
    id: 1,
    lineNumber: 1,
    itemType: RfqItemType.PUMP,
    description: "Centrifugal End Suction Pump - 100 m³/h @ 50m TDH",
    quantity: 2,
    totalWeightKg: 170,
    notes: "Outdoor installation",
    pumpDetails: mockPumpRfq as PumpRfq,
  };

  const mockPumpCalculation = {
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

  const mockRfqQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(mockRfq),
    getMany: jest.fn().mockResolvedValue([mockRfq]),
  };

  const mockRfqRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockRfq, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockRfq, ...entity })),
    find: jest.fn().mockResolvedValue([mockRfq]),
    findOne: jest.fn().mockResolvedValue(mockRfq),
    createQueryBuilder: jest.fn().mockReturnValue(mockRfqQueryBuilder),
    count: jest.fn().mockResolvedValue(1),
    query: jest.fn().mockResolvedValue([{ year: 2026, count: 42 }]),
  };

  const mockRfqItemRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockRfqItem, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockRfqItem, ...entity })),
    findOne: jest.fn().mockResolvedValue(mockRfqItem),
    find: jest.fn().mockResolvedValue([mockRfqItem]),
  };

  const mockPumpRfqRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...mockPumpRfq, ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockPumpRfq, ...entity })),
    findOne: jest.fn().mockResolvedValue(mockPumpRfq),
  };

  const mockCustomerAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RfqModule],
    })
      .overrideProvider(getRepositoryToken(Rfq))
      .useValue(mockRfqRepository)
      .overrideProvider(getRepositoryToken(RfqItem))
      .useValue(mockRfqItemRepository)
      .overrideProvider(getRepositoryToken(PumpRfq))
      .useValue(mockPumpRfqRepository)
      .overrideGuard(CustomerAuthGuard)
      .useValue(mockCustomerAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /rfq/pump/calculate", () => {
    it("should calculate pump requirements for centrifugal pump", async () => {
      const calculateDto = {
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
        quantityValue: 2,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(calculateDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.hydraulicPowerKw).toBeDefined();
      expect(response.body.estimatedMotorPowerKw).toBeDefined();
      expect(response.body.specificSpeed).toBeDefined();
    });

    it("should calculate requirements for high flow rate pump", async () => {
      const highFlowDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(highFlowDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.estimatedMotorPowerKw).toBeGreaterThan(100);
    });

    it("should calculate requirements for slurry pump", async () => {
      const slurryDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(slurryDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.recommendedPumpType).toBeDefined();
    });

    it("should calculate requirements for spare parts request", async () => {
      const sparePartsDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(sparePartsDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should calculate requirements for rental pump", async () => {
      const rentalDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(rentalDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should return 400 for missing required fields", async () => {
      const invalidDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_end_suction",
      };

      await request(app.getHttpServer()).post("/rfq/pump/calculate").send(invalidDto).expect(400);
    });
  });

  describe("POST /rfq/pump", () => {
    it("should create a new pump RFQ", async () => {
      const createDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump")
        .send(createDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.rfq).toBeDefined();
      expect(response.body.calculation).toBeDefined();
    });

    it("should create a spare parts RFQ", async () => {
      const sparePartsDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump")
        .send(sparePartsDto)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.rfq).toBeDefined();
    });

    it("should create a repair service RFQ", async () => {
      const repairDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump")
        .send(repairDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should create a rental pump RFQ", async () => {
      const rentalDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump")
        .send(rentalDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should return 400 for invalid RFQ data", async () => {
      const invalidDto = {
        rfq: {
          projectName: "Test",
        },
        pump: {},
      };

      await request(app.getHttpServer()).post("/rfq/pump").send(invalidDto).expect(400);
    });
  });

  describe("Pump calculation edge cases", () => {
    it("should handle low NPSH available warning", async () => {
      const lowNpshDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(lowNpshDto)
        .expect(201);

      expect(response.body).toBeDefined();
      if (response.body.npshRequired > 2) {
        expect(response.body.warnings.length).toBeGreaterThan(0);
      }
    });

    it("should handle high viscosity fluid", async () => {
      const viscousDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(viscousDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should handle corrosive fluid with material warning", async () => {
      const corrosiveDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(corrosiveDto)
        .expect(201);

      expect(response.body).toBeDefined();
      if (response.body.warnings) {
        expect(
          response.body.warnings.some(
            (w: string) => w.toLowerCase().includes("corrosive") || w.toLowerCase().includes("ph"),
          ),
        ).toBe(true);
      }
    });

    it("should handle high temperature application", async () => {
      const highTempDto = {
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

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(highTempDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should handle abrasive slurry application", async () => {
      const abrasiveDto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "slurry",
        pumpCategory: PumpCategory.SPECIALTY,
        flowRate: 300,
        totalHead: 60,
        operatingTemp: 35,
        fluidType: "mining_tailings",
        specificGravity: 1.6,
        solidsContent: 40,
        solidsSize: 25,
        isAbrasive: true,
        casingMaterial: "high_chrome",
        impellerMaterial: "high_chrome",
        quantityValue: 1,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(abrasiveDto)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe("Pump motor and electrical specifications", () => {
    it("should handle different voltage configurations", async () => {
      const dto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_end_suction",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 100,
        totalHead: 50,
        fluidType: "water",
        specificGravity: 1.0,
        casingMaterial: "cast_iron",
        impellerMaterial: "bronze",
        motorType: PumpMotorType.ELECTRIC_VFD,
        voltage: "525V",
        frequency: "50Hz",
        quantityValue: 1,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should handle diesel motor type", async () => {
      const dto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "centrifugal_end_suction",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 200,
        totalHead: 80,
        fluidType: "water",
        specificGravity: 1.0,
        casingMaterial: "cast_iron",
        impellerMaterial: "bronze",
        motorType: PumpMotorType.DIESEL,
        quantityValue: 1,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe("Seal type specifications", () => {
    it("should handle magnetic drive (sealless) pump", async () => {
      const dto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "chemical_process",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 30,
        totalHead: 40,
        fluidType: "hazardous_chemical",
        specificGravity: 1.2,
        isCorrosive: true,
        casingMaterial: "hastelloy",
        impellerMaterial: "hastelloy",
        sealType: PumpSealType.MAGNETIC_DRIVE,
        quantityValue: 1,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });

    it("should handle double mechanical seal with API plan", async () => {
      const dto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "process",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 150,
        totalHead: 100,
        fluidType: "hydrocarbon",
        specificGravity: 0.85,
        operatingTemp: 180,
        casingMaterial: "stainless_steel_316",
        impellerMaterial: "stainless_steel_316",
        sealType: PumpSealType.MECHANICAL_DOUBLE,
        sealPlan: "Plan 53A",
        quantityValue: 1,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });

  describe("Hazardous area classifications", () => {
    it("should handle ATEX zone requirements", async () => {
      const dto = {
        serviceType: PumpServiceType.NEW_PUMP,
        pumpType: "process",
        pumpCategory: PumpCategory.CENTRIFUGAL,
        flowRate: 100,
        totalHead: 60,
        fluidType: "gasoline",
        specificGravity: 0.75,
        hazardousArea: "ATEX Zone 1",
        motorType: PumpMotorType.ELECTRIC_AC,
        motorEfficiency: "IE3",
        enclosure: "Ex d IIB T4",
        certifications: ["ATEX", "IECEx"],
        casingMaterial: "stainless_steel_316",
        impellerMaterial: "stainless_steel_316",
        sealType: PumpSealType.MECHANICAL_DOUBLE,
        quantityValue: 1,
      };

      const response = await request(app.getHttpServer())
        .post("/rfq/pump/calculate")
        .send(dto)
        .expect(201);

      expect(response.body).toBeDefined();
    });
  });
});
