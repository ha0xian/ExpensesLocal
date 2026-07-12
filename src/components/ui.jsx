import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";

export function Kpi({ label, value, detail, tone = "", icon: Icon }) {
  return (
    <Card className={`kpi ${tone}`.trim()}>
      <CardContent className="kpi-content">
        {Icon ? (
          <span className="kpi-icon" aria-hidden="true">
            <Icon data-icon="inline-start" />
          </span>
        ) : null}
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
          {detail ? <small>{detail}</small> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function Panel({ title, subtitle, action, children }) {
  return (
    <Card className="panel">
      {(title || subtitle || action) ? (
        <CardHeader className="panel-header">
          <div>
            {title ? <CardTitle>{title}</CardTitle> : null}
            {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
          </div>
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent>{children}</CardContent>
    </Card>
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
  const variant = tone === "error" || tone === "bad"
    ? "destructive"
    : tone === "warning"
      ? "warning"
      : tone === "good" || tone === "success"
        ? "success"
        : "secondary";
  return <Badge className={`status-pill ${tone}`} variant={variant}>{children}</Badge>;
}

export function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}
