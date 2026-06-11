import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberAccountSignOffDocument = HydratedDocument<RubberAccountSignOff>;

@Schema({
  collection: "rubber_account_sign_offs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberAccountSignOff {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  monthlyAccountId: number;

  @Prop({ type: String, required: true })
  directorName: string;

  @Prop({ type: String, required: true })
  directorEmail: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  signedAt: Date;

  @Prop({ type: String, required: true })
  signOffToken: string;

  @Prop({ type: Date, required: true })
  tokenExpiresAt: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberAccountSignOffSchema = SchemaFactory.createForClass(RubberAccountSignOff);

RubberAccountSignOffSchema.virtual("monthlyAccount", {
  ref: "RubberMonthlyAccount",
  localField: "monthlyAccountId",
  foreignField: "_id",
  justOne: true,
});
