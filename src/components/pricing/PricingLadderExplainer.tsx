import { motion } from "framer-motion";
import { MessageCircle, PhoneForwarded, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: MessageCircle,
    label: "Messages",
    service: "Message Assistant",
    from: "From $89/mo",
    description:
      "We answer the call, take a complete message, and deliver it to your inbox. Best for overflow lines and businesses that just need to capture details.",
  },
  {
    icon: PhoneForwarded,
    label: "Screening + Transfers",
    service: "Virtual Receptionist",
    from: "From $149/mo",
    description:
      "Live trilingual receptionists answer, screen, qualify, and warm-transfer the right calls. Best for client-facing teams who want a real receptionist experience.",
  },
  {
    icon: Briefcase,
    label: "Admin Support",
    service: "Virtual Secretary",
    from: "From $199/mo",
    description:
      "Everything in Virtual Receptionist plus calendar coordination, correspondence, and follow-ups. Best for owners and executives offloading admin overhead.",
  },
  {
    icon: Users,
    label: "Dedicated Capacity",
    service: "Virtual Assistants",
    from: "From $1,899/mo",
    description:
      "A named assistant or small team that learns your business and works on your projects. Best for sustained workloads and specialized tasks.",
  },
];

export function PricingLadderExplainer() {
  return (
    <section className="section-spacing bg-background">
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-4">Why Pricing Differs</Badge>
          <h2 className="mb-4">Choose the level of handling that fits</h2>
          <p className="text-lg text-muted-foreground">
            Every service uses the same per-second handle-time billing. The price differs because the work differs. Here is the capability ladder from messages to dedicated coverage.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute left-5 sm:left-7 top-3 bottom-3 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent hidden sm:block" />
          <div className="space-y-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.service}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative flex gap-5 items-start glass-card p-5 sm:p-6 rounded-2xl border-border/40"
              >
                <div className="relative z-10 w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Tier {i + 1} · {step.label}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-heading text-lg">{step.service}</h3>
                    <span className="text-sm font-semibold text-heading">{step.from}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
