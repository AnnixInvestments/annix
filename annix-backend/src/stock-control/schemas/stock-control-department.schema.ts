import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlDepartmentDocument = HydratedDocument<StockControlDepartment>;

@Schema({
  collection: "stock_control_departments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlDepartment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: false })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const StockControlDepartmentSchema = SchemaFactory.createForClass(StockControlDepartment);

StockControlDepartmentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockControlDepartmentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
