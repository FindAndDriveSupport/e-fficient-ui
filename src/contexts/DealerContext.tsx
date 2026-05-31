import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useEmbed } from "./EmbedContext";

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
    const worker = import.meta.env.VITE_WORKER_URL as string | undefined;
    if (!worker || !dealer) return;
    let cancelled = false;
    fetch(`${worker}/api/dealer/config`, { headers: { "X-Dealer-Key": dealer } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DealerConfig | null) => {
        if (cancelled || !data) return;
        setConfig(data);
        const t = data.theme || {};
        const root = document.documentElement;
        if (t.primary) root.style.setProperty("--dealer-primary", t.primary);
        if (t.gradient) root.style.setProperty("--gradient-primary", t.gradient);
        if (t.borderRadius) root.style.setProperty("--radius", t.borderRadius);
      })
      .catch((e) => console.warn("[Dealer] config fetch failed", e));
    return () => {
      cancelled = true;
    };
  }, [dealer]);

  const value = useMemo(() => config, [config]);
  return <DealerContext.Provider value={value}>{children}</DealerContext.Provider>;
}

export function useDealer() {
  return useContext(DealerContext);
}
