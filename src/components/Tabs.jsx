import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Repeat2,
  Tags,
} from "lucide-react";

const VIEWS = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["transactions", "Transactions", ListChecks],
  ["automatic", "Automatic", Repeat2],
  ["monthly", "Monthly Setup", CalendarDays],
  ["categories", "Categories", Tags],
  ["accounts", "Accounts", Building2],
  ["import", "Bank Import", Banknote],
  ["warnings", "Warnings", AlertTriangle]
];

export function Tabs({ currentView, onViewChange }) {
  return (
    <nav className="tabs" aria-label="Views">
      {VIEWS.map(([view, label, Icon]) => (
        <button
          className={`tab ${currentView === view ? "is-active" : ""}`.trim()}
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
        >
          <Icon data-icon="inline-start" />
          {label}
        </button>
      ))}
    </nav>
  );
}
