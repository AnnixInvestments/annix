import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ collection: "throttler_hits", versionKey: false })
export class ThrottlerHit {
  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: Number, required: true })
  totalHits: number;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const ThrottlerHitSchema = SchemaFactory.createForClass(ThrottlerHit);
