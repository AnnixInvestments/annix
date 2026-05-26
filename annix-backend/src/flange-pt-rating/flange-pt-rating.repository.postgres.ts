import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangePtRating } from "./entities/flange-pt-rating.entity";
import { FlangePtRatingRepository } from "./flange-pt-rating.repository";

@Injectable()
export class PostgresFlangePtRatingRepository
  extends TypeOrmCrudRepository<FlangePtRating>
  implements FlangePtRatingRepository
{
  constructor(@InjectRepository(FlangePtRating) repository: Repository<FlangePtRating>) {
    super(repository);
  }

  async saveMany(entities: FlangePtRating[]): Promise<FlangePtRating[]> {
    return this.repository.save(entities);
  }

  async findAllWithRelations(): Promise<FlangePtRating[]> {
    return this.repository.find({
      relations: ["pressureClass", "pressureClass.standard"],
      order: { pressureClassId: "ASC", temperatureCelsius: "ASC" },
    });
  }

  async findByPressureClassId(pressureClassId: number): Promise<FlangePtRating[]> {
    return this.repository.find({
      where: { pressureClassId },
      order: { temperatureCelsius: "ASC" },
    });
  }

  async findByPressureClassAndMaterial(
    pressureClassId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    return this.repository.find({
      where: { pressureClassId, materialGroup },
      order: { temperatureCelsius: "ASC" },
    });
  }

  async findByStandardAndMaterial(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    return this.repository.find({
      where: {
        pressureClass: { standard: { id: standardId } },
        materialGroup,
      },
      relations: ["pressureClass", "pressureClass.standard"],
      order: { pressureClassId: "ASC", temperatureCelsius: "ASC" },
    });
  }

  async distinctMaterialGroups(): Promise<{ materialGroup: string }[]> {
    return this.repository
      .createQueryBuilder("rating")
      .select("DISTINCT rating.material_group", "materialGroup")
      .getRawMany();
  }

  async findByStandardAndMaterialOrdered(
    standardId: number,
    materialGroup: string,
  ): Promise<FlangePtRating[]> {
    return this.repository
      .createQueryBuilder("rating")
      .innerJoinAndSelect("rating.pressureClass", "pressureClass")
      .innerJoin("pressureClass.standard", "standard")
      .where("standard.id = :standardId", { standardId })
      .andWhere("rating.materialGroup = :materialGroup", { materialGroup })
      .orderBy("rating.pressureClassId", "ASC")
      .addOrderBy("rating.temperatureCelsius", "ASC")
      .getMany();
  }
}
