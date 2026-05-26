import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberStatementReconciliationDocument = HydratedDocument<RubberStatementReconciliation>;

@Schema({
  collection: "rubber_statement_reconciliations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberStatementReconciliation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  periodYear: number;

  @Prop({ type: Number, required: true })
  periodMonth: number;

  @Prop({ type: String, required: true })
  statementPath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, required: false })
  matchSummary: Record<string, unknown>;

  @Prop({ type: String, required: false })
  resolvedBy: string;

  @Prop({ type: Date, required: false })
  resolvedAt: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberStatementReconciliationSchema = SchemaFactory.createForClass(
  RubberStatementReconciliation,
);

RubberStatementReconciliationSchema.virtual("company", {
  ref: "RubberCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
