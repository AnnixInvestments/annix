import type { MarketingSiteContent as MarketingSiteContentTree } from "@annix/product-data/marketing";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MarketingSiteContentDocument = HydratedDocument<MarketingSiteContent>;

@Schema({
  collection: "marketing_site_content",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MarketingSiteContent {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Object, required: true })
  draft: MarketingSiteContentTree;

  @Prop({ type: Object, required: true })
  published: MarketingSiteContentTree;

  @Prop({ type: String, required: false })
  draftUpdatedAt: string | null;

  @Prop({ type: String, required: false })
  lastPublishedAt: string | null;

  @Prop({ type: String, required: false })
  lastPublishedBy: string | null;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const MarketingSiteContentSchema = SchemaFactory.createForClass(MarketingSiteContent);
