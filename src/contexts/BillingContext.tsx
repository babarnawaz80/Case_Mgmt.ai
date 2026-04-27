import React, { createContext, useContext, useState, useCallback } from 'react';
import type { UserRole, GuidelinesEngine } from '@/types/billing';
import { mockEngines as initialEngines } from '@/mocks/billing';
import { toast } from 'sonner';

export type ClaimTypeFilter = 'all' | 'IDD' | 'Clinic';

interface BillingContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  engines: GuidelinesEngine[];
  addEngine: (engine: GuidelinesEngine) => void;
  updateEngine: (id: string, updates: Partial<GuidelinesEngine>) => void;
  publishEngine: (id: string) => void;
  archiveEngine: (id: string) => void;
  newEngineVersion: (id: string) => GuidelinesEngine;
  claimTypeFilter: ClaimTypeFilter;
  setClaimTypeFilter: (filter: ClaimTypeFilter) => void;
}

const BillingContext = createContext<BillingContextType>({
  role: 'admin',
  setRole: () => {},
  engines: [],
  addEngine: () => {},
  updateEngine: () => {},
  publishEngine: () => {},
  archiveEngine: () => {},
  newEngineVersion: () => ({} as GuidelinesEngine),
  claimTypeFilter: 'all',
  setClaimTypeFilter: () => {},
});

export const useBillingContext = () => useContext(BillingContext);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('admin');
  const [engines, setEngines] = useState<GuidelinesEngine[]>([...initialEngines]);
  const [claimTypeFilter, setClaimTypeFilter] = useState<ClaimTypeFilter>('all');

  const addEngine = useCallback((engine: GuidelinesEngine) => {
    setEngines(prev => [...prev, engine]);
    toast.success(`Engine "${engine.name}" created successfully.`);
  }, []);

  const updateEngine = useCallback((id: string, updates: Partial<GuidelinesEngine>) => {
    setEngines(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const publishEngine = useCallback((id: string) => {
    setEngines(prev => prev.map(e => e.id === id ? {
      ...e,
      status: 'published' as const,
      publishedAt: new Date().toISOString().slice(0, 10),
      lastUpdated: new Date().toISOString().slice(0, 10),
    } : e));
    toast.success('Engine published successfully.');
  }, []);

  const archiveEngine = useCallback((id: string) => {
    setEngines(prev => prev.map(e => e.id === id ? {
      ...e,
      status: 'archived' as const,
      lastUpdated: new Date().toISOString().slice(0, 10),
    } : e));
    toast.success('Engine archived.');
  }, []);

  const newEngineVersion = useCallback((id: string): GuidelinesEngine => {
    const original = engines.find(e => e.id === id);
    if (!original) throw new Error('Engine not found');
    const vNum = parseFloat(original.version) + 1;
    const newEng: GuidelinesEngine = {
      ...original,
      id: `eng-${Date.now()}`,
      version: vNum.toFixed(1),
      status: 'draft',
      publishedAt: undefined,
      parentVersionId: original.id,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    setEngines(prev => [...prev, newEng]);
    toast.success(`New draft version ${newEng.version} created from "${original.name}".`);
    return newEng;
  }, [engines]);

  return (
    <BillingContext.Provider value={{ role, setRole, engines, addEngine, updateEngine, publishEngine, archiveEngine, newEngineVersion, claimTypeFilter, setClaimTypeFilter }}>
      {children}
    </BillingContext.Provider>
  );
};
