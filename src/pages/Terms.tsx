import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Service" },
  { id: "account", title: "Account Responsibilities" },
  { id: "pricing", title: "Pricing & Payment" },
  { id: "service-level", title: "Service Level" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "limitation", title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "governing-law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service"
        description="Read the terms and conditions for using 24H Virtual receptionist services. Clear policies for a transparent partnership."
        canonical="/terms"
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
            <h1>Terms of Service</h1>
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

              {/* Terms Content */}
              <div className="prose prose-slate max-w-none">
                <section id="acceptance" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Acceptance of Terms</h2>
                  <p className="text-muted-foreground mb-4">
                    By accessing or using 24H Virtual's services ("Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use our Services.
                  </p>
                  <p className="text-muted-foreground">
                    These Terms apply to all users of the Services, including clients, callers, and website visitors.
                  </p>
                </section>

                <section id="description" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Description of Service</h2>
                  <p className="text-muted-foreground mb-4">
                    24H Virtual provides virtual receptionist services including:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>AI-powered call answering and handling</li>
                    <li>Live receptionist services</li>
                    <li>Message taking and delivery</li>
                    <li>Appointment scheduling</li>
                    <li>Call transfer and routing</li>
                    <li>Custom call scripts and handling</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    We reserve the right to modify, suspend, or discontinue any aspect of our Services at any time.
                  </p>
                </section>

                <section id="account" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Account Responsibilities</h2>
                  <p className="text-muted-foreground mb-4">When you create an account, you agree to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide accurate and complete information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Promptly update any changes to your information</li>
                    <li>Accept responsibility for all activities under your account</li>
                    <li>Notify us immediately of any unauthorized access</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    You may not use our Services for any illegal or unauthorized purpose.
                  </p>
                </section>

                <section id="pricing" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Pricing & Payment</h2>
                  <h3 className="text-lg font-semibold text-heading mt-6 mb-3">Billing</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
                    <li>Services are billed monthly in advance</li>
                    <li>Minutes are calculated from call answer to call end</li>
                    <li>Overage charges apply when plan minutes are exceeded</li>
                    <li>Annual plans require a 12-month commitment</li>
                  </ul>
                  <h3 className="text-lg font-semibold text-heading mt-6 mb-3">Refunds</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>New customers may request a full refund within 14 days</li>
                    <li>Monthly subscriptions are non-refundable after the 14-day period</li>
                    <li>Annual plans may be cancelled with no refund for remaining months</li>
                    <li>Unused minutes do not roll over to the next billing period</li>
                  </ul>
                </section>

                <section id="service-level" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Service Level</h2>
                  <p className="text-muted-foreground mb-4">
                    We strive to provide reliable, high-quality service:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>99.9% uptime guarantee for our platform</li>
                    <li>Average answer time within 3 rings for live receptionists</li>
                    <li>24/7/365 availability for AI receptionist services</li>
                    <li>Customer support available during business hours</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    Service credits may be issued for extended outages beyond our control.
                  </p>
                </section>

                <section id="intellectual-property" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Intellectual Property</h2>
                  <p className="text-muted-foreground mb-4">
                    All content, features, and functionality of our Services are owned by 24H Virtual and protected by intellectual property laws. You may not:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Copy, modify, or distribute our content without permission</li>
                    <li>Use our trademarks or branding without authorization</li>
                    <li>Reverse engineer or attempt to extract our source code</li>
                    <li>Use our Services to develop competing products</li>
                  </ul>
                </section>

                <section id="limitation" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Limitation of Liability</h2>
                  <p className="text-muted-foreground mb-4">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Our Services are provided "as is" without warranties of any kind</li>
                    <li>We are not liable for any indirect, incidental, or consequential damages</li>
                    <li>Our total liability is limited to the amount you paid in the past 12 months</li>
                    <li>We are not responsible for actions of your callers or third parties</li>
                  </ul>
                </section>

                <section id="termination" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Termination</h2>
                  <p className="text-muted-foreground mb-4">
                    Either party may terminate the service agreement:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Monthly plans: Cancel anytime with no penalty</li>
                    <li>Annual plans: Cancel anytime, no refund for remaining months</li>
                    <li>We may terminate for violation of these Terms</li>
                    <li>Upon termination, access to Services and data will end</li>
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    You may request a copy of your data within 30 days of termination.
                  </p>
                </section>

                <section id="governing-law" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Governing Law</h2>
                  <p className="text-muted-foreground">
                    These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the state or federal courts located in Delaware.
                  </p>
                </section>

                <section id="contact" className="mb-12">
                  <h2 className="text-2xl font-bold text-heading mb-4">Contact</h2>
                  <p className="text-muted-foreground mb-4">
                    If you have questions about these Terms, please contact us:
                  </p>
                  <ul className="list-none text-muted-foreground space-y-2">
                    <li>Email: legal@24hvirtual.com</li>
                    <li>Phone: 1.800.825.2587</li>
                    <li>Address: United States</li>
                  </ul>
                </section>

                <div className="border-t pt-8 mt-12">
                  <p className="text-sm text-muted-foreground">
                    See also: <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
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
