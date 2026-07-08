import { useState, useEffect, useCallback } from "react";
import { VehicleSelection } from "./VehicleSelection";
import { Step1 } from "./Step1";
import { Step2 } from "./Step2";
import { LoadingPage } from "./LoadingPage";
import { ResponsePage, type ResponseTier } from "./ResponsePage";
import { BelowMinimumPage } from "./BelowMinimumPage";
import { Step3 } from "./Step3";
import { Step3Fast } from "./Step3Fast";
import { Step3Bike } from "./Step3Bike";
import { SystemDownPage } from "./SystemDownPage";
import { IDNotFoundPage } from "./IDNotFoundPage";
import { HelpButton } from "./HelpButton";
import { initialData, type WizardData } from "./types";
import { Toaster } from "@/components/ui/sonner";
import { workerApi } from "@/lib/worker";
import { logEvent } from "@/lib/logEvent";
import { useEmbed } from "@/contexts/EmbedContext";
import { useDealer } from "@/contexts/DealerContext";
import {
  registerDealer,
  trackPredictionStarted,
  trackPredictionResult,
  trackPredictionRetry,
  trackPredictionFailed,
  trackIdasFailed,
  trackSystemDown,
  trackBelowMinimum,
} from "@/lib/mixpanel";

type Phase = "vehicleSelect" | "step1" | "step2" | "loading" | "systemDown" | "idasFailed" | "response" | "belowMin" | "step3" | "step3fast";

function labelToTier(label: WizardData["predictionLabel"]): ResponseTier {
  if (label === "Great news") return "great";
  if (label === "Good news") return "good";
  return "in_progress";
}

// Minimum approval amount thresholds below which the applicant is routed to
// BelowMinimumPage instead of the normal response flow. These differ by
// finance type — a R15k floor makes sense for bikes but would let far too
// many under-financed vehicle applicants through, so this must branch on
// dealer.financeType rather than be a single shared constant.
const MIN_LOAN_VEHICLE = 60000;
const MIN_LOAN_BIKE = 15000;

const STORAGE_KEY = `wizard_state_${import.meta.env.VITE_DEFAULT_DEALER || 'default'}`;

export function Wizard() {
  const savedState = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const safePhase = (
    savedState?.phase === "loading" ||
    savedState?.phase === "loadingFailed" ||
    savedState?.phase === "systemDown" ||
    savedState?.phase === "idasFailed"
  ) ? "step2" : savedState?.phase;

  const [phase, setPhase] = useState<Phase>(safePhase ?? "vehicleSelect");
  const [data, setData] = useState<WizardData>(savedState?.data ?? initialData);
  const [predictionAttempt, setPredictionAttempt] = useState(0);
  const [appInitialising, setAppInitialising] = useState(true);
  const embed = useEmbed();
  const dealer = useDealer();
  const isBike = dealer.financeType === "bike";
  const MIN_LOAN = isBike ? MIN_LOAN_BIKE : MIN_LOAN_VEHICLE;

  // Register dealer as Mixpanel super property on mount
  useEffect(() => {
    if (dealer.key) registerDealer(dealer.key);
  }, [dealer.key]);

  // Initial spinner — shown once on the very first page the user sees,
  // whether that's VehicleSelection or Step1 depending on dealer config.
  useEffect(() => {
    const t = setTimeout(() => setAppInitialising(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Once dealer config resolves, decide the correct starting phase —
  // only applies if there's no restored cached phase already in play.
  useEffect(() => {
    if (savedState?.phase) return; // don't override a resumed session
    if (dealer.key === "default") return; // wait for real config to load
    const wantsVehicleSelect = dealer.features?.showVehicleSelection;
    setPhase(wantsVehicleSelect ? "vehicleSelect" : "step1");
  }, [dealer.key]);

  useEffect(() => {
    if (phase === "belowMin") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, data }));
    } catch { /* storage full or unavailable */ }
  }, [phase, data]);

  const onComplete = () => localStorage.removeItem(STORAGE_KEY);

  const runPrediction = async (currentData: WizardData) => {
    let amount = 0;
    let failed = false;

    trackPredictionStarted(predictionAttempt);

    try {
      const res = await workerApi.predict(currentData, embed.dealer);
      amount = res.estimatedApprovalAmount;
      setData((d) => ({
        ...d,
        predictionLabel: res.prediction.label,
        predictionReason: res.reason,
        estimatedApprovalAmount: res.estimatedApprovalAmount,
        monthlyInstalment: res.monthlyInstalment,
      }));
    } catch (e: any) {
      console.error(e);
      if (e?.idasFailed) {
        setPredictionAttempt(0);
        setPhase("idasFailed");
        trackIdasFailed();
        logEvent('error', 'idas_failure', {
          applicantId: currentData.applicantId || null,
          dealer: embed.dealer,
        }, embed.dealer);
        return;
      }
      if (e?.systemDown || e?.code === 502) {
        setPredictionAttempt(0);
        setPhase("systemDown");
        trackSystemDown();
        logEvent('error', 'prediction_system_down', {
          applicantId: currentData.applicantId || null,
          dealer: embed.dealer,
          code: e?.code,
        }, embed.dealer);
        return;
      }
      failed = true;
    }

    // NOTE: removed the old "silentFailure" heuristic (amount === 0 && !bureauExpenses).
    // A "Low" prediction legitimately returns amount = 0 — that is not a failure,
    // it's a valid result that should route to belowMin, not trigger a retry loop.

    if (!failed) {
      setPredictionAttempt(0);
      if (amount <= 0 || amount < MIN_LOAN) {
        trackBelowMinimum(amount, MIN_LOAN);
        logEvent('info', 'below_minimum_loan', {
          amount,
          minLoan: MIN_LOAN,
          applicantId: currentData.applicantId || null,
          dealer: embed.dealer,
        }, embed.dealer);
        setPhase("belowMin");
      } else {
        trackPredictionResult(
          data.predictionLabel ?? "In progress",
          amount
        );
        setPhase("response");
      }
    } else {
      if (predictionAttempt === 0) {
        setPredictionAttempt(1);
        trackPredictionRetry(1);
      } else {
        setPredictionAttempt(2);
        trackPredictionFailed();
        logEvent('error', 'prediction_retries_exhausted', {
          applicantId: currentData.applicantId || null,
          dealer: embed.dealer,
        }, embed.dealer);
      }
    }
  };

  const onLoadingDone = useCallback(() => runPrediction(data), [data]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {phase === "vehicleSelect" && (
          <VehicleSelection
            data={data}
            setData={setData}
            next={() => { setAppInitialising(false); setPhase("step1"); }}
            initialising={appInitialising}
          />
        )}
        {phase === "step1" && (
          <Step1 data={data} setData={setData} next={() => setPhase("step2")} />
        )}
        {phase === "step2" && (
          <Step2
            data={data}
            setData={setData}
            next={() => setPhase(data.hasSAID ? "loading" : "step3")}
            back={() => setPhase("step1")}
          />
        )}
        {phase === "loading" && (
          <LoadingPage
            attempt={predictionAttempt}
            onDone={onLoadingDone}
            onFailed={() => { setPredictionAttempt(0); setPhase("step2"); }}
            onProceed={() => { setPredictionAttempt(0); setPhase("step3"); }}
          />
        )}
        {phase === "systemDown" && (
          <SystemDownPage onRetry={() => setPhase("step2")} />
        )}
        {phase === "idasFailed" && (
          <IDNotFoundPage
            onRetry={() => { setData((d) => ({ ...d, idNumber: "" })); setPhase("step2"); }}
            onProceed={() => setPhase("step3")}
          />
        )}
        {phase === "response" && (
          <ResponsePage
            tier={labelToTier(data.predictionLabel)}
            reason={data.predictionReason ?? "Pay all your accounts on time, every month, to maintain a healthy credit score."}
            estimatedApprovalAmount={data.estimatedApprovalAmount ?? 0}
            monthlyInstalment={data.monthlyInstalment ?? 0}
            consents={data.consents2}
            setConsents={(c) => setData({ ...data, consents2: c })}
            next={() => setPhase("step3")}
          />
        )}
        {phase === "belowMin" && (
          <BelowMinimumPage
            onDone={() => { localStorage.removeItem(STORAGE_KEY); setPhase("step1"); }}
            onClose={() => { localStorage.removeItem(STORAGE_KEY); setPhase("step1"); }}
          />
        )}
        {phase === "step3" && isBike && (
          <Step3Bike
            data={data}
            setData={setData}
            back={() => setPhase("response")}
            onComplete={onComplete}
          />
        )}
        {phase === "step3" && !isBike && (
          <Step3
            data={data}
            setData={setData}
            back={() => setPhase("response")}
            onSwitchToFast={() => setPhase("step3fast")}
            onComplete={onComplete}
          />
        )}
        {phase === "step3fast" && !isBike && (
          <Step3Fast
            data={data}
            setData={setData}
            back={() => setPhase("response")}
            onSwitchToManual={() => setPhase("step3")}
            onComplete={onComplete}
          />
        )}
      </div>
      <HelpButton />
      <Toaster />
    </div>
  );
}
