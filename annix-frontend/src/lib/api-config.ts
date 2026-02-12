// API Configuration
export const apiConfig = {
  basePath: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
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

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';