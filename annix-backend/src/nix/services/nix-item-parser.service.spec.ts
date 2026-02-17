import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { NixItemParserService } from "./nix-item-parser.service";

describe("NixItemParserService", () => {
  let service: NixItemParserService;
  let mockAiChatService: jest.Mocked<AiChatService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockAiChatService = {
      chat: jest.fn(),
      streamChat: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      availableProviders: jest.fn().mockResolvedValue(["gemini"]),
    } as unknown as jest.Mocked<AiChatService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NixItemParserService,
        { provide: AiChatService, useValue: mockAiChatService },
      ],
    }).compile();

    service = module.get<NixItemParserService>(NixItemParserService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseUserIntent", () => {
    describe("create_item intents", () => {
      it("should parse a simple pipe creation request", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "pipe",
            specifications: {
              diameter: 200,
              length: 6,
              schedule: "Sch 40",
              quantity: 1,
            },
            confidence: 0.95,
            explanation: "Creating a 200NB pipe, 6m long, Sch 40",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent(
          "Add a 200NB pipe, 6 meters long, schedule 40",
        );

        expect(result.action).toBe("create_item");
        expect(result.itemType).toBe("pipe");
        expect(result.specifications?.diameter).toBe(200);
        expect(result.specifications?.length).toBe(6);
        expect(result.specifications?.schedule).toBe("Sch 40");
        expect(result.confidence).toBeGreaterThan(0.9);
      });

      it("should parse a bend creation request with angle and flanges", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "bend",
            specifications: {
              diameter: 200,
              angle: 45,
              flangeConfig: "both_ends",
              flangeRating: "PN16",
              quantity: 1,
            },
            confidence: 0.9,
            explanation: "Creating a 200NB bend at 45deg with flanges both ends",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent(
          "Add a 200NB bend at 45 degrees with flanges both ends, PN16",
        );

        expect(result.action).toBe("create_item");
        expect(result.itemType).toBe("bend");
        expect(result.specifications?.diameter).toBe(200);
        expect(result.specifications?.angle).toBe(45);
        expect(result.specifications?.flangeConfig).toBe("both_ends");
        expect(result.specifications?.flangeRating).toBe("PN16");
      });

      it("should parse a reducer creation request", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "reducer",
            specifications: {
              diameter: 300,
              secondaryDiameter: 200,
              quantity: 1,
            },
            confidence: 0.9,
            explanation: "Creating a reducer from 300NB to 200NB",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("Add a reducer from 300NB to 200NB");

        expect(result.action).toBe("create_item");
        expect(result.itemType).toBe("reducer");
        expect(result.specifications?.diameter).toBe(300);
        expect(result.specifications?.secondaryDiameter).toBe(200);
      });

      it("should parse quantity from user message", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "pipe",
            specifications: {
              diameter: 200,
              quantity: 12,
            },
            confidence: 0.95,
            explanation: "Creating 12 pipes at 200NB",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("I need 12 pipes at 200NB");

        expect(result.specifications?.quantity).toBe(12);
      });

      it("should parse material and grade", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "pipe",
            specifications: {
              diameter: 200,
              material: "Carbon Steel",
              materialGrade: "ASTM A106 Grade B",
              quantity: 1,
            },
            confidence: 0.95,
            explanation: "Creating a 200NB carbon steel pipe, A106 Grade B",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("Add a 200NB carbon steel pipe, A106 Grade B");

        expect(result.specifications?.material).toBe("Carbon Steel");
        expect(result.specifications?.materialGrade).toBe("ASTM A106 Grade B");
      });
    });

    describe("question intents", () => {
      it("should identify validation question intent", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "question",
            confidence: 1.0,
            explanation: "User is asking about validation issues",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("What validation issues do I have?");

        expect(result.action).toBe("question");
        expect(result.confidence).toBe(1.0);
      });

      it("should identify general piping question intent", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "question",
            confidence: 0.95,
            explanation: "User is asking about flange ratings",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("What are the different flange ratings?");

        expect(result.action).toBe("question");
      });
    });

    describe("context-aware parsing", () => {
      it("should include context in the prompt when items exist", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "bend",
            specifications: {
              diameter: 300,
              quantity: 4,
            },
            confidence: 0.6,
            explanation: "Creating 4 similar items at 300NB",
          }),
          providerUsed: "gemini",
        });

        const context = {
          currentItems: [{ diameter: 200, itemType: "pipe", description: "200NB pipe" }],
        };

        const result = await service.parseUserIntent("Add 4 more of those but at 300NB", context);

        expect(mockAiChatService.chat).toHaveBeenCalled();
        const callArgs = mockAiChatService.chat.mock.calls[0];
        expect(callArgs[1]).toContain("Current RFQ Context");
      });
    });

    describe("error handling", () => {
      it("should return unknown intent when no JSON in response", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: "I'm not sure what you mean. Could you please clarify?",
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("asdfghjkl");

        expect(result.action).toBe("unknown");
        expect(result.confidence).toBe(0.0);
      });

      it("should return unknown intent when chat fails", async () => {
        mockAiChatService.chat.mockRejectedValueOnce(new Error("API error"));

        const result = await service.parseUserIntent("Add a pipe");

        expect(result.action).toBe("unknown");
        expect(result.confidence).toBe(0.0);
      });

      it("should handle malformed JSON gracefully", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: "{invalid json here}",
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("Add a pipe");

        expect(result.action).toBe("unknown");
      });
    });

    describe("response structure", () => {
      it("should always return required fields", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
            itemType: "pipe",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("Add a pipe");

        expect(result).toHaveProperty("action");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("explanation");
      });

      it("should provide default values for missing fields", async () => {
        mockAiChatService.chat.mockResolvedValueOnce({
          content: JSON.stringify({
            action: "create_item",
          }),
          providerUsed: "gemini",
        });

        const result = await service.parseUserIntent("Add something");

        expect(result.confidence).toBe(0.5);
        expect(result.explanation).toBe("Parsed user intent");
        expect(result.specifications).toEqual({});
      });
    });
  });

  describe("parseMultipleItems", () => {
    it("should parse multiple items from a single message", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          items: [
            {
              action: "create_item",
              itemType: "pipe",
              specifications: { diameter: 200, quantity: 5 },
              confidence: 0.95,
              explanation: "5x 200NB pipes",
              originalText: "200NB pipes x 5",
            },
            {
              action: "create_item",
              itemType: "bend",
              specifications: { diameter: 200, angle: 90, quantity: 1 },
              confidence: 0.95,
              explanation: "90° bend at 200NB",
              originalText: "90 degree bend at 200NB",
            },
          ],
        }),
        providerUsed: "gemini",
      });

      const result = await service.parseMultipleItems(
        "I need 200NB pipes x 5 and a 90 degree bend at 200NB",
      );

      expect(result.items).toHaveLength(2);
      expect(result.hasMultipleItems).toBe(true);
      expect(result.items[0].itemType).toBe("pipe");
      expect(result.items[0].specifications?.quantity).toBe(5);
      expect(result.items[1].itemType).toBe("bend");
      expect(result.items[1].specifications?.angle).toBe(90);
    });

    it("should calculate average confidence for multiple items", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          items: [
            { action: "create_item", itemType: "pipe", confidence: 0.9, specifications: {} },
            { action: "create_item", itemType: "bend", confidence: 0.8, specifications: {} },
          ],
        }),
        providerUsed: "gemini",
      });

      const result = await service.parseMultipleItems("Add a pipe and a bend");

      expect(result.totalConfidence).toBeCloseTo(0.85, 2);
    });

    it("should handle single item response wrapped in items array", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          items: [
            {
              action: "create_item",
              itemType: "pipe",
              specifications: { diameter: 200 },
              confidence: 0.95,
            },
          ],
        }),
        providerUsed: "gemini",
      });

      const result = await service.parseMultipleItems("Add a 200NB pipe");

      expect(result.items).toHaveLength(1);
      expect(result.hasMultipleItems).toBe(false);
    });

    it("should handle flat response without items array", async () => {
      mockAiChatService.chat.mockResolvedValueOnce({
        content: JSON.stringify({
          action: "create_item",
          itemType: "pipe",
          specifications: { diameter: 200 },
          confidence: 0.95,
        }),
        providerUsed: "gemini",
      });

      const result = await service.parseMultipleItems("Add a 200NB pipe");

      expect(result.items).toHaveLength(1);
      expect(result.hasMultipleItems).toBe(false);
      expect(result.items[0].itemType).toBe("pipe");
    });

    it("should return unknown intent on parse failure", async () => {
      mockAiChatService.chat.mockRejectedValueOnce(new Error("API error"));

      const result = await service.parseMultipleItems("Add some items");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe("unknown");
      expect(result.totalConfidence).toBe(0);
    });
  });
});
