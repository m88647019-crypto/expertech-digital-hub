import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

const Footer = () => {
  const { settings } = useBusinessSettings();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-3">
              {settings.business_name || "EXPERTECH"}<span className="text-accent">.</span>
            </h3>
            <p className="text-sm text-background/60">
              Your trusted digital partner — making technology accessible to every Kenyan.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#services" className="hover:text-accent transition-colors">Services</a></li>
              <li><a href="#upload" className="hover:text-accent transition-colors">Upload & Print</a></li>
              <li><a href="#booking" className="hover:text-accent transition-colors">Book a Service</a></li>
              <li><a href="#branches" className="hover:text-accent transition-colors">Our Branches</a></li>
              <li><Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href={`tel:${settings.contact_phone}`} className="hover:text-accent transition-colors">
                  {settings.contact_phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href={`mailto:${settings.contact_email}`} className="hover:text-accent transition-colors">
                  {settings.contact_email}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-3">Hours</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Walk-in: Mon–Sat</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span className="text-accent font-semibold">Open 24/7 for Online Consultations</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-background/40">
          <p>© {new Date().getFullYear()} {settings.business_name || "Expertech Cyber"}. All rights reserved.</p>
          <Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
