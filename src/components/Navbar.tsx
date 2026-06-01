import { useState, useEffect, useCallback } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { label: "Services", href: "#services" },
  { label: "Branches", href: "#branches" },
  { label: "Upload & Print", href: "#upload" },
  { label: "Book a Service", href: "#booking" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [activeHash, setActiveHash] = useState(window.location.hash);

  // Track hash changes for active link highlighting
  useEffect(() => {
    const onHashChange = () => setActiveHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Robust body scroll lock when mobile menu is open
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalStyle = document.body.style.cssText;

    // Lock scroll: works on iOS Safari + desktop
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";

    return () => {
      document.body.style.cssText = originalStyle;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Prevent touchmove on backdrop from scrolling the page behind (iOS fallback)
  const preventScroll = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  // Close menu on Escape key and on resize to desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <a href="#" className="text-xl font-bold text-primary tracking-tight">
          EXPERTECH<span className="text-accent">.</span>
        </a>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </a>
          ))}
          <a
            href="https://wa.me/254746721989"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 transition-all"
          >
            Contact Us
          </a>
          {adminExists === false ? (
            <a
              href="/register"
              className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Setup Admin
            </a>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Staff Login
            </a>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-foreground rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              onTouchMove={preventScroll}
              className="md:hidden fixed inset-0 top-16 z-30 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.nav
              id="mobile-menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed left-0 right-0 top-16 z-40 border-t border-border bg-card shadow-lg max-h-[calc(100vh-4rem)] overflow-y-auto"
            >
              <div className="container py-4 space-y-1">
                {links.map((l) => {
                  const isActive = activeHash === l.href;
                  return (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => {
                        setActiveHash(l.href);
                        setOpen(false);
                      }}
                      className={`block text-base font-medium px-3 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:text-primary hover:bg-muted"
                      }`}
                    >
                      {l.label}
                    </a>
                  );
                })}
                <div className="pt-2 mt-2 space-y-2 border-t border-border">
                  <a
                    href="https://wa.me/254746721989"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Contact Us on WhatsApp
                  </a>
                  {adminExists === false ? (
                    <a
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-primary px-4 py-3 text-sm font-medium text-primary"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Setup Admin
                    </a>
                  ) : (
                    <a
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground"
                    >
                      <LogIn className="h-4 w-4" />
                      Staff Login
                    </a>
                  )}
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
