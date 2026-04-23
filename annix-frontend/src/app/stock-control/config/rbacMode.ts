export type RbacMode = "v2" | "v4";

export const RBAC_MODE: RbacMode = "v4";

export const isDerivedNavMode = () => RBAC_MODE === "v4";
