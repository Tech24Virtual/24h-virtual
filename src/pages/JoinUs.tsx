import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";

const benefits = [
  {
    icon: Home,
    title: "Remote Work",
    description: "Work from anywhere with flexible remote opportunities",
  },
  {
    icon: TrendingUp,
    title: "Growth Opportunities",
    description: "Performance bonuses and advancement paths",
  },
  {
    icon: Clock,
    title: "Flexible Schedules",
    description: "Various shift combinations to fit your lifestyle",
  },
  {
    icon: DollarSign,
    title: "Competitive Pay",
    description: "Attractive compensation with incentives",
  },
];

export default function JoinUs() {
  useEffect(() => {
    const container = document.getElementById("dropboard-container");
    if (container && !container.querySelector("script")) {
      const script = document.createElement("script");
      script.src = "https://dropboardhq.com/embed/script.js";
      script.setAttribute("data-org", "FLh3gGI9yu");
      script.setAttribute("data-page", "dropboard");
      script.async = true;
      container.appendChild(script);
    }
  }, []);

  return (
    <>
      <SEO
        title="Join Us | Work Opportunities at 24H Virtual"
        description="Explore work opportunities at 24H Virtual. Join our team of dedicated Virtual Receptionists and help businesses grow with flexible remote positions."
        canonical="/join-us"
      />
      <Navigation />

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-6">
              Work Opportunities
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-heading mb-6">
              Join Us
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Join our team of dedicated Virtual Receptionists and help businesses grow. 
              We offer remote positions with flexible schedules and competitive pay.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why Work With Us */}
      <section className="py-20 bg-background">
        <div className="container-custom">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-heading mb-4">
              Why Work With Us
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join a supportive team that values your growth and work-life balance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                className="glass-card p-6 text-center hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-heading mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions - Dropboard Embed */}
      <section className="py-20 bg-accent/30">
        <div className="container-custom">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-heading mb-4">
              Open Positions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse our current openings and find your next role
            </p>
          </motion.div>

          <motion.div
            className="bg-background rounded-2xl p-6 md:p-8 shadow-sm min-h-[400px]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div id="dropboard-container" className="w-full" />
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
