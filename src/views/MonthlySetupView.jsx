import { useEffect, useMemo, useState } from "react";
import { Kpi, Panel, Table } from "../components/ui.jsx";
import { money, sum } from "../lib/app-helpers.js";

export function MonthlySetupView({
  state,
  availableToAssign,
  envelopeRows,
  onSaveMonthlySetup,
  onDirtyChange,
  onFillMissingMonthlySetup
}) {
  const currency = state.currency;
  const currentRows = state.monthlySetup.filter((item) => item.month === state.selectedMonth);
  const funded = sum(currentRows.map((item) => item.monthlyTarget));
  const overdrawn = envelopeRows.filter((item) => item.overdrawn).length;
  const initialDraft = useMemo(
    () => Object.fromEntries(currentRows.map((item) => [item.id, {
      monthlyTarget: String(item.monthlyTarget),
      startingBalance: String(item.startingBalance),
      rollover: item.rollover,
    }])),
    [state.monthlySetup, state.selectedMonth]
  );
  const [draft, setDraft] = useState(initialDraft);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);

  useEffect(() => setDraft(initialDraft), [initialDraft]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  function updateDraft(id, field, value) {
    setDraft((previous) => ({
      ...previous,
      [id]: { ...previous[id], [field]: value },
    }));
  }

  async function saveChanges() {
    const updates = [];
    currentRows.forEach((item) => {
      const row = draft[item.id];
      if (!row) return;
      ["monthlyTarget", "startingBalance", "rollover"].forEach((field) => {
        if (String(row[field]) !== String(initialDraft[item.id][field])) {
          updates.push({ id: item.id, field, value: row[field] });
        }
      });
    });
    setSaving(true);
    await onSaveMonthlySetup(updates);
    setSaving(false);
  }

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
        action={
          <div className="actions">
            <button type="button" onClick={onFillMissingMonthlySetup} disabled={dirty}>Fill Missing From Defaults</button>
            <button className="primary" type="button" onClick={saveChanges} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        }
      >
        <Table headers={["Category", "Subcategory", "Target", "Starting", "Rollover", "Rollover In", "Spending", "Available"]}>
          {currentRows.map((item) => {
            const envelope = envelopeRows.find((row) => row.category === item.category && row.subcategory === item.subcategory);
            return (
              <tr key={item.id}>
                <td>{item.category}</td>
                <td>{item.subcategory}</td>
                <td><input type="number" value={draft[item.id]?.monthlyTarget ?? ""} onChange={(event) => updateDraft(item.id, "monthlyTarget", event.target.value)} /></td>
                <td><input type="number" value={draft[item.id]?.startingBalance ?? ""} onChange={(event) => updateDraft(item.id, "startingBalance", event.target.value)} /></td>
                <td><input type="checkbox" checked={draft[item.id]?.rollover ?? false} onChange={(event) => updateDraft(item.id, "rollover", event.target.checked)} /></td>
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
