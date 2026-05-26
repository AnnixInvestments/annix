import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";

@Injectable()
export class PostgresFlangePressureClassRepository
  extends TypeOrmCrudRepository<FlangePressureClass>
  implements FlangePressureClassRepository
{
  constructor(@InjectRepository(FlangePressureClass) repository: Repository<FlangePressureClass>) {
    super(repository);
  }

  findByStandardId(standardId: number): Promise<FlangePressureClass[]> {
    return this.repository.find({ where: { standard: { id: standardId } } });
  }

  findByIds(ids: number[]): Promise<FlangePressureClass[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.find({ where: { id: In(ids) } });
  }
}
