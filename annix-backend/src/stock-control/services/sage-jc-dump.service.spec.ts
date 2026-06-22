import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as XLSX from "xlsx";
import { TransactionRunner } from "../../lib/persistence/transaction-runner";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";
import { CustomerPurchaseOrderRepository } from "../repositories/customer-purchase-order.repository";
import { CustomerPurchaseOrderItemRepository } from "../repositories/customer-purchase-order-item.repository";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";
import { SageJcDumpService } from "./sage-jc-dump.service";

const COMPANY_ID = 1;

function buildSageExcel(rows: any[][]): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function baseSageRows(overrides?: {
  customerName?: string;
  jobFileNo?: string;
  orderDesc?: string;
  docNumber?: string;
}): any[][] {
  const customer = overrides?.customerName || "MINING PRESSURE SYSTEMS (PTY) LTD";
  const jobFileNo = overrides?.jobFileNo || "P9972";
  const orderDesc = overrides?.orderDesc || "HARMONY - 32304E / A82609";
  const docNumber = overrides?.docNumber || "JC025694";
  return [
    ["JOB CARD AND MATERIAL MOVEMENT", "", "", "", "", "", "", ""],
    ["CUSTOMER", customer, "", "", "", "CUST001", "", ""],
    ["ORDER NO", orderDesc, "", "", "JOB FILE NO", jobFileNo, "Doc", docNumber],
    ["", "", "", "", "", "", "", ""],
    ["Item Code", "Item Description", "", "", "Item No", "Qty", "JT No", ""],
  ];
}

const makeCpo = (overrides: Partial<CustomerPurchaseOrder> = {}): CustomerPurchaseOrder =>
  ({
    id: 1,
    companyId: COMPANY_ID,
    cpoNumber: "CPO-P9972-JC025694",
    jobNumber: "P9972",
    jobName: "HARMONY - 32304E / A82609",
    customerName: "MINING PRESSURE SYSTEMS (PTY) LTD",
    poNumber: "HARMONY - 32304E / A82609",
    siteLocation: null,
    contactPerson: null,
    dueDate: null,
    notes: null,
    coatingSpecs: null,
    reference: null,
    customFields: null,
    status: CpoStatus.ACTIVE,
    totalItems: 1,
    totalQuantity: 10,
    fulfilledQuantity: 0,
    sourceFilePath: null,
    sourceFileName: null,
    versionNumber: 1,
    previousVersions: [],
    createdBy: "admin",
    items: [
      {
        id: 10,
        cpoId: 1,
        companyId: COMPANY_ID,
        itemCode: "PIPE-001",
        itemDescription: "6in CS pipe",
        itemNo: "001",
        quantityOrdered: 10,
        quantityFulfilled: 0,
        sortOrder: 0,
      },
    ],
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  }) as CustomerPurchaseOrder;

describe("SageJcDumpService", () => {
  let service: SageJcDumpService;
  let cpoRepo: Record<string, jest.Mock>;
  let jobCardRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    cpoRepo = {
      findOneForCompanyWithItems: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      saveForCompany: jest.fn().mockImplementation((_companyId, entity) => Promise.resolve(entity)),
      removeForCompany: jest.fn().mockResolvedValue(undefined),
      withTransaction: jest.fn().mockReturnThis(),
    };
    jobCardRepo = {
      findParentForCpo: jest.fn().mockResolvedValue(null),
      findChildJobCardsByJobNumber: jest.fn().mockResolvedValue([]),
      build: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, id: 100 })),
      saveForCompany: jest
        .fn()
        .mockImplementation((_companyId, data) => Promise.resolve({ ...data, id: 100 })),
      removeForCompany: jest.fn().mockResolvedValue(undefined),
      withTransaction: jest.fn().mockReturnThis(),
    };
    const lineItemRepo = {
      buildMany: jest.fn().mockImplementation((rows) => rows),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      saveForCompany: jest.fn().mockImplementation((_companyId, entity) => Promise.resolve(entity)),
      removeForCompany: jest.fn().mockResolvedValue(undefined),
      withTransaction: jest.fn().mockReturnThis(),
    };
    const cpoItemRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      saveForCompany: jest.fn().mockImplementation((_companyId, entity) => Promise.resolve(entity)),
      removeForCompany: jest.fn().mockResolvedValue(undefined),
      findManyWhere: jest.fn().mockResolvedValue([]),
      withTransaction: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SageJcDumpService,
        { provide: CustomerPurchaseOrderRepository, useValue: cpoRepo },
        { provide: JobCardRepository, useValue: jobCardRepo },
        { provide: JobCardLineItemRepository, useValue: lineItemRepo },
        { provide: CustomerPurchaseOrderItemRepository, useValue: cpoItemRepo },
        {
          provide: TransactionRunner,
          useValue: {
            run: jest.fn().mockImplementation((work) => work({})),
          },
        },
        { provide: QcMeasurementService, useValue: {} },
      ],
    }).compile();

    service = module.get(SageJcDumpService);
  });

  describe("parseSageJcDump", () => {
    it("throws NotFoundException when CPO does not exist", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(null);
      const buffer = buildSageExcel(baseSageRows());

      await expect(service.parseSageJcDump(buffer, COMPANY_ID, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException when file has no pages", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const buffer = buildSageExcel([["not a page header"]]);

      await expect(service.parseSageJcDump(buffer, COMPANY_ID, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when file is not a valid Excel file", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const buffer = Buffer.from("This is not an Excel file");

      await expect(service.parseSageJcDump(buffer, COMPANY_ID, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("handles CPO with null cpoNumber gracefully (no JC filter applied)", async () => {
      const cpo = makeCpo({ cpoNumber: null as unknown as string });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toHaveLength(1);
    });

    it("parses basic line items with JT numbers", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.cpoNumber).toBe("CPO-P9972-JC025694");
      expect(result.customerName).toBe("MINING PRESSURE SYSTEMS (PTY) LTD");
      expect(Object.keys(result.jtGroups)).toEqual(expect.arrayContaining(["JT001", "JT002"]));
      expect(result.jtGroups["JT001"]).toHaveLength(1);
      expect(result.jtGroups["JT001"][0].itemCode).toBe("PIPE-001");
      expect(result.jtGroups["JT001"][0].quantity).toBe(10);
    });

    it("detects spec rows in column 0 with empty other columns", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PAINT EXT : RED OXIDE", "", "", "", "", "", "", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.jtGroups["JT001"][0].specNotes).toBe("PAINT EXT : RED OXIDE");
      expect(result.specNotes).toBe("PAINT EXT : RED OXIDE");
    });

    it("detects spec rows when footer labels occupy columns 4-6 (bug fix)", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        [
          "PAINT EXT : PAINT PILOT QD RED OXIDE",
          "",
          "",
          "",
          "PRODUCTION",
          "Forman Sign",
          "Material Spec",
          "Job Comp Date",
        ],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.specNotes).toBe("PAINT EXT : PAINT PILOT QD RED OXIDE");
      expect(result.jtGroups["JT001"][0].specNotes).toBe("PAINT EXT : PAINT PILOT QD RED OXIDE");
    });

    it("strips trailing PRODUCTION from spec text", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PAINT EXT : RED OXIDE PRODUCTION", "", "", "", "", "", "", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.specNotes).toBe("PAINT EXT : RED OXIDE");
    });

    it("skips pure footer rows (col 0 is a footer label)", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["Job Comp Date", "", "", "", "", "", "", ""],
        ["Sage 200 Evolution", "", "", "", "", "", "", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.jtGroups["JT001"]).toHaveLength(1);
      expect(result.jtGroups["JT001"][0].specNotes).toBeNull();
    });

    it("filters footer labels from collected spec notes", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PAINT INT : EPOXY LINING", "", "", "", "", "", "", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.specNotes).toBe("PAINT INT : EPOXY LINING");
      expect(result.specNotes).not.toContain("Job Comp Date");
    });

    it("classifies asterisk items correctly", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "****", ""]];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toHaveLength(0);
      expect(result.asteriskItems).toHaveLength(1);
      expect(result.asteriskItems[0].itemCode).toBe("PIPE-001");
    });

    it("classifies items without JT number as undelivered", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "", ""]];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toHaveLength(0);
      expect(result.undeliveredItems).toHaveLength(1);
    });

    it("moves spec-like reference text to coatingSpecs during parse", async () => {
      const cpo = makeCpo({
        reference: "PAINT EXT : PAINT PILOT QD RED OXIDE PRODUCTION Forman Sign Material Spec",
        coatingSpecs: null,
      });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBeNull();
      expect(cpo.coatingSpecs).toBe("PAINT EXT : PAINT PILOT QD RED OXIDE");
      expect(cpoRepo.saveForCompany).toHaveBeenCalled();
    });

    it("clears footer-only coatingSpecs", async () => {
      const cpo = makeCpo({ coatingSpecs: "Job Comp Date" });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.coatingSpecs).toBeNull();
      expect(cpoRepo.saveForCompany).toHaveBeenCalled();
    });

    it("clears footer-only notes", async () => {
      const cpo = makeCpo({ notes: "Job Comp Date" });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.notes).toBeNull();
      expect(cpoRepo.saveForCompany).toHaveBeenCalled();
    });

    it("preserves legitimate notes that are not footer labels", async () => {
      const cpo = makeCpo({ notes: "Deliver to Gate 5" });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.notes).toBe("Deliver to Gate 5");
    });

    it("preserves non-spec reference text", async () => {
      const cpo = makeCpo({ reference: "REF-2025-001" });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBe("REF-2025-001");
    });

    it("detects spec text in column 1 (item description) when column 0 is empty", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["", "PAINT EXT : PRIMER COAT", "", "", "", "", "", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.specNotes).toBe("PAINT EXT : PRIMER COAT");
    });

    it("handles multiple spec lines for the same item group", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PAINT INT : EPOXY LINING", "", "", "", "", "", "", ""],
        ["PAINT EXT : ZINC PRIMER", "", "", "", "", "", "", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.jtGroups["JT001"][0].specNotes).toBe(
        "PAINT INT : EPOXY LINING\nPAINT EXT : ZINC PRIMER",
      );
    });

    it("handles multi-page Sage dumps when both pages match the CPO JC suffix", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const page1 = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
      ];
      const page2 = [
        ["JOB CARD AND MATERIAL MOVEMENT", "", "", "", "", "", "", ""],
        ["CUSTOMER", "MINING PRESSURE SYSTEMS (PTY) LTD", "", "", "", "CUST001", "", ""],
        [
          "ORDER NO",
          "HARMONY - 32304E / A82609",
          "",
          "",
          "JOB FILE NO",
          "P9972",
          "Doc",
          "JC025694",
        ],
        ["", "", "", "", "", "", "", ""],
        ["Item Code", "Item Description", "", "", "Item No", "Qty", "JT No", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel([...page1, ...page2]);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toEqual(expect.arrayContaining(["JT001", "JT002"]));
    });

    it("filters out pages whose documentNumber does not match the CPO JC suffix", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const matchingPage = [
        ...baseSageRows({ docNumber: "JC025694" }),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
      ];
      const otherPage = [
        ["JOB CARD AND MATERIAL MOVEMENT", "", "", "", "", "", "", ""],
        ["CUSTOMER", "MINING PRESSURE SYSTEMS (PTY) LTD", "", "", "", "CUST001", "", ""],
        [
          "ORDER NO",
          "HARMONY - 32304E / A82609",
          "",
          "",
          "JOB FILE NO",
          "P9972",
          "Doc",
          "JC025679",
        ],
        ["", "", "", "", "", "", "", ""],
        ["Item Code", "Item Description", "", "", "Item No", "Qty", "JT No", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel([...matchingPage, ...otherPage]);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.jtGroups["JT001"]).toHaveLength(1);
      expect(result.jtGroups["JT002"]).toBeUndefined();
    });

    it("throws when no parsed page matches the CPO JC suffix", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const buffer = buildSageExcel([
        ...baseSageRows({ docNumber: "JC999999" }),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
      ]);

      await expect(service.parseSageJcDump(buffer, COMPANY_ID, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("flags JT numbers as merged when they already exist on a sibling CPO of the same Sage job", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      jobCardRepo.findChildJobCardsByJobNumber.mockResolvedValue([
        { id: 200, jtDnNumber: "JT001" },
      ]);

      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.mergedJtNumbers).toContain("JT001");
      expect(result.jtGroups["JT001"]).toHaveLength(1);
      expect(result.jtGroups["JT002"]).toHaveLength(1);
    });

    it("inherits last JT number for rows missing JT No", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.jtGroups["JT001"]).toHaveLength(2);
    });

    it("appends spec text from reference to existing coatingSpecs without duplicating", async () => {
      const cpo = makeCpo({
        reference: "PAINT EXT : RED OXIDE",
        coatingSpecs: "PAINT INT : EPOXY LINING",
      });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBeNull();
      expect(cpo.coatingSpecs).toBe("PAINT INT : EPOXY LINING\nPAINT EXT : RED OXIDE");
    });

    it("does not duplicate when reference spec already exists in coatingSpecs", async () => {
      const cpo = makeCpo({
        reference: "PAINT EXT : RED OXIDE",
        coatingSpecs: "PAINT EXT : RED OXIDE",
      });
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBeNull();
      expect(cpo.coatingSpecs).toBe("PAINT EXT : RED OXIDE");
    });

    it("extracts document number from header rows when CPO has no JC suffix (filter bypassed)", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo({ cpoNumber: "CPO-P9972" }));
      const rows = [
        ...baseSageRows({ docNumber: "INV-12345" }),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.documentNumber).toBe("INV-12345");
    });

    it("handles rows with pricing in JT column as non-JT items", async () => {
      cpoRepo.findOneForCompanyWithItems.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "Pricing", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toHaveLength(0);
      expect(result.undeliveredItems).toHaveLength(1);
    });
  });
});
