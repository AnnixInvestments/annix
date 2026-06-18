import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class SubmitWhatsAppConsentDto {
  @IsString()
  @IsNotEmpty()
  whatsappPhone: string;

  @IsBoolean()
  consent: boolean;
}

export interface WhatsAppConsentContext {
  firstName: string | null;
  maskedEmail: string;
  currentPhone: string | null;
  alreadyOptedIn: boolean;
}

export interface WhatsAppConsentResult {
  optedIn: true;
}
