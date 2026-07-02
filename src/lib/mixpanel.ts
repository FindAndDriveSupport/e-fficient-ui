import { useEffect, useRef } from "react";

type MP = {
  init?: (token: string, opts?: Record<string, unknown>) => void;
  track?: (event: string, props?: Record<string, unknown>) => void;
  time_event?: (event: string) => void;
  register?: (props: Record<string, unknown>) => void;
  identify?: (id: string) => void;
};

function getMP(): MP | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { mixpanel?: MP }).mixpanel;
}

export const mp = {
  track(event: string, props: Record<string, unknown> = {}) {
    try { getMP()?.track?.(event, props); } catch (e) { console.warn("[Mixpanel] track", e); }
  },
  time_event(event: string) {
    try { getMP()?.time_event?.(event); } catch (e) { console.warn("[Mixpanel] time_event", e); }
  },
  register(props: Record<string, unknown>) {
    try { getMP()?.register?.(props); } catch (e) { console.warn("[Mixpanel] register", e); }
  },
  identify(id: string) {
    try { getMP()?.identify?.(id); } catch (e) { console.warn("[Mixpanel] identify", e); }
  },
};

/** Times a step from mount to unmount and fires `Time Spent - <stepName>` */
export function usePageTimer(stepName: string) {
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    startRef.current = Date.now();
    mp.time_event(`Time Spent - ${stepName}`);
    return () => {
      const seconds = Math.round((Date.now() - (startRef.current ?? Date.now())) / 1000);
      mp.track(`Time Spent - ${stepName}`, { duration_seconds: seconds });
    };
  }, [stepName]);
}

// ── Super properties ──────────────────────────────────────────────────────────

/** Register dealer as a super property so every event includes it */
export function registerDealer(dealer: string) {
  mp.register({ dealer });
}

// ── Widget ────────────────────────────────────────────────────────────────────

export const trackWidgetOpened = (dealer?: string) =>
  mp.track("Widget Opened", { dealer });

// ── Step 1 ────────────────────────────────────────────────────────────────────

export const trackStep1Viewed = () =>
  mp.track("Step 1 Viewed");

export const trackStep1FieldChanged = (field: string, value?: unknown) =>
  mp.track("Step 1 Field Changed", { field, value });

export const trackStep1DepositToggled = (checked: boolean) =>
  mp.track("Step 1 Deposit Toggled", { checked });

export const trackStep1CurrentFinanceToggled = (checked: boolean) =>
  mp.track("Step 1 Current Finance Toggled", { checked });

export const trackStep1Continue = (data: {
  grossIncome?: number;
  netIncome?: number;
  hasDeposit?: boolean;
  hasFinance?: boolean;
}) => mp.track("Step 1 Completed", data);

// ── Step 2 ────────────────────────────────────────────────────────────────────

export const trackStep2Viewed = () =>
  mp.track("Step 2 Viewed");

export const trackStep2FieldChanged = (field: string, value?: unknown) =>
  mp.track("Step 2 Field Changed", { field, value });

export const trackStep2Submit = (data: {
  idType?: string;
  hasMarriage?: boolean;
  employmentType?: string;
}) => mp.track("Step 2 Submitted", data);

export const trackStep2Back = () =>
  mp.track("Step 2 Back Clicked");

// ── Loading / Prediction ──────────────────────────────────────────────────────

export const trackPredictionStarted = (attempt: number) =>
  mp.track("Prediction Started", { attempt });

export const trackPredictionResult = (outcome: string, amount: number) =>
  mp.track("Prediction Result", { outcome, estimated_approval_amount: amount });

export const trackPredictionRetry = (attempt: number) =>
  mp.track("Prediction Retry", { attempt });

export const trackPredictionFailed = () =>
  mp.track("Prediction Failed - Retries Exhausted");

export const trackIdasFailed = () =>
  mp.track("IDAS Bureau Failure");

export const trackSystemDown = () =>
  mp.track("System Down");

// ── Response page ─────────────────────────────────────────────────────────────

export const trackResponsePageViewed = (tier: string, amount: number) =>
  mp.track("Response Page Viewed", { tier, estimated_approval_amount: amount });

export const trackResponseContinueClicked = (tier: string) =>
  mp.track("Response Continue Clicked", { tier });

// ── Below minimum ─────────────────────────────────────────────────────────────

export const trackBelowMinimum = (amount: number, minLoan: number) =>
  mp.track("Below Minimum Loan", { amount, min_loan: minLoan });

// ── Step 3 ────────────────────────────────────────────────────────────────────

export const trackStep3Viewed = (mode: "manual" | "fast" | "bike") =>
  mp.track("Step 3 Viewed", { mode });

export const trackStep3FieldChanged = (field: string, value?: unknown) =>
  mp.track("Step 3 Field Changed", { field, value });

export const trackStep3SwitchedToFast = () =>
  mp.track("Step 3 Switched to Fast Mode");

export const trackStep3SwitchedToManual = () =>
  mp.track("Step 3 Switched to Manual Mode");

export const trackStep3SubmitClicked = () =>
  mp.track("Step 3 Submit Clicked");

export const trackStep3SubmitResult = (success: boolean, extra: Record<string, unknown> = {}) =>
  mp.track("Step 3 Submit Result", { success, ...extra });

export const trackStep3Abandoned = (field?: string) =>
  mp.track("Step 3 Abandoned", { last_field: field ?? null });

export const trackBranchSelected = (branchCode: string, branchName: string) =>
  mp.track("Branch Selected", { branch_code: branchCode, branch_name: branchName });