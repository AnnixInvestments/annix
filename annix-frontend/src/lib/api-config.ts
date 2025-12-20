const FALLBACK_BASE_URL = 'http://localhost:4001';

const normalizeOrigin = (origin?: string | null) => {
  if (!origin) {
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    }
    return 'http://localhost:3000';
  }
  return origin;
};

export const resolveBaseUrl = (originHint?: string | null) => {
  const envValue = process.env.NEXT_PUBLIC_API_URL;
  if (!envValue) {
    return FALLBACK_BASE_URL;
  }

  const trimmed = envValue.trim();
  if (
    !trimmed ||
    trimmed === 'undefined' ||
    trimmed === '/undefined' ||
    trimmed === 'null'
  ) {
    return FALLBACK_BASE_URL;
  }

  if (trimmed.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${trimmed}`;
    }
    const origin = normalizeOrigin(originHint);
    return `${origin}${trimmed}`;
  }

  return trimmed;
};

export const browserBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return resolveBaseUrl(window.location.origin);
  }
  return resolveBaseUrl();
};

export const API_BASE_URL = resolveBaseUrl();

export const apiConfig = {
  basePath: API_BASE_URL,
};

export const getAuthHeaders = (): Record<string, string> => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return {};
};
