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
  // Step 3
  dealership: string;
  vehicle: string;
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
};
