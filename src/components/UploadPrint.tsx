import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UploadPrint = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [printType, setPrintType] = useState<"bw" | "color">("bw");
  const [whatsapp, setWhatsapp] = useState("");
  const [copies, setCopies] = useState("1");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf" || f.type.startsWith("image/")
      );
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast({ title: "Please upload at least one file", variant: "destructive" });
      return;
    }
    if (!whatsapp.match(/^(\+?254|0)\d{9}$/)) {
      toast({ title: "Please enter a valid Kenyan phone number", variant: "destructive" });
      return;
    }
    // Build WhatsApp message
    const msg = encodeURIComponent(
      `Hi Expertech! 🖨️\nI'd like to print:\n- ${files.map((f) => f.name).join("\n- ")}\n- Type: ${printType === "bw" ? "Black & White" : "Color"}\n- Copies: ${copies}\nMy WhatsApp: ${whatsapp}`
    );
    window.open(`https://wa.me/254746721989?text=${msg}`, "_blank");
    toast({ title: "Redirecting to WhatsApp...", description: "Send the message to confirm your print job." });
  };

  return (
    <section id="upload" className="py-16 md:py-20 bg-secondary">
      <div className="container max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Upload & <span className="text-primary">Print</span>
          </h2>
          <p className="text-muted-foreground">
            Send us your files and we'll have them ready for pickup. Fast, easy, reliable.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit}
          className="bg-card rounded-xl p-6 md:p-8 card-shadow space-y-6"
        >
          {/* File upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">Upload Files (PDF or Image)</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload or drag files here</span>
              <span className="text-xs text-muted-foreground mt-1">Max 5 files • PDF, JPG, PNG</span>
              <input
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Print type */}
          <div>
            <label className="block text-sm font-semibold mb-2">Print Type</label>
            <div className="flex gap-3">
              {([["bw", "Black & White"], ["color", "Color"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPrintType(val)}
                  className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-all ${
                    printType === val
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Copies */}
          <div>
            <label className="block text-sm font-semibold mb-2">Number of Copies</label>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-semibold mb-2">WhatsApp Number</label>
            <input
              type="tel"
              placeholder="e.g. 0746721989"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">We'll notify you on WhatsApp when your print is ready.</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-3.5 font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-md"
          >
            Send Print Request via WhatsApp
          </button>
        </motion.form>
      </div>
    </section>
  );
};

export default UploadPrint;
