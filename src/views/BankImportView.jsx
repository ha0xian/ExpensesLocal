import { Field, Panel, Table } from "../components/ui.jsx";
import { money } from "../lib/app-helpers.js";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "../components/SaveStatus.jsx";

const mappingFields = [
  ["date", "Date"],
  ["merchantPayee", "Merchant/Payee"],
  ["description", "Description"],
  ["amount", "Amount"],
  ["account", "Account"],
  ["category", "Category"],
  ["subcategory", "Subcategory"],
  ["type", "Type"]
];

export function BankImportView({
  state,
  bankImport,
  onLoadBankCsv,
  onUpdateMapping,
  onAddImportedTransactions
}) {
  const currency = state?.currency || "USD";

  return (
    <Panel title="Bank Import" subtitle="Add transactions from a bank CSV. This does not replace your existing data.">
      <input type="file" accept=".csv,text/csv" onChange={(event) => onLoadBankCsv(event.target.files[0])} />
      {bankImport.filename ? <p className="notice"><strong>{bankImport.filename}</strong> · {bankImport.rows.length} source row(s)</p> : null}
      <SaveStatus status={bankImport.status === "loading" ? "saving" : bankImport.status === "error" ? "error" : "idle"} message={bankImport.error || "Refreshing preview..."} />
      {bankImport.headers.length ? (
        <div className="grid">
          <div className="import-mapping">
            {mappingFields.map(([name, label]) => (
              <Field key={name} label={label}>
                <select value={bankImport.mapping[name] || ""} onChange={(event) => onUpdateMapping(name, event.target.value)}>
                  <option value=""></option>
                  {bankImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <div className="toolbar">
            <p className="notice">Previewing {bankImport.previewRows.length} converted row(s). Imports are additive and are not deduplicated across files.</p>
            <Button type="button" onClick={onAddImportedTransactions} disabled={bankImport.status !== "ready"}>Add imported transactions</Button>
          </div>
          <Table headers={["Date", "Type", "Category", "Subcategory", "Account", "Description", "Amount"]}>
            {(bankImport.previewRows || []).map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.type}</td>
                <td>{row.category}</td>
                <td>{row.subcategory}</td>
                <td>{row.account}</td>
                <td>{row.description}</td>
                <td className="money">{money(row.amount, currency)}</td>
              </tr>
            ))}
          </Table>
        </div>
      ) : (
        <p className="notice">Choose a CSV file to begin mapping.</p>
      )}
    </Panel>
  );
}
