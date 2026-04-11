import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { DatasheetExtractionService } from "./datasheet-extraction.service";

describe("DatasheetExtractionService", () => {
  let service: DatasheetExtractionService;

  const mockAiChatService = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasheetExtractionService,
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<DatasheetExtractionService>(DatasheetExtractionService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("extractFromBuffer", () => {
    it("rejects unsupported mime types", async () => {
      const buffer = Buffer.from("not a pdf");
      await expect(service.extractFromBuffer(buffer, "text/plain")).rejects.toThrow(
        /Unsupported datasheet mime type/,
      );
    });

    it("returns parsed JSON from a successful AI call", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({
        content: '{"densityKgPerM3": 940, "shoreHardness": 70}',
      });
      const result = await service.extractFromBuffer(Buffer.from("pdf bytes"), "application/pdf");
      expect(result.data).toEqual({ densityKgPerM3: 940, shoreHardness: 70 });
      expect(result.model).toBe("gemini");
    });

    it("strips markdown code fences from the AI response", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({
        content: '```json\n{"densityKgPerM3": 1000}\n```',
      });
      const result = await service.extractFromBuffer(Buffer.from("pdf"), "application/pdf");
      expect(result.data).toEqual({ densityKgPerM3: 1000 });
    });

    it("throws when the AI returns invalid JSON", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({ content: "not json" });
      await expect(
        service.extractFromBuffer(Buffer.from("pdf"), "application/pdf"),
      ).rejects.toThrow();
    });
  });
});
