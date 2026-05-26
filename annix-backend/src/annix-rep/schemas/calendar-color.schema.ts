import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CalendarColorDocument = HydratedDocument<CalendarColor>;

@Schema({
  collection: "annix_rep_calendar_colors",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CalendarColor {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  colorType: string;

  @Prop({ type: String, required: true })
  colorKey: string;

  @Prop({ type: String, required: true })
  colorValue: string;
}

export const CalendarColorSchema = SchemaFactory.createForClass(CalendarColor);

CalendarColorSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
