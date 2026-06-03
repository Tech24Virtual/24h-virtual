import { motion } from "framer-motion";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface ServiceProcessProps {
  title?: string;
  subtitle?: string;
  steps: Step[];
}

export function ServiceProcess({
  title = "Explore Our Process",
  subtitle = "Getting started is simple",
  steps,
}: ServiceProcessProps) {
  return (
    <section className="section-spacing bg-background">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="mb-4">{title}</h2>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.15 }}
              className="relative text-center"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              {/* Step number */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-6">
                {step.number}
              </div>
              
              <h3 className="text-lg font-semibold text-heading mb-3">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
