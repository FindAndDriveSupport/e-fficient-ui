import { useMemo, useState } from "react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StepHeader } from "./StepHeader";
import { TypingInput } from "./TypingInput";
import { EdithErrorBanner } from "./EdithErrorBanner";
import { FieldErrorHint } from "./FieldErrorHint";
import type { WizardData } from "./types";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatThousands, parseThousands } from "./validation";
import {
  TITLES, GENDERS, MARITAL_STATUSES, MARRIAGE_TYPES, RESIDENTIAL_STATUSES,
  PROVINCES, EMPLOYMENT_TYPES, INDUSTRIES, OCCUPATION_LEVELS, EDUCATION_LEVELS,
  RELATIONSHIPS, FINANCE_TERMS,
} from "./dropdowns";
import { useEmbed } from "@/contexts/EmbedContext";
import { useDealer } from "@/contexts/DealerContext";
import { workerApi } from "@/lib/worker";
import { parseEdithErrors, type ParsedEdithResponse } from "@/lib/edithErrors";
import { usePageTimer, trackStep3SubmitApplication } from "@/lib/mixpanel";

const DEALERS = ["Sandton Auto", "CMH Cape Town", "Barons VW Pretoria", "Audi Centre Umhlanga", "BMW Bryanston"];
const VEHICLES = ["VW Polo 1.0 TSI", "Toyota Corolla Cross", "Hyundai i20", "Ford Ranger 2.0 BiT", "BMW 320i M Sport"];

// Map Edith FieldName → our local WizardData key, used to display inline errors.
const EDITH_FIELD_TO_LOCAL: Record<string, keyof WizardData> = {
  lastName: "surname",
  firstName: "name",
  idNumber: "idNumber",
  title: "title",
  gender: "gender",
  birthDate: "birthDate",
  emailAddress: "email",
  mobileNumber: "mobile",
  maritalStatus: "maritalStatus",
  marriageType: "marriageType",
  residentialStatus: "residentialStatus",
  "physicalAddress.suburb": "suburb",
  "physicalAddress.city": "city",
  "physicalAddress.postCode": "postalCode",
  "physicalAddress.province": "province",
  employmentType: "employmentType",
  employerName: "employerName",
  industry: "industry",
  occupation: "occupation",
  occupationLevel: "occupationLevel",
  currentEmploymentStartDate: "employmentDate",
  workTelephoneCode: "empTelCode",
  workTelephoneNumber: "empTelNumber",
  salaryDay: "salaryDay",
  basicSalary: "confirmGross",
  nettSalary: "confirmNet",
  financeTerm: "financeTerm",
  paymentDay: "paymentDay",
  depositValue: "depositAmount",
};

interface Section {
  id: string;
  title: string;
  fields: (keyof WizardData)[];
}

const SECTIONS: Section[] = [
  { id: "vehicle", title: "Dealership & vehicle", fields: ["dealership", "vehicle"] },
  { id: "personal", title: "Personal details", fields: ["title", "name", "surname", "gender", "birthDate", "email", "educationLevel", "maritalStatus"] },
  { id: "address", title: "Residential address", fields: ["street", "suburb", "city", "province", "postalCode", "residentialStatus", "yearsAtAddress"] },
  { id: "nok", title: "Next of kin", fields: ["nokFirst", "nokLast", "nokRelationship", "nokContact"] },
  { id: "employment", title: "Employment", fields: ["employmentType", "employerName", "industry", "occupation", "occupationLevel", "employmentDate", "empStreet", "empSuburb", "empCity", "empProvince", "empPostal", "empTelCode", "empTelNumber", "salaryDay"] },
  { id: "financial", title: "Confirm income & finance", fields: ["confirmGross", "confirmNet", "financeTerm", "paymentDay"] },
  { id: "marketing", title: "Marketing preferences", fields: ["marketingTelesales", "marketingEmail", "marketingSMS", "idxConsent", "ivxConsent"] },
];

const LABELS: Partial<Record<keyof WizardData, string>> = {
  dealership: "Dealership name", vehicle: "Selected vehicle",
  title: "Title", name: "First name", surname: "Surname", gender: "Gender", birthDate: "Date of birth (DD/MM/YYYY)",
  email: "Email", educationLevel: "Education level", maritalStatus: "Marital status",
  street: "Street address", suburb: "Suburb", city: "City", province: "Province", postalCode: "Postal code",
  residentialStatus: "Residential status", yearsAtAddress: "Years at address",
  nokFirst: "Next of kin first name", nokLast: "Next of kin surname",
  nokRelationship: "Relationship", nokContact: "Next of kin mobile",
  employmentType: "Employment type", employerName: "Employer name",
  industry: "Industry", occupation: "Occupation", occupationLevel: "Occupation level",
  employmentDate: "Employment start date (DD/MM/YYYY)",
  empStreet: "Employer street", empSuburb: "Employer suburb", empCity: "Employer city",
  empProvince: "Employer province", empPostal: "Employer postal code",
  empTelCode: "Work tel area code", empTelNumber: "Work tel number",
  salaryDay: "Salary day (1-31)",
  confirmGross: "Confirm gross salary (R)", confirmNet: "Confirm net salary (R)",
  financeTerm: "Finance term (months)", paymentDay: "Payment day (1-28)",
  marketingTelesales: "Telesales marketing", marketingEmail: "Email marketing",
  marketingSMS: "SMS marketing", idxConsent: "Bank statement access (IDX)", ivxConsent: "Payslip access (IVX)",
};

const DROPDOWNS: Partial<Record<keyof WizardData, readonly string[] | readonly number[]>> = {
  title: TITLES,
  gender: GENDERS,
  maritalStatus: MARITAL_STATUSES,
  marriageType: MARRIAGE_TYPES,
  residentialStatus: RESIDENTIAL_STATUSES,
  province: PROVINCES,
  empProvince: PROVINCES,
  employmentType: EMPLOYMENT_TYPES,
  industry: INDUSTRIES,
  occupationLevel: OCCUPATION_LEVELS,
  educationLevel: EDUCATION_LEVELS,
  nokRelationship: RELATIONSHIPS,
  financeTerm: FINANCE_TERMS,
};

const CURRENCY_FIELDS: (keyof WizardData)[] = ["confirmGross", "confirmNet"];
const CHECKBOX_FIELDS: (keyof WizardData)[] = ["marketingTelesales", "marketingEmail", "marketingSMS", "idxConsent", "ivxConsent"];

export function Step3({ data, setData, back }: { data: WizardData; setData: (d: WizardData) => void; back: () => void }) {
  usePageTimer("Step 3 - Full Application");
  const embed = useEmbed();
  const dealer = useDealer();

  // Pre-fill vehicle/dealership from embed params on first render
  useMemo(() => {
    const patch: Partial<WizardData> = {};
    if (!data.vehicle && (embed.make || embed.model)) {
      patch.vehicle = [embed.make, embed.model].filter(Boolean).join(" ");
    }
    if (!data.vehicleCode && embed.mm) patch.vehicleCode = embed.mm;
    if (!data.dealership && dealer.name && dealer.key !== "default") patch.dealership = dealer.name;
    if (Object.keys(patch).length) setData({ ...data, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredFields = useMemo(
    () => SECTIONS.flatMap((s) => s.fields).filter((f) => !CHECKBOX_FIELDS.includes(f)),
    [],
  );
  const filled = requiredFields.filter((f) => String(data[f] ?? "").trim().length > 0).length;
  const pct = Math.round((filled / requiredFields.length) * 100);

  const [submitted, setSubmitted] = useState<{ policyNumber?: string } | null>(null);
  const [errors, setErrors] = useState<ParsedEdithResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => setData({ ...data, [k]: v });

  // Build field-error lookup keyed by our local field names
  const byLocalField = useMemo(() => {
    if (!errors) return {} as Record<string, { title: string; message: string; action: string }>;
    const map: Record<string, { title: string; message: string; action: string }> = {};
    for (const e of errors.fieldErrors) {
      if (!e.field) continue;
      const local = EDITH_FIELD_TO_LOCAL[e.field];
      if (local) map[local as string] = { title: e.title, message: e.message, action: e.action };
    }
    return map;
  }, [errors]);

  const onSubmit = async () => {
    trackStep3SubmitApplication();
    setSubmitting(true);
    setErrors(null);
    try {
      const res = await workerApi.createPolicy(data, dealer.key !== "default" ? dealer.key : undefined);
      const parsed = parseEdithErrors(res);
      if (parsed.isSuccess) {
        setSubmitted({ policyNumber: res.policyNumber });
        toast.success("Application submitted");
      } else {
        setErrors(parsed);
        toast.error("Please review the highlighted items");
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to connect. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="text-2xl font-bold">Application submitted</h2>
        {submitted.policyNumber && (
          <p className="mt-2 text-sm font-medium text-foreground">
            Reference: <span className="font-mono">{submitted.policyNumber}</span>
          </p>
        )}
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          A member of our finance team will be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader step={3} total={3} title="Full application" subtitle="Complete the sections below to submit your application." onBack={back} />

      {errors?.systemMessage && (
        <EdithErrorBanner
          title={errors.systemMessage.title}
          message={errors.systemMessage.message}
          action={errors.systemMessage.action}
        />
      )}

      <div className="sticky top-2 z-10 rounded-2xl border border-border bg-card/90 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs font-medium">
          <span className="text-muted-foreground">Application progress</span>
          <span className="text-primary">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundImage: "var(--gradient-primary)" }} />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["vehicle", "personal"]} className="space-y-3">
        {SECTIONS.map((s) => {
          const done = s.fields.filter((f) => {
            const v = data[f];
            if (typeof v === "boolean") return v;
            return String(v ?? "").trim().length > 0;
          }).length;
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
                {s.fields.map((f) => {
                  const label = LABELS[f] ?? String(f);
                  const dropdown = DROPDOWNS[f];
                  const value = data[f];
                  const err = byLocalField[f as string];

                  if (CHECKBOX_FIELDS.includes(f)) {
                    return (
                      <label key={f} className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/40">
                        <Checkbox
                          checked={Boolean(value)}
                          onCheckedChange={(v) => set(f, Boolean(v) as WizardData[typeof f])}
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    );
                  }

                  return (
                    <div key={f} className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
                      {f === "dealership" ? (
                        <TypingInput phrases={DEALERS} value={String(value ?? "")} onChange={(v) => set(f, v as WizardData[typeof f])} />
                      ) : f === "vehicle" ? (
                        <TypingInput phrases={VEHICLES} value={String(value ?? "")} onChange={(v) => set(f, v as WizardData[typeof f])} />
                      ) : dropdown ? (
                        <Select
                          value={String(value ?? "")}
                          onValueChange={(v) => set(f, v as WizardData[typeof f])}
                        >
                          <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
                          <SelectContent>
                            {dropdown.map((opt) => (
                              <SelectItem key={String(opt)} value={String(opt)}>{String(opt)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : CURRENCY_FIELDS.includes(f) ? (
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatThousands(value as number | string)}
                          onChange={(e) => set(f, parseThousands(e.target.value) as WizardData[typeof f])}
                          placeholder="R 0"
                        />
                      ) : (
                        <Input
                          value={String(value ?? "")}
                          onChange={(e) => set(f, e.target.value as WizardData[typeof f])}
                          placeholder={label}
                        />
                      )}
                      {err && <FieldErrorHint title={err.title} message={err.message} action={err.action} />}
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Button
        size="lg"
        className="w-full rounded-xl py-6 text-base font-semibold shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
        disabled={pct < 100 || submitting || !data.surname.trim()}
        onClick={onSubmit}
      >
        {submitting ? "Submitting…" : pct < 100 ? `Complete all fields (${pct}%)` : "Submit application"}
      </Button>
    </div>
  );
}
