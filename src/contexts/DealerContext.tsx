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
  financeType?: string;
}

// Single source of truth for "no dealer resolved yet" — derived from
// dealerConfig.ts's own default (DEFAULT_DEALER_KEY) rather than a
// separately hardcoded object. Previously this was a standalone
// "Vehicle Finance" stub with no financeType, which disagreed with
// dealerConfig.ts's own default and briefly reported isBike === false
// even for bike dealers before the effect resolved.
const DEFAULT_CONFIG: DealerConfig = getDealerConfig();

const DealerContext = createContext<DealerConfig>(DEFAULT_CONFIG);

export function DealerProvider({ children }: { children: ReactNode }) {
  const { dealer } = useEmbed();
  const [config, setConfig] = useState<DealerConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Read config from dealerConfig.ts — no API call needed
    const dealerConfig = getDealerConfig(dealer);
    setConfig(dealerConfig);

    // Guard against stale per-dealer builds: if this dealer is missing
    // financeType, downstream logic (e.g. Wizard.tsx MIN_LOAN branching)
    // silently falls back to vehicle-finance behaviour. Flag it loudly.
    if (!dealerConfig.financeType) {
      console.warn(
        `[DealerContext] financeType is missing for dealer "${dealerConfig.key}". ` +
        `This dealer's build may be stale relative to dealerConfig.ts — ` +
        `finance-type-dependent logic (e.g. minimum loan thresholds) will ` +
        `default to vehicle behaviour.`
      );
    }

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
