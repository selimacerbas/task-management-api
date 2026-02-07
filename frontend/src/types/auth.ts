export interface UserResponse {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  role: string;
  created_at: string;
  updated_at: string | null;
  last_login_at: string | null;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserWithToken {
  user: UserResponse;
  token: Token;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}
