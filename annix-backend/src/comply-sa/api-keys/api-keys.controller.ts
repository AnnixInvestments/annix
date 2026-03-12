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
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaApiKeysService } from "./api-keys.service";
import { ComplySaCreateApiKeyDto } from "./dto/create-api-key.dto";

@ApiTags("comply-sa/api-keys")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/api-keys")
export class ComplySaApiKeysController {
  constructor(private readonly apiKeysService: ComplySaApiKeysService) {}

  @Post()
  async create(@Req() req: { user: { companyId: number } }, @Body() dto: ComplySaCreateApiKeyDto) {
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
