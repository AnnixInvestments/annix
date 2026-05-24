import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelApiKeysService } from "./api-keys.service";
import { AnnixSentinelCreateApiKeyDto } from "./dto/create-api-key.dto";

@ApiTags("annix-sentinel/api-keys")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/api-keys")
export class AnnixSentinelApiKeysController {
  constructor(private readonly apiKeysService: AnnixSentinelApiKeysService) {}

  @Post()
  async create(
    @Req() req: { user: { companyId: number } },
    @Body() dto: AnnixSentinelCreateApiKeyDto,
  ) {
    return this.apiKeysService.generateKey(req.user.companyId, dto.name);
  }

  @Get()
  async list(@Req() req: { user: { companyId: number } }) {
    return this.apiKeysService.listKeys(req.user.companyId);
  }

  @Delete(":id")
  async revoke(@Req() req: { user: { companyId: number } }, @Param("id", ParseIntPipe) id: number) {
    return this.apiKeysService.revokeKey(req.user.companyId, id);
  }
}
