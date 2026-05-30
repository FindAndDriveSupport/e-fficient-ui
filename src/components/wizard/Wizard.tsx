import { useState } from "react";
import { Step1 } from "./Step1";
import { Step2 } from "./Step2";
import { LoadingPage } from "./LoadingPage";
import { ResponsePage, type ResponseTier } from "./ResponsePage";
import { Step3 } from "./Step3";
import { HelpButton } from "./HelpButton";
import { initialData, type WizardData } from "./types";
import { Toaster } from "@/components/ui/sonner";

type Phase = "step1" | "step2" | "loading" | "response" | "step3";

function pickTier(data: WizardData): ResponseTier {
  const net = Number(data.netIncome) || 0;
  const exp = Number(data.livingExpenses) || 0;
  const ratio = net > 0 ? exp / net : 1;
  if (net >= 25000 && ratio < 0.4) return "great";
  if (net >= 12000 && ratio < 0.6) return "good";
  return "in_progress";
}

export function Wizard() {
  const [phase, setPhase] = useState<Phase>("step1");
  const [data, setData] = useState<WizardData>(initialData);
  const [tier, setTier] = useState<ResponseTier>("good");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-6 sm:py-10">
        {phase === "step1" && <Step1 data={data} setData={setData} next={() => setPhase("step2")} />}
        {phase === "step2" && (
          <Step2 data={data} setData={setData} next={() => setPhase("loading")} back={() => setPhase("step1")} />
        )}
        {phase === "loading" && (
          <LoadingPage
            onDone={() => {
              setTier(pickTier(data));
              setPhase("response");
            }}
          />
        )}
        {phase === "response" && (
          <ResponsePage
            tier={tier}
            consents={data.consents2}
            setConsents={(c) => setData({ ...data, consents2: c })}
            next={() => setPhase("step3")}
          />
        )}
        {phase === "step3" && <Step3 data={data} setData={setData} back={() => setPhase("response")} />}
      </div>
      <HelpButton />
      <Toaster />
    </div>
  );
}
