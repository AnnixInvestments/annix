import { describe, expect, it } from "vitest";
import { heuristicAttachmentType } from "./classifyAttachment";

describe("heuristicAttachmentType", () => {
  it("classifies an ITP as a QC document", () => {
    const result = heuristicAttachmentType("ITP-Project-X.pdf");
    expect(result.type).toBe("qc_document");
    expect(result.ambiguous).toBe(false);
  });

  it("classifies an inspection test plan as a QC document", () => {
    const result = heuristicAttachmentType("Inspection Test Plan.pdf");
    expect(result.type).toBe("qc_document");
    expect(result.ambiguous).toBe(false);
  });

  it("classifies a data book as a QC document", () => {
    expect(heuristicAttachmentType("Data Book Rev0.pdf").type).toBe("qc_document");
  });

  it("classifies a mill cert phrase as a QC document", () => {
    expect(heuristicAttachmentType("Mill Cert Batch 5.pdf").type).toBe("qc_document");
  });

  it("classifies a datasheet as a QC document", () => {
    expect(heuristicAttachmentType("pump-datasheet.pdf").type).toBe("qc_document");
  });

  it("classifies a GA drawing as a drawing", () => {
    const result = heuristicAttachmentType("GA-Tank-Assembly.pdf");
    expect(result.type).toBe("drawing");
    expect(result.ambiguous).toBe(false);
  });

  it("classifies a revision drawing as a drawing", () => {
    expect(heuristicAttachmentType("Cyclone-Underflow-Rev-C.dwg").type).toBe("drawing");
  });

  it("classifies a .dxf file as a drawing", () => {
    expect(heuristicAttachmentType("part-outline.dxf").type).toBe("drawing");
  });

  it("classifies a CD drawing number as a drawing", () => {
    expect(heuristicAttachmentType("CD1234.pdf").type).toBe("drawing");
  });

  it("classifies an alphanumeric drawing number as a drawing", () => {
    expect(heuristicAttachmentType("ABC123.pdf").type).toBe("drawing");
  });

  it("defaults to drawing and flags ambiguity for unrecognised names", () => {
    const result = heuristicAttachmentType("scan.pdf");
    expect(result.type).toBe("drawing");
    expect(result.ambiguous).toBe(true);
  });

  it("flags conflicting drawing + QC tokens as ambiguous, defaulting to drawing", () => {
    const result = heuristicAttachmentType("ITP-Drawing-Rev.pdf");
    expect(result.type).toBe("drawing");
    expect(result.ambiguous).toBe(true);
  });
});
