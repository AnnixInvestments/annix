import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { BroadcastService } from "../messaging/broadcast.service";
import {
  BroadcastDetailDto,
  BroadcastFilterDto,
  ConversationDetailDto,
  ConversationFilterDto,
  ConversationSummaryDto,
  CreateBroadcastDto,
  CreateConversationDto,
  MessageDto,
  MessagePaginationDto,
  MetricsFilterDto,
  ResponseMetricsSummaryDto,
  SendMessageDto,
  SlaConfigDto,
  UpdateSlaConfigDto,
  UserResponseStatsDto,
} from "../messaging/dto";
import { MessagingService } from "../messaging/messaging.service";
import { ResponseMetricsService } from "../messaging/response-metrics.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin Messaging")
@Controller("admin/messaging")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin", "employee")
@ApiBearerAuth()
export class AdminMessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly broadcastService: BroadcastService,
    private readonly metricsService: ResponseMetricsService,
  ) {}

  @Get("conversations")
  @ApiOperation({ summary: "List all conversations (admin view)" })
  @ApiResponse({
    status: 200,
    description: "Conversations retrieved",
  })
  async conversations(
    @Query() filters: ConversationFilterDto,
  ): Promise<{ conversations: ConversationSummaryDto[]; total: number }> {
    return this.messagingService.allConversationsForAdmin(filters);
  }

  @Post("conversations")
  @ApiOperation({ summary: "Create a conversation as admin" })
  @ApiResponse({
    status: 201,
    description: "Conversation created",
  })
  async createConversation(
    @Req() req: Request,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationDetailDto> {
    const userId = req["user"].id;
    return this.messagingService.createConversation(userId, dto);
  }

  @Get("conversations/:id")
  @ApiOperation({ summary: "Get conversation details" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Conversation retrieved",
  })
  async conversation(
    @Param("id", ParseIntPipe) conversationId: number,
  ): Promise<ConversationDetailDto> {
    return this.messagingService.conversationDetailForAdmin(conversationId);
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "Get paginated messages for a conversation" })
  @ApiParam({ name: "id", description: "Conversation ID" })
  @ApiResponse({
    status: 200,
    description: "Messages retrieved",
  })
  async messages(
    @Param("id", ParseIntPipe) conversationId: number,
    @Query() pagination: MessagePaginationDto,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    return this.messagingService.messagesForConversationAdmin(conversationId, pagination);
  }

  @Post("conversations/:id/messages")
  @ApiOperation({ summary: "Send a message as admin" })
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
    const userId = req["user"].id;
    return this.messagingService.sendMessage(conversationId, userId, dto);
  }

  @Get("broadcasts")
  @ApiOperation({ summary: "List all broadcasts (admin view)" })
  @ApiResponse({
    status: 200,
    description: "Broadcasts retrieved",
  })
  async broadcasts(
    @Query() filters: BroadcastFilterDto,
  ): Promise<{ broadcasts: BroadcastDetailDto[]; total: number }> {
    return this.broadcastService.broadcastsForAdmin(filters);
  }

  @Post("broadcasts")
  @ApiOperation({ summary: "Create a broadcast announcement" })
  @ApiResponse({
    status: 201,
    description: "Broadcast created",
  })
  async createBroadcast(
    @Req() req: Request,
    @Body() dto: CreateBroadcastDto,
  ): Promise<BroadcastDetailDto> {
    const userId = req["user"].id;
    return this.broadcastService.createBroadcast(userId, dto);
  }

  @Get("broadcasts/:id")
  @ApiOperation({ summary: "Get broadcast details" })
  @ApiParam({ name: "id", description: "Broadcast ID" })
  @ApiResponse({
    status: 200,
    description: "Broadcast retrieved",
  })
  async broadcast(
    @Req() req: Request,
    @Param("id", ParseIntPipe) broadcastId: number,
  ): Promise<BroadcastDetailDto> {
    const userId = req["user"].id;
    return this.broadcastService.broadcastDetail(broadcastId, userId);
  }

  @Get("response-metrics")
  @ApiOperation({ summary: "Get response metrics summary" })
  @ApiResponse({
    status: 200,
    description: "Metrics retrieved",
  })
  async responseMetrics(@Query() filters: MetricsFilterDto): Promise<ResponseMetricsSummaryDto> {
    return this.metricsService.responseMetricsSummary(filters);
  }

  @Get("response-metrics/user/:id")
  @ApiOperation({ summary: "Get response metrics for a specific user" })
  @ApiParam({ name: "id", description: "User ID" })
  @ApiResponse({
    status: 200,
    description: "User metrics retrieved",
  })
  async userResponseMetrics(
    @Param("id", ParseIntPipe) userId: number,
    @Query() filters: MetricsFilterDto,
  ): Promise<UserResponseStatsDto> {
    return this.metricsService.userResponseStats(userId, filters);
  }

  @Get("sla-config")
  @ApiOperation({ summary: "Get SLA configuration" })
  @ApiResponse({
    status: 200,
    description: "SLA config retrieved",
  })
  async slaConfig(): Promise<SlaConfigDto> {
    return this.metricsService.slaConfigDto();
  }

  @Put("sla-config")
  @Roles("admin")
  @ApiOperation({ summary: "Update SLA configuration" })
  @ApiResponse({
    status: 200,
    description: "SLA config updated",
  })
  async updateSlaConfig(@Body() dto: UpdateSlaConfigDto): Promise<SlaConfigDto> {
    return this.metricsService.updateSlaConfig(dto);
  }
}
