import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollIssuanceDocument = HydratedDocument<RubberRollIssuance>;

@Schema({
  collection: "rubber_roll_issuances",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRollIssuance {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rollStockId: number;

  @Prop({ type: String, required: true })
  issuedBy: string;

  @Prop({ type: Date, required: true })
  issuedAt: Date;

  @Prop({ type: Number, required: true })
  rollWeightAtIssueKg: number;

  @Prop({ type: Number, required: false })
  totalEstimatedUsageKg: number;

  @Prop({ type: Number, required: false })
  expectedReturnKg: number;

  @Prop({ type: String, required: false })
  photoPath: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberRollIssuanceSchema = SchemaFactory.createForClass(RubberRollIssuance);

RubberRollIssuanceSchema.virtual("rollStock", {
  ref: "RubberRollStock",
  localField: "rollStockId",
  foreignField: "_id",
  justOne: true,
});

RubberRollIssuanceSchema.virtual("items", {
  ref: "RubberRollIssuanceItem",
  localField: "_id",
  foreignField: "issuanceId",
  justOne: false,
});
