import { RequiredEmail, RequiredIn, RequiredString } from "../../lib/dto/validation-decorators";
import { ORBIT_RECRUITER_ROLES } from "../entities/annix-orbit-profile.entity";

export class CreateAnnixOrbitTeamInviteDto {
  @RequiredEmail()
  email: string;

  @RequiredIn(ORBIT_RECRUITER_ROLES)
  recruiterRole: string;
}

export class UpdateAnnixOrbitMemberRoleDto {
  @RequiredIn(ORBIT_RECRUITER_ROLES)
  recruiterRole: string;
}

export class AcceptAnnixOrbitTeamInviteDto {
  @RequiredString({ maxLength: 255 })
  token: string;

  @RequiredString({ maxLength: 255 })
  name: string;

  @RequiredString({ maxLength: 255 })
  password: string;
}
