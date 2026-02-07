import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NbNpsLookup } from "../nb-nps-lookup/entities/nb-nps-lookup.entity";
import { BendDimensionController } from "./bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension.service";

describe("BendDimensionController", () => {
  let controller: BendDimensionController;
  let service: BendDimensionService;

  const mockLookupRepo = {
    findOne: jest.fn(),
  };

  const mockBendDimensionService = {
    calculate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BendDimensionController],
      providers: [
        { provide: BendDimensionService, useValue: mockBendDimensionService },
        { provide: getRepositoryToken(NbNpsLookup), useValue: mockLookupRepo },
      ],
    }).compile();

    controller = module.get<BendDimensionController>(BendDimensionController);
    service = module.get<BendDimensionService>(BendDimensionService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
