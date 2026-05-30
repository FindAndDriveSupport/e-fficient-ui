import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { QualificationBanner } from "./QualificationBanner";
import { StepHeader } from "./StepHeader";
import type { WizardData } from "./types";
import { validateMobile, formatThousands, parseThousands } from "./validation";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  data: WizardData;
  setData: (d: WizardData) => void;
  next: () => void;
}

export function Step1({ data, setData, next }: Props) {
  const u = (patch: Partial<WizardData>) => setData({ ...data, ...patch });
  const mobile = validateMobile(data.mobile);
  const mobileDigits = data.mobile.replace(/\D/g, "");
  const valid =
    data.name.trim() &&
    data.surname.trim() &&
    Number(data.netIncome) > 0 &&
    Number(data.netIncome) <= 150000 &&
    mobile.valid;

  return (
    <div className="space-y-6">
      <StepHeader step={1} total={3} title="Let's get to know you" subtitle="A few quick details to estimate what you qualify for." />
      <QualificationBanner netIncome={Number(data.netIncome) || 0} />

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <Input value={data.name} onChange={(e) => u({ name: e.target.value })} placeholder="John" />
          </Field>
          <Field label="Surname">
            <Input value={data.surname} onChange={(e) => u({ surname: e.target.value })} placeholder="Doe" />
          </Field>
        </div>

        <Field label="Net income (monthly, max R150 000)">
          <Input
            type="text"
            inputMode="numeric"
            value={formatThousands(data.netIncome)}
            onChange={(e) => {
              const n = parseThousands(e.target.value);
              u({ netIncome: n === "" ? "" : Math.min(150000, n) });
            }}
            placeholder="R 0"
          />
        </Field>

        <Field label="Mobile number">
          <Input
            type="tel"
            inputMode="numeric"
            maxLength={12}
            value={data.mobile}
            onChange={(e) => u({ mobile: e.target.value.replace(/[^\d\s]/g, "") })}
            placeholder="082 123 4567"
          />
          {mobileDigits.length > 0 && (
            <p className={`mt-1 flex items-center gap-1 text-xs ${mobile.valid ? "text-emerald-600" : "text-destructive"}`}>
              {mobile.valid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {mobile.message}
            </p>
          )}
        </Field>

        <div className="space-y-3 rounded-xl bg-muted/40 p-3">
          <label className="flex items-center gap-3">
            <Checkbox checked={data.hasDeposit} onCheckedChange={(v) => u({ hasDeposit: !!v })} />
            <span className="text-sm font-medium">I have a deposit</span>
          </label>
          {data.hasDeposit && (
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Deposit amount (R)"
              value={formatThousands(data.depositAmount)}
              onChange={(e) => u({ depositAmount: parseThousands(e.target.value) })}
            />
          )}

          <label className="flex items-center gap-3">
            <Checkbox checked={data.hasFinance} onCheckedChange={(v) => u({ hasFinance: !!v })} />
            <span className="text-sm font-medium">I currently have finance</span>
          </label>
          {data.hasFinance && (
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Current monthly finance instalment (R)"
              value={formatThousands(data.financeAmount)}
              onChange={(e) => u({ financeAmount: parseThousands(e.target.value) })}
            />
          )}
        </div>
      </div>

      <Button
        size="lg"
        className="w-full rounded-xl py-6 text-base font-semibold shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
        disabled={!valid}
        onClick={next}
      >
        Continue
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
