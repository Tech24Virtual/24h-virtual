import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, FileText, Users, Server, Database, Mail, Activity, Building2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const subprocessors = [
  { name: "Supabase", purpose: "Database, authentication, storage, edge functions", region: "US (us-east-1)", website: "https://supabase.com" },
  { name: "Stripe", purpose: "Payment processing and subscription billing", region: "Global (PCI DSS Level 1)", website: "https://stripe.com" },
  { name: "Resend", purpose: "Transactional and notification email delivery", region: "US / EU", website: "https://resend.com" },
  { name: "Vercel / Lovable Cloud", purpose: "Application hosting and CDN", region: "Global edge network", website: "https://vercel.com" },
  { name: "Five9", purpose: "Voice telephony for AI Receptionist (when enabled)", region: "US", website: "https://five9.com" },
  { name: "Reach59", purpose: "SMS notifications and availability bridge", region: "US / CA", website: "https://reach59.com" },
  { name: "Pabbly Connect", purpose: "Workflow automation for call report ingestion", region: "US / IN", website: "https://pabbly.com" },
  { name: "Slack", purpose: "Internal team communication and ticket escalation", region: "US", website: "https://slack.com" },
  { name: "Bookii", purpose: "Meeting scheduling and appointment booking", region: "US", website: "https://bookii.io" },
];

const retention = [
  { type: "Account data (name, email, company)", period: "Lifetime of account + 30 days after deletion request" },
  { type: "Call recordings", period: "90 days by default, configurable per client (max 7 years)" },
  { type: "Call logs and metadata", period: "24 months for billing reconciliation" },
  { type: "Messages and notes", period: "Lifetime of account, exportable on request" },
  { type: "Billing and invoice records", period: "7 years (tax and legal compliance)" },
  { type: "Audit logs", period: "13 months minimum, longer for security-significant events" },
  { type: "Marketing analytics", period: "26 months (Google Analytics default)" },
];

const trustPillars = [
  {
    icon: Shield,
    title: "Security First",
    description: "Encryption, access control, and audit logging across the entire platform.",
    href: "/security",
    cta: "View security controls",
  },
  {
    icon: FileText,
    title: "Privacy & Data Rights",
    description: "Clear policies on what we collect, why, and how to exercise your rights.",
    href: "/privacy",
    cta: "Read privacy policy",
  },
  {
    icon: Users,
    title: "Responsible Disclosure",
    description: "Coordinated process for security researchers to report vulnerabilities.",
    href: "/responsible-disclosure",
    cta: "Disclosure policy",
  },
  {
    icon: Building2,
    title: "Data Processing Agreement",
    description: "Standard DPA available for customers acting as data controllers.",
    href: "/legal/dpa",
    cta: "View DPA",
  },
];

export default function Trust() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Trust Center"
        description="Trust Center for 24H Virtual: security, privacy, subprocessors, data retention, and compliance documentation."
        canonical="/trust"
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-12">
        <div className="container-custom">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Activity className="w-4 h-4" />
              Trust Center
            </div>
            <h1>Trust at 24H Virtual</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              One place for security, privacy, compliance, and the third parties that help us deliver our service.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
            {trustPillars.map((p) => (
              <Link
                key={p.title}
                to={p.href}
                className="group glass-card p-6 rounded-2xl border border-border/40 hover:border-primary/40 hover:shadow-elevated transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <p.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-heading mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{p.description}</p>
                <span className="text-sm font-medium text-primary group-hover:underline">
                  {p.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Subprocessors */}
      <section className="section-spacing bg-muted/30">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-heading">Subprocessors</h2>
            </div>
            <p className="text-muted-foreground mb-8">
              Third-party services we use to operate the platform. We notify customers of material changes
              to this list at least 30 days in advance.
            </p>
            <div className="bg-background rounded-2xl border border-border/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left font-semibold text-heading p-4">Subprocessor</th>
                      <th className="text-left font-semibold text-heading p-4">Purpose</th>
                      <th className="text-left font-semibold text-heading p-4">Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subprocessors.map((s, i) => (
                      <tr key={s.name} className={i !== subprocessors.length - 1 ? "border-b border-border/30" : ""}>
                        <td className="p-4 font-medium text-heading">
                          <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                            {s.name}
                          </a>
                        </td>
                        <td className="p-4 text-muted-foreground">{s.purpose}</td>
                        <td className="p-4 text-muted-foreground">{s.region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Last updated: April 16, 2026. Subscribe to subprocessor updates by emailing{" "}
              <a href="mailto:trust@24hvirtual.com" className="text-primary hover:underline">trust@24hvirtual.com</a>.
            </p>
          </div>
        </div>
      </section>

      {/* Retention */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold text-heading">Data Retention</h2>
            </div>
            <p className="text-muted-foreground mb-8">
              How long we keep different categories of data. Retention can be customized for Enterprise
              clients with documented requirements.
            </p>
            <div className="bg-background rounded-2xl border border-border/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-semibold text-heading p-4">Data Category</th>
                    <th className="text-left font-semibold text-heading p-4">Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  {retention.map((r, i) => (
                    <tr key={r.type} className={i !== retention.length - 1 ? "border-b border-border/30" : ""}>
                      <td className="p-4 font-medium text-heading">{r.type}</td>
                      <td className="p-4 text-muted-foreground">{r.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section-spacing bg-muted/30">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <Mail className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-heading mb-3">Questions about trust or compliance?</h2>
            <p className="text-muted-foreground mb-6">
              Procurement, security, and legal teams can reach our trust desk directly.
            </p>
            <a
              href="mailto:trust@24hvirtual.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="w-4 h-4" />
              trust@24hvirtual.com
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
