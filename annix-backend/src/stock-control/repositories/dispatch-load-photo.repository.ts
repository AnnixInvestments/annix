import { CrudRepository } from "../../lib/persistence/crud-repository";
import { DispatchLoadPhoto } from "../entities/dispatch-load-photo.entity";

export abstract class DispatchLoadPhotoRepository extends CrudRepository<DispatchLoadPhoto> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<DispatchLoadPhoto[]>;
  abstract findOneForCompany(photoId: number, companyId: number): Promise<DispatchLoadPhoto | null>;
}
