import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PhoneCall,
  FileText,
  CalendarClock,
  Receipt,
  PhoneOutgoing,
  Edit3,
  Headset,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const capabilities = [
  {
    icon: PhoneCall,
    title: "Live Call Logs",
    description: "Every call, message, and outcome searchable in your portal in real time.",
  },
  {
    icon: FileText,
    title: "Encoded Scripts",
    description: "Your greeting, FAQs, and routing rules live in the platform. Every agent follows them.",
  },
  {
    icon: CalendarClock,
    title: "Schedule Visibility",
    description: "See coverage windows, on-call agents, and after-hours handling at a glance.",
  },
  {
    icon: Receipt,
    title: "Transparent Billing",
    description: "Per-second handle-time billing. Invoices, usage, and overages are always visible.",
  },
  {
    icon: PhoneOutgoing,
    title: "Outbound Requests",
    description: "Submit callback requests from the dashboard. We dial, log the outcome, and retry if needed.",
  },
  {
    icon: Edit3,
    title: "Quick-Change Links",
    description: "Send a tokenized link to your team or supervisor to update scripts without an account.",
  },
  {
    icon: Headset,
    title: "Web Callback Widget",
    description: "Replaces tel: links across your site so callers reach the right queue every time.",
  },
  {
    icon: BellRing,
    title: "Real-time Notifications",
    description: "Email, SMS, and Slack alerts the moment a message is taken or a lead comes in.",
  },
];

export function PlatformProofSection() {
  return (
    <section className="section-spacing bg-background relative overflow-hidden">
      <div className="container-custom relative">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-4">The Platform Behind Every Call</Badge>
          <h2 className="mb-4">More than an answering service</h2>
          <p className="text-lg text-muted-foreground">
            Your client portal gives you the same operational control we use internally. Logs, scripts, schedules, billing, and outbound workflows in one place.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Card className="h-full hover:shadow-elevated transition-all duration-300 border-border/50">
                <CardContent className="p-6 space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <cap.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-heading text-base">{cap.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{cap.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="cta" className="rounded-full px-8 h-14" asChild>
            <Link to="/get-started">
              Book FREE Consultation
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
