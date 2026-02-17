import { GeminiProvider } from "./gemini.provider";

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("GeminiProvider", () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    provider = new GeminiProvider();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  describe("constructor", () => {
    it("should use env API key by default", () => {
      expect(provider.name).toBe("gemini");
    });

    it("should use provided config API key", () => {
      const customProvider = new GeminiProvider({ apiKey: "custom-key" });
      expect(customProvider.name).toBe("gemini");
    });

    it("should use provided model", () => {
      const customProvider = new GeminiProvider({ apiKey: "key", model: "gemini-pro" });
      expect(customProvider.name).toBe("gemini");
    });
  });

  describe("isAvailable", () => {
    it("should return true when API key is configured", async () => {
      const result = await provider.isAvailable();
      expect(result).toBe(true);
    });

    it("should return false when API key is not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      const providerWithoutKey = new GeminiProvider();

      const result = await providerWithoutKey.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe("extractItems", () => {
    const mockRequest = {
      text: "200NB Pipe, Sch 40, 6m long\n300NB 45 degree bend",
      documentName: "test-doc.pdf",
    };

    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
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
          },
        },
      ],
      usageMetadata: { totalTokenCount: 450 },
    };

    it("should throw error when API key not configured", async () => {
      delete process.env.GEMINI_API_KEY;
      const providerWithoutKey = new GeminiProvider();

      await expect(providerWithoutKey.extractItems(mockRequest)).rejects.toThrow(
        "Gemini API key not configured",
      );
    });

    it("should extract items from text successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeminiResponse),
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
      expect(result.tokensUsed).toBe(450);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should call Gemini API with correct parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeminiResponse),
      });

      await provider.extractItems(mockRequest);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("gemini-1.5-flash:generateContent"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.generationConfig.temperature).toBe(0.1);
      expect(body.generationConfig.maxOutputTokens).toBe(8192);
      expect(body.generationConfig.responseMimeType).toBe("application/json");
    });

    it("should include document name and text in request", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeminiResponse),
      });

      await provider.extractItems(mockRequest);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userPromptPart = body.contents[0].parts[1].text;
      expect(userPromptPart).toContain("test-doc.pdf");
      expect(userPromptPart).toContain("200NB Pipe");
    });

    it("should include hints in the prompt when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockGeminiResponse),
      });

      await provider.extractItems({
        ...mockRequest,
        hints: {
          projectContext: "Mining project",
          expectedItemTypes: ["pipe", "bend"],
        },
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const userPromptPart = body.contents[0].parts[1].text;
      expect(userPromptPart).toContain("Mining project");
      expect(userPromptPart).toContain("pipe, bend");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Internal server error"),
      });

      await expect(provider.extractItems(mockRequest)).rejects.toThrow("Gemini API error: 500");
    });

    it("should return empty response when no content in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ candidates: [{ content: { parts: [] } }] }),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(0);
    });

    it("should return empty response when response contains no JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: "I could not extract any items from this document." }],
              },
            },
          ],
        }),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(0);
    });

    it("should handle malformed JSON gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: "{ invalid json }" }] } }],
        }),
      });

      const result = await provider.extractItems(mockRequest);

      expect(result.items).toHaveLength(0);
    });

    describe("item type normalization", () => {
      it.each([
        ["elbow", "bend"],
        ["90 elbow", "bend"],
        ["reducing tee", "reducer"],
        ["pipe", "pipe"],
        ["BEND", "bend"],
        ["TEE", "tee"],
        ["FLANGE", "flange"],
        ["reducer", "reducer"],
        ["expansion_joint", "expansion_joint"],
        ["unknown_type", "unknown"],
      ])('should normalize "%s" to "%s"', async (input, expected) => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [{ itemType: input, diameter: 100 }],
                      }),
                    },
                  ],
                },
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
        ["puddle", "puddle"],
        ["blind", "blind"],
        ["invalid", undefined],
      ])('should normalize flange config "%s" to "%s"', async (input, expected) => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [{ itemType: "pipe", diameter: 100, flangeConfig: input }],
                      }),
                    },
                  ],
                },
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
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [
                          {
                            itemType: "pipe",
                            diameter: "200",
                            length: "6.5",
                            wallThickness: "8.18",
                            quantity: "3",
                            angle: "45",
                            secondaryDiameter: "150",
                            confidence: "0.85",
                          },
                        ],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0].diameter).toBe(200);
        expect(result.items[0].length).toBe(6.5);
        expect(result.items[0].wallThickness).toBe(8.18);
        expect(result.items[0].quantity).toBe(3);
        expect(result.items[0].angle).toBe(45);
        expect(result.items[0].secondaryDiameter).toBe(150);
        expect(result.items[0].confidence).toBe(0.85);
      });

      it("should handle null/missing numeric fields", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [{ itemType: "pipe", description: "Generic pipe" }],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        });

        const result = await provider.extractItems(mockRequest);

        expect(result.items[0].diameter).toBeNull();
        expect(result.items[0].length).toBeNull();
        expect(result.items[0].angle).toBeNull();
        expect(result.items[0].secondaryDiameter).toBeNull();
        expect(result.items[0].quantity).toBe(1);
      });
    });

    describe("default values", () => {
      it("should apply default values for missing fields", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [{ itemType: "pipe", diameter: 200 }],
                      }),
                    },
                  ],
                },
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
          itemNumber: null,
          material: null,
          materialGrade: null,
          schedule: null,
          rawText: null,
        });
      });
    });
  });
});
