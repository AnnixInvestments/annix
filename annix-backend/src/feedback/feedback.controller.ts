import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { CustomerAuthGuard } from "../customer/guards/customer-auth.guard";
import { CustomerDeviceGuard } from "../customer/guards/customer-device.guard";
import { SubmitFeedbackDto, SubmitFeedbackResponseDto } from "./dto";
import { FeedbackService } from "./feedback.service";

@ApiTags("Customer Feedback")
@Controller("customer/feedback")
@UseGuards(CustomerAuthGuard, CustomerDeviceGuard)
@ApiBearerAuth()
@ApiHeader({
  name: "x-device-fingerprint",
  description: "Device fingerprint for verification",
  required: true,
})
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: "Submit customer feedback" })
  @ApiResponse({
    status: 201,
    description: "Feedback submitted successfully",
    type: SubmitFeedbackResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 400, description: "Validation error" })
  async submitFeedback(
    @Body() dto: SubmitFeedbackDto,
    @Req() req: Request,
  ): Promise<SubmitFeedbackResponseDto> {
    const customerId = req["customer"].customerId;
    return this.feedbackService.submitFeedback(customerId, dto);
  }
}
