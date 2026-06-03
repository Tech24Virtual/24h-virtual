import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Lock, Server, Eye, FileCheck, KeyRound, AlertTriangle, Database } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const controls = [
  {
    icon: Lock,
    title: "Encryption",
    description: "TLS 1.2+ in transit. AES-256 at rest for databases, backups, and storage buckets.",
  },
  {
    icon: KeyRound,
    title: "Access Control",
    description: "Role-based access with least-privilege defaults. Database row-level security on every tenant table.",
  },
  {
    icon: Server,
    title: "Infrastructure",
    description: "Hosted on SOC 2 Type II compliant cloud providers (Supabase, Vercel, Stripe). Region: North America.",
  },
  {
    icon: Eye,
    title: "Audit Logging",
    description: "Privileged actions (role changes, impersonation, billing edits, deletions) are written to an immutable audit log.",
  },
  {
    icon: Database,
    title: "Backups",
    description: "Automated daily database backups with 7-day point-in-time recovery. Storage redundancy across availability zones.",
  },
  {
    icon: FileCheck,
    title: "Secrets Management",
    description: "API keys and credentials stored in encrypted vaults. No secrets in source code. Rotated on personnel changes.",
  },
];

const compliance = [
  { label: "HIPAA-aligned", description: "Operational controls for healthcare clients (BAAs available on Enterprise plans)." },
  { label: "PCI DSS", description: "Card data handled exclusively by Stripe. We never store full card numbers." },
  { label: "GDPR / CCPA", description: "Data subject rights honored. See our Privacy Policy and DPA." },
  { label: "SOC 2 (in progress)", description: "Targeting Type I attestation. Status updates published on this page." },
];

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Security"
        description="How 24H Virtual protects your data: encryption, access control, audit logging, infrastructure, and compliance practices."
        canonical="/security"
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
              <Shield className="w-4 h-4" />
              Security at 24H Virtual
            </div>
            <h1>Security</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your callers, your customers, your business data. Here is how we protect them.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Controls Grid */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-heading mb-2">Security Controls</h2>
            <p className="text-muted-foreground mb-8">
              Defense in depth across our application, infrastructure, and operations.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {controls.map((c) => (
                <div
                  key={c.title}
                  className="glass-card p-6 rounded-2xl border border-border/40"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-heading mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="section-spacing bg-muted/30">
        <div className="container-custom">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-heading mb-2">Compliance & Certifications</h2>
            <p className="text-muted-foreground mb-8">
              We align with widely-adopted security frameworks and regulations relevant to our clients.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {compliance.map((c) => (
                <div key={c.label} className="bg-background p-5 rounded-xl border border-border/40">
                  <div className="font-semibold text-heading mb-1">{c.label}</div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Incident response */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-start gap-4 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-heading mb-2">Incident Response</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  We maintain a documented incident response playbook. Confirmed security incidents
                  affecting customer data are communicated to impacted customers within 72 hours,
                  with regulatory notifications as required.
                </p>
                <p className="text-sm text-muted-foreground">
                  To report a vulnerability, please see our{" "}
                  <Link to="/responsible-disclosure" className="text-primary hover:underline">
                    Responsible Disclosure Policy
                  </Link>.
                </p>
              </div>
            </div>

            <div className="mt-8 text-sm text-muted-foreground space-y-2">
              <p>
                Security questions? Email{" "}
                <a href="mailto:security@24hvirtual.com" className="text-primary hover:underline">
                  security@24hvirtual.com
                </a>.
              </p>
              <p>
                See also:{" "}
                <Link to="/trust" className="text-primary hover:underline">Trust Center</Link>{" "}·{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy</Link>{" "}·{" "}
                <Link to="/legal/dpa" className="text-primary hover:underline">DPA</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
