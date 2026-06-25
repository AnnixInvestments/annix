import { verifyWhatsAppSignature, whatsAppSignature } from "./whatsapp-signature";

const SECRET = "meta_app_secret_example";
const RAW_BODY = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: { messages: [{ from: "27110000000" }] } }] }],
});

describe("verifyWhatsAppSignature", () => {
  it("accepts a signature computed over the exact raw body with the app secret", () => {
    const header = `sha256=${whatsAppSignature(RAW_BODY, SECRET)}`;
    expect(verifyWhatsAppSignature(RAW_BODY, header, SECRET)).toBe(true);
  });

  it("accepts a bare hex signature without the sha256= prefix", () => {
    const header = whatsAppSignature(RAW_BODY, SECRET);
    expect(verifyWhatsAppSignature(RAW_BODY, header, SECRET)).toBe(true);
  });

  it("accepts when the raw body is a Buffer matching the signed bytes", () => {
    const buffer = Buffer.from(RAW_BODY, "utf8");
    const header = `sha256=${whatsAppSignature(buffer, SECRET)}`;
    expect(verifyWhatsAppSignature(buffer, header, SECRET)).toBe(true);
  });

  it("rejects a signature produced with a different secret", () => {
    const header = `sha256=${whatsAppSignature(RAW_BODY, "other_app_secret")}`;
    expect(verifyWhatsAppSignature(RAW_BODY, header, SECRET)).toBe(false);
  });

  it("rejects when the body is tampered after signing (replay/forgery)", () => {
    const header = `sha256=${whatsAppSignature(RAW_BODY, SECRET)}`;
    const tampered = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: { messages: [{ from: "27999999999" }] } }] }],
    });
    expect(verifyWhatsAppSignature(tampered, header, SECRET)).toBe(false);
  });

  it("rejects a malformed signature without throwing", () => {
    expect(verifyWhatsAppSignature(RAW_BODY, "sha256=not-a-real-hex-signature", SECRET)).toBe(
      false,
    );
  });

  it("rejects when the signature header is missing", () => {
    expect(verifyWhatsAppSignature(RAW_BODY, null, SECRET)).toBe(false);
  });

  it("rejects when the raw body is missing", () => {
    const header = `sha256=${whatsAppSignature(RAW_BODY, SECRET)}`;
    expect(verifyWhatsAppSignature(null, header, SECRET)).toBe(false);
  });

  it("rejects when no app secret is configured", () => {
    const header = `sha256=${whatsAppSignature(RAW_BODY, SECRET)}`;
    expect(verifyWhatsAppSignature(RAW_BODY, header, null)).toBe(false);
  });
});
