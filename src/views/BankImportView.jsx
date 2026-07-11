import { Field, Panel, Table } from "../components/ui.jsx";
import { money } from "../lib/app-helpers.js";

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
    <Panel title="Bank Import" subtitle="Import a generic bank CSV, map columns, preview transactions, then add them to the app.">
      <input type="file" accept=".csv,text/csv" onChange={(event) => onLoadBankCsv(event.target.files[0])} />
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
            <p className="notice">{bankImport.rows.length} source row(s). Previewing up to {bankImport.previewRows.length} converted rows.</p>
            <button className="primary" type="button" onClick={onAddImportedTransactions}>Add Imported Transactions</button>
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
