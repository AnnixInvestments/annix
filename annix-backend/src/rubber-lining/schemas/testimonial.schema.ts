import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TestimonialDocument = HydratedDocument<Testimonial>;

@Schema({
  collection: "testimonial",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Testimonial {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  authorName: string;

  @Prop({ type: String, required: false })
  authorRole: string;

  @Prop({ type: String, required: false })
  authorCompany: string;

  @Prop({ type: Number, required: true })
  rating: number;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: Date, required: true })
  datePublished: Date;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: Boolean, required: true })
  highlight: boolean;

  @Prop({ type: Boolean, required: true })
  isPublished: boolean;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);
