import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Set authorization header for all requests
        api.defaults.headers.common['x-auth-token'] = token;
        
        // Get user data
        const response = await api.get('/api/auth/me');
        
        setUser(response.data);
        setIsAuthenticated(true);
      } catch (err) {
        // Clear invalid token
        localStorage.removeItem('token');
        delete api.defaults.headers.common['x-auth-token'];
        
        setError(err.response?.data?.message || 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      
      const response = await api.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      // Save token to local storage
      localStorage.setItem('token', token);
      
      // Set authorization header for all requests
      api.defaults.headers.common['x-auth-token'] = token;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    }
  };
  
  // Register function
  const register = async (name, email, password) => {
    try {
      setError(null);
      
      const response = await api.post('/api/auth/register', { name, email, password });
      const { token, user } = response.data;
      
      // Save token to local storage
      localStorage.setItem('token', token);
      
      // Set authorization header for all requests
      api.defaults.headers.common['x-auth-token'] = token;
      
      setUser(user);
      setIsAuthenticated(true);
      
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      throw err;
    }
  };
  
  // Logout function
  const logout = () => {
    // Remove token from local storage
    localStorage.removeItem('token');
    
    // Remove authorization header
    delete api.defaults.headers.common['x-auth-token'];
    
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};