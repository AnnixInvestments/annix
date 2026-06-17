import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CompoundDataSheet } from "../entities/compound-data-sheet.entity";
import { CompoundDataSheetRepository } from "./compound-data-sheet.repository";

@Injectable()
export class PostgresCompoundDataSheetRepository
  extends TypeOrmCrudRepository<CompoundDataSheet>
  implements CompoundDataSheetRepository
{
  constructor(@InjectRepository(CompoundDataSheet) repository: Repository<CompoundDataSheet>) {
    super(repository);
  }

  findPublishedOrdered(): Promise<CompoundDataSheet[]> {
    return this.repository.find({
      where: { isPublished: true },
      order: { sortOrder: "ASC", name: "ASC" },
    });
  }

  findOnePublishedBySlug(slug: string): Promise<CompoundDataSheet | null> {
    return this.repository.findOne({ where: { slug, isPublished: true } });
  }

  findAllOrdered(): Promise<CompoundDataSheet[]> {
    return this.repository.find({ order: { sortOrder: "ASC", name: "ASC" } });
  }

  findOneBySlug(slug: string): Promise<CompoundDataSheet | null> {
    return this.repository.findOne({ where: { slug } });
  }

  build(data: Partial<CompoundDataSheet>): CompoundDataSheet {
    return this.repository.create(data as TypeOrmDeepPartial<CompoundDataSheet>);
  }
}
