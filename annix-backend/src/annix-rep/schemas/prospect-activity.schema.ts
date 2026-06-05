import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ProspectActivityDocument = HydratedDocument<ProspectActivity>;

@Schema({
  collection: "annix_rep_prospect_activities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ProspectActivity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  prospectId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  activityType: string;

  @Prop({ type: Object, required: false })
  oldValues: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  newValues: Record<string, unknown>;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Object, required: false })
  metadata: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const ProspectActivitySchema = SchemaFactory.createForClass(ProspectActivity);

ProspectActivitySchema.virtual("prospect", {
  ref: "Prospect",
  localField: "prospectId",
  foreignField: "_id",
  justOne: true,
});

ProspectActivitySchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
