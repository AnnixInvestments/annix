import { Test, TestingModule } from "@nestjs/testing";
import { NbNpsLookupRepository } from "../nb-nps-lookup/nb-nps-lookup.repository";
import { BendDimensionController } from "./bend-dimension.controller";
import { BendDimensionService } from "./bend-dimension.service";

describe("BendDimensionController", () => {
  let controller: BendDimensionController;
  let service: BendDimensionService;

  const mockLookupRepo = {
    findOneWhere: jest.fn(),
  };

  const mockBendDimensionService = {
    calculate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BendDimensionController],
      providers: [
        { provide: BendDimensionService, useValue: mockBendDimensionService },
        { provide: NbNpsLookupRepository, useValue: mockLookupRepo },
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
