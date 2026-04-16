import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { SubmitFeedbackResponseDto } from "./dto";
import { FeedbackService } from "./feedback.service";
import { FeedbackAuthGuard, type FeedbackSubmitter } from "./guards/feedback-auth.guard";

function parseJsonArray(value?: string): string[] | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return null;
  }
}

@ApiTags("Feedback")
@Controller("feedback")
@UseGuards(FeedbackAuthGuard)
@ApiBearerAuth()
export class GeneralFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get(":id/status")
  @ApiOperation({ summary: "Get feedback status for the authenticated submitter" })
  @ApiResponse({ status: 200, description: "Feedback status retrieved" })
  @ApiResponse({ status: 404, description: "Feedback not found" })
  async feedbackStatus(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
    const submitter = req["feedbackSubmitter"] as FeedbackSubmitter;
    return this.feedbackService.feedbackStatusForSubmitter(id, submitter);
  }

  @Post()
  @ApiOperation({ summary: "Submit feedback with optional attachments (any authenticated user)" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({ status: 201, type: SubmitFeedbackResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @UseInterceptors(
    FilesInterceptor("files", 5, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async submitFeedback(
    @Body()
    body: {
      content: string;
      source?: string;
      pageUrl?: string;
      captureUrl?: string;
      viewportWidth?: string;
      viewportHeight?: string;
      devicePixelRatio?: string;
      userAgent?: string;
      previewUserId?: string;
      previewUserName?: string;
      previewUserEmail?: string;
      lastUserActions?: string;
      consoleErrors?: string;
      failedNetworkCalls?: string;
      clickedElement?: string;
      appContext?: string;
    },
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<SubmitFeedbackResponseDto> {
    const submitter = req["feedbackSubmitter"] as FeedbackSubmitter;

    const content = body.content || "";
    if (content.length < 10 || content.length > 5000) {
      throw new Error("Feedback content must be between 10 and 5000 characters");
    }

    const source = body.source === "voice" ? ("voice" as const) : ("text" as const);

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    return this.feedbackService.submitGeneralFeedback(
      submitter,
      {
        content,
        source,
        pageUrl: body.pageUrl || null,
        captureUrl: body.captureUrl || null,
        viewportWidth: body.viewportWidth ? Number(body.viewportWidth) : null,
        viewportHeight: body.viewportHeight ? Number(body.viewportHeight) : null,
        devicePixelRatio: body.devicePixelRatio ? Number(body.devicePixelRatio) : null,
        userAgent: body.userAgent || null,
        previewUserId: body.previewUserId ? Number(body.previewUserId) : null,
        previewUserName: body.previewUserName || null,
        previewUserEmail: body.previewUserEmail || null,
        lastUserActions: parseJsonArray(body.lastUserActions),
        consoleErrors: parseJsonArray(body.consoleErrors),
        failedNetworkCalls: parseJsonArray(body.failedNetworkCalls),
        clickedElement: body.clickedElement || null,
        appContext: body.appContext || null,
      },
      files || [],
      bearerToken,
    );
  }
}
