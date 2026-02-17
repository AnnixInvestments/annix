import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FieldFlowAuthGuard } from "../auth";
import { TranscriptWithSegmentsDto } from "../dto";
import { TranscriptionService } from "../services/transcription.service";

@ApiTags("FieldFlow Transcripts")
@ApiBearerAuth()
@UseGuards(FieldFlowAuthGuard)
@Controller("fieldflow/transcripts")
export class TranscriptController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Get("recording/:recordingId")
  @ApiOperation({ summary: "Get transcript for a recording" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 200, type: TranscriptWithSegmentsDto })
  async transcriptByRecording(
    @Param("recordingId", ParseIntPipe) recordingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.transcript(recordingId);
    if (!transcript) {
      throw new NotFoundException("Transcript not found");
    }
    return transcript;
  }

  @Get("meeting/:meetingId")
  @ApiOperation({ summary: "Get transcript for a meeting" })
  @ApiParam({ name: "meetingId", type: Number })
  @ApiResponse({ status: 200, type: TranscriptWithSegmentsDto })
  async transcriptByMeeting(
    @Param("meetingId", ParseIntPipe) meetingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.transcriptByMeeting(meetingId);
    if (!transcript) {
      throw new NotFoundException("Transcript not found");
    }
    return transcript;
  }

  @Post("recording/:recordingId/transcribe")
  @ApiOperation({ summary: "Transcribe a recording" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 201, type: TranscriptWithSegmentsDto })
  async transcribe(
    @Param("recordingId", ParseIntPipe) recordingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.transcribeRecording(recordingId);
    return {
      id: transcript.id,
      recordingId: transcript.recordingId,
      fullText: transcript.fullText,
      wordCount: transcript.wordCount,
      summary: transcript.summary,
      analysis: transcript.analysis,
      whisperModel: transcript.whisperModel,
      language: transcript.language,
      processingTimeMs: transcript.processingTimeMs,
      createdAt: transcript.createdAt,
      segments: transcript.segments,
    };
  }

  @Post("recording/:recordingId/retranscribe")
  @ApiOperation({ summary: "Re-transcribe a recording (deletes existing transcript)" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 201, type: TranscriptWithSegmentsDto })
  async retranscribe(
    @Param("recordingId", ParseIntPipe) recordingId: number,
  ): Promise<TranscriptWithSegmentsDto> {
    const transcript = await this.transcriptionService.retranscribe(recordingId);
    return {
      id: transcript.id,
      recordingId: transcript.recordingId,
      fullText: transcript.fullText,
      wordCount: transcript.wordCount,
      summary: transcript.summary,
      analysis: transcript.analysis,
      whisperModel: transcript.whisperModel,
      language: transcript.language,
      processingTimeMs: transcript.processingTimeMs,
      createdAt: transcript.createdAt,
      segments: transcript.segments,
    };
  }

  @Delete("recording/:recordingId")
  @ApiOperation({ summary: "Delete transcript for a recording" })
  @ApiParam({ name: "recordingId", type: Number })
  @ApiResponse({ status: 204 })
  async deleteTranscript(@Param("recordingId", ParseIntPipe) recordingId: number): Promise<void> {
    await this.transcriptionService.deleteTranscript(recordingId);
  }
}
