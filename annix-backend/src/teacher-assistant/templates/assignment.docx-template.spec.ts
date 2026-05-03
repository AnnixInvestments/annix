import { skyInvestigatorFixture } from "@annix/product-data/teacher-assistant";
import { renderAssignmentDocx } from "./assignment.docx-template";

const DOCX_MAGIC_PREFIX = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

describe("renderAssignmentDocx", () => {
  it("returns a non-empty Buffer that begins with the DOCX (zip) magic bytes", async () => {
    const buffer = await renderAssignmentDocx(skyInvestigatorFixture);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(2_000);
    expect(buffer.subarray(0, 4)).toEqual(DOCX_MAGIC_PREFIX);
  });

  it("does not throw on assignments with empty optional sections", async () => {
    const trimmed = {
      ...skyInvestigatorFixture,
      partialExemplars: [],
      optionalWorkbookPages: [],
      learningObjective: "",
    };
    await expect(renderAssignmentDocx(trimmed)).resolves.toBeInstanceOf(Buffer);
  });
});
