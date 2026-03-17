import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, Image as ImageIcon, Check, ChevronRight, ChevronLeft,
  Loader2, MessageCircle, RefreshCw, FileUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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

  // derived
  const totalPages = files.reduce((s, f) => s + f.pageCount, 0);
  const pricePerPage = PRICE[printType];
  const totalPrice = totalPages * copies * pricePerPage;

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

  // cleanup previews
  useEffect(() => {
    return () => files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Payment via real STK Push ──
  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\s+/g, "").replace(/^\+/, "");
    if (digits.startsWith("0")) return "254" + digits.slice(1);
    if (digits.startsWith("254")) return digits;
    return digits;
  };

  const triggerPayment = async () => {
    if (!phone.match(/^(\+?254|0)\d{9}$/)) {
      toast({ title: "Enter a valid Kenyan phone number", variant: "destructive" });
      return;
    }

    setPaying(true);
    setPaymentStatus("pending");

    try {
      const res = await fetch("/api/stkPush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatPhone(phone), amount: totalPrice }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const text = await res.text();
      let result: any;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from /api/stkPush");
      }

      console.log("STK Push response:", result);

      if (result.success && result.checkoutRequestID) {
        console.log("📤 Sent CheckoutRequestID:", result.checkoutRequestID);
        setCheckoutRequestID(result.checkoutRequestID);
        toast({ title: "STK Push sent", description: "Check your phone to complete payment" });
        startPolling(result.checkoutRequestID);
        return;
      }

      setPaymentStatus("failed");
      setPaying(false);
      toast({ title: "Payment request failed", description: result.error || "Something went wrong, try again", variant: "destructive" });
    } catch (err) {
      console.error("STK Push error:", err);
      setPaymentStatus("failed");
      setPaying(false);
      toast({ title: "Something went wrong, try again", description: "Payment request failed", variant: "destructive" });
    }
  };

  const startPolling = (id: string) => {
    let elapsed = 0;
    const POLL_INTERVAL = 3000;
    const TIMEOUT = 60000;

    const interval = window.setInterval(async () => {
      elapsed += POLL_INTERVAL;

      if (elapsed >= TIMEOUT) {
        window.clearInterval(interval);
        setPaying(false);
        setPaymentStatus("idle");
        toast({ title: "Payment still pending", description: "No response yet. Please check your phone or try again." });
        return;
      }

      try {
        const res = await fetch(`/api/checkStatus?id=${encodeURIComponent(id)}&t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          console.warn("Status poll failed:", res.status);
          return;
        }

        const text = await res.text();
        let data: any;

        try {
          data = JSON.parse(text);
        } catch {
          console.error("Invalid JSON from /api/checkStatus");
          return;
        }

        console.log("🔄 Queried ID:", id, data);

        if (data.status === "success") {
          window.clearInterval(interval);
          setPaymentStatus("success");
          setPaid(true);
          setPaying(false);
          toast({ title: "Payment successful ✅", description: `Receipt: ${data.receipt || "Confirmed"}` });
          return;
        }

        if (data.status === "failed") {
          window.clearInterval(interval);
          setPaymentStatus("failed");
          setPaying(false);
          toast({ title: "Payment failed ❌", description: data.reason || "The transaction was not completed.", variant: "destructive" });
        }
      } catch (error) {
        console.warn("Polling error, retrying:", error);
      }
    }, POLL_INTERVAL);
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
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {paymentStatus === "pending" && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Waiting for payment confirmation…
                    </p>
                  </div>
                )}

                {paymentStatus === "failed" && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-center">
                    <p className="text-sm text-destructive">Payment failed. Please try again.</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={triggerPayment}
                  disabled={paying}
                  className="w-full rounded-lg bg-[#4CAF50] py-3.5 font-semibold text-white transition-all hover:brightness-110 shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {paymentStatus === "pending" ? "Waiting for payment…" : "Sending STK Push…"}
                    </>
                  ) : paymentStatus === "failed" ? (
                    "Retry Payment"
                  ) : (
                    "Pay with M-Pesa"
                  )}
                </button>
              </>
            ) : (
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto h-14 w-14 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                  <Check className="h-7 w-7 text-[#4CAF50]" />
                </div>
                <h3 className="text-lg font-bold">Payment Successful</h3>
                <p className="text-sm text-muted-foreground">Your print order has been received.</p>
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
