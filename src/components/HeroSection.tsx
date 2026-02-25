import { motion } from "framer-motion";
import { Clock, MapPin } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background Image with overlay */}
      <div className="absolute inset-0">
        <img src={heroBg} alt="Expertech Cyber professional workspace" className="w-full h-full object-cover" />
        <div className="absolute inset-0 hero-gradient opacity-85" />
      </div>

      <div className="container relative z-10 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          {/* 24/7 Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/40 px-4 py-2 mb-6"
          >
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-accent">
              Open 24/7 for Online Consultations
            </span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            Your Digital Partner in{" "}
            <span className="text-accent">Eldoret</span> &{" "}
            <span className="text-accent">Sikhendu</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-xl">
            Government portals, printing, design, and more — your neighborhood tech expert, always ready to serve.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#services"
              className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3.5 font-semibold text-accent-foreground transition-all hover:brightness-110 shadow-lg"
            >
              Explore Services
            </a>
            <a
              href="#upload"
              className="inline-flex items-center justify-center rounded-lg bg-primary-foreground/10 border border-primary-foreground/30 px-6 py-3.5 font-semibold text-primary-foreground transition-all hover:bg-primary-foreground/20"
            >
              Upload & Print
            </a>
          </div>

          <div className="flex items-center gap-2 mt-8 text-primary-foreground/60 text-sm">
            <MapPin className="h-4 w-4" />
            <span>Serving Eldoret Town & Sikhendu, Likuyani</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
