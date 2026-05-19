import { IsZACompanyRegNumberConstraint, IsZAVatNumberConstraint } from "./south-african.validator";

describe("IsZACompanyRegNumberConstraint", () => {
  const constraint = new IsZACompanyRegNumberConstraint();

  it("accepts a valid YYYY/NNNNNN/NN registration number", () => {
    expect(constraint.validate("2020/123456/07")).toBe(true);
    expect(constraint.validate("1998/000001/23")).toBe(true);
  });

  it("strips whitespace before checking the format", () => {
    expect(constraint.validate(" 2020 / 123456 / 07 ")).toBe(true);
  });

  it("treats an empty/blank value as valid (presence is checked separately)", () => {
    expect(constraint.validate("")).toBe(true);
    expect(constraint.validate("   ")).toBe(true);
  });

  it("rejects malformed registration numbers", () => {
    expect(constraint.validate("2020/12345/07")).toBe(false); // 5-digit sequence
    expect(constraint.validate("20/123456/07")).toBe(false); // 2-digit year
    expect(constraint.validate("2020/123456/7")).toBe(false); // 1-digit suffix
    expect(constraint.validate("2020-123456-07")).toBe(false); // wrong separator
    expect(constraint.validate("CK2020/123456/07")).toBe(false);
    expect(constraint.validate("not a registration number")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(constraint.validate(undefined)).toBe(false);
    expect(constraint.validate(null)).toBe(false);
    expect(constraint.validate(2020123456)).toBe(false);
  });
});

describe("IsZAVatNumberConstraint", () => {
  const constraint = new IsZAVatNumberConstraint();

  it("accepts a 10-digit VAT number starting with 4", () => {
    expect(constraint.validate("4123456789")).toBe(true);
    expect(constraint.validate("4000000000")).toBe(true);
  });

  it("strips whitespace before checking the format", () => {
    expect(constraint.validate("4123 456 789")).toBe(true);
  });

  it("treats an empty/blank value as valid (the field is optional)", () => {
    expect(constraint.validate("")).toBe(true);
    expect(constraint.validate("   ")).toBe(true);
  });

  it("rejects VAT numbers that do not start with 4", () => {
    expect(constraint.validate("5123456789")).toBe(false);
    expect(constraint.validate("0123456789")).toBe(false);
  });

  it("rejects VAT numbers of the wrong length", () => {
    expect(constraint.validate("412345678")).toBe(false); // 9 digits
    expect(constraint.validate("41234567890")).toBe(false); // 11 digits
  });

  it("rejects non-numeric and non-string values", () => {
    expect(constraint.validate("4ABCDEFGHI")).toBe(false);
    expect(constraint.validate(4123456789)).toBe(false);
    expect(constraint.validate(undefined)).toBe(false);
  });
});
