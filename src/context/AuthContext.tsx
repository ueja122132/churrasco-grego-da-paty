import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // Fallback: Check manual session
        const storedUser = localStorage.getItem('paty_user');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            localStorage.removeItem('paty_user');
          }
        }
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // Fallback before clearing
        const storedUser = localStorage.getItem('paty_user');
        if (storedUser) {
           setUser(JSON.parse(storedUser));
        } else {
           setUser(null);
        }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        const fullUser = {
          ...profile,
          role: profile.role || 'user'
        };
        setUser(fullUser);
        // Sync to localStorage so refresh works instantly
        localStorage.setItem('paty_user', JSON.stringify(fullUser));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('paty_user', JSON.stringify(userData));
  };
  
  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('paty_user');
    sessionStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile: () => user ? fetchProfile(user.id.toString()) : Promise.resolve() }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
