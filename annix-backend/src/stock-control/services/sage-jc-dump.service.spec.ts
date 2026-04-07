import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import * as XLSX from "xlsx";
import { CpoStatus, CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { QcMeasurementService } from "../qc/services/qc-measurement.service";
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
  const docNumber = overrides?.docNumber || "DOC001";
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
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    jobCardRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, id: 100 })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SageJcDumpService,
        { provide: getRepositoryToken(CustomerPurchaseOrder), useValue: cpoRepo },
        { provide: getRepositoryToken(CustomerPurchaseOrderItem), useValue: {} },
        { provide: getRepositoryToken(JobCard), useValue: jobCardRepo },
        { provide: getRepositoryToken(JobCardLineItem), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: QcMeasurementService, useValue: {} },
      ],
    }).compile();

    service = module.get(SageJcDumpService);
  });

  describe("parseSageJcDump", () => {
    it("throws NotFoundException when CPO does not exist", async () => {
      cpoRepo.findOne.mockResolvedValue(null);
      const buffer = buildSageExcel(baseSageRows());

      await expect(service.parseSageJcDump(buffer, COMPANY_ID, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException when file has no pages", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
      const buffer = buildSageExcel([["not a page header"]]);

      await expect(service.parseSageJcDump(buffer, COMPANY_ID, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("parses basic line items with JT numbers", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "****", ""]];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toHaveLength(0);
      expect(result.asteriskItems).toHaveLength(1);
      expect(result.asteriskItems[0].itemCode).toBe("PIPE-001");
    });

    it("classifies items without JT number as undelivered", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBeNull();
      expect(cpo.coatingSpecs).toBe("PAINT EXT : PAINT PILOT QD RED OXIDE");
      expect(cpoRepo.save).toHaveBeenCalled();
    });

    it("clears footer-only coatingSpecs", async () => {
      const cpo = makeCpo({ coatingSpecs: "Job Comp Date" });
      cpoRepo.findOne.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.coatingSpecs).toBeNull();
      expect(cpoRepo.save).toHaveBeenCalled();
    });

    it("clears footer-only notes", async () => {
      const cpo = makeCpo({ notes: "Job Comp Date" });
      cpoRepo.findOne.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.notes).toBeNull();
      expect(cpoRepo.save).toHaveBeenCalled();
    });

    it("preserves legitimate notes that are not footer labels", async () => {
      const cpo = makeCpo({ notes: "Deliver to Gate 5" });
      cpoRepo.findOne.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.notes).toBe("Deliver to Gate 5");
    });

    it("preserves non-spec reference text", async () => {
      const cpo = makeCpo({ reference: "REF-2025-001" });
      cpoRepo.findOne.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBe("REF-2025-001");
    });

    it("detects spec text in column 1 (item description) when column 0 is empty", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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

    it("handles multi-page Sage dumps", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
      const page1 = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
      ];
      const page2 = [
        ["JOB CARD AND MATERIAL MOVEMENT", "", "", "", "", "", "", ""],
        ["CUSTOMER", "MINING PRESSURE SYSTEMS (PTY) LTD", "", "", "", "CUST001", "", ""],
        ["ORDER NO", "HARMONY - 32304E / A82609", "", "", "JOB FILE NO", "P9972", "Doc", "DOC001"],
        ["", "", "", "", "", "", "", ""],
        ["Item Code", "Item Description", "", "", "Item No", "Qty", "JT No", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel([...page1, ...page2]);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(Object.keys(result.jtGroups)).toEqual(expect.arrayContaining(["JT001", "JT002"]));
    });

    it("skips JT numbers that already exist as child job cards", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
      jobCardRepo.findOne.mockResolvedValue({ id: 50, jtDnNumber: null });
      jobCardRepo.find.mockResolvedValue([{ jtDnNumber: "JT001" }]);

      const rows = [
        ...baseSageRows(),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
        ["PIPE-002", "8in CS pipe", "", "", "002", 5, "JT002", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.skippedJtNumbers).toContain("JT001");
      expect(result.jtGroups["JT001"]).toBeUndefined();
      expect(result.jtGroups["JT002"]).toHaveLength(1);
    });

    it("inherits last JT number for rows missing JT No", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
      cpoRepo.findOne.mockResolvedValue(cpo);
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
      cpoRepo.findOne.mockResolvedValue(cpo);
      const rows = [...baseSageRows(), ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""]];
      const buffer = buildSageExcel(rows);

      await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(cpo.reference).toBeNull();
      expect(cpo.coatingSpecs).toBe("PAINT EXT : RED OXIDE");
    });

    it("extracts document number from header rows", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
      const rows = [
        ...baseSageRows({ docNumber: "INV-12345" }),
        ["PIPE-001", "6in CS pipe", "", "", "001", 10, "JT001", ""],
      ];
      const buffer = buildSageExcel(rows);

      const result = await service.parseSageJcDump(buffer, COMPANY_ID, 1);

      expect(result.documentNumber).toBe("INV-12345");
    });

    it("handles rows with pricing in JT column as non-JT items", async () => {
      cpoRepo.findOne.mockResolvedValue(makeCpo());
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
