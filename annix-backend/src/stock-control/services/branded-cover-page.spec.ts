import PDFDocument from "pdfkit";
import { generateBrandedCoverPage } from "./branded-cover-page";

const mockFetchLogo = jest.fn();

function makeCompany(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: "PLS Coatings",
    logoUrl: "https://example.com/logo.png",
    primaryColor: "#0d9488",
    ...overrides,
  } as any;
}

function makeJobCard(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    customerName: "Example Corp",
    poNumber: "PO-12345",
    jobNumber: "JC-001",
    jobName: "Valve Lining Project",
    createdAt: new Date("2026-01-15"),
    reference: "REF-001",
    siteLocation: "Secunda",
    dueDate: "2026-04-30",
    ...overrides,
  } as any;
}

function makeCoatingAnalysis(overrides: Record<string, any> = {}) {
  return {
    surfacePrep: "sa3_blast",
    coats: [
      { area: "external", product: "Interzinc 52", minDftUm: 50, maxDftUm: 75 },
      { area: "internal", product: "Interline 850", minDftUm: 150, maxDftUm: 250 },
    ],
    ...overrides,
  } as any;
}

function makeControlPlan(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    planType: "rubber",
    qcpNumber: "QCP-001",
    specification: "NR 40 Shore A",
    itemDescription: null,
    ...overrides,
  } as any;
}

function makeReleaseCert(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    certificateNumber: "QRC-001",
    ...overrides,
  } as any;
}

function makeSupplierCert(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    certificateType: "CoC",
    batchNumber: "B-001",
    originalFilename: "coc.pdf",
    supplier: { name: "Rema Tip Top" },
    ...overrides,
  } as any;
}

function makeCalCert(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    equipmentName: "Elcometer 456",
    equipmentIdentifier: "ELC-01",
    expiryDate: "2027-06-15",
    originalFilename: "cal.pdf",
    ...overrides,
  } as any;
}

describe("generateBrandedCoverPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchLogo.mockResolvedValue(Buffer.alloc(100));
  });

  it("produces a valid PDF buffer", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard(),
      makeCoatingAnalysis(),
      [makeControlPlan()],
      [makeReleaseCert()],
      [makeSupplierCert()],
      [makeCalCert()],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("handles null company", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      null,
      makeJobCard(),
      null,
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(mockFetchLogo).not.toHaveBeenCalled();
  });

  it("handles null job card", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      null,
      null,
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("handles missing logo gracefully when fetchLogo throws", async () => {
    mockFetchLogo.mockRejectedValue(new Error("Network error"));

    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard(),
      null,
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles company without logoUrl", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany({ logoUrl: null }),
      makeJobCard(),
      null,
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(mockFetchLogo).not.toHaveBeenCalled();
  });

  it("handles null coating analysis", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard(),
      null,
      [makeControlPlan()],
      [makeReleaseCert()],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("renders with no certificates at all", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard(),
      makeCoatingAnalysis(),
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("renders with many supplier and calibration certificates", async () => {
    const supplierCerts = Array.from({ length: 15 }, (_, i) =>
      makeSupplierCert({
        id: i + 1,
        batchNumber: `B-${String(i + 1).padStart(3, "0")}`,
        originalFilename: `coc-${i + 1}.pdf`,
      }),
    );
    const calCerts = Array.from({ length: 10 }, (_, i) =>
      makeCalCert({
        id: i + 1,
        equipmentName: `Gauge ${i + 1}`,
        originalFilename: `cal-${i + 1}.pdf`,
      }),
    );

    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard(),
      makeCoatingAnalysis(),
      [makeControlPlan()],
      [makeReleaseCert()],
      supplierCerts,
      calCerts,
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("renders multiple control plan types", async () => {
    const plans = [
      makeControlPlan({ planType: "rubber", specification: "NR 40" }),
      makeControlPlan({ planType: "hdpe", specification: "HDPE PE100" }),
      makeControlPlan({ planType: "paint_external", qcpNumber: "QCP-EXT-001" }),
    ];

    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard(),
      makeCoatingAnalysis(),
      plans,
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("uses default brand color when company has no primaryColor", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany({ primaryColor: null }),
      makeJobCard(),
      null,
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it("handles createdAt as string", async () => {
    const result = await generateBrandedCoverPage(
      PDFDocument,
      makeCompany(),
      makeJobCard({ createdAt: "2026-01-15T00:00:00.000Z" }),
      null,
      [],
      [],
      [],
      [],
      { name: "Test User" },
      { fetchLogo: mockFetchLogo },
    );

    expect(Buffer.isBuffer(result)).toBe(true);
  });
});
