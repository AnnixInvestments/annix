import * as fs from "node:fs";
import * as path from "node:path";
import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Request,
  Response,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { isArray } from "es-toolkit/compat";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { AnyUserAuthGuard } from "../auth/guards/any-user-auth.guard";
import { nowMillis } from "../lib/datetime";
import { contentTypeForPath } from "./file-content-type";
import { verifyFileUrlSignature } from "./file-url-signature";

@ApiTags("Files")
@Controller("files")
export class FilesController {
  private readonly uploadDir: string;
  private readonly signingSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly anyUserAuthGuard: AnyUserAuthGuard,
  ) {
    this.uploadDir = path.resolve(this.configService.get<string>("UPLOAD_DIR") || "./uploads");
    this.signingSecret =
      this.configService.get<string>("FILE_URL_SIGNING_SECRET") ||
      this.configService.get<string>("JWT_SECRET") ||
      "";
  }

  @Get("*path")
  @ApiBearerAuth()
  @ApiQuery({ name: "exp", required: false, description: "Signed-URL expiry (unix millis)" })
  @ApiQuery({ name: "sig", required: false, description: "Signed-URL HMAC signature" })
  @ApiOperation({ summary: "Stream an uploaded file (signed URL or authenticated)" })
  @ApiResponse({ status: 200, description: "File streamed" })
  @ApiResponse({ status: 401, description: "Authentication required" })
  @ApiResponse({ status: 404, description: "File not found" })
  async serveFile(
    @Param("path") requestedPath: string,
    @Query("exp") exp: string | undefined,
    @Query("sig") sig: string | undefined,
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<StreamableFile> {
    const relativePath = isArray(requestedPath) ? requestedPath.join("/") : requestedPath;
    const fullPath = this.resolveWithinUploadDir(relativePath);

    await this.authorizeRequest(relativePath, exp ?? null, sig ?? null, req);

    const stat = this.statFileOrThrow(fullPath);

    res.set({
      "Content-Type": contentTypeForPath(fullPath),
      "Content-Disposition": `inline; filename="${path.basename(fullPath)}"`,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, no-store",
    });

    return new StreamableFile(fs.createReadStream(fullPath));
  }

  private async authorizeRequest(
    relativePath: string,
    exp: string | null,
    sig: string | null,
    req: ExpressRequest,
  ): Promise<void> {
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const signatureValid = verifyFileUrlSignature(
      normalizedPath,
      exp,
      sig,
      this.signingSecret,
      nowMillis(),
    );
    if (signatureValid) {
      return;
    }

    await this.authorizeBearerToken(req);
  }

  private async authorizeBearerToken(req: ExpressRequest): Promise<void> {
    const context = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as Parameters<AnyUserAuthGuard["canActivate"]>[0];

    const allowed = await this.anyUserAuthGuard.canActivate(context);
    if (!allowed) {
      throw new UnauthorizedException("Authentication required");
    }
  }

  private resolveWithinUploadDir(relativePath: string): string {
    const decoded = this.decodePath(relativePath);
    if (decoded.includes("\0")) {
      throw new BadRequestException("Invalid file path");
    }

    const resolved = path.resolve(this.uploadDir, decoded);
    const root = this.uploadDir.endsWith(path.sep)
      ? this.uploadDir
      : `${this.uploadDir}${path.sep}`;
    if (resolved !== this.uploadDir && !resolved.startsWith(root)) {
      throw new BadRequestException("Invalid file path");
    }

    return resolved;
  }

  private decodePath(relativePath: string): string {
    try {
      return decodeURIComponent(relativePath);
    } catch {
      throw new BadRequestException("Invalid file path");
    }
  }

  private statFileOrThrow(fullPath: string): fs.Stats {
    const stat = fs.existsSync(fullPath) ? fs.statSync(fullPath) : null;
    if (!stat?.isFile()) {
      throw new NotFoundException("File not found");
    }
    return stat;
  }
}
