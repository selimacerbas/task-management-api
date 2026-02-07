const PREFIX = "taskman_";

export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(`${PREFIX}access_token`);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(`${PREFIX}refresh_token`);
  },

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(`${PREFIX}access_token`, accessToken);
    localStorage.setItem(`${PREFIX}refresh_token`, refreshToken);
  },

  clearAll(): void {
    localStorage.removeItem(`${PREFIX}access_token`);
    localStorage.removeItem(`${PREFIX}refresh_token`);
  },
};
