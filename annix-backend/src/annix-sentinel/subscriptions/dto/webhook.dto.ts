import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class AnnixSentinelWebhookDto {
  @IsString()
  @IsNotEmpty()
  event!: string;

  @IsObject()
  data!: Record<string, unknown>;
}
