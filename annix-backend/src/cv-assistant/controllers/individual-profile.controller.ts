import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  INDIVIDUAL_DOC_MAX_BYTES,
  isAcceptedDocumentMime,
} from "../config/individual-documents.config";
import { UploadIndividualDocumentDto } from "../dto/individual-profile.dto";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { IndividualProfileService } from "../services/individual-profile.service";

@Controller("cv-assistant/me")
@UseGuards(CvAssistantAuthGuard)
export class IndividualProfileController {
  constructor(private readonly individualProfileService: IndividualProfileService) {}

  @Get("profile/status")
  status(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.status(req.user.id);
  }

  @Get("documents")
  documents(@Request() req: { user: { id: number } }) {
    return this.individualProfileService.listDocuments(req.user.id);
  }

  @Post("documents")
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: (_req, file, cb) => {
        if (isAcceptedDocumentMime(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Unsupported file type"), false);
        }
      },
      limits: { fileSize: INDIVIDUAL_DOC_MAX_BYTES },
    }),
  )
  uploadDocument(
    @Request() req: { user: { id: number } },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadIndividualDocumentDto,
  ) {
    return this.individualProfileService.uploadDocument(req.user.id, file, dto.kind, dto.label);
  }

  @Delete("documents/:id")
  async deleteDocument(
    @Request() req: { user: { id: number } },
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.individualProfileService.deleteDocument(req.user.id, id);
    return { message: "Document deleted" };
  }
}
