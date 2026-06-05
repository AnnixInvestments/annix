import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type VoiceProfileDocument = HydratedDocument<VoiceProfile>;

@Schema({
  collection: "annix_rep_voice_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class VoiceProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Boolean, required: true })
  enrolled: boolean;

  @Prop({ type: String, required: false })
  awsSpeakerId: string;

  @Prop({ type: String, required: false })
  awsDomainId: string;

  @Prop({ type: Date, required: false })
  enrolledAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const VoiceProfileSchema = SchemaFactory.createForClass(VoiceProfile);

VoiceProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
