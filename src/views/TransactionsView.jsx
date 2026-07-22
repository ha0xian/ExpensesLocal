import { useState } from "react";
import { Field, Panel, Table } from "../components/ui.jsx";
import { money, subcategoriesFor } from "../lib/app-helpers.js";

const TRANSACTION_TYPES = ["Expense", "Income", "Transfer"];

const FALLBACK_PRESETS = ["Weekly", "Biweekly", "Monthly", "Quarterly", "Yearly", "Custom"];
const FALLBACK_UNITS = ["Days", "Weeks", "Months", "Years"];

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TransactionsView({
  state,
  config,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction
}) {
  const recurrencePresets = config?.recurrencePresets || FALLBACK_PRESETS;
  const recurrenceUnits = config?.recurrenceUnits || FALLBACK_UNITS;

  const firstCategory = state.categories[0]?.name || "";
  const [form, setForm] = useState({
    date: todayLocal(),
    type: "Expense",
    category: firstCategory,
    subcategory: subcategoriesFor(state, firstCategory)[0]?.name || "",
    account: state.accounts[0]?.name || "",
    amount: "",
    merchantPayee: "",
    description: "",
    notes: "",
    makeAutomatic: false,
    endDate: "",
    frequency: "Monthly",
    customInterval: "1",
    customUnit: "Months"
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
    const success = await onAddTransaction(form);
    if (success) {
      setForm((previous) => ({
        ...previous,
        date: todayLocal(),
        amount: "",
        merchantPayee: "",
        description: "",
        notes: "",
        makeAutomatic: false,
        endDate: "",
        frequency: "Monthly",
        customInterval: "1",
        customUnit: "Months"
      }));
    }
  }

  return (
    <>
      <Panel title="Add Transaction" subtitle="Amounts are stored as positive numbers; type controls cashflow direction.">
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Date"><input name="date" type="date" value={form.date} onChange={(event) => updateForm("date", event.target.value)} /></Field>
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
          <Field label="Amount"><input name="amount" type="number" step="0.01" value={form.amount} onChange={(event) => updateForm("amount", event.target.value)} /></Field>
          <Field label="Merchant/Payee (optional)" className="wide"><input name="merchantPayee" value={form.merchantPayee} onChange={(event) => updateForm("merchantPayee", event.target.value)} /></Field>
          <Field label="Description (optional)" className="wide"><input name="description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></Field>
          <Field label="Notes (optional)" className="wide"><input name="notes" value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} /></Field>
          <label className="check-field"><input name="makeAutomatic" type="checkbox" checked={form.makeAutomatic} onChange={(event) => updateForm("makeAutomatic", event.target.checked)} /><span>Make automatic</span></label>
          {form.makeAutomatic ? (
            <>
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
              <Field label="End Date"><input name="endDate" type="date" value={form.endDate} onChange={(event) => updateForm("endDate", event.target.value)} /></Field>
            </>
          ) : null}
          <div className="actions"><button className="primary" type="submit">Add Transaction</button></div>
        </form>
      </Panel>
      <Panel title="Transactions" subtitle="Edit inline or delete rows.">
        <Table headers={["Date", "Type", "Category", "Subcategory", "Account", "Merchant", "Amount", ""]}>
          {(state.transactions || []).map((item) => (
            <tr key={item.id}>
              <td><input type="date" value={item.date} onChange={(event) => onUpdateTransaction(item.id, "date", event.target.value)} /></td>
              <td><select value={item.type} onChange={(event) => onUpdateTransaction(item.id, "type", event.target.value)}>{TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></td>
              <td><select value={item.category} onChange={(event) => onUpdateTransaction(item.id, "category", event.target.value)}>{state.categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></td>
              <td><select value={item.subcategory} onChange={(event) => onUpdateTransaction(item.id, "subcategory", event.target.value)}>{subcategoriesFor(state, item.category).map((subcategory) => <option key={subcategory.id} value={subcategory.name}>{subcategory.name}</option>)}</select></td>
              <td><select value={item.account} onChange={(event) => onUpdateTransaction(item.id, "account", event.target.value)}>{state.accounts.map((account) => <option key={account.id} value={account.name}>{account.name}</option>)}</select></td>
              <td><input value={item.merchantPayee || ""} onChange={(event) => onUpdateTransaction(item.id, "merchantPayee", event.target.value)} /></td>
              <td><input type="number" step="0.01" value={item.amount} onChange={(event) => onUpdateTransaction(item.id, "amount", event.target.value)} /></td>
              <td><button className="danger" type="button" onClick={() => onDeleteTransaction(item.id)}>Delete</button></td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
