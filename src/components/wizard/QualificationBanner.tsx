import { useState } from "react";
import { Switch } from "@/components/ui/switch";

interface Props {
  netIncome: number;
}

function fmt(n: number) {
  return "R" + Math.round(n).toLocaleString("en-ZA");
}

export function QualificationBanner({ netIncome }: Props) {
  const [monthly, setMonthly] = useState(true);
  // Simple affordability model: ~30% of net income, 60-month term @ ~12%
  const safeNet = Math.max(0, Math.min(netIncome || 0, 150000));
  const installment = Math.round(safeNet * 0.3);
  const total = Math.round(installment * 50); // rough principal
  const amount = monthly ? installment : total;
  const label = monthly ? "/pm" : " total finance";

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
      style={{ backgroundImage: "var(--gradient-hero)" }}>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <p className="text-xs uppercase tracking-wider opacity-80">You may qualify for</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">{fmt(amount)}</span>
        <span className="text-sm opacity-90">{label}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={monthly ? "font-semibold" : "opacity-70"}>Monthly</span>
          <Switch checked={!monthly} onCheckedChange={(v) => setMonthly(!v)} />
          <span className={!monthly ? "font-semibold" : "opacity-70"}>Total</span>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-snug opacity-80">
        Soft credit and affordability checks are required for accurate amounts.
      </p>
    </div>
  );
}
