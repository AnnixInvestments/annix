interface ApiErrorResponse {
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "The request contains invalid data. Please check your input and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource could not be found.",
  409: "This action conflicts with the current state. Please refresh and try again.",
  413: "The file is too large. Please reduce the file size and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "An unexpected error occurred. Please try again later.",
  502: "The server is temporarily unavailable. Please try again later.",
  503: "The service is temporarily unavailable. Please try again later.",
};

export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    const rawStatus = STATUS_MESSAGES[error.status];
    return rawStatus || `Request failed (${error.status})`;
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/\((\d{3})/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      const rawStatus2 = STATUS_MESSAGES[status];
      return rawStatus2 || error.message;
    }
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const apiError = error as ApiErrorResponse;
    if (apiError.message) {
      if (Array.isArray(apiError.message)) {
        return apiError.message.join(". ");
      }
      return apiError.message;
    }
    if (apiError.statusCode) {
      const rawStatusCode = STATUS_MESSAGES[apiError.statusCode];
      return rawStatusCode || `Request failed (${apiError.statusCode})`;
    }
  }

  return "An unexpected error occurred. Please try again.";
}
