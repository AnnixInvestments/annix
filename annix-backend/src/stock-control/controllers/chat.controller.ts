import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MessagingEnabledGuard } from "../guards/messaging-enabled.guard";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { ChatService } from "../services/chat.service";

@ApiTags("Stock Control - Chat")
@Controller("stock-control/chat")
@UseGuards(StockControlAuthGuard, MessagingEnabledGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("messages")
  @ApiOperation({ summary: "Fetch chat messages for company" })
  async messages(@Req() req: any, @Query("afterId") afterId?: string) {
    const parsedAfterId = afterId ? parseInt(afterId, 10) : null;
    const messages = await this.chatService.messages(
      req.user.companyId,
      Number.isNaN(parsedAfterId) ? null : parsedAfterId,
    );

    return messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      text: m.text,
      imageUrl: m.imageUrl,
      editedAt: m.editedAt,
      createdAt: m.createdAt,
    }));
  }

  @Post("messages")
  @ApiOperation({ summary: "Send a chat message" })
  async send(@Req() req: any, @Body() body: { text?: string; imageUrl?: string | null }) {
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
    );

    return {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      text: message.text,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt,
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
}
