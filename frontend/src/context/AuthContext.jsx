import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { connectSocket, disconnectSocket } from '../api/socketService';

const AuthContext = createContext(null);

// Configure axios base URL
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Manage socket connection lifecycle
  useEffect(() => {
    if (user && user.id) {
      connectSocket(user.id);
    } else {
      disconnectSocket();
    }
  }, [user]);

  // Set auth header for all axios calls
  const setAuthHeader = (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        setAuthHeader(token);
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Session restoration failed:', error);
          // Try to refresh once on startup if restoration fails
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const res = await axios.post('http://localhost:5000/api/auth/refresh', { refreshToken });
              const { token: newAccessToken, refreshToken: newRefreshToken } = res.data;
              localStorage.setItem('token', newAccessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              setAuthHeader(newAccessToken);
              const meResponse = await api.get('/auth/me');
              setUser(meResponse.data);
            } catch (refreshErr) {
              console.error('Start refresh failed:', refreshErr);
              logout();
            }
          } else {
            logout();
          }
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  // Axios response interceptor to handle expired access tokens
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Prevent infinite loops if refresh endpoint returns 401
        if (originalRequest.url === '/auth/refresh') {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshToken = localStorage.getItem('refreshToken');
          
          if (refreshToken) {
            try {
              const res = await axios.post('http://localhost:5000/api/auth/refresh', { refreshToken });
              const { token: newAccessToken, refreshToken: newRefreshToken } = res.data;
              
              localStorage.setItem('token', newAccessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              setAuthHeader(newAccessToken);
              
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              return api(originalRequest);
            } catch (refreshError) {
              console.error('Auto-refresh token rotation failed:', refreshError);
              logout();
              return Promise.reject(error);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // Refresh profile details utility
  const refreshProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = response.data;
      localStorage.setItem('token', userData.token);
      localStorage.setItem('refreshToken', userData.refreshToken);
      setAuthHeader(userData.token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login request failed:', error);
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
      return { success: false, message };
    }
  };

  // Register handler
  const register = async (name, email, password, role) => {
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        role,
      });
      const userData = response.data;
      localStorage.setItem('token', userData.token);
      localStorage.setItem('refreshToken', userData.refreshToken);
      setAuthHeader(userData.token);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Registration request failed:', error);
      const message = error.response?.data?.message || 'Registration failed. Try again.';
      return { success: false, message };
    }
  };

  // Direct Social Login Setter (stores credentials parsed from query string redirects)
  const setSocialCredentials = async (token, refreshToken) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    setAuthHeader(token);
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('Social session fetching failed:', error);
      logout();
      return { success: false, message: 'OAuth session resolution failed' };
    }
  };

  // Disconnect Provider handler
  const disconnectProvider = async (provider) => {
    try {
      await api.post(`/auth/disconnect/${provider}`);
      await refreshProfile();
      return { success: true };
    } catch (error) {
      console.error('Disconnect provider request failed:', error);
      const message = error.response?.data?.message || 'Unlinking account failed.';
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setAuthHeader(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setSocialCredentials, disconnectProvider, refreshProfile, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
