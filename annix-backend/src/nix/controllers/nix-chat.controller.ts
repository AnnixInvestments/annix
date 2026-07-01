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
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AiQuotaService } from "../../ai-usage/ai-quota.service";
import { AiApp } from "../../ai-usage/entities/ai-usage-log.entity";
import { AnyUserAuthGuard, AuthenticatedUser } from "../../auth/guards/any-user-auth.guard";
import {
  AI_RATE_LIMIT_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
  AiUnavailableError,
} from "../ai-providers/ai-errors";
import {
  CreateItemsFromChatDto,
  CreateItemsResponseDto,
  ParseItemsRequestDto,
  ParseItemsResponseDto,
} from "../dto/chat-item.dto";
import { SendMessageBodyDto } from "../dto/send-message.dto";
import { NixSessionOwner } from "../entities/nix-chat-session.entity";
import { CreateSessionDto, NixChatService, SendMessageDto } from "../services/nix-chat.service";
import { NixChatItemService } from "../services/nix-chat-item.service";
import { NixValidationService } from "../services/nix-validation.service";

const GENERIC_ASSISTANT_ERROR = AI_UNAVAILABLE_MESSAGE;
const TOO_MANY_STREAMS_ERROR =
  "Too many active chat sessions — please finish one before starting another.";
const MAX_CONCURRENT_STREAMS_PER_USER = Number(process.env.NIX_MAX_CONCURRENT_STREAMS) || 3;

@Controller("nix/chat")
@UseGuards(AnyUserAuthGuard)
export class NixChatController {
  private readonly logger = new Logger(NixChatController.name);

  private readonly activeStreamsByUser = new Map<number, number>();

  constructor(
    private readonly chatService: NixChatService,
    private readonly validationService: NixValidationService,
    private readonly chatItemService: NixChatItemService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  private owner(req: { authUser: AuthenticatedUser }): NixSessionOwner {
    return { userId: req.authUser.userId, appScope: req.authUser.type };
  }

  private acquireStreamSlot(userId: number): boolean {
    const current = this.activeStreamsByUser.get(userId) ?? 0;
    if (current >= MAX_CONCURRENT_STREAMS_PER_USER) {
      return false;
    }
    this.activeStreamsByUser.set(userId, current + 1);
    return true;
  }

  private releaseStreamSlot(userId: number): void {
    const current = this.activeStreamsByUser.get(userId) ?? 0;
    if (current <= 1) {
      this.activeStreamsByUser.delete(userId);
    } else {
      this.activeStreamsByUser.set(userId, current - 1);
    }
  }

  @Post("session")
  async createSession(@Request() req, @Body() body: { rfqId?: number }) {
    const dto: CreateSessionDto = {
      owner: this.owner(req),
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
  async getSession(@Param("sessionId", ParseIntPipe) sessionId: number, @Request() req) {
    const session = await this.chatService.session(sessionId, this.owner(req));

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
    const messages = await this.chatService.conversationHistory(sessionId, this.owner(req));

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
    @Body() body: SendMessageBodyDto,
    @Request() req,
  ) {
    const dto: SendMessageDto = {
      sessionId,
      owner: this.owner(req),
      message: body.message,
      context: body.context,
    };

    try {
      return await this.chatService.sendMessage(dto);
    } catch (error) {
      throw this.toChatHttpException(sessionId, error);
    }
  }

  private toChatHttpException(sessionId: number, error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof AiUnavailableError) {
      this.logger.error(
        `Chat message failed for session ${sessionId} [ai:${error.code}]: ${
          error.cause instanceof Error ? error.cause.message : error.message
        }`,
      );
      const status =
        error.code === "rate_limit" ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.SERVICE_UNAVAILABLE;
      const message = error.code === "rate_limit" ? AI_RATE_LIMIT_MESSAGE : GENERIC_ASSISTANT_ERROR;
      return new HttpException({ error: message, code: error.code }, status);
    }

    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(
      `Chat message failed for session ${sessionId} [internal]: ${err.name}: ${err.message}${
        err.stack ? `\n${err.stack}` : ""
      }`,
    );
    return new HttpException(
      { error: GENERIC_ASSISTANT_ERROR, code: "internal" },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  @Post("session/:sessionId/stream")
  async streamMessage(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() body: SendMessageBodyDto,
    @Res() res: Response,
    @Request() req,
  ) {
    const owner = this.owner(req);
    const dto: SendMessageDto = {
      sessionId,
      owner,
      message: body.message,
      context: body.context,
    };

    if (!this.acquireStreamSlot(owner.userId)) {
      throw new HttpException({ error: TOO_MANY_STREAMS_ERROR }, HttpStatus.TOO_MANY_REQUESTS);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      await this.aiQuotaService.assertWithinQuota({
        app: AiApp.NIX,
        userId: owner.userId,
        quotaScope: "user",
      });

      for await (const chunk of this.chatService.streamMessage(dto)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Stream failed for session ${sessionId}: ${err.name}: ${err.message}${
          err.stack ? `\n${err.stack}` : ""
        }`,
      );
      const message =
        error instanceof AiUnavailableError && error.code === "rate_limit"
          ? AI_RATE_LIMIT_MESSAGE
          : GENERIC_ASSISTANT_ERROR;
      res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
      res.end();
    } finally {
      this.releaseStreamSlot(owner.userId);
    }
  }

  @Post("session/:sessionId/preferences")
  async updatePreferences(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() preferences: any,
    @Request() req,
  ) {
    await this.chatService.updateUserPreferences(sessionId, this.owner(req), preferences);

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
    @Request() req,
  ) {
    await this.chatService.recordCorrection(sessionId, this.owner(req), body);

    return { success: true };
  }

  @Post("session/:sessionId/end")
  async endSession(@Param("sessionId", ParseIntPipe) sessionId: number, @Request() req) {
    await this.chatService.endSession(sessionId, this.owner(req));

    return { success: true };
  }

  @Post("session/:sessionId/parse-items")
  async parseItems(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() dto: ParseItemsRequestDto,
    @Request() req,
  ): Promise<ParseItemsResponseDto> {
    const session = await this.chatService.session(sessionId, this.owner(req));

    try {
      return await this.chatItemService.parseItemsFromMessage(session, dto);
    } catch (error) {
      this.logger.error(`Failed to parse items for session ${sessionId}: ${error.message}`);
      throw new HttpException({ error: GENERIC_ASSISTANT_ERROR }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post("session/:sessionId/create-items")
  async createItems(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() dto: CreateItemsFromChatDto,
    @Request() req,
  ): Promise<CreateItemsResponseDto> {
    const session = await this.chatService.session(sessionId, this.owner(req));
    const userId = req.authUser.userId;

    try {
      const result = await this.chatItemService.createItemsFromChat(session, dto, userId);

      if (result.success) {
        session.sessionContext.lastCreatedRfqId = result.rfqId;
        session.sessionContext.lastCreatedRfqNumber = result.rfqNumber;
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to create items for session ${sessionId}: ${error.message}`);
      throw new HttpException({ error: GENERIC_ASSISTANT_ERROR }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
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
