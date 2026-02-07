import { api } from "./client";
import type { LoginRequest, RegisterRequest, UserWithToken, UserResponse, Token } from "@/types/auth";

export const authApi = {
  register: (data: RegisterRequest) => api.post<UserWithToken>("/api/v1/auth/register", data),
  login: (data: LoginRequest) => api.post<UserWithToken>("/api/v1/auth/login", data),
  refresh: (refreshToken: string) => api.post<Token>("/api/v1/auth/refresh", { refresh_token: refreshToken }),
  me: () => api.get<UserResponse>("/api/v1/auth/me"),
};
