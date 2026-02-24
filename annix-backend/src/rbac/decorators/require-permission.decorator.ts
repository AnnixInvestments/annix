import { SetMetadata } from "@nestjs/common";

export const PERMISSION_KEY = "permission";
export const APP_CODE_KEY = "appCode";

export interface RequirePermissionMeta {
  appCode: string;
  permission: string;
}

export const RequirePermission = (appCode: string, permission: string) =>
  SetMetadata(PERMISSION_KEY, { appCode, permission } as RequirePermissionMeta);
