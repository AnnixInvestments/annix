import { HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { AnyUserAuthGuard } from "../../auth/guards/any-user-auth.guard";
import { NixChatMessage } from "../entities/nix-chat-message.entity";
import { NixChatSession } from "../entities/nix-chat-session.entity";
import { NixChatItemService } from "../services/nix-chat-item.service";
import { NixChatService } from "../services/nix-chat.service";
import { NixValidationService, ValidationIssue } from "../services/nix-validation.service";
import { NixChatController } from "./nix-chat.controller";

describe("NixChatController", () => {
  let controller: NixChatController;
  let chatService: jest.Mocked<NixChatService>;
  let validationService: jest.Mocked<NixValidationService>;

  const mockSession = {
    id: 1,
    userId: 100,
    rfqId: undefined as unknown as number,
    isActive: true,
    userPreferences: { learningEnabled: true },
    sessionContext: {},
    lastInteractionAt: new Date("2024-01-15T10:00:00Z"),
    createdAt: new Date("2024-01-15T09:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
    conversationHistory: [],
  } as NixChatSession;

  const mockMessage = {
    id: 1,
    sessionId: 1,
    role: "user" as const,
    content: "Hello",
    metadata: null,
    createdAt: new Date("2024-01-15T10:00:00Z"),
  } as unknown as NixChatMessage;

  const mockRequest = {
    authUser: { userId: 100 },
  };

  beforeEach(async () => {
    const mockChatService = {
      createSession: jest.fn(),
      session: jest.fn(),
      conversationHistory: jest.fn(),
      sendMessage: jest.fn(),
      streamMessage: jest.fn(),
      updateUserPreferences: jest.fn(),
      recordCorrection: jest.fn(),
      endSession: jest.fn(),
    };

    const mockValidationService = {
      validateItem: jest.fn(),
      validateRfq: jest.fn(),
    };

    const mockChatItemService = {
      parseItemsFromMessage: jest.fn(),
      createItemsFromChat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NixChatController],
      providers: [
        { provide: NixChatService, useValue: mockChatService },
        { provide: NixValidationService, useValue: mockValidationService },
        { provide: NixChatItemService, useValue: mockChatItemService },
      ],
    })
      .overrideGuard(AnyUserAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NixChatController>(NixChatController);
    chatService = module.get(NixChatService);
    validationService = module.get(NixValidationService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /session (createSession)", () => {
    it("should create a session and return session info", async () => {
      chatService.createSession.mockResolvedValue(mockSession);

      const result = await controller.createSession(mockRequest, { rfqId: undefined });

      expect(result).toEqual({
        sessionId: 1,
        isActive: true,
        userPreferences: { learningEnabled: true },
      });
      expect(chatService.createSession).toHaveBeenCalledWith({
        userId: 100,
        rfqId: undefined,
      });
    });

    it("should create a session with rfqId when provided", async () => {
      const sessionWithRfq = { ...mockSession, rfqId: 50 };
      chatService.createSession.mockResolvedValue(sessionWithRfq);

      const result = await controller.createSession(mockRequest, { rfqId: 50 });

      expect(result.sessionId).toBe(1);
      expect(chatService.createSession).toHaveBeenCalledWith({
        userId: 100,
        rfqId: 50,
      });
    });
  });

  describe("GET /session/:sessionId (getSession)", () => {
    it("should return session details", async () => {
      chatService.session.mockResolvedValue(mockSession);

      const result = await controller.getSession(1);

      expect(result).toEqual({
        sessionId: 1,
        userId: 100,
        rfqId: undefined,
        isActive: true,
        userPreferences: { learningEnabled: true },
        lastInteractionAt: mockSession.lastInteractionAt,
        createdAt: mockSession.createdAt,
      });
      expect(chatService.session).toHaveBeenCalledWith(1);
    });

    it("should return session with rfqId when present", async () => {
      const sessionWithRfq = { ...mockSession, rfqId: 50 };
      chatService.session.mockResolvedValue(sessionWithRfq);

      const result = await controller.getSession(1);

      expect(result.rfqId).toBe(50);
    });
  });

  describe("GET /session/:sessionId/history (getHistory)", () => {
    it("should return conversation history in chronological order", async () => {
      const messages = [
        { ...mockMessage, id: 2, content: "Newer" },
        { ...mockMessage, id: 1, content: "Older" },
      ];
      chatService.conversationHistory.mockResolvedValue(messages);

      const result = await controller.getHistory(1, mockRequest);

      expect(result.sessionId).toBe(1);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe("Older");
      expect(result.messages[1].content).toBe("Newer");
    });

    it("should return empty messages array when no history", async () => {
      chatService.conversationHistory.mockResolvedValue([]);

      const result = await controller.getHistory(1, mockRequest);

      expect(result.messages).toEqual([]);
    });

    it("should map message fields correctly", async () => {
      const message = {
        ...mockMessage,
        metadata: { tokensUsed: 100 },
      };
      chatService.conversationHistory.mockResolvedValue([message]);

      const result = await controller.getHistory(1, mockRequest);

      expect(result.messages[0]).toEqual({
        id: 1,
        role: "user",
        content: "Hello",
        metadata: { tokensUsed: 100 },
        createdAt: message.createdAt,
      });
    });
  });

  describe("POST /session/:sessionId/message (sendMessage)", () => {
    it("should send a message and return response", async () => {
      const response = {
        sessionId: 1,
        messageId: 10,
        content: "Hello! How can I help?",
        metadata: { tokensUsed: 150, processingTimeMs: 500 },
      };
      chatService.sendMessage.mockResolvedValue(response);

      const result = await controller.sendMessage(1, { message: "Hello" });

      expect(result).toEqual(response);
      expect(chatService.sendMessage).toHaveBeenCalledWith({
        sessionId: 1,
        message: "Hello",
        context: undefined,
      });
    });

    it("should pass context to service when provided", async () => {
      chatService.sendMessage.mockResolvedValue({ sessionId: 1, messageId: 11, content: "OK" });
      const context = { currentRfqItems: [{ diameter: 200 }] };

      await controller.sendMessage(1, { message: "Check items", context });

      expect(chatService.sendMessage).toHaveBeenCalledWith({
        sessionId: 1,
        message: "Check items",
        context,
      });
    });

    it("should throw TOO_MANY_REQUESTS on rate limit error", async () => {
      chatService.sendMessage.mockRejectedValue(new Error("rate limit exceeded"));

      await expect(controller.sendMessage(1, { message: "Hello" })).rejects.toThrow(HttpException);

      try {
        await controller.sendMessage(1, { message: "Hello" });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it("should throw SERVICE_UNAVAILABLE on other errors", async () => {
      chatService.sendMessage.mockRejectedValue(new Error("API failed"));

      await expect(controller.sendMessage(1, { message: "Hello" })).rejects.toThrow(HttpException);

      try {
        await controller.sendMessage(1, { message: "Hello" });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  describe("POST /session/:sessionId/stream (streamMessage)", () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
    });

    it("should set correct SSE headers", async () => {
      const generator = (async function* () {
        yield { type: "content_delta", delta: "Hello" };
      })();
      chatService.streamMessage.mockReturnValue(generator);

      await controller.streamMessage(1, { message: "Hi" }, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Accel-Buffering", "no");
    });

    it("should stream chunks as SSE data events", async () => {
      const generator = (async function* () {
        yield { type: "message_start" };
        yield { type: "content_delta", delta: "Hello" };
        yield { type: "content_delta", delta: " world" };
        yield { type: "message_stop" };
      })();
      chatService.streamMessage.mockReturnValue(generator);

      await controller.streamMessage(1, { message: "Hi" }, mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith('data: {"type":"message_start"}\n\n');
      expect(mockResponse.write).toHaveBeenCalledWith(
        'data: {"type":"content_delta","delta":"Hello"}\n\n',
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        'data: {"type":"content_delta","delta":" world"}\n\n',
      );
      expect(mockResponse.write).toHaveBeenCalledWith('data: {"type":"message_stop"}\n\n');
      expect(mockResponse.write).toHaveBeenCalledWith("data: [DONE]\n\n");
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it("should handle stream errors gracefully", async () => {
      const generator = (async function* () {
        yield { type: "content_delta", delta: "Hello" };
        throw new Error("Stream failed");
      })();
      chatService.streamMessage.mockReturnValue(generator);

      await controller.streamMessage(1, { message: "Hi" }, mockResponse as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(
        'data: {"type":"error","error":"Stream failed"}\n\n',
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it("should pass context to service when provided", async () => {
      const generator = (async function* () {
        yield { type: "message_stop" };
      })();
      chatService.streamMessage.mockReturnValue(generator);
      const context = { selectedItem: { id: 5 } };

      await controller.streamMessage(1, { message: "Hi", context }, mockResponse as Response);

      expect(chatService.streamMessage).toHaveBeenCalledWith({
        sessionId: 1,
        message: "Hi",
        context,
      });
    });
  });

  describe("POST /session/:sessionId/preferences (updatePreferences)", () => {
    it("should update preferences and return success", async () => {
      chatService.updateUserPreferences.mockResolvedValue(undefined);

      const preferences = { learningEnabled: false, preferredMaterials: ["Carbon Steel"] };
      const result = await controller.updatePreferences(1, preferences);

      expect(result).toEqual({ success: true });
      expect(chatService.updateUserPreferences).toHaveBeenCalledWith(1, preferences);
    });
  });

  describe("POST /session/:sessionId/correction (recordCorrection)", () => {
    it("should record correction and return success", async () => {
      chatService.recordCorrection.mockResolvedValue(undefined);

      const correction = {
        extractedValue: "200mm",
        correctedValue: "200NB",
        fieldType: "diameter",
      };
      const result = await controller.recordCorrection(1, correction);

      expect(result).toEqual({ success: true });
      expect(chatService.recordCorrection).toHaveBeenCalledWith(1, correction);
    });
  });

  describe("POST /session/:sessionId/end (endSession)", () => {
    it("should end session and return success", async () => {
      chatService.endSession.mockResolvedValue(undefined);

      const result = await controller.endSession(1);

      expect(result).toEqual({ success: true });
      expect(chatService.endSession).toHaveBeenCalledWith(1);
    });
  });

  describe("POST /validate/item (validateItem)", () => {
    it("should return valid true when no errors", () => {
      const issues: ValidationIssue[] = [
        { severity: "warning", field: "material", message: "Check material" },
        { severity: "info", field: "length", message: "Long pipe" },
      ];
      validationService.validateItem.mockReturnValue(issues);

      const item = { itemType: "pipe", diameter: 200 };
      const result = controller.validateItem({ item });

      expect(result).toEqual({
        valid: true,
        issues,
      });
      expect(validationService.validateItem).toHaveBeenCalledWith(item, undefined);
    });

    it("should return valid false when errors present", () => {
      const issues: ValidationIssue[] = [
        { severity: "error", field: "schedule", message: "Invalid schedule" },
        { severity: "warning", field: "material", message: "Check material" },
      ];
      validationService.validateItem.mockReturnValue(issues);

      const item = { itemType: "pipe", diameter: 600, schedule: "Sch 10" };
      const result = controller.validateItem({ item });

      expect(result).toEqual({
        valid: false,
        issues,
      });
    });

    it("should pass context to validation service", () => {
      validationService.validateItem.mockReturnValue([]);

      const item = { itemType: "pipe", diameter: 200 };
      const context = { allItems: [item], itemIndex: 0 };
      controller.validateItem({ item, context });

      expect(validationService.validateItem).toHaveBeenCalledWith(item, context);
    });
  });

  describe("POST /validate/rfq (validateRfq)", () => {
    it("should return valid true when no errors", () => {
      const issues: ValidationIssue[] = [
        { severity: "info", field: "schedule", message: "Multiple schedules", itemIndex: 0 },
      ];
      validationService.validateRfq.mockReturnValue(issues);

      const items = [{ itemType: "pipe", diameter: 200 }];
      const result = controller.validateRfq({ items });

      expect(result).toEqual({
        valid: true,
        issues,
        summary: {
          errors: 0,
          warnings: 0,
          info: 1,
        },
      });
      expect(validationService.validateRfq).toHaveBeenCalledWith(items);
    });

    it("should return valid false when errors present", () => {
      const issues: ValidationIssue[] = [
        { severity: "error", field: "schedule", message: "Invalid", itemIndex: 0 },
        { severity: "error", field: "diameter", message: "Missing", itemIndex: 1 },
        { severity: "warning", field: "material", message: "Check", itemIndex: 0 },
        { severity: "info", field: "length", message: "Long", itemIndex: 0 },
      ];
      validationService.validateRfq.mockReturnValue(issues);

      const items = [{ itemType: "pipe", diameter: 600, schedule: "Sch 10" }, { itemType: "bend" }];
      const result = controller.validateRfq({ items });

      expect(result).toEqual({
        valid: false,
        issues,
        summary: {
          errors: 2,
          warnings: 1,
          info: 1,
        },
      });
    });

    it("should return valid true for empty items array", () => {
      validationService.validateRfq.mockReturnValue([]);

      const result = controller.validateRfq({ items: [] });

      expect(result).toEqual({
        valid: true,
        issues: [],
        summary: {
          errors: 0,
          warnings: 0,
          info: 0,
        },
      });
    });
  });
});
