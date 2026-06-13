import { Kpi, Panel, Table } from "../components/ui.jsx";
import { money, sum } from "../lib/app-helpers.js";

export function MonthlySetupView({
  state,
  availableToAssign,
  envelopeRows,
  onUpdateMonthlySetup,
  onFillMissingMonthlySetup
}) {
  const currency = state.currency;
  const currentRows = state.monthlySetup.filter((item) => item.month === state.selectedMonth);
  const funded = sum(currentRows.map((item) => item.monthlyTarget));
  const overdrawn = envelopeRows.filter((item) => item.overdrawn).length;

  return (
    <>
      <section className="grid three">
        <Kpi label="Available To Assign" value={money(availableToAssign, currency)} tone={availableToAssign >= 0 ? "good" : "bad"} />
        <Kpi label="Funded This Month" value={money(funded, currency)} />
        <Kpi label="Overdrawn Envelopes" value={overdrawn} tone={overdrawn ? "bad" : "good"} />
      </section>
      <Panel
        title="Monthly Setup"
        subtitle="Funding targets, starting balances, and rollover are month-specific."
        action={<button type="button" onClick={onFillMissingMonthlySetup}>Fill Missing From Defaults</button>}
      >
        <Table headers={["Category", "Subcategory", "Target", "Starting", "Rollover", "Rollover In", "Spending", "Available"]}>
          {currentRows.map((item) => {
            const envelope = envelopeRows.find((row) => row.category === item.category && row.subcategory === item.subcategory);
            return (
              <tr key={item.id}>
                <td>{item.category}</td>
                <td>{item.subcategory}</td>
                <td><input type="number" step="0.01" value={item.monthlyTarget} onChange={(event) => onUpdateMonthlySetup(item.id, "monthlyTarget", event.target.value)} /></td>
                <td><input type="number" step="0.01" value={item.startingBalance} onChange={(event) => onUpdateMonthlySetup(item.id, "startingBalance", event.target.value)} /></td>
                <td><input type="checkbox" checked={item.rollover} onChange={(event) => onUpdateMonthlySetup(item.id, "rollover", event.target.checked)} /></td>
                <td className="money">{money(envelope?.rolloverIn || 0, currency)}</td>
                <td className="money">{money(envelope?.spending || 0, currency)}</td>
                <td className="money">{money(envelope?.available || 0, currency)}</td>
              </tr>
            );
          })}
        </Table>
      </Panel>
    </>
  );
}
