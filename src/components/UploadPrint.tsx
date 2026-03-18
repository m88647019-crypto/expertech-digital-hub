import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, Image as ImageIcon, Check, ChevronRight, ChevronLeft,
  Loader2, MessageCircle, RefreshCw, FileUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { usePaymentDebug, classifyFailure } from "@/hooks/usePaymentDebug";
import PaymentDebugPanel from "@/components/PaymentDebugPanel";

// ── Types ──────────────────────────────────────────────────────────────
interface UploadedFile {
  file: File;
  preview?: string;
  pageCount: number;
  manualPageCount: boolean;
  sizeLabel: string;
}

type PrintType = "bw" | "color";
type PaperSize = "A4" | "A3" | "A5" | "Letter";

const PRICE: Record<PrintType, number> = { bw: 10, color: 20 };
const STEPS = ["Upload Files", "Print Settings", "Price Summary", "Payment", "Confirmation"];
const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 60000;

// ── Helpers ────────────────────────────────────────────────────────────
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getPdfPageCount(file: File): Promise<number> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjsLib.getDocument({ data }).promise;
    return doc.numPages;
  } catch {
    return 0;
  }
}

// ── Component ──────────────────────────────────────────────────────────
const UploadPrint = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Step 1 — files
  const [files, setFiles] = useState<UploadedFile[]>([]);

  // Step 2 — settings
  const [printType, setPrintType] = useState<PrintType>("bw");
  const [copies, setCopies] = useState(1);
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");

  // Step 4 — payment
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "done" | "failed">("idle");
  const orderSavedRef = useRef(false);

  // refs to prevent leaks
  const pollIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const pollActiveRef = useRef(false);

  // debug system
  const { logs, debugState, addLog, updateState, clearLogs, persistLogs } = usePaymentDebug();

  // derived
  const totalPages = files.reduce((s, f) => s + f.pageCount, 0);
  const pricePerPage = PRICE[printType];
  const totalPrice = totalPages * copies * pricePerPage;

  // Sync debug state
  useEffect(() => {
    updateState({ paymentStatus, paying, paid, checkoutRequestID, receipt });
  }, [paymentStatus, paying, paid, checkoutRequestID, receipt, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File handling ──
  const addFiles = useCallback(async (incoming: FileList | null) => {
    if (!incoming) return;
    const allowed = Array.from(incoming).filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/")
    );
    const remaining = 5 - files.length;
    const batch = allowed.slice(0, remaining);

    const processed: UploadedFile[] = await Promise.all(
      batch.map(async (file) => {
        const sizeLabel = formatSize(file.size);
        if (file.type === "application/pdf") {
          const pageCount = await getPdfPageCount(file);
          return { file, pageCount, manualPageCount: pageCount === 0, sizeLabel };
        }
        const preview = URL.createObjectURL(file);
        return { file, preview, pageCount: 1, manualPageCount: false, sizeLabel };
      })
    );
    setFiles((prev) => [...prev, ...processed]);
  }, [files.length]);

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      const f = prev[idx];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const setManualPages = (idx: number, count: number) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, pageCount: Math.max(1, count) } : f))
    );
  };

  // ── Navigation guards ──
  const canNext = () => {
    if (step === 0) return files.length > 0;
    if (step === 3) return paid;
    return true;
  };

  const next = () => {
    if (step === 0 && files.length === 0) {
      toast({ title: "Upload at least one file", variant: "destructive" });
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  // ── Stop polling helper ──
  const stopPolling = useCallback(() => {
    pollActiveRef.current = false;
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
  }, []);

  // ── Upload files then save order (non-blocking, idempotent) ──
  const uploadAndSaveOrder = useCallback(async (crid: string, rcpt: string | null) => {
    // Idempotency guard
    if (orderSavedRef.current) {
      addLog("[SAVE]", "info", "Order already saved, skipping duplicate");
      return;
    }
    orderSavedRef.current = true;

    // Step 1: Upload files
    try {
      setUploadStatus("uploading");
      addLog("[SAVE]", "info", "Uploading files...");

      const uploadedPaths: string[] = [];
      for (const f of files) {
        const formData = new FormData();
        formData.append("file", f.file);
        formData.append("checkoutRequestID", crid);

        const uploadRes = await fetch("/api/uploadFile", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => "");
          addLog("[SAVE]", "warning", `File upload failed for ${f.file.name}: ${uploadRes.status}`, errText);
          // Continue with other files
        } else {
          const uploadData = await uploadRes.json().catch(() => ({}));
          uploadedPaths.push(uploadData.filePath || f.file.name);
          addLog("[SAVE]", "success", `Uploaded: ${f.file.name}`);
        }
      }

      setUploadStatus("done");
      addLog("[SAVE]", "success", `All files uploaded (${uploadedPaths.length}/${files.length})`);

      // Step 2: Save order to DB
      addLog("[SAVE]", "info", "Saving order to database...");
      const res = await fetch("/api/saveOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutRequestID: crid,
        }),
      });

      if (!res.ok) {
        addLog("[SAVE]", "warning", `Save returned ${res.status}`, await res.text().catch(() => ""));
        return;
      }

      addLog("[SAVE]", "success", "Order saved successfully");
    } catch (err: any) {
      addLog("[SAVE]", "error", `Upload/save failed: ${err.message}`);
      setUploadStatus("failed");
    }
  }, [files, addLog]);

  // ── Payment via real STK Push ──
  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\s+/g, "").replace(/^\+/, "");
    if (digits.startsWith("0")) return "254" + digits.slice(1);
    if (digits.startsWith("254")) return digits;
    return digits;
  };

  const triggerPayment = async () => {
    // Prevent duplicate
    if (paying || pollActiveRef.current) {
      addLog("[STK]", "warning", "Payment already in progress, ignoring duplicate click");
      return;
    }

    if (!phone.match(/^(\+?254|0)\d{9}$/)) {
      toast({ title: "Enter a valid Kenyan phone number", variant: "destructive" });
      return;
    }

    const formatted = formatPhone(phone);
    setPaying(true);
    setPaymentStatus("pending");
    setFailureMessage(null);
    setReceipt(null);

    addLog("[STK]", "info", `Initiating STK Push`, { phone: formatted, amount: totalPrice, timestamp: new Date().toISOString() });

    try {
      const res = await fetch("/api/stkPush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatted, amount: totalPrice }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        addLog("[STK]", "error", `Server error ${res.status}`, errText);
        throw new Error(`Server error: ${res.status}`);
      }

      const text = await res.text();
      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        addLog("[STK]", "error", "Invalid JSON response from /api/stkPush", text);
        throw new Error("Invalid JSON from /api/stkPush");
      }

      addLog("[STK]", "info", `STK Push response received`, { success: result.success, checkoutRequestID: result.checkoutRequestID });

      if (result.success && result.checkoutRequestID) {
        setCheckoutRequestID(result.checkoutRequestID);
        toast({ title: "STK Push sent", description: "Check your phone to complete payment" });
        addLog("[STK]", "success", `STK Push sent. CheckoutRequestID: ${result.checkoutRequestID}`);
        startPolling(result.checkoutRequestID);
        return;
      }

      // STK push didn't succeed
      const reason = classifyFailure(result.error || result.errorMessage, result);
      addLog("[STK]", "error", `STK Push rejected: ${reason}`, result);
      setPaymentStatus("failed");
      setFailureMessage(reason);
      setPaying(false);
      toast({ title: "Payment request failed", description: reason, variant: "destructive" });
    } catch (err: any) {
      const reason = classifyFailure(err.message);
      addLog("[ERROR]", "error", `STK Push exception: ${err.message}`);
      setPaymentStatus("failed");
      setFailureMessage(reason);
      setPaying(false);
      toast({ title: "Something went wrong", description: reason, variant: "destructive" });
    }
  };

  const startPolling = (id: string) => {
    // Prevent multiple polling sessions
    if (pollActiveRef.current) {
      addLog("[POLL]", "warning", "Polling already active, skipping duplicate");
      return;
    }

    pollActiveRef.current = true;
    let elapsed = 0;
    let pollCount = 0;
    const totalSeconds = Math.floor(POLL_TIMEOUT / 1000);
    setCountdown(totalSeconds);

    addLog("[POLL]", "info", `Starting polling for ${id}, timeout ${totalSeconds}s`);

    // Countdown timer
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    pollIntervalRef.current = window.setInterval(async () => {
      if (!pollActiveRef.current) return;

      elapsed += POLL_INTERVAL;
      pollCount++;
      updateState({ pollCount, elapsedSeconds: Math.floor(elapsed / 1000) });

      // Timeout
      if (elapsed >= POLL_TIMEOUT) {
        addLog("[TIMEOUT]", "warning", `Polling timed out after ${Math.floor(elapsed / 1000)}s (${pollCount} polls)`);
        stopPolling();
        setPaying(false);
        setPaymentStatus("idle");
        setFailureMessage(null);
        persistLogs();
        toast({ title: "Payment still pending", description: "No response yet. Please check your phone or try again." });
        return;
      }

      try {
        addLog("[POLL]", "info", `Poll #${pollCount} for ${id}`);

        const res = await fetch(`/api/checkStatus?id=${encodeURIComponent(id)}&t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) {
          addLog("[POLL]", "warning", `Poll returned ${res.status}`);
          return; // continue polling
        }

        const text = await res.text();
        let data: any;

        try {
          data = JSON.parse(text);
        } catch {
          addLog("[POLL]", "error", "Invalid JSON from /api/checkStatus", text);
          return; // continue polling
        }

        addLog("[POLL]", "info", `Status: ${data.status}`, data);

        if (data.status === "success") {
          addLog("[SUCCESS]", "success", `Payment confirmed! Receipt: ${data.receipt || "N/A"}, Duration: ${Math.floor(elapsed / 1000)}s`);
          stopPolling();
          setPaymentStatus("success");
          setPaid(true);
          setPaying(false);
          setReceipt(data.receipt || null);
          persistLogs();
          toast({ title: "Payment successful ✅", description: `Receipt: ${data.receipt || "Confirmed"}` });

          // Save to Supabase (non-blocking)
          uploadAndSaveOrder(id, data.receipt || null);
          return;
        }

        if (data.status === "failed") {
          const reason = classifyFailure(data.reason, data);
          addLog("[FAILED]", "error", `Payment failed: ${reason}`, data);
          stopPolling();
          setPaymentStatus("failed");
          setFailureMessage(reason);
          setPaying(false);
          persistLogs();
          toast({ title: "Payment failed ❌", description: reason, variant: "destructive" });
          return;
        }

        // "pending" — continue polling silently
      } catch (error: any) {
        addLog("[ERROR]", "warning", `Poll network error: ${error.message}`);
        // continue polling on network errors
      }
    }, POLL_INTERVAL);
  };

  // ── Retry ──
  const retryPayment = () => {
    if (pollActiveRef.current) return;
    addLog("[RETRY]", "info", "User initiated retry");
    setPaymentStatus("idle");
    setFailureMessage(null);
    setPaying(false);
    setPaid(false);
    setCheckoutRequestID(null);
    setReceipt(null);
  };

  // ── WhatsApp ──
  const sendWhatsApp = () => {
    const fileNames = files.map((f) => f.file.name).join("\n");
    const msg = encodeURIComponent(
      `Hello Expertech, I have submitted a print request.\n\nFiles:\n${fileNames}\n\nPrint Type: ${printType === "bw" ? "Black & White" : "Color"}\nPages: ${totalPages}\nCopies: ${copies}\nPaper Size: ${paperSize}\n\nTotal Price: KES ${totalPrice.toLocaleString()}\n\nPlease confirm when ready.`
    );
    window.open(`https://wa.me/254746721989?text=${msg}`, "_blank");
  };

  const reset = () => {
    stopPolling();
    files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    setFiles([]);
    setPrintType("bw");
    setCopies(1);
    setPaperSize("A4");
    setPhone("");
    setPaying(false);
    setPaid(false);
    setPaymentStatus("idle");
    setCheckoutRequestID(null);
    setReceipt(null);
    setFailureMessage(null);
    setCountdown(0);
    setUploadStatus("idle");
    orderSavedRef.current = false;
    clearLogs();
    setStep(0);
  };

  // ── Drop handler ──
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  // ── Render steps ──
  const renderStep = () => {
    switch (step) {
      // ─── Step 1: Upload ───
      case 0:
        return (
          <div className="space-y-4">
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 text-primary/60 mb-3" />
              <span className="text-sm font-medium text-foreground">Click or drag files here</span>
              <span className="text-xs text-muted-foreground mt-1">Max 5 files · PDF, JPG, PNG</span>
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-muted rounded-lg px-3 py-2.5">
                    {f.preview ? (
                      <img src={f.preview} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <FileText className="h-10 w-10 text-primary/70 flex-shrink-0 p-1.5 bg-primary/10 rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.sizeLabel}
                        {f.file.type === "application/pdf" && (
                          <>
                            {" · "}
                            {f.manualPageCount ? (
                              <span className="inline-flex items-center gap-1">
                                Pages:{" "}
                                <input
                                  type="number"
                                  min={1}
                                  value={f.pageCount}
                                  onChange={(e) => setManualPages(i, parseInt(e.target.value) || 1)}
                                  className="w-14 h-5 rounded border border-input bg-background px-1 text-xs"
                                />
                              </span>
                            ) : (
                              `${f.pageCount} page${f.pageCount !== 1 ? "s" : ""}`
                            )}
                          </>
                        )}
                        {f.file.type.startsWith("image/") && " · 1 page"}
                      </p>
                    </div>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground text-right">
                  Total: <strong>{totalPages}</strong> page{totalPages !== 1 ? "s" : ""} across {files.length} file{files.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        );

      // ─── Step 2: Settings ───
      case 1:
        return (
          <div className="space-y-6">
            {/* Print Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">Print Type</label>
              <div className="grid grid-cols-2 gap-3">
                {([["bw", "Black & White", "KES 10/page"], ["color", "Color", "KES 20/page"]] as const).map(
                  ([val, label, price]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPrintType(val)}
                      className={`rounded-xl border-2 py-4 text-center transition-all ${
                        printType === val
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs mt-0.5 opacity-70">{price}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <label className="block text-sm font-semibold mb-2">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(["A4", "A3", "A5", "Letter"] as PaperSize[]).map((s) => (
                  <option key={s} value={s}>{s}{s === "A4" ? " (default)" : ""}</option>
                ))}
              </select>
            </div>

            {/* Copies */}
            <div>
              <label className="block text-sm font-semibold mb-2">Number of Copies</label>
              <input
                type="number"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        );

      // ─── Step 3: Price Summary ───
      case 2:
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border">
              <SummaryRow label="Files" value={files.map((f) => f.file.name).join(", ")} />
              <SummaryRow label="Total Pages" value={String(totalPages)} />
              <SummaryRow label="Copies" value={String(copies)} />
              <SummaryRow label="Print Type" value={printType === "bw" ? "Black & White" : "Color"} />
              <SummaryRow label="Paper Size" value={paperSize} />
              <SummaryRow label="Price per Page" value={`KES ${pricePerPage}`} />
              <div className="flex justify-between px-4 py-3 bg-primary/5">
                <span className="font-bold text-foreground">Total Cost</span>
                <span className="font-bold text-primary text-lg">KES {totalPrice.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {totalPages} pages × {copies} copies × KES {pricePerPage} = KES {totalPrice.toLocaleString()}
            </p>
          </div>
        );

      // ─── Step 4: Payment ───
      case 3:
        return (
          <div className="space-y-6">
            {!paid ? (
              <>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                  <p className="text-2xl font-bold text-primary">KES {totalPrice.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">Amount to pay</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0746721989"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={paying}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>

                {paymentStatus === "pending" && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-center space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Waiting for payment confirmation…
                    </p>
                    {countdown > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Timeout in <span className="font-mono font-bold text-foreground">{countdown}s</span>
                      </p>
                    )}
                  </div>
                )}

                {paymentStatus === "failed" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center space-y-2">
                    <p className="text-sm text-destructive font-medium">
                      {failureMessage || "Payment failed. Please try again."}
                    </p>
                    <button
                      type="button"
                      onClick={retryPayment}
                      className="text-xs text-destructive underline hover:no-underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={paymentStatus === "failed" ? retryPayment : triggerPayment}
                  disabled={paying}
                  className="w-full rounded-lg bg-[#4CAF50] py-3.5 font-semibold text-white transition-all hover:brightness-110 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {paymentStatus === "pending" ? "Waiting for payment…" : "Sending STK Push…"}
                    </>
                  ) : paymentStatus === "failed" ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Retry Payment
                    </>
                  ) : (
                    "Pay with M-Pesa"
                  )}
                </button>

                {/* Debug Panel */}
                <PaymentDebugPanel
                  logs={logs}
                  state={debugState}
                  onClear={clearLogs}
                  countdown={countdown}
                />
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                  <Check className="h-7 w-7 text-[#4CAF50]" />
                </div>
                <h3 className="text-lg font-bold">Payment Successful</h3>
                {receipt && (
                  <p className="text-xs text-muted-foreground font-mono">Receipt: {receipt}</p>
                )}
                {uploadStatus === "uploading" && (
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading files…
                  </p>
                )}
                {uploadStatus === "done" && (
                  <p className="text-sm text-[#4CAF50]">Payment successful and file uploaded ✅</p>
                )}
                {uploadStatus === "failed" && (
                  <p className="text-sm text-destructive">File upload failed — please contact support.</p>
                )}
                {uploadStatus === "idle" && (
                  <p className="text-sm text-muted-foreground">Your print order has been received.</p>
                )}
              </div>
            )}
          </div>
        );

      // ─── Step 5: Confirmation ───
      case 4:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Order Confirmed!</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Your print order has been received. You will be notified on WhatsApp when your print is ready.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border text-left text-sm">
              <SummaryRow label="Files" value={files.map((f) => f.file.name).join(", ")} />
              <SummaryRow label="Pages" value={String(totalPages)} />
              <SummaryRow label="Copies" value={String(copies)} />
              <SummaryRow label="Print Type" value={printType === "bw" ? "Black & White" : "Color"} />
              {receipt && <SummaryRow label="Receipt" value={receipt} />}
              <div className="flex justify-between px-4 py-3 bg-primary/5 font-bold">
                <span>Total</span>
                <span className="text-primary">KES {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={sendWhatsApp}
                className="flex-1 rounded-lg bg-[#25D366] py-3 font-semibold text-white flex items-center justify-center gap-2 hover:brightness-110 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
                Send on WhatsApp
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-lg border-2 border-primary py-3 font-semibold text-primary flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Upload Another
              </button>
            </div>
          </div>
        );
    }
  };

  // ── Main render ──
  return (
    <section id="upload" className="py-16 md:py-20 bg-secondary">
      <div className="container max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Upload & <span className="text-primary">Print</span>
          </h2>
          <p className="text-muted-foreground">
            Professional online printing — upload, configure, pay, and pick up. It's that simple.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-xl card-shadow overflow-hidden"
        >
          {/* Progress bar */}
          <div className="px-6 pt-6 pb-2">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((label, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      i < step
                        ? "bg-primary text-primary-foreground"
                        : i === step
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className="text-[10px] mt-1 text-muted-foreground hidden sm:block">{label}</span>
                </div>
              ))}
            </div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          </div>

          {/* Step content */}
          <div className="p-6 md:p-8 min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          {step < 4 && (
            <div className="px-6 pb-6 flex gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={prev}
                  className="flex-1 rounded-lg border-2 border-border py-3 font-semibold text-foreground flex items-center justify-center gap-1 hover:bg-muted transition-all"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button
                type="button"
                onClick={next}
                disabled={!canNext()}
                className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground flex items-center justify-center gap-1 hover:brightness-110 transition-all shadow-md disabled:opacity-50"
              >
                {step === 3 ? "View Confirmation" : "Continue"} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

// ── Summary row helper ─────────────────────────────────────────────────
const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between px-4 py-2.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground text-right max-w-[60%] truncate">{value}</span>
  </div>
);

export default UploadPrint;
