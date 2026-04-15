import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Loader2, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActiveServices } from "@/hooks/useServices";
import type { Service } from "@/hooks/useServices";
import { createClient } from "@supabase/supabase-js";
import { Progress } from "@/components/ui/progress";

const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 60000;

const BookingForm = () => {
  const { toast } = useToast();
  const { services, categories, loading: svcLoading } = useActiveServices();
  const [form, setForm] = useState({ name: "", phone: "", service: "", details: "", branch: "eldoret" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Payment state (for pay_first services)
  const [selectedService, setSelectedService] = useState<Service | null>(null);
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

  const handleServiceChange = (serviceName: string) => {
    setForm((p) => ({ ...p, service: serviceName }));
    const svc = services.find((s) => s.name === serviceName) || null;
    setSelectedService(svc);
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
          // Now save service request
          await saveServiceRequest(data.receipt || null);
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
    const amount = selectedService?.price || 0;
    if (amount < 1) {
      toast({ title: "Invalid service price", variant: "destructive" });
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

  const saveServiceRequest = async (paymentRef: string | null) => {
    try {
      const { error } = await db.from("service_requests").insert({
        service_id: selectedService?.id || null,
        service_name: form.service,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: null,
        branch: form.branch,
        details: form.details || null,
        price: selectedService?.price || 0,
        paid: !!paymentRef,
        payment_method: paymentRef ? "mpesa" : null,
        payment_reference: paymentRef,
      });
      if (error) throw error;
      setPaymentStep("done");
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Failed to save request", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.service) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    // If pay_first, show payment step
    if (selectedService?.payment_timing === "pay_first") {
      setPaymentStep("payment");
      return;
    }

    // pay_after: submit directly
    setSubmitting(true);
    await saveServiceRequest(null);
    setSubmitting(false);
  };

  const reset = () => {
    stopPolling();
    setForm({ name: "", phone: "", service: "", details: "", branch: "eldoret" });
    setSelectedService(null);
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
              We've received your request for <strong>{form.service}</strong>.
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
            Need help with a complex task? Request a service and we'll guide you through it.
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

              <div>
                <label className="block text-sm font-semibold mb-2">Service Required *</label>
                {svcLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading services...
                  </div>
                ) : (
                  <select
                    value={form.service}
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a service...</option>
                    {groupedServices.map((group) => (
                      <optgroup key={group.id} label={group.name}>
                        {group.services.map((svc) => (
                          <option key={svc.id} value={svc.name}>
                            {svc.name} — KES {svc.price}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                {selectedService && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                      KES {selectedService.price}
                    </span>
                    <span className={`px-2 py-1 rounded ${selectedService.payment_timing === "pay_first" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {selectedService.payment_timing === "pay_first" ? "Pay Before Service (M-Pesa)" : "Pay After Service"}
                    </span>
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
                <label className="block text-sm font-semibold mb-2">Additional Details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm((p) => ({ ...p, details: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  placeholder="Tell us more about what you need..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</span>
                ) : selectedService?.payment_timing === "pay_first" ? (
                  `Proceed to Pay KES ${selectedService.price}`
                ) : (
                  "Submit Service Request"
                )}
              </button>
            </form>
          )}

          {paymentStep === "payment" && selectedService && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground mb-1">M-Pesa Payment Required</h3>
                <p className="text-muted-foreground text-sm">
                  Pay <strong>KES {selectedService.price}</strong> for <strong>{selectedService.name}</strong>
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
                <p><span className="text-muted-foreground">Service:</span> {selectedService.name}</p>
                <p><span className="text-muted-foreground">Amount:</span> KES {selectedService.price}</p>
                <p><span className="text-muted-foreground">Phone:</span> {form.phone}</p>
              </div>

              {paymentStatus === "idle" && (
                <button
                  onClick={triggerPayment}
                  className="w-full rounded-lg bg-primary py-3.5 font-semibold text-primary-foreground hover:brightness-110 shadow-md"
                >
                  Pay KES {selectedService.price} via M-Pesa
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