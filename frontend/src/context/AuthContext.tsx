import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionCode: string) => boolean;
  refreshProfile: () => Promise<void>;
  updateUser: (updated: User) => void;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('foundation_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse cached user:', e);
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('foundation_token');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return saved;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem('foundation_token');
      if (currentToken && currentToken !== 'undefined' && currentToken !== 'null') {
        const res = await authApi.getMe();
        setUser(res.data);
        localStorage.setItem('foundation_user', JSON.stringify(res.data));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Failed to fetch profile with cached token:', err);
      setToken(null);
      setUser(null);
      localStorage.removeItem('foundation_token');
      localStorage.removeItem('foundation_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    const res = await authApi.login({ username: username.trim(), password: password.trim(), remember_me: rememberMe });
    const { access_token, user: loggedUser } = res.data;
    setToken(access_token);
    setUser(loggedUser);
    localStorage.setItem('foundation_token', access_token);
    localStorage.setItem('foundation_user', JSON.stringify(loggedUser));
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('foundation_token');
    localStorage.removeItem('foundation_user');
    window.location.href = '/login';
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem('foundation_user', JSON.stringify(updated));
  };

  const uploadAvatar = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await authApi.uploadProfilePicture(formData);
    const avatarUrl = res.data.profile_picture;
    if (user) {
      const updatedUser = { ...user, profile_picture: avatarUrl };
      updateUser(updatedUser);
    }
    return avatarUrl;
  };

  const removeAvatar = async (): Promise<void> => {
    await authApi.removeProfilePicture();
    if (user) {
      const updatedUser = { ...user, profile_picture: undefined };
      updateUser(updatedUser);
    }
  };

  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (!user || !user.role) return false;
    // Super Admin bypasses all checks
    if (user.role.name === 'Super Admin') return true;
    
    if (!user.role.permissions) return false;
    return user.role.permissions.some((p) => p.code === permissionCode);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        refreshProfile,
        updateUser,
        uploadAvatar,
        removeAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
