import { Injectable } from "@nestjs/common";
import { FlangeType } from "./entities/flange-type.entity";
import { FlangeTypeRepository } from "./flange-type.repository";

@Injectable()
export class FlangeTypeService {
  constructor(private readonly flangeTypeRepository: FlangeTypeRepository) {}

  findAll(): Promise<FlangeType[]> {
    return this.flangeTypeRepository.findAllOrdered();
  }

  findByCode(code: string): Promise<FlangeType | null> {
    return this.flangeTypeRepository.findByCode(code);
  }

  findByAbbreviation(abbreviation: string): Promise<FlangeType | null> {
    return this.flangeTypeRepository.findByAbbreviation(abbreviation);
  }
}
