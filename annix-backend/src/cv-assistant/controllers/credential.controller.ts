import { CREDENTIAL_TYPES, type CredentialType } from "@annix/product-data/sa-market";
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
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { CredentialService } from "../services/credential.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

class CredentialDto {
  @IsIn(CREDENTIAL_TYPES as unknown as string[])
  credentialType: CredentialType;

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
  @IsIn(CREDENTIAL_TYPES as unknown as string[])
  credentialType?: CredentialType;

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

@Controller("cv-assistant/me/credentials")
@UseGuards(CvAssistantAuthGuard)
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

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
}
