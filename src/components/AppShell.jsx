export function AppShell({ topBar, tabs, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Envelope Expense Tracker">
          <span className="brand-icon">E</span>
          <span>
            <strong>Envelope</strong>
            <small>Expense Tracker</small>
          </span>
        </div>
        {tabs}
        <div className="sidebar-foot">
          <span className="storage-dot" aria-hidden="true" />
          <span>Server storage</span>
        </div>
      </aside>
      <div className="app-main">
        {topBar}
        <main id="app" className="workspace" tabIndex="-1">{children}</main>
      </div>
    </div>
  );
}
