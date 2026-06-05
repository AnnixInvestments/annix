import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcDustDebrisTestDocument = HydratedDocument<QcDustDebrisTest>;

@Schema({
  collection: "qc_dust_debris_tests",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcDustDebrisTest {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Object, required: true })
  tests: Record<string, unknown>;

  @Prop({ type: String, required: false })
  surfacePrepMethod: string;

  @Prop({ type: Object, required: false })
  acceptanceCriteria: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  environmentalConditions: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  readingDate: Date;

  @Prop({ type: String, required: true })
  capturedByName: string;

  @Prop({ type: Number, required: false })
  capturedById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const QcDustDebrisTestSchema = SchemaFactory.createForClass(QcDustDebrisTest);

QcDustDebrisTestSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcDustDebrisTestSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
