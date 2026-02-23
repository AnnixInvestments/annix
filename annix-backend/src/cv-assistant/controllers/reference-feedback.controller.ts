import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SubmitReferenceFeedbackDto } from "../dto/candidate.dto";
import { ReferenceService } from "../services/reference.service";

@Controller("cv-assistant/reference-feedback")
export class ReferenceFeedbackController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get(":token")
  async validateToken(@Param("token") token: string) {
    const result = await this.referenceService.validateToken(token);

    if (!result.valid) {
      return {
        valid: false,
        message: "This feedback link is invalid or has expired.",
      };
    }

    return {
      valid: true,
      candidateName: result.candidateName,
      jobTitle: result.jobTitle,
      referenceName: result.reference?.name,
    };
  }

  @Post(":token")
  async submitFeedback(@Param("token") token: string, @Body() dto: SubmitReferenceFeedbackDto) {
    await this.referenceService.submitFeedback(token, dto.rating, dto.feedbackText);
    return {
      message: "Thank you for submitting your feedback.",
    };
  }
}
