import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LookupSelect } from "./LookupSelect";
import { StepHeader } from "./StepHeader";
import { Loader2 } from "lucide-react";
import type { WizardData } from "./types";
import { usePageTimer, mp } from "@/lib/mixpanel";

interface Props {
  data: WizardData;
  setData: (d: WizardData) => void;
  next: () => void;
  initialising?: boolean;
}

export function VehicleSelection({ data, setData, next, initialising = false }: Props) {
  usePageTimer("Vehicle Selection");
  useEffect(() => { mp.track("Vehicle Selection Viewed"); }, []);

  const [make, setMake] = useState(data.vehicleMake ?? "");
  const [model, setModel] = useState(data.vehicleModel ?? "");

  // Reset model whenever make changes to something different
  useEffect(() => {
    if (make !== data.vehicleMake) {
      setModel("");
    }
  }, [make]);

  const onMakeChange = (v: string) => {
    setMake(v);
    mp.track("Vehicle Selection - Make Selected", { make: v });
  };

  const onModelChange = (v: string) => {
    setModel(v);
    mp.track("Vehicle Selection - Model Selected", { make, model: v });
  };

  const onContinue = () => {
    setData({ ...data, vehicleMake: make || undefined, vehicleModel: model || undefined });
    mp.track("Vehicle Selection Completed", { make, model, skipped: false });
    next();
  };

  const onSkip = () => {
    mp.track("Vehicle Selection Completed", { skipped: true });
    next();
  };

  if (initialising) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2
          className="h-10 w-10 animate-spin"
          style={{ color: "var(--dealer-primary, var(--primary))" }}
        />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader
        step={0}
        total={3}
        title="Which vehicle are you interested in?"
        subtitle="This helps us tailor your estimate — you can skip this if you're not sure yet."
      />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Vehicle make</Label>
          <LookupSelect
            value={make}
            onChange={onMakeChange}
            endpoint="/api/lookup/vehicle-makes"
            placeholder="Search make…"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Vehicle model</Label>
          <LookupSelect
            value={model}
            onChange={onModelChange}
            endpoint={`/api/lookup/vehicle-models?make=${encodeURIComponent(make)}`}
            placeholder={make ? "Search model…" : "Select a make first"}
            disabled={!make}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full rounded-xl py-6 text-base font-semibold shadow-[var(--shadow-elegant)]"
          style={{ backgroundImage: "var(--gradient-primary)" }}
          disabled={!make || !model}
          onClick={onContinue}
        >
          Continue
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2 text-sm text-muted-foreground underline hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
