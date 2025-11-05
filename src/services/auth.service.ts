import apiClient from "./api";
import { tokenManager } from "../utils/tokenManager";
import type { UserRole } from "../Types/types";
import { mockAuthService } from "./mock.service";

const USE_MOCK = true;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    phone?: string;
    nin?: string;
  };
}

export interface RegisterRequest {
  nin: string;
  email: string;
  phone: string;
  password: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (USE_MOCK) {
      return mockAuthService.login(credentials.email, credentials.password);
    }

    const response = await apiClient.post<LoginResponse>(
      "/auth/login/",
      credentials
    );

    // Store tokens and user data
    tokenManager.setAccessToken(response.data.access);
    tokenManager.setRefreshToken(response.data.refresh);
    tokenManager.setUserData(response.data.user);

    return response.data;
  }

  async register(data: RegisterRequest): Promise<LoginResponse> {
    if (USE_MOCK) {
      return mockAuthService.register(data);
    }

    const response = await apiClient.post<LoginResponse>(
      "/auth/register/",
      data
    );

    // Auto-login after registration
    tokenManager.setAccessToken(response.data.access);
    tokenManager.setRefreshToken(response.data.refresh);
    tokenManager.setUserData(response.data.user);

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      if (USE_MOCK) {
        await mockAuthService.logout();
      } else {
        const refreshToken = tokenManager.getRefreshToken();
        if (refreshToken) {
          await apiClient.post("/auth/logout/", { refresh: refreshToken });
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      tokenManager.clearTokens();
    }
  }

  async getCurrentUser() {
    if (USE_MOCK) {
      return mockAuthService.getCurrentUser();
    }
    const response = await apiClient.get("/auth/me/");
    tokenManager.setUserData(response.data);
    return response.data;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = tokenManager.getRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await apiClient.post("/auth/refresh/", {
      refresh: refreshToken,
    });

    tokenManager.setAccessToken(response.data.access);
    return response.data.access;
  }

  isAuthenticated(): boolean {
    return tokenManager.isAuthenticated();
  }

  getUserData() {
    return tokenManager.getUserData();
  }
}

export default new AuthService();
