import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardLineItemDocument = HydratedDocument<JobCardLineItem>;

@Schema({
  collection: "job_card_line_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardLineItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: false })
  itemCode: string;

  @Prop({ type: String, required: false })
  itemDescription: string;

  @Prop({ type: String, required: false })
  itemNo: string;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: String, required: false })
  jtNo: string;

  @Prop({ type: Number, required: false })
  m2: number;

  @Prop({ type: Number, required: false })
  liningM2: number;

  // Developed flat plate take-off for a fabricated tank/chute line, sourced
  // from the shared Nix plateBom. Embedded sub-document (not a collection).
  // Drives the polymer rubber cutting-diagram nesting; null for non-tank rows.
  @Prop({
    type: [
      {
        mark: String,
        description: String,
        thicknessMm: Number,
        lengthMm: Number,
        widthMm: Number,
        quantity: Number,
        liningThicknessMm: Number,
      },
    ],
    required: false,
  })
  plateBom: Array<{
    mark: string;
    description: string;
    thicknessMm: number;
    lengthMm: number;
    widthMm: number;
    quantity: number;
    liningThicknessMm: number;
  }>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const JobCardLineItemSchema = SchemaFactory.createForClass(JobCardLineItem);

JobCardLineItemSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardLineItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardLineItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
