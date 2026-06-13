import { useState } from "react";
import { Field, Panel, Table } from "../components/ui.jsx";
import { subcategoriesFor } from "../lib/app-helpers.js";

const TRANSACTION_TYPES = ["Expense", "Income", "Transfer"];
const FALLBACK_PRESETS = ["Weekly", "Biweekly", "Monthly", "Quarterly", "Yearly", "Custom"];
const FALLBACK_UNITS = ["Days", "Weeks", "Months", "Years"];

export function AutomaticTransactionsView({
  state,
  config,
  onAddAutomaticTransaction,
  onUpdateAutomaticTransaction,
  onDeleteAutomaticTransaction
}) {
  const recurrencePresets = config?.recurrencePresets || FALLBACK_PRESETS;
  const recurrenceUnits = config?.recurrenceUnits || FALLBACK_UNITS;

  const firstCategory = state.categories[0]?.name || "";
  const [form, setForm] = useState({
    enabled: true,
    startDate: "",
    endDate: "",
    frequency: "Monthly",
    customInterval: "1",
    customUnit: "Months",
    type: "Expense",
    category: firstCategory,
    subcategory: subcategoriesFor(state, firstCategory)[0]?.name || "",
    account: state.accounts[0]?.name || "",
    amount: "",
    merchantPayee: "",
    description: "",
    essential: false,
    reimbursable: false,
    notes: ""
  });

  const addSubcategories = subcategoriesFor(state, form.category);

  function updateForm(name, value) {
    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === "category") {
        next.subcategory = subcategoriesFor(state, value)[0]?.name || "";
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const success = await onAddAutomaticTransaction(form);
    if (success) {
      setForm((previous) => ({
        ...previous,
        startDate: "",
        endDate: "",
        amount: "",
        merchantPayee: "",
        description: "",
        essential: false,
        reimbursable: false,
        notes: ""
      }));
    }
  }

  return (
    <>
      <Panel title="Add Automatic Transaction" subtitle="Create recurring transaction rules that generate due rows when the app opens.">
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="check-field"><input name="enabled" type="checkbox" checked={form.enabled} onChange={(event) => updateForm("enabled", event.target.checked)} /><span>Enabled</span></label>
          <Field label="Start Date"><input name="startDate" type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} /></Field>
          <Field label="End Date"><input name="endDate" type="date" value={form.endDate} onChange={(event) => updateForm("endDate", event.target.value)} /></Field>
          <Field label="Frequency">
            <select name="frequency" value={form.frequency} onChange={(event) => updateForm("frequency", event.target.value)}>
              {recurrencePresets.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          {form.frequency === "Custom" ? (
            <>
              <Field label="Every"><input name="customInterval" type="number" min="1" step="1" value={form.customInterval} onChange={(event) => updateForm("customInterval", event.target.value)} /></Field>
              <Field label="Unit">
                <select name="customUnit" value={form.customUnit} onChange={(event) => updateForm("customUnit", event.target.value)}>
                  {recurrenceUnits.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </>
          ) : null}
          <Field label="Type">
            <select name="type" value={form.type} onChange={(event) => updateForm("type", event.target.value)}>
              {TRANSACTION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select name="category" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
              {state.categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Subcategory">
            <select name="subcategory" value={form.subcategory} onChange={(event) => updateForm("subcategory", event.target.value)}>
              {addSubcategories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Account">
            <select name="account" value={form.account} onChange={(event) => updateForm("account", event.target.value)}>
              {state.accounts.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Amount"><input name="amount" type="number" step="0.01" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} /></Field>
          <Field label="Merchant/Payee" className="wide"><input name="merchantPayee" value={form.merchantPayee} onChange={(event) => updateForm("merchantPayee", event.target.value)} /></Field>
          <Field label="Description" className="wide"><input name="description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></Field>
          <label className="check-field"><input name="essential" type="checkbox" checked={form.essential} onChange={(event) => updateForm("essential", event.target.checked)} /><span>Essential</span></label>
          <label className="check-field"><input name="reimbursable" type="checkbox" checked={form.reimbursable} onChange={(event) => updateForm("reimbursable", event.target.checked)} /><span>Reimbursable</span></label>
          <Field label="Notes" className="wide"><input name="notes" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} /></Field>
          <div className="actions"><button className="primary" type="submit">Add Automatic Transaction</button></div>
        </form>
      </Panel>
      <Panel title="Automatic Transactions" subtitle="Disable a rule to keep it saved without generating future transactions.">
        <Table headers={["On", "Start", "End", "Frequency", "Custom", "Type", "Category", "Subcategory", "Account", "Merchant", "Amount", ""]}>
          {(state.automaticTransactions || []).map((item) => (
            <tr key={item.id}>
              <td><input type="checkbox" checked={item.enabled} onChange={(event) => onUpdateAutomaticTransaction(item.id, "enabled", event.target.checked)} /></td>
              <td><input type="date" value={item.startDate} onChange={(event) => onUpdateAutomaticTransaction(item.id, "startDate", event.target.value)} /></td>
              <td><input type="date" value={item.endDate || ""} onChange={(event) => onUpdateAutomaticTransaction(item.id, "endDate", event.target.value)} /></td>
              <td><select value={item.frequency} onChange={(event) => onUpdateAutomaticTransaction(item.id, "frequency", event.target.value)}>{recurrencePresets.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}</select></td>
              <td>
                <div className="inline-fields">
                  <input type="number" min="1" step="1" value={item.customInterval} disabled={item.frequency !== "Custom"} onChange={(event) => onUpdateAutomaticTransaction(item.id, "customInterval", event.target.value)} />
                  <select value={item.customUnit} disabled={item.frequency !== "Custom"} onChange={(event) => onUpdateAutomaticTransaction(item.id, "customUnit", event.target.value)}>{recurrenceUnits.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                </div>
              </td>
              <td><select value={item.type} onChange={(event) => onUpdateAutomaticTransaction(item.id, "type", event.target.value)}>{TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></td>
              <td><select value={item.category} onChange={(event) => onUpdateAutomaticTransaction(item.id, "category", event.target.value)}>{state.categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></td>
              <td><select value={item.subcategory} onChange={(event) => onUpdateAutomaticTransaction(item.id, "subcategory", event.target.value)}>{subcategoriesFor(state, item.category).map((subcategory) => <option key={subcategory.id} value={subcategory.name}>{subcategory.name}</option>)}</select></td>
              <td><select value={item.account} onChange={(event) => onUpdateAutomaticTransaction(item.id, "account", event.target.value)}>{state.accounts.map((account) => <option key={account.id} value={account.name}>{account.name}</option>)}</select></td>
              <td><input value={item.merchantPayee || ""} onChange={(event) => onUpdateAutomaticTransaction(item.id, "merchantPayee", event.target.value)} /></td>
              <td><input type="number" step="0.01" value={item.amount} onChange={(event) => onUpdateAutomaticTransaction(item.id, "amount", event.target.value)} /></td>
              <td><button className="danger" type="button" onClick={() => onDeleteAutomaticTransaction(item.id)}>Delete</button></td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
