import React, { createContext, useState, useEffect, ReactNode } from "react";
import authService from "../services/auth.service";
import type { UserRole } from "../Types/types";
import { tokenManager } from "../utils/tokenManager";
import { useNavigate } from "react-router-dom";
import { getBackendErrorMessage } from "../utils/errorHelpers";

interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  nin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const hasActiveAuth = authService.isAuthenticated();
        const canRefresh = tokenManager.canRefresh();

        if (!hasActiveAuth && !canRefresh) {
          return;
        }

        const storedUser = authService.getUserData();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }

        const currentUser = await authService.getCurrentUser();
        const mappedRole: UserRole =
          currentUser.role === "super-admin"
            ? "superAdmin"
            : currentUser.role === "lg-admin" || currentUser.role === "admin"
              ? "admin"
              : "applicant";

        const normalizedUser: User = {
          id: currentUser.id,
          email: currentUser.email,
          role: mappedRole,
          name:
            `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim() ||
            currentUser.email,
          phone: currentUser.phone_number ?? undefined,
          nin: currentUser.nin ?? undefined,
        };

        tokenManager.setUserData(normalizedUser);
        setUser(normalizedUser);
        setIsAuthenticated(true);

        if (mappedRole === "admin") {
          const permissions =
            Array.isArray(currentUser.user_permissions) &&
            currentUser.user_permissions.length > 0
              ? currentUser.user_permissions
              : [
                  "approveApplications",
                  "viewAnalytics",
                  "manageFees",
                  "manageRequirements",
                  "exportData",
                ];

          sessionStorage.setItem(
            "userPermissions",
            JSON.stringify(permissions),
          );
        }
      } catch (error: unknown) {
        console.error("Auth init error:", error);
        const status =
          typeof error === "object" && error !== null
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;
        const storedUser = authService.getUserData();

        const shouldClearSession =
          status === 401 ||
          status === 403 ||
          (!storedUser && !tokenManager.canRefresh());

        if (shouldClearSession) {
          tokenManager.clearTokens();
          sessionStorage.removeItem("userPermissions");
          setUser(null);
          setIsAuthenticated(false);
        } else if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login({ email, password });

      tokenManager.setAccessToken(response.access);
      tokenManager.setRefreshToken(response.refresh);
      tokenManager.setUserData(response.user); // ✅ Store user data

      setUser(response.user);
      setIsAuthenticated(true);

      // ✅ Fetch user permissions for LG admins
      if (response.user.role === "admin") {
        try {
          const userInfo = await authService.getCurrentUser();
          if (
            userInfo.user_permissions &&
            Array.isArray(userInfo.user_permissions) &&
            userInfo.user_permissions.length > 0
          ) {
            sessionStorage.setItem(
              "userPermissions",
              JSON.stringify(userInfo.user_permissions),
            );
          } else {
            const defaultPermissions = [
              "approveApplications",
              "viewAnalytics",
              "manageFees",
              "manageRequirements",
              "exportData",
            ];
            sessionStorage.setItem(
              "userPermissions",
              JSON.stringify(defaultPermissions),
            );
          }
        } catch (error) {
          console.warn(
            "Failed to fetch user permissions, using defaults:",
            error,
          );
          // Set default permissions if fetch fails
          const defaultPermissions = [
            "approveApplications",
            "viewAnalytics",
            "manageFees",
            "manageRequirements",
            "exportData",
          ];
          sessionStorage.setItem(
            "userPermissions",
            JSON.stringify(defaultPermissions),
          );
        }
      }

      // ✅ Navigate based on role (matching UserRole type)
      let targetPath = "/applicant-dashboard";

      if (response.user.role === "superAdmin") {
        targetPath = "/super-admin-dashboard";
      } else if (response.user.role === "admin") {
        targetPath = "/lg-admin-dashboard";
      }

      navigate(targetPath);
    } catch (err: unknown) {
      console.error("❌ Login error:", err);
      const errorMessage = getBackendErrorMessage(
        err,
        "Invalid email or password",
      );
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      tokenManager.clearTokens();
      sessionStorage.removeItem("userPermissions");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      await authService.register(data);
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const errorMessage = getBackendErrorMessage(err, "Registration failed");
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
