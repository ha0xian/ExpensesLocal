const VIEWS = [
  ["dashboard", "Dashboard"],
  ["transactions", "Transactions"],
  ["automatic", "Automatic"],
  ["monthly", "Monthly Setup"],
  ["categories", "Categories"],
  ["accounts", "Accounts"],
  ["import", "Bank Import"],
  ["warnings", "Warnings"]
];

export function Tabs({ currentView, onViewChange }) {
  return (
    <nav className="tabs" aria-label="Views">
      {VIEWS.map(([view, label]) => (
        <button
          className={`tab ${currentView === view ? "is-active" : ""}`.trim()}
          key={view}
          type="button"
          onClick={() => onViewChange(view)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
