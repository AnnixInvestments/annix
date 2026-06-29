import type { RecommendedFacetRow } from "../repositories/candidate-job-match.repository";
import { SeekerJobFeedService } from "./seeker-job-feed.service";

function makeFacetService(rows: RecommendedFacetRow[]) {
  const service = Object.create(SeekerJobFeedService.prototype) as SeekerJobFeedService &
    Record<string, unknown>;
  Object.assign(service, {
    candidatesForSeeker: jest.fn().mockResolvedValue([{ id: 1 }]),
    cachedFacetRows: jest.fn().mockResolvedValue(rows),
    sourceRepo: { findManyWhere: jest.fn().mockResolvedValue([]) },
    targetCountriesForCandidates: jest.fn().mockResolvedValue(["za"]),
    resolveRepoFilters: jest.fn().mockResolvedValue({ provinces: ["Mpumalanga"] }),
  });
  return service;
}

describe("SeekerJobFeedService recommendedFacetsForSeeker", () => {
  it("expands selected province cities beyond the sparse matched rows", async () => {
    const service = makeFacetService([
      {
        country: "za",
        canonicalProvince: "Mpumalanga",
        canonicalCity: "eMalahleni",
        canonicalCategory: null,
        sourceId: null,
        salaryMin: null,
        salaryMax: null,
        title: "Desktop Engineer",
        company: "Adzuna",
        locationArea: "eMalahleni",
        locationRaw: "eMalahleni, Mpumalanga",
      },
    ]);

    const result = await service.recommendedFacetsForSeeker("seeker@example.com", {
      filters: { provinces: ["Mpumalanga"] },
    });

    expect(result.provinces).toContain("Mpumalanga");
    expect(result.cities).toEqual(expect.arrayContaining(["Mbombela", "eMalahleni", "Secunda"]));
  });
});
