import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { CustomerFeedback } from "../feedback/entities/customer-feedback.entity";
import { FeedbackService } from "../feedback/feedback.service";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

@ApiTags("Admin Feedback")
@Controller("admin/feedback")
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @ApiOperation({ summary: "List all customer feedback" })
  @ApiResponse({ status: 200, description: "List of all feedback" })
  async listFeedback(): Promise<CustomerFeedback[]> {
    return this.feedbackService.allFeedback();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get feedback by ID" })
  @ApiResponse({ status: 200, description: "Feedback details" })
  @ApiResponse({ status: 404, description: "Feedback not found" })
  async feedbackById(@Param("id", ParseIntPipe) id: number): Promise<CustomerFeedback | null> {
    return this.feedbackService.feedbackById(id);
  }

  @Post(":id/assign")
  @ApiOperation({ summary: "Assign feedback to the current admin" })
  @ApiResponse({ status: 200, description: "Feedback assigned successfully" })
  @ApiResponse({ status: 404, description: "Feedback not found" })
  async assignFeedback(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<CustomerFeedback> {
    const adminUserId = req["user"].userId;
    return this.feedbackService.assignFeedback(id, adminUserId);
  }

  @Get(":id/attachments")
  @ApiOperation({ summary: "Get presigned URLs for feedback attachments" })
  @ApiResponse({ status: 200, description: "Attachment URLs" })
  async attachmentUrls(@Param("id", ParseIntPipe) id: number) {
    return this.feedbackService.attachmentUrls(id);
  }

  @Put(":id/resolution")
  @ApiOperation({ summary: "Update feedback resolution status and test criteria" })
  @ApiResponse({ status: 200, description: "Resolution updated" })
  async updateResolution(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { resolutionStatus: string | null; testCriteria: string | null },
  ): Promise<CustomerFeedback> {
    return this.feedbackService.updateResolution(id, body.resolutionStatus, body.testCriteria);
  }

  @Post(":id/unassign")
  @ApiOperation({ summary: "Unassign feedback from the current admin" })
  @ApiResponse({ status: 200, description: "Feedback unassigned successfully" })
  @ApiResponse({ status: 404, description: "Feedback not found" })
  async unassignFeedback(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<CustomerFeedback> {
    const adminUserId = req["user"].userId;
    return this.feedbackService.unassignFeedback(id, adminUserId);
  }
}
