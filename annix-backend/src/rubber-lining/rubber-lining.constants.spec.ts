import { isAuSelfCompanyName } from "./rubber-lining.constants";

describe("isAuSelfCompanyName", () => {
  it("matches AU's own company across the spellings the AI extracts", () => {
    expect(isAuSelfCompanyName("AU Industries (Pty) Ltd")).toBe(true);
    expect(isAuSelfCompanyName("au industries")).toBe(true);
    expect(isAuSelfCompanyName("AU Rubber")).toBe(true);
    expect(isAuSelfCompanyName("auind.co.za")).toBe(true);
  });

  it("does not match real customers/suppliers that merely contain 'au'", () => {
    expect(isAuSelfCompanyName("Beau Industries")).toBe(false);
    expect(isAuSelfCompanyName("Polymer Lining Systems (Pty) Ltd")).toBe(false);
    expect(isAuSelfCompanyName("Impilo Industries Pty Ltd")).toBe(false);
    expect(isAuSelfCompanyName("Gauteng Rubber")).toBe(false);
  });

  it("treats absent names as not-self", () => {
    expect(isAuSelfCompanyName(null)).toBe(false);
    expect(isAuSelfCompanyName(undefined)).toBe(false);
    expect(isAuSelfCompanyName("")).toBe(false);
  });
});
