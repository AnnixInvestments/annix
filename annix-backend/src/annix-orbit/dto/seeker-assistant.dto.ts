import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsObject, IsOptional, ValidateNested } from "class-validator";
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
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SeekerAssistantMessageDto)
  history?: SeekerAssistantMessageDto[];

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
