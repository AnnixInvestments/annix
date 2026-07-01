import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AiChatService } from "../ai-providers/ai-chat.service";
import { NixCapabilityRegistry, WalkthroughEngine } from "../capabilities";
import { NixChatMessage } from "../entities/nix-chat-message.entity";
import { NixChatSession } from "../entities/nix-chat-session.entity";
import { NixChatMessageRepository } from "../nix-chat-message.repository";
import { NixChatSessionRepository } from "../nix-chat-session.repository";
import { NixChatService } from "./nix-chat.service";
import { NixItemParserService } from "./nix-item-parser.service";

describe("NixChatService", () => {
  let service: NixChatService;
  let sessionRepository: jest.Mocked<NixChatSessionRepository>;
  let messageRepository: jest.Mocked<NixChatMessageRepository>;

  const owner = { userId: 100, appScope: "customer" as const };
  const otherOwner = { userId: 200, appScope: "customer" as const };
  const crossAppOwner = { userId: 100, appScope: "stock-control" as const };

  const mockSession = {
    id: 1,
    userId: 100,
    appScope: "customer" as const,
    rfqId: undefined as unknown as number,
    isActive: true,
    conversationHistory: [],
    userPreferences: { learningEnabled: true },
    sessionContext: {},
    walkthroughState: null,
    lastInteractionAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as NixChatSession;

  const mockMessage = {
    id: 1,
    sessionId: 1,
    role: "user" as const,
    content: "Hello",
    metadata: null as unknown as NixChatMessage["metadata"],
    parentMessageId: undefined as unknown as number,
    createdAt: new Date(),
    session: undefined as unknown as NixChatSession,
  } as NixChatMessage;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.GEMINI_CHAT_MODEL = "gemini-2.0-flash";

    const mockSessionRepo = {
      findById: jest.fn(),
      findOwnedById: jest.fn(),
      findActiveForUser: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockMessageRepo = {
      findRecentForSession: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockItemParserService = {
      parseUserIntent: jest.fn(),
    };

    const mockAiChatService = {
      isAvailable: jest.fn().mockResolvedValue(true),
      chat: jest.fn().mockResolvedValue({ content: "AI response", providerUsed: "gemini" }),
      streamChat: jest.fn(),
      availableProviders: jest.fn().mockResolvedValue(["gemini"]),
    };

    const mockWalkthroughEngine = {
      start: jest.fn(),
      advance: jest.fn(),
      back: jest.fn(),
      skip: jest.fn(),
      stop: jest.fn(),
      state: jest.fn(),
      currentStepView: jest.fn(),
      stuckContext: jest.fn(),
    };
    const mockCapabilityRegistry = {
      matchWalkthroughIntent: jest.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NixChatService,
        { provide: NixChatSessionRepository, useValue: mockSessionRepo },
        { provide: NixChatMessageRepository, useValue: mockMessageRepo },
        { provide: NixItemParserService, useValue: mockItemParserService },
        { provide: AiChatService, useValue: mockAiChatService },
        { provide: WalkthroughEngine, useValue: mockWalkthroughEngine },
        { provide: NixCapabilityRegistry, useValue: mockCapabilityRegistry },
      ],
    }).compile();

    service = module.get<NixChatService>(NixChatService);
    sessionRepository = module.get(NixChatSessionRepository);
    messageRepository = module.get(NixChatMessageRepository);
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_CHAT_MODEL;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createSession", () => {
    it("should return existing active session if one exists", async () => {
      sessionRepository.findActiveForUser.mockResolvedValue(mockSession);

      const result = await service.createSession({ owner });

      expect(result).toEqual(mockSession);
      expect(sessionRepository.findActiveForUser).toHaveBeenCalledWith(owner, undefined);
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it("should create new session if no active session exists", async () => {
      sessionRepository.findActiveForUser.mockResolvedValue(null);
      sessionRepository.create.mockResolvedValue(mockSession);

      const result = await service.createSession({ owner });

      expect(result).toEqual(mockSession);
      expect(sessionRepository.create).toHaveBeenCalledWith({
        userId: 100,
        appScope: "customer",
        rfqId: undefined,
        isActive: true,
        conversationHistory: [],
        userPreferences: { learningEnabled: true },
        sessionContext: {},
        lastInteractionAt: expect.any(Date),
      });
    });

    it("should create session with rfqId when provided", async () => {
      sessionRepository.findActiveForUser.mockResolvedValue(null);
      sessionRepository.create.mockResolvedValue({ ...mockSession, rfqId: 50 });

      const result = await service.createSession({ owner, rfqId: 50 });

      expect(result.rfqId).toBe(50);
      expect(sessionRepository.findActiveForUser).toHaveBeenCalledWith(owner, 50);
    });
  });

  describe("session", () => {
    it("should return session when owned by the caller", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(mockSession);

      const result = await service.session(1, owner);

      expect(result).toEqual(mockSession);
      expect(sessionRepository.findOwnedById).toHaveBeenCalledWith(1, owner);
    });

    it("should throw NotFoundException when session does not exist", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(null);

      await expect(service.session(999, owner)).rejects.toThrow(NotFoundException);
      await expect(service.session(999, owner)).rejects.toThrow("Session 999 not found");
    });

    it("should throw ForbiddenException when session belongs to another user", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(service.session(1, otherOwner)).rejects.toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when session belongs to another app scope", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(service.session(1, crossAppOwner)).rejects.toThrow(ForbiddenException);
    });

    it("should block enumeration by not loading another user's session via findOwnedById", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(service.session(1, otherOwner)).rejects.toThrow(ForbiddenException);
      expect(sessionRepository.findOwnedById).toHaveBeenCalledWith(1, otherOwner);
    });
  });

  describe("sendMessage", () => {
    let aiChatService: jest.Mocked<AiChatService>;

    beforeEach(() => {
      sessionRepository.findOwnedById.mockResolvedValue({ ...mockSession });
      messageRepository.create.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);
      sessionRepository.save.mockResolvedValue(mockSession);
      aiChatService = (service as any).aiChatService;
    });

    it("should throw error when no AI provider is available", async () => {
      const mockAiChatServiceUnavailable = {
        isAvailable: jest.fn().mockResolvedValue(false),
        chat: jest.fn(),
        streamChat: jest.fn(),
      };

      const serviceWithoutProvider = new NixChatService(
        sessionRepository as any,
        messageRepository as any,
        {} as any,
        mockAiChatServiceUnavailable as any,
        {} as any,
        {} as any,
      );

      await expect(
        serviceWithoutProvider.sendMessage({ sessionId: 1, owner, message: "Hello" }),
      ).rejects.toThrow("The AI service is temporarily unavailable. Please try again shortly.");
    });

    it("should reject a message to a session owned by another user", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(
        service.sendMessage({ sessionId: 1, owner: otherOwner, message: "Hello" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should send message and return response", async () => {
      const result = await service.sendMessage({
        sessionId: 1,
        owner,
        message: "What is a pipe schedule?",
      });

      expect(result).toMatchObject({
        sessionId: 1,
        content: "AI response",
        metadata: expect.objectContaining({
          processingTimeMs: expect.any(Number),
        }),
      });
    });

    it("should save user and assistant messages", async () => {
      await service.sendMessage({ sessionId: 1, owner, message: "Hello" });

      expect(messageRepository.create).toHaveBeenCalledTimes(2);
    });

    it("should update session conversation history", async () => {
      await service.sendMessage({ sessionId: 1, owner, message: "Test message" });

      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ role: "user", content: "Test message" }),
            expect.objectContaining({ role: "assistant", content: "AI response" }),
          ]),
        }),
      );
    });

    it("should handle context with RFQ items", async () => {
      const rfqItems = [{ diameter: 200, itemType: "pipe" }];

      await service.sendMessage({
        sessionId: 1,
        owner,
        message: "Check my items",
        context: { currentRfqItems: rfqItems },
      });

      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionContext: expect.objectContaining({
            currentRfqItems: rfqItems,
          }),
        }),
      );
    });

    it("should propagate chat service errors", async () => {
      aiChatService.chat = jest.fn().mockRejectedValue(new Error("All AI providers failed"));

      await expect(service.sendMessage({ sessionId: 1, owner, message: "Hello" })).rejects.toThrow(
        "All AI providers failed",
      );
    });
  });

  describe("streamMessage", () => {
    let aiChatService: jest.Mocked<AiChatService>;

    beforeEach(() => {
      sessionRepository.findOwnedById.mockResolvedValue({ ...mockSession });
      messageRepository.create.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);
      sessionRepository.save.mockResolvedValue(mockSession);
      aiChatService = (service as any).aiChatService;
    });

    it("should yield error when no AI provider is available", async () => {
      const mockAiChatServiceUnavailable = {
        isAvailable: jest.fn().mockResolvedValue(false),
        chat: jest.fn(),
        streamChat: jest.fn(),
      };

      const serviceWithoutProvider = new NixChatService(
        sessionRepository as any,
        messageRepository as any,
        {} as any,
        mockAiChatServiceUnavailable as any,
        {} as any,
        {} as any,
      );

      const generator = serviceWithoutProvider.streamMessage({
        sessionId: 1,
        owner,
        message: "Hello",
      });
      const result = await generator.next();

      expect(result.value).toEqual({
        type: "error",
        error: "The AI service is temporarily unavailable. Please try again shortly.",
      });
    });

    it("should yield message_start, content deltas, and message_stop", async () => {
      async function* mockStreamChat() {
        yield { type: "message_start", providerUsed: "gemini" };
        yield { type: "content_delta", delta: "Hello" };
        yield { type: "content_delta", delta: " world" };
        yield { type: "message_stop" };
      }

      aiChatService.streamChat = jest.fn().mockReturnValue(mockStreamChat());

      const generator = service.streamMessage({ sessionId: 1, owner, message: "Hi" });
      const results: any[] = [];

      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results[0]).toEqual({ type: "message_start" });
      expect(results).toContainEqual({ type: "content_delta", delta: "Hello" });
      expect(results).toContainEqual({ type: "content_delta", delta: " world" });
      expect(results[results.length - 1]).toMatchObject({
        type: "message_stop",
        metadata: expect.objectContaining({ provider: "gemini" }),
      });
    });

    it("should yield error on streaming failure", async () => {
      async function* mockStreamChatError() {
        yield { type: "error", error: "API service error (503)" };
      }

      aiChatService.streamChat = jest.fn().mockReturnValue(mockStreamChatError());

      const generator = service.streamMessage({ sessionId: 1, owner, message: "Hello" });
      const results: any[] = [];

      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toContainEqual({ type: "error", error: "API service error (503)" });
    });

    it("should save messages after streaming completes", async () => {
      async function* mockStreamChatSuccess() {
        yield { type: "message_start", providerUsed: "gemini" };
        yield { type: "content_delta", delta: "Response" };
        yield { type: "message_stop" };
      }

      aiChatService.streamChat = jest.fn().mockReturnValue(mockStreamChatSuccess());

      const generator = service.streamMessage({ sessionId: 1, owner, message: "Test" });

      for await (const _ of generator) {
        /* consume generator */
      }

      expect(messageRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("conversationHistory", () => {
    it("should return messages in descending order", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(mockSession);
      const messages = [mockMessage, { ...mockMessage, id: 2 }];
      messageRepository.findRecentForSession.mockResolvedValue(messages);

      const result = await service.conversationHistory(1, owner);

      expect(result).toEqual(messages);
      expect(messageRepository.findRecentForSession).toHaveBeenCalledWith(1, 50);
    });

    it("should respect custom limit", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(mockSession);
      messageRepository.findRecentForSession.mockResolvedValue([]);

      await service.conversationHistory(1, owner, 10);

      expect(messageRepository.findRecentForSession).toHaveBeenCalledWith(1, 10);
    });

    it("should not return history of another user's session", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(service.conversationHistory(1, otherOwner)).rejects.toThrow(ForbiddenException);
      expect(messageRepository.findRecentForSession).not.toHaveBeenCalled();
    });
  });

  describe("updateUserPreferences", () => {
    it("should merge preferences with existing ones", async () => {
      const sessionWithPrefs = {
        ...mockSession,
        userPreferences: { learningEnabled: true, preferredMaterials: ["Carbon Steel"] },
      };
      sessionRepository.findOwnedById.mockResolvedValue(sessionWithPrefs);
      sessionRepository.save.mockResolvedValue(sessionWithPrefs);

      await service.updateUserPreferences(1, owner, { preferredSchedules: ["Sch 40"] });

      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userPreferences: {
            learningEnabled: true,
            preferredMaterials: ["Carbon Steel"],
            preferredSchedules: ["Sch 40"],
          },
        }),
      );
    });
  });

  describe("recordCorrection", () => {
    it("should add correction to session context", async () => {
      sessionRepository.findOwnedById.mockResolvedValue({ ...mockSession, sessionContext: {} });
      sessionRepository.save.mockResolvedValue(mockSession);

      await service.recordCorrection(1, owner, {
        extractedValue: "200mm",
        correctedValue: "200NB",
        fieldType: "diameter",
      });

      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionContext: {
            recentCorrections: [
              {
                extractedValue: "200mm",
                correctedValue: "200NB",
                fieldType: "diameter",
              },
            ],
          },
        }),
      );
    });

    it("should limit corrections to 20", async () => {
      const existingCorrections = Array.from({ length: 20 }, (_, i) => ({
        extractedValue: `val${i}`,
        correctedValue: `corrected${i}`,
        fieldType: "test",
      }));

      sessionRepository.findOwnedById.mockResolvedValue({
        ...mockSession,
        sessionContext: { recentCorrections: existingCorrections },
      });
      sessionRepository.save.mockResolvedValue(mockSession);

      await service.recordCorrection(1, owner, {
        extractedValue: "new",
        correctedValue: "newCorrected",
        fieldType: "diameter",
      });

      const savedSession = sessionRepository.save.mock.calls[0][0] as NixChatSession;
      expect(savedSession.sessionContext?.recentCorrections?.length).toBe(20);
      expect(savedSession.sessionContext?.recentCorrections?.[19]).toEqual({
        extractedValue: "new",
        correctedValue: "newCorrected",
        fieldType: "diameter",
      });
    });
  });

  describe("endSession", () => {
    it("should set session as inactive", async () => {
      sessionRepository.findOwnedById.mockResolvedValue({ ...mockSession });
      sessionRepository.save.mockResolvedValue({ ...mockSession, isActive: false });

      await service.endSession(1, owner);

      expect(sessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it("should not end another user's session", async () => {
      sessionRepository.findOwnedById.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);

      await expect(service.endSession(1, otherOwner)).rejects.toThrow(ForbiddenException);
      expect(sessionRepository.save).not.toHaveBeenCalled();
    });
  });
});
