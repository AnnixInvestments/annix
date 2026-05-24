import { JobSourceProvider } from "../../entities/job-market-source.entity";
import {
  decodeXml,
  isSitemapIndex,
  parseDisallows,
  parseSitemapLocs,
} from "./sitemap-crawl-ingestion.service";
import { isSitemapCrawlProvider, sitemapCrawlProfile } from "./sitemap-crawl-profiles";

describe("sitemap crawl parsing", () => {
  describe("decodeXml", () => {
    it("decodes a UTF-16LE buffer (with BOM)", () => {
      const xml = "<urlset><url><loc>https://x/jobs/a-id-1</loc></url></urlset>";
      const buffer = Buffer.concat([
        Buffer.from([0xff, 0xfe]),
        Buffer.from(new Uint16Array([...xml].map((c) => c.charCodeAt(0))).buffer),
      ]);
      expect(decodeXml(buffer)).toContain("<loc>https://x/jobs/a-id-1</loc>");
    });

    it("decodes plain UTF-8", () => {
      const buffer = Buffer.from("<urlset><loc>https://x/y</loc></urlset>", "utf8");
      expect(decodeXml(buffer)).toContain("https://x/y");
    });
  });

  describe("isSitemapIndex", () => {
    it("detects a sitemap index", () => {
      expect(isSitemapIndex('<sitemapindex xmlns="...">')).toBe(true);
    });
    it("rejects a urlset", () => {
      expect(isSitemapIndex('<urlset xmlns="...">')).toBe(false);
    });
  });

  describe("parseSitemapLocs", () => {
    it("extracts and entity-decodes loc entries", () => {
      const xml =
        "<urlset><url><loc>https://x/a?b=1&amp;c=2</loc></url><url><loc> https://x/d </loc></url></urlset>";
      expect(parseSitemapLocs(xml)).toEqual(["https://x/a?b=1&c=2", "https://x/d"]);
    });
  });

  describe("parseDisallows", () => {
    it("collects only rules under User-agent: *", () => {
      const robots = [
        "User-agent: *",
        "Disallow: /myprofile/applied-jobs",
        "Allow: /",
        "",
        "User-agent: MJ12bot",
        "Disallow: /",
      ].join("\n");
      expect(parseDisallows(robots)).toEqual(["/myprofile/applied-jobs"]);
    });

    it("ignores comments and blank disallows", () => {
      const robots = "User-agent: *\nDisallow:   # nothing\nDisallow: /private";
      expect(parseDisallows(robots)).toEqual(["/private"]);
    });
  });
});

describe("crawl profiles", () => {
  it("registers the four sitemap-based boards", () => {
    expect(isSitemapCrawlProvider(JobSourceProvider.EXECUTIVE_PLACEMENTS)).toBe(true);
    expect(isSitemapCrawlProvider(JobSourceProvider.JOB_PLACEMENTS)).toBe(true);
    expect(isSitemapCrawlProvider(JobSourceProvider.JOBMAIL)).toBe(true);
    expect(isSitemapCrawlProvider(JobSourceProvider.CAREERJUNCTION)).toBe(true);
    expect(isSitemapCrawlProvider(JobSourceProvider.ADZUNA)).toBe(false);
    expect(isSitemapCrawlProvider(JobSourceProvider.REMOTIVE)).toBe(false);
  });

  describe("Executive Placements / Job Placements", () => {
    const profile = sitemapCrawlProfile(JobSourceProvider.EXECUTIVE_PLACEMENTS)!;

    it("matches /Jobs/D/ detail URLs and skips category pages", () => {
      expect(
        profile.jobUrlPattern.test(
          "https://www.executiveplacements.com/Jobs/D/Delphi-Developer-1290718-Job-Search-05-18-2026-10-13-46-AM.asp",
        ),
      ).toBe(true);
      expect(
        profile.jobUrlPattern.test("https://www.executiveplacements.com/Jobs/it-jobs.asp"),
      ).toBe(false);
    });

    it("extracts the stable numeric id", () => {
      expect(
        profile.externalIdFromUrl(
          "https://www.executiveplacements.com/Jobs/D/Delphi-Developer-1290718-Job-Search-05-18-2026-10-13-46-AM.asp",
        ),
      ).toBe("1290718");
    });
  });

  describe("JobMail", () => {
    const profile = sitemapCrawlProfile(JobSourceProvider.JOBMAIL)!;

    it("matches /jobs/.../-id-<n> detail URLs", () => {
      expect(
        profile.jobUrlPattern.test(
          "https://www.jobmail.co.za/jobs/it-computer/other-it-computer/pretoria/senior-software-developer-ql-it-id-7119978",
        ),
      ).toBe(true);
      expect(profile.jobUrlPattern.test("https://www.jobmail.co.za/sitemaps/content.xml")).toBe(
        false,
      );
    });

    it("extracts the advert id", () => {
      expect(
        profile.externalIdFromUrl(
          "https://www.jobmail.co.za/jobs/it-computer/other-it-computer/pretoria/senior-software-developer-ql-it-id-7119978",
        ),
      ).toBe("7119978");
    });

    it("prefers the latest-adverts nested sitemaps", () => {
      expect(profile.preferredNestedSitemap?.test("https://x/sitemaps/latest-adverts2.xml")).toBe(
        true,
      );
      expect(profile.preferredNestedSitemap?.test("https://x/sitemaps/industries.xml")).toBe(false);
    });
  });
});
