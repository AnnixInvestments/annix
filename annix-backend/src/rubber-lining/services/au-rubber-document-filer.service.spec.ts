import { CompanyType } from "../entities/rubber-company.entity";
import { AuRubberDocumentFilerService } from "./au-rubber-document-filer.service";

describe("AuRubberDocumentFilerService", () => {
  describe("fileDeliveryNoteSlices", () => {
    const parentPath = "au-rubber/inbox/parent.pdf";

    // storageService.upload() always stores under a generated UUID filename;
    // this is the real key it returns, distinct from the human-readable
    // path the filer computes for the target directory.
    const uploadedKey = "au-rubber/suppliers/delivery-notes/IN177565/9f1c-uuid.pdf";

    const build = () => {
      const deliveryNoteRepository = {
        findManyByIds: jest.fn().mockResolvedValue([
          {
            id: 268,
            documentPath: parentPath,
            sourcePageNumbers: [1],
            supplierCompanyId: 9,
            deliveryNoteNumber: "IN177565",
          },
        ]),
        updateById: jest.fn().mockResolvedValue(undefined),
      };
      const companyRepository = {
        findByIds: jest.fn().mockResolvedValue([{ id: 9, companyType: CompanyType.SUPPLIER }]),
      };
      const storageService = {
        download: jest.fn().mockResolvedValue(Buffer.from("%PDF-source")),
        upload: jest.fn().mockResolvedValue({ path: uploadedKey }),
      };
      const pdfSlicerService = {
        slicePages: jest.fn().mockResolvedValue(Buffer.from("%PDF-slice")),
      };
      const pdfPageCacheService = { invalidate: jest.fn() };

      const cocExtractionService = { dispatchRollsForDeliveryNote: jest.fn() };
      const service = new AuRubberDocumentFilerService(
        storageService as never,
        pdfSlicerService as never,
        pdfPageCacheService as never,
        deliveryNoteRepository as never,
        companyRepository as never,
        cocExtractionService as never,
      );
      return { service, deliveryNoteRepository, storageService, pdfPageCacheService };
    };

    it("records the storage key returned by upload(), not the computed target path", async () => {
      const { service, deliveryNoteRepository } = build();

      await service.fileDeliveryNoteSlices({
        parentDocumentPath: parentPath,
        deliveryNoteIds: [268],
      });

      expect(deliveryNoteRepository.updateById).toHaveBeenCalledWith(268, {
        documentPath: uploadedKey,
        sourceDocumentPath: parentPath,
      });
      // Regression: the old code wrote the computed ".../IN177565.pdf" path,
      // which no object was ever stored at — surfacing as "File not found".
      expect(deliveryNoteRepository.updateById).not.toHaveBeenCalledWith(
        268,
        expect.objectContaining({
          documentPath: "au-rubber/suppliers/delivery-notes/IN177565/IN177565.pdf",
        }),
      );
    });

    it("invalidates the page cache for the real stored key", async () => {
      const { service, pdfPageCacheService } = build();

      await service.fileDeliveryNoteSlices({
        parentDocumentPath: parentPath,
        deliveryNoteIds: [268],
      });

      expect(pdfPageCacheService.invalidate).toHaveBeenCalledWith(uploadedKey);
    });
  });
});
