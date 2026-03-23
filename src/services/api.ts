/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_TIMEOUT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { tokenManager } from "../utils/tokenManager";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData
    if (config.data instanceof FormData && config.headers) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(token ?? "");
  });

  failedQueue = [];
};

// Response interceptor - Handle token refresh with queueing
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh/");

    if (!isUnauthorized || !originalRequest || isRefreshRequest) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const refreshResponse = await axios.post(`${API_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });

      const nextAccessToken =
        refreshResponse.data?.access ??
        refreshResponse.data?.data?.access ??
        refreshResponse.data?.["access-token"] ??
        null;

      if (!nextAccessToken) {
        throw new Error("Unable to refresh access token");
      }

      tokenManager.setAccessToken(nextAccessToken);
      processQueue(null, nextAccessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenManager.clearTokens();
      sessionStorage.removeItem("userPermissions");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
