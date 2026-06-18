import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IssuanceRowDocument = HydratedDocument<IssuanceRow>;

@Schema({
  collection: "sm_issuance_row",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IssuanceRow {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  sessionId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  rowType: string;

  @Prop({ type: Number, required: true })
  productId: number;

  @Prop({ type: Number, required: false })
  jobCardId: number;

  @Prop({ type: Boolean, required: false, default: false })
  undone: boolean;

  @Prop({ type: Date, required: false })
  undoneAt: Date;

  @Prop({ type: Number, required: false })
  undoneByStaffId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Number, required: false })
  consumableId: number;

  @Prop({ type: Number, required: false })
  paintId: number;

  @Prop({ type: Number, required: false })
  rubberRollId: number;

  @Prop({ type: Number, required: false })
  solutionId: number;
}

export const IssuanceRowSchema = SchemaFactory.createForClass(IssuanceRow);

IssuanceRowSchema.virtual("session", {
  ref: "IssuanceSession",
  localField: "sessionId",
  foreignField: "_id",
  justOne: true,
});

IssuanceRowSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

IssuanceRowSchema.virtual("consumable", {
  ref: "ConsumableIssuanceRow",
  localField: "consumableId",
  foreignField: "_id",
  justOne: true,
});

IssuanceRowSchema.virtual("paint", {
  ref: "PaintIssuanceRow",
  localField: "paintId",
  foreignField: "_id",
  justOne: true,
});

IssuanceRowSchema.virtual("rubberRoll", {
  ref: "RubberRollIssuanceRow",
  localField: "rubberRollId",
  foreignField: "_id",
  justOne: true,
});

IssuanceRowSchema.virtual("solution", {
  ref: "SolutionIssuanceRow",
  localField: "solutionId",
  foreignField: "_id",
  justOne: true,
});
