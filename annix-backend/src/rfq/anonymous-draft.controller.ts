import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AnonymousDraftService } from "./anonymous-draft.service";
import {
  AnonymousDraftFullResponseDto,
  AnonymousDraftResponseDto,
  RecoveryEmailResponseDto,
  RequestRecoveryEmailDto,
  SaveAnonymousDraftDto,
} from "./dto/anonymous-draft.dto";

@ApiTags("Anonymous Drafts")
@Controller("rfq/anonymous-drafts")
export class AnonymousDraftController {
  constructor(private readonly anonymousDraftService: AnonymousDraftService) {}

  @Post()
  @ApiOperation({
    summary: "Save anonymous RFQ draft",
    description:
      "Save an RFQ draft for unregistered users. Returns a recovery token that can be used to retrieve the draft later.",
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Draft saved successfully",
    type: AnonymousDraftResponseDto,
  })
  @ApiBody({
    description: "Anonymous draft data to save",
    type: SaveAnonymousDraftDto,
    examples: {
      example1: {
        summary: "Save new anonymous draft",
        value: {
          customerEmail: "customer@example.com",
          projectName: "Pipeline Extension Project",
          currentStep: 2,
          formData: {
            projectName: "Pipeline Extension Project",
            customerName: "John Doe",
            customerEmail: "customer@example.com",
            requiredByDate: "2025-12-31",
          },
          globalSpecs: {
            workingPressure: 10,
            workingTemperature: 120,
          },
          requiredProducts: ["fabricated_steel", "surface_protection"],
          entries: [],
        },
      },
    },
  })
  async saveDraft(@Body() dto: SaveAnonymousDraftDto): Promise<AnonymousDraftResponseDto> {
    return this.anonymousDraftService.saveDraft(dto);
  }

  @Get("token/:token")
  @ApiOperation({
    summary: "Get anonymous draft by recovery token",
    description:
      "Retrieve a saved anonymous draft using its recovery token. This is used when loading a draft from a recovery link.",
  })
  @ApiParam({
    name: "token",
    description: "Recovery token",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Draft retrieved successfully",
    type: AnonymousDraftFullResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Draft not found or expired",
  })
  async getDraftByToken(@Param("token") token: string): Promise<AnonymousDraftFullResponseDto> {
    return this.anonymousDraftService.getDraftByToken(token);
  }

  @Post("request-recovery")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Request recovery email",
    description:
      "Send a recovery email to the specified address if a draft exists for that email. For security, always returns success even if no draft is found.",
  })
  @ApiBody({
    description: "Email to send recovery link to",
    type: RequestRecoveryEmailDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Recovery email sent if draft exists",
    type: RecoveryEmailResponseDto,
  })
  async requestRecoveryEmail(
    @Body() dto: RequestRecoveryEmailDto,
  ): Promise<RecoveryEmailResponseDto> {
    return this.anonymousDraftService.sendRecoveryEmail(dto.customerEmail);
  }

  @Post("token/:token/claim/:userId")
  @ApiOperation({
    summary: "Claim anonymous draft for registered user",
    description:
      "When a user registers, claim their anonymous draft and associate it with their account. This transfers the draft to their account.",
  })
  @ApiParam({
    name: "token",
    description: "Recovery token of the anonymous draft",
    type: String,
  })
  @ApiParam({
    name: "userId",
    description: "User ID to claim the draft for",
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Draft claimed successfully",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Draft not found or expired",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Draft already claimed",
  })
  async claimDraft(
    @Param("token") token: string,
    @Param("userId") userId: number,
  ): Promise<{ message: string; draftId: number }> {
    return this.anonymousDraftService.claimDraft(token, userId);
  }
}
