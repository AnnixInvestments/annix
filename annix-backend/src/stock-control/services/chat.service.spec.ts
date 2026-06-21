import { ForbiddenException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { STORAGE_SERVICE } from "../../storage/storage.interface";
import { ChatConversationRepository } from "../repositories/chat-conversation.repository";
import { ChatConversationParticipantRepository } from "../repositories/chat-conversation-participant.repository";
import { ChatMessageRepository } from "../repositories/chat-message.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { ChatService } from "./chat.service";

describe("ChatService", () => {
  let service: ChatService;

  const mockChatRepo = {
    findMessages: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => Promise.resolve({ id: 1, ...data })),
    findById: jest.fn(),
    save: jest.fn(),
    countUnreadForConversation: jest.fn(),
    countGeneralUnread: jest.fn(),
  };

  const mockConversationRepo = {
    touchLastMessageAt: jest.fn().mockResolvedValue(undefined),
    findForCompanyByIds: jest.fn(),
    findByIdWithParticipantsOrFail: jest.fn(),
    findExistingDirectConversation: jest.fn(),
    create: jest.fn(),
  };

  const mockParticipantRepo = {
    findConversationIdsForUser: jest.fn(),
    isParticipant: jest.fn(),
    findForUser: jest.fn(),
    createMany: jest.fn().mockResolvedValue([]),
    touchLastReadAt: jest.fn().mockResolvedValue(undefined),
  };

  const mockUserRepo = {
    findIdsByIdsForCompany: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn(),
    presignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatMessageRepository, useValue: mockChatRepo },
        { provide: ChatConversationRepository, useValue: mockConversationRepo },
        { provide: ChatConversationParticipantRepository, useValue: mockParticipantRepo },
        { provide: StockControlUserRepository, useValue: mockUserRepo },
        { provide: STORAGE_SERVICE, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe("messages", () => {
    it("rejects reading a conversation the user is not a participant of", async () => {
      mockParticipantRepo.isParticipant.mockResolvedValue(false);

      await expect(service.messages(1, 99, null, 42)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockChatRepo.findMessages).not.toHaveBeenCalled();
    });

    it("returns messages when the user is a participant", async () => {
      mockParticipantRepo.isParticipant.mockResolvedValue(true);

      await service.messages(1, 7, null, 42);

      expect(mockParticipantRepo.isParticipant).toHaveBeenCalledWith(42, 7);
      expect(mockChatRepo.findMessages).toHaveBeenCalledWith(1, null, 42, 50);
    });

    it("does not require participation for the general room", async () => {
      await service.messages(1, 7, null, null);

      expect(mockParticipantRepo.isParticipant).not.toHaveBeenCalled();
      expect(mockChatRepo.findMessages).toHaveBeenCalledWith(1, null, null, 50);
    });
  });

  describe("send", () => {
    it("rejects sending to a conversation the user is not a participant of", async () => {
      mockParticipantRepo.isParticipant.mockResolvedValue(false);

      await expect(service.send(1, 99, "Mallory", "hi", null, 42)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mockChatRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("markRead", () => {
    it("rejects marking a conversation the user is not a participant of", async () => {
      mockParticipantRepo.isParticipant.mockResolvedValue(false);

      await expect(service.markRead(42, 99)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockParticipantRepo.touchLastReadAt).not.toHaveBeenCalled();
    });
  });

  describe("createConversation", () => {
    it("rejects participants outside the caller's company", async () => {
      mockUserRepo.findIdsByIdsForCompany.mockResolvedValue([{ id: 1 }]);

      await expect(service.createConversation(1, 1, [2], null)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mockConversationRepo.create).not.toHaveBeenCalled();
    });

    it("creates a conversation when every participant belongs to the company", async () => {
      mockUserRepo.findIdsByIdsForCompany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockConversationRepo.findExistingDirectConversation.mockResolvedValue(null);
      mockConversationRepo.create.mockResolvedValue({ id: 5 });
      mockConversationRepo.findByIdWithParticipantsOrFail.mockResolvedValue({ id: 5 });

      const result = await service.createConversation(1, 1, [2], null);

      expect(mockUserRepo.findIdsByIdsForCompany).toHaveBeenCalledWith([1, 2], 1);
      expect(mockConversationRepo.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 5 });
    });
  });
});
