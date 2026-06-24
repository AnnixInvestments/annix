import { Body, Controller, Post, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  DraftAnnixOrbitMessageDto,
  SendAnnixOrbitMessageDto,
} from "../dto/annix-orbit-message.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { SeekerThrottlerGuard } from "../guards/seeker-throttler.guard";
import { AnnixOrbitMessageService } from "../services/annix-orbit-message.service";

@Controller("annix-orbit/messages")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard, SeekerThrottlerGuard)
@AnnixOrbitRoles(AnnixOrbitRole.VIEWER)
export class AnnixOrbitMessageController {
  constructor(private readonly messageService: AnnixOrbitMessageService) {}

  @Post("draft")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  draft(@Body() dto: DraftAnnixOrbitMessageDto) {
    return this.messageService.draft(dto);
  }

  @Post("send")
  @AnnixOrbitRoles(AnnixOrbitRole.RECRUITER)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  send(
    @Request() req: { user: { id: number; companyId: number; name: string } },
    @Body() dto: SendAnnixOrbitMessageDto,
  ) {
    return this.messageService.send(dto, req.user.companyId, {
      id: req.user.id,
      name: req.user.name,
    });
  }
}
