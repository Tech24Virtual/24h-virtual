import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Download, Mail } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const sections = [
  { id: "parties", title: "1. Parties" },
  { id: "definitions", title: "2. Definitions" },
  { id: "scope", title: "3. Scope and Roles" },
  { id: "processing", title: "4. Processing of Personal Data" },
  { id: "subprocessors", title: "5. Subprocessors" },
  { id: "security", title: "6. Security Measures" },
  { id: "rights", title: "7. Data Subject Rights" },
  { id: "breach", title: "8. Personal Data Breach" },
  { id: "transfers", title: "9. International Transfers" },
  { id: "term", title: "10. Term and Termination" },
];

export default function DPA() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Data Processing Agreement"
        description="24H Virtual Data Processing Agreement (DPA) covering GDPR, CCPA, and standard contractual clauses for customer data."
        canonical="/legal/dpa"
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
              <FileText className="w-4 h-4" />
              Legal
            </div>
            <h1>Data Processing Agreement</h1>
            <p className="text-muted-foreground">
              Effective Date: February 1, 2026 · Version 1.0
            </p>
            <a
              href="mailto:legal@24hvirtual.com?subject=DPA%20Counter-Signed%20Copy%20Request"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Request counter-signed copy
            </a>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
              <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-2">
                  <p className="font-semibold text-heading mb-4">Contents</p>
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              </aside>

              <div className="prose prose-slate max-w-none">
                <div className="p-4 rounded-xl bg-muted/40 border border-border/40 mb-8">
                  <p className="text-sm text-muted-foreground m-0">
                    This Data Processing Agreement ("DPA") forms part of the Master Services Agreement
                    or Terms of Service between the Customer ("Controller") and 24H Virtual ("Processor").
                    By using our services, Customer agrees to the terms below where applicable data
                    protection law requires a DPA.
                  </p>
                </div>

                <section id="parties" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">1. Parties</h2>
                  <p className="text-muted-foreground">
                    <strong>Processor:</strong> 24H Virtual ("we", "us"), a virtual receptionist services
                    provider operating the 24hvirtual.com and 24hv.io platforms.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    <strong>Controller:</strong> The customer entity that has agreed to our Terms of Service
                    and uses our services to process Personal Data.
                  </p>
                </section>

                <section id="definitions" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">2. Definitions</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>"Personal Data"</strong> has the meaning given in applicable Data Protection Laws (e.g., GDPR Art. 4, CCPA).</li>
                    <li><strong>"Data Protection Laws"</strong> means GDPR, UK GDPR, CCPA/CPRA, PIPEDA, and other applicable laws.</li>
                    <li><strong>"Processing"</strong> means any operation performed on Personal Data.</li>
                    <li><strong>"Subprocessor"</strong> means any third party engaged by us to process Personal Data.</li>
                  </ul>
                </section>

                <section id="scope" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">3. Scope and Roles</h2>
                  <p className="text-muted-foreground">
                    The Customer is the Controller of Personal Data submitted to the services
                    (including caller information, messages, and recordings). 24H Virtual acts as
                    Processor on behalf of the Customer, processing Personal Data only on documented
                    instructions and as necessary to provide the services.
                  </p>
                </section>

                <section id="processing" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">4. Processing of Personal Data</h2>
                  <p className="text-muted-foreground mb-3">
                    We process Personal Data for the following purposes:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Answering and routing calls on Customer's behalf</li>
                    <li>Capturing messages, leads, and appointment requests</li>
                    <li>Storing call logs, recordings, and metadata for Customer access</li>
                    <li>Generating billing and usage reports</li>
                    <li>Providing technical support to Customer</li>
                  </ul>
                  <p className="text-muted-foreground mt-3">
                    Categories of data subjects: Customer's end-callers, employees, contacts, and
                    authorized portal users. Categories of data: identification data, contact data,
                    voice recordings, message content, and call metadata.
                  </p>
                </section>

                <section id="subprocessors" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">5. Subprocessors</h2>
                  <p className="text-muted-foreground">
                    Customer authorizes 24H Virtual to engage Subprocessors as listed on our{" "}
                    <Link to="/trust" className="text-primary hover:underline">Trust Center</Link>.
                    We will provide at least 30 days' notice of new Subprocessors and an opportunity
                    to object. Each Subprocessor is bound by data protection terms substantially
                    similar to those in this DPA.
                  </p>
                </section>

                <section id="security" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">6. Security Measures</h2>
                  <p className="text-muted-foreground">
                    We implement appropriate technical and organizational measures to protect Personal
                    Data, including encryption in transit and at rest, role-based access control,
                    audit logging, and regular security review. Full details are published on our{" "}
                    <Link to="/security" className="text-primary hover:underline">Security page</Link>.
                  </p>
                </section>

                <section id="rights" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">7. Data Subject Rights</h2>
                  <p className="text-muted-foreground">
                    We assist Customer in responding to data subject access, correction, deletion,
                    portability, and objection requests. Customer can fulfill most requests directly
                    through the dashboard; we provide additional support for complex requests within
                    a reasonable timeframe.
                  </p>
                </section>

                <section id="breach" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">8. Personal Data Breach</h2>
                  <p className="text-muted-foreground">
                    We will notify Customer without undue delay (and within 72 hours where feasible)
                    after becoming aware of a Personal Data Breach affecting Customer's data, providing
                    sufficient information to enable Customer to meet its own notification obligations.
                  </p>
                </section>

                <section id="transfers" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">9. International Transfers</h2>
                  <p className="text-muted-foreground">
                    Where Personal Data is transferred outside the EEA, UK, or Switzerland, we rely on
                    Standard Contractual Clauses (Module 2: Controller to Processor) and equivalent
                    safeguards under UK and Swiss law. A copy of executed SCCs is available on request.
                  </p>
                </section>

                <section id="term" className="mb-10">
                  <h2 className="text-2xl font-bold text-heading mb-4">10. Term and Termination</h2>
                  <p className="text-muted-foreground">
                    This DPA remains in effect for the term of the underlying services agreement.
                    Upon termination, we will delete or return Personal Data within 30 days, except
                    where retention is required by law (see retention schedule on the{" "}
                    <Link to="/trust" className="text-primary hover:underline">Trust Center</Link>).
                  </p>
                </section>

                <div className="border-t pt-8 mt-12">
                  <div className="flex items-start gap-3 p-5 rounded-xl bg-primary/5 border border-primary/20">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold text-heading mb-1">Need a counter-signed copy?</p>
                      <p>
                        Email{" "}
                        <a href="mailto:legal@24hvirtual.com" className="text-primary hover:underline">
                          legal@24hvirtual.com
                        </a>{" "}
                        with your entity name, signatory, and any required modifications.
                        Standard turnaround is 5 business days.
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-6">
                    See also:{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}·{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}·{" "}
                    <Link to="/trust" className="text-primary hover:underline">Trust Center</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
