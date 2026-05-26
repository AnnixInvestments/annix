import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PaperPortfolioSnapshot } from "../entities/paper-portfolio-snapshot.entity";
import { PaperPortfolioSnapshotRepository } from "./paper-portfolio-snapshot.repository";

function dayRange(snapshotDate: string): { $gte: Date; $lt: Date } {
  const start = new Date(`${snapshotDate.slice(0, 10)}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 86400000);
  return { $gte: start, $lt: end };
}

@Injectable()
export class MongoPaperPortfolioSnapshotRepository
  extends MongoCrudRepository<PaperPortfolioSnapshot>
  implements PaperPortfolioSnapshotRepository
{
  constructor(@InjectModel("PaperPortfolioSnapshot") model: Model<PaperPortfolioSnapshot>) {
    super(model);
  }

  async latestForPortfolio(portfolioId: string): Promise<PaperPortfolioSnapshot | null> {
    const doc = await this.documents
      .findOne({ portfolioId })
      .sort({ snapshotDate: -1 })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async recentForPortfolio(portfolioId: string, take: number): Promise<PaperPortfolioSnapshot[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .sort({ snapshotDate: -1 })
      .limit(take)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async totalValueSparkline(
    portfolioId: string,
    limit: number,
  ): Promise<{ total_value: string }[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .select({ totalValue: 1 })
      .sort({ snapshotDate: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => ({ total_value: String(doc.totalValue) }));
  }

  async recentTotalValues(portfolioId: string, limit: number): Promise<{ total_value: string }[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .select({ totalValue: 1 })
      .sort({ snapshotDate: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => ({ total_value: String(doc.totalValue) }));
  }

  async recentDailyReturns(
    portfolioId: string,
    limit: number,
  ): Promise<{ daily_return_percent: string }[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .select({ dailyReturnPercent: 1 })
      .sort({ snapshotDate: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => ({
      daily_return_percent: String(doc.dailyReturnPercent),
    }));
  }

  async findByPortfolioAndDate(
    portfolioId: string,
    snapshotDate: string,
  ): Promise<PaperPortfolioSnapshot | null> {
    const doc = await this.documents
      .findOne({ portfolioId, snapshotDate: dayRange(snapshotDate) })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async deleteById(id: string): Promise<void> {
    await this.documents.deleteOne({ _id: id }).exec();
  }

  async maxSnapshotDate(): Promise<string | Date | null> {
    const doc = await this.documents
      .findOne()
      .sort({ snapshotDate: -1 })
      .select({ snapshotDate: 1 })
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    return doc.snapshotDate as string | Date;
  }
}
