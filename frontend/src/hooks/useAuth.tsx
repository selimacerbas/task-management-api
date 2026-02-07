import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { authApi } from "@/api/auth";
import { tokenStorage } from "@/utils/tokenStorage";
import type { UserResponse, LoginRequest, RegisterRequest } from "@/types/auth";

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      authApi
        .me()
        .then(setUser)
        .catch(() => tokenStorage.clearAll())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const result = await authApi.login(data);
    tokenStorage.setTokens(result.token.access_token, result.token.refresh_token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const result = await authApi.register(data);
    tokenStorage.setTokens(result.token.access_token, result.token.refresh_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clearAll();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
