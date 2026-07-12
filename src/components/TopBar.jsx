import { CalendarDays, Database, Download, Upload } from "lucide-react";
import { Button } from "./ui/button.jsx";

export function TopBar({
  title = "Dashboard",
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
        <h1>{title}</h1>
        <p className="support-message">Server-backed expense app.{automationMessage}</p>
      </div>
      <div className="topbar-controls">
        <label className="field compact">
          <span>Month</span>
          <span className="select-shell">
            <CalendarDays data-icon="inline-start" />
            <select value={selectedMonth} onChange={(event) => onMonthChange(event.target.value)}>
            {(months || []).map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          </span>
        </label>
        <span className="file-status"><Database data-icon="inline-start" />{statusLabel}</span>
        <Button variant="outline" onClick={onImportCsv}><Upload data-icon="inline-start" />Import CSV</Button>
        <Button onClick={onExportCsv}><Download data-icon="inline-start" />Export CSV</Button>
      </div>
    </header>
  );
}
