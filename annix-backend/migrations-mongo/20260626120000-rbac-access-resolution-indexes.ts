import type { mongo } from "mongoose";

const USER_APP_ACCESS = "user_app_access";
const APP_ROLE_PERMISSIONS = "app_role_permissions";
const USER_APP_PERMISSIONS = "user_app_permissions";
const USER_ACCESS_PRODUCTS = "user_access_products";
const APP_ROLE_PRODUCTS = "app_role_products";

const USER_APP_ACCESS_LEGACY_UNIQUE = "userId_appId_unique";
const USER_APP_ACCESS_USER_APP = "userId_appId_idx";
const USER_APP_ACCESS_APP = "appId_idx";
const APP_ROLE_PERMISSIONS_ROLE = "roleId_idx";
const USER_APP_PERMISSIONS_ACCESS = "userAccessId_idx";
const USER_ACCESS_PRODUCTS_ACCESS = "userAccessId_idx";
const APP_ROLE_PRODUCTS_ROLE = "roleId_idx";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(USER_APP_ACCESS)
    .dropIndex(USER_APP_ACCESS_LEGACY_UNIQUE)
    .catch(() => null);
  await db
    .collection(USER_APP_ACCESS)
    .createIndex({ userId: 1, appId: 1 }, { name: USER_APP_ACCESS_USER_APP });
  await db.collection(USER_APP_ACCESS).createIndex({ appId: 1 }, { name: USER_APP_ACCESS_APP });
  await db
    .collection(APP_ROLE_PERMISSIONS)
    .createIndex({ roleId: 1 }, { name: APP_ROLE_PERMISSIONS_ROLE });
  await db
    .collection(USER_APP_PERMISSIONS)
    .createIndex({ userAccessId: 1 }, { name: USER_APP_PERMISSIONS_ACCESS });
  await db
    .collection(USER_ACCESS_PRODUCTS)
    .createIndex({ userAccessId: 1 }, { name: USER_ACCESS_PRODUCTS_ACCESS });
  await db
    .collection(APP_ROLE_PRODUCTS)
    .createIndex({ roleId: 1 }, { name: APP_ROLE_PRODUCTS_ROLE });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db
    .collection(USER_APP_ACCESS)
    .dropIndex(USER_APP_ACCESS_USER_APP)
    .catch(() => null);
  await db
    .collection(USER_APP_ACCESS)
    .dropIndex(USER_APP_ACCESS_APP)
    .catch(() => null);
  await db
    .collection(APP_ROLE_PERMISSIONS)
    .dropIndex(APP_ROLE_PERMISSIONS_ROLE)
    .catch(() => null);
  await db
    .collection(USER_APP_PERMISSIONS)
    .dropIndex(USER_APP_PERMISSIONS_ACCESS)
    .catch(() => null);
  await db
    .collection(USER_ACCESS_PRODUCTS)
    .dropIndex(USER_ACCESS_PRODUCTS_ACCESS)
    .catch(() => null);
  await db
    .collection(APP_ROLE_PRODUCTS)
    .dropIndex(APP_ROLE_PRODUCTS_ROLE)
    .catch(() => null);
};
