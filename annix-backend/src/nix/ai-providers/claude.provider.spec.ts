import { ClaudeProvider } from "./claude.provider";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ClaudeProvider", () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    provider = new ClaudeProvider();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("constructor", () => {
    it("should use env API key by default", () => {
      expect(provider.name).toBe("claude");
    });

    it("should use provided config API key", () => {
      const customProvider = new ClaudeProvider({ apiKey: "custom-key" });
      expect(customProvider.name).toBe("claude");
    });

    it("should use provided model", () => {
      const customProvider = new ClaudeProvider({ apiKey: "key", model: "claude-3-opus" });
      expect(customProvider.name).toBe("claude");
    });
  });

  describe("isAvailable", () => {
    it("should return true when API key is configured", async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("should return false when API key is not configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const providerWithoutKey = new ClaudeProvider();

      const result = await providerWithoutKey.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe("extractItems", () => {
    const mockRequest = {
      text: "200NB Pipe, Sch 40, 6m long\n300NB 45 degree bend",
      documentName: "test-doc.pdf",
    };

    const mockClaudeResponse = {
      content: [
        {
          text: JSON.stringify({
            items: [
              {
                itemNumber: "1",
                description: "200NB Pipe, Sch 40, 6m long",
                itemType: "pipe",
                diameter: 200,
                schedule: "Sch 40",
                length: 6,
                quantity: 1,
                confidence: 0.95,
              },
              {
                itemNumber: "2",
                description: "300NB 45 degree bend",
                itemType: "bend",
                diameter: 300,
                angle: 45,
                quantity: 1,
                confidence: 0.9,
              },
            ],
            specifications: { standard: "ASME B36.10" },
            metadata: { documentType: "rfq" },
          }),
        },
      ],
      usage: { input_tokens: 500, output_tokens: 200 },
    };

    it("should throw error when API key not configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const providerWithoutKey = new ClaudeProvider();

      await expect(providerWithoutKey.extractItems(mockRequest)).rejects.toThrow(
        "Anthropic API key not configured",
      );
    });

    it("should extract items from text successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockClaudeResponse),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        itemType: "pipe",
        diameter: 200,
        schedule: "Sch 40",
        length: 6,
      });
      expect(result.items[1]).toMatchObject({
        itemType: "bend",
        diameter: 300,
        angle: 45,
      });
      expect(result.specifications).toEqual({ standard: "ASME B36.10" });
      expect(result.tokensUsed).toBe(700);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should call Claude API with correct parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockClaudeResponse),
      });

      await provider.extractItems(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "test-api-key",
            "anthropic-version": "2023-06-01",
          },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe("claude-3-haiku-20240307");
      expect(body.max_tokens).toBe(8192);
      expect(body.temperature).toBe(0.1);
      expect(body.messages[0].content).toContain("test-doc.pdf");
      expect(body.messages[0].content).toContain("200NB Pipe");
    });

    it("should include hints in the prompt when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockClaudeResponse),
      });

      await provider.extractItems({
        ...mockRequest,
        hints: {
          projectContext: "Oil refinery expansion project",
          expectedItemTypes: ["pipe", "bend", "flange"],
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.messages[0].content).toContain("Oil refinery expansion project");
      expect(body.messages[0].content).toContain("pipe, bend, flange");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Internal server error"),
      });

      await expect(provider.extractItems(mockRequest)).rejects.toThrow("Claude API error: 500");
    });

    it("should return empty response when no content in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ content: [] }),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(0);
    });

    it("should return empty response when response contains no JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: "I could not extract any items from this document." }],
        }),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(0);
    });

    it("should handle malformed JSON gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: "{ invalid json }" }],
        }),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(0);
    });

    describe("item type normalization", () => {
      it.each([
        ["elbow", "bend"],
        ["ELBOW", "bend"],
        ["90 degree elbow", "bend"],
        ["reducing tee", "reducer"],
        ["concentric reducer", "unknown"],
        ["weldneck flange", "unknown"],
        ["pipe", "pipe"],
        ["PIPE", "pipe"],
        ["bend", "bend"],
        ["tee", "tee"],
        ["flange", "flange"],
        ["expansion_joint", "expansion_joint"],
      ])('should normalize "%s" to "%s"', async (input, expected) => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            content: [
              {
                text: JSON.stringify({
                  items: [{ itemType: input, diameter: 100 }],
                }),
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0].itemType).toBe(expected);
      });
    });

    describe("flange config normalization", () => {
      it.each([
        ["none", "none"],
        ["one_end", "one_end"],
        ["both_ends", "both_ends"],
        ["both ends", "both_ends"],
        ["BOTH_ENDS", "both_ends"],
        ["puddle", "puddle"],
        ["blind", "blind"],
        ["invalid", undefined],
        ["", undefined],
        [null, undefined],
      ])('should normalize flange config "%s" to "%s"', async (input, expected) => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            content: [
              {
                text: JSON.stringify({
                  items: [{ itemType: "pipe", diameter: 100, flangeConfig: input }],
                }),
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0].flangeConfig).toBe(expected);
      });
    });

    describe("number parsing", () => {
      it("should convert string numbers to actual numbers", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            content: [
              {
                text: JSON.stringify({
                  items: [
                    {
                      itemType: "pipe",
                      diameter: "200",
                      length: "6.5",
                      wallThickness: "8.18",
                      quantity: "3",
                      confidence: "0.85",
                    },
                  ],
                }),
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0].diameter).toBe(200);
        expect(result.items[0].length).toBe(6.5);
        expect(result.items[0].wallThickness).toBe(8.18);
        expect(result.items[0].quantity).toBe(3);
        expect(result.items[0].confidence).toBe(0.85);
      });

      it("should handle null/missing numeric fields", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            content: [
              {
                text: JSON.stringify({
                  items: [{ itemType: "pipe", description: "Generic pipe" }],
                }),
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0].diameter).toBeNull();
        expect(result.items[0].length).toBeNull();
        expect(result.items[0].quantity).toBe(1);
      });
    });

    describe("default values", () => {
      it("should apply default values for missing fields", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            content: [
              {
                text: JSON.stringify({
                  items: [{ itemType: "pipe", diameter: 200 }],
                }),
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0]).toMatchObject({
          description: "",
          diameterUnit: "mm",
          quantity: 1,
          unit: "ea",
          confidence: 0.8,
        });
      });
    });
  });
});
