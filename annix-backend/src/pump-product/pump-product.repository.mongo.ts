import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  PumpProduct,
  PumpProductCategory,
  PumpProductStatus,
} from "./entities/pump-product.entity";
import { PumpProductRepository } from "./pump-product.repository";
import type { PumpProductQueryParams } from "./pump-product.service";

@Injectable()
export class MongoPumpProductRepository
  extends MongoCrudRepository<PumpProduct>
  implements PumpProductRepository
{
  constructor(@InjectModel("PumpProduct") model: Model<PumpProduct>) {
    super(model);
  }

  async findBySku(sku: string): Promise<PumpProduct | null> {
    const document = await this.documents.findOne({ sku }).lean().exec();
    return this.toDomain(document);
  }

  async searchPaged(
    params: PumpProductQueryParams,
  ): Promise<{ items: PumpProduct[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      manufacturer,
      status,
      minFlowRate,
      maxFlowRate,
      minHead,
      maxHead,
    } = params;

    const filter: Record<string, unknown> = {};

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter["$or"] = [{ title: searchRegex }, { sku: searchRegex }, { manufacturer: searchRegex }];
    }

    if (category) {
      filter["category"] = category;
    }

    if (manufacturer) {
      filter["manufacturer"] = new RegExp(manufacturer, "i");
    }

    if (status) {
      filter["status"] = status;
    }

    if (minFlowRate !== undefined) {
      filter["flowRateMax"] = { ...((filter["flowRateMax"] as object) || {}), $gte: minFlowRate };
    }

    if (maxFlowRate !== undefined) {
      filter["flowRateMin"] = { ...((filter["flowRateMin"] as object) || {}), $lte: maxFlowRate };
    }

    if (minHead !== undefined) {
      filter["headMax"] = { ...((filter["headMax"] as object) || {}), $gte: minHead };
    }

    if (maxHead !== undefined) {
      filter["headMin"] = { ...((filter["headMin"] as object) || {}), $lte: maxHead };
    }

    const total = await this.documents.countDocuments(filter).exec();
    const documents = await this.documents
      .find(filter)
      .sort({ title: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return { items: this.toDomainList(documents), total };
  }

  async findByCategory(category: PumpProductCategory): Promise<PumpProduct[]> {
    const documents = await this.documents
      .find({ category, status: PumpProductStatus.ACTIVE })
      .sort({ title: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByManufacturerLike(manufacturer: string): Promise<PumpProduct[]> {
    const documents = await this.documents
      .find({ manufacturer: new RegExp(manufacturer, "i"), status: PumpProductStatus.ACTIVE })
      .sort({ title: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async manufacturers(): Promise<string[]> {
    const result = await this.documents
      .distinct("manufacturer", { status: PumpProductStatus.ACTIVE })
      .exec();
    return (result as string[]).sort();
  }

  async fullTextSearchPaged(
    query: string,
    params: PumpProductQueryParams,
  ): Promise<{ items: PumpProduct[]; total: number }> {
    const { page = 1, limit = 20, category, manufacturer, status } = params;

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 1);

    if (searchTerms.length === 0) {
      return { items: [], total: 0 };
    }

    const termConditions = searchTerms.map((term) => {
      const regex = new RegExp(term, "i");
      return {
        $or: [
          { title: regex },
          { sku: regex },
          { manufacturer: regex },
          { description: regex },
          { pumpType: regex },
          { modelNumber: regex },
        ],
      };
    });

    const filter: Record<string, unknown> = { $and: termConditions };

    if (category) {
      filter["category"] = category;
    }

    if (manufacturer) {
      filter["manufacturer"] = new RegExp(manufacturer, "i");
    }

    filter["status"] = status ?? PumpProductStatus.ACTIVE;

    const total = await this.documents.countDocuments(filter).exec();
    const documents = await this.documents
      .find(filter)
      .sort({ title: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    return { items: this.toDomainList(documents), total };
  }

  async findByIdList(ids: number[]): Promise<PumpProduct[]> {
    if (ids.length === 0) {
      return [];
    }
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findSimilarProducts(product: PumpProduct, limit: number): Promise<PumpProduct[]> {
    const filter: Record<string, unknown> = {
      _id: { $ne: product.id },
      status: PumpProductStatus.ACTIVE,
      category: product.category,
    };

    if (product.flowRateMin && product.flowRateMax) {
      const flowMiddle = (product.flowRateMin + product.flowRateMax) / 2;
      const flowRange = (product.flowRateMax - product.flowRateMin) * 2;
      filter["flowRateMin"] = { $lte: flowMiddle + flowRange };
      filter["flowRateMax"] = { $gte: flowMiddle - flowRange };
    }

    if (product.headMin && product.headMax) {
      const headMiddle = (product.headMin + product.headMax) / 2;
      const headRange = (product.headMax - product.headMin) * 2;
      filter["headMin"] = { $lte: headMiddle + headRange };
      filter["headMax"] = { $gte: headMiddle - headRange };
    }

    const documents = await this.documents
      .find(filter)
      .sort({ manufacturer: 1 })
      .limit(limit)
      .lean()
      .exec();

    return this.toDomainList(documents);
  }
}
