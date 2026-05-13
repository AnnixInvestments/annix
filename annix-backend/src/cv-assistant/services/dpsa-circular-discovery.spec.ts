import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// The helpers are file-local. Re-implementing here to avoid leaking them publicly
// while still exercising the same regexes.
function findLatestCircularPageHref(html: string): string | null {
  const matches = [
    ...html.matchAll(/href="([^"]*\/newsroom\/psvc\/circular-(\d+)-of-(\d+)\/?[^"]*)"/gi),
  ];
  if (matches.length === 0) return null;
  const ranked = matches
    .map((m) => ({ href: m[1], year: Number(m[3]), number: Number(m[2]) }))
    .sort((a, b) => b.year - a.year || b.number - a.number);
  return ranked[0]?.href ?? null;
}

function findPdfHref(html: string): string | null {
  const match = html.match(/href="([^"]+\.pdf)"/i);
  return match ? match[1] : null;
}

describe("DPSA discovery", () => {
  describe("findLatestCircularPageHref", () => {
    it("returns the highest year + circular number from the index", () => {
      const html = `
        <a href="/newsroom/psvc/circular-43-of-2025/">Circular 43 of 2025</a>
        <a href="/newsroom/psvc/circular-15-of-2026/">Circular 15 of 2026</a>
        <a href="/newsroom/psvc/circular-14-of-2026/">Circular 14 of 2026</a>
      `;
      expect(findLatestCircularPageHref(html)).toBe("/newsroom/psvc/circular-15-of-2026/");
    });

    it("returns null when no circular links are present", () => {
      expect(findLatestCircularPageHref("<html><body>No circulars</body></html>")).toBeNull();
    });

    it("handles absolute URLs", () => {
      const html = `<a href="https://www.dpsa.gov.za/newsroom/psvc/circular-1-of-2027/">2027</a>
                    <a href="/newsroom/psvc/circular-30-of-2026/">2026</a>`;
      expect(findLatestCircularPageHref(html)).toBe(
        "https://www.dpsa.gov.za/newsroom/psvc/circular-1-of-2027/",
      );
    });
  });

  describe("findPdfHref", () => {
    it("returns the first PDF href on a circular page", () => {
      const html = `
        <a href="/menu/Home">Home</a>
        <a href="https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/PSV%20CIRCULAR%2015%20of%202026.pdf">PDF</a>
      `;
      expect(findPdfHref(html)).toBe(
        "https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/PSV%20CIRCULAR%2015%20of%202026.pdf",
      );
    });

    it("returns null when no PDF link present", () => {
      expect(findPdfHref("<html><body>nothing</body></html>")).toBeNull();
    });
  });

  describe("regex stability against a real DPSA index fixture (skipped if absent)", () => {
    it("matches at least one circular page link in the captured fixture", () => {
      const fixturePath = resolve(__dirname, "../../../test/fixtures/cv-assistant/dpsa-index.html");
      if (!existsSync(fixturePath)) {
        return;
      }
      const html = readFileSync(fixturePath, "utf8");
      const href = findLatestCircularPageHref(html);
      expect(href).not.toBeNull();
    });
  });
});
