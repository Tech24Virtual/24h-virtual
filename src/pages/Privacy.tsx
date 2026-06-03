import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "information-collected", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Information" },
  { id: "sharing", title: "Information Sharing" },
  { id: "security", title: "Data Security" },
  { id: "your-rights", title: "Your Rights" },
  { id: "cookies", title: "Cookies" },
  { id: "contact", title: "Contact Us" },
  { id: "updates", title: "Policy Updates" },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="Learn how 24H Virtual protects your data. Our privacy policy explains how we collect, use, and safeguard your information."
        canonical="/privacy"
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
            <h1>Privacy Policy</h1>
            <p className="text-muted-foreground">
              Effective Date: February 1, 2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-[250px_1fr] gap-12">
              {/* Table of Contents */}
              <aside className="hidden lg:block">
                <div className="sticky top-24 space-y-2">
                  <p className="font-semibold text-heading mb-4">Contents</p>
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                    >
                      {section.title}
                    </a>
                  ))}
                </div>
              </aside>

              {/* Policy Content */}
              <div className="prose prose-slate max-w-none">
                <section id="introduction" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Introduction</h2>
                  <p className="text-muted-foreground mb-4">
                    24H Virtual ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our virtual receptionist services and website.
                  </p>
                  <p className="text-muted-foreground">
                    By using our services, you agree to the collection and use of information in accordance with this policy.
                  </p>
                </section>

                <section id="information-collected" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Information We Collect</h2>
                  <h3 className="text-lg font-semibold text-heading mt-6 mb-3">Personal Information</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                    <li>Name, email address, phone number, and business information when you sign up</li>
                    <li>Billing and payment information</li>
                    <li>Communications you send to us</li>
                  </ul>
                  <h3 className="text-lg font-semibold text-heading mt-6 mb-3">Call Data</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                    <li>Call recordings (if enabled)</li>
                    <li>Call logs and duration</li>
                    <li>Caller information provided during calls</li>
                    <li>Messages and notes taken by receptionists</li>
                  </ul>
                  <h3 className="text-lg font-semibold text-heading mt-6 mb-3">Usage Data</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>IP address and browser information</li>
                    <li>Pages visited and features used</li>
                    <li>Device and operating system information</li>
                  </ul>
                </section>

                <section id="how-we-use" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">How We Use Information</h2>
                  <p className="text-muted-foreground mb-4">We use the information we collect to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide and maintain our virtual receptionist services</li>
                    <li>Process your transactions and billing</li>
                    <li>Send you service updates and notifications</li>
                    <li>Respond to your inquiries and provide customer support</li>
                    <li>Improve our services and develop new features</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </section>

                <section id="sharing" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Information Sharing</h2>
                  <p className="text-muted-foreground mb-4">
                    We do not sell your personal information. We may share your information with:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Service Providers:</strong> Third parties who help us operate our services (payment processors, cloud hosting, etc.)</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                    <li><strong>With Your Consent:</strong> When you give us permission to share information</li>
                  </ul>
                </section>

                <section id="security" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Data Security</h2>
                  <p className="text-muted-foreground mb-4">
                    We implement industry-standard security measures to protect your information:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Encryption of data in transit and at rest</li>
                    <li>Regular security audits and assessments</li>
                    <li>Access controls and authentication</li>
                    <li>Employee training on data protection</li>
                    <li>HIPAA compliance for healthcare clients</li>
                  </ul>
                </section>

                <section id="your-rights" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Your Rights</h2>
                  <p className="text-muted-foreground mb-4">
                    Depending on your location, you may have the following rights:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                    <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                    <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                    <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    To exercise these rights, please contact us at privacy@24hvirtual.com.
                  </p>
                </section>

                <section id="cookies" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Cookies</h2>
                  <p className="text-muted-foreground mb-4">
                    We use cookies and similar technologies to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Keep you logged in to your account</li>
                    <li>Remember your preferences</li>
                    <li>Analyze website usage and performance</li>
                    <li>Deliver relevant advertising</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    You can control cookie settings through your browser preferences.
                  </p>
                </section>

                <section id="contact" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Contact Us</h2>
                  <p className="text-muted-foreground mb-4">
                    If you have questions about this Privacy Policy, please contact us:
                  </p>
                  <ul className="list-none text-muted-foreground space-y-2">
                    <li>Email: privacy@24hvirtual.com</li>
                    <li>Phone: 1.800.825.2587</li>
                    <li>Address: United States</li>
                  </ul>
                </section>

                <section id="updates" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Policy Updates</h2>
                  <p className="text-muted-foreground">
                    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Effective Date" at the top. We encourage you to review this policy periodically.
                  </p>
                </section>

                <div className="border-t pt-8 mt-12">
                  <p className="text-sm text-muted-foreground">
                    See also: <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
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
