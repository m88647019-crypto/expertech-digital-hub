import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Bug } from "lucide-react";
import type { DebugLog, PaymentDebugState } from "@/hooks/usePaymentDebug";

interface Props {
  logs: DebugLog[];
  state: PaymentDebugState;
  onClear: () => void;
  countdown: number;
}

const levelColors: Record<string, string> = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

const statusIndicator: Record<string, { color: string; label: string }> = {
  idle: { color: "bg-muted-foreground", label: "Idle" },
  pending: { color: "bg-amber-400", label: "Pending" },
  success: { color: "bg-emerald-500", label: "Success" },
  failed: { color: "bg-red-500", label: "Failed" },
};

const PaymentDebugPanel = ({ logs, state, onClear, countdown }: Props) => {
  const [open, setOpen] = useState(false);

  const indicator = statusIndicator[state.paymentStatus] || statusIndicator.idle;

  return (
    <div className="mt-4 rounded-lg border border-border bg-card overflow-hidden text-xs">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/60 hover:bg-muted transition-colors"
      >
        <span className="flex items-center gap-2 font-medium text-muted-foreground">
          <Bug className="h-3.5 w-3.5" />
          Debug Panel
          <span className={`inline-block h-2 w-2 rounded-full ${indicator.color}`} />
          <span className="text-[10px]">{indicator.label}</span>
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-3 space-y-3">
          {/* State overview */}
          <div className="grid grid-cols-2 gap-2">
            <StateChip label="Status" value={state.paymentStatus} />
            <StateChip label="Paying" value={state.paying ? "true" : "false"} />
            <StateChip label="Paid" value={state.paid ? "true" : "false"} />
            <StateChip label="Polls" value={String(state.pollCount)} />
            <StateChip label="Elapsed" value={`${state.elapsedSeconds}s`} />
            {countdown > 0 && <StateChip label="Timeout in" value={`${countdown}s`} />}
            {state.checkoutRequestID && (
              <div className="col-span-2">
                <StateChip label="CheckoutID" value={state.checkoutRequestID} />
              </div>
            )}
            {state.receipt && (
              <div className="col-span-2">
                <StateChip label="Receipt" value={state.receipt} />
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">Live Logs ({logs.length})</span>
            <button type="button" onClick={onClear} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto rounded border border-border bg-background p-2 font-mono space-y-0.5">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-2">No logs yet</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-1.5 leading-tight">
                  <span className="text-muted-foreground shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 font-bold ${levelColors[log.level] || "text-foreground"}`}>
                    {log.prefix}
                  </span>
                  <span className="text-foreground break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StateChip = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded bg-muted px-2 py-1">
    <span className="text-muted-foreground">{label}: </span>
    <span className="font-medium text-foreground break-all">{value}</span>
  </div>
);

export default PaymentDebugPanel;
