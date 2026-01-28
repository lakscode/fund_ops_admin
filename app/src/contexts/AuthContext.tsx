import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserWithOrganizations } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  userWithOrgs: UserWithOrganizations | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userWithOrgs, setUserWithOrgs] = useState<UserWithOrganizations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      const userOrgs = await authService.getUserWithOrganizations(currentUser.id);
      setUserWithOrgs(userOrgs);
    } catch (error) {
      setUser(null);
      setUserWithOrgs(null);
      localStorage.removeItem('access_token');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authService.login(username, password);
    localStorage.setItem('access_token', response.access_token);
    await refreshUser();
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setUserWithOrgs(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userWithOrgs,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
