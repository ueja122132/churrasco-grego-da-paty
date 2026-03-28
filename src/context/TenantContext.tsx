import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Organization } from '../types';
import { useAuth } from './AuthContext';

interface TenantContextType {
  org: Organization | null;
  loading: boolean;
  isBlocked: boolean;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    detectTenant();
  }, [location.pathname, user?.org_id]);

  const detectTenant = async () => {
    // Basic logic: detect by URL query or path if needed
    // In this app, many routes depend on org context
    const pathParts = location.pathname.split('/');
    const slug = pathParts[1];

    try {
      let query = '';
      // Detect from path if not one of the main reserved marketing/system paths
      if (slug && !['admin', 'courier', 'kitchen', 'delivery', 'finance', 'saas', 'profile', 'my-stores', 'history', 'track'].includes(slug)) {
        query = `?slug=${slug}`;
      } else if (user?.org_id) {
        // Fallback robusto: se o usuário está logado e não há slug na URL, usa o org_id do perfil
        query = `?orgId=${user.org_id}`;
      } else {
        // Se estiver na raiz ou páginas protegidas, tenta detectar pelo hostname (domínio customizado)
        query = `?host=${window.location.hostname}`;
      }

      const res = await fetch(`/api/org/detect${query}`);
      if (res.ok) {
        const data = await res.json();
        setOrg(data); 
        if (data.isBlocked) setIsBlocked(true);
      }
    } catch (err) {
      console.error("Tenant detection failed");
    }
    setLoading(false);
  };

  return (
    <TenantContext.Provider value={{ org, loading, isBlocked, refreshTenant: detectTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
};
