import { ProductDataSheetKind } from "../entities/product-data-sheet.entity";
import { ProductDataSheetsService } from "./product-data-sheets.service";

describe("ProductDataSheetsService — untrusted-document hardening", () => {
  const buildService = (chatWithImage: jest.Mock) => {
    const service = Object.create(ProductDataSheetsService.prototype) as ProductDataSheetsService;
    (service as unknown as { logger: unknown }).logger = {
      log() {},
      warn() {},
      error() {},
      debug() {},
    };
    (service as unknown as { aiChatService: unknown }).aiChatService = { chatWithImage };
    return service;
  };

  it("passes a hardened system prompt to chatWithImage", async () => {
    const chatWithImage = jest.fn().mockResolvedValue({
      content: "{}",
      providerUsed: "gemini",
    });
    const service = buildService(chatWithImage);

    await (
      service as unknown as {
        extractWithGemini: (
          buffer: Buffer,
          mimeType: string,
          kind: ProductDataSheetKind,
        ) => Promise<unknown>;
      }
    ).extractWithGemini(Buffer.from("fake-image"), "image/png", ProductDataSheetKind.COATING);

    const systemPrompt = chatWithImage.mock.calls[0][3];
    expect(systemPrompt).toContain("UNTRUSTED DOCUMENT CONTENT");
  });
});
