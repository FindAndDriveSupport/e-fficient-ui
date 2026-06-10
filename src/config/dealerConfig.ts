/**
 * dealerConfig.ts — Frontend dealer configuration
 * For per-dealer deployments: only keep the relevant dealer entry.
 * Change DEFAULT_DEALER_KEY and the DEALERS entry per repo.
 */

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

export interface DealerEntry {
  name: string;
  branchCode: string;
  allowedDomains: string[];
  mixpanelToken?: string;
  theme: DealerTheme;
  features: DealerFeatures;
}

export interface DealerConfig {
  key: string;
  name: string;
  branchCode: string;
  allowedDomains: string[];
  mixpanelToken?: string;
  theme: DealerTheme;
  features: DealerFeatures;
}

export const DEALERS: Record<string, DealerEntry> = {
  'findndrive': {
    name: 'FindnDrive',
    branchCode: 'FND001',
    allowedDomains: ['findndrive.co.za', 'www.findndrive.co.za', 'localhost'],
    mixpanelToken: '',
    theme: {
      primary: '#6C3FC5',
      primaryLight: '#8B5CF6',
      primaryDark: '#4C1D95',
      gradient: 'linear-gradient(135deg, #6C3FC5 0%, #C026D3 100%)',
      fontFamily: "'Inter', sans-serif",
      borderRadius: '12px',
      logoUrl: '/logos/findndrive.svg',
    },
    features: {
      showDeposit: true,
      showCurrentFinance: true,
      vehicleQueryParams: true,
    },
  },
};

/** Default dealer key for this deployment — change per repo */
export const DEFAULT_DEALER_KEY = 'findndrive';

export function getDealerConfig(key?: string): DealerConfig {
  const resolved = key && DEALERS[key] ? key : DEFAULT_DEALER_KEY;
  const entry = DEALERS[resolved] ?? DEALERS[DEFAULT_DEALER_KEY];
  return { key: resolved, ...entry };
}