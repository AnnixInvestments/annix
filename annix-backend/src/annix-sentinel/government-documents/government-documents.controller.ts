import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AnnixSentinelCompanyScopeGuard } from "../sentinel-auth/guards/company-scope.guard";
import { AnnixSentinelJwtAuthGuard } from "../sentinel-auth/guards/jwt-auth.guard";
import { AnnixSentinelGovernmentDocumentsService } from "./government-documents.service";

@ApiTags("annix-sentinel/government-documents")
@ApiBearerAuth()
@UseGuards(AnnixSentinelJwtAuthGuard, AnnixSentinelCompanyScopeGuard)
@Controller("annix-sentinel/government-documents")
export class AnnixSentinelGovernmentDocumentsController {
  constructor(private readonly service: AnnixSentinelGovernmentDocumentsService) {}

  @Get()
  async list() {
    return this.service.listGroupedByCategory();
  }

  @Get(":id/url")
  async downloadUrl(@Param("id", ParseIntPipe) id: number) {
    const url = await this.service.documentDownloadUrl(id);
    return { url };
  }

  @Post("sync")
  async syncAll() {
    return this.service.syncAll();
  }

  @Post(":id/sync")
  async syncOne(@Param("id", ParseIntPipe) id: number) {
    const doc = await this.service.syncDocument(id);
    return { synced: doc.synced, filePath: doc.filePath };
  }
}
