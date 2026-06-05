import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BlogPostDocument = HydratedDocument<BlogPost>;

@Schema({
  collection: "blog_post",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BlogPost {
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
  excerpt: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: false })
  heroImageUrl: string;

  @Prop({ type: String, required: true })
  author: string;

  @Prop({ type: Date, required: false })
  publishedAt: Date;

  @Prop({ type: Boolean, required: true })
  isPublished: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
