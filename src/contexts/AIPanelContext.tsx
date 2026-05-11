import { createContext, useContext, useState, ReactNode } from "react";

interface AIPanelCtx {
  open: boolean;
  toggle: () => void;
  setOpen: (v: boolean) => void;
}

const Ctx = createContext<AIPanelCtx>({ open: false, toggle: () => {}, setOpen: () => {} });

export function AIPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen, toggle: () => setOpen((v) => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAIPanel = () => useContext(Ctx);
