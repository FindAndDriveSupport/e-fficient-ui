import { useState, useEffect } from "react";
import { Step1 } from "./Step1";
import { Step2 } from "./Step2";
import { LoadingPage } from "./LoadingPage";
import { ResponsePage, type ResponseTier } from "./ResponsePage";
import { BelowMinimumPage } from "./BelowMinimumPage";
import { Step3 } from "./Step3";
import { Step3Fast } from "./Step3Fast";
import { SystemDownPage } from "./SystemDownPage";
import { IDNotFoundPage } from "./IDNotFoundPage";
import { HelpButton } from "./HelpButton";
import { initialData, type WizardData } from "./types";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { workerApi } from "@/lib/worker";
import { useEmbed } from "@/contexts/EmbedContext";

type Phase = "step1" | "step2" | "loading" | "loadingFailed" | "systemDown" | "idasFailed" | "response" | "belowMin" | "step3" | "step3fast";

function labelToTier(label: WizardData["predictionLabel"]): ResponseTier {
  if (label === "Great news") return "great";
  if (label === "Good news") return "good";
  return "in_progress";
}

const MIN_LOAN = 60000;

const STORAGE_KEY = `wizard_state_${import.meta.env.VITE_DEFAULT_DEALER || 'default'}`;

export function Wizard() {
  const savedState = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const safePhase = (savedState?.phase === "loading" || savedState?.phase === "loadingFailed" || savedState?.phase === "systemDown" || savedState?.phase === "idasFailed") ? "step2" : savedState?.phase;

  const [phase, setPhase] = useState<Phase>(safePhase ?? "step1");
  const [data, setData] = useState<WizardData>(savedState?.data ?? initialData);
  const embed = useEmbed();

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

  const [predictionAttempt, setPredictionAttempt] = useState(0);

  const runPrediction = async (currentData: WizardData) => {
    let amount = 0;
    let failed = false;
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
      // Check if response body indicates system down
      if (e?.idasFailed) {
        setPhase("idasFailed");
        return;
      }
      if (e?.systemDown || e?.code === 502) {
        setPhase("systemDown");
        return;
      }
      failed = true;
    } finally {
      if (!failed) {
        // Treat zero approval amount with zero bureau expenses as a silent bureau failure
        const silentFailure = amount === 0 && !data.bureauExpenses;
        if (silentFailure) failed = true;
      }
      if (!failed) {
        setPredictionAttempt(0);
        setPhase(amount <= 0 || amount < MIN_LOAN ? "belowMin" : "response");
      } else {
        if (predictionAttempt === 0) {
          setPredictionAttempt(1);
          setPhase("loading");
        } else {
          setPredictionAttempt(0);
          setPhase("loadingFailed");
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {phase === "step1" && <Step1 data={data} setData={setData} next={() => setPhase("step2")} />}
        {phase === "step2" && (
          <Step2 data={data} setData={setData} next={() => setPhase("loading")} back={() => setPhase("step1")} />
        )}
        {phase === "loading" && (
          <LoadingPage
            onDone={() => runPrediction(data)}
            onFailed={() => setPhase("step2")}
            onProceed={() => setPhase("step3")}
          />
        )}
        {phase === "loadingFailed" && (
          <LoadingPage
            onDone={() => runPrediction(data)}
            onFailed={() => setPhase("step2")}
            onProceed={() => setPhase("step3")}
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
        {phase === "step3" && (
          <Step3
            data={data}
            setData={setData}
            back={() => setPhase("response")}
            onSwitchToFast={() => setPhase("step3fast")}
            onComplete={onComplete}
          />
        )}
        {phase === "step3fast" && (
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
