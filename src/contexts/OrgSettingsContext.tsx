// OrgSettingsContext — loads org logo, brand color, and logo link URL from Firestore once,
// exposes them globally, and applies the brand color as a CSS custom property.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface OrgSettings {
  logoUrl: string | null;
  logoLinkUrl: string | null;   // optional click-through URL for the topbar logo
  brandColor: string;
  orgName: string;
}

const DEFAULT: OrgSettings = {
  logoUrl: null,
  logoLinkUrl: null,
  brandColor: "#0d9488", // teal-600 matches existing theme
  orgName: "CaseManagement.ai",
};

const OrgSettingsContext = createContext<OrgSettings>(DEFAULT);

export function OrgSettingsProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const [settings, setSettings] = useState<OrgSettings>(DEFAULT);

  useEffect(() => {
    const orgId = userProfile?.organizationId;
    if (!orgId) return;

    const unsub = onSnapshot(doc(db, "organizations", orgId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const color: string = d.brandColor ?? DEFAULT.brandColor;
      const logo: string | null = d.logoUrl ?? null;
      const logoLink: string | null = d.logoLinkUrl ?? null;
      const name: string = d.name ?? DEFAULT.orgName;

      setSettings({ logoUrl: logo, logoLinkUrl: logoLink, brandColor: color, orgName: name });

      // Store the brand color in a dedicated CSS variable so it doesn't
      // conflict with the dark/light mode --icm-accent values set by the
      // stylesheet. Components can reference var(--icm-accent-brand) for
      // org-specific accent colour when needed.
      document.documentElement.style.setProperty("--icm-accent-brand", hexToHsl(color));
    });

    return unsub;
  }, [userProfile?.organizationId]);

  return (
    <OrgSettingsContext.Provider value={settings}>
      {children}
    </OrgSettingsContext.Provider>
  );
}

export function useOrgSettings(): OrgSettings {
  return useContext(OrgSettingsContext);
}

// Convert #rrggbb to the HSL components used by Tailwind CSS variables
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
