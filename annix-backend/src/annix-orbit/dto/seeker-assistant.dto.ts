import { IsArray, IsObject, IsOptional } from "class-validator";
import { OptionalString, RequiredString } from "../../lib/dto/validation-decorators";

export class SeekerAssistantMessageDto {
  @OptionalString({ maxLength: 16 })
  role?: string;

  @RequiredString({ maxLength: 8000 })
  content: string;
}

export class SeekerAssistantChatDto {
  @RequiredString({ maxLength: 2000 })
  message: string;

  @IsOptional()
  @IsArray()
  history?: SeekerAssistantMessageDto[];

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
