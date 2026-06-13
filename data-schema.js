export const APP_SCHEMA_VERSION = "1";

export const MONTHS_2026 = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12"
];

export const CSV_COLUMNS = [
  "record_type",
  "id",
  "last_accessed_at",
  "last_automation_run_at",
  "date",
  "month",
  "type",
  "category",
  "subcategory",
  "account",
  "merchant_payee",
  "description",
  "amount",
  "currency",
  "essential",
  "reimbursable",
  "notes",
  "group",
  "default_budget",
  "tax_business_ready",
  "envelope_group",
  "envelope_style",
  "default_monthly_target",
  "monthly_target",
  "starting_balance",
  "rollover",
  "opening_balance",
  "account_type"
];

export const DEFAULT_CATEGORIES = [
  { id: "cat-housing", name: "Housing", group: "Needs", defaultBudget: 1800, taxBusinessReady: "No", notes: "Rent, mortgage, utilities, and household basics." },
  { id: "cat-groceries", name: "Groceries", group: "Needs", defaultBudget: 650, taxBusinessReady: "No", notes: "Food and household supplies." },
  { id: "cat-transportation", name: "Transportation", group: "Needs", defaultBudget: 420, taxBusinessReady: "Maybe", notes: "Fuel, transit, parking, maintenance." },
  { id: "cat-health", name: "Health", group: "Needs", defaultBudget: 260, taxBusinessReady: "No", notes: "Medical, pharmacy, wellness." },
  { id: "cat-dining", name: "Dining", group: "Wants", defaultBudget: 240, taxBusinessReady: "Maybe", notes: "Restaurants, coffee, delivery." },
  { id: "cat-shopping", name: "Shopping", group: "Wants", defaultBudget: 250, taxBusinessReady: "No", notes: "Clothing, home goods, discretionary purchases." },
  { id: "cat-entertainment", name: "Entertainment", group: "Wants", defaultBudget: 160, taxBusinessReady: "No", notes: "Streaming, events, hobbies." },
  { id: "cat-savings", name: "Savings", group: "Savings", defaultBudget: 900, taxBusinessReady: "No", notes: "Emergency fund and future goals." },
  { id: "cat-business", name: "Business", group: "Business", defaultBudget: 350, taxBusinessReady: "Yes", notes: "Business software, supplies, and services." },
  { id: "cat-income", name: "Income", group: "Other", defaultBudget: 0, taxBusinessReady: "No", notes: "Income tracking category." }
];

export const DEFAULT_SUBCATEGORIES = [
  { id: "sub-rent", category: "Housing", name: "Rent", envelopeGroup: "Fixed Bills", envelopeStyle: "Monthly bill", defaultMonthlyTarget: 1550, notes: "" },
  { id: "sub-utilities", category: "Housing", name: "Utilities", envelopeGroup: "Fixed Bills", envelopeStyle: "Variable", defaultMonthlyTarget: 250, notes: "" },
  { id: "sub-food", category: "Groceries", name: "Food", envelopeGroup: "Core Needs", envelopeStyle: "Variable", defaultMonthlyTarget: 520, notes: "" },
  { id: "sub-household", category: "Groceries", name: "Household Supplies", envelopeGroup: "Core Needs", envelopeStyle: "Variable", defaultMonthlyTarget: 130, notes: "" },
  { id: "sub-fuel", category: "Transportation", name: "Fuel", envelopeGroup: "Core Needs", envelopeStyle: "Variable", defaultMonthlyTarget: 180, notes: "" },
  { id: "sub-maintenance", category: "Transportation", name: "Maintenance", envelopeGroup: "Sinking Funds", envelopeStyle: "Sinking fund", defaultMonthlyTarget: 160, notes: "" },
  { id: "sub-medical", category: "Health", name: "Medical", envelopeGroup: "Core Needs", envelopeStyle: "Sinking fund", defaultMonthlyTarget: 180, notes: "" },
  { id: "sub-restaurants", category: "Dining", name: "Restaurants", envelopeGroup: "Lifestyle", envelopeStyle: "Variable", defaultMonthlyTarget: 180, notes: "" },
  { id: "sub-coffee", category: "Dining", name: "Coffee", envelopeGroup: "Lifestyle", envelopeStyle: "Variable", defaultMonthlyTarget: 60, notes: "" },
  { id: "sub-clothing", category: "Shopping", name: "Clothing", envelopeGroup: "Lifestyle", envelopeStyle: "Sinking fund", defaultMonthlyTarget: 120, notes: "" },
  { id: "sub-streaming", category: "Entertainment", name: "Streaming", envelopeGroup: "Lifestyle", envelopeStyle: "Monthly bill", defaultMonthlyTarget: 50, notes: "" },
  { id: "sub-emergency", category: "Savings", name: "Emergency Fund", envelopeGroup: "Savings Goals", envelopeStyle: "Savings goal", defaultMonthlyTarget: 500, notes: "" },
  { id: "sub-vacation", category: "Savings", name: "Vacation", envelopeGroup: "Savings Goals", envelopeStyle: "Sinking fund", defaultMonthlyTarget: 250, notes: "" },
  { id: "sub-software", category: "Business", name: "Software", envelopeGroup: "Business", envelopeStyle: "Monthly bill", defaultMonthlyTarget: 140, notes: "" },
  { id: "sub-client", category: "Income", name: "Client Payment", envelopeGroup: "Income", envelopeStyle: "Temporary", defaultMonthlyTarget: 0, notes: "" },
  { id: "sub-paycheck", category: "Income", name: "Paycheck", envelopeGroup: "Income", envelopeStyle: "Temporary", defaultMonthlyTarget: 0, notes: "" }
];

export const DEFAULT_ACCOUNTS = [
  { id: "acct-checking", name: "Checking", type: "Bank", openingBalance: 2450, notes: "Primary bank account." },
  { id: "acct-credit", name: "Credit Card", type: "Credit Card", openingBalance: -320, notes: "Main rewards card." },
  { id: "acct-cash", name: "Cash", type: "Cash", openingBalance: 120, notes: "Wallet cash." }
];

export const DEFAULT_TRANSACTIONS = [
  { id: "txn-001", date: "2026-01-02", type: "Income", category: "Income", subcategory: "Paycheck", account: "Checking", merchantPayee: "Employer", description: "January paycheck", amount: 4200, currency: "USD", essential: false, month: "2026-01", reimbursable: false, notes: "" },
  { id: "txn-002", date: "2026-01-03", type: "Expense", category: "Housing", subcategory: "Rent", account: "Checking", merchantPayee: "Property Manager", description: "January rent", amount: 1550, currency: "USD", essential: true, month: "2026-01", reimbursable: false, notes: "" },
  { id: "txn-003", date: "2026-01-05", type: "Expense", category: "Groceries", subcategory: "Food", account: "Credit Card", merchantPayee: "Green Market", description: "Weekly groceries", amount: 145.32, currency: "USD", essential: true, month: "2026-01", reimbursable: false, notes: "" },
  { id: "txn-004", date: "2026-01-08", type: "Expense", category: "Dining", subcategory: "Coffee", account: "Credit Card", merchantPayee: "Corner Cafe", description: "Coffee meetings", amount: 18.75, currency: "USD", essential: false, month: "2026-01", reimbursable: false, notes: "" },
  { id: "txn-005", date: "2026-01-12", type: "Expense", category: "Business", subcategory: "Software", account: "Credit Card", merchantPayee: "Design Tools Co.", description: "Monthly software", amount: 39, currency: "USD", essential: false, month: "2026-01", reimbursable: false, notes: "Business-ready." },
  { id: "txn-006", date: "2026-02-01", type: "Income", category: "Income", subcategory: "Paycheck", account: "Checking", merchantPayee: "Employer", description: "February paycheck", amount: 4200, currency: "USD", essential: false, month: "2026-02", reimbursable: false, notes: "" },
  { id: "txn-007", date: "2026-02-04", type: "Expense", category: "Groceries", subcategory: "Household Supplies", account: "Credit Card", merchantPayee: "Big Box Store", description: "Cleaning supplies", amount: 67.9, currency: "USD", essential: true, month: "2026-02", reimbursable: false, notes: "" }
];

export const DEFAULT_MONTHLY_SETUP = MONTHS_2026.flatMap((month) =>
  DEFAULT_SUBCATEGORIES
    .filter((subcategory) => subcategory.defaultMonthlyTarget > 0)
    .map((subcategory) => ({
      id: `setup-${month}-${subcategory.id}`,
      month,
      category: subcategory.category,
      subcategory: subcategory.name,
      monthlyTarget: subcategory.defaultMonthlyTarget,
      startingBalance: month === "2026-01" && ["Emergency Fund", "Vacation", "Maintenance"].includes(subcategory.name) ? 100 : 0,
      rollover: ["Sinking fund", "Savings goal"].includes(subcategory.envelopeStyle)
    }))
);

export function createInitialState() {
  return {
    selectedMonth: "2026-01",
    currency: "USD",
    lastAccessedAt: "",
    lastAutomationRunAt: "",
    categories: structuredClone(DEFAULT_CATEGORIES),
    subcategories: structuredClone(DEFAULT_SUBCATEGORIES),
    accounts: structuredClone(DEFAULT_ACCOUNTS),
    transactions: structuredClone(DEFAULT_TRANSACTIONS),
    monthlySetup: structuredClone(DEFAULT_MONTHLY_SETUP)
  };
}
