import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompanyDirectorDocument = HydratedDocument<RubberCompanyDirector>;

@Schema({
  collection: "rubber_company_directors",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompanyDirector {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberCompanyDirectorSchema = SchemaFactory.createForClass(RubberCompanyDirector);
