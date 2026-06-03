import { GraduationCap, Users, Calendar, Globe, AlertCircle, Clock } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";

const features = [
  {
    icon: Users,
    title: "Enrollment Support",
    description: "Handle inquiries about programs, admissions requirements, and registration deadlines professionally and accurately.",
  },
  {
    icon: Calendar,
    title: "Schedule Management",
    description: "Book tutoring sessions, parent-teacher conferences, and campus tours without back-and-forth phone tag.",
  },
  {
    icon: GraduationCap,
    title: "Parent Communication",
    description: "Keep parents informed and connected. Answer questions about policies, events, and student progress.",
  },
  {
    icon: Globe,
    title: "Trilingual Support",
    description: "Serve diverse families with English, Spanish, and French speaking receptionists. Spanish and French available during business hours.",
  },
  {
    icon: AlertCircle,
    title: "Emergency Protocols",
    description: "Handle urgent calls according to your safety procedures, escalating to the right staff immediately.",
  },
  {
    icon: Clock,
    title: "After-Hours Availability",
    description: "Parents can reach someone even after office hours for urgent matters or basic information.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For tutoring centers",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Session scheduling",
      "Message taking",
      "Email notifications",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For private schools",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Enrollment inquiries",
      "Event registration",
      "Email notifications",
      "Trilingual support",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For multi-campus institutions",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-location support",
      "Emergency protocols",
      "Department routing",
      "Analytics dashboard",
      "Dedicated support",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Information",
    description: "Provide details about your programs, staff, policies, and frequently asked questions.",
  },
  {
    number: 2,
    title: "Define Call Handling",
    description: "Tell us how different call types should be routed: admissions, administration, emergencies, and more.",
  },
  {
    number: 3,
    title: "Start Serving Families",
    description: "Every call is answered professionally, giving parents and students the support they need.",
  },
];

const faqs = [
  {
    question: "Can you handle calls from prospective families?",
    answer: "Absolutely! We're trained to answer questions about your programs, share enrollment information, and schedule campus tours or admissions meetings.",
  },
  {
    question: "How do you handle emergency calls?",
    answer: "We follow your specific emergency protocols. Urgent calls are immediately escalated to designated staff members, while non-urgent matters are handled appropriately.",
  },
  {
    question: "Do you work with school management software?",
    answer: "Yes, we can integrate with platforms like Blackbaud, PowerSchool, Gradelink, and others to access schedules and update records.",
  },
  {
    question: "Can you support multiple languages?",
    answer: "We offer English, Spanish, and French support, which covers the needs of most educational institutions. English is available 24/7, while Spanish and French are available during business hours (8 AM - 8 PM ET).",
  },
];

const EducationalServices = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Schools & Education"
        description="Professional call handling for schools, tutoring centers, and educational institutions. Enrollment support, trilingual service, and emergency protocols."
        canonical="/industries/educational-services"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Educational Services", "Enrollment support, parent communication, and emergency call handling for educational institutions.", "/industries/educational-services"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Educational Services", url: "/industries/educational-services" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Keep Families Connected", highlight: "Enrollment Growing" }}
          tagline="EDUCATIONAL SERVICES"
          description="Never miss an enrollment inquiry or parent concern. Professional call handling that keeps families informed and your institution thriving."
          icon={GraduationCap}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=educational-services"
        />
        <ServiceFeatureGrid
          title="Designed for Education"
          subtitle="We understand the unique communication needs of schools and educational organizations"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Institution"
          subtitle="From tutoring centers to multi-campus schools"
          plans={plans}
          serviceSlug="educational-services"
        />
        <ServiceProcess
          title="Easy Setup for Schools"
          subtitle="Get your team connected quickly"
          steps={steps}
        />
        <ServiceFAQ
          title="Educational Services FAQs"
          subtitle="Common questions from schools and learning centers"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Better Serve Your Families?"
          subtitle="Join schools that never miss an important call"
          ctaText="Start Supporting Families"
          ctaLink="/get-started?industry=educational-services"
        />
      </main>
      <Footer />
    </div>
  );
};

export default EducationalServices;
