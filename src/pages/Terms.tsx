import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTerms } from "@/hooks/useTerms";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

/**
 * Lightweight markdown -> HTML renderer for headings, bold, italics,
 * lists, links and paragraphs. Avoids pulling in a full markdown lib.
 */
function renderMarkdown(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(
        /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>'
      );

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      out.push(`<h3 class="text-lg font-semibold mt-6 mb-2">${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(`<h2 class="text-xl font-bold mt-8 mb-3">${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      flushList();
      out.push(`<h1 class="text-3xl font-bold mb-4">${inline(line.slice(2))}</h1>`);
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-6 space-y-1 my-3">');
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
    } else {
      flushList();
      out.push(`<p class="my-3 leading-relaxed">${inline(line)}</p>`);
    }
  }
  flushList();
  return out.join("\n");
}

const Terms = () => {
  const { terms, loading } = useTerms();

  useEffect(() => {
    document.title = "Terms of Service | Expertech";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-3xl py-10 sm:py-14">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span>Terms of Service</span>
        </nav>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <article
            className="prose-like text-foreground"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(terms) }}
          />
        )}

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
