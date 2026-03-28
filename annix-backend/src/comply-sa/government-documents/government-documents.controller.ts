import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaGovernmentDocumentsService } from "./government-documents.service";

@ApiTags("comply-sa/government-documents")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/government-documents")
export class ComplySaGovernmentDocumentsController {
  constructor(private readonly service: ComplySaGovernmentDocumentsService) {}

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
