import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function SaveStatus({ status = "idle", message = "", onRetry, onDismiss }) {
  if (status === "idle") return null;
  if (status === "saving") return <p className="save-status" role="status" aria-live="polite"><Spinner /> Saving...</p>;
  if (status === "saved") return <p className="save-status success" role="status" aria-live="polite">{message || "Saved."}</p>;
  return (
    <Alert variant="destructive">
      <AlertDescription>{message || "The change could not be saved."}</AlertDescription>
      {(onRetry || onDismiss) && <div className="actions compact-actions">
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
        {onDismiss && <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>}
      </div>}
    </Alert>
  );
}
