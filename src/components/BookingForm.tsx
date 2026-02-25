import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const serviceOptions = [
  "Passport Application",
  "Business Registration",
  "KRA PIN Registration",
  "Company Tax Returns",
  "NTSA/TIMS Services",
  "HELB Application",
  "SHA/NHIF Registration",
  "CV & Cover Letter",
  "Graphic Design Project",
  "Other",
];

const BookingForm = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", service: "", details: "", branch: "eldoret" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.service) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const msg = encodeURIComponent(
      `Hi Expertech! 📋\n*Service Request*\nName: ${form.name}\nPhone: ${form.phone}\nService: ${form.service}\nBranch: ${form.branch === "eldoret" ? "Eldoret" : "Sikhendu"}\nDetails: ${form.details || "N/A"}`
    );
    window.open(`https://wa.me/254746721989?text=${msg}`, "_blank");
    toast({ title: "Redirecting to WhatsApp...", description: "Complete your booking via WhatsApp." });
  };

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

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit}
          className="bg-card rounded-xl p-6 md:p-8 card-shadow space-y-5"
        >
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
            <select
              value={form.service}
              onChange={(e) => setForm((p) => ({ ...p, service: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a service...</option>
              {serviceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
            className="w-full rounded-lg bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-md"
          >
            Submit Service Request
          </button>
        </motion.form>
      </div>
    </section>
  );
};

export default BookingForm;
