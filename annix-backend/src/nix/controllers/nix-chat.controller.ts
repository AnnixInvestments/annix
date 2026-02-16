import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { CreateSessionDto, NixChatService, SendMessageDto } from "../services/nix-chat.service";
import { NixValidationService } from "../services/nix-validation.service";

@Controller("nix/chat")
@UseGuards(AdminAuthGuard)
export class NixChatController {
  private readonly logger = new Logger(NixChatController.name);

  constructor(
    private readonly chatService: NixChatService,
    private readonly validationService: NixValidationService,
  ) {}

  @Post("session")
  async createSession(@Request() req, @Body() body: { rfqId?: number }) {
    const dto: CreateSessionDto = {
      userId: req.user.id,
      rfqId: body.rfqId,
    };

    const session = await this.chatService.createSession(dto);

    return {
      sessionId: session.id,
      isActive: session.isActive,
      userPreferences: session.userPreferences,
    };
  }

  @Get("session/:sessionId")
  async getSession(@Param("sessionId", ParseIntPipe) sessionId: number) {
    const session = await this.chatService.session(sessionId);

    return {
      sessionId: session.id,
      userId: session.userId,
      rfqId: session.rfqId,
      isActive: session.isActive,
      userPreferences: session.userPreferences,
      lastInteractionAt: session.lastInteractionAt,
      createdAt: session.createdAt,
    };
  }

  @Get("session/:sessionId/history")
  async getHistory(@Param("sessionId", ParseIntPipe) sessionId: number, @Request() req) {
    const messages = await this.chatService.conversationHistory(sessionId);

    return {
      sessionId,
      messages: messages.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
    };
  }

  @Post("session/:sessionId/message")
  async sendMessage(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() body: { message: string; context?: any },
  ) {
    const dto: SendMessageDto = {
      sessionId,
      message: body.message,
      context: body.context,
    };

    try {
      return await this.chatService.sendMessage(dto);
    } catch (error) {
      this.logger.error(`Chat message failed for session ${sessionId}: ${error.message}`);

      const isRateLimit = error.message?.includes("rate limit");
      const status = isRateLimit ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.SERVICE_UNAVAILABLE;

      throw new HttpException({ error: error.message }, status);
    }
  }

  @Post("session/:sessionId/preferences")
  async updatePreferences(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() preferences: any,
  ) {
    await this.chatService.updateUserPreferences(sessionId, preferences);

    return { success: true };
  }

  @Post("session/:sessionId/correction")
  async recordCorrection(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body()
    body: {
      extractedValue: string;
      correctedValue: string;
      fieldType: string;
    },
  ) {
    await this.chatService.recordCorrection(sessionId, body);

    return { success: true };
  }

  @Post("session/:sessionId/end")
  async endSession(@Param("sessionId", ParseIntPipe) sessionId: number) {
    await this.chatService.endSession(sessionId);

    return { success: true };
  }

  @Post("validate/item")
  validateItem(@Body() body: { item: any; context?: any }) {
    const issues = this.validationService.validateItem(body.item, body.context);

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
    };
  }

  @Post("validate/rfq")
  validateRfq(@Body() body: { items: any[] }) {
    const issues = this.validationService.validateRfq(body.items);

    return {
      valid: issues.filter((i) => i.severity === "error").length === 0,
      issues,
      summary: {
        errors: issues.filter((i) => i.severity === "error").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
        info: issues.filter((i) => i.severity === "info").length,
      },
    };
  }
}
