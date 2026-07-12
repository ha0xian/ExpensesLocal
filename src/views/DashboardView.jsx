import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgePoundSterling,
  ListChecks,
  ShieldCheck,
  Tags,
  WalletCards,
} from "lucide-react";
import { Kpi, Panel, StatusPill, Table } from "../components/ui.jsx";
import { money } from "../lib/app-helpers.js";

export function DashboardView({
  state,
  summary,
  availableToAssign,
  categoryRows,
  envelopeRows,
  warningCount,
  warnings = [],
}) {
  const currency = state.currency;
  const visibleCategoryRows = categoryRows
    .filter((row) => row.spend || row.budget)
    .sort((a, b) => b.spend - a.spend);
  const overdrawnRows = envelopeRows.filter((row) => row.overdrawn);
  const budgetTotal = visibleCategoryRows.reduce((total, row) => total + (Number(row.budget) || 0), 0);
  const spendTotal = visibleCategoryRows.reduce((total, row) => total + (Number(row.spend) || 0), 0);
  const budgetUsed = budgetTotal ? Math.round((spendTotal / budgetTotal) * 100) : 0;

  return (
    <section className="dashboard-layout">
      <div className="dashboard-primary">
        <section className="grid four">
          <Kpi label="Income" value={money(summary.income, currency)} detail="This month" tone="good" icon={ArrowUpRight} />
          <Kpi label="Expenses" value={money(summary.expenses, currency)} detail="This month" tone={summary.expenses > summary.income ? "bad" : ""} icon={ArrowDownRight} />
          <Kpi label="Net Cashflow" value={money(summary.netCashflow, currency)} detail="Income minus spend" tone={summary.netCashflow >= 0 ? "good" : "bad"} icon={BadgePoundSterling} />
          <Kpi label="Available To Assign" value={money(availableToAssign, currency)} detail="Remaining" tone={availableToAssign >= 0 ? "good" : "bad"} icon={WalletCards} />
          <Kpi label="Top Category" value={summary.topCategory || "None"} detail={money(summary.topCategorySpend || 0, currency)} icon={Tags} />
          <Kpi label="Transactions" value={summary.transactionCount} detail="This month" icon={ListChecks} />
          <Kpi label="Essential Spend" value={money(summary.essentialSpend, currency)} detail={`${summary.income ? Math.round((summary.essentialSpend / summary.income) * 100) : 0}% of income`} icon={ShieldCheck} />
          <Kpi label="Warnings" value={warningCount} detail={warningCount ? "Requires attention" : "All clear"} tone={warningCount ? "bad" : "good"} icon={AlertTriangle} />
        </section>

        <section className="grid two dashboard-tables">
          <Panel title="Category Spend" subtitle={state.selectedMonth}>
            <Table headers={["Category", "Spend", "Budget", "% Budget"]} emptyMessage="No category activity.">
              {visibleCategoryRows.map((row) => {
                const percent = row.budget ? Math.round((row.spend / row.budget) * 100) : 0;
                return (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td className="money">{money(row.spend, currency)}</td>
                    <td className="money">{money(row.budget, currency)}</td>
                    <td><StatusPill tone={percent >= 100 ? "error" : percent >= 90 ? "warning" : "success"}>{percent}%</StatusPill></td>
                  </tr>
                );
              })}
            </Table>
          </Panel>
          <Panel title="Envelope Snapshot" subtitle="Rollover is recalculated chronologically.">
            <Table headers={["Envelope", "Target", "Rollover", "Spending", "Available", "Status"]} emptyMessage="No envelopes for this month.">
              {envelopeRows.slice(0, 8).map((row) => (
                <tr key={`${row.category}-${row.subcategory}`}>
                  <td>
                    <strong className="table-primary">{row.subcategory}</strong>
                    <span className="table-secondary">{row.category}</span>
                  </td>
                  <td className="money">{money(row.monthlyTarget, currency)}</td>
                  <td className="money">{money(row.rolloverIn, currency)}</td>
                  <td className="money">{money(row.spending, currency)}</td>
                  <td className="money">{money(row.available, currency)}</td>
                  <td><StatusPill tone={row.overdrawn ? "error" : "success"}>{row.overdrawn ? "Overdrawn" : "On Track"}</StatusPill></td>
                </tr>
              ))}
            </Table>
          </Panel>
        </section>
      </div>

      <aside className="dashboard-aside">
        <Panel
          title="Warnings Summary"
          subtitle={warningCount ? `${warningCount} item(s) need review.` : "No active warnings."}
          action={warningCount ? <StatusPill tone="error">{warningCount}</StatusPill> : <StatusPill tone="success">Clear</StatusPill>}
        >
          <div className="warning-stack">
            {warnings.slice(0, 3).map((item, index) => (
              <article className="warning-item" key={`${item.code}-${item.entityId || index}`}>
                <AlertTriangle aria-hidden="true" />
                <div>
                  <strong>{item.message}</strong>
                  <span>{item.code}{item.entityId ? `, ${item.entityId}` : ""}</span>
                </div>
              </article>
            ))}
            {!warnings.length ? (
              <p className="aside-muted">Your selected month has no budget or data integrity warnings.</p>
            ) : null}
          </div>
        </Panel>

        <Panel title="Month Health" subtitle={`${budgetUsed}% of visible budget used.`}>
          <div className="health-meter" style={{ "--health-value": `${Math.min(budgetUsed, 100)}%` }}>
            <strong>{budgetUsed}%</strong>
            <span>{budgetUsed >= 100 ? "Over budget" : budgetUsed >= 90 ? "Watch closely" : "Good"}</span>
          </div>
          <dl className="health-list">
            <div><dt>Budgeted</dt><dd>{money(budgetTotal, currency)}</dd></div>
            <div><dt>Spent</dt><dd>{money(spendTotal, currency)}</dd></div>
            <div><dt>Overdrawn</dt><dd>{overdrawnRows.length}</dd></div>
          </dl>
        </Panel>
      </aside>
    </section>
  );
}
