import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MineType, OperationalStatus, SaMine } from "../mines/entities/sa-mine.entity";
import type { NixExtraction } from "./entities/nix-extraction.entity";
import { MineInferenceService } from "./mine-inference.service";

function fakeMine(partial: Partial<SaMine> = {}): SaMine {
  return {
    id: 1,
    mineName: "",
    operatingCompany: "",
    commodity: undefined as unknown as SaMine["commodity"],
    commodityId: 0,
    province: "Gauteng",
    district: null,
    physicalAddress: null,
    mineType: MineType.UNDERGROUND,
    operationalStatus: OperationalStatus.ACTIVE,
    latitude: null,
    longitude: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

function fakeExtraction(
  metadata: Record<string, unknown>,
  documentName = "test.pdf",
): NixExtraction {
  return {
    id: 42,
    documentName,
    extractedData: { metadata },
  } as unknown as NixExtraction;
}

describe("MineInferenceService", () => {
  let service: MineInferenceService;
  let mineRepo: jest.Mocked<Repository<SaMine>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MineInferenceService,
        {
          provide: getRepositoryToken(SaMine),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<MineInferenceService>(MineInferenceService);
    mineRepo = module.get(getRepositoryToken(SaMine));
  });

  it("matches a mine when project name contains the mine name", async () => {
    mineRepo.find.mockResolvedValue([
      fakeMine({ id: 7, mineName: "Sibanye Driefontein", operatingCompany: "Sibanye-Stillwater" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ project: "Sibanye Driefontein expansion project — Phase 2" }),
    );
    expect(result?.mineId).toBe(7);
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("matches on operating company when mine name doesn't appear", async () => {
    mineRepo.find.mockResolvedValue([
      fakeMine({ id: 5, mineName: "Wonderkop", operatingCompany: "Anglo American Platinum" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ customer: "Anglo American Platinum (Pty) Ltd" }),
    );
    expect(result?.mineId).toBe(5);
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("falls back to no mine when nothing matches with sufficient confidence", async () => {
    mineRepo.find.mockResolvedValue([
      fakeMine({ id: 1, mineName: "Tharisa", operatingCompany: "Tharisa Minerals" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ project: "Generic widget factory build", customer: "Acme Inc" }),
    );
    expect(result).toBeNull();
  });

  it("still returns the document number when no mine matches, so global lookup is preserved", async () => {
    mineRepo.find.mockResolvedValue([
      fakeMine({ id: 1, mineName: "Tharisa", operatingCompany: "Tharisa Minerals" }),
    ]);
    const result = await service.infer(
      fakeExtraction({
        project: "Unknown new client",
        documentNumber: "ABC-1234-001-00",
        revision: "B",
      }),
    );
    expect(result?.mineId).toBe(0);
    expect(result?.confidence).toBe(0);
    expect(result?.documentNumber).toBe("ABC-1234-001-00");
    expect(result?.documentRevision).toBe("B");
  });

  it("returns null when neither metadata nor doc number is available", async () => {
    mineRepo.find.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(fakeExtraction({}));
    expect(result).toBeNull();
  });

  it("captures the document revision into the result", async () => {
    mineRepo.find.mockResolvedValue([
      fakeMine({ id: 8, mineName: "Mogalakwena", operatingCompany: "Anglo American Platinum" }),
    ]);
    const result = await service.infer(
      fakeExtraction({
        project: "Mogalakwena Expansion",
        documentNumber: "MOG-2025-PIPING-001",
        revision: "Rev C",
      }),
    );
    expect(result?.mineId).toBe(8);
    expect(result?.documentRevision).toBe("Rev C");
  });

  it("falls back to the filename for documentNumber when metadata is empty", async () => {
    mineRepo.find.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(
      fakeExtraction({ aiProvider: "gemini" }, "LHU-0000-EP-2701-012-00.pdf"),
    );
    expect(result?.documentNumber).toBe("LHU-0000-EP-2701-012-00");
  });

  it("captures revision from a 'Rev XX' filename pattern", async () => {
    mineRepo.find.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(
      fakeExtraction({}, "2201-0000-EP-2203-0004 Rev AF - Piping Design Criteria.pdf"),
    );
    expect(result?.documentNumber).toBe("2201-0000-EP-2203-0004");
    expect(result?.documentRevision).toBe("AF");
  });

  it("metadata documentNumber wins over filename when both are present", async () => {
    mineRepo.find.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(
      fakeExtraction({ documentNumber: "META-1234-001-00", revision: "B" }, "FILENAME-9999-99.pdf"),
    );
    expect(result?.documentNumber).toBe("META-1234-001-00");
    expect(result?.documentRevision).toBe("B");
  });

  it("ignores trivial filename hyphens that aren't real doc numbers", async () => {
    mineRepo.find.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(fakeExtraction({}, "MPS Pipe-Detail.pdf"));
    expect(result).toBeNull();
  });

  it("picks the highest-confidence match when multiple mines could match", async () => {
    mineRepo.find.mockResolvedValue([
      fakeMine({ id: 11, mineName: "Sibanye", operatingCompany: "Sibanye-Stillwater" }),
      fakeMine({ id: 12, mineName: "Sibanye Driefontein", operatingCompany: "Sibanye-Stillwater" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ project: "Sibanye Driefontein piping expansion" }),
    );
    // Both contain 'Sibanye' but the more specific mine name wins.
    expect(result?.mineId).toBe(12);
  });
});
