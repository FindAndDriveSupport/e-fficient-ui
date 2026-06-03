import { useState } from "react";
import { Step1 } from "./Step1";
import { Step2 } from "./Step2";
import { LoadingPage } from "./LoadingPage";
import { ResponsePage, type ResponseTier } from "./ResponsePage";
import { BelowMinimumPage } from "./BelowMinimumPage";
import { Step3 } from "./Step3";
import { HelpButton } from "./HelpButton";
import { initialData, type WizardData } from "./types";
import { Toaster } from "@/components/ui/sonner";
import { workerApi } from "@/lib/worker";
import { useEmbed } from "@/contexts/EmbedContext";

type Phase = "step1" | "step2" | "loading" | "response" | "belowMin" | "step3";

function labelToTier(label: WizardData["predictionLabel"]): ResponseTier {
  if (label === "Great news") return "great";
  if (label === "Good news") return "good";
  return "in_progress";
}

const MIN_LOAN = 60000;

export function Wizard() {
  const [phase, setPhase] = useState<Phase>("step1");
  const [data, setData] = useState<WizardData>(initialData);
  const embed = useEmbed();

  const runPrediction = async () => {
    let amount = 0;
    try {
      const res = await workerApi.predict(data, embed.dealer);
      amount = res.estimatedApprovalAmount;
      setData((d) => ({
        ...d,
        predictionLabel: res.prediction.label,
        predictionReason: res.reason,
        estimatedApprovalAmount: res.estimatedApprovalAmount,
        monthlyInstalment: res.monthlyInstalment,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setPhase(amount <= 0 && amount < MIN_LOAN ? "belowMin" : "response");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {phase === "step1" && <Step1 data={data} setData={setData} next={() => setPhase("step2")} />}
        {phase === "step2" && (
          <Step2 data={data} setData={setData} next={() => setPhase("loading")} back={() => setPhase("step1")} />
        )}
        {phase === "loading" && <LoadingPage onDone={runPrediction} />}
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
            onDone={() => setPhase("step1")}
            onClose={() => setPhase("step1")}
          />
        )}
        {phase === "step3" && <Step3 data={data} setData={setData} back={() => setPhase("response")} />}
      </div>
      <HelpButton />
      <Toaster />
    </div>
  );
}
