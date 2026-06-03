import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Zap, Bot, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HybridPlanSelector } from "@/components/hybrid/HybridPlanSelector";
import { HybridPricingCards } from "@/components/hybrid/HybridPricingCards";
import { getHybridPlanById, type HybridPlanType } from "@/lib/hybridPricingData";
import { useFeatureLive } from "@/hooks/useLaunchFlags";

interface HybridPricingSectionProps {
  isAnnual?: boolean;
}

export function HybridPricingSection({ isAnnual }: HybridPricingSectionProps) {
  const [activePlan, setActivePlan] = useState<HybridPlanType>("pro");
  const currentPlan = getHybridPlanById(activePlan);
  const { isLive: hybridLive, loading } = useFeatureLive("hybrid-receptionist");

  if (loading) return null;

  if (!hybridLive) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 md:p-12 text-center space-y-5 border border-cta/20"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cta/10 text-cta mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <Badge variant="secondary" className="text-xs px-3 py-1">
            LAUNCHING SOON
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-heading">
            Hybrid Receptionist
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Our AI plus human hybrid plan is being polished for launch. Be the first
            to know when it goes live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="cta" asChild>
              <Link to="/solutions/hybrid-receptionist">
                Notify Me
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/demo">Book FREE Consultation</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <Badge variant="secondary" className="text-sm px-4 py-1">
          <Zap className="w-3 h-3 mr-1" />
          BEST OF BOTH WORLDS
        </Badge>
        <h2 className="text-2xl md:text-3xl font-bold text-heading">
          Hybrid Receptionist
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Combine the speed of AI with the warmth of human receptionists. 
          Let AI handle routine calls instantly while your dedicated team focuses on complex conversations.
        </p>
      </motion.div>

      {/* How It Works Visual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 rounded-xl max-w-3xl mx-auto"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-heading">~70% Routine Calls</p>
              <p className="text-sm text-muted-foreground">Handled by AI instantly</p>
            </div>
          </div>
          <div className="text-2xl text-muted-foreground">+</div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-heading">~30% Complex Calls</p>
              <p className="text-sm text-muted-foreground">Handled by humans</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Plan Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-center text-sm text-muted-foreground mb-4">
          Choose your human service level:
        </p>
        <HybridPlanSelector activePlan={activePlan} onPlanChange={setActivePlan} />
      </motion.div>

      {/* Current Plan Info */}
      <motion.div
        key={activePlan}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-xl font-semibold text-heading mb-1">
          {currentPlan.name}
        </h3>
        <p className="text-muted-foreground">
          AI Receptionist + {currentPlan.humanService}
        </p>
      </motion.div>

      {/* Pricing Cards */}
      <motion.div
        key={`cards-${activePlan}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <HybridPricingCards plan={currentPlan} isAnnual={isAnnual} />
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <Button variant="outline" asChild>
          <Link to="/solutions/hybrid-receptionist">
            Learn more about Hybrid Receptionist
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
