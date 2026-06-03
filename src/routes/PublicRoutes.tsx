import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { Bot, Wand2 } from "lucide-react";
import { LazyRoute } from "./LazyRoute";
import { FeatureGate } from "@/components/FeatureGate";
import { ComingSoonPage } from "@/components/ComingSoonPage";

// Eager-loaded critical paths
import Index from "@/pages/Index";
import Pricing from "@/pages/Pricing";
import GetStarted from "@/pages/GetStarted";
import Login from "@/pages/auth/Login";
import SignUp from "@/pages/auth/SignUp";
import Unauthorized from "@/pages/Unauthorized";

// Solutions
const Solutions = lazy(() => import("@/pages/Solutions"));
const AIReceptionist = lazy(() => import("@/pages/services/AIReceptionist"));
const MessageAssistant = lazy(() => import("@/pages/services/MessageAssistant"));
const VirtualReceptionist = lazy(() => import("@/pages/services/VirtualReceptionist"));
const VirtualSecretary = lazy(() => import("@/pages/services/VirtualSecretary"));
const VirtualAssistants = lazy(() => import("@/pages/services/VirtualAssistants"));
const HybridReceptionist = lazy(() => import("@/pages/services/HybridReceptionist"));

// Industries
const IndustriesIndex = lazy(() => import("@/pages/industries/IndustriesIndex"));
const BeautyWellness = lazy(() => import("@/pages/industries/BeautyWellness"));
const EmergencyServices = lazy(() => import("@/pages/industries/EmergencyServices"));
const EducationalServices = lazy(() => import("@/pages/industries/EducationalServices"));
const MedicalPractices = lazy(() => import("@/pages/industries/MedicalPractices"));
const LegalServices = lazy(() => import("@/pages/industries/LegalServices"));
const HomeServices = lazy(() => import("@/pages/industries/HomeServices"));
const RealEstate = lazy(() => import("@/pages/industries/RealEstate"));
const FinancialServices = lazy(() => import("@/pages/industries/FinancialServices"));
const ITTechSupport = lazy(() => import("@/pages/industries/ITTechSupport"));
const MaintenanceRepair = lazy(() => import("@/pages/industries/MaintenanceRepair"));
const CounselingTherapy = lazy(() => import("@/pages/industries/CounselingTherapy"));
const EventPlanning = lazy(() => import("@/pages/industries/EventPlanning"));
const Veterinary = lazy(() => import("@/pages/industries/Veterinary"));
const TransportationLogistics = lazy(() => import("@/pages/industries/TransportationLogistics"));
const Nonprofits = lazy(() => import("@/pages/industries/Nonprofits"));

// White-label public proposal viewer
const WLProposalPublic = lazy(() => import("@/pages/public/WLProposalPublic"));
// White-label public client portal (token-gated next-steps page)
const WLClientPortalPublic = lazy(() => import("@/pages/public/WLClientPortalPublic"));

// Public marketing pages
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const About = lazy(() => import("@/pages/About"));
const CallAdvisor = lazy(() => import("@/pages/CallAdvisor"));
const FAQs = lazy(() => import("@/pages/FAQs"));
const Demo = lazy(() => import("@/pages/Demo"));
const CostCalculator = lazy(() => import("@/pages/CostCalculator"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Security = lazy(() => import("@/pages/Security"));
const Trust = lazy(() => import("@/pages/Trust"));
const ResponsibleDisclosure = lazy(() => import("@/pages/ResponsibleDisclosure"));
const DPA = lazy(() => import("@/pages/legal/DPA"));
const JoinUs = lazy(() => import("@/pages/JoinUs"));
const GPTAdvisor = lazy(() => import("@/pages/GPTAdvisor"));
const WhyUs = lazy(() => import("@/pages/WhyUs"));
const LaunchEstimator = lazy(() => import("@/pages/LaunchEstimator"));
const CallFlowBuilder = lazy(() => import("@/pages/CallFlowBuilder"));
const QuickChange = lazy(() => import("@/pages/QuickChange"));
const BrandAssets = lazy(() => import("@/pages/BrandAssets"));
const Outline = lazy(() => import("@/pages/Outline"));

// Capabilities
const CapabilityPage = lazy(() => import("@/pages/capabilities/CapabilityPage"));

// Guides
const GuidesIndex = lazy(() => import("@/pages/guides/GuidesIndex"));
const GuideDetailPage = lazy(() => import("@/pages/guides/GuideDetailPage"));

// Blog
const BlogIndex = lazy(() => import("@/pages/blog/BlogIndex"));
const BlogPost = lazy(() => import("@/pages/blog/BlogPost"));
const DiscoverabilityPublicPage = lazy(() => import("@/pages/seo/DiscoverabilityPublicPage"));
const BlogCategory = lazy(() => import("@/pages/blog/BlogCategory"));

// Locations
const LocationIndustryPage = lazy(() => import("@/pages/locations/LocationIndustryPage"));
const LocationsIndex = lazy(() => import("@/pages/locations/LocationsIndex"));

// Chat widget (embeddable)
const ChatWidget = lazy(() => import("@/pages/widget/ChatWidget"));

// Partner marketing
const Partners = lazy(() => import("@/pages/partners/Partners"));
const WhiteLabelPartner = lazy(() => import("@/pages/partners/WhiteLabelPartner"));
const AffiliatePartner = lazy(() => import("@/pages/partners/AffiliatePartner"));
const ReferralPartner = lazy(() => import("@/pages/partners/ReferralPartner"));
const PartnerLaunchPad = lazy(() => import("@/pages/partners/PartnerLaunchPad"));

export const PublicRoutes = (
  <>
    {/* Critical paths - eager loaded */}
    <Route path="/" element={<Index />} />
    <Route path="/pricing" element={<Pricing />} />
    <Route path="/get-started" element={<GetStarted />} />
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/unauthorized" element={<Unauthorized />} />

    {/* Embeddable chat widget (iframe target) */}
    <Route path="/widget/v1" element={<LazyRoute><ChatWidget /></LazyRoute>} />

    {/* White-label public proposal viewer (token-gated, no auth) */}
    <Route path="/p/:token" element={<LazyRoute><WLProposalPublic /></LazyRoute>} />

    {/* White-label public client portal (token-gated next steps, no auth) */}
    <Route path="/c/:token" element={<LazyRoute><WLClientPortalPublic /></LazyRoute>} />

    {/* Solutions */}
    <Route path="/solutions" element={<LazyRoute><Solutions /></LazyRoute>} />
    <Route
      path="/solutions/ai-receptionist"
      element={
        <FeatureGate
          feature="ai-receptionist"
          comingSoon={
            <ComingSoonPage
              tagline="AI Receptionist"
              title="Our AI Receptionist Is Almost Ready"
              description="Natural-sounding 24/7 AI that answers calls, qualifies leads, and books appointments instantly. We're putting the finishing touches on it now."
              icon={Bot}
              featureSlug="ai-receptionist"
              eta="Q1 2026"
              whatsComing={[
                "24/7 natural-voice call answering in English, Spanish, and French",
                "Instant lead qualification with custom intake questions",
                "Real-time appointment booking into your calendar",
                "Automatic SMS and email follow-up after every call",
                "Live human handoff for complex calls",
              ]}
            />
          }
        >
          <LazyRoute><AIReceptionist /></LazyRoute>
        </FeatureGate>
      }
    />
    <Route path="/solutions/message-assistant" element={<LazyRoute><MessageAssistant /></LazyRoute>} />
    <Route path="/solutions/virtual-receptionist" element={<LazyRoute><VirtualReceptionist /></LazyRoute>} />
    <Route path="/solutions/virtual-secretary" element={<LazyRoute><VirtualSecretary /></LazyRoute>} />
    <Route path="/solutions/virtual-assistants" element={<LazyRoute><VirtualAssistants /></LazyRoute>} />
    <Route
      path="/solutions/hybrid-receptionist"
      element={
        <FeatureGate
          feature="hybrid-receptionist"
          comingSoon={
            <ComingSoonPage
              tagline="Hybrid Receptionist"
              title="Hybrid AI + Human Receptionist, Coming Soon"
              description="The best of both worlds: AI handles instant routing while real humans take over complex calls. Launching soon, join the waitlist to be first in line."
              icon={Wand2}
              featureSlug="hybrid-receptionist"
              eta="Q2 2026"
              whatsComing={[
                "AI front-line answer in under 2 seconds",
                "Seamless live handoff to a trained human receptionist",
                "Bundled AI plus human minutes in Lite, Pro, and Executive tiers",
                "Unified call recording and transcription across both layers",
                "One dashboard for AI and human call analytics",
              ]}
              primaryCta={{ label: "Book FREE Consultation", href: "/get-started?interest=hybrid-receptionist" }}
            />
          }
        >
          <LazyRoute><HybridReceptionist /></LazyRoute>
        </FeatureGate>
      }
    />

    {/* Locations */}
    <Route path="/locations" element={<LazyRoute><LocationsIndex /></LazyRoute>} />
    <Route path="/locations/:city/:industry" element={<LazyRoute><LocationIndustryPage /></LazyRoute>} />

    {/* Industries */}
    <Route path="/industries" element={<LazyRoute><IndustriesIndex /></LazyRoute>} />
    <Route path="/industries/medical-practices" element={<LazyRoute><MedicalPractices /></LazyRoute>} />
    <Route path="/industries/legal-services" element={<LazyRoute><LegalServices /></LazyRoute>} />
    <Route path="/industries/home-services" element={<LazyRoute><HomeServices /></LazyRoute>} />
    <Route path="/industries/real-estate" element={<LazyRoute><RealEstate /></LazyRoute>} />
    <Route path="/industries/financial-services" element={<LazyRoute><FinancialServices /></LazyRoute>} />
    <Route path="/industries/it-tech-support" element={<LazyRoute><ITTechSupport /></LazyRoute>} />
    <Route path="/industries/beauty-wellness" element={<LazyRoute><BeautyWellness /></LazyRoute>} />
    <Route path="/industries/emergency-services" element={<LazyRoute><EmergencyServices /></LazyRoute>} />
    <Route path="/industries/educational-services" element={<LazyRoute><EducationalServices /></LazyRoute>} />
    <Route path="/industries/maintenance-repair" element={<LazyRoute><MaintenanceRepair /></LazyRoute>} />
    <Route path="/industries/counseling-therapy" element={<LazyRoute><CounselingTherapy /></LazyRoute>} />
    <Route path="/industries/event-planning" element={<LazyRoute><EventPlanning /></LazyRoute>} />
    <Route path="/industries/veterinary" element={<LazyRoute><Veterinary /></LazyRoute>} />
    <Route path="/industries/transportation-logistics" element={<LazyRoute><TransportationLogistics /></LazyRoute>} />
    <Route path="/industries/nonprofits" element={<LazyRoute><Nonprofits /></LazyRoute>} />

    {/* Legacy / external path redirects (in-app fallbacks; Cloudflare 301s remain primary) */}
    <Route path="/our-reviews" element={<Navigate to="/about#testimonials" replace />} />
    <Route path="/book-consultation" element={<Navigate to="/get-started" replace />} />
    <Route path="/capabilities/voice" element={<Navigate to="/solutions/ai-receptionist" replace />} />
    <Route path="/portal/demo" element={<Navigate to="/demo" replace />} />
    <Route path="/portal/demo/login" element={<Navigate to="/demo" replace />} />

    {/* Marketing & info */}
    <Route path="/how-it-works" element={<LazyRoute><HowItWorks /></LazyRoute>} />
    <Route path="/call-advisor" element={<LazyRoute><CallAdvisor /></LazyRoute>} />
    <Route path="/contact" element={<Navigate to="/call-advisor" replace />} />
    <Route path="/demo" element={<LazyRoute><Demo /></LazyRoute>} />
    <Route path="/about" element={<LazyRoute><About /></LazyRoute>} />
    <Route path="/join-us" element={<LazyRoute><JoinUs /></LazyRoute>} />
    <Route path="/faqs" element={<LazyRoute><FAQs /></LazyRoute>} />
    <Route path="/cost-calculator" element={<LazyRoute><CostCalculator /></LazyRoute>} />
    <Route path="/gpt-advisor" element={<LazyRoute><GPTAdvisor /></LazyRoute>} />
    <Route path="/brand-assets" element={<LazyRoute><BrandAssets /></LazyRoute>} />
    <Route path="/why-24h-virtual" element={<LazyRoute><WhyUs /></LazyRoute>} />
    <Route path="/launch-estimator" element={<LazyRoute><LaunchEstimator /></LazyRoute>} />
    <Route path="/call-flow-builder" element={<LazyRoute><CallFlowBuilder /></LazyRoute>} />
    <Route path="/outline" element={<LazyRoute><Outline /></LazyRoute>} />

    {/* Capabilities */}
    <Route path="/capabilities/:slug" element={<LazyRoute><CapabilityPage /></LazyRoute>} />

    {/* Guides */}
    <Route path="/guides" element={<LazyRoute><GuidesIndex /></LazyRoute>} />
    <Route path="/guides/:slug" element={<LazyRoute><GuideDetailPage /></LazyRoute>} />

    {/* Blog */}
    <Route path="/blog" element={<LazyRoute><BlogIndex /></LazyRoute>} />
    <Route path="/blog/category/:category" element={<LazyRoute><BlogCategory /></LazyRoute>} />
    <Route path="/blog/:slug" element={<LazyRoute><BlogPost /></LazyRoute>} />

    {/* Phase 2 — Discoverability public renderer (canonical disc_generated_pages) */}
    <Route path="/seo/:slug" element={<LazyRoute><DiscoverabilityPublicPage /></LazyRoute>} />

    {/* Quick change (public token-gated) */}
    <Route path="/quick-change/:token" element={<LazyRoute><QuickChange /></LazyRoute>} />

    {/* Partner marketing */}
    <Route path="/partners" element={<LazyRoute><Partners /></LazyRoute>} />
    <Route path="/partners/white-label" element={<LazyRoute><WhiteLabelPartner /></LazyRoute>} />
    <Route path="/partners/affiliate" element={<LazyRoute><AffiliatePartner /></LazyRoute>} />
    <Route path="/partners/referral" element={<LazyRoute><ReferralPartner /></LazyRoute>} />
    <Route path="/partners/launchpad" element={<LazyRoute><PartnerLaunchPad /></LazyRoute>} />

    {/* Legal & trust */}
    <Route path="/privacy" element={<LazyRoute><Privacy /></LazyRoute>} />
    <Route path="/terms" element={<LazyRoute><Terms /></LazyRoute>} />
    <Route path="/security" element={<LazyRoute><Security /></LazyRoute>} />
    <Route path="/trust" element={<LazyRoute><Trust /></LazyRoute>} />
    <Route path="/responsible-disclosure" element={<LazyRoute><ResponsibleDisclosure /></LazyRoute>} />
    <Route path="/legal/dpa" element={<LazyRoute><DPA /></LazyRoute>} />
  </>
);
