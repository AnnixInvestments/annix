import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browserBaseUrl, getAuthHeaders } from "@/lib/api-config";
import { type DrawingQueryParams, drawingKeys } from "../../keys/drawingKeys";

interface Drawing {
  id: number;
  drawingNumber: string;
  title: string;
  description?: string;
  fileType: string;
  fileSizeBytes: number;
  currentVersion: number;
  status: string;
  uploadedBy: {
    id: number;
    username: string;
  };
  rfq?: {
    id: number;
    rfqNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginatedDrawingResult {
  data: Drawing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchDrawings(params?: DrawingQueryParams): Promise<PaginatedDrawingResult> {
  const searchParams = new URLSearchParams();
  searchParams.set("page", (params?.page ?? 1).toString());
  searchParams.set("limit", (params?.limit ?? 20).toString());
  if (params?.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }
  if (params?.search) {
    searchParams.set("search", params.search);
  }

  const response = await fetch(`${browserBaseUrl()}/drawings?${searchParams.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch drawings (${response.status}: ${body || response.statusText})`,
    );
  }

  return response.json();
}

export function useDrawings(params?: DrawingQueryParams) {
  return useQuery<PaginatedDrawingResult>({
    queryKey: drawingKeys.list(params),
    queryFn: () => fetchDrawings(params),
  });
}

interface DrawingVersion {
  id: number;
  versionNumber: number;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  changeNotes?: string;
  uploadedBy: {
    id: number;
    username: string;
  };
  createdAt: string;
}

interface DrawingComment {
  id: number;
  commentText: string;
  commentType: string;
  isResolved: boolean;
  user: {
    id: number;
    username: string;
  };
  createdAt: string;
}

interface DrawingDetail {
  id: number;
  drawingNumber: string;
  title: string;
  description?: string;
  fileType: string;
  filePath: string;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  currentVersion: number;
  status: string;
  uploadedBy: {
    id: number;
    username: string;
  };
  rfq?: {
    id: number;
    rfqNumber: string;
  };
  versions: DrawingVersion[];
  createdAt: string;
  updatedAt: string;
}

interface AnalysisResult {
  success: boolean;
  drawingTitle?: string;
  drawingNumber?: string;
  projectName?: string;
  components: {
    itemNumber?: string;
    description: string;
    materialType?: string;
    dimensions?: {
      diameter?: string;
      length?: string;
      thickness?: string;
      size?: string;
    };
    quantity?: number;
    unit?: string;
    confidence: "high" | "medium" | "low";
  }[];
  errors: string[];
  warnings: string[];
  metadata: {
    pageCount: number;
    extractionMethod: string;
    analysisTimestamp: string;
  };
}

async function fetchDrawingDetail(id: number): Promise<DrawingDetail> {
  const response = await fetch(`${browserBaseUrl()}/drawings/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch drawing (${response.status}: ${body || response.statusText})`);
  }

  return response.json();
}

async function fetchDrawingComments(id: number): Promise<DrawingComment[]> {
  const response = await fetch(`${browserBaseUrl()}/drawings/${id}/comments`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export function useDrawingDetail(id: number) {
  return useQuery<DrawingDetail>({
    queryKey: drawingKeys.detail(id),
    queryFn: () => fetchDrawingDetail(id),
    enabled: id > 0,
  });
}

export function useDrawingComments(id: number) {
  return useQuery<DrawingComment[]>({
    queryKey: drawingKeys.comments(id),
    queryFn: () => fetchDrawingComments(id),
    enabled: id > 0,
  });
}

export function useAddDrawingComment(drawingId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentText: string) => {
      const response = await fetch(`${browserBaseUrl()}/drawings/${drawingId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ commentText }),
      });

      if (!response.ok) {
        throw new Error("Failed to add comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: drawingKeys.comments(drawingId),
      });
    },
  });
}

export function useUploadDrawingVersion(drawingId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, changeNotes }: { file: File; changeNotes?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (changeNotes) {
        formData.append("changeNotes", changeNotes);
      }

      const response = await fetch(`${browserBaseUrl()}/drawings/${drawingId}/version`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: drawingKeys.detail(drawingId),
      });
    },
  });
}

export function useSubmitDrawingForReview(drawingId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${browserBaseUrl()}/workflow/drawings/${drawingId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit for review");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: drawingKeys.detail(drawingId),
      });
      queryClient.invalidateQueries({ queryKey: drawingKeys.all });
    },
  });
}

export function useAnalyzeDrawing(drawingId: number) {
  return useMutation({
    mutationFn: async (): Promise<AnalysisResult> => {
      const response = await fetch(`${browserBaseUrl()}/drawings/${drawingId}/analyze`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      return response.json();
    },
  });
}

export function useUploadDrawing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      title,
      description,
      rfqId,
    }: {
      file: File;
      title: string;
      description?: string;
      rfqId?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      if (description) {
        formData.append("description", description);
      }
      if (rfqId) {
        formData.append("rfqId", rfqId);
      }

      const response = await fetch(`${browserBaseUrl()}/drawings/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: drawingKeys.all });
    },
  });
}

export type {
  Drawing,
  PaginatedDrawingResult,
  DrawingDetail,
  DrawingVersion,
  DrawingComment,
  AnalysisResult,
};
