import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface OrganizationInfo {
  id: string;
  name: string;
  code: string | null;
  role: string;
  is_primary: boolean;
}

interface OrganizationContextType {
  currentOrganization: OrganizationInfo | null;
  organizations: OrganizationInfo[];
  setCurrentOrganization: (org: OrganizationInfo) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { userWithOrgs, isAuthenticated } = useAuth();
  const [currentOrganization, setCurrentOrgState] = useState<OrganizationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const organizations = userWithOrgs?.organizations || [];

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentOrgState(null);
      setIsLoading(false);
      return;
    }

    if (organizations.length > 0) {
      // Check if there's a saved organization in localStorage
      const savedOrgId = localStorage.getItem('current_organization_id');
      const savedOrg = savedOrgId
        ? organizations.find((o) => o.id === savedOrgId)
        : null;

      // Use saved org, or primary org, or first org
      const defaultOrg =
        savedOrg ||
        organizations.find((o) => o.is_primary) ||
        organizations[0];

      setCurrentOrgState(defaultOrg);
    }
    setIsLoading(false);
  }, [organizations, isAuthenticated]);

  const setCurrentOrganization = (org: OrganizationInfo) => {
    setCurrentOrgState(org);
    localStorage.setItem('current_organization_id', org.id);
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        setCurrentOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
