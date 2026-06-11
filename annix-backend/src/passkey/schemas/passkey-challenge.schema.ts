import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PasskeyChallengeDocument = HydratedDocument<PasskeyChallenge>;

@Schema({
  collection: "passkey_challenges",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PasskeyChallenge {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  userId: number;

  @Prop({ type: String, required: true })
  challenge: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const PasskeyChallengeSchema = SchemaFactory.createForClass(PasskeyChallenge);
