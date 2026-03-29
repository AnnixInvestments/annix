import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import { FeedbackService } from "./feedback.service";

interface ResolvedWebhookDto {
  issueNumber: number;
  prNumber: number;
}

@ApiExcludeController()
@Controller("feedback/github-webhook")
export class FeedbackWebhookController {
  private readonly logger = new Logger(FeedbackWebhookController.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly configService: ConfigService,
  ) {}

  @Post("resolved")
  @HttpCode(200)
  async handleResolved(
    @Body() dto: ResolvedWebhookDto,
    @Headers("x-webhook-secret") secret: string,
  ): Promise<{ ok: boolean }> {
    const expectedSecret = this.configService.get<string>("GITHUB_WEBHOOK_SECRET");

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }

    await this.feedbackService.markResolvedByIssue(dto.issueNumber, dto.prNumber);

    this.logger.log(`Feedback resolved via GitHub issue #${dto.issueNumber}, PR #${dto.prNumber}`);

    return { ok: true };
  }
}
