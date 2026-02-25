import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const branches = {
  eldoret: {
    name: "Eldoret Branch",
    address: "Eldoret Town Centre, Eldoret, Kenya",
    phone: "+254 746 721989",
    hours: "Mon–Sat: 7AM–9PM | Online: 24/7",
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15959.89!2d35.27!3d0.52!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMMKwMzEnMTIuMCJOIDM1wrAxNicxMi4wIkU!5e0!3m2!1sen!2ske!4v1700000000000",
  },
  sikhendu: {
    name: "Sikhendu Branch",
    address: "Sikhendu Market, Likuyani, Kakamega County",
    phone: "+254 746 721989",
    hours: "Mon–Sat: 8AM–7PM | Online: 24/7",
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15959.89!2d34.95!3d0.55!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMMKwMzMnMDAuMCJOIDM0wrA1NycwMC4wIkU!5e0!3m2!1sen!2ske!4v1700000000001",
  },
};

const BranchToggle = () => {
  const [active, setActive] = useState<"eldoret" | "sikhendu">("eldoret");
  const branch = branches[active];

  return (
    <section id="branches" className="py-16 md:py-20 bg-secondary">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          Our <span className="text-primary">Branches</span>
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-md mx-auto">
          Visit us in person or reach out online — we're always here for you.
        </p>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-muted rounded-lg p-1 gap-1">
            {(["eldoret", "sikhendu"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`relative px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  active === key
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active === key && (
                  <motion.div
                    layoutId="branch-tab"
                    className="absolute inset-0 bg-primary rounded-md"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">
                  {key === "eldoret" ? "Eldoret" : "Sikhendu"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto"
          >
            {/* Info card */}
            <div className="bg-card rounded-xl p-6 card-shadow space-y-4">
              <h3 className="text-xl font-bold">{branch.name}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                  <span>{branch.address}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-primary" />
                  <a href={`tel:${branch.phone}`} className="hover:text-primary transition-colors">
                    {branch.phone}
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-primary" />
                  <a href="mailto:expertechcomputers1@gmail.com" className="hover:text-primary transition-colors">
                    expertechcomputers1@gmail.com
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-primary" />
                  <span>{branch.hours}</span>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="bg-card rounded-xl overflow-hidden card-shadow min-h-[250px]">
              <iframe
                src={branch.mapEmbed}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 250 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${branch.name} location`}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default BranchToggle;
