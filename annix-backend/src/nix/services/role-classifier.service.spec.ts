import { DocumentRole } from "../entities/nix-extraction.entity";
import { classifyRoleByFilename, RoleClassifierService } from "./role-classifier.service";

describe("role-classifier (issue #266 Phase 1)", () => {
  describe("classifyRoleByFilename", () => {
    it("classifies CAD extensions as drawings", () => {
      expect(classifyRoleByFilename("GPW-1042 rev B.dwg")?.role).toBe(DocumentRole.DRAWING);
      expect(classifyRoleByFilename("plan.dxf")?.role).toBe(DocumentRole.DRAWING);
    });

    it("classifies spreadsheets as the drawing (BOQ) pass", () => {
      expect(classifyRoleByFilename("Tender BOQ final.xlsx")?.role).toBe(DocumentRole.DRAWING);
      expect(classifyRoleByFilename("schedule.csv")?.role).toBe(DocumentRole.DRAWING);
    });

    it("classifies drawing keywords", () => {
      expect(classifyRoleByFilename("EP-3106-003 isometric sheet 2.pdf")?.role).toBe(
        DocumentRole.DRAWING,
      );
      expect(classifyRoleByFilename("general_arrangement_rev0.pdf")?.role).toBe(
        DocumentRole.DRAWING,
      );
    });

    it("classifies specification keywords", () => {
      expect(classifyRoleByFilename("LHU-0000-EP-2701-012-00 painting spec.pdf")?.role).toBe(
        DocumentRole.SPECIFICATION,
      );
      expect(classifyRoleByFilename("rubber-lining-specification.pdf")?.role).toBe(
        DocumentRole.SPECIFICATION,
      );
      expect(classifyRoleByFilename("WPS-001 welding procedure.pdf")?.role).toBe(
        DocumentRole.SPECIFICATION,
      );
    });

    it("returns null when both or neither keyword family matches", () => {
      expect(classifyRoleByFilename("LHU-0000-EP-2701-012-00.pdf")).toBeNull();
      expect(classifyRoleByFilename("drawing painting spec.pdf")).toBeNull();
      expect(classifyRoleByFilename("TSF report.docx")).toBeNull();
    });
  });

  describe("RoleClassifierService", () => {
    const chatMock = { chatWithImage: jest.fn() };
    const service = new RoleClassifierService(chatMock as never);

    beforeEach(() => chatMock.chatWithImage.mockReset());

    it("filename-only fallback is low-confidence other", () => {
      const result = service.classifyByFilename("scan001.pdf");
      expect(result.role).toBe(DocumentRole.OTHER);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.source).toBe("fallback");
    });

    it("uses the AI glance for ambiguous PDFs", async () => {
      chatMock.chatWithImage.mockResolvedValue({
        content: "specification",
        providerUsed: "gemini",
      });
      const result = await service.classify({
        originalname: "scan001.pdf",
        buffer: Buffer.from("pdf"),
        mimetype: "application/pdf",
      });
      expect(result.role).toBe(DocumentRole.SPECIFICATION);
      expect(result.source).toBe("ai");
    });

    it("skips the AI glance when the filename already decides", async () => {
      const result = await service.classify({
        originalname: "painting spec.pdf",
        buffer: Buffer.from("pdf"),
        mimetype: "application/pdf",
      });
      expect(result.source).toBe("filename");
      expect(chatMock.chatWithImage).not.toHaveBeenCalled();
    });

    it("falls back gracefully when the AI glance fails", async () => {
      chatMock.chatWithImage.mockRejectedValue(new Error("quota"));
      const result = await service.classify({
        originalname: "scan001.pdf",
        buffer: Buffer.from("pdf"),
        mimetype: "application/pdf",
      });
      expect(result.role).toBe(DocumentRole.OTHER);
      expect(result.source).toBe("fallback");
    });

    it("does not send non-PDFs to the AI glance", async () => {
      const result = await service.classify({
        originalname: "notes.docx",
        buffer: Buffer.from("doc"),
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      expect(result.source).toBe("fallback");
      expect(chatMock.chatWithImage).not.toHaveBeenCalled();
    });
  });
});
