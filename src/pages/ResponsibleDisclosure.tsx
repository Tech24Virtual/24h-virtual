import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bug, CheckCircle2, XCircle, Mail, Clock } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const inScope = [
  "24hv.io and all subdomains",
  "24hvirtual.com and all subdomains (legacy redirect domain)",
  "24hv.io and all subdomains",
  "Customer-facing white-label portals (portal.*)",
  "Public APIs and authenticated dashboards",
  "Mobile-responsive views of the above",
];

const outOfScope = [
  "Denial-of-service (DoS / DDoS) attacks",
  "Social engineering of staff or customers",
  "Physical attacks against offices or staff",
  "Third-party services we use (report directly to them)",
  "Findings from automated scanners without working proof-of-concept",
  "Missing security headers without demonstrated impact",
  "Self-XSS or issues requiring physical access to a victim's device",
];

const safeHarbor = [
  "Make a good-faith effort to avoid privacy violations, data destruction, and service interruption",
  "Use only your own accounts or accounts you have explicit permission to test",
  "Do not exfiltrate any data beyond the minimum needed to demonstrate the vulnerability",
  "Stop testing and report immediately if you encounter sensitive customer data",
  "Give us reasonable time to remediate before any public disclosure (90 days minimum)",
];

export default function ResponsibleDisclosure() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Responsible Disclosure"
        description="24H Virtual's coordinated vulnerability disclosure policy. How to report a security issue and what to expect from us."
        canonical="/responsible-disclosure"
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
              <Bug className="w-4 h-4" />
              Responsible Disclosure
            </div>
            <h1>Responsible Disclosure Policy</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We welcome security researchers. Here is how to report a vulnerability and what you can expect from us.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Report */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-8 rounded-2xl border border-primary/20 mb-12">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-xl font-bold text-heading mb-2">Report a vulnerability</h2>
                  <p className="text-muted-foreground mb-4">
                    Email{" "}
                    <a href="mailto:security@24hvirtual.com" className="text-primary font-semibold hover:underline">
                      security@24hvirtual.com
                    </a>{" "}
                    with a clear description, reproduction steps, and impact assessment. Please encrypt
                    sensitive findings if possible (PGP key available on request).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Include: affected URL or endpoint, the vulnerability class, step-by-step reproduction,
                    and any supporting screenshots or video.
                  </p>
                </div>
              </div>
            </div>

            {/* Response Timeline */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-heading mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                What to expect from us
              </h2>
              <div className="space-y-3 mt-6">
                {[
                  { when: "Within 2 business days", what: "We acknowledge receipt of your report." },
                  { when: "Within 7 business days", what: "We complete initial triage and confirm severity." },
                  { when: "Within 30–90 days", what: "We remediate the issue based on severity (critical first)." },
                  { when: "After remediation", what: "We notify you, credit you publicly (with your consent), and confirm the fix." },
                ].map((step) => (
                  <div key={step.when} className="flex gap-4 p-4 rounded-xl bg-muted/30">
                    <div className="font-semibold text-primary text-sm whitespace-nowrap min-w-[160px]">{step.when}</div>
                    <div className="text-sm text-muted-foreground">{step.what}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scope */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div>
                <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  In scope
                </h3>
                <ul className="space-y-2">
                  {inScope.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-heading mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  Out of scope
                </h3>
                <ul className="space-y-2">
                  {outOfScope.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-destructive">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Safe Harbor */}
            <div className="p-6 rounded-2xl border border-border/40 bg-muted/30 mb-12">
              <h3 className="font-semibold text-heading mb-3">Safe Harbor</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We will not pursue legal action against researchers who act in good faith and follow this policy.
                To qualify for safe harbor, please:
              </p>
              <ul className="space-y-2">
                {safeHarbor.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recognition */}
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                <strong className="text-heading">Recognition:</strong> We do not currently operate a paid bug bounty,
                but we publicly credit researchers (with consent) on a future hall-of-fame page and provide swag
                for high-impact findings.
              </p>
              <p>
                See also:{" "}
                <Link to="/security" className="text-primary hover:underline">Security</Link>{" "}·{" "}
                <Link to="/trust" className="text-primary hover:underline">Trust Center</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
