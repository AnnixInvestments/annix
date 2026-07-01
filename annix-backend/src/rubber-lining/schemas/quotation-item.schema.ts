import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

@Schema({ _id: false })
export class QuotationItem {
  @Prop({ type: String, required: true })
  productCode: string;

  @Prop({ type: String, required: true })
  productDescription: string;

  @Prop({ type: String, required: true })
  colour: string;

  @Prop({ type: Number, required: true })
  thickness: number;

  @Prop({ type: Number, required: true })
  width: number;

  @Prop({ type: Number, required: true })
  length: number;

  @Prop({ type: Number, required: true })
  rollWeight: number;

  @Prop({ type: Number, required: true })
  pricePerKg: number;

  @Prop({ type: Number, required: true, default: 0 })
  costPrice: number;

  @Prop({ type: Number, required: true })
  rollPrice: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  linePriceExVat: number;

  @Prop({ type: Number, required: true })
  lineVat: number;

  @Prop({ type: Number, required: true })
  linePriceIncVat: number;
}

export const QuotationItemSchema = SchemaFactory.createForClass(QuotationItem);
