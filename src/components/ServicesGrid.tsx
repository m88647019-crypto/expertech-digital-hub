import { motion } from "framer-motion";
import { useActiveServices } from "@/hooks/useServices";
import {
  Landmark, FileText, Printer, ScanLine, BookOpen, ShieldCheck, GraduationCap,
  Palette, Monitor, Package, FileCheck, BadgeCheck, ClipboardList, Layers,
  Briefcase, FileUser, Globe, Loader2, type LucideIcon,
} from "lucide-react";

// Map icon names to components
const ICON_MAP: Record<string, LucideIcon> = {
  Landmark, FileText, Printer, ScanLine, BookOpen, ShieldCheck, GraduationCap,
  Palette, Monitor, Package, FileCheck, BadgeCheck, ClipboardList, Layers,
  Briefcase, FileUser, Globe,
};

const ServicesGrid = () => {
  const { services, categories, loading } = useActiveServices();

  // Group services by category
  const grouped = categories.map((cat) => ({
    ...cat,
    services: services.filter((s) => s.category_name === cat.name),
  })).filter((g) => g.services.length > 0);

  // Fallback while loading or if no data from DB
  if (loading) {
    return (
      <section id="services" className="py-16 md:py-20">
        <div className="container px-4 mx-auto text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <section id="services" className="py-16 md:py-20">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Everything You Need, <span className="text-primary">One Stop</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            From government portals to printing and career growth — we handle it all so you don't have to.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {grouped.map((cat, catIdx) => {
            const CatIcon = ICON_MAP[cat.icon] || FileText;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: catIdx * 0.1 }}
                className="bg-card rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                  <CatIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-4">{cat.name}</h3>
                <ul className="space-y-3">
                  {cat.services.map((svc) => (
                    <li key={svc.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{svc.name}</span>
                      {svc.price > 0 && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">KES {svc.price}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;