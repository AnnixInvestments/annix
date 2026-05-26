import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberMonthlyAccountDocument = HydratedDocument<RubberMonthlyAccount>;

@Schema({
  collection: "rubber_monthly_accounts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberMonthlyAccount {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  periodYear: number;

  @Prop({ type: Number, required: true })
  periodMonth: number;

  @Prop({ type: String, required: true })
  accountType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  pdfPath: string;

  @Prop({ type: Date, required: false })
  generatedAt: Date;

  @Prop({ type: String, required: false })
  generatedBy: string;

  @Prop({ type: Object, required: false })
  snapshotData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberMonthlyAccountSchema = SchemaFactory.createForClass(RubberMonthlyAccount);
