export interface WizardData {
  // Step 1
  name: string;
  surname: string;
  netIncome: number | "";
  mobile: string;
  hasDeposit: boolean;
  depositAmount: number | "";
  hasFinance: boolean;
  financeAmount: number | "";
  // Step 2
  grossIncome: number | "";
  hasSAID: boolean;
  idNumber: string;
  livingExpenses: number | "";
  // Consents
  consents1: boolean[];
  consents2: boolean[];

  // Step 3 — Vehicle / dealership
  dealership: string;
  vehicle: string;
  vehicleCode: string;

  // Step 3 — Personal
  title: string;
  gender: string;
  birthDate: string;
  email: string;
  educationLevel: string;
  maritalStatus: string;
  marriageType: string;

  // Step 3 — Residential address
  street: string;
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  residentialStatus: string;
  yearsAtAddress: string;

  // Step 3 — Next of kin
  nokFirst: string;
  nokLast: string;
  nokRelationship: string;
  nokContact: string;

  // Step 3 — Employment
  employmentType: string;
  employerName: string;
  industry: string;
  occupation: string;
  occupationLevel: string;
  employmentDate: string;
  empStreet: string;
  empSuburb: string;
  empCity: string;
  empProvince: string;
  empPostal: string;
  empTelCode: string;
  empTelNumber: string;
  salaryDay: string;

  // Step 3 — Financial confirmation
  confirmGross: number | "";
  confirmNet: number | "";
  financeTerm: string;
  paymentDay: string;

  // Step 3 — Marketing consents
  marketingTelesales: boolean;
  marketingEmail: boolean;
  marketingSMS: boolean;
  idxConsent: boolean;
  ivxConsent: boolean;

  [k: string]: unknown;
}

export const initialData: WizardData = {
  name: "",
  surname: "",
  netIncome: "",
  mobile: "",
  hasDeposit: false,
  depositAmount: "",
  hasFinance: false,
  financeAmount: "",
  grossIncome: "",
  hasSAID: true,
  idNumber: "",
  livingExpenses: "",
  consents1: [false, false, false, false],
  consents2: [false, false, false, false, false, false],

  dealership: "",
  vehicle: "",
  vehicleCode: "",

  title: "",
  gender: "",
  birthDate: "",
  email: "",
  educationLevel: "",
  maritalStatus: "",
  marriageType: "",

  street: "",
  suburb: "",
  city: "",
  province: "",
  postalCode: "",
  residentialStatus: "",
  yearsAtAddress: "",

  nokFirst: "",
  nokLast: "",
  nokRelationship: "",
  nokContact: "",

  employmentType: "",
  employerName: "",
  industry: "",
  occupation: "",
  occupationLevel: "",
  employmentDate: "",
  empStreet: "",
  empSuburb: "",
  empCity: "",
  empProvince: "",
  empPostal: "",
  empTelCode: "",
  empTelNumber: "",
  salaryDay: "",

  confirmGross: "",
  confirmNet: "",
  financeTerm: "",
  paymentDay: "",

  marketingTelesales: false,
  marketingEmail: false,
  marketingSMS: false,
  idxConsent: false,
  ivxConsent: false,
};
