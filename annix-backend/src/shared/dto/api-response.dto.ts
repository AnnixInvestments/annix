export interface ApiResponse<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function messageResponse(message: string): ApiMessageResponse {
  return {
    success: true,
    message,
  };
}

export function errorResponse(message: string, error?: string): ApiErrorResponse {
  return {
    success: false,
    message,
    error,
  };
}
