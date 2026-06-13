export function TopBar({
  selectedMonth,
  months,
  fileName,
  dirty,
  fileSystemSupported,
  automationStatus,
  onMonthChange,
  onOpenCsv,
  onSaveCsv,
  onSaveAsCsv
}) {
  const automationMessage = automationStatus?.changed
    ? ` Last access metadata updated for ${automationStatus.currentAccessDate}; save to persist it.`
    : "";
  const supportMessage = fileSystemSupported
    ? `CSV open/save is available in this browser.${automationMessage}`
    : `File System Access API is unavailable. Use Chrome or Edge for CSV open/save.${automationMessage}`;

  return (
    <header className="topbar">
      <div>
        <h1>Envelope Expense CSV</h1>
        <p className="support-message">{supportMessage}</p>
      </div>
      <div className="topbar-controls">
        <label className="field compact">
          <span>Month</span>
          <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {months.map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </label>
        <span className="file-status">{fileName || "No CSV opened"}{dirty ? " · unsaved" : ""}</span>
        <button type="button" onClick={onOpenCsv}>Open CSV</button>
        <button type="button" onClick={onSaveCsv}>Save</button>
        <button type="button" className="primary" onClick={onSaveAsCsv}>Save As</button>
      </div>
    </header>
  );
}
