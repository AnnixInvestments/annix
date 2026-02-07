export interface DrawingQueryParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const drawingKeys = {
  all: ["drawing"] as const,
  list: (params?: DrawingQueryParams) => [...drawingKeys.all, "list", params ?? {}] as const,
  detail: (id: number) => [...drawingKeys.all, "detail", id] as const,
  comments: (id: number) => [...drawingKeys.all, "comments", id] as const,
} as const;
