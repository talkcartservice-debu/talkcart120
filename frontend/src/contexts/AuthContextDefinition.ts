import { createContext } from 'react';
import { User } from '@/types';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (credentials: any) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
  loading: boolean;
  updateProfile: (userData: Partial<User>) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
  setAuthTokens: (accessToken: string, refreshToken?: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);