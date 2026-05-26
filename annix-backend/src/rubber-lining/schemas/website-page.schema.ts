import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WebsitePageDocument = HydratedDocument<WebsitePage>;

@Schema({
  collection: "website_page",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WebsitePage {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  metaTitle: string;

  @Prop({ type: String, required: false })
  metaDescription: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: false })
  heroImageUrl: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Boolean, required: true })
  isPublished: boolean;

  @Prop({ type: Boolean, required: true })
  isHomePage: boolean;

  @Prop({ type: Boolean, required: true })
  showInNav: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const WebsitePageSchema = SchemaFactory.createForClass(WebsitePage);
