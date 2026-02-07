export interface BoqQueryParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const boqKeys = {
  all: ["boq"] as const,
  list: (params?: BoqQueryParams) => [...boqKeys.all, "list", params ?? {}] as const,
  detail: (id: number) => [...boqKeys.all, "detail", id] as const,
} as const;
