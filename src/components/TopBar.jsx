export function TopBar({
  selectedMonth,
  months,
  dataFileName,
  automationStatus,
  onMonthChange,
  onImportCsv,
  onExportCsv
}) {
  const automationMessage = automationStatus?.changed
    ? ` Last access metadata updated for ${automationStatus.currentAccessDate}.`
    : "";
  const statusLabel = dataFileName ? `${dataFileName} (server)` : "Server storage";

  return (
    <header className="topbar">
      <div>
        <h1>Envelope Expense Tracker</h1>
        <p className="support-message">Server-backed expense app.{automationMessage}</p>
      </div>
      <div className="topbar-controls">
        <label className="field compact">
          <span>Month</span>
          <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {(months || []).map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
        <span className="file-status">{statusLabel}</span>
        <button type="button" onClick={onImportCsv}>Import CSV</button>
        <button type="button" className="primary" onClick={onExportCsv}>Export CSV</button>
      </div>
    </header>
  );
}
