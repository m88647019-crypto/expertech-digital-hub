import { motion } from "framer-motion";
import {
  Landmark,
  FileText,
  Printer,
  ScanLine,
  BookOpen,
  ShieldCheck,
  CreditCard,
  GraduationCap,
  Palette,
  Monitor,
  Package,
  Smartphone,
  FileCheck,
  ClipboardList,
  Layers,
  BadgeCheck,
} from "lucide-react";

const categories = [
  {
    title: "Government Portals",
    icon: Landmark,
    services: [
      { name: "KRA (iTax)", icon: FileCheck },
      { name: "eCitizen", icon: BadgeCheck },
      { name: "NTSA / TIMS", icon: ClipboardList },
      { name: "HELB", icon: GraduationCap },
      { name: "SHA / NHIF", icon: ShieldCheck },
      { name: "KASNEB", icon: BookOpen },
    ],
  },
  {
    title: "Document Services",
    icon: FileText,
    services: [
      { name: "High-Speed Printing", icon: Printer },
      { name: "Scanning", icon: ScanLine },
      { name: "Binding", icon: Layers },
      { name: "Lamination", icon: FileText },
      { name: "CV Revamping", icon: FileCheck },
    ],
  },
  {
    title: "Tech & Design",
    icon: Palette,
    services: [
      { name: "Graphic Design", icon: Palette },
      { name: "Software Installation", icon: Monitor },
      { name: "Stationery Sales", icon: Package },
    ],
  },
  {
    title: "Financial Services",
    icon: CreditCard,
    services: [
      { name: "M-Pesa Services", icon: Smartphone },
      { name: "Banking Agency", icon: CreditCard },
    ],
  },
];

const ServicesGrid = () => {
  return (
    <section id="services" className="py-16 md:py-20">
      <div className="container">
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
            From government portals to printing and design — we handle it all so you don't have to.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, catIdx) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: catIdx * 0.1 }}
              className="bg-card rounded-xl p-6 card-shadow hover:card-shadow-hover transition-shadow"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <cat.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-4">{cat.title}</h3>
              <ul className="space-y-3">
                {cat.services.map((svc) => (
                  <li key={svc.name} className="flex items-center gap-2.5 text-sm">
                    <svc.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{svc.name}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
