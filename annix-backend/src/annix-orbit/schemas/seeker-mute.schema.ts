import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerMuteDocument = HydratedDocument<SeekerMute>;

@Schema({
  collection: "cv_assistant_seeker_mutes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerMute {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: false })
  companyName: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: false })
  mutedAt: string;
}

export const SeekerMuteSchema = SchemaFactory.createForClass(SeekerMute);
