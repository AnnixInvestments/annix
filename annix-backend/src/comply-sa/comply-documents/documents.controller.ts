import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { ComplySaCompanyScopeGuard } from "../comply-auth/guards/company-scope.guard";
import { ComplySaJwtAuthGuard } from "../comply-auth/guards/jwt-auth.guard";
import { ComplySaDocumentsService } from "./documents.service";

@ApiTags("comply-sa/documents")
@ApiBearerAuth()
@UseGuards(ComplySaJwtAuthGuard, ComplySaCompanyScopeGuard)
@Controller("comply-sa/documents")
export class ComplySaDocumentsController {
  constructor(private readonly documentsService: ComplySaDocumentsService) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Req() req: { user: { companyId: number; userId: number }; body: { requirementId?: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const requirementId = req.body.requirementId
      ? parseInt(req.body.requirementId, 10)
      : null;

    return this.documentsService.upload(
      req.user.companyId,
      file,
      requirementId,
      req.user.userId,
    );
  }

  @Get()
  async list(@Req() req: { user: { companyId: number } }) {
    return this.documentsService.documentsForCompany(req.user.companyId);
  }

  @Get("requirement/:requirementId")
  async byRequirement(
    @Req() req: { user: { companyId: number } },
    @Param("requirementId", ParseIntPipe) requirementId: number,
  ) {
    return this.documentsService.documentsByRequirement(
      req.user.companyId,
      requirementId,
    );
  }

  @Get(":id/url")
  async downloadUrl(
    @Req() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    const url = await this.documentsService.presignedUrl(
      req.user.companyId,
      id,
    );
    return { url };
  }

  @Delete(":id")
  async remove(
    @Req() req: { user: { companyId: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.documentsService.remove(req.user.companyId, id);
  }
}
