import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useEmbed } from "./EmbedContext";
import { getDealerConfig, type DealerTheme, type DealerFeatures, type DealerBranch } from "@/config/dealerConfig";

export type { DealerTheme, DealerFeatures, DealerBranch };

export interface DealerConfig {
  key: string;
  name: string;
  branchCode: string;
  theme: DealerTheme;
  features: DealerFeatures;
  branches?: DealerBranch[];
}

const DealerContext = createContext<DealerConfig>(getDealerConfig());

export function DealerProvider({ children }: { children: ReactNode }) {
  const { dealer: embedDealer } = useEmbed();
  const [config, setConfig] = useState<DealerConfig>(() => getDealerConfig(embedDealer));

  useEffect(() => {
    const resolved = getDealerConfig(embedDealer);
    setConfig(resolved);

    // Apply theme CSS vars
    const t = resolved.theme || {};
    const root = document.documentElement;
    if (t.primary)       root.style.setProperty("--dealer-primary", t.primary);
    if (t.gradient)      root.style.setProperty("--gradient-primary", t.gradient);
    if (t.borderRadius)  root.style.setProperty("--radius", t.borderRadius);
  }, [embedDealer]);

  const value = useMemo(() => config, [config]);
  return <DealerContext.Provider value={value}>{children}</DealerContext.Provider>;
}

export function useDealer() {
  return useContext(DealerContext);
}