import { useState, useRef, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Phone, Sparkles, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatProgress } from "@/components/chat/ChatProgress";
import { QuickReplyButtons } from "@/components/chat/QuickReplyButtons";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STAGES = ["Setup", "Goals", "Details", "Your Plan", "Next Steps"];

const SETUP_OPTIONS = [
  { label: "In-house receptionist", value: "in-house" },
  { label: "Answering service", value: "answering-service" },
  { label: "Voicemail only", value: "voicemail" },
  { label: "No system", value: "none" },
];

const GOAL_OPTIONS = [
  { label: "Missing calls", value: "missing-calls" },
  { label: "High staff costs", value: "high-costs" },
  { label: "After-hours coverage", value: "after-hours" },
  { label: "Inconsistent service", value: "inconsistent" },
  { label: "Scaling issues", value: "scaling" },
];

const IVR_OPTIONS = [
  { label: "Yes, we have an IVR", value: "yes-ivr" },
  { label: "No IVR system", value: "no-ivr" },
  { label: "Not sure", value: "unsure" },
];

const HOLD_TIME_OPTIONS = [
  { label: "Under 1 minute", value: "under-1" },
  { label: "1-3 minutes", value: "1-3" },
  { label: "3-5 minutes", value: "3-5" },
  { label: "Over 5 minutes", value: "over-5" },
];

export default function CallAdvisor() {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi there! 👋 I'm your Call Advisor. In the next few minutes, I'll analyze your current call handling and provide personalized recommendations. Let's start with a quick question:",
    },
    {
      id: "q1",
      role: "assistant",
      content: "How do you currently handle incoming calls?",
    },
  ]);
  const [sessionData, setSessionData] = useState({
    setup: [] as string[],
    goals: [] as string[],
    hasIvr: "",
    holdTime: "",
    email: "",
    phone: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  // Scroll only within chat container
  const scrollToLatest = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: "smooth" 
      });
    }
  };

  // Auto scroll on messages change
  useEffect(() => {
    scrollToLatest();
  }, [messages]);

  const addMessage = (role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random()}`, role, content },
    ]);
  };

  const handleSetupSelect = (value: string) => {
    setSessionData((prev) => ({ ...prev, setup: [value] }));
    const label = SETUP_OPTIONS.find((o) => o.value === value)?.label || value;
    addMessage("user", label);

    setTimeout(() => {
      addMessage(
        "assistant",
        "Great, thanks for sharing! Now, what are the biggest challenges you're facing with your current call handling? (Select all that apply)"
      );
      setStage(1);
    }, 500);
  };

  const handleGoalsSelect = (value: string) => {
    setSessionData((prev) => ({
      ...prev,
      goals: prev.goals.includes(value)
        ? prev.goals.filter((g) => g !== value)
        : [...prev.goals, value],
    }));
  };

  const handleGoalsContinue = () => {
    const labels = sessionData.goals.map(
      (g) => GOAL_OPTIONS.find((o) => o.value === g)?.label || g
    );
    addMessage("user", labels.join(", "));

    setTimeout(() => {
      addMessage(
        "assistant",
        "Those are common challenges we help solve every day! A couple more quick questions about your call flow:"
      );
      setTimeout(() => {
        addMessage("assistant", "Do you currently use an IVR (phone menu) system?");
        setStage(2);
      }, 800);
    }, 500);
  };

  const handleIvrSelect = (value: string) => {
    setSessionData((prev) => ({ ...prev, hasIvr: value }));
    const label = IVR_OPTIONS.find((o) => o.value === value)?.label || value;
    addMessage("user", label);

    setTimeout(() => {
      addMessage("assistant", "And what's the typical hold time for your callers?");
    }, 500);
  };

  const handleHoldTimeSelect = async (value: string) => {
    setSessionData((prev) => ({ ...prev, holdTime: value }));
    const label = HOLD_TIME_OPTIONS.find((o) => o.value === value)?.label || value;
    addMessage("user", label);
    setStage(3);

    setTimeout(() => {
      addMessage(
        "assistant",
        "Perfect! I have all the information I need. Let me analyze your situation and create a personalized call handling audit..."
      );
      generateAudit();
    }, 500);
  };

  const generateAudit = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/call-advisor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sessionData }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate audit");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let auditContent = "";
      const auditId = `audit-${Date.now()}`;
      
      setMessages((prev) => [...prev, { id: auditId, role: "assistant", content: "" }]);

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  auditContent += content;
                  setMessages((prev) =>
                    prev.map((m) => (m.id === auditId ? { ...m, content: auditContent } : m))
                  );
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setAuditComplete(true);
      setTimeout(() => {
        addMessage(
          "assistant",
          "Now, let me get your contact details so I can send you a detailed report and have one of our specialists reach out:"
        );
        setStage(4);
      }, 1000);
    } catch (error) {
      addMessage(
        "assistant",
        "I apologize, but I encountered an error generating your audit. Please try again or contact us directly."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionData.email) return;

    try {
      const { error } = await supabase.from("leads").insert({
        name: "Call Advisor Lead",
        email: sessionData.email,
        phone: sessionData.phone || null,
        source: "call_advisor",
        notes: JSON.stringify(sessionData),
      });

      if (error) throw error;

      addMessage("user", `Email: ${sessionData.email}`);
      addMessage(
        "assistant",
        "🎉 Thank you! Your personalized call handling report is on its way. One of our specialists will reach out within 24 hours to discuss your options. In the meantime, feel free to explore our solutions!"
      );

      toast({
        title: "Report sent!",
        description: "Check your inbox for your personalized audit.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStageContent = () => {
    if (stage === 0 && sessionData.setup.length === 0) {
      return <QuickReplyButtons options={SETUP_OPTIONS} selected={sessionData.setup} onSelect={handleSetupSelect} />;
    }

    if (stage === 1) {
      return (
        <QuickReplyButtons
          options={GOAL_OPTIONS}
          selected={sessionData.goals}
          onSelect={handleGoalsSelect}
          multiSelect
          onContinue={handleGoalsContinue}
        />
      );
    }

    if (stage === 2 && !sessionData.hasIvr) {
      return <QuickReplyButtons options={IVR_OPTIONS} selected={[]} onSelect={handleIvrSelect} />;
    }

    if (stage === 2 && sessionData.hasIvr && !sessionData.holdTime) {
      return <QuickReplyButtons options={HOLD_TIME_OPTIONS} selected={[]} onSelect={handleHoldTimeSelect} />;
    }

    if (stage === 4 && auditComplete) {
      return (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleContactSubmit}
          className="space-y-4 p-4 bg-accent/30 rounded-xl"
        >
          <div className="space-y-2">
            <Label htmlFor="advisor-email">Email *</Label>
            <Input
              id="advisor-email"
              type="email"
              value={sessionData.email}
              onChange={(e) => setSessionData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advisor-phone">Phone (optional)</Label>
            <Input
              id="advisor-phone"
              type="tel"
              value={sessionData.phone}
              onChange={(e) => setSessionData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>
          <Button type="submit" variant="cta" className="w-full">
            Get My Report
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.form>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Free Call Handling Audit"
        description="Get a personalized analysis of your call handling with actionable recommendations. Takes 2 minutes, completely free."
        canonical="/call-advisor"
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-16">
        <div className="container-custom">
          <motion.div
            className="max-w-3xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4" />
              Free 2-Minute Assessment
            </motion.div>
            <h1 className="text-balance">Your Personal Call Handling Audit</h1>
            <p className="text-xl text-muted-foreground">
              Answer a few quick questions and get personalized recommendations to improve your call handling.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Chat Interface */}
      <section className="section-spacing bg-background scroll-mt-24">
        <div className="container-custom max-w-3xl">
          <Card className="overflow-hidden shadow-xl">
            <CardContent className="p-0">
              {/* Progress */}
              <div className="border-b border-border/50 bg-accent/20">
                <ChatProgress stages={STAGES} currentStage={stage} />
              </div>

              {/* Messages */}
              <ScrollArea className="h-[400px] p-6">
                <div ref={scrollRef} className="space-y-4">
                  {messages.map((message) => (
                    <ChatBubble key={message.id} role={message.role} content={message.content} />
                  ))}
                  {isGenerating && (
                    <ChatBubble role="assistant" content="" isTyping />
                  )}
                </div>
              </ScrollArea>

              {/* Interactive Area */}
              <div className="p-6 border-t border-border/50 bg-muted/20">
                <AnimatePresence mode="wait">{renderStageContent()}</AnimatePresence>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Takes 2 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Personalized results</span>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
