import { paystackSignature, verifyPaystackSignature } from "./paystack-signature";

const SECRET = "sk_test_example_secret";
const RAW_BODY = JSON.stringify({ event: "charge.success", data: { reference: "abc123" } });

describe("verifyPaystackSignature", () => {
  it("accepts a signature computed over the exact raw body with the secret key", () => {
    const signature = paystackSignature(RAW_BODY, SECRET);
    expect(verifyPaystackSignature(RAW_BODY, signature, SECRET)).toBe(true);
  });

  it("accepts when the raw body is a Buffer matching the signed bytes", () => {
    const buffer = Buffer.from(RAW_BODY, "utf8");
    const signature = paystackSignature(buffer, SECRET);
    expect(verifyPaystackSignature(buffer, signature, SECRET)).toBe(true);
  });

  it("rejects a signature produced with a different secret", () => {
    const signature = paystackSignature(RAW_BODY, "sk_test_other_secret");
    expect(verifyPaystackSignature(RAW_BODY, signature, SECRET)).toBe(false);
  });

  it("rejects when the body is tampered after signing (replay/forgery)", () => {
    const signature = paystackSignature(RAW_BODY, SECRET);
    const tampered = JSON.stringify({ event: "charge.success", data: { reference: "evil" } });
    expect(verifyPaystackSignature(tampered, signature, SECRET)).toBe(false);
  });

  it("rejects a malformed signature without throwing", () => {
    expect(verifyPaystackSignature(RAW_BODY, "not-a-real-hex-signature", SECRET)).toBe(false);
  });

  it("rejects when the signature is missing", () => {
    expect(verifyPaystackSignature(RAW_BODY, null, SECRET)).toBe(false);
  });

  it("rejects when the raw body is missing", () => {
    const signature = paystackSignature(RAW_BODY, SECRET);
    expect(verifyPaystackSignature(null, signature, SECRET)).toBe(false);
  });

  it("rejects when no secret key is configured", () => {
    const signature = paystackSignature(RAW_BODY, SECRET);
    expect(verifyPaystackSignature(RAW_BODY, signature, null)).toBe(false);
  });
});
