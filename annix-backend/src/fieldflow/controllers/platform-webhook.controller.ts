import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { CalendarWebhookService } from "../services/calendar-webhook.service";

@ApiTags("Webhooks - Meeting Platforms")
@Controller("webhooks")
export class PlatformWebhookController {
  private readonly logger = new Logger(PlatformWebhookController.name);

  constructor(private readonly webhookService: CalendarWebhookService) {}

  @Post("zoom")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Zoom webhook events" })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  async zoomWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const payload = body as Record<string, unknown>;

    if (payload.event === "endpoint.url_validation") {
      const payloadData = payload.payload as { plainToken?: string } | undefined;
      if (payloadData?.plainToken) {
        const validation = this.webhookService.zoomUrlValidationResponse(payloadData.plainToken);
        res.status(200).json(validation);
        return;
      }
    }

    const result = await this.webhookService.processZoomWebhook(headers, body);

    this.logger.log(`Zoom webhook: ${result.action} - ${result.success ? "success" : "failed"}`);

    res.status(200).json({ status: "received" });
  }

  @Post("teams")
  @ApiOperation({ summary: "Receive Microsoft Teams webhook events" })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  @ApiResponse({ status: 202, description: "Webhook accepted" })
  async teamsWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const payload = body as Record<string, unknown>;

    if (payload.validationToken) {
      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(payload.validationToken as string);
      return;
    }

    const result = await this.webhookService.processTeamsWebhook(headers, body);

    this.logger.log(`Teams webhook: ${result.action} - ${result.success ? "success" : "failed"}`);

    res.status(202).json({ status: "accepted" });
  }

  @Post("google-calendar")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Google Calendar webhook events" })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  async googleCalendarWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ): Promise<{ status: string }> {
    const resourceState = headers["x-goog-resource-state"];

    if (resourceState === "sync") {
      this.logger.debug("Google Calendar sync notification received");
      return { status: "sync acknowledged" };
    }

    const result = await this.webhookService.processGoogleWebhook(headers, body);

    this.logger.log(`Google webhook: ${result.action} - ${result.success ? "success" : "failed"}`);

    return { status: "received" };
  }

  @Post("google-meet")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive Google Meet webhook events (via Calendar)" })
  @ApiResponse({ status: 200, description: "Webhook processed" })
  async googleMeetWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
  ): Promise<{ status: string }> {
    return this.googleCalendarWebhook(headers, body);
  }
}
