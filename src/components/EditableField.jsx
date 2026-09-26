import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { SaveStatus } from "./SaveStatus.jsx";

export function EditableField({ label, value, renderInput, onSave, onDirtyChange, disabled = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  useEffect(() => { if (!editing) setDraft(value); }, [editing, value]);
  useEffect(() => { onDirtyChange?.(editing && String(draft) !== String(value)); }, [draft, editing, onDirtyChange, value]);
  async function save() {
    setStatus("saving"); setError("");
    try { await onSave(draft); setEditing(false); setStatus("saved"); }
    catch (reason) { setError(reason.message || `Could not save ${label}.`); setStatus("error"); }
  }
  if (!editing) return <div className="editable-display"><span>{String(value ?? "") || "Not set"}</span><Button size="sm" variant="outline" disabled={disabled} onClick={() => setEditing(true)}>Edit</Button></div>;
  return (
    <Field data-invalid={status === "error" || undefined}>
      <FieldLabel>{label}</FieldLabel>
      {renderInput({ value: draft, onChange: (next) => setDraft(next?.target ? next.target.value : next), disabled: disabled || status === "saving", "aria-invalid": status === "error" })}
      <FieldDescription>Only this field is saved.</FieldDescription>
      <div className="actions compact-actions"><Button size="sm" onClick={save} disabled={disabled || status === "saving"}>Save</Button><Button size="sm" variant="ghost" disabled={status === "saving"} onClick={() => { setDraft(value); setEditing(false); setStatus("idle"); }}>Cancel</Button></div>
      <SaveStatus status={status} message={error} onDismiss={() => setStatus("idle")} />
    </Field>
  );
}
