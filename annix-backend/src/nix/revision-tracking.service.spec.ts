import { Test, TestingModule } from "@nestjs/testing";
import { ExtractionStatus, NixExtraction } from "./entities/nix-extraction.entity";
import { NixExtractionRepository } from "./nix-extraction.repository";
import { RevisionTrackingService } from "./revision-tracking.service";

function fakeExtraction(partial: Partial<NixExtraction> = {}): NixExtraction {
  return {
    id: 1,
    documentName: "doc.pdf",
    isLatestRevision: true,
    status: ExtractionStatus.COMPLETED,
    ...partial,
  } as NixExtraction;
}

describe("RevisionTrackingService", () => {
  let service: RevisionTrackingService;
  let extractionRepo: {
    findRevisionCandidates: jest.Mock;
    markSuperseded: jest.Mock;
  };

  beforeEach(async () => {
    extractionRepo = {
      findRevisionCandidates: jest.fn().mockResolvedValue([]),
      markSuperseded: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevisionTrackingService,
        { provide: NixExtractionRepository, useValue: extractionRepo },
      ],
    }).compile();
    service = module.get(RevisionTrackingService);
  });

  describe("compareRevisions", () => {
    it("returns 'same' for identical revisions", () => {
      expect(service.compareRevisions("03", "03")).toBe("same");
      expect(service.compareRevisions("AF", "AF")).toBe("same");
      expect(service.compareRevisions("Rev A", "rev a")).toBe("same");
    });

    it("orders numeric revisions numerically", () => {
      expect(service.compareRevisions("03", "02")).toBe("newer");
      expect(service.compareRevisions("02", "03")).toBe("older");
      expect(service.compareRevisions("10", "9")).toBe("newer");
    });

    it("orders alpha revisions length-then-lex", () => {
      expect(service.compareRevisions("B", "A")).toBe("newer");
      expect(service.compareRevisions("AF", "B")).toBe("newer");
      expect(service.compareRevisions("AA", "Z")).toBe("newer");
      expect(service.compareRevisions("A", "B")).toBe("older");
    });

    it("strips 'Rev' / 'Revision' prefix when normalising", () => {
      expect(service.compareRevisions("Rev 03", "Revision 02")).toBe("newer");
      expect(service.compareRevisions("rev. AF", "AB")).toBe("newer");
    });

    it("returns 'unknown' when one is numeric and the other alpha", () => {
      expect(service.compareRevisions("03", "AD")).toBe("unknown");
      expect(service.compareRevisions("AD", "03")).toBe("unknown");
    });

    it("treats empty as older than any non-empty", () => {
      expect(service.compareRevisions(null, "01")).toBe("older");
      expect(service.compareRevisions("01", null)).toBe("newer");
      expect(service.compareRevisions("", "")).toBe("same");
    });
  });

  describe("processIncomingExtraction", () => {
    it("returns 'first' when no other extraction has the same documentNumber", async () => {
      extractionRepo.findRevisionCandidates.mockResolvedValue([]);
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "01" }),
      );
      expect(verdict).toEqual({ action: "first" });
      expect(extractionRepo.markSuperseded).not.toHaveBeenCalled();
    });

    it("returns 'first' when documentNumber is missing", async () => {
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: undefined }),
      );
      expect(verdict).toEqual({ action: "first" });
      expect(extractionRepo.findRevisionCandidates).not.toHaveBeenCalled();
    });

    it("returns 'same' when an existing canonical has the same revision", async () => {
      extractionRepo.findRevisionCandidates.mockResolvedValue([
        fakeExtraction({ id: 1, documentNumber: "DOC-001", documentRevision: "03" }),
      ]);
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "03" }),
      );
      expect(verdict).toMatchObject({
        action: "same",
        canonicalExtractionId: 1,
        canonicalRevision: "03",
      });
      expect(extractionRepo.markSuperseded).not.toHaveBeenCalled();
    });

    it("supersedes the older canonical when a newer revision arrives", async () => {
      extractionRepo.findRevisionCandidates.mockResolvedValue([
        fakeExtraction({ id: 1, documentNumber: "DOC-001", documentRevision: "02" }),
      ]);
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "03" }),
      );
      expect(verdict).toMatchObject({
        action: "newer",
        previousCanonicalExtractionId: 1,
        previousCanonicalRevision: "02",
      });
      expect(extractionRepo.markSuperseded).toHaveBeenCalledWith(1, false, 5);
    });

    it("flags incoming as not-latest when an older revision is uploaded", async () => {
      extractionRepo.findRevisionCandidates.mockResolvedValue([
        fakeExtraction({ id: 1, documentNumber: "DOC-001", documentRevision: "04" }),
      ]);
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "02" }),
      );
      expect(verdict).toMatchObject({
        action: "older",
        latestExtractionId: 1,
        latestRevision: "04",
      });
      expect(extractionRepo.markSuperseded).toHaveBeenCalledWith(5, false, 1);
    });

    it("returns 'unknown' (and flags incoming as not-latest) when revs can't be ordered", async () => {
      extractionRepo.findRevisionCandidates.mockResolvedValue([
        fakeExtraction({ id: 1, documentNumber: "DOC-001", documentRevision: "AD" }),
      ]);
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "03" }),
      );
      expect(verdict).toMatchObject({
        action: "unknown",
        otherExtractionId: 1,
        otherRevision: "AD",
      });
      expect(extractionRepo.markSuperseded).toHaveBeenCalledWith(5, false, null);
    });

    it("ignores the incoming extraction's own row when it appears in the canonical lookup", async () => {
      extractionRepo.findRevisionCandidates.mockResolvedValue([
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "03" }),
      ]);
      const verdict = await service.processIncomingExtraction(
        fakeExtraction({ id: 5, documentNumber: "DOC-001", documentRevision: "03" }),
      );
      expect(verdict).toEqual({ action: "first" });
    });
  });
});
