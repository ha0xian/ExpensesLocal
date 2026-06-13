export function Kpi({ label, value, tone = "" }) {
  return (
    <article className={`kpi ${tone}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function Panel({ title, subtitle, action, children }) {
  return (
    <section className="panel">
      {(title || subtitle || action) ? (
        <div className="panel-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Table({ headers, children, emptyMessage, colSpan }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {children || (
            <tr>
              <td colSpan={colSpan || headers.length}>{emptyMessage || "No rows."}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ label, className = "", children }) {
  return (
    <label className={`field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function StatusPill({ tone = "info", children }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
