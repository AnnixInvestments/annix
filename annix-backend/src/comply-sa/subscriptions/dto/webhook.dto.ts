import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class ComplySaWebhookDto {
  @IsString()
  @IsNotEmpty()
  event!: string;

  @IsObject()
  data!: Record<string, unknown>;
}
