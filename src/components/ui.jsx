import { Children, cloneElement, isValidElement, useId } from "react";
import { Badge } from "./ui/badge.jsx";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.jsx";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./ui/empty.jsx";
import { Field as ShadField, FieldLabel } from "./ui/field.jsx";
import { Table as ShadTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.jsx";

export function Kpi({ label, value, detail, tone = "" }) { return <Card className={`kpi ${tone}`.trim()}><CardContent className="kpi-content"><div><span>{label}</span><strong>{value}</strong>{detail ? <small>{detail}</small> : null}</div></CardContent></Card>; }
export function Panel({ title, subtitle, action, children, className = "" }) { return <Card className={`panel ${className}`.trim()}>{(title || subtitle || action) && <CardHeader className="panel-header"><div>{title && <CardTitle>{title}</CardTitle>}{subtitle && <CardDescription>{subtitle}</CardDescription>}</div>{action && <CardAction>{action}</CardAction>}</CardHeader>}<CardContent>{children}</CardContent></Card>; }
export function Table({ headers, children, emptyMessage, colSpan, label = "Data table" }) { const rows = Children.toArray(children).filter(Boolean); return <div className="table-wrap" role="region" aria-label={label} tabIndex="0"><ShadTable><TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length ? rows : <TableRow><TableCell colSpan={colSpan || headers.length}>{emptyMessage || "No rows."}</TableCell></TableRow>}</TableBody></ShadTable></div>; }
export function Field({ label, className = "", children }) { const id = useId(); const control = isValidElement(children) ? cloneElement(children, { id: children.props.id || id }) : children; return <ShadField className={className}><FieldLabel htmlFor={id}>{label}</FieldLabel>{control}</ShadField>; }
export function StatusPill({ tone = "info", children }) { const variant = tone === "error" || tone === "bad" ? "destructive" : tone === "warning" ? "warning" : tone === "good" || tone === "success" ? "success" : "secondary"; return <Badge variant={variant}>{children}</Badge>; }
export function EmptyState({ title, message, action }) { return <Empty><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{message}</EmptyDescription></EmptyHeader>{action && <EmptyContent>{action}</EmptyContent>}</Empty>; }
