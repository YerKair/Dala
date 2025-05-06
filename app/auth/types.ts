// Global type definitions for the application

// API Response Types
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

// Auth Types
export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegistrationData {
  name: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation?: string;
}

// Response from login and register endpoints
export interface AuthResponse {
  user: UserData;
  token: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  phone: string;
  email_verified_at: string | null;
  role: string;
  avatar: string | null;
  created_at: string;
  updated_at: string;
}

// Navigation Types
export type RootStackParamList = {
  "/auth/login": undefined;
  "/auth/register": undefined;
  "/(tabs)": undefined;
};

// Form States
export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
}
