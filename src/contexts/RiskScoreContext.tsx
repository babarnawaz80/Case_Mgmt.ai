// RiskScoreContext — Global drawer state
// Provides openDrawer(individualId, name) from anywhere in the app.
// The drawer itself lives in App.tsx so it can overlay any page.

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface RiskScoreContextValue {
  isOpen: boolean;
  personId: string | null;
  personName: string | null;
  openDrawer: (personId: string, personName: string) => void;
  closeDrawer: () => void;
}

const RiskScoreContext = createContext<RiskScoreContextValue>({
  isOpen: false,
  personId: null,
  personName: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function RiskScoreProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [personId, setPersonId] = useState<string | null>(null);
  const [personName, setPersonName] = useState<string | null>(null);

  const openDrawer = useCallback((id: string, name: string) => {
    setPersonId(id);
    setPersonName(name);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <RiskScoreContext.Provider value={{ isOpen, personId, personName, openDrawer, closeDrawer }}>
      {children}
    </RiskScoreContext.Provider>
  );
}

export function useRiskScore(): RiskScoreContextValue {
  return useContext(RiskScoreContext);
}
