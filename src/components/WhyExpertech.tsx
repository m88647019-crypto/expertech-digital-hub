import { motion } from "framer-motion";
import { Shield, Zap, Clock, Heart } from "lucide-react";

const reasons = [
  {
    icon: Shield,
    title: "Privacy First",
    desc: "Your documents and data are handled with the utmost confidentiality.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    desc: "High-speed printing, quick turnaround, and instant digital services.",
  },
  {
    icon: Clock,
    title: "24/7 Available",
    desc: "Online consultations for KRA, eCitizen, and more — anytime you need.",
  },
  {
    icon: Heart,
    title: "Community Driven",
    desc: "From the heart of Eldoret to Sikhendu, we make digital simple for you.",
  },
];

const WhyExpertech = () => {
  return (
    <section className="py-16 md:py-20 bg-secondary">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Why <span className="text-primary">Expertech?</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We bridge the digital gap with privacy, speed, and 24/7 availability. From the heart of Eldoret to the community of Sikhendu, we make the digital world simple for you.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                <r.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-bold mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyExpertech;
