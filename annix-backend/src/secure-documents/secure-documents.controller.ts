import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AdminAuthGuard } from "../admin/guards/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateSecureDocumentDto } from "./dto/create-secure-document.dto";
import { UpdateSecureDocumentDto } from "./dto/update-secure-document.dto";
import { SecureDocument } from "./secure-document.entity";
import { LocalDocument, SecureDocumentsService } from "./secure-documents.service";
import { EntityType, SecureEntityFolder } from "./secure-entity-folder.entity";

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    sessionToken: string;
  };
}

@ApiTags("Secure Documents")
@Controller("admin/secure-documents")
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles("admin")
@ApiBearerAuth()
export class SecureDocumentsController {
  constructor(private readonly service: SecureDocumentsService) {}

  @Get()
  @ApiOperation({ summary: "List all secure documents (metadata only)" })
  @ApiResponse({
    status: 200,
    description: "List of secure documents",
    type: [SecureDocument],
  })
  async findAll(): Promise<SecureDocument[]> {
    return this.service.findAll();
  }

  @Get("local")
  @ApiOperation({ summary: "List local README.md files from the codebase" })
  @ApiResponse({
    status: 200,
    description: "List of local README files",
  })
  async listLocalMarkdownFiles(): Promise<LocalDocument[]> {
    return this.service.listLocalMarkdownFiles();
  }

  @Get("local/:filePath")
  @ApiOperation({ summary: "Read a local README.md file content" })
  @ApiResponse({
    status: 200,
    description: "File content",
  })
  @ApiResponse({ status: 404, description: "File not found" })
  async readLocalReadme(
    @Param("filePath") filePath: string,
  ): Promise<{ content: string; document: LocalDocument }> {
    const decodedPath = decodeURIComponent(filePath);
    return this.service.readLocalReadme(decodedPath);
  }

  @Get(":idOrSlug")
  @ApiOperation({
    summary: "Get a secure document with decrypted content by ID or slug",
  })
  @ApiResponse({
    status: 200,
    description: "Document with content",
  })
  @ApiResponse({ status: 404, description: "Document not found" })
  async findOne(
    @Param("idOrSlug") idOrSlug: string,
  ): Promise<SecureDocument & { content: string }> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      return this.service.findOneWithContent(idOrSlug);
    }
    return this.service.findBySlugWithContent(idOrSlug);
  }

  @Post()
  @ApiOperation({ summary: "Create a new secure document" })
  @ApiResponse({
    status: 201,
    description: "Document created",
    type: SecureDocument,
  })
  async create(
    @Body() dto: CreateSecureDocumentDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SecureDocument> {
    return this.service.create(dto, req.user.id);
  }

  @Put(":idOrSlug")
  @ApiOperation({ summary: "Update a secure document by ID or slug" })
  @ApiResponse({
    status: 200,
    description: "Document updated",
    type: SecureDocument,
  })
  @ApiResponse({ status: 404, description: "Document not found" })
  async update(
    @Param("idOrSlug") idOrSlug: string,
    @Body() dto: UpdateSecureDocumentDto,
  ): Promise<SecureDocument> {
    const id = await this.resolveId(idOrSlug);
    return this.service.update(id, dto);
  }

  @Delete(":idOrSlug")
  @ApiOperation({ summary: "Delete a secure document by ID or slug" })
  @ApiResponse({ status: 200, description: "Document deleted" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async remove(@Param("idOrSlug") idOrSlug: string): Promise<void> {
    const id = await this.resolveId(idOrSlug);
    return this.service.remove(id);
  }

  @Get(":idOrSlug/attachment-url")
  @ApiOperation({
    summary: "Get presigned download URL for document attachment",
  })
  @ApiResponse({
    status: 200,
    description: "Presigned URL for attachment download",
    schema: {
      properties: {
        url: { type: "string" },
        filename: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Document or attachment not found" })
  async attachmentDownloadUrl(
    @Param("idOrSlug") idOrSlug: string,
  ): Promise<{ url: string; filename: string }> {
    const id = await this.resolveId(idOrSlug);
    return this.service.attachmentDownloadUrl(id);
  }

  @Get("entity-folders/list")
  @ApiOperation({ summary: "List all entity folders (customers/suppliers)" })
  @ApiResponse({
    status: 200,
    description: "List of entity folders",
    type: [SecureEntityFolder],
  })
  async listEntityFolders(): Promise<SecureEntityFolder[]> {
    return this.service.listAllEntityFolders();
  }

  @Get("entity-folders/:entityType/:entityId")
  @ApiOperation({ summary: "Get entity folder and its documents" })
  @ApiResponse({
    status: 200,
    description: "Entity folder with documents",
  })
  async entityFolderDocuments(
    @Param("entityType") entityType: EntityType,
    @Param("entityId") entityId: string,
  ): Promise<{ folder: SecureEntityFolder | null; documents: SecureDocument[] }> {
    const id = parseInt(entityId, 10);
    const folder = await this.service.entityFolder(entityType, id);
    const documents = await this.service.listEntityFolderDocuments(entityType, id);
    return { folder, documents };
  }

  private async resolveId(idOrSlug: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    if (isUuid) {
      return idOrSlug;
    }
    const document = await this.service.findBySlug(idOrSlug);
    return document.id;
  }
}
