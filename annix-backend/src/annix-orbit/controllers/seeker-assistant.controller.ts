import { Body, Controller, Post, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SeekerAssistantChatDto } from "../dto/seeker-assistant.dto";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitRoleGuard, AnnixOrbitRoles } from "../guards/annix-orbit-role.guard";
import { SeekerThrottlerGuard } from "../guards/seeker-throttler.guard";
import type { SeekerAssistantContext } from "../prompts/seeker-assistant.prompt";
import { SeekerAssistantService } from "../services/seeker-assistant.service";

interface SeekerAuthRequest {
  user: { id: number };
}

@Controller("annix-orbit/me")
@UseGuards(AnnixOrbitAuthGuard, AnnixOrbitRoleGuard, SeekerThrottlerGuard)
@AnnixOrbitRoles(AnnixOrbitRole.INDIVIDUAL)
export class SeekerAssistantController {
  constructor(private readonly assistant: SeekerAssistantService) {}

  @Post("seeker-assistant/chat")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  chat(@Request() req: SeekerAuthRequest, @Body() dto: SeekerAssistantChatDto) {
    return this.assistant.chat(req.user.id, {
      message: dto.message,
      history: dto.history,
      context: dto.context as SeekerAssistantContext | undefined,
    });
  }
}
