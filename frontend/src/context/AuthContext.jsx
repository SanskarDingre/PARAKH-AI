import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [role, setRole] = useState(() => localStorage.getItem('role'));
  const [name, setName] = useState(() => localStorage.getItem('name'));

  const login = useCallback((tokenVal, userData) => {
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('role', userData.role);
    localStorage.setItem('name', userData.name);
    setToken(tokenVal);
    setRole(userData.role);
    setName(userData.name);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setToken(null);
    setRole(null);
    setName(null);
  }, []);

  const isAuthenticated = Boolean(token);
  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider value={{ token, role, name, isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
