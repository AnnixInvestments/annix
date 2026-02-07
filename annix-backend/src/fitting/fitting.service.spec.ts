import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BoltMass } from "../bolt-mass/entities/bolt-mass.entity";
import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { Sabs62FittingDimension } from "../sabs62-fitting-dimension/entities/sabs62-fitting-dimension.entity";
import { Sabs719FittingDimension } from "../sabs719-fitting-dimension/entities/sabs719-fitting-dimension.entity";
import { SteelSpecification } from "../steel-specification/entities/steel-specification.entity";
import { FittingService } from "./fitting.service";

describe("FittingService", () => {
  let service: FittingService;

  const mockSabs62Repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSabs719Repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPipeDimensionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNbNpsLookupRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockFlangeDimensionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBoltMassRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNutMassRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSteelSpecRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FittingService,
        {
          provide: getRepositoryToken(Sabs62FittingDimension),
          useValue: mockSabs62Repository,
        },
        {
          provide: getRepositoryToken(Sabs719FittingDimension),
          useValue: mockSabs719Repository,
        },
        {
          provide: getRepositoryToken(PipeDimension),
          useValue: mockPipeDimensionRepository,
        },
        {
          provide: getRepositoryToken(NbNpsLookup),
          useValue: mockNbNpsLookupRepository,
        },
        {
          provide: getRepositoryToken(FlangeDimension),
          useValue: mockFlangeDimensionRepository,
        },
        {
          provide: getRepositoryToken(BoltMass),
          useValue: mockBoltMassRepository,
        },
        {
          provide: getRepositoryToken(NutMass),
          useValue: mockNutMassRepository,
        },
        {
          provide: getRepositoryToken(SteelSpecification),
          useValue: mockSteelSpecRepository,
        },
      ],
    }).compile();

    service = module.get<FittingService>(FittingService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
