import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";
import { DispatchLoadPhotoRepository } from "./dispatch-load-photo.repository";

@Injectable()
export class PostgresDispatchLoadPhotoRepository
  extends TypeOrmCrudRepository<DispatchLoadPhoto>
  implements DispatchLoadPhotoRepository
{
  constructor(@InjectRepository(DispatchLoadPhoto) repository: Repository<DispatchLoadPhoto>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<DispatchLoadPhoto[]> {
    return this.repository.find({
      where: { jobCardId, companyId },
      order: { createdAt: "DESC" },
    });
  }

  findOneForCompany(photoId: number, companyId: number): Promise<DispatchLoadPhoto | null> {
    return this.repository.findOne({
      where: { id: photoId, companyId },
    });
  }
}
