import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Sse,
  UseGuards,
  Request,
  ParseIntPipe,
  MessageEvent,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NixChatService, CreateSessionDto, SendMessageDto } from '../services/nix-chat.service';
import { NixValidationService, ValidationIssue } from '../services/nix-validation.service';
import { Observable, from, map } from 'rxjs';

@Controller('nix/chat')
@UseGuards(JwtAuthGuard)
export class NixChatController {
  constructor(
    private readonly chatService: NixChatService,
    private readonly validationService: NixValidationService,
  ) {}

  @Post('session')
  async createSession(@Request() req, @Body() body: { rfqId?: number }) {
    const dto: CreateSessionDto = {
      userId: req.user.userId,
      rfqId: body.rfqId,
    };

    const session = await this.chatService.createSession(dto);

    return {
      sessionId: session.id,
      isActive: session.isActive,
      userPreferences: session.userPreferences,
    };
  }

  @Get('session/:sessionId')
  async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
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

  @Get('session/:sessionId/history')
  async getHistory(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Request() req,
  ) {
    const messages = await this.chatService.conversationHistory(sessionId);

    return {
      sessionId,
      messages: messages.reverse().map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt,
      })),
    };
  }

  @Sse('session/:sessionId/stream')
  streamMessage(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Request() req,
  ): Observable<MessageEvent> {
    const body = req.body as { message: string; context?: any };

    const dto: SendMessageDto = {
      sessionId,
      message: body.message,
      context: body.context,
    };

    return from(this.chatService.streamMessage(dto)).pipe(
      map(chunk => ({
        data: JSON.stringify(chunk),
      })),
    );
  }

  @Post('session/:sessionId/message')
  async sendMessage(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: { message: string; context?: any },
  ) {
    const dto: SendMessageDto = {
      sessionId,
      message: body.message,
      context: body.context,
    };

    return this.chatService.sendMessage(dto);
  }

  @Post('session/:sessionId/preferences')
  async updatePreferences(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() preferences: any,
  ) {
    await this.chatService.updateUserPreferences(sessionId, preferences);

    return { success: true };
  }

  @Post('session/:sessionId/correction')
  async recordCorrection(
    @Param('sessionId', ParseIntPipe) sessionId: number,
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

  @Post('session/:sessionId/end')
  async endSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    await this.chatService.endSession(sessionId);

    return { success: true };
  }

  @Post('validate/item')
  validateItem(@Body() body: { item: any; context?: any }) {
    const issues = this.validationService.validateItem(body.item, body.context);

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  }

  @Post('validate/rfq')
  validateRfq(@Body() body: { items: any[] }) {
    const issues = this.validationService.validateRfq(body.items);

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      summary: {
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length,
      },
    };
  }
}
