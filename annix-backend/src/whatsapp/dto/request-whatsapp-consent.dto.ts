import { IsIn, IsOptional } from "class-validator";

export type WhatsAppConsentChannel = "email" | "whatsapp";

export class RequestWhatsAppConsentDto {
  @IsOptional()
  @IsIn(["email", "whatsapp"])
  channel?: WhatsAppConsentChannel;
}
