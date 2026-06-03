import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { EstimatorForm } from "@/components/launch-estimator/EstimatorForm";
import { EstimatorResults } from "@/components/launch-estimator/EstimatorResults";
import { motion } from "framer-motion";

export interface EstimatorData {
  industry: string;
  locations: string;
  tools: string[];
  callTypes: string[];
}

export default function LaunchEstimator() {
  const [results, setResults] = useState<EstimatorData | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Campaign Launch Estimator | How Fast Can You Go Live?"
        description="Estimate how quickly 24H Virtual can launch your call handling campaign. Answer 4 questions and get a personalized timeline."
        canonical="/launch-estimator"
      />
      <Navigation />

      <section className="gradient-hero pt-32 pb-12">
        <div className="container-custom">
          <motion.div
            className="max-w-2xl mx-auto text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-balance">How Fast Can You Launch?</h1>
            <p className="text-lg text-muted-foreground">
              Answer 4 quick questions and we'll estimate your campaign launch timeline.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-spacing bg-background">
        <div className="container-custom max-w-2xl">
          {!results ? (
            <EstimatorForm onComplete={setResults} />
          ) : (
            <EstimatorResults data={results} onReset={() => setResults(null)} />
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
