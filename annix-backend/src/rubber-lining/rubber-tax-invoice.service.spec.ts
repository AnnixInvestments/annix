import { CompoundMovementReferenceType } from "./entities/rubber-compound-movement.entity";
import { RollStockStatus } from "./entities/rubber-roll-stock.entity";
import {
  CreditNoteType,
  RubberTaxInvoice,
  TaxInvoiceStatus,
} from "./entities/rubber-tax-invoice.entity";
import { type CreditNoteReturnResult, RubberTaxInvoiceService } from "./rubber-tax-invoice.service";

interface FakeRoll {
  id: number;
  rollNumber: string;
  status: RollStockStatus;
  compoundCodingId: number | null;
  weightKg: number | null;
  auCocId: number | null;
  customerDeliveryNoteId: number | null;
  supplierTaxInvoiceId: number | null;
}

describe("RubberTaxInvoiceService — credit note returns", () => {
  const build = (opts: {
    rolls: FakeRoll[];
    alreadyDeducted?: boolean;
    sourceInvoices?: { id: number; companyId: number }[];
  }) => {
    const taxInvoiceRepository = {
      findManyByIdsWithCompany: jest.fn().mockResolvedValue(opts.sourceInvoices ?? []),
    };
    const rollStockRepository = {
      findManyByRollNumbers: jest.fn().mockResolvedValue(opts.rolls),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const rubberStockService = {
      movementExistsForReference: jest.fn().mockResolvedValue(opts.alreadyDeducted ?? false),
      deductCompoundStockByCoding: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RubberTaxInvoiceService(
      taxInvoiceRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      rollStockRepository as never,
      {} as never,
      rubberStockService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, rollStockRepository, rubberStockService };
  };

  const proc = (service: RubberTaxInvoiceService, invoice: RubberTaxInvoice) =>
    (
      service as never as {
        processCreditNoteRollRejections(i: RubberTaxInvoice): Promise<CreditNoteReturnResult>;
      }
    ).processCreditNoteRollRejections(invoice);

  const roll = (over: Partial<FakeRoll>): FakeRoll => ({
    id: 1,
    rollNumber: "1001",
    status: RollStockStatus.IN_STOCK,
    compoundCodingId: 5,
    weightKg: 50,
    auCocId: null,
    customerDeliveryNoteId: null,
    supplierTaxInvoiceId: null,
    ...over,
  });

  const invoice = (creditNoteType: CreditNoteType | null): RubberTaxInvoice =>
    ({
      id: 7,
      invoiceNumber: "CN-1",
      companyId: 100,
      isCreditNote: true,
      creditNoteType,
      creditNoteRollNumbers: ["1001"],
    }) as unknown as RubberTaxInvoice;

  it("touches no stock for a FINANCIAL_ONLY credit", async () => {
    const { service, rollStockRepository, rubberStockService } = build({ rolls: [roll({})] });
    const result = await proc(service, invoice(CreditNoteType.FINANCIAL_ONLY));
    expect(rollStockRepository.save).not.toHaveBeenCalled();
    expect(rubberStockService.deductCompoundStockByCoding).not.toHaveBeenCalled();
    expect(result.rejected).toBe(0);
  });

  it("touches no stock for an unclassified credit", async () => {
    const { service, rollStockRepository } = build({ rolls: [roll({})] });
    await proc(service, invoice(null));
    expect(rollStockRepository.save).not.toHaveBeenCalled();
  });

  it("rejects rolls and deducts kg for a PHYSICAL_RETURN", async () => {
    const r = roll({});
    const { service, rollStockRepository, rubberStockService } = build({ rolls: [r] });
    const result = await proc(service, invoice(CreditNoteType.PHYSICAL_RETURN));
    expect(r.status).toBe(RollStockStatus.REJECTED);
    expect(rollStockRepository.save).toHaveBeenCalled();
    expect(rubberStockService.deductCompoundStockByCoding).toHaveBeenCalledWith(
      5,
      50,
      CompoundMovementReferenceType.CREDIT_NOTE_RETURN,
      7,
      expect.any(String),
    );
    expect(result.rejected).toBe(1);
    expect(result.deductedKg).toBe(50);
    expect(result.alreadyShipped).toHaveLength(0);
  });

  it("does not deduct kg twice (idempotent on re-approve)", async () => {
    const { service, rubberStockService } = build({ rolls: [roll({})], alreadyDeducted: true });
    const result = await proc(service, invoice(CreditNoteType.PHYSICAL_RETURN));
    expect(rubberStockService.deductCompoundStockByCoding).not.toHaveBeenCalled();
    expect(result.deductedKg).toBe(0);
  });

  it("flags an already-shipped roll without un-allocating it", async () => {
    const r = roll({ auCocId: 99, customerDeliveryNoteId: 88 });
    const { service } = build({ rolls: [r] });
    const result = await proc(service, invoice(CreditNoteType.PHYSICAL_RETURN));
    expect(result.alreadyShipped).toEqual([
      { rollNumber: "1001", auCocId: 99, customerDeliveryNoteId: 88 },
    ]);
    expect(r.auCocId).toBe(99);
    expect(r.status).toBe(RollStockStatus.REJECTED);
  });

  it("skips a roll that belongs to a different supplier (likely OCR mis-read)", async () => {
    // Roll 1001 traces back to supplier invoice #200, whose company (#999) is not
    // this credit note's supplier (#100) — so it must not be rejected or deducted.
    const r = roll({ supplierTaxInvoiceId: 200 });
    const { service, rollStockRepository, rubberStockService } = build({
      rolls: [r],
      sourceInvoices: [{ id: 200, companyId: 999 }],
    });
    const result = await proc(service, invoice(CreditNoteType.PHYSICAL_RETURN));
    expect(result.wrongSupplier).toEqual(["1001"]);
    expect(result.rejected).toBe(0);
    expect(r.status).toBe(RollStockStatus.IN_STOCK);
    expect(rollStockRepository.save).not.toHaveBeenCalled();
    expect(rubberStockService.deductCompoundStockByCoding).not.toHaveBeenCalled();
  });

  it("rejects a same-supplier roll but skips kg deduction for an implausible weight", async () => {
    const r = roll({ supplierTaxInvoiceId: 200, weightKg: 50000 });
    const { service, rollStockRepository, rubberStockService } = build({
      rolls: [r],
      sourceInvoices: [{ id: 200, companyId: 100 }],
    });
    const result = await proc(service, invoice(CreditNoteType.PHYSICAL_RETURN));
    expect(r.status).toBe(RollStockStatus.REJECTED);
    expect(rollStockRepository.save).toHaveBeenCalled();
    expect(rubberStockService.deductCompoundStockByCoding).not.toHaveBeenCalled();
    expect(result.rejected).toBe(1);
    expect(result.deductedKg).toBe(0);
  });

  it("refuses to re-classify an already-approved credit note", async () => {
    const taxInvoiceRepository = {
      findOneByIdWithCompany: jest.fn().mockResolvedValue({
        id: 7,
        isCreditNote: true,
        status: TaxInvoiceStatus.APPROVED,
      }),
      save: jest.fn(),
    };
    const service = new RubberTaxInvoiceService(
      taxInvoiceRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.classifyCreditNote(7, CreditNoteType.PHYSICAL_RETURN)).rejects.toThrow(
      "already-approved",
    );
    expect(taxInvoiceRepository.save).not.toHaveBeenCalled();
  });
});
