import { Controller, Get, Logger, Query, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Public } from "../auth/public.decorator";
import { SageConnectionService } from "./sage-connection.service";

@ApiTags("Sage OAuth")
@Controller("sage")
export class SageOAuthController {
  private readonly logger = new Logger(SageOAuthController.name);

  constructor(
    private readonly sageConnectionService: SageConnectionService,
    private readonly configService: ConfigService,
  ) {}

  @Get("callback")
  @Public()
  @ApiOperation({ summary: "Sage OAuth2 callback handler" })
  async oauthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const settingsUrl = `${frontendUrl}/au-rubber/portal/settings`;

    if (error) {
      this.logger.error(`Sage OAuth error: ${error}`);
      res.redirect(`${settingsUrl}?sage=error&message=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(
        `${settingsUrl}?sage=error&message=${encodeURIComponent("Missing authorization code")}`,
      );
      return;
    }

    try {
      const result = await this.sageConnectionService.handleOAuthCallback(code, state);

      const companiesJson = encodeURIComponent(JSON.stringify(result.companies));
      res.redirect(`${settingsUrl}?sage=connected&companies=${companiesJson}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "OAuth authentication failed";
      this.logger.error(`Sage OAuth callback failed: ${message}`);
      res.redirect(`${settingsUrl}?sage=error&message=${encodeURIComponent(message)}`);
    }
  }
}
