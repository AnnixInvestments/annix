import {
  Body,
  Controller,
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

@ApiTags("Feedback")
@Controller("feedback")
@UseGuards(FeedbackAuthGuard)
@ApiBearerAuth()
export class GeneralFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

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
    @Body() body: { content: string; source?: string; pageUrl?: string; appContext?: string },
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ): Promise<SubmitFeedbackResponseDto> {
    const submitter = req["feedbackSubmitter"] as FeedbackSubmitter;

    const content = body.content || "";
    if (content.length < 10 || content.length > 5000) {
      throw new Error("Feedback content must be between 10 and 5000 characters");
    }

    const source = body.source === "voice" ? ("voice" as const) : ("text" as const);

    return this.feedbackService.submitGeneralFeedback(
      submitter,
      {
        content,
        source,
        pageUrl: body.pageUrl || null,
        appContext: body.appContext || null,
      },
      files || [],
    );
  }
}
