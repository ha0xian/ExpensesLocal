import { useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SaveStatus } from "./SaveStatus.jsx";

export function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false, onConfirm, onCancel }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try { await onConfirm(); } catch (reason) { setError(reason.message || "The action failed."); }
    finally { setPending(false); }
  }
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next && !pending) onCancel?.(); }}>
      <AlertDialogContent onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }}>
        <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
        <SaveStatus status={error ? "error" : "idle"} message={error} onDismiss={() => setError("")} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={confirm}>{pending ? "Working..." : confirmLabel}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
