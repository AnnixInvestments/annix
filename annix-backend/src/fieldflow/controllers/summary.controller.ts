import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MeetingSummaryDto, SendSummaryDto, SendSummaryResultDto, SummaryPreviewDto } from "../dto";
import { MeetingSummaryService } from "../services/meeting-summary.service";

@ApiTags("FieldFlow Meeting Summaries")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("fieldflow/summaries")
export class SummaryController {
  constructor(private readonly summaryService: MeetingSummaryService) {}

  @Get("meeting/:meetingId/preview")
  @ApiOperation({ summary: "Preview meeting summary before sending" })
  @ApiParam({ name: "meetingId", type: Number })
  @ApiResponse({ status: 200, type: SummaryPreviewDto })
  async previewSummary(
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ): Promise<SummaryPreviewDto> {
    return this.summaryService.previewSummary(meetingId);
  }

  @Get("meeting/:meetingId")
  @ApiOperation({ summary: "Generate meeting summary" })
  @ApiParam({ name: "meetingId", type: Number })
  @ApiResponse({ status: 200, type: MeetingSummaryDto })
  async generateSummary(
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ): Promise<MeetingSummaryDto> {
    return this.summaryService.generateSummary(meetingId);
  }

  @Post("meeting/:meetingId/send")
  @ApiOperation({ summary: "Send meeting summary email to recipients" })
  @ApiParam({ name: "meetingId", type: Number })
  @ApiResponse({ status: 201, type: SendSummaryResultDto })
  async sendSummary(
    @Param("meetingId", ParseIntPipe) meetingId: number,
    @Body() dto: SendSummaryDto,
  ): Promise<SendSummaryResultDto> {
    return this.summaryService.sendSummaryEmail(meetingId, dto);
  }
}
