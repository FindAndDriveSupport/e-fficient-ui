import type { WizardData } from "./types";

/**
 * Maps WizardData → Edith CreatePolicy payload.
 * Shared between Step3 (Manual) and Step3Fast.
 */
// Minimum estimatedApprovalAmount (RSA ID applicants only) required before
// it's trusted as the retail price. Below this, falls back to preQualTotal
// instead — same as the Passport/Other ID path.
const RETAIL_PRICE_THRESHOLD_BIKE = 15000;
const RETAIL_PRICE_THRESHOLD_VEHICLE = 60000;

// Retail price logic (confirmed by FindAndDrive):
//   - Passport (or any non-RSA-ID type): use preQualTotal
//   - RSA ID: use estimatedApprovalAmount, but ONLY if it exceeds the
//     dealer-type threshold (R15k bike / R60k vehicle) — otherwise fall
//     back to preQualTotal, same as the non-RSA-ID path.
function calculateRetailPrice(data: WizardData, isBike: boolean): number | undefined {
  const preQualTotal = Number(data.preQualTotal) || undefined;

  if (data.idType !== "RSA ID") {
    return preQualTotal;
  }

  const threshold = isBike ? RETAIL_PRICE_THRESHOLD_BIKE : RETAIL_PRICE_THRESHOLD_VEHICLE;
  const estimatedApproval = Number(data.estimatedApprovalAmount) || 0;

  return estimatedApproval > threshold ? estimatedApproval : preQualTotal;
}

export function buildEdithPayload(data: WizardData, selectedBranchCode?: string, opts: { isBike?: boolean } = {}) {
  const isMarried = data.maritalStatus === "Married";
  const retailPrice = calculateRetailPrice(data, !!opts.isBike);
  return {
    retailPrice,
    title: data.title?.toUpperCase(),
    firstName: data.name,
    lastName: data.surname,
    idType: data.idType.toUpperCase(),
    idNumber: data.idNumber,
    mobileNumber: data.mobile.replace(/\D/g, ""),
    emailAddress: data.email,
    educationLevel: data.educationLevel || undefined,
    maritalStatus: data.maritalStatus?.toUpperCase(),
    marriageType: isMarried ? data.marriageType || undefined : undefined,
    marriageDate: isMarried && data.marriageDate ? formatEdithDate(data.marriageDate) : undefined,
    spouseFirstName: isMarried ? data.spouseFirstName || undefined : undefined,
    spouseLastName: isMarried ? data.spouseLastName || undefined : undefined,
    spouseIdNumber: isMarried ? data.spouseIdNumber || undefined : undefined,
    spouseIdType: isMarried ? (data.spouseIdType || "RSA ID") : undefined,
    address1: data.address1,
    postalLocationId: data.postalLocation?.id,
    suburb: data.postalLocation?.suburb,
    city: data.postalLocation?.city,
    postCode: data.postalLocation?.postal_code,
    residentialStatus: mapResidential(data.residentialStatus),
    physicalAddressDate: data.physicalAddressDate ? formatEdithDate(data.physicalAddressDate) : undefined,
    nextOfKinFirstName: data.nokFirst,
    nextOfKinLastName: data.nokLast,
    nextOfKinMobile: data.nokContact.replace(/\D/g, ""),
    employmentType: mapEmployment(data.employmentType),
    employerName: data.employmentType === "Pensioner/Retired" ? undefined : data.employerName,
    salaryDay: data.employmentType === "Pensioner/Retired" ? undefined : Number(data.salaryDay) || undefined,
    occupation: data.occupation || undefined,
    occupationLevel: data.occupationLevel || undefined,
    industry: data.industry || undefined,
    gender: data.idType === "RSA ID" && data.idNumber?.length === 13
      ? (parseInt(data.idNumber.substring(6, 10)) >= 5000 ? "MALE" : "FEMALE")
      : undefined,
    bureauExpenses: data.bureauExpenses || undefined,
    currentEmploymentStartDate: data.currentEmploymentStartDate
      ? formatEdithDate(data.currentEmploymentStartDate)
      : undefined,
    basicSalary: Number(data.confirmGross) || undefined,
    nettSalary: Number(data.confirmNet) || undefined,
    depositAmount: Number(data.confirmDeposit) > 0 ? Number(data.confirmDeposit) : undefined,
    dataAttestation: data.dataAttestation,
    financialAccessConsent: data.financialAccessConsent,
    marketingConsent: data.marketingConsent,
    vehicleMake: data.vehicleMake,
    vehicleModel: data.vehicleModel,
    vehicleMm: data.vehicleMm,
    estimatedApprovalAmount: data.estimatedApprovalAmount ??
      (data.idType !== "RSA ID" ? Number(data.preQualTotal) || undefined : undefined),
    preQualTotal: data.preQualTotal,
    applicantId: data.applicantId,
    bankBranchCode: data.bankBranchCode || undefined,
    bankName: data.bankName || undefined,
    accountType: data.accountType || undefined,
    bankAccountNumber: data.bankAccountNumber || undefined,
  };
}

export function mapResidential(v: string): string | undefined {
  switch (v) {
    case "Owner (no bond)": return "OWNER BOND FREE";
    case "Owner (bonded)": return "OWNER BONDED";
    case "Tenant": return "TENANT";
    case "Other": return "BOARDER";
    default: return undefined;
  }
}

export function mapEmployment(v: WizardData["employmentType"]): string | undefined {
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

export function formatEdithDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}-${months[d.getMonth()]}-${d.getFullYear()}`;
}
