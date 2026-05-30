import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StepHeader } from "./StepHeader";
import { TypingInput } from "./TypingInput";
import type { WizardData } from "./types";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const DEALERS = ["Sandton Auto", "CMH Cape Town", "Barons VW Pretoria", "Audi Centre Umhlanga", "BMW Bryanston"];
const VEHICLES = ["VW Polo 1.0 TSI", "Toyota Corolla Cross", "Hyundai i20", "Ford Ranger 2.0 BiT", "BMW 320i M Sport"];

const SECTIONS: { id: string; title: string; fields: string[] }[] = [
  { id: "vehicle", title: "Dealership & vehicle", fields: ["dealership", "vehicle"] },
  { id: "personal", title: "Personal details", fields: ["title", "firstName", "lastName", "mobile3", "email", "idType", "idNumber3", "education"] },
  { id: "address", title: "Residential address", fields: ["street", "suburb", "city", "province", "postalCode", "addressType", "occupationDate", "maritalStatus"] },
  { id: "nok", title: "Next of kin", fields: ["nokFirst", "nokLast", "nokContact"] },
  { id: "employment", title: "Employment", fields: ["employmentStatus", "employerName", "industry", "occupation", "level", "employmentDate", "empStreet", "empSuburb", "empCity", "empProvince", "empPostal", "empContact", "salaryDay"] },
  { id: "confirm", title: "Confirm income", fields: ["confirmGross", "confirmNet"] },
];

const LABELS: Record<string, string> = {
  dealership: "Dealership name",
  vehicle: "Selected vehicle",
  title: "Title",
  firstName: "First name",
  lastName: "Last name",
  mobile3: "Mobile number",
  email: "Email",
  idType: "ID type",
  idNumber3: "ID number",
  education: "Education",
  street: "Street address",
  suburb: "Suburb",
  city: "City",
  province: "Province",
  postalCode: "Postal code",
  addressType: "Address type",
  occupationDate: "Occupation date",
  maritalStatus: "Marital status",
  nokFirst: "Next of kin first name",
  nokLast: "Next of kin last name",
  nokContact: "Next of kin contact",
  employmentStatus: "Employment status",
  employerName: "Employer name",
  industry: "Industry",
  occupation: "Occupation",
  level: "Level",
  employmentDate: "Employment date",
  empStreet: "Employer street",
  empSuburb: "Employer suburb",
  empCity: "Employer city",
  empProvince: "Employer province",
  empPostal: "Employer postal code",
  empContact: "Employer contact",
  salaryDay: "Salary day",
  confirmGross: "Confirm gross salary (R)",
  confirmNet: "Confirm net salary (R)",
};

export function Step3({ data, setData, back }: { data: WizardData; setData: (d: WizardData) => void; back: () => void }) {
  const allFields = useMemo(() => SECTIONS.flatMap((s) => s.fields), []);
  const filled = allFields.filter((f) => String((data as any)[f] ?? "").trim().length > 0).length;
  const pct = Math.round((filled / allFields.length) * 100);

  const [submitted, setSubmitted] = useState(false);

  const set = (k: string, v: string) => setData({ ...data, [k]: v });

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold">Application submitted</h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          We've received your full vehicle finance application. We'll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader step={3} total={3} title="Full application" subtitle="Complete the sections below to submit your application." onBack={back} />

      <div className="sticky top-2 z-10 rounded-2xl border border-border bg-card/90 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">Application progress</span>
          <span className="text-primary">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundImage: "var(--gradient-primary)" }} />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["vehicle"]} className="space-y-3">
        {SECTIONS.map((s) => {
          const done = s.fields.filter((f) => String((data as any)[f] ?? "").trim().length > 0).length;
          const total = s.fields.length;
          const complete = done === total;
          return (
            <AccordionItem key={s.id} value={s.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                  <span className="text-left text-sm font-semibold">{s.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${complete ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {done}/{total}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-5 pb-5">
                {s.fields.map((f) => (
                  <div key={f} className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{LABELS[f]}</Label>
                    {f === "dealership" ? (
                      <TypingInput phrases={DEALERS} value={String((data as any)[f] ?? "")} onChange={(v) => set(f, v)} />
                    ) : f === "vehicle" ? (
                      <TypingInput phrases={VEHICLES} value={String((data as any)[f] ?? "")} onChange={(v) => set(f, v)} />
                    ) : (
                      <Input
                        value={String((data as any)[f] ?? "")}
                        onChange={(e) => set(f, e.target.value)}
                        placeholder={LABELS[f]}
                      />
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Button
        size="lg"
        className="w-full rounded-xl py-6 text-base font-semibold shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
        disabled={pct < 100}
        onClick={() => {
          setSubmitted(true);
          toast.success("Application submitted successfully");
        }}
      >
        {pct < 100 ? `Complete all fields (${pct}%)` : "Submit application"}
      </Button>
    </div>
  );
}
