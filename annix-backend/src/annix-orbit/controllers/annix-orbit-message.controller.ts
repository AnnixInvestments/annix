import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  DraftAnnixOrbitMessageDto,
  SendAnnixOrbitMessageDto,
} from "../dto/annix-orbit-message.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { AnnixOrbitMessageService } from "../services/annix-orbit-message.service";

@Controller("annix-orbit/messages")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class AnnixOrbitMessageController {
  constructor(private readonly messageService: AnnixOrbitMessageService) {}

  @Post("draft")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  draft(@Body() dto: DraftAnnixOrbitMessageDto) {
    return this.messageService.draft(dto);
  }

  @Post("send")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  send(@Body() dto: SendAnnixOrbitMessageDto) {
    return this.messageService.send(dto);
  }
}
