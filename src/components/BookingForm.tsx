import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Loader2, Check, RefreshCw, X, Plus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActiveServices } from "@/hooks/useServices";
import type { Service } from "@/hooks/useServices";
import { createClient } from "@supabase/supabase-js";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 60000;

const BookingForm = () => {
  const { toast } = useToast();
  const { services, categories, loading: svcLoading } = useActiveServices();
  const [form, setForm] = useState({ name: "", phone: "", details: "", branch: "eldoret" });
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Payment state
  const [paymentStep, setPaymentStep] = useState<"form" | "payment" | "done">("form");
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const pollActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const payFirstServices = selectedServices.filter((s) => s.payment_timing === "pay_first");
  const payAfterServices = selectedServices.filter((s) => s.payment_timing === "pay_after");
  const payFirstTotal = payFirstServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const hasPayFirst = payFirstServices.length > 0;

  const addService = (serviceName: string) => {
    if (!serviceName) return;
    const svc = services.find((s) => s.name === serviceName);
    if (!svc) return;
    if (selectedServices.find((s) => s.id === svc.id)) {
      toast({ title: "Service already added", variant: "destructive" });
      return;
    }
    setSelectedServices((prev) => [...prev, svc]);
  };

  const removeService = (id: string) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== id));
  };

  const stopPolling = useCallback(() => {
    pollActiveRef.current = false;
    if (pollIntervalRef.current) { window.clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    setCountdown(0);
  }, []);

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\s+/g, "").replace(/^\+/, "");
    if (digits.startsWith("0")) return "254" + digits.slice(1);
    if (digits.startsWith("254")) return digits;
    return digits;
  };

  const startPolling = (id: string) => {
    if (pollActiveRef.current) return;
    pollActiveRef.current = true;
    let elapsed = 0;
    const totalSeconds = Math.floor(POLL_TIMEOUT / 1000);
    setCountdown(totalSeconds);

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => prev <= 1 ? 0 : prev - 1);
    }, 1000);

    pollIntervalRef.current = window.setInterval(async () => {
      if (!pollActiveRef.current) return;
      elapsed += POLL_INTERVAL;

      if (elapsed >= POLL_TIMEOUT) {
        stopPolling();
        setPaying(false);
        setPaymentStatus("idle");
        toast({ title: "Payment still pending", description: "Check your phone or try again." });
        return;
      }

      try {
        const res = await fetch(`/api/checkStatus?id=${encodeURIComponent(id)}&t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "success") {
          stopPolling();
          setPaymentStatus("success");
          setPaying(false);
          setReceipt(data.receipt || null);
          toast({ title: "Payment successful ✅", description: `Receipt: ${data.receipt || "Confirmed"}` });
          await saveAllRequests(data.receipt || null);
          return;
        }
        if (data.status === "failed") {
          stopPolling();
          setPaymentStatus("failed");
          setFailureMessage(data.reason || "Payment was declined");
          setPaying(false);
          toast({ title: "Payment failed ❌", description: data.reason || "Please try again", variant: "destructive" });
          return;
        }
      } catch { /* continue polling */ }
    }, POLL_INTERVAL);
  };

  const triggerPayment = async () => {
    if (paying || pollActiveRef.current) return;
    if (!form.phone.match(/^(\+?254|0)\d{9}$/)) {
      toast({ title: "Enter a valid phone number", variant: "destructive" });
      return;
    }

    const formatted = formatPhone(form.phone);
    const amount = payFirstTotal;
    if (amount < 1) {
      toast({ title: "Invalid payment amount", variant: "destructive" });
      return;
    }

    setPaying(true);
    setPaymentStatus("pending");
    setFailureMessage(null);
    setReceipt(null);

    try {
      const res = await fetch("/api/stkPush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: formatted, amount }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const result = await res.json();

      if (result.success && result.checkoutRequestID) {
        setCheckoutRequestID(result.checkoutRequestID);
        toast({ title: "STK Push sent", description: "Check your phone to complete payment" });
        startPolling(result.checkoutRequestID);
        return;
      }

      setPaymentStatus("failed");
      setFailureMessage(result.error || "STK Push failed");
      setPaying(false);
      toast({ title: "Payment request failed", description: result.error, variant: "destructive" });
    } catch (err: any) {
      setPaymentStatus("failed");
      setFailureMessage(err.message);
      setPaying(false);
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    }
  };

  const saveAllRequests = async (paymentRef: string | null) => {
    try {
      const rows = selectedServices.map((svc) => ({
        service_id: svc.id,
        service_name: svc.name,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: null,
        branch: form.branch,
        details: form.details || null,
        price: svc.price || 0,
        paid: svc.payment_timing === "pay_first" ? !!paymentRef : false,
        payment_method: svc.payment_timing === "pay_first" && paymentRef ? "mpesa" : null,
        payment_reference: svc.payment_timing === "pay_first" ? paymentRef : null,
      }));
      const { error } = await db.from("service_requests").insert(rows);
      if (error) throw error;
      setPaymentStep("done");
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Failed to save request", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || selectedServices.length === 0) {
      toast({ title: "Please fill in all required fields and select at least one service", variant: "destructive" });
      return;
    }

    if (hasPayFirst) {
      setPaymentStep("payment");
      return;
    }

    setSubmitting(true);
    await saveAllRequests(null);
    setSubmitting(false);
  };

  const reset = () => {
    stopPolling();
    setForm({ name: "", phone: "", details: "", branch: "eldoret" });
    setSelectedServices([]);
    setPaymentStep("form");
    setPaying(false);
    setPaymentStatus("idle");
    setCheckoutRequestID(null);
    setReceipt(null);
    setFailureMessage(null);
    setSubmitted(false);
    setSubmitting(false);
  };

  // Group services by category
  const groupedServices = categories.map((cat) => ({
    ...cat,
    services: services.filter((s) => s.category_name === cat.name),
  })).filter((g) => g.services.length > 0);

  // Check which services need details
  const servicesNeedingDetails = selectedServices.filter((s) => s.requires_details);

  if (submitted) {
    return (
      <section id="booking" className="py-16 md:py-20">
        <div className="container max-w-2xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-8 text-center space-y-4 card-shadow">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Service Request Submitted!</h3>
            <p className="text-muted-foreground">
              We've received your request for <strong>{selectedServices.map((s) => s.name).join(", ")}</strong>.
              {receipt && <><br />Payment receipt: <strong>{receipt}</strong></>}
            </p>
            <p className="text-sm text-muted-foreground">Our team will attend to your request shortly.</p>
            <button onClick={reset} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
              Submit Another Request
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="booking" className="py-16 md:py-20">
      <div className="container max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            <CalendarCheck className="inline h-8 w-8 text-primary mr-2 -mt-1" />
            Book a <span className="text-primary">Service</span>
          </h2>
          <p className="text-muted-foreground">
            Select one or more services. You can combine multiple services in a single request.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-card rounded-xl p-6 md:p-8 card-shadow"
        >
          {paymentStep === "form" && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John Doe"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="0746721989"
                  />
                </div>
              </div>

              {/* Multi-service selector */}
              <div>
                <label className="block text-sm font-semibold mb-2">Services Required *</label>
                {svcLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading services...
                  </div>
                ) : (
                  <select
                    value=""
                    onChange={(e) => addService(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">+ Add a service...</option>
                    {groupedServices.map((group) => (
                      <optgroup key={group.id} label={group.name}>
                        {group.services.map((svc) => (
                          <option
                            key={svc.id}
                            value={svc.name}
                            disabled={!!selectedServices.find((s) => s.id === svc.id)}
                          >
                            {svc.name} — KES {svc.price}
                            {selectedServices.find((s) => s.id === svc.id) ? " ✓" : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}

                {/* Selected services chips */}
                {selectedServices.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedServices.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{svc.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">KES {svc.price}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${svc.payment_timing === "pay_first" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                            >
                              {svc.payment_timing === "pay_first" ? "Pay First" : "Pay After"}
                            </Badge>
                            {svc.requires_details && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Info className="h-3 w-3 mr-0.5" /> {svc.detail_hint || "Details needed"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeService(svc.id)}
                          className="ml-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {/* Price summary */}
                    <div className="bg-primary/5 rounded-lg px-3 py-2 text-sm">
                      <div className="flex justify-between font-semibold">
                        <span>Total ({selectedServices.length} service{selectedServices.length > 1 ? "s" : ""})</span>
                        <span>KES {totalPrice.toLocaleString()}</span>
                      </div>
                      {hasPayFirst && payAfterServices.length > 0 && (
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Pay now (M-Pesa):</span>
                            <span>KES {payFirstTotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pay after service:</span>
                            <span>KES {(totalPrice - payFirstTotal).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Preferred Branch</label>
                <div className="flex gap-3">
                  {([["eldoret", "Eldoret"], ["sikhendu", "Sikhendu"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, branch: val }))}
                      className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                        form.branch === val
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Additional Details
                  {servicesNeedingDetails.length > 0 && (
                    <span className="text-xs font-normal text-amber-600 ml-1">
                      — {servicesNeedingDetails.map((s) => s.detail_hint || s.name).join("; ")}. Include what you know; our team will contact you for anything missing.
                    </span>
                  )}
                </label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder={
                    servicesNeedingDetails.length > 0
                      ? "Provide any details you have (KRA PIN, ID number, etc). Don't worry if you're unsure — our team will reach out."
                      : "Tell us more about what you need..."
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Don't have all the details? No worries — submit your request and our team will contact you to gather any missing information.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || selectedServices.length === 0}
                className="w-full rounded-lg bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
                ) : hasPayFirst ? (
                  `Proceed to Pay KES ${payFirstTotal.toLocaleString()}`
                ) : (
                  `Submit ${selectedServices.length} Service Request${selectedServices.length > 1 ? "s" : ""}`
                )}
              </button>
            </form>
          )}

          {paymentStep === "payment" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground mb-1">M-Pesa Payment Required</h3>
                <p className="text-muted-foreground text-sm">
                  Pay <strong>KES {payFirstTotal.toLocaleString()}</strong> for {payFirstServices.length} service{payFirstServices.length > 1 ? "s" : ""} that require upfront payment
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                {payFirstServices.map((svc) => (
                  <div key={svc.id} className="flex justify-between">
                    <span>{svc.name}</span>
                    <span className="font-medium">KES {svc.price}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-1 flex justify-between font-bold">
                  <span>Total</span>
                  <span>KES {payFirstTotal.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground"><span className="text-muted-foreground">Phone:</span> {form.phone}</p>
                {payAfterServices.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    + {payAfterServices.length} service{payAfterServices.length > 1 ? "s" : ""} (KES {(totalPrice - payFirstTotal).toLocaleString()}) to pay after completion
                  </p>
                )}
              </div>

              {paymentStatus === "idle" && (
                <button
                  onClick={triggerPayment}
                  className="w-full rounded-lg bg-primary py-3.5 font-semibold text-primary-foreground hover:brightness-110 shadow-md"
                >
                  Pay KES {payFirstTotal.toLocaleString()} via M-Pesa
                </button>
              )}

              {paymentStatus === "pending" && (
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium">Waiting for M-Pesa confirmation...</p>
                  <p className="text-xs text-muted-foreground">Check your phone for the STK push prompt</p>
                  {countdown > 0 && (
                    <Progress value={((60 - countdown) / 60) * 100} className="h-1" />
                  )}
                  <p className="text-xs text-muted-foreground">{countdown}s remaining</p>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="text-center space-y-3">
                  <p className="text-sm text-destructive font-medium">{failureMessage || "Payment failed"}</p>
                  <button
                    onClick={() => { setPaymentStatus("idle"); setFailureMessage(null); }}
                    className="flex items-center gap-2 mx-auto text-sm text-primary font-medium"
                  >
                    <RefreshCw className="h-4 w-4" /> Try Again
                  </button>
                </div>
              )}

              <button
                onClick={() => setPaymentStep("form")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to form
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default BookingForm;
