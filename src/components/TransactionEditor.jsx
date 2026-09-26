import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { subcategoriesFor } from "@/lib/app-helpers.js";
import { SaveStatus } from "./SaveStatus.jsx";

const TYPES = ["Expense", "Income", "Transfer"];
function todayLocal() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }
function initialForm(transaction, state, initialType) {
  const category = transaction?.category || (initialType === "Income" ? state.categories.find((item) => item.name === "Income")?.name : "") || state.categories[0]?.name || "";
  return {
    date: transaction?.date || todayLocal(), type: transaction?.type || initialType || "Expense", category,
    subcategory: transaction?.subcategory || subcategoriesFor(state, category)[0]?.name || "", amount: transaction?.amount ?? "",
    account: transaction?.account || state.accounts[0]?.name || "", merchantPayee: transaction?.merchantPayee || "",
    description: transaction?.description || "", notes: transaction?.notes || "", essential: Boolean(transaction?.essential),
    reimbursable: Boolean(transaction?.reimbursable), makeAutomatic: false, endDate: "", frequency: "Monthly", customInterval: "1", customUnit: "Months",
  };
}

function Choice({ id, label, value, onChange, options, disabled, error }) {
  return <Field data-invalid={error || undefined}><FieldLabel htmlFor={id}>{label}</FieldLabel><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id} aria-invalid={error || undefined} className="w-full"><SelectValue placeholder={`Choose ${label.toLowerCase()}`} /></SelectTrigger><SelectContent><SelectGroup>{options.filter(Boolean).map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select>{error && <FieldError>{error}</FieldError>}</Field>;
}

export function TransactionEditor({ open, transaction, state, config, initialType, onSave, onClose, onDirtyChange }) {
  const seed = useMemo(() => initialForm(transaction, state, initialType), [transaction, state, initialType]);
  const [form, setForm] = useState(seed);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const dirty = JSON.stringify(form) !== JSON.stringify(seed);
  useEffect(() => { if (open) { setForm(seed); setStatus("idle"); setError(""); setErrors({}); } }, [open, seed]);
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  const subcategories = subcategoriesFor(state, form.category);
  const pending = status === "saving";
  function update(name, value) { setForm((previous) => ({ ...previous, [name]: value, ...(name === "category" ? { subcategory: subcategoriesFor(state, value)[0]?.name || "" } : {}) })); setStatus("idle"); }
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const nextErrors = {};
    if (!form.date) nextErrors.date = "Choose a date.";
    if (!form.category) nextErrors.category = "Choose a category.";
    if (!form.subcategory) nextErrors.subcategory = "Choose a subcategory.";
    if (!form.account) nextErrors.account = "Choose an account.";
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) nextErrors.amount = "Enter a positive amount.";
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    setStatus("saving"); setError("");
    try { await onSave(form); setStatus("saved"); }
    catch (reason) { setError(reason.message || "The transaction could not be saved."); setStatus("error"); }
  }
  return <Sheet open={open} onOpenChange={(next) => { if (!next && !pending) onClose(); }}><SheetContent className="transaction-sheet w-full sm:max-w-xl" onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}><SheetHeader><SheetTitle>{transaction ? "Edit transaction" : "Add transaction"}</SheetTitle><SheetDescription>{transaction ? "Changes are sent together when you save." : "Record the account and details for this transaction."}</SheetDescription></SheetHeader><form className="sheet-form" onSubmit={submit}><FieldGroup>
    <Field data-invalid={errors.date || undefined}><FieldLabel htmlFor="transaction-date">Date</FieldLabel><Input id="transaction-date" type="date" value={form.date} onChange={(event) => update("date", event.target.value)} aria-invalid={errors.date || undefined} disabled={pending} />{errors.date && <FieldError>{errors.date}</FieldError>}</Field>
    <Choice id="transaction-type" label="Type" value={form.type} onChange={(value) => update("type", value)} options={TYPES} disabled={pending} />
    <Choice id="transaction-category" label="Category" value={form.category} onChange={(value) => update("category", value)} options={state.categories.map((item) => item.name)} disabled={pending} error={errors.category} />
    <Choice id="transaction-subcategory" label="Subcategory" value={form.subcategory} onChange={(value) => update("subcategory", value)} options={subcategories.map((item) => item.name)} disabled={pending} error={errors.subcategory} />
    <div className="editor-pair"><Field data-invalid={errors.amount || undefined}><FieldLabel htmlFor="transaction-amount">Amount</FieldLabel><Input id="transaction-amount" type="number" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} aria-invalid={errors.amount || undefined} disabled={pending} />{errors.amount && <FieldError>{errors.amount}</FieldError>}</Field><Choice id="transaction-account" label="Account" value={form.account} onChange={(value) => update("account", value)} options={state.accounts.map((item) => item.name)} disabled={pending} error={errors.account} /></div>
    <Field><FieldLabel htmlFor="transaction-merchant">Merchant/Payee (optional)</FieldLabel><Input id="transaction-merchant" value={form.merchantPayee} onChange={(event) => update("merchantPayee", event.target.value)} disabled={pending} /></Field>
    <Field><FieldLabel htmlFor="transaction-description">Description (optional)</FieldLabel><Input id="transaction-description" value={form.description} onChange={(event) => update("description", event.target.value)} disabled={pending} /></Field>
    <Field><FieldLabel htmlFor="transaction-notes">Notes (optional)</FieldLabel><Textarea id="transaction-notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} disabled={pending} /></Field>
    {!transaction && <div className="editor-pair"><Field orientation="horizontal"><Checkbox id="transaction-essential" checked={form.essential} onCheckedChange={(value) => update("essential", Boolean(value))} disabled={pending} /><FieldLabel htmlFor="transaction-essential">Essential</FieldLabel></Field><Field orientation="horizontal"><Checkbox id="transaction-reimbursable" checked={form.reimbursable} onCheckedChange={(value) => update("reimbursable", Boolean(value))} disabled={pending} /><FieldLabel htmlFor="transaction-reimbursable">Reimbursable</FieldLabel></Field></div>}
    {!transaction && <Field orientation="horizontal"><Checkbox id="transaction-automatic" checked={form.makeAutomatic} onCheckedChange={(value) => update("makeAutomatic", Boolean(value))} disabled={pending} /><FieldLabel htmlFor="transaction-automatic">Make automatic</FieldLabel></Field>}
    {!transaction && form.makeAutomatic && <><Choice id="transaction-frequency" label="Frequency" value={form.frequency} onChange={(value) => update("frequency", value)} options={config?.recurrencePresets || ["Weekly", "Biweekly", "Monthly", "Quarterly", "Yearly", "Custom"]} disabled={pending} />{form.frequency === "Custom" && <div className="editor-pair"><Field><FieldLabel htmlFor="transaction-interval">Every</FieldLabel><Input id="transaction-interval" type="number" min="1" value={form.customInterval} onChange={(event) => update("customInterval", event.target.value)} /></Field><Choice id="transaction-unit" label="Unit" value={form.customUnit} onChange={(value) => update("customUnit", value)} options={config?.recurrenceUnits || ["Days", "Weeks", "Months", "Years"]} /></div>}<Field><FieldLabel htmlFor="transaction-end">End date</FieldLabel><Input id="transaction-end" type="date" value={form.endDate} onChange={(event) => update("endDate", event.target.value)} /></Field></>}
    {!state.accounts.length || !state.categories.length ? <FieldDescription>Add at least one account, category, and subcategory before saving.</FieldDescription> : null}
    <SaveStatus status={status} message={error} onDismiss={() => setStatus("idle")} />
  </FieldGroup><SheetFooter><Button variant="outline" disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={pending || !state.accounts.length || !state.categories.length}>{pending ? "Saving..." : transaction ? "Save transaction" : "Add transaction"}</Button></SheetFooter></form></SheetContent></Sheet>;
}
