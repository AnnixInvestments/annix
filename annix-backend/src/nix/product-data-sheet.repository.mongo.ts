import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ProductDataSheet } from "./entities/product-data-sheet.entity";
import { ProductDataSheetRepository } from "./product-data-sheet.repository";

@Injectable()
export class MongoProductDataSheetRepository
  extends MongoCrudRepository<ProductDataSheet>
  implements ProductDataSheetRepository
{
  constructor(@InjectModel("ProductDataSheet") model: Model<ProductDataSheet>) {
    super(model);
  }

  async findLatestForProduct(
    manufacturerSlug: string,
    productSlug: string,
  ): Promise<ProductDataSheet | null> {
    return this.toDomain(
      await this.documents.findOne({ manufacturerSlug, productSlug, isLatest: true }).lean().exec(),
    );
  }

  async findVersionsForProduct(
    manufacturerSlug: string,
    productSlug: string,
  ): Promise<ProductDataSheet[]> {
    return this.toDomainList(
      await this.documents
        .find({ manufacturerSlug, productSlug })
        .sort({ isLatest: -1, version: -1 })
        .lean()
        .exec(),
    );
  }

  async searchLatest(terms: string[]): Promise<ProductDataSheet[]> {
    const andClauses = terms.map((term) => ({
      $expr: {
        $regexMatch: {
          input: {
            $toLower: { $concat: ["$manufacturer", " ", "$productName"] },
          },
          regex: escapeRegex(term.toLowerCase()),
        },
      },
    }));
    const filter: Record<string, unknown> =
      andClauses.length > 0 ? { isLatest: true, $and: andClauses } : { isLatest: true };
    return this.toDomainList(
      await this.documents
        .find(filter)
        .sort({ publishedDate: -1, updatedAt: -1 })
        .limit(20)
        .lean()
        .exec(),
    );
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
