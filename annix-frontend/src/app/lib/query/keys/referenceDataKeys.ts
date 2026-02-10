import type { ReferenceDataQueryDto } from "@/app/lib/api/adminApi";

export const referenceDataKeys = {
  all: ["admin", "referenceData"] as const,
  modules: () => [...referenceDataKeys.all, "modules"] as const,
  schema: (entityName: string) => [...referenceDataKeys.all, "schema", entityName] as const,
  list: (entityName: string, params?: ReferenceDataQueryDto) =>
    [...referenceDataKeys.all, "list", entityName, params ?? {}] as const,
  detail: (entityName: string, id: number) =>
    [...referenceDataKeys.all, "detail", entityName, id] as const,
} as const;
