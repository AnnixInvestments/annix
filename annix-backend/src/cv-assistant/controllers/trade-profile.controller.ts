import type { TradeProfile } from "@annix/product-data/sa-market";
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Request,
  UseGuards,
} from "@nestjs/common";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { TradeProfileService } from "../services/trade-profile.service";

interface SeekerAuthRequest {
  user: { id: number; email: string; userType: string };
}

@Controller("cv-assistant/seeker/trade-profile")
@UseGuards(CvAssistantAuthGuard)
export class TradeProfileController {
  constructor(private readonly tradeProfileService: TradeProfileService) {}

  @Get()
  async get(@Request() req: SeekerAuthRequest) {
    const result = await this.tradeProfileService.forSeeker(req.user.email);
    return result;
  }

  @Put()
  async upsert(@Request() req: SeekerAuthRequest, @Body() body: TradeProfile) {
    const result = await this.tradeProfileService.upsertForSeeker(req.user.email, body);
    if (!result.saved) {
      throw new NotFoundException("No candidate profile to attach a trade profile to");
    }
    return result;
  }

  @Post("extract-from-cv")
  async autofillFromCv(@Request() req: SeekerAuthRequest) {
    return this.tradeProfileService.autofillFromCvForSeeker(req.user.email);
  }
}
