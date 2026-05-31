import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface EmbedParams {
  dealer?: string;
  make?: string;
  model?: string;
  mm?: string;
  branchCode?: string;
}

const EmbedContext = createContext<EmbedParams>({});

export function EmbedProvider({ children }: { children: ReactNode }) {
  const value = useMemo<EmbedParams>(() => {
    if (typeof window === "undefined") return {};
    const sp = new URLSearchParams(window.location.search);
    const pick = (k: string) => sp.get(k)?.trim() || undefined;
    return {
      dealer: pick("dealer"),
      make: pick("make"),
      model: pick("model"),
      mm: pick("mm"),
      branchCode: pick("branchCode"),
    };
  }, []);
  return <EmbedContext.Provider value={value}>{children}</EmbedContext.Provider>;
}

export function useEmbed() {
  return useContext(EmbedContext);
}
