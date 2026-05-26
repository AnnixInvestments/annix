import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberApplicationRating } from "../entities/rubber-application.entity";
import {
  type ApplicationRatingFilters,
  RubberApplicationRatingRepository,
} from "./rubber-application-rating.repository";

@Injectable()
export class PostgresRubberApplicationRatingRepository
  extends TypeOrmCrudRepository<RubberApplicationRating>
  implements RubberApplicationRatingRepository
{
  constructor(
    @InjectRepository(RubberApplicationRating) repository: Repository<RubberApplicationRating>,
  ) {
    super(repository);
  }

  findFilteredOrdered(filters?: ApplicationRatingFilters): Promise<RubberApplicationRating[]> {
    const query = this.repository
      .createQueryBuilder("rating")
      .leftJoinAndSelect("rating.rubberType", "rubberType");

    if (filters?.typeNumber) {
      query.andWhere("rubberType.typeNumber = :typeNumber", { typeNumber: filters.typeNumber });
    }

    if (filters?.chemicalCategory) {
      query.andWhere("rating.chemicalCategory = :chemicalCategory", {
        chemicalCategory: filters.chemicalCategory,
      });
    }

    return query
      .orderBy("rubberType.typeNumber", "ASC")
      .addOrderBy("rating.chemicalCategory", "ASC")
      .getMany();
  }

  findByChemicalCategoriesAndRatings(
    chemicalCategories: string[],
    resistanceRatings: string[],
  ): Promise<RubberApplicationRating[]> {
    return this.repository.find({
      where: {
        chemicalCategory: In(chemicalCategories),
        resistanceRating: In(resistanceRatings),
      },
      relations: ["rubberType"],
    });
  }
}
