import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createBreadcrumbSchema, createFAQSchema } from "@/components/SEO";
import { capabilities } from "@/data/capabilities";

export default function CapabilityPage() {
  const { slug } = useParams<{ slug: string }>();
  const capability = slug ? capabilities[slug] : undefined;

  if (!capability) {
    return <Navigate to="/how-it-works" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={capability.metaTitle}
        description={capability.metaDescription}
        canonical={`/capabilities/${capability.slug}`}
        jsonLd={[
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "How It Works", url: "/how-it-works" },
            { name: capability.title, url: `/capabilities/${capability.slug}` },
          ]),
          createFAQSchema(capability.faqs),
        ]}
      />
      <Navigation />

      <ServiceHero
        title={capability.title}
        tagline={capability.tagline}
        description={capability.description}
        icon={capability.icon}
        ctaText="Book FREE Consultation"
        ctaLink="/get-started"
      />

      <ServiceFeatureGrid
        title="What You Get"
        subtitle="Everything you need to make this work for your business, day one."
        features={capability.features}
      />

      <ServiceProcess
        title="How It Works"
        subtitle="Three simple steps from setup to first call."
        steps={capability.steps}
      />

      {/* Use Cases */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="mb-4">Real World Use Cases</h2>
            <p className="text-lg text-muted-foreground">
              How businesses like yours put this to work every day.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {capability.useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="h-full border-0 shadow-card hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-6 space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-heading">
                        {useCase.industry}
                      </h3>
                      <p className="text-muted-foreground">{useCase.scenario}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <ServiceFAQ faqs={capability.faqs} />

      <ServiceCTA
        title={capability.ctaTitle}
        subtitle={capability.ctaSubtitle}
        ctaText="Book FREE Consultation"
        ctaLink="/get-started"
      />

      <Footer />
    </div>
  );
}
