import { Test, TestingModule } from "@nestjs/testing";
import { ClaudeChatProvider } from "../ai-providers/claude-chat.provider";
import { NixItemParserService } from "./nix-item-parser.service";

jest.mock("../ai-providers/claude-chat.provider");

describe("NixItemParserService", () => {
  let service: NixItemParserService;
  let mockChatProvider: jest.Mocked<ClaudeChatProvider>;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockChatProvider = {
      chat: jest.fn(),
    } as unknown as jest.Mocked<ClaudeChatProvider>;

    (ClaudeChatProvider as jest.MockedClass<typeof ClaudeChatProvider>).mockImplementation(
      () => mockChatProvider,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [NixItemParserService],
    }).compile();

    service = module.get<NixItemParserService>(NixItemParserService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseUserIntent", () => {
    describe("create_item intents", () => {
      it("should parse a simple pipe creation request", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
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
        );

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
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
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
        );

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
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
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
        );

        const result = await service.parseUserIntent("Add a reducer from 300NB to 200NB");

        expect(result.action).toBe("create_item");
        expect(result.itemType).toBe("reducer");
        expect(result.specifications?.diameter).toBe(300);
        expect(result.specifications?.secondaryDiameter).toBe(200);
      });

      it("should parse quantity from user message", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
            action: "create_item",
            itemType: "pipe",
            specifications: {
              diameter: 200,
              quantity: 12,
            },
            confidence: 0.95,
            explanation: "Creating 12 pipes at 200NB",
          }),
        );

        const result = await service.parseUserIntent("I need 12 pipes at 200NB");

        expect(result.specifications?.quantity).toBe(12);
      });

      it("should parse material and grade", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
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
        );

        const result = await service.parseUserIntent("Add a 200NB carbon steel pipe, A106 Grade B");

        expect(result.specifications?.material).toBe("Carbon Steel");
        expect(result.specifications?.materialGrade).toBe("ASTM A106 Grade B");
      });
    });

    describe("question intents", () => {
      it("should identify validation question intent", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
            action: "question",
            confidence: 1.0,
            explanation: "User is asking about validation issues",
          }),
        );

        const result = await service.parseUserIntent("What validation issues do I have?");

        expect(result.action).toBe("question");
        expect(result.confidence).toBe(1.0);
      });

      it("should identify general piping question intent", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
            action: "question",
            confidence: 0.95,
            explanation: "User is asking about flange ratings",
          }),
        );

        const result = await service.parseUserIntent("What are the different flange ratings?");

        expect(result.action).toBe("question");
      });
    });

    describe("context-aware parsing", () => {
      it("should include context in the prompt when items exist", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
            action: "create_item",
            itemType: "bend",
            specifications: {
              diameter: 300,
              quantity: 4,
            },
            confidence: 0.6,
            explanation: "Creating 4 similar items at 300NB",
          }),
        );

        const context = {
          currentItems: [{ diameter: 200, itemType: "pipe", description: "200NB pipe" }],
        };

        const result = await service.parseUserIntent("Add 4 more of those but at 300NB", context);

        expect(mockChatProvider.chat).toHaveBeenCalled();
        const callArgs = mockChatProvider.chat.mock.calls[0];
        expect(callArgs[1]).toContain("Current RFQ Context");
      });
    });

    describe("error handling", () => {
      it("should return unknown intent when no JSON in response", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          "I'm not sure what you mean. Could you please clarify?",
        );

        const result = await service.parseUserIntent("asdfghjkl");

        expect(result.action).toBe("unknown");
        expect(result.confidence).toBe(0.0);
      });

      it("should return unknown intent when chat fails", async () => {
        mockChatProvider.chat.mockRejectedValueOnce(new Error("API error"));

        const result = await service.parseUserIntent("Add a pipe");

        expect(result.action).toBe("unknown");
        expect(result.confidence).toBe(0.0);
      });

      it("should handle malformed JSON gracefully", async () => {
        mockChatProvider.chat.mockResolvedValueOnce("{invalid json here}");

        const result = await service.parseUserIntent("Add a pipe");

        expect(result.action).toBe("unknown");
      });
    });

    describe("response structure", () => {
      it("should always return required fields", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
            action: "create_item",
            itemType: "pipe",
          }),
        );

        const result = await service.parseUserIntent("Add a pipe");

        expect(result).toHaveProperty("action");
        expect(result).toHaveProperty("confidence");
        expect(result).toHaveProperty("explanation");
      });

      it("should provide default values for missing fields", async () => {
        mockChatProvider.chat.mockResolvedValueOnce(
          JSON.stringify({
            action: "create_item",
          }),
        );

        const result = await service.parseUserIntent("Add something");

        expect(result.confidence).toBe(0.5);
        expect(result.explanation).toBe("Parsed user intent");
        expect(result.specifications).toEqual({});
      });
    });
  });
});
