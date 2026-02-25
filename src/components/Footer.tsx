import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-3">
              EXPERTECH<span className="text-accent">.</span>
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
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:+254746721989" className="hover:text-accent transition-colors">+254 746 721989</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:expertechcomputers1@gmail.com" className="hover:text-accent transition-colors">expertechcomputers1@gmail.com</a>
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

        <div className="border-t border-background/10 pt-6 text-center text-sm text-background/40">
          © {new Date().getFullYear()} Expertech Cyber. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
