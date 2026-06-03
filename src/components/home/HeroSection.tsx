import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Phone, Calendar, MessageSquare } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DecorativeShapes } from "@/components/ui/DecorativeShapes";
import { ClutchReviewsBadge } from "@/components/home/ClutchReviewsBadge";
import { heroFeatures, pickHeroVariant } from "@/content/heroMessaging";
import heroImage from "@/assets/heroes/hero-header.png";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  },
};

import React from "react";
import { WebCallbackWidget } from "@/components/callback/WebCallbackWidget";

export const HeroSection = React.forwardRef<HTMLElement, Record<string, never>>(
  function HeroSection(_props, _ref) {
  const [activeVariant] = useState(pickHeroVariant);
  const [callbackOpen, setCallbackOpen] = useState(false);

  return (
    <section className="relative overflow-hidden lg:min-h-screen">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 gradient-mesh" />
      
      {/* Decorative shapes */}
      <DecorativeShapes variant="hero" />

      <div className="container-custom relative pt-24 pb-10 lg:pt-36 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
          {/* Left Column - Content */}
          <motion.div
            className="space-y-5 lg:space-y-7"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Trust badge */}
            <motion.div variants={itemVariants}>
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 px-4 py-1.5 rounded-full">
                Trusted by 1000+ Businesses
              </Badge>
            </motion.div>

            {/* Headline */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h1 className="text-heading">
                {activeVariant.headline}{" "}
                <span className="text-primary relative">
                  {activeVariant.highlightedWord}
                  <motion.span 
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-secondary/50 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  />
                </span>
              </h1>
              <p className="text-lg md:text-xl text-foreground max-w-lg leading-relaxed">
                {activeVariant.description}
              </p>
            </motion.div>

            {/* Feature checklist - Ruby style */}
            <motion.ul variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {heroFeatures.map((feature, index) => (
                <motion.li 
                  key={feature}
                  className="flex items-center gap-2 text-sm md:text-base"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-heading font-medium">{feature}</span>
                </motion.li>
              ))}
            </motion.ul>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                variant="cta" 
                className="text-base px-6 h-12 sm:px-8 sm:h-14 rounded-full group relative overflow-hidden" 
                asChild
              >
                <Link to={activeVariant.ctaLink}>
                  <span className="relative z-10 flex items-center">
                    {activeVariant.ctaText}
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="btn-ghost-blue text-base px-6 h-12 sm:px-8 sm:h-14 rounded-full" 
                asChild
              >
                <Link to="/demo">Watch Demo</Link>
              </Button>
            </motion.div>

            {/* Phone CTA */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="text-sm">or </span>
              <button
                onClick={() => setCallbackOpen(true)}
                className="text-primary font-semibold hover:underline"
              >
                request a callback
              </button>
            </motion.div>
          </motion.div>

          {/* Right Column - Hero Image with Floating Cards */}
          <motion.div
            className="relative lg:pl-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {/* Hero image container */}
            <div className="relative">
              {/* Decorative circles behind image - enhanced for edge blending */}
              <motion.div 
                className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-secondary/15 blur-3xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <motion.div 
                className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-primary/10 blur-3xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              <motion.div 
                className="absolute top-1/3 -right-4 w-32 h-32 rounded-full bg-brand-rose/30 blur-2xl"
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
              {/* Additional blur to mask upper edge artifacts */}
              <motion.div 
                className="absolute top-0 left-1/4 w-40 h-40 rounded-full bg-background/50 blur-3xl"
                animate={{ opacity: [0.5, 0.7, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />

              {/* Main hero image */}
              <motion.div
                className="relative z-10"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              >
                {/* Soft edge blending overlay */}
                <div className="absolute inset-0 pointer-events-none z-20">
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background/20 rounded-full" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/10" />
                </div>
                
                <motion.img
                  src={heroImage}
                  alt="Professional virtual receptionist"
                  className="w-full max-w-sm sm:max-w-md lg:max-w-3xl mx-auto drop-shadow-2xl [mask-image:radial-gradient(ellipse_90%_95%_at_50%_50%,black_70%,transparent_100%)]"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>

              {/* Floating UI Card - Incoming Call - Hidden on small mobile */}
              <motion.div 
                className="absolute left-4 lg:left-8 top-[38%] glass-card p-3 sm:p-4 rounded-xl shadow-elevated z-20 hidden sm:block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, y: [0, -5, 0] }}
                transition={{ 
                  delay: 0.8,
                  y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading">Incoming call</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Answering in 2 rings...</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating UI Card - Appointment Booked - Hidden on small mobile */}
              <motion.div 
                className="absolute -right-4 lg:-right-8 bottom-1/4 glass-card p-3 sm:p-4 rounded-xl shadow-elevated z-20 hidden sm:block"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, 5, 0] }}
                transition={{ 
                  delay: 1,
                  y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-heading">Appointment booked!</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Tomorrow at 2:00 PM</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating UI Card - Message Taken */}
              <motion.div 
                className="absolute left-1/4 sm:left-1/3 -translate-x-1/2 bottom-2 sm:bottom-0 glass-card p-2 sm:p-3 rounded-xl shadow-elevated z-30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: [0, 3, 0] }}
                transition={{ 
                  delay: 1.2,
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  <p className="text-[10px] sm:text-xs font-medium text-heading">Message sent to your email</p>
                </div>
              </motion.div>
            </div>

            {/* Bottom stats mini-bar */}
            <motion.div 
              className="flex items-center justify-center gap-6 mt-8 lg:mt-16"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">1M+</p>
                <p className="text-xs text-muted-foreground">Calls Answered</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">&lt;3 Rings</p>
                <p className="text-xs text-muted-foreground">Average</p>
              </div>
            </motion.div>

            {/* Review Platform Badges */}
            <motion.div 
              className="flex flex-wrap justify-center gap-3 mt-4 lg:mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
            >
              <ClutchReviewsBadge />
            </motion.div>
          </motion.div>
        </div>
      </div>
      <WebCallbackWidget open={callbackOpen} onOpenChange={setCallbackOpen} />
    </section>
  );
});
HeroSection.displayName = "HeroSection";
