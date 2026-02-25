import { MessageCircle } from "lucide-react";

const WhatsAppFAB = () => {
  return (
    <a
      href="https://wa.me/254746721989?text=Hi%20Expertech!%20I%20need%20help%20with..."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[hsl(142,70%,40%)] px-5 py-3.5 font-semibold text-[hsl(0,0%,100%)] shadow-lg transition-transform hover:scale-105 animate-pulse-glow"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Chat with Us</span>
    </a>
  );
};

export default WhatsAppFAB;
