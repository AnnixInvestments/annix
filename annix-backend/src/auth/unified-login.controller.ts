import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ResolveAppDto, ResolveAppResponseDto } from "./dto/resolve-app.dto";
import { UnifiedLoginService } from "./unified-login.service";

@ApiTags("Auth")
@Controller("auth")
export class UnifiedLoginController {
  constructor(private readonly unifiedLoginService: UnifiedLoginService) {}

  @Post("resolve-app")
  @ApiOperation({ summary: "Resolve which app a set of credentials belongs to" })
  async resolveApp(@Body() body: ResolveAppDto): Promise<ResolveAppResponseDto> {
    return this.unifiedLoginService.resolveApp(body.email, body.password);
  }
}
