describe("Delivery Note Extraction Roll Filtering", () => {
  interface ExtractedRoll {
    rollNumber: string | null;
    thicknessMm: number | null;
    widthMm: number | null;
    lengthM: number | null;
    weightKg: number | null;
    areaSqM: number | null;
    deliveryNoteNumber: string | null;
    deliveryDate: string | null;
    customerName: string | null;
    pageNumber: number;
  }

  interface ExtractedDeliveryNote {
    deliveryNoteNumber?: string;
    deliveryDate?: string;
    customerName?: string;
    customerReference?: string;
    lineItems?: Array<{
      rollNumber?: string;
      thicknessMm?: number;
      widthMm?: number;
      lengthM?: number;
      actualWeightKg?: number;
    }>;
  }

  const buildAllRolls = (deliveryNotes: ExtractedDeliveryNote[]): ExtractedRoll[] =>
    deliveryNotes.flatMap((dn, dnIdx) =>
      (dn.lineItems || [])
        .filter((item) => item != null && typeof item === "object")
        .map((item) => ({
          rollNumber: item.rollNumber ?? null,
          thicknessMm: item.thicknessMm ?? null,
          widthMm: item.widthMm ?? null,
          lengthM: item.lengthM ?? null,
          weightKg: item.actualWeightKg ?? null,
          areaSqM: item.widthMm && item.lengthM ? (item.widthMm * item.lengthM) / 1000 : null,
          deliveryNoteNumber: dn.deliveryNoteNumber ?? null,
          deliveryDate: dn.deliveryDate ?? null,
          customerName: dn.customerName ?? null,
          pageNumber: dnIdx + 1,
        })),
    );

  const filterRollsForDn = (
    allRolls: ExtractedRoll[],
    currentDnNumber: string | null | undefined,
  ): ExtractedRoll[] => {
    const filteredRolls = currentDnNumber
      ? allRolls.filter((roll) => roll.deliveryNoteNumber === currentDnNumber)
      : allRolls;
    return filteredRolls.length > 0 ? filteredRolls : allRolls;
  };

  const multiDnExtractionResult: ExtractedDeliveryNote[] = [
    {
      deliveryNoteNumber: "1298",
      deliveryDate: "2026-03-25",
      customerName: "Polymer Lining Systems (Pty) Ltd",
      customerReference: "PL7776/PO6719",
      lineItems: [
        { rollNumber: "154-41210", thicknessMm: 20, widthMm: 950, lengthM: 12.5, actualWeightKg: 258 },
      ],
    },
    {
      deliveryNoteNumber: "1299",
      deliveryDate: "2026-03-25",
      customerName: "Polymer Lining Systems (Pty) Ltd",
      customerReference: "PL7776/PO6719",
      lineItems: [
        { rollNumber: "155-41213", thicknessMm: 8, widthMm: 950, lengthM: 12.5, actualWeightKg: 102 },
      ],
    },
    {
      deliveryNoteNumber: "1300",
      deliveryDate: "2026-03-25",
      customerName: "Polymer Lining Systems (Pty) Ltd",
      customerReference: "PL7805/PO6725",
      lineItems: [
        { rollNumber: "157-41211", thicknessMm: 8, widthMm: 800, lengthM: 10, actualWeightKg: 87 },
      ],
    },
    {
      deliveryNoteNumber: "1301",
      deliveryDate: "2026-03-25",
      customerName: "Polymer Lining Systems (Pty) Ltd",
      customerReference: "PL7776/PO6719",
      lineItems: [
        { rollNumber: "162-41212", thicknessMm: 8, widthMm: 1200, lengthM: 12.5, actualWeightKg: 132 },
      ],
    },
  ];

  const allRolls = buildAllRolls(multiDnExtractionResult);

  it("should have 4 total rolls across all DNs", () => {
    expect(allRolls).toHaveLength(4);
  });

  it("should assign correct DN numbers to each roll", () => {
    expect(allRolls[0].deliveryNoteNumber).toBe("1298");
    expect(allRolls[1].deliveryNoteNumber).toBe("1299");
    expect(allRolls[2].deliveryNoteNumber).toBe("1300");
    expect(allRolls[3].deliveryNoteNumber).toBe("1301");
  });

  it("should filter to only DN 1300 roll when current DN is 1300", () => {
    const filtered = filterRollsForDn(allRolls, "1300");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].rollNumber).toBe("157-41211");
    expect(filtered[0].deliveryNoteNumber).toBe("1300");
  });

  it("should filter to only DN 1298 roll when current DN is 1298", () => {
    const filtered = filterRollsForDn(allRolls, "1298");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].rollNumber).toBe("154-41210");
  });

  it("should filter to only DN 1299 roll when current DN is 1299", () => {
    const filtered = filterRollsForDn(allRolls, "1299");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].rollNumber).toBe("155-41213");
  });

  it("should filter to only DN 1301 roll when current DN is 1301", () => {
    const filtered = filterRollsForDn(allRolls, "1301");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].rollNumber).toBe("162-41212");
  });

  it("should return all rolls when current DN number is null", () => {
    const filtered = filterRollsForDn(allRolls, null);
    expect(filtered).toHaveLength(4);
  });

  it("should return all rolls when current DN number is undefined", () => {
    const filtered = filterRollsForDn(allRolls, undefined);
    expect(filtered).toHaveLength(4);
  });

  it("should fallback to all rolls when DN number has no match", () => {
    const filtered = filterRollsForDn(allRolls, "9999");
    expect(filtered).toHaveLength(4);
  });

  it("should handle DN with multiple rolls", () => {
    const multiRollDns: ExtractedDeliveryNote[] = [
      {
        deliveryNoteNumber: "500",
        lineItems: [
          { rollNumber: "R-001", thicknessMm: 8, widthMm: 950, lengthM: 12.5, actualWeightKg: 100 },
          { rollNumber: "R-002", thicknessMm: 8, widthMm: 950, lengthM: 12.5, actualWeightKg: 105 },
        ],
      },
      {
        deliveryNoteNumber: "501",
        lineItems: [
          { rollNumber: "R-003", thicknessMm: 10, widthMm: 1200, lengthM: 10, actualWeightKg: 130 },
        ],
      },
    ];
    const rolls = buildAllRolls(multiRollDns);
    const filtered = filterRollsForDn(rolls, "500");
    expect(filtered).toHaveLength(2);
    expect(filtered[0].rollNumber).toBe("R-001");
    expect(filtered[1].rollNumber).toBe("R-002");
  });

  it("should select matching DN metadata instead of first DN", () => {
    const currentDnNumber = "1300";
    const matchingDn = multiDnExtractionResult.find(
      (dn) => dn.deliveryNoteNumber === currentDnNumber,
    );
    const dnMetadata = matchingDn || multiDnExtractionResult[0];

    expect(dnMetadata.deliveryNoteNumber).toBe("1300");
    expect(dnMetadata.customerReference).toBe("PL7805/PO6725");
  });

  it("should fall back to first DN metadata when no match", () => {
    const currentDnNumber = "9999";
    const matchingDn = multiDnExtractionResult.find(
      (dn) => dn.deliveryNoteNumber === currentDnNumber,
    );
    const dnMetadata = matchingDn || multiDnExtractionResult[0];

    expect(dnMetadata.deliveryNoteNumber).toBe("1298");
  });
});
