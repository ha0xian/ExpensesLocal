import { Kpi, Panel, StatusPill, Table } from "../components/ui.jsx";
import { money } from "../lib/app-helpers.js";

export function DashboardView({
  state,
  summary,
  availableToAssign,
  categoryRows,
  envelopeRows,
  warningCount
}) {
  const currency = state.currency;
  const visibleCategoryRows = categoryRows
    .filter((row) => row.spend || row.budget)
    .sort((a, b) => b.spend - a.spend);

  return (
    <>
      <section className="grid four">
        <Kpi label="Income" value={money(summary.income, currency)} tone="good" />
        <Kpi label="Expenses" value={money(summary.expenses, currency)} tone={summary.expenses > summary.income ? "bad" : ""} />
        <Kpi label="Net Cashflow" value={money(summary.netCashflow, currency)} tone={summary.netCashflow >= 0 ? "good" : "bad"} />
        <Kpi label="Available To Assign" value={money(availableToAssign, currency)} tone={availableToAssign >= 0 ? "good" : "bad"} />
        <Kpi label="Top Category" value={summary.topCategory} />
        <Kpi label="Transactions" value={summary.transactionCount} />
        <Kpi label="Essential Spend" value={money(summary.essentialSpend, currency)} />
        <Kpi label="Warnings" value={warningCount} tone={warningCount ? "bad" : "good"} />
      </section>
      <section className="grid two">
        <Panel title="Category Spend" subtitle={state.selectedMonth}>
          <Table headers={["Category", "Spend", "Budget"]} emptyMessage="No category activity.">
            {visibleCategoryRows.map((row) => (
              <tr key={row.category}>
                <td>{row.category}</td>
                <td className="money">{money(row.spend, currency)}</td>
                <td className="money">{money(row.budget, currency)}</td>
              </tr>
            ))}
          </Table>
        </Panel>
        <Panel title="Envelope Snapshot" subtitle="Rollover is recalculated chronologically.">
          <Table headers={["Category", "Subcategory", "Target", "Rollover In", "Spending", "Available", "Status"]} emptyMessage="No envelopes for this month.">
            {envelopeRows.slice(0, 8).map((row) => (
              <tr key={`${row.category}-${row.subcategory}`}>
                <td>{row.category}</td>
                <td>{row.subcategory}</td>
                <td className="money">{money(row.monthlyTarget, currency)}</td>
                <td className="money">{money(row.rolloverIn, currency)}</td>
                <td className="money">{money(row.spending, currency)}</td>
                <td className="money">{money(row.available, currency)}</td>
                <td><StatusPill tone={row.overdrawn ? "error" : "info"}>{row.overdrawn ? "Overdrawn" : "OK"}</StatusPill></td>
              </tr>
            ))}
          </Table>
        </Panel>
      </section>
    </>
  );
}
