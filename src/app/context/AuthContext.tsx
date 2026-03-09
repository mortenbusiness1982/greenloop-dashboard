import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already logged in (e.g., from localStorage)
    return localStorage.getItem('greenloop_auth') === 'true';
  });
  
  const [user, setUser] = useState<{ name: string; email: string } | null>(() => {
    const savedUser = localStorage.getItem('greenloop_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email: string, password: string) => {
    // Mock authentication - replace with real API call
    // For demo purposes, accept any email/password
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    
    const mockUser = {
      name: email.split('@')[0],
      email: email,
    };
    
    setUser(mockUser);
    setIsAuthenticated(true);
    localStorage.setItem('greenloop_auth', 'true');
    localStorage.setItem('greenloop_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('greenloop_auth');
    localStorage.removeItem('greenloop_user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
