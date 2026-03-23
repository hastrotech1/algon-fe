const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user_data";

let accessTokenMemory: string | null = sessionStorage.getItem(ACCESS_TOKEN_KEY);

export const tokenManager = {
  getAccessToken(): string | null {
    if (!accessTokenMemory) {
      accessTokenMemory = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return accessTokenMemory;
  },

  setAccessToken(token: string): void {
    accessTokenMemory = token;
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  clearAccessToken(): void {
    accessTokenMemory = null;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getUserData(): any {
    const userData = sessionStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  setUserData(user: any): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearTokens(): void {
    accessTokenMemory = null;
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem("userPermissions");
  },

  canRefresh(): boolean {
    return !!this.getRefreshToken();
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken() || !!this.getRefreshToken();
  },
};
