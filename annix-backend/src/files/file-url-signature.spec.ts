import { signFilePath, verifyFileUrlSignature } from "./file-url-signature";

describe("file-url-signature", () => {
  const secret = "signing-secret";
  const filePath = "stock-control/company-1/job-cards/secret.txt";
  const now = 1_000_000;

  it("verifies a freshly signed, unexpired path", () => {
    const exp = now + 60_000;
    const sig = signFilePath(filePath, exp, secret);

    expect(verifyFileUrlSignature(filePath, exp, sig, secret, now)).toBe(true);
  });

  it("accepts the exp as a string (query-param form)", () => {
    const exp = now + 60_000;
    const sig = signFilePath(filePath, exp, secret);

    expect(verifyFileUrlSignature(filePath, String(exp), sig, secret, now)).toBe(true);
  });

  it("rejects an expired signature", () => {
    const exp = now - 1;
    const sig = signFilePath(filePath, exp, secret);

    expect(verifyFileUrlSignature(filePath, exp, sig, secret, now)).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const exp = now + 60_000;
    const sig = signFilePath(filePath, exp, secret);
    const tampered = `${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;

    expect(verifyFileUrlSignature(filePath, exp, tampered, secret, now)).toBe(false);
  });

  it("rejects a signature minted for a different path (IDOR)", () => {
    const exp = now + 60_000;
    const sig = signFilePath("stock-control/company-2/other.txt", exp, secret);

    expect(verifyFileUrlSignature(filePath, exp, sig, secret, now)).toBe(false);
  });

  it("rejects a signature minted with a different secret", () => {
    const exp = now + 60_000;
    const sig = signFilePath(filePath, exp, "other-secret");

    expect(verifyFileUrlSignature(filePath, exp, sig, secret, now)).toBe(false);
  });

  it("rejects missing parts", () => {
    expect(verifyFileUrlSignature(null, now, "sig", secret, now)).toBe(false);
    expect(verifyFileUrlSignature(filePath, null, "sig", secret, now)).toBe(false);
    expect(verifyFileUrlSignature(filePath, now, null, secret, now)).toBe(false);
    expect(verifyFileUrlSignature(filePath, now, "sig", null, now)).toBe(false);
  });

  it("rejects a non-numeric exp", () => {
    const sig = signFilePath(filePath, now + 1, secret);

    expect(verifyFileUrlSignature(filePath, "not-a-number", sig, secret, now)).toBe(false);
  });
});
