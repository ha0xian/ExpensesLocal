export function AppShell({ topBar, tabs, children }) {
  return (
    <div className="app-shell">
      {topBar}
      {tabs}
      <main id="app" className="workspace" tabIndex="-1">{children}</main>
    </div>
  );
}
