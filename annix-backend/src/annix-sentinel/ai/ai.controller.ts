import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelAiService } from "./ai.service";

@ApiTags("annix-sentinel/ai")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/ai")
export class AnnixSentinelAiController {
  constructor(private readonly aiService: AnnixSentinelAiService) {}

  @Post("chat")
  async chat(@Req() req: { user: { companyId: number } }, @Body() body: { question: string }) {
    return this.aiService.chat(req.user.companyId, body.question);
  }
}
