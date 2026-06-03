import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Quote, Star, MapPin, CheckCircle2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge } from "@/components/ui/badge";
import { DecorativeShapes } from "@/components/ui/DecorativeShapes";

const stats = [
  { value: 1, suffix: "M+", label: "Calls Answered" },
  { value: 3, prefix: "<", suffix: " Rings", label: "Average" },
  { value: 24, suffix: "/7", label: "English Coverage" },
  { value: 1000, suffix: "+", label: "Businesses Served" },
];

const testimonials = [
  {
    quote: "The flexibility, professionalism, and training were all amazing.",
    name: "Shauna MacKenzie",
    role: "Customer Service Operations Mgr",
    company: "Logistics & Supply Chain Company",
    industry: "Logistics",
    location: "Toronto, Ontario",
    source: "Clutch",
    verified: true,
  },
  {
    quote: "The team's intelligent communication has been impressive in the workflow.",
    name: "Project Manager",
    role: "Project Manager",
    company: "AffordableApartments.ca",
    industry: "Real Estate",
    location: "Duncan, BC",
    source: "Clutch",
    verified: true,
  },
  {
    quote: "It has been a great process and I would highly recommend.",
    name: "Julianne Aury",
    role: "CEO",
    company: "Financial Foothold",
    industry: "Financial Services",
    location: "Austin, Texas",
    source: "Clutch",
    verified: true,
  },
];

export function StatsSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="section-spacing relative overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 gradient-mesh" />
      <DecorativeShapes variant="subtle" />

      <div className="container-custom relative">
        {/* Stats Row - Large Typography Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-12 sm:mb-24">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-2">
                {'prefix' in stat && stat.prefix}
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                />
              </div>
              <p className="text-sm md:text-base text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">What our clients say</h2>
            <p className="text-lg text-muted-foreground">
              Join hundreds of businesses who trust 24H Virtual
            </p>
          </motion.div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="glass-card border-white/30 shadow-elevated">
                  <CardContent className="p-5 sm:p-8 md:p-12">
                    <div className="flex justify-center mb-6">
                      <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
                        <Quote className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <blockquote className="text-lg md:text-xl text-heading text-center mb-8 leading-relaxed">
                      "{testimonials[currentTestimonial].quote}"
                    </blockquote>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="font-semibold text-heading">
                        {testimonials[currentTestimonial].name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {testimonials[currentTestimonial].role}, {testimonials[currentTestimonial].company}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="rounded-full">
                          {testimonials[currentTestimonial].industry}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {testimonials[currentTestimonial].location}
                        </span>
                      </div>
                      {testimonials[currentTestimonial].verified && (
                        <a 
                          href="https://clutch.co/profile/24h-virtual"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 mt-3 text-xs text-primary hover:underline"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified on Clutch
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-center gap-4 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={prevTestimonial}
                className="rounded-full border-border/50 hover:bg-accent/50 hover:border-primary/30"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentTestimonial
                        ? "bg-primary w-8"
                        : "bg-primary/30 w-2 hover:bg-primary/50"
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={nextTestimonial}
                className="rounded-full border-border/50 hover:bg-accent/50 hover:border-primary/30"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link
              to="/industries"
              className="group inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors"
            >
              See results in your industry
              <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
