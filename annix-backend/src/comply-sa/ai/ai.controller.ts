import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaAiService } from "./ai.service";

@ApiTags("comply-sa/ai")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/ai")
export class ComplySaAiController {
  constructor(private readonly aiService: ComplySaAiService) {}

  @Post("chat")
  async chat(@Req() req: { user: { companyId: number } }, @Body() body: { question: string }) {
    return this.aiService.chat(req.user.companyId, body.question);
  }
}
