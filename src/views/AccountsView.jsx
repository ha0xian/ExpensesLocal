import { useState } from "react";
import { Field, Panel, Table } from "../components/ui.jsx";
import { money } from "../lib/app-helpers.js";

const accountTypes = ["Bank", "Credit Card", "Cash"];

export function AccountsView({
  state,
  accountBalances,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
}) {
  const [form, setForm] = useState({ name: "", type: "Bank", openingBalance: "0", notes: "" });
  const balances = new Map(accountBalances.map((item) => [item.account, item]));

  function handleSubmit(event) {
    event.preventDefault();
    if (onAddAccount(form)) {
      setForm({ name: "", type: "Bank", openingBalance: "0", notes: "" });
    }
  }

  return (
    <>
      <Panel title="Add Account">
        <form className="form-grid" onSubmit={handleSubmit}>
          <Field label="Name" className="wide"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Type"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{accountTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
          <Field label="Opening Balance"><input type="number" step="0.01" value={form.openingBalance} onChange={(event) => setForm({ ...form, openingBalance: event.target.value })} /></Field>
          <Field label="Notes" className="wide"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <div className="actions"><button className="primary" type="submit">Add Account</button></div>
        </form>
      </Panel>
      <Panel title="Accounts" subtitle="Balances are calculated from opening balance plus transactions.">
        <Table headers={["Name", "Type", "Opening Balance", "Current Balance", ""]}>
          {state.accounts.map((item) => (
            <tr key={item.id}>
              <td><input value={item.name} onChange={(event) => onUpdateAccount(item.id, "name", event.target.value)} /></td>
              <td><select value={item.type} onChange={(event) => onUpdateAccount(item.id, "type", event.target.value)}>{accountTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></td>
              <td><input type="number" step="0.01" value={item.openingBalance} onChange={(event) => onUpdateAccount(item.id, "openingBalance", event.target.value)} /></td>
              <td className="money">{money(balances.get(item.name)?.currentBalance || 0, state.currency)}</td>
              <td><button className="danger" type="button" onClick={() => onDeleteAccount(item.id)}>Delete</button></td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}
