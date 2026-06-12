import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  DraftAnnixOrbitMessageDto,
  SendAnnixOrbitMessageDto,
} from "../dto/annix-orbit-message.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitMessageService } from "../services/annix-orbit-message.service";

@Controller("annix-orbit/messages")
@UseGuards(AnnixOrbitAuthGuard)
export class AnnixOrbitMessageController {
  constructor(private readonly messageService: AnnixOrbitMessageService) {}

  @Post("draft")
  draft(@Body() dto: DraftAnnixOrbitMessageDto) {
    return this.messageService.draft(dto);
  }

  @Post("send")
  send(@Body() dto: SendAnnixOrbitMessageDto) {
    return this.messageService.send(dto);
  }
}
