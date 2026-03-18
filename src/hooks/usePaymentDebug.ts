import { useState, useCallback, useRef } from "react";

export type LogLevel = "info" | "success" | "warning" | "error";
export type LogPrefix = "[STK]" | "[POLL]" | "[SUCCESS]" | "[FAILED]" | "[ERROR]" | "[SAVE]" | "[RETRY]" | "[TIMEOUT]";

export interface DebugLog {
  id: string;
  timestamp: Date;
  prefix: LogPrefix;
  level: LogLevel;
  message: string;
  data?: any;
}

export interface PaymentDebugState {
  paymentStatus: "idle" | "pending" | "success" | "failed";
  paying: boolean;
  paid: boolean;
  checkoutRequestID: string | null;
  pollCount: number;
  elapsedSeconds: number;
  receipt: string | null;
}

export function classifyFailure(reason?: string, data?: any): string {
  if (!reason && !data) return "Unknown error";
  const r = (reason || "").toLowerCase();
  const code = data?.ResultCode || data?.resultCode;

  if (code === 1032 || r.includes("cancel")) return "User cancelled the request";
  if (code === 1 || r.includes("insufficient")) return "Insufficient funds";
  if (code === 2001 || r.includes("wrong pin")) return "Wrong M-Pesa PIN entered";
  if (r.includes("timeout") || r.includes("timed out")) return "Request timed out on phone";
  if (r.includes("invalid") && r.includes("phone")) return "Invalid phone number";
  if (r.includes("network") || r.includes("fetch")) return "Network error";
  if (r.includes("server") || r.includes("500")) return "Server error";
  return reason || "Payment was not completed";
}

export function usePaymentDebug() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [debugState, setDebugState] = useState<PaymentDebugState>({
    paymentStatus: "idle",
    paying: false,
    paid: false,
    checkoutRequestID: null,
    pollCount: 0,
    elapsedSeconds: 0,
    receipt: null,
  });
  const idCounter = useRef(0);

  const addLog = useCallback((prefix: LogPrefix, level: LogLevel, message: string, data?: any) => {
    const entry: DebugLog = {
      id: `log-${++idCounter.current}`,
      timestamp: new Date(),
      prefix,
      level,
      message,
      data,
    };
    setLogs((prev) => [...prev.slice(-99), entry]); // keep last 100
    
    // Also console log with prefix
    const consoleFn = level === "error" ? console.error : level === "warning" ? console.warn : console.log;
    consoleFn(`${prefix} ${message}`, data ?? "");
  }, []);

  const updateState = useCallback((partial: Partial<PaymentDebugState>) => {
    setDebugState((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const persistLogs = useCallback(() => {
    try {
      const serialized = logs.map((l) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
      }));
      localStorage.setItem("mpesa_debug_logs", JSON.stringify(serialized));
    } catch { /* silent */ }
  }, [logs]);

  return { logs, debugState, addLog, updateState, clearLogs, persistLogs };
}
