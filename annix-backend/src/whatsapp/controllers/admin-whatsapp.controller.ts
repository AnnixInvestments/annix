import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from "@nestjs/common";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { AdminAuthGuard } from "../../admin/guards/admin-auth.guard";
import { BroadcastSendOneDto } from "../dto/broadcast-send-one.dto";
import { WhatsAppBroadcastService } from "../services/whatsapp-broadcast.service";
import { WhatsAppConversationService } from "../services/whatsapp-conversation.service";

class SendWhatsAppReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  body: string;
}

const ALL_APPS_TOKEN = "all";

interface AdminRequest {
  user?: { email?: string };
  admin?: { email?: string };
}

@Controller("admin/whatsapp")
@UseGuards(AdminAuthGuard)
export class AdminWhatsAppController {
  constructor(
    private readonly conversations: WhatsAppConversationService,
    private readonly broadcast: WhatsAppBroadcastService,
  ) {}

  @Get("status")
  status() {
    return this.conversations.status();
  }

  @Get("conversations")
  list(@Query("page") page?: string) {
    return this.conversations.listConversations(page ? Number(page) : 1);
  }

  @Get("conversations/:id/messages")
  messages(@Param("id") id: string) {
    return this.conversations.messages(id);
  }

  @Post("conversations/:id/reply")
  async reply(
    @Param("id") id: string,
    @Body() dto: SendWhatsAppReplyDto,
    @Request() req: AdminRequest,
  ) {
    const sentBy = req.user?.email ?? req.admin?.email ?? null;
    const messages = await this.conversations.sendReply(id, dto.body, sentBy);
    return { messages };
  }

  @Post("conversations/:id/read")
  async markRead(@Param("id") id: string) {
    await this.conversations.markRead(id);
    return { success: true };
  }

  @Get("broadcast/candidates")
  broadcastCandidates(@Query("appCode") appCode?: string) {
    const resolvedAppCode = appCode && appCode !== ALL_APPS_TOKEN ? appCode : null;
    return this.broadcast.candidates(resolvedAppCode);
  }

  @Post("broadcast/backfill-phones")
  backfillPhones() {
    return this.broadcast.backfillPhones();
  }

  @Post("broadcast/send-one")
  sendBroadcastOne(@Body() dto: BroadcastSendOneDto, @Request() req: AdminRequest) {
    const sentBy = req.user?.email ?? req.admin?.email ?? null;
    return this.broadcast.sendOne({
      userId: dto.userId,
      message: dto.message,
      mode: dto.mode,
      templateName: dto.templateName ?? null,
      languageCode: dto.languageCode ?? null,
      sentBy,
    });
  }
}
