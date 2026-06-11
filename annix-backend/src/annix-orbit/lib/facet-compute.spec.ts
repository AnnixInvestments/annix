import { countMatchingRows, distinctPassing, type FacetRow, rowPasses } from "./facet-compute";

function row(overrides: Partial<FacetRow> = {}): FacetRow {
  return {
    country: "za",
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
    expect(rowPasses(row({ canonicalProvince: "Gauteng" }), { provinces: ["Gauteng"] })).toBe(true);
    expect(rowPasses(row({ canonicalProvince: "Western Cape" }), { provinces: ["Gauteng"] })).toBe(
      false,
    );
  });

  it("matches ANY of multiple selected provinces", () => {
    const filter = { provinces: ["Gauteng", "Mpumalanga"] };
    expect(rowPasses(row({ canonicalProvince: "Gauteng" }), filter)).toBe(true);
    expect(rowPasses(row({ canonicalProvince: "Mpumalanga" }), filter)).toBe(true);
    expect(rowPasses(row({ canonicalProvince: "Western Cape" }), filter)).toBe(false);
  });

  it("treats an empty selection as no filter", () => {
    expect(rowPasses(row({ canonicalProvince: "Western Cape" }), { provinces: [] })).toBe(true);
    expect(rowPasses(row({ canonicalCity: "Sandton" }), { cities: [] })).toBe(true);
  });

  it("disambiguates same-named towns by canonical province", () => {
    const mpMiddelburg = row({ canonicalProvince: "Mpumalanga", canonicalCity: "Middelburg" });
    const ecMiddelburg = row({ canonicalProvince: "Eastern Cape", canonicalCity: "Middelburg" });
    expect(rowPasses(mpMiddelburg, { provinces: ["Mpumalanga"], cities: ["Middelburg"] })).toBe(
      true,
    );
    expect(rowPasses(ecMiddelburg, { provinces: ["Mpumalanga"], cities: ["Middelburg"] })).toBe(
      false,
    );
  });

  it("matches city and category exactly", () => {
    expect(rowPasses(row({ canonicalCity: "Benoni" }), { cities: ["Benoni"] })).toBe(true);
    expect(rowPasses(row({ canonicalCity: "Sandton" }), { cities: ["Benoni"] })).toBe(false);
    expect(
      rowPasses(row({ canonicalCategory: "finance-accounting" }), { category: "it-software" }),
    ).toBe(false);
  });

  it("matches ANY of multiple selected cities", () => {
    const filter = { cities: ["Witbank", "Ermelo", "Johannesburg", "Pretoria"] };
    expect(rowPasses(row({ canonicalCity: "Ermelo" }), filter)).toBe(true);
    expect(rowPasses(row({ canonicalCity: "Benoni" }), filter)).toBe(false);
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
    expect(rowPasses(r, { provinces: ["Gauteng"] }, new Set(["province"]))).toBe(true);
    expect(rowPasses(r, { provinces: ["Gauteng"] })).toBe(false);
  });

  it("enforces the target-country gate (UK jobs hidden from ZA-only seekers)", () => {
    const ukJob = row({ country: "gb" });
    const zaJob = row({ country: "za" });
    expect(rowPasses(ukJob, { targetCountries: ["za"] })).toBe(false);
    expect(rowPasses(zaJob, { targetCountries: ["za"] })).toBe(true);
    expect(rowPasses(ukJob, { targetCountries: ["za", "gb"] })).toBe(true);
  });

  it("narrows by region but the gate is never skippable", () => {
    const ukJob = row({ country: "gb" });
    // region is a skippable facet dimension...
    expect(rowPasses(ukJob, { targetCountries: ["za", "gb"], region: "za" })).toBe(false);
    expect(
      rowPasses(ukJob, { targetCountries: ["za", "gb"], region: "za" }, new Set(["region"])),
    ).toBe(true);
    // ...but the target-country gate still excludes a job outside the seeker's countries.
    expect(rowPasses(ukJob, { targetCountries: ["za"], region: "gb" }, new Set(["region"]))).toBe(
      false,
    );
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
    expect(countMatchingRows(rows, { provinces: ["Gauteng"] })).toBe(2);
    expect(countMatchingRows(rows, { provinces: ["Gauteng"], cities: ["Benoni"] })).toBe(1);
    expect(countMatchingRows(rows, { provinces: ["Free State"] })).toBe(0);
    expect(countMatchingRows(rows, { provinces: ["Gauteng", "Western Cape"] })).toBe(3);
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
      { provinces: ["Gauteng"] },
      new Set(["province", "city"]),
      (r) => r.canonicalProvince,
    );
    // Province facet ignores the province filter, so all provinces remain selectable.
    expect([...provinces].sort()).toEqual(["Gauteng", "Western Cape"]);
  });

  it("returns only cities within the selected provinces (city dimension skipped)", () => {
    const cities = distinctPassing(
      rows,
      { provinces: ["Gauteng"], cities: ["Benoni"] },
      new Set(["city"]),
      (r) => r.canonicalCity,
    );
    expect([...cities].sort()).toEqual(["Benoni", "Sandton"]);
  });

  it("unions cities across multiple selected provinces", () => {
    const cities = distinctPassing(
      rows,
      { provinces: ["Gauteng", "Western Cape"] },
      new Set(["city"]),
      (r) => r.canonicalCity,
    );
    expect([...cities].sort()).toEqual(["Benoni", "Cape Town", "Sandton"]);
  });

  it("omits null/empty selector values", () => {
    const withNull = [...rows, row({ canonicalCity: null })];
    const cities = distinctPassing(withNull, {}, new Set(), (r) => r.canonicalCity);
    expect([...cities]).not.toContain(null);
  });
});
