import { countMatchingRows, distinctPassing, type FacetRow, rowPasses } from "./facet-compute";

function row(overrides: Partial<FacetRow> = {}): FacetRow {
  return {
    canonicalProvince: "Gauteng",
    canonicalCity: "Benoni",
    canonicalCategory: "it-software",
    sourceId: 1,
    salaryMin: null,
    salaryMax: null,
    title: "Software Engineer",
    company: "Acme",
    locationArea: "Benoni",
    locationRaw: "Benoni, Ekurhuleni",
    ...overrides,
  };
}

describe("rowPasses", () => {
  it("passes with no filters", () => {
    expect(rowPasses(row(), {})).toBe(true);
  });

  it("matches province exactly (not by substring)", () => {
    expect(rowPasses(row({ canonicalProvince: "Gauteng" }), { province: "Gauteng" })).toBe(true);
    expect(rowPasses(row({ canonicalProvince: "Western Cape" }), { province: "Gauteng" })).toBe(
      false,
    );
  });

  it("disambiguates same-named towns by canonical province", () => {
    const mpMiddelburg = row({ canonicalProvince: "Mpumalanga", canonicalCity: "Middelburg" });
    const ecMiddelburg = row({ canonicalProvince: "Eastern Cape", canonicalCity: "Middelburg" });
    expect(rowPasses(mpMiddelburg, { province: "Mpumalanga", city: "Middelburg" })).toBe(true);
    expect(rowPasses(ecMiddelburg, { province: "Mpumalanga", city: "Middelburg" })).toBe(false);
  });

  it("matches city and category exactly", () => {
    expect(rowPasses(row({ canonicalCity: "Benoni" }), { city: "Benoni" })).toBe(true);
    expect(rowPasses(row({ canonicalCity: "Sandton" }), { city: "Benoni" })).toBe(false);
    expect(
      rowPasses(row({ canonicalCategory: "finance-accounting" }), { category: "it-software" }),
    ).toBe(false);
  });

  it("matches sourceIds membership", () => {
    expect(rowPasses(row({ sourceId: 2 }), { sourceIds: [2, 3] })).toBe(true);
    expect(rowPasses(row({ sourceId: 9 }), { sourceIds: [2, 3] })).toBe(false);
    expect(rowPasses(row({ sourceId: 9 }), { sourceIds: [] })).toBe(true);
  });

  it("includes jobs with no salary and excludes those below minSalary", () => {
    expect(rowPasses(row({ salaryMin: null, salaryMax: null }), { minSalary: 50000 })).toBe(true);
    expect(rowPasses(row({ salaryMax: 40000 }), { minSalary: 50000 })).toBe(false);
    expect(rowPasses(row({ salaryMax: 60000 }), { minSalary: 50000 })).toBe(true);
    expect(rowPasses(row({ salaryMin: 55000, salaryMax: null }), { minSalary: 50000 })).toBe(true);
  });

  it("matches search across title, company and location", () => {
    expect(rowPasses(row({ title: "Welder" }), { search: "weld" })).toBe(true);
    expect(rowPasses(row({ company: "Bidvest" }), { search: "bidvest" })).toBe(true);
    expect(rowPasses(row({ locationRaw: "Benoni, Ekurhuleni" }), { search: "ekurhuleni" })).toBe(
      true,
    );
    expect(rowPasses(row({ title: "Welder", company: "Acme" }), { search: "plumber" })).toBe(false);
  });

  it("ignores a skipped dimension", () => {
    const r = row({ canonicalProvince: "Western Cape" });
    expect(rowPasses(r, { province: "Gauteng" }, new Set(["province"]))).toBe(true);
    expect(rowPasses(r, { province: "Gauteng" })).toBe(false);
  });
});

describe("countMatchingRows", () => {
  const rows = [
    row({ canonicalProvince: "Gauteng", canonicalCity: "Benoni" }),
    row({ canonicalProvince: "Gauteng", canonicalCity: "Sandton" }),
    row({ canonicalProvince: "Western Cape", canonicalCity: "Cape Town" }),
  ];

  it("counts rows passing all filters", () => {
    expect(countMatchingRows(rows, {})).toBe(3);
    expect(countMatchingRows(rows, { province: "Gauteng" })).toBe(2);
    expect(countMatchingRows(rows, { province: "Gauteng", city: "Benoni" })).toBe(1);
    expect(countMatchingRows(rows, { province: "Free State" })).toBe(0);
  });
});

describe("distinctPassing", () => {
  const rows = [
    row({ canonicalProvince: "Gauteng", canonicalCity: "Benoni", sourceId: 1 }),
    row({ canonicalProvince: "Gauteng", canonicalCity: "Sandton", sourceId: 2 }),
    row({ canonicalProvince: "Western Cape", canonicalCity: "Cape Town", sourceId: 1 }),
  ];

  it("returns distinct provinces ignoring the province/city dimensions", () => {
    const provinces = distinctPassing(
      rows,
      { province: "Gauteng" },
      new Set(["province", "city"]),
      (r) => r.canonicalProvince,
    );
    // Province facet ignores the province filter, so all provinces remain selectable.
    expect([...provinces].sort()).toEqual(["Gauteng", "Western Cape"]);
  });

  it("returns only cities within the selected province (city dimension skipped)", () => {
    const cities = distinctPassing(
      rows,
      { province: "Gauteng", city: "Benoni" },
      new Set(["city"]),
      (r) => r.canonicalCity,
    );
    expect([...cities].sort()).toEqual(["Benoni", "Sandton"]);
  });

  it("omits null/empty selector values", () => {
    const withNull = [...rows, row({ canonicalCity: null })];
    const cities = distinctPassing(withNull, {}, new Set(), (r) => r.canonicalCity);
    expect([...cities]).not.toContain(null);
  });
});
