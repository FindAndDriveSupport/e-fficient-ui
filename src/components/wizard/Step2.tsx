import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { QualificationBanner } from "./QualificationBanner";
import { StepHeader } from "./StepHeader";
import type { WizardData } from "./types";

interface Props {
  data: WizardData;
  setData: (d: WizardData) => void;
  next: () => void;
  back: () => void;
}

const CONSENTS = [
  "I give consent to the collection and sharing of my personal information with third-party partners, to complete a pre-qualification check.",
  "I give consent to doing a credit and affordability check, to give me an accurate indication of my eligibility for vehicle finance.",
  "I consent to a fraud check to verify my identity and prevent fraud.",
  "I have read and accept the terms and conditions.",
];

export function Step2({ data, setData, next, back }: Props) {
  const u = (patch: Partial<WizardData>) => setData({ ...data, ...patch });

  const valid =
    Number(data.grossIncome) > 0 &&
    Number(data.grossIncome) <= 250000 &&
    Number(data.livingExpenses) >= 0 &&
    (!data.hasSAID || data.idNumber.trim().length >= 6) &&
    (data.hasSAID || data.idNumber.trim().length >= 4) &&
    data.consents1.every(Boolean);

  const toggle = (i: number) => {
    const c = [...data.consents1];
    c[i] = !c[i];
    u({ consents1: c });
  };

  return (
    <div className="space-y-6">
      <StepHeader step={2} total={3} title="Income & identity" subtitle="A bit more to refine your estimate." onBack={back} />
      <QualificationBanner netIncome={Number(data.netIncome) || 0} />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <Field label="Gross income (monthly, max R250 000)">
          <Input
            type="number"
            value={data.grossIncome}
            onChange={(e) => u({ grossIncome: e.target.value === "" ? "" : Math.min(250000, Number(e.target.value)) })}
            placeholder="R 0"
          />
        </Field>

        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <Checkbox checked={!data.hasSAID} onCheckedChange={(v) => u({ hasSAID: !v })} />
            <span className="text-sm font-medium">I do not have a South African ID</span>
          </label>
          <Field label={data.hasSAID ? "South African ID number" : "Passport / other ID number"}>
            <Input value={data.idNumber} onChange={(e) => u({ idNumber: e.target.value })} placeholder={data.hasSAID ? "13 digit ID" : "Document number"} />
          </Field>
        </div>

        <Field label="Total monthly living expenses">
          <Input
            type="number"
            value={data.livingExpenses}
            onChange={(e) => u({ livingExpenses: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="R 0"
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="text-base font-semibold">Consent</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Please read the consents below and select each checkbox to provide your consent.
        </p>
        <div className="mt-4 space-y-3">
          {CONSENTS.map((c, i) => (
            <label key={i} className="flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/40">
              <Checkbox className="mt-0.5" checked={data.consents1[i]} onCheckedChange={() => toggle(i)} />
              <span className="text-xs leading-snug text-foreground">{c}</span>
            </label>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full rounded-xl py-6 text-base font-semibold shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
        disabled={!valid}
        onClick={next}
      >
        Run my pre-qualification
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
