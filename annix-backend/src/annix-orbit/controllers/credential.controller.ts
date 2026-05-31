import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { CredentialService } from "../services/credential.service";
import { OrbitCredentialTypeService } from "../services/orbit-credential-type.service";

const CREDENTIAL_DOC_MAX_BYTES = 15 * 1024 * 1024;
const ACCEPTED_CREDENTIAL_DOC_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class CredentialDto {
  @IsString()
  @MaxLength(50)
  credentialType: string;

  @IsOptional()
  @IsString()
  issuedAt?: string | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingAuthority?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentPath?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

class PatchCredentialDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  credentialType?: string;

  @IsOptional()
  @IsString()
  issuedAt?: string | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingAuthority?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  documentPath?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

@Controller("annix-orbit/me/credentials")
@UseGuards(AnnixOrbitAuthGuard)
export class CredentialController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly credentialTypeService: OrbitCredentialTypeService,
  ) {}

  @Get("types")
  async types() {
    const types = await this.credentialTypeService.listActive();
    return { types };
  }

  @Get()
  async list(@Request() req: SeekerAuthRequest) {
    const credentials = await this.credentialService.listForSeeker(req.user.email);
    return { credentials };
  }

  @Post()
  async create(@Request() req: SeekerAuthRequest, @Body() body: CredentialDto) {
    const created = await this.credentialService.createForSeeker(req.user.email, {
      credentialType: body.credentialType,
      issuedAt: body.issuedAt ?? null,
      expiresAt: body.expiresAt ?? null,
      issuingAuthority: body.issuingAuthority ?? null,
      documentPath: body.documentPath ?? null,
      notes: body.notes ?? null,
    });
    if (!created) {
      throw new BadRequestException("No candidate profile to attach the credential to");
    }
    return { credential: created };
  }

  @Patch(":id")
  async update(
    @Request() req: SeekerAuthRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body() body: PatchCredentialDto,
  ) {
    const updated = await this.credentialService.updateForSeeker(req.user.email, id, body);
    if (!updated) {
      throw new NotFoundException("Credential not found");
    }
    return { credential: updated };
  }

  @Delete(":id")
  async delete(@Request() req: SeekerAuthRequest, @Param("id", ParseIntPipe) id: number) {
    const ok = await this.credentialService.deleteForSeeker(req.user.email, id);
    if (!ok) {
      throw new NotFoundException("Credential not found");
    }
    return { success: true };
  }

  @Post("extract-from-cv")
  async autofillFromCv(@Request() req: SeekerAuthRequest) {
    return this.credentialService.autofillFromCvForSeeker(req.user.email);
  }

  @Post("extract-from-document")
  @UseInterceptors(
    FileInterceptor("file", {
      fileFilter: (_req, file, cb) => {
        if (ACCEPTED_CREDENTIAL_DOC_MIMES.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException("Upload a PDF or image of the certificate"), false);
        }
      },
      limits: { fileSize: CREDENTIAL_DOC_MAX_BYTES },
    }),
  )
  async extractFromDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No certificate file was uploaded");
    }
    return this.credentialService.extractFromDocument(file.buffer, file.mimetype);
  }
}
