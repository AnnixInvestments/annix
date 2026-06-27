import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ResolveAppDto, ResolveAppResponseDto } from "./dto/resolve-app.dto";
import { CoreAuthThrottlerGuard } from "./guards/auth-throttler.guard";
import { UnifiedLoginService } from "./unified-login.service";

@ApiTags("Auth")
@Controller("auth")
@UseGuards(CoreAuthThrottlerGuard)
export class UnifiedLoginController {
  constructor(private readonly unifiedLoginService: UnifiedLoginService) {}

  @Post("resolve-app")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Resolve which app a set of credentials belongs to" })
  async resolveApp(@Body() body: ResolveAppDto): Promise<ResolveAppResponseDto> {
    return this.unifiedLoginService.resolveApp(body.email, body.password);
  }
}
