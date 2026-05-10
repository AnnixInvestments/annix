// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { detectProjectTypeFromEmail, isExcelFile } from "./helpers";

describe("detectProjectTypeFromEmail", () => {
  it("returns 'standard' when both subject and body are empty", () => {
    expect(detectProjectTypeFromEmail("", "")).toBe("standard");
  });

  it("returns 'standard' when both subject and body are null", () => {
    expect(detectProjectTypeFromEmail(null, null)).toBe("standard");
  });

  it("returns 'phase1' when subject mentions 'Phase I'", () => {
    expect(detectProjectTypeFromEmail("Phase I tender for South Mine", null)).toBe("phase1");
  });

  it("returns 'phase1' when subject mentions 'Phase 1'", () => {
    expect(detectProjectTypeFromEmail("Phase 1 study", null)).toBe("phase1");
  });

  it("returns 'phase1' (case-insensitive)", () => {
    expect(detectProjectTypeFromEmail("PHASE I", null)).toBe("phase1");
  });

  it("returns 'phase1' when phrase appears in body", () => {
    expect(detectProjectTypeFromEmail("RFQ", "Please quote for the Phase I study.")).toBe("phase1");
  });

  it("returns 'retender' for 'Re-tender'", () => {
    expect(detectProjectTypeFromEmail("Re-tender for South Mine", null)).toBe("retender");
  });

  it("returns 'retender' for 'Retender' (no hyphen)", () => {
    expect(detectProjectTypeFromEmail("Retender notice", null)).toBe("retender");
  });

  it("returns 'retender' for 'Re tender' (with space)", () => {
    expect(detectProjectTypeFromEmail("Re tender", null)).toBe("retender");
  });

  it("returns 'feasibility'", () => {
    expect(detectProjectTypeFromEmail("Feasibility study", null)).toBe("feasibility");
  });

  it("returns 'standard' for plain RFQ subject", () => {
    expect(detectProjectTypeFromEmail("RFQ for piping", "Please quote.")).toBe("standard");
  });

  it("returns 'standard' for quote request", () => {
    expect(detectProjectTypeFromEmail("Quote request", "Need a quote.")).toBe("standard");
  });

  it("phase1 wins over retender when both appear", () => {
    expect(detectProjectTypeFromEmail("Phase I re-tender", null)).toBe("phase1");
  });

  it("retender wins over feasibility when both appear", () => {
    expect(detectProjectTypeFromEmail("Re-tender feasibility", null)).toBe("retender");
  });

  it("does not match 'Phasing' (avoids partial word matches)", () => {
    expect(detectProjectTypeFromEmail("Project phasing notes", null)).toBe("standard");
  });

  it("does not match 'tender' alone (only re-tender)", () => {
    expect(detectProjectTypeFromEmail("Tender notice", null)).toBe("standard");
  });
});

describe("isExcelFile", () => {
  const mockFile = (name: string, type = ""): File => new File([new Blob()], name, { type });

  it("matches .xlsx extension", () => {
    expect(isExcelFile(mockFile("boq.xlsx"))).toBe(true);
  });

  it("matches .xls extension (legacy)", () => {
    expect(isExcelFile(mockFile("boq.xls"))).toBe(true);
  });

  it("matches by MIME type containing 'spreadsheet'", () => {
    expect(
      isExcelFile(
        mockFile(
          "renamed.bin",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
      ),
    ).toBe(true);
  });

  it("matches by MIME type containing 'excel'", () => {
    expect(isExcelFile(mockFile("renamed.bin", "application/vnd.ms-excel"))).toBe(true);
  });

  it("rejects PDF by extension and type", () => {
    expect(isExcelFile(mockFile("drawing.pdf", "application/pdf"))).toBe(false);
  });

  it("rejects CSV", () => {
    expect(isExcelFile(mockFile("data.csv", "text/csv"))).toBe(false);
  });

  it("rejects file with no extension and unrelated MIME", () => {
    expect(isExcelFile(mockFile("data", "application/octet-stream"))).toBe(false);
  });

  it("matches .XLSX (case-insensitive extension)", () => {
    expect(isExcelFile(mockFile("BOQ.XLSX"))).toBe(true);
  });
});
