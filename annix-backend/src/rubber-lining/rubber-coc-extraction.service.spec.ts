import { Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import { ExtractedCustomerDeliveryNoteData } from "./entities/rubber-delivery-note.entity";
import { RubberCocExtractionService } from "./rubber-coc-extraction.service";

const buildPdf = async (pageSizes: Array<[number, number]>): Promise<Buffer> => {
  const doc = await PDFDocument.create();
  pageSizes.forEach(([width, height]) => doc.addPage([width, height]));
  return Buffer.from(await doc.save());
};

const A4: [number, number] = [595, 842];

describe("RubberCocExtractionService — OCR raster guards", () => {
  const service = new RubberCocExtractionService({} as never, {} as never);
  const safePages = (buffer: Buffer, maxPages: number): Promise<number[]> =>
    (
      service as never as { safeRasterPageNumbers(b: Buffer, m: number): Promise<number[]> }
    ).safeRasterPageNumbers(buffer, maxPages);

  it("rasterises every page of a normal A4 document", async () => {
    const pdf = await buildPdf([A4, A4, A4]);
    expect(await safePages(pdf, 50)).toEqual([1, 2, 3]);
  });

  it("caps the high-resolution path to HIGH_RES_OCR_MAX_PAGES", async () => {
    const pdf = await buildPdf(Array.from({ length: 25 }, () => A4));
    const pages = await safePages(pdf, 50);
    expect(pages).toHaveLength(20);
    expect(pages[0]).toBe(1);
    expect(pages[19]).toBe(20);
  });

  it("drops a page whose rasterised pixel area exceeds the per-page budget", async () => {
    const pdf = await buildPdf([A4, [14400, 14400], A4]);
    expect(await safePages(pdf, 50)).toEqual([1, 3]);
  });

  it("throws when no page fits the pixel budget (e.g. a huge-MediaBox bomb)", async () => {
    const pdf = await buildPdf([[14400, 14400]]);
    await expect(safePages(pdf, 50)).rejects.toThrow(/too large to rasterise/i);
  });

  it("stops admitting pages once the aggregate pixel budget is reached", async () => {
    // Each ~16MP page at 1.5x is under the per-page budget, but three exceed the
    // aggregate budget, so only the first two are admitted.
    const bigPage: [number, number] = [2666, 2666];
    const pdf = await buildPdf([bigPage, bigPage, bigPage]);
    expect(await safePages(pdf, 50)).toEqual([1, 2]);
  });
});

describe("RubberCocExtractionService — customer roll-number plausibility", () => {
  const service = new RubberCocExtractionService({} as never, {} as never);
  const warn = (notes: ExtractedCustomerDeliveryNoteData[]): void =>
    (
      service as never as {
        warnOnSuspiciousCustomerRollNumbers(n: ExtractedCustomerDeliveryNoteData[]): void;
      }
    ).warnOnSuspiciousCustomerRollNumbers(notes);

  const note = (rollNumbers: string[]): ExtractedCustomerDeliveryNoteData => ({
    deliveryNoteNumber: "IN177896",
    lineItems: rollNumbers.map((rollNumber) => ({ rollNumber })),
  });

  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => warnSpy.mockRestore());

  it("does not warn on a sequential run", () => {
    warn([note(["43992", "43993", "43994", "43995"])]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("warns when one roll breaks an otherwise-sequential run", () => {
    warn([note(["41000", "41001", "49999"])]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/Suspicious roll numbers/));
  });

  it("warns on an unreadable roll number", () => {
    warn([note(["43992", "UNREADABLE"])]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/unreadable roll number/i));
  });
});
