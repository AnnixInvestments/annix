import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MessagingEnabledGuard } from "../guards/messaging-enabled.guard";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlAuthService } from "../services/auth.service";
import { ChatService } from "../services/chat.service";

@ApiTags("Stock Control - Chat")
@Controller("stock-control/chat")
@UseGuards(StockControlAuthGuard, MessagingEnabledGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: StockControlAuthService,
  ) {}

  @Get("messages")
  @ApiOperation({ summary: "Fetch chat messages (general or conversation)" })
  async messages(
    @Req() req: any,
    @Query("afterId") afterId?: string,
    @Query("conversationId") conversationId?: string,
  ) {
    const parsedAfterId = afterId ? parseInt(afterId, 10) : null;
    const parsedConversationId = conversationId ? parseInt(conversationId, 10) : null;

    const messages = await this.chatService.messages(
      req.user.companyId,
      Number.isNaN(parsedAfterId) ? null : parsedAfterId,
      Number.isNaN(parsedConversationId) ? null : parsedConversationId,
    );

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      text: m.text,
      imageUrl: m.imageUrl,
      editedAt: m.editedAt,
      createdAt: m.createdAt,
      conversationId: m.conversationId,
    }));
  }

  @Post("messages")
  @ApiOperation({ summary: "Send a chat message" })
  async send(
    @Req() req: any,
    @Body() body: { text?: string; imageUrl?: string | null; conversationId?: number | null },
  ) {
    const hasContent = (body.text && body.text.trim().length > 0) || body.imageUrl;
    if (!hasContent) {
      return { success: false, error: "Message cannot be empty" };
    }

    const message = await this.chatService.send(
      req.user.companyId,
      req.user.id,
      req.user.name,
      body.text?.trim() ?? "",
      body.imageUrl ?? null,
      body.conversationId ?? null,
    );

    return {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      text: message.text,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
      conversationId: message.conversationId,
    };
  }

  @Patch("messages/:id")
  @ApiOperation({ summary: "Edit own chat message" })
  async update(@Req() req: any, @Param("id") id: string, @Body() body: { text: string }) {
    const messageId = parseInt(id, 10);
    if (Number.isNaN(messageId)) {
      return { success: false };
    }

    return this.chatService.update(messageId, req.user.id, body.text);
  }

  @Post("upload")
  @ApiOperation({ summary: "Upload a chat image" })
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.chatService.uploadImage(req.user.companyId, file);
  }

  @Get("conversations")
  @ApiOperation({ summary: "List conversations for current user" })
  async listConversations(@Req() req: any) {
    const conversations = await this.chatService.conversations(req.user.companyId, req.user.id);

    return conversations.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      createdById: c.createdById,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      participants: c.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        lastReadAt: p.lastReadAt,
      })),
    }));
  }

  @Post("conversations")
  @ApiOperation({ summary: "Create a conversation (direct or group)" })
  async createConversation(
    @Req() req: any,
    @Body() body: { participantUserIds: number[]; name?: string | null },
  ) {
    const conversation = await this.chatService.createConversation(
      req.user.companyId,
      req.user.id,
      body.participantUserIds,
      body.name ?? null,
    );

    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      createdById: conversation.createdById,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
      participants: conversation.participants.map((p) => ({
        userId: p.userId,
        name: p.user.name,
        lastReadAt: p.lastReadAt,
      })),
    };
  }

  @Post("conversations/:id/read")
  @ApiOperation({ summary: "Mark conversation as read" })
  async markRead(@Req() req: any, @Param("id") id: string) {
    const conversationId = parseInt(id, 10);
    if (Number.isNaN(conversationId)) {
      return { success: false };
    }

    await this.chatService.markRead(conversationId, req.user.id);
    return { success: true };
  }

  @Get("unread")
  @ApiOperation({ summary: "Unread counts per conversation" })
  async unreadCounts(@Req() req: any) {
    return this.chatService.unreadCounts(req.user.companyId, req.user.id);
  }

  @Get("team")
  @ApiOperation({ summary: "List team members available for chat" })
  async chatTeamMembers(@Req() req: any) {
    return this.authService.teamMembers(req.user.companyId);
  }
}
