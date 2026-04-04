import { NotFoundException } from "@nestjs/common";
import type { FindOneOptions, Repository } from "typeorm";

export async function findOneOrFail<T extends object>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  entityName: string,
): Promise<T> {
  const entity = await repo.findOne(options);
  if (!entity) {
    const whereClause = options.where ? ` ${JSON.stringify(options.where)}` : "";
    throw new NotFoundException(`${entityName}${whereClause} not found`);
  }
  return entity;
}
