import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { type MineRecord, MineRegistryService } from "../mines/mine-registry.service";
import { ExtractionStatus, NixExtraction } from "./entities/nix-extraction.entity";
import { MineInferenceService } from "./mine-inference.service";

function fakeMine(partial: Partial<MineRecord> = {}): MineRecord {
  return {
    country: "South Africa",
    id: 1,
    mineName: "",
    operatingCompany: "",
    region: "Gauteng",
    district: null,
    nearestTown: null,
    physicalAddress: null,
    latitude: null,
    longitude: null,
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
  let mineRegistry: { allMines: jest.Mock };
  let extractionRepo: { createQueryBuilder: jest.Mock };
  let qbResult: NixExtraction | null;

  beforeEach(async () => {
    qbResult = null;
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(() => Promise.resolve(qbResult)),
    };
    extractionRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    mineRegistry = { allMines: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MineInferenceService,
        { provide: MineRegistryService, useValue: mineRegistry },
        {
          provide: getRepositoryToken(NixExtraction),
          useValue: extractionRepo,
        },
      ],
    }).compile();
    service = module.get<MineInferenceService>(MineInferenceService);
  });

  it("matches a mine when project name contains the mine name", async () => {
    mineRegistry.allMines.mockResolvedValue([
      fakeMine({ id: 7, mineName: "Sibanye Driefontein", operatingCompany: "Sibanye-Stillwater" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ project: "Sibanye Driefontein expansion project — Phase 2" }),
    );
    expect(result?.mineId).toBe(7);
    expect(result?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("matches on operating company when mine name doesn't appear", async () => {
    mineRegistry.allMines.mockResolvedValue([
      fakeMine({ id: 5, mineName: "Wonderkop", operatingCompany: "Anglo American Platinum" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ customer: "Anglo American Platinum (Pty) Ltd" }),
    );
    expect(result?.mineId).toBe(5);
    expect(result?.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("falls back to no mine when nothing matches with sufficient confidence", async () => {
    mineRegistry.allMines.mockResolvedValue([
      fakeMine({ id: 1, mineName: "Tharisa", operatingCompany: "Tharisa Minerals" }),
    ]);
    const result = await service.infer(
      fakeExtraction({ project: "Generic widget factory build", customer: "Acme Inc" }),
    );
    expect(result).toBeNull();
  });

  it("still returns the document number when no mine matches, so global lookup is preserved", async () => {
    mineRegistry.allMines.mockResolvedValue([
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
    mineRegistry.allMines.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(fakeExtraction({}));
    expect(result).toBeNull();
  });

  it("captures the document revision into the result", async () => {
    mineRegistry.allMines.mockResolvedValue([
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
    mineRegistry.allMines.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(
      fakeExtraction({ aiProvider: "gemini" }, "LHU-0000-EP-2701-012-00.pdf"),
    );
    expect(result?.documentNumber).toBe("LHU-0000-EP-2701-012-00");
  });

  it("captures revision from a 'Rev XX' filename pattern", async () => {
    mineRegistry.allMines.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(
      fakeExtraction({}, "2201-0000-EP-2203-0004 Rev AF - Piping Design Criteria.pdf"),
    );
    expect(result?.documentNumber).toBe("2201-0000-EP-2203-0004");
    expect(result?.documentRevision).toBe("AF");
  });

  it("metadata documentNumber wins over filename when both are present", async () => {
    mineRegistry.allMines.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(
      fakeExtraction({ documentNumber: "META-1234-001-00", revision: "B" }, "FILENAME-9999-99.pdf"),
    );
    expect(result?.documentNumber).toBe("META-1234-001-00");
    expect(result?.documentRevision).toBe("B");
  });

  it("ignores trivial filename hyphens that aren't real doc numbers", async () => {
    mineRegistry.allMines.mockResolvedValue([fakeMine({ id: 1, mineName: "Tharisa" })]);
    const result = await service.infer(fakeExtraction({}, "MPS Pipe-Detail.pdf"));
    expect(result).toBeNull();
  });

  describe("findExistingForMine", () => {
    it("returns null when documentNumber is empty", async () => {
      const result = await service.findExistingForMine(1, "");
      expect(result).toBeNull();
      expect(extractionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("returns null when no completed extraction matches", async () => {
      qbResult = null;
      const result = await service.findExistingForMine(1, "LHU-0000-EP-2701-012-00");
      expect(result).toBeNull();
    });

    it("returns the matching extraction when one is found", async () => {
      qbResult = {
        id: 99,
        documentRevision: "03",
        mineId: 7,
      } as unknown as NixExtraction;
      const result = await service.findExistingForMine(7, "LHU-0000-EP-2701-012-00");
      expect(result).toEqual({ extractionId: 99, revision: "03", mineId: 7 });
    });

    it("scopes the query to mineId when one is provided", async () => {
      qbResult = { id: 1, documentRevision: null, mineId: 5 } as unknown as NixExtraction;
      await service.findExistingForMine(5, "DOC-001");
      const qb = extractionRepo.createQueryBuilder.mock.results[0].value;
      const mineFilter = qb.andWhere.mock.calls.find((c: unknown[]) =>
        String(c[0]).includes("mineId"),
      );
      expect(mineFilter).toBeDefined();
    });

    it("does NOT scope to mine when mineId is null (global lookup)", async () => {
      qbResult = { id: 1, documentRevision: null, mineId: 5 } as unknown as NixExtraction;
      await service.findExistingForMine(null, "DOC-001");
      const qb = extractionRepo.createQueryBuilder.mock.results[0].value;
      const mineFilter = qb.andWhere.mock.calls.find((c: unknown[]) =>
        String(c[0]).includes("mineId"),
      );
      expect(mineFilter).toBeUndefined();
    });

    it("filters to completed extractions only", async () => {
      qbResult = null;
      await service.findExistingForMine(null, "DOC-001");
      const qb = extractionRepo.createQueryBuilder.mock.results[0].value;
      const statusCall = qb.andWhere.mock.calls.find(
        (c: unknown[]) =>
          (c[1] as { status?: ExtractionStatus })?.status === ExtractionStatus.COMPLETED,
      );
      expect(statusCall).toBeDefined();
    });
  });

  it("picks the highest-confidence match when multiple mines could match", async () => {
    mineRegistry.allMines.mockResolvedValue([
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
