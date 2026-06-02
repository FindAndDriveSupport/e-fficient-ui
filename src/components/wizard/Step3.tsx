import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StepHeader } from "./StepHeader";
import { CurrencyInput } from "./CurrencyInput";
import { AddressLookup } from "./AddressLookup";
import { EdithErrorBanner } from "./EdithErrorBanner";
import { FieldErrorHint } from "./FieldErrorHint";
import { validateSAID } from "./validation";
import type { WizardData } from "./types";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEmbed } from "@/contexts/EmbedContext";
import { useDealer } from "@/contexts/DealerContext";
import { workerApi } from "@/lib/worker";
import { parseEdithErrors, type ParsedEdithResponse } from "@/lib/edithErrors";
import { usePageTimer, trackStep3SubmitApplication } from "@/lib/mixpanel";

const TITLES = ["Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Adv", "Hon", "Rev"];
const ID_TYPES = ["RSA ID", "Passport", "Other ID"] as const;
const MARITAL = ["Single", "Married", "Widowed", "Divorced"];
const MARRIAGE_TYPES = [
  "ANC with Accrual",
  "In Community of Property",
  "ANC without Accrual",
  "Foreign Law",
  "Tribal Law",
  "Muslim and Hindu Rites",
];
const RESIDENTIAL = ["Owner (no bond)", "Owner (bonded)", "Tenant", "Other"];
const EMPLOYMENT = ["Employed", "Self-employed", "Contract", "Pensioner/Retired"] as const;

// Map Edith FieldName → local key for inline errors
const EDITH_MAP: Record<string, string> = {
  LastName: "surname",
  FirstName: "name",
  IDNumber: "idNumber",
  Title: "title",
  EmailAddress: "email",
  MobileNumber: "mobile",
  MaritalStatus: "maritalStatus",
  EmploymentType: "employmentType",
  EmployerName: "employerName",
  SalaryDay: "salaryDay",
  BasicSalary: "confirmGross",
  NettSalary: "confirmNet",
  EFTDepositValue: "confirmDeposit",
};

export function Step3({ data, setData, back }: { data: WizardData; setData: (d: WizardData) => void; back: () => void }) {
  usePageTimer("Step 3 - Full Application");
  const embed = useEmbed();
  const dealer = useDealer();

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ policyNumber?: string } | null>(null);
  const [errors, setErrors] = useState<ParsedEdithResponse | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => setData({ ...data, [k]: v });

  // Pre-fill once
  useState(() => {
    const patch: Partial<WizardData> = {};
    if (!data.vehicleMake && embed.make) patch.vehicleMake = embed.make;
    if (!data.vehicleModel && embed.model) patch.vehicleModel = embed.model;
    if (!data.vehicleMm && embed.mm) patch.vehicleMm = embed.mm;
    if (!data.dealership && dealer.name && dealer.key !== "default") patch.dealership = dealer.name;
    if (!data.confirmGross && data.grossIncome) patch.confirmGross = data.grossIncome;
    if (!data.confirmNet && data.netIncome) patch.confirmNet = data.netIncome;
    if (data.hasDeposit && !data.confirmDeposit && data.depositAmount) patch.confirmDeposit = data.depositAmount;
    if (Object.keys(patch).length) setData({ ...data, ...patch });
    return null;
  });

  const errorByField = (() => {
    if (!errors) return {} as Record<string, { title: string; message: string; action: string }>;
    const map: Record<string, { title: string; message: string; action: string }> = {};
    for (const e of errors.fieldErrors) {
      if (!e.field) continue;
      const local = EDITH_MAP[e.field] ?? e.field;
      map[local] = { title: e.title, message: e.message, action: e.action };
    }
    return map;
  })();

  const onSubmit = async () => {
    // Hard validations
    if (!data.surname.trim()) {
      toast.error("Last name is required.");
      return;
    }
    if (data.idType === "RSA ID" && data.idNumber) {
      const err = validateSAID(data.idNumber);
      setIdError(err);
      if (err) return;
    }
    if (!data.postalLocation) {
      setAddressError("Please select a suburb from the list.");
      toast.error("Address is required.");
      return;
    }
    setAddressError(null);

    trackStep3SubmitApplication();
    setSubmitting(true);
    setErrors(null);
    try {
      const payload = {
        title: data.title?.toUpperCase(),
        firstName: data.name,
        lastName: data.surname,
        idType: data.idType.toUpperCase(),
        idNumber: data.idNumber,
        mobileNumber: data.mobile.replace(/\D/g, ""),
        emailAddress: data.email,
        maritalStatus: data.maritalStatus?.toUpperCase(),
        marriageType: data.maritalStatus === "Married" ? data.marriageType : undefined,
        address1: data.address1,
        postalLocationId: data.postalLocation?.id,
        residentialStatus: mapResidential(data.residentialStatus),
        physicalAddressDate: data.physicalAddressDate ? formatEdithDate(data.physicalAddressDate) : undefined,
        nextOfKinFirstName: data.nokFirst,
        nextOfKinLastName: data.nokLast,
        nextOfKinMobile: data.nokContact.replace(/\D/g, ""),
        employmentType: mapEmployment(data.employmentType),
        employerName: data.employmentType === "Pensioner/Retired" ? undefined : data.employerName,
        salaryDay: data.employmentType === "Pensioner/Retired" ? undefined : Number(data.salaryDay) || undefined,
        basicSalary: Number(data.confirmGross) || undefined,
        nettSalary: Number(data.confirmNet) || undefined,
        depositAmount: Number(data.confirmDeposit) > 0 ? Number(data.confirmDeposit) : undefined,
        dataAttestation: data.dataAttestation,
        financialAccessConsent: data.financialAccessConsent,
        marketingConsent: data.marketingConsent,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        vehicleMm: data.vehicleMm,
        estimatedApprovalAmount: data.estimatedApprovalAmount,
        applicantId: data.applicantId,
      };

      const res = await workerApi.createPolicy(payload as Partial<WizardData>, dealer.key !== "default" ? dealer.key : embed.dealer);
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
      toast.error("Unable to connect. Please try again.");
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
          <p className="mt-2 text-sm font-medium">
            Reference: <span className="font-mono">{submitted.policyNumber}</span>
          </p>
        )}
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          A member of our finance team will be in touch shortly.
        </p>
      </div>
    );
  }

  const isMarried = data.maritalStatus === "Married";
  const isRetired = data.employmentType === "Pensioner/Retired";

  // Section completion progress
  const sections = [
    !!(data.dealership || data.vehicleMake || data.vehicleModel),
    !!(data.name && data.surname && data.idNumber && data.mobile),
    !!(data.address1 && data.postalLocation),
    !!(data.nokFirst && data.nokLast && data.nokContact),
    !!(data.employmentType && (isRetired || (data.employerName && data.salaryDay))),
    !!(data.confirmGross && data.confirmNet),
    !!(data.dataAttestation && data.financialAccessConsent),
  ];
  const completed = sections.filter(Boolean).length;
  const pct = Math.round((completed / sections.length) * 100);

  return (
    <div className="space-y-6">
      <StepHeader step={3} total={3} title="Full application" subtitle="Complete the sections below to submit." onBack={back} />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>Application progress</span>
          <span>{completed} of {sections.length} sections</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundImage: "var(--gradient-primary)" }}
          />
        </div>
      </div>

      {errors?.systemMessage && (
        <EdithErrorBanner
          title={errors.systemMessage.title}
          message={errors.systemMessage.message}
          action={errors.systemMessage.action}
        />
      )}

      <Accordion type="multiple" defaultValue={["vehicle", "personal", "address"]} className="space-y-3">
        {/* Vehicle & Dealership */}
        <Section id="vehicle" title="Vehicle & dealership">
          <FieldRow label="Dealership">
            <Input
              value={data.dealership ?? ""}
              onChange={(e) => set("dealership", e.target.value)}
              placeholder="Dealership name"
            />
          </FieldRow>
          <Grid2>
            <FieldRow label="Vehicle make">
              <Input
                value={data.vehicleMake ?? ""}
                onChange={(e) => set("vehicleMake", e.target.value)}
                placeholder="e.g. Toyota"
              />
            </FieldRow>
            <FieldRow label="Vehicle model">
              <Input
                value={data.vehicleModel ?? ""}
                onChange={(e) => set("vehicleModel", e.target.value)}
                placeholder="e.g. Corolla"
              />
            </FieldRow>
          </Grid2>
          <FieldRow label="M&M code (optional)">
            <Input
              value={data.vehicleMm ?? ""}
              onChange={(e) => set("vehicleMm", e.target.value)}
              placeholder="M&M code"
            />
          </FieldRow>
        </Section>

        {/* Personal */}
        <Section id="personal" title="Personal details">
          <FieldRow label="Title">
            <SelectInput value={data.title} onChange={(v) => set("title", v)} options={TITLES} />
          </FieldRow>
          <Grid2>
            <FieldRow label="First name">
              <Input value={data.name} onChange={(e) => set("name", e.target.value)} />
              {errorByField.name && <FieldErrorHint {...errorByField.name} />}
            </FieldRow>
            <FieldRow label={<><span>Last name</span> <span className="text-destructive">*</span></>}>
              <Input value={data.surname} onChange={(e) => set("surname", e.target.value)} aria-invalid={!data.surname} />
              {errorByField.surname && <FieldErrorHint {...errorByField.surname} />}
            </FieldRow>
          </Grid2>
          <Grid2>
            <FieldRow label="ID / Passport type">
              <SelectInput value={data.idType} onChange={(v) => set("idType", v as WizardData["idType"])} options={ID_TYPES as unknown as string[]} />
            </FieldRow>
            <FieldRow label="ID / Passport number">
              <Input
                value={data.idNumber}
                maxLength={data.idType === "RSA ID" ? 13 : 30}
                inputMode={data.idType === "RSA ID" ? "numeric" : "text"}
                onChange={(e) => {
                  const v = data.idType === "RSA ID" ? e.target.value.replace(/\D/g, "") : e.target.value;
                  set("idNumber", v);
                  if (data.idType === "RSA ID") setIdError(validateSAID(v));
                }}
                onBlur={() => data.idType === "RSA ID" && setIdError(validateSAID(data.idNumber))}
              />
              {idError && data.idType === "RSA ID" && (
                <p className="mt-1 text-xs text-destructive">⚠ {idError}</p>
              )}
              {errorByField.idNumber && <FieldErrorHint {...errorByField.idNumber} />}
            </FieldRow>
          </Grid2>
          <Grid2>
            <FieldRow label="Mobile number">
              <Input
                value={data.mobile}
                inputMode="numeric"
                maxLength={10}
                onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              />
            </FieldRow>
            <FieldRow label="Email address">
              <Input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} />
            </FieldRow>
          </Grid2>
          <FieldRow label="Marital status">
            <SelectInput value={data.maritalStatus} onChange={(v) => set("maritalStatus", v)} options={MARITAL} />
          </FieldRow>
          {isMarried && (
            <FieldRow label="Marriage contract">
              <SelectInput value={data.marriageType} onChange={(v) => set("marriageType", v)} options={MARRIAGE_TYPES} />
            </FieldRow>
          )}
        </Section>

        {/* Address */}
        <Section id="address" title="Residential address">
          <FieldRow label="Street address">
            <Input maxLength={50} value={data.address1} onChange={(e) => set("address1", e.target.value)} />
          </FieldRow>
          <AddressLookup
            value={data.postalLocation}
            onSelect={(loc) => { set("postalLocation", loc); setAddressError(null); }}
            error={addressError}
          />
          <Grid2>
            <FieldRow label="Residential status">
              <SelectInput value={data.residentialStatus} onChange={(v) => set("residentialStatus", v)} options={RESIDENTIAL} />
            </FieldRow>
            <FieldRow label="Date moved in">
              <Input type="date" value={data.physicalAddressDate} onChange={(e) => set("physicalAddressDate", e.target.value)} />
            </FieldRow>
          </Grid2>
        </Section>

        {/* NOK */}
        <Section id="nok" title="Next of kin">
          <Grid2>
            <FieldRow label="First name">
              <Input value={data.nokFirst} onChange={(e) => set("nokFirst", e.target.value)} />
            </FieldRow>
            <FieldRow label="Last name">
              <Input value={data.nokLast} onChange={(e) => set("nokLast", e.target.value)} />
            </FieldRow>
          </Grid2>
          <FieldRow label="Contact number">
            <Input
              value={data.nokContact}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => set("nokContact", e.target.value.replace(/\D/g, ""))}
            />
          </FieldRow>
        </Section>

        {/* Employment */}
        <Section id="employment" title="Employment">
          <FieldRow label="Employment status">
            <SelectInput
              value={data.employmentType}
              onChange={(v) => set("employmentType", v as WizardData["employmentType"])}
              options={EMPLOYMENT as unknown as string[]}
            />
          </FieldRow>
          {!isRetired && (
            <Grid2>
              <FieldRow label="Employer name">
                <Input maxLength={50} value={data.employerName} onChange={(e) => set("employerName", e.target.value)} />
                {errorByField.employerName && <FieldErrorHint {...errorByField.employerName} />}
              </FieldRow>
              <FieldRow label="Salary day (1–31)">
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={data.salaryDay}
                  onChange={(e) => set("salaryDay", e.target.value)}
                />
              </FieldRow>
            </Grid2>
          )}
        </Section>

        {/* Financial */}
        <Section id="financial" title="Financial details">
          <CurrencyInput
            label="Gross monthly salary"
            value={data.confirmGross}
            onChange={(v) => set("confirmGross", v)}
          />
          {errorByField.confirmGross && <FieldErrorHint {...errorByField.confirmGross} />}
          <CurrencyInput
            label="Net Salary / Take-home Salary"
            value={data.confirmNet}
            onChange={(v) => set("confirmNet", v)}
          />
          {errorByField.confirmNet && <FieldErrorHint {...errorByField.confirmNet} />}
          {data.hasDeposit && (
            <CurrencyInput
              label="Deposit amount"
              value={data.confirmDeposit}
              onChange={(v) => set("confirmDeposit", v)}
            />
          )}
        </Section>

        {/* Consents */}
        <Section id="consents" title="Consents">
          <CheckboxRow
            checked={data.dataAttestation}
            onChange={(v) => set("dataAttestation", v)}
            label="I consent to Standard Bank collecting and processing my personal information."
          />
          <CheckboxRow
            checked={data.financialAccessConsent}
            onChange={(v) => set("financialAccessConsent", v)}
            label="I consent to banks accessing my bank statements and payslip."
          />
          <CheckboxRow
            checked={data.marketingConsent}
            onChange={(v) => set("marketingConsent", v)}
            label="I agree to receive marketing communications (calls, email, SMS)."
          />
        </Section>
      </Accordion>

      <Button
        size="lg"
        className="w-full rounded-xl py-6 text-base font-semibold shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
        disabled={submitting || !data.surname.trim()}
        onClick={onSubmit}
      >
        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit Application"}
      </Button>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <AccordionTrigger className="px-5 py-4 hover:no-underline">
        <span className="text-left text-sm font-semibold">{title}</span>
      </AccordionTrigger>
      <AccordionContent className="space-y-3 px-5 pb-5">{children}</AccordionContent>
    </AccordionItem>
  );
}

function FieldRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function CheckboxRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/40">
      <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="text-xs leading-snug">{label}</span>
    </label>
  );
}

function mapResidential(v: string): string | undefined {
  switch (v) {
    case "Owner (no bond)": return "OWNER BOND FREE";
    case "Owner (bonded)": return "OWNER BONDED";
    case "Tenant": return "TENANT";
    case "Other": return "BOARDER";
    default: return undefined;
  }
}

function mapEmployment(v: WizardData["employmentType"]): string | undefined {
  switch (v) {
    case "Employed":
    case "Contract":
      return "EMPLOYED";
    case "Self-employed":
      return "SELF-EMPLOYED";
    case "Pensioner/Retired":
      return "RETIRED";
    default:
      return undefined;
  }
}

function formatEdithDate(iso: string): string {
  // yyyy-mm-dd → dd-MMM-yyyy
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${months[d.getMonth()]}-${d.getFullYear()}`;
}
