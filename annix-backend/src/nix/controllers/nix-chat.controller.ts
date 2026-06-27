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
import { Response } from "express";
import { AnyUserAuthGuard, AuthenticatedUser } from "../../auth/guards/any-user-auth.guard";
import {
  CreateItemsFromChatDto,
  CreateItemsResponseDto,
  ParseItemsRequestDto,
  ParseItemsResponseDto,
} from "../dto/chat-item.dto";
import { NixSessionOwner } from "../entities/nix-chat-session.entity";
import { CreateSessionDto, NixChatService, SendMessageDto } from "../services/nix-chat.service";
import { NixChatItemService } from "../services/nix-chat-item.service";
import { NixValidationService } from "../services/nix-validation.service";

const GENERIC_ASSISTANT_ERROR =
  "The assistant is temporarily unavailable. Please try again shortly.";
const RATE_LIMIT_ERROR = "Too many requests — please wait a moment and try again.";

@Controller("nix/chat")
@UseGuards(AnyUserAuthGuard)
export class NixChatController {
  private readonly logger = new Logger(NixChatController.name);

  constructor(
    private readonly chatService: NixChatService,
    private readonly validationService: NixValidationService,
    private readonly chatItemService: NixChatItemService,
  ) {}

  private owner(req: { authUser: AuthenticatedUser }): NixSessionOwner {
    return { userId: req.authUser.userId, appScope: req.authUser.type };
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
    @Body() body: { message: string; context?: any },
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
      this.logger.error(`Chat message failed for session ${sessionId}: ${error.message}`);

      const isRateLimit = error.message?.includes("rate limit");
      const status = isRateLimit ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.SERVICE_UNAVAILABLE;

      throw new HttpException(
        { error: isRateLimit ? RATE_LIMIT_ERROR : GENERIC_ASSISTANT_ERROR },
        status,
      );
    }
  }

  @Post("session/:sessionId/stream")
  async streamMessage(
    @Param("sessionId", ParseIntPipe) sessionId: number,
    @Body() body: { message: string; context?: any },
    @Res() res: Response,
    @Request() req,
  ) {
    const dto: SendMessageDto = {
      sessionId,
      owner: this.owner(req),
      message: body.message,
      context: body.context,
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      for await (const chunk of this.chatService.streamMessage(dto)) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      this.logger.error(`Stream failed for session ${sessionId}: ${error.message}`);
      res.write(`data: ${JSON.stringify({ type: "error", error: GENERIC_ASSISTANT_ERROR })}\n\n`);
      res.end();
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
