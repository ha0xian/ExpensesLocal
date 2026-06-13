"""Pydantic models matching the existing React state shape via camelCase aliases."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Entity models
# ---------------------------------------------------------------------------

class Category(BaseModel):
    id: str
    name: str
    group: str = ""
    defaultBudget: float = Field(0, alias="defaultBudget")
    taxBusinessReady: str = Field("No", alias="taxBusinessReady")
    notes: str = ""

    class Config:
        populate_by_name = True


class Subcategory(BaseModel):
    id: str
    category: str
    name: str
    envelopeGroup: str = Field("", alias="envelopeGroup")
    envelopeStyle: str = Field("Variable", alias="envelopeStyle")
    defaultMonthlyTarget: float = Field(0, alias="defaultMonthlyTarget")
    notes: str = ""

    class Config:
        populate_by_name = True


class Account(BaseModel):
    id: str
    name: str
    type: str = "Bank"
    openingBalance: float = Field(0, alias="openingBalance")
    notes: str = ""

    class Config:
        populate_by_name = True


class Transaction(BaseModel):
    id: str
    date: str = ""
    type: str = "Expense"
    category: str = ""
    subcategory: str = ""
    account: str = ""
    merchantPayee: str = Field("", alias="merchantPayee")
    description: str = ""
    amount: float = 0
    currency: str = "USD"
    essential: bool = False
    month: str = ""
    reimbursable: bool = False
    notes: str = ""
    sourceRuleId: str = Field("", alias="sourceRuleId")

    class Config:
        populate_by_name = True


class AutomaticTransactionRule(BaseModel):
    id: str
    enabled: bool = True
    startDate: str = Field("", alias="startDate")
    endDate: str = Field("", alias="endDate")
    frequency: str = "Monthly"
    customInterval: int = Field(1, alias="customInterval")
    customUnit: str = Field("Months", alias="customUnit")
    type: str = "Expense"
    category: str = ""
    subcategory: str = ""
    account: str = ""
    merchantPayee: str = Field("", alias="merchantPayee")
    description: str = ""
    amount: float = 0
    currency: str = "USD"
    essential: bool = False
    reimbursable: bool = False
    notes: str = ""

    class Config:
        populate_by_name = True


class MonthlySetup(BaseModel):
    id: str
    month: str = ""
    category: str = ""
    subcategory: str = ""
    monthlyTarget: float = Field(0, alias="monthlyTarget")
    startingBalance: float = Field(0, alias="startingBalance")
    rollover: bool = False

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Aggregate state
# ---------------------------------------------------------------------------

class ExpenseState(BaseModel):
    selectedMonth: str = Field("2026-01", alias="selectedMonth")
    currency: str = "USD"
    lastAccessedAt: str = Field("", alias="lastAccessedAt")
    lastAutomationRunAt: str = Field("", alias="lastAutomationRunAt")
    categories: list[Category] = []
    subcategories: list[Subcategory] = []
    accounts: list[Account] = []
    transactions: list[Transaction] = []
    automaticTransactions: list[AutomaticTransactionRule] = []
    monthlySetup: list[MonthlySetup] = []

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Derived data
# ---------------------------------------------------------------------------

class WarningItem(BaseModel):
    severity: str  # "error" | "warning"
    code: str
    message: str
    entityId: str | None = Field(None, alias="entityId")

    class Config:
        populate_by_name = True


class DerivedState(BaseModel):
    summary: dict
    categoryRows: list[dict]
    availableToAssign: float
    envelopeRows: list[dict]
    accountBalances: list[dict]
    warnings: list[WarningItem]


# ---------------------------------------------------------------------------
# Automation status
# ---------------------------------------------------------------------------

class AutomationStatus(BaseModel):
    state: ExpenseState | None = None
    changed: bool = False
    previousAccessDate: str = ""
    currentAccessDate: str = ""
    actions: list[str] = []


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

class AppConfig(BaseModel):
    months: list[str]
    recurrencePresets: list[str]
    recurrenceUnits: list[str]


# ---------------------------------------------------------------------------
# Top-level snapshot returned by GET /api/state and mutations
# ---------------------------------------------------------------------------

class AppSnapshot(BaseModel):
    state: ExpenseState
    derived: DerivedState
    automationStatus: AutomationStatus
    config: AppConfig
    dataFileName: str


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class UpdateFieldRequest(BaseModel):
    field: str
    value: Any


class CreateTransactionRequest(BaseModel):
    date: str
    type: str = "Expense"
    category: str = ""
    subcategory: str = ""
    account: str = ""
    amount: float = 0
    merchantPayee: str = Field("", alias="merchantPayee")
    description: str = ""
    essential: bool = False
    reimbursable: bool = False
    notes: str = ""
    makeAutomatic: bool = False
    endDate: str = Field("", alias="endDate")
    frequency: str = "Monthly"
    customInterval: int = Field(1, alias="customInterval")
    customUnit: str = Field("Months", alias="customUnit")

    class Config:
        populate_by_name = True


class CreateAutomaticTransactionRequest(BaseModel):
    enabled: bool = True
    startDate: str
    endDate: str = Field("", alias="endDate")
    frequency: str = "Monthly"
    customInterval: int = Field(1, alias="customInterval")
    customUnit: str = Field("Months", alias="customUnit")
    type: str = "Expense"
    category: str = ""
    subcategory: str = ""
    account: str = ""
    amount: float = 0
    merchantPayee: str = Field("", alias="merchantPayee")
    description: str = ""
    essential: bool = False
    reimbursable: bool = False
    notes: str = ""

    class Config:
        populate_by_name = True


class CreateCategoryRequest(BaseModel):
    name: str
    group: str = ""
    defaultBudget: float = Field(0, alias="defaultBudget")
    taxBusinessReady: str = Field("No", alias="taxBusinessReady")
    notes: str = ""

    class Config:
        populate_by_name = True


class CreateSubcategoryRequest(BaseModel):
    category: str
    name: str
    envelopeGroup: str = Field("", alias="envelopeGroup")
    envelopeStyle: str = Field("Variable", alias="envelopeStyle")
    defaultMonthlyTarget: float = Field(0, alias="defaultMonthlyTarget")
    notes: str = ""

    class Config:
        populate_by_name = True


class CreateAccountRequest(BaseModel):
    name: str
    type: str = "Bank"
    openingBalance: float = Field(0, alias="openingBalance")
    notes: str = ""

    class Config:
        populate_by_name = True


class BankImportPreviewRequest(BaseModel):
    csvText: str
    mapping: dict[str, str] | None = None

    class Config:
        populate_by_name = True


class BankImportApplyRequest(BaseModel):
    rows: list[dict[str, str]]
    mapping: dict[str, str]


class CsvImportPayload(BaseModel):
    csvText: str = Field("", alias="csvText")

    class Config:
        populate_by_name = True


class MonthUpdateRequest(BaseModel):
    month: str
