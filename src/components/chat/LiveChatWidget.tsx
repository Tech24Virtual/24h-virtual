import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Minimize2, Send, Sparkles, DollarSign, Calendar, HelpCircle, Zap, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatBubble } from "./ChatBubble";
import { LeadCaptureForm } from "./LeadCaptureForm";
import { supabase } from "@/integrations/supabase/client";
import { captureLead } from '@/lib/intake/captureLead';
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const EXCLUDED_ROUTES = [
  "/login",
  "/signup",
  "/admin",
  "/client-dashboard",
  "/affiliate-dashboard",
  "/hr-portal",
  "/staff",
  "/white-label-dashboard",
  "/portal",
];

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! 👋 I'm here to help you learn about our virtual receptionist services. What brings you here today?",
    timestamp: new Date(),
  },
];

const QUICK_ACTIONS = [
  { label: "Pricing", icon: DollarSign, message: "What are your pricing options?" },
  { label: "Book Consultation", icon: Calendar, message: "I'd like to schedule a free consultation" },
  { label: "How It Works", icon: HelpCircle, message: "How does your virtual receptionist service work?" },
  { label: "Quick Demo", icon: Zap, message: "Can you show me a quick demo of your services?" },
];

// Contextual actions based on AI response content
const getContextualActions = (content: string) => {
  const actions: { label: string; to: string; icon: typeof DollarSign }[] = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('/pricing') || lowerContent.includes('pricing')) {
    actions.push({ label: "View Pricing", to: "/pricing", icon: DollarSign });
  }
  if (lowerContent.includes('/demo') || lowerContent.includes('demo')) {
    actions.push({ label: "View Demo", to: "/demo", icon: Play });
  }
  if (lowerContent.includes('/get-started') || lowerContent.includes('consultation') || lowerContent.includes('book')) {
    actions.push({ label: "Book Consultation", to: "/get-started", icon: Calendar });
  }
  
  return actions.slice(0, 2);
};

export function LiveChatWidget() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showAttentionBubble, setShowAttentionBubble] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
   const [hasProvidedContact, setHasProvidedContact] = useState(() => {
     return sessionStorage.getItem("chat_lead_captured") === "true";
   });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  // Base offset: 80px on mobile (above sticky CTA), 24px on desktop
  const baseOffset = isMobile ? 80 : 24;
  const [bottomOffset, setBottomOffset] = useState(baseOffset);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatButtonRef = useRef<HTMLDivElement>(null);

  const isExcludedRoute = EXCLUDED_ROUTES.some((route) => location.pathname.startsWith(route));

  // Show chat button after 10 seconds
  useEffect(() => {
    if (isExcludedRoute) return;
    
    const timer = setTimeout(() => {
      setIsButtonVisible(true);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [isExcludedRoute]);

  // Show attention bubble after 30 seconds (only if button is visible)
  useEffect(() => {
    if (isExcludedRoute) return;
    if (!isOpen && !hasProvidedContact && isButtonVisible) {
      const timer = setTimeout(() => {
        setShowAttentionBubble(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasProvidedContact, isExcludedRoute, isButtonVisible]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Single RAF-throttled scroll handler for footer position
  useEffect(() => {
    if (isExcludedRoute || isOpen) return;

    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return; // Already scheduled

      rafId = requestAnimationFrame(() => {
        const footer = document.querySelector("footer");
        if (footer) {
          const footerRect = footer.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const footerTop = footerRect.top;

          if (footerTop < viewportHeight) {
            const newOffset = Math.max(baseOffset, viewportHeight - footerTop + 24);
            setBottomOffset((prev) => (prev !== newOffset ? newOffset : prev));
          } else {
            setBottomOffset((prev) => (prev !== baseOffset ? baseOffset : prev));
          }
        }

        rafId = null;
      });
    };

    handleScroll(); // Initial check
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isExcludedRoute, isOpen, baseOffset]);

  // Don't render on excluded routes - MUST be after all hooks
  if (isExcludedRoute) {
    return null;
  }

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Check if lead capture is needed - trigger after FIRST user message
    if (!hasProvidedContact) {
      setPendingMessage(messageText);
      setShowLeadForm(true);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again shortly.");
        }
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

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
                  assistantContent += content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent } : m
                    )
                  );
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadFormSubmit = async (data: { name: string; email: string; phone?: string }) => {
    try {
      const result = await captureLead({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        source: 'chat_widget',
        notes: `Chat started on ${location.pathname}`,
      });
      if (!result.id && !result.duplicate) {
        throw new Error('Failed to capture lead');
      }

       sessionStorage.setItem("chat_lead_captured", "true");
      setHasProvidedContact(true);
      setShowLeadForm(false);

      // Add a personalized greeting
      setMessages((prev) => [
        ...prev,
        {
          id: `greeting-${Date.now()}`,
          role: "assistant",
          content: `Thanks ${data.name}! 🎉 Now I can help you better. What would you like to know about our virtual receptionist services?`,
          timestamp: new Date(),
        },
      ]);

      // Send the pending message if there was one
      if (pendingMessage) {
        setTimeout(() => {
          handleSendMessage(pendingMessage);
          setPendingMessage(null);
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving lead:", error);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowAttentionBubble(false);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && isButtonVisible && (
          <motion.div
            ref={chatButtonRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed right-6 z-50 transition-all duration-300"
            style={{ bottom: bottomOffset }}
          >
            {showAttentionBubble && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-16 right-0 bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-3 w-48 text-sm"
              >
                <button
                  onClick={() => setShowAttentionBubble(false)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-muted rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
                <p className="text-heading font-medium">Need help? 💬</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Ask me anything about our services!
                </p>
              </motion.div>
            )}
            <Button
              size="lg"
              className="w-14 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleOpen}
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={
              isMinimized
                ? { opacity: 1, y: 0, scale: 1, height: 60 }
                : { opacity: 1, y: 0, scale: 1, height: "auto" }
            }
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-3rem)] glass-card rounded-2xl shadow-2xl z-50 overflow-hidden border border-border/50"
          >
            {/* Enhanced Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  {/* Online indicator */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-primary animate-pulse" />
                </div>
                <div>
                  <p className="font-semibold">24H Virtual Assistant</p>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    {isLoading ? "Typing..." : "Online • Usually responds instantly"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/10"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            {!isMinimized && (
              <>
                <ScrollArea className="h-[350px] p-4">
                  <div ref={scrollRef} className="space-y-4">
                    {messages.map((message, index) => {
                      const contextualActions = message.role === "assistant" && index > 0 
                        ? getContextualActions(message.content) 
                        : [];
                      
                      return (
                        <div key={message.id}>
                          <ChatBubble
                            role={message.role}
                            content={message.content}
                            timestamp={message.timestamp}
                          />
                          {/* Show quick actions after welcome message */}
                          {index === 0 && message.role === "assistant" && messages.length === 1 && (
                            <div className="flex flex-wrap gap-2 mt-3 ml-10">
                              {QUICK_ACTIONS.map((action) => (
                                <motion.button
                                  key={action.label}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 text-primary transition-all"
                                  onClick={() => handleSendMessage(action.message)}
                                >
                                  <action.icon className="w-3 h-3" />
                                  {action.label}
                                </motion.button>
                              ))}
                            </div>
                          )}
                          {/* Show contextual actions after AI responses */}
                          {contextualActions.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-wrap gap-2 mt-2 ml-10"
                            >
                              {contextualActions.map((action) => (
                                <Link
                                  key={action.to}
                                  to={action.to}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary transition-all"
                                >
                                  <action.icon className="w-3 h-3" />
                                  {action.label}
                                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <ChatBubble role="assistant" content="" isTyping />
                    )}
                  </div>
                </ScrollArea>

                {/* Lead Form Modal */}
                {showLeadForm && (
                  <LeadCaptureForm
                    onSubmit={handleLeadFormSubmit}
                    onClose={() => {
                      setShowLeadForm(false);
                      setPendingMessage(null);
                    }}
                  />
                )}

                {/* Enhanced Input Area */}
                <div className="p-4 border-t border-border/50 bg-muted/30">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 rounded-xl border-border/50 focus:border-primary/50 bg-background"
                      disabled={isLoading}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="rounded-xl h-10 w-10 shrink-0"
                      disabled={!inputValue.trim() || isLoading}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    AI Assistant • Your data is secure
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
