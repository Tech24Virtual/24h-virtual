import { useState } from "react";
import { motion } from "framer-motion";
import { X, Shield, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadCaptureFormProps {
  onSubmit: (data: { name: string; email: string; phone?: string }) => void;
  onClose: () => void;
}

export function LeadCaptureForm({ onSubmit, onClose }: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    await onSubmit({ name: name.trim(), email: email.trim() });
    setIsSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-gradient-to-b from-background/95 to-background backdrop-blur-md flex items-center justify-center p-4 z-10"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Icon header */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-heading">Let's Get Acquainted</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Share your details so I can personalize my assistance and follow up if needed
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chat-name" className="text-sm font-medium">Your Name *</Label>
            <Input
              id="chat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chat-email" className="text-sm font-medium">Email Address *</Label>
            <Input
              id="chat-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              className="rounded-xl"
              required
            />
          </div>

          <Button
            type="submit"
            variant="cta"
            className="w-full rounded-xl h-11 text-base"
            disabled={!name.trim() || !email.trim() || isSubmitting}
          >
            {isSubmitting ? (
              "Connecting..."
            ) : (
              <span className="flex items-center gap-2">
                Continue Conversation
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Your info is secure • No spam ever</span>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
