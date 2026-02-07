import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { BroadcastService } from "../messaging/broadcast.service";
import {
  BroadcastFilterDto,
  BroadcastSummaryDto,
  ConversationDetailDto,
  ConversationFilterDto,
  ConversationSummaryDto,
  CreateConversationDto,
  MessageDto,
  MessagePaginationDto,
  SendMessageDto,
} from "../messaging/dto";
import { MessagingService } from "../messaging/messaging.service";
import { ResponseMetricsService } from "../messaging/response-metrics.service";
import { SupplierAuthGuard } from "./guards/supplier-auth.guard";

@ApiTags("Supplier Messaging")
@Controller("supplier/messaging")
@UseGuards(SupplierAuthGuard)
@ApiBearerAuth()
export class SupplierMessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly broadcastService: BroadcastService,
    private readonly metricsService: ResponseMetricsService,
  ) {}

  @Get("conversations")
  @ApiOperation({ summary: "List supplier conversations" })
  @ApiResponse({
    status: 200,
    description: "Conversations retrieved",
  })
  async conversations(
    @Req() req: Request,
    @Query() filters: ConversationFilterDto,
  ): Promise<{ conversations: ConversationSummaryDto[]; total: number }> {
    const userId = req["supplier"].userId;
    return this.messagingService.conversationsForUser(userId, filters);
  }

  @Post("conversations")
  @ApiOperation({ summary: "Create a new conversation" })
  @ApiResponse({
    status: 201,
    description: "Conversation created",
  })
  async createConversation(
    @Req() req: Request,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationDetailDto> {
    const userId = req["supplier"].userId;
    return this.messagingService.createConversation(userId, dto);
  }

  @Get("conversations/:id")
  @ApiOperation({ summary: "Get conversation details with messages" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Conversation retrieved",
  })
  async conversation(
    @Req() req: Request,
    @Param("id", ParseIntPipe) conversationId: number,
  ): Promise<ConversationDetailDto> {
    const userId = req["supplier"].userId;
    return this.messagingService.conversationDetail(conversationId, userId);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "Get paginated messages for a conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Messages retrieved",
  })
  async messages(
    @Req() req: Request,
    @Param("id", ParseIntPipe) conversationId: number,
    @Query() pagination: MessagePaginationDto,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    const userId = req["supplier"].userId;
    return this.messagingService.messagesForConversation(conversationId, userId, pagination);
  }

  @Post("conversations/:id/messages")
  @ApiOperation({ summary: "Send a message in a conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 201,
    description: "Message sent",
  })
  async sendMessage(
    @Req() req: Request,
    @Param("id", ParseIntPipe) conversationId: number,
    @Body() dto: SendMessageDto,
  ): Promise<MessageDto> {
    const userId = req["supplier"].userId;
    return this.messagingService.sendMessage(conversationId, userId, dto);
  }

  @Post("conversations/:id/read")
  @ApiOperation({ summary: "Mark conversation as read" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Conversation marked as read",
  })
  async markAsRead(
    @Req() req: Request,
    @Param("id", ParseIntPipe) conversationId: number,
  ): Promise<{ success: boolean }> {
    const userId = req["supplier"].userId;
    await this.messagingService.markAsRead(conversationId, userId);
    return { success: true };
  }

  @Post("conversations/:id/archive")
  @ApiOperation({ summary: "Archive a conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Conversation archived",
  })
  async archiveConversation(
    @Req() req: Request,
    @Param("id", ParseIntPipe) conversationId: number,
  ): Promise<{ success: boolean }> {
    const userId = req["supplier"].userId;
    await this.messagingService.archiveConversation(conversationId, userId);
    return { success: true };
  }

  @Get("broadcasts")
  @ApiOperation({ summary: "List broadcasts for supplier" })
  @ApiResponse({
    status: 200,
    description: "Broadcasts retrieved",
  })
  async broadcasts(
    @Req() req: Request,
    @Query() filters: BroadcastFilterDto,
  ): Promise<{ broadcasts: BroadcastSummaryDto[]; total: number }> {
    const userId = req["supplier"].userId;
    return this.broadcastService.broadcastsForUser(userId, filters);
  }

  @Post("broadcasts/:id/read")
  @ApiOperation({ summary: "Mark broadcast as read" })
  @ApiParam({ name: "id", description: "Broadcast ID" })
  @ApiResponse({
    status: 200,
    description: "Broadcast marked as read",
  })
  async markBroadcastRead(
    @Req() req: Request,
    @Param("id", ParseIntPipe) broadcastId: number,
  ): Promise<{ success: boolean }> {
    const userId = req["supplier"].userId;
    await this.broadcastService.markBroadcastRead(broadcastId, userId);
    return { success: true };
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread message and broadcast count" })
  @ApiResponse({
    status: 200,
    description: "Unread counts retrieved",
  })
  async unreadCount(@Req() req: Request): Promise<{ messages: number; broadcasts: number }> {
    const userId = req["supplier"].userId;
    const [messages, broadcasts] = await Promise.all([
      this.messagingService.unreadCountForUser(userId),
      this.broadcastService.unreadBroadcastCount(userId),
    ]);
    return { messages, broadcasts };
  }

  @Get("response-stats")
  @ApiOperation({ summary: "Get own response statistics" })
  @ApiResponse({
    status: 200,
    description: "Response stats retrieved",
  })
  async responseStats(@Req() req: Request) {
    const userId = req["supplier"].userId;
    return this.metricsService.userResponseStats(userId);
  }
}
