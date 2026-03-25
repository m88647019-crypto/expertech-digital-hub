import { Database } from "@/integrations/supabase/types";

export type PrintJob = Database["public"]["Tables"]["print_jobs"]["Row"];
export type PrintJobInsert = Database["public"]["Tables"]["print_jobs"]["Insert"];
export type PrintJobUpdate = Database["public"]["Tables"]["print_jobs"]["Update"];

export type JobStatus = "pending" | "processing" | "printing" | "completed" | "collected" | "cancelled";
export type PaymentMethod = "cash" | "mpesa" | "card";

export const JOB_STATUSES: JobStatus[] = ["pending", "processing", "printing", "completed", "collected", "cancelled"];

export const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  printing: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  collected: "bg-teal-100 text-teal-800 border-teal-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
];
