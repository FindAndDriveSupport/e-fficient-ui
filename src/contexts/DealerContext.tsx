import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useEmbed } from "./EmbedContext";
import { getDealerConfig } from "@/config/dealerConfig";

export interface DealerTheme {
  primary?: string;
  primaryLight?: string;
  primaryDark?: string;
  gradient?: string;
  fontFamily?: string;
  borderRadius?: string;
  logoUrl?: string;
}

export interface DealerFeatures {
  showDeposit: boolean;
  showCurrentFinance: boolean;
  vehicleQueryParams: boolean;
}

export interface DealerConfig {
  key: string;
  name: string;
  theme: DealerTheme;
  features: DealerFeatures;
  mixpanelToken?: string;
}

const DEFAULT_CONFIG: DealerConfig = {
  key: "default",
  name: "Vehicle Finance",
  theme: {},
  features: { showDeposit: true, showCurrentFinance: true, vehicleQueryParams: true },
};

const DealerContext = createContext<DealerConfig>(DEFAULT_CONFIG);

export function DealerProvider({ children }: { children: ReactNode }) {
  const { dealer } = useEmbed();
  const [config, setConfig] = useState<DealerConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Read config from dealerConfig.ts — no API call needed
    const dealerConfig = getDealerConfig(dealer);
    setConfig(dealerConfig);

    // Apply theme CSS vars to document root
    const t = dealerConfig.theme || {};
    const root = document.documentElement;
    if (t.primary)      root.style.setProperty("--dealer-primary", t.primary);
    if (t.gradient)     root.style.setProperty("--gradient-primary", t.gradient);
    if (t.borderRadius) root.style.setProperty("--radius", t.borderRadius);
    if (t.fontFamily)   root.style.setProperty("--font-family", t.fontFamily);
  }, [dealer]);

  const value = useMemo(() => config, [config]);

  return <DealerContext.Provider value={value}>{children}</DealerContext.Provider>;
}

export function useDealer() {
  return useContext(DealerContext);
}
