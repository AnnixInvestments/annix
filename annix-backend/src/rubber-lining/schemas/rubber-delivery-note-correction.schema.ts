import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberDeliveryNoteCorrectionDocument = HydratedDocument<RubberDeliveryNoteCorrection>;

@Schema({
  collection: "rubber_delivery_note_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberDeliveryNoteCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  deliveryNoteId: number;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  correctedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const RubberDeliveryNoteCorrectionSchema = SchemaFactory.createForClass(
  RubberDeliveryNoteCorrection,
);

RubberDeliveryNoteCorrectionSchema.virtual("deliveryNote", {
  ref: "RubberDeliveryNote",
  localField: "deliveryNoteId",
  foreignField: "_id",
  justOne: true,
});
