import {
  CalendarDays,
  Clock,
  Shield,
  Zap,
  Award,
  Target,
  Users,
  TrendingUp,
  Moon,
  Phone,
  Bell,
  Coffee,
  Languages,
  Globe,
  Heart,
  MessageSquare,
  GitBranch,
  RefreshCw,
  Plug,
  Database,
  BarChart3,
  Activity,
  Eye,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface CapabilityFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface CapabilityStep {
  number: number;
  title: string;
  description: string;
}

export interface CapabilityFAQ {
  question: string;
  answer: string;
}

export interface CapabilityUseCase {
  icon: LucideIcon;
  industry: string;
  scenario: string;
}

export interface CapabilityContent {
  slug: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  features: CapabilityFeature[];
  steps: CapabilityStep[];
  useCases: CapabilityUseCase[];
  faqs: CapabilityFAQ[];
  ctaTitle: string;
  ctaSubtitle: string;
}

export const capabilities: Record<string, CapabilityContent> = {
  "appointment-booking": {
    slug: "appointment-booking",
    icon: CalendarDays,
    title: "Appointment Booking That Fills Your Calendar",
    tagline: "Calendar Integrated Scheduling",
    description:
      "Our AI plus human team books appointments directly into your calendar in real time. No double bookings, no missed slots, no back and forth emails. Callers get confirmation instantly.",
    metaTitle: "AI Appointment Booking Service",
    metaDescription:
      "Let our virtual receptionists book appointments directly into your calendar 24/7. Real time sync with Google, Outlook, Calendly, and 50+ scheduling tools.",
    features: [
      {
        icon: CalendarDays,
        title: "Real Time Calendar Sync",
        description:
          "We connect to Google Calendar, Outlook, Calendly, Acuity, and 50+ other tools. Bookings appear instantly with zero conflicts.",
      },
      {
        icon: Shield,
        title: "Smart Conflict Prevention",
        description:
          "Our system checks availability before confirming any slot. Buffer times, working hours, and blackout dates are respected automatically.",
      },
      {
        icon: Bell,
        title: "Automatic Reminders",
        description:
          "SMS and email confirmations go out instantly. Custom reminder cadences reduce no shows by up to 40 percent.",
      },
      {
        icon: RefreshCw,
        title: "Reschedule and Cancel",
        description:
          "Callers can reschedule or cancel through us anytime. Your calendar stays accurate and your day stays on track.",
      },
      {
        icon: Users,
        title: "Multi Provider Support",
        description:
          "Route appointments by provider, service type, location, or skill. Perfect for clinics, salons, and multi practitioner businesses.",
      },
      {
        icon: Zap,
        title: "Custom Booking Logic",
        description:
          "Set rules for deposit collection, intake forms, insurance verification, and more. Booking is fully tailored to your workflow.",
      },
    ],
    steps: [
      {
        number: 1,
        title: "Connect Your Calendar",
        description: "We integrate with your scheduling tool during onboarding. Setup takes under 30 minutes.",
      },
      {
        number: 2,
        title: "Define Your Booking Rules",
        description: "Tell us your services, durations, providers, and policies. We build the call flow around them.",
      },
      {
        number: 3,
        title: "Start Filling Your Calendar",
        description: "Calls come in, appointments get booked, and confirmations go out. You focus on the work.",
      },
    ],
    useCases: [
      {
        icon: Heart,
        industry: "Medical and Dental",
        scenario:
          "Patients book new visits, follow ups, and consultations across multiple providers. Insurance and intake captured upfront.",
      },
      {
        icon: Award,
        industry: "Beauty and Wellness",
        scenario:
          "Clients schedule services with their preferred stylist or therapist. Deposits collected automatically.",
      },
      {
        icon: Target,
        industry: "Professional Services",
        scenario:
          "Prospects book consultations, discovery calls, and meetings. Conflict free across team calendars.",
      },
    ],
    faqs: [
      {
        question: "Which calendar tools do you integrate with?",
        answer:
          "Google Calendar, Outlook, Calendly, Acuity, Square Appointments, Vagaro, Mindbody, SimplePractice, Jane App, and many more. If you use a custom system, we can usually connect via API.",
      },
      {
        question: "What if my calendar changes after a booking?",
        answer:
          "Our system polls in real time. If you block a slot, we will not double book. If a caller wants a slot that just got taken, we offer the next available time.",
      },
      {
        question: "Can you collect deposits or run intake forms?",
        answer:
          "Yes. We can collect payment at the time of booking, send intake links by SMS or email, verify insurance, and capture custom fields you define.",
      },
      {
        question: "Do you handle reschedules and cancellations?",
        answer:
          "Absolutely. Callers can reschedule or cancel through us anytime. Your calendar updates automatically and confirmations go out for every change.",
      },
    ],
    ctaTitle: "Stop Losing Bookings to Voicemail",
    ctaSubtitle: "Get a calendar that fills itself, 24/7.",
  },

  "lead-qualification": {
    slug: "lead-qualification",
    icon: Award,
    title: "Lead Qualification That Routes Hot Calls Instantly",
    tagline: "Score and Route in Real Time",
    description:
      "Every caller is qualified against your criteria the moment they call. Hot leads route to your sales team instantly. Cold inquiries are nurtured or handled. You only spend time on calls that matter.",
    metaTitle: "Lead Qualification Phone Service",
    metaDescription:
      "Qualify every inbound caller against your criteria in real time. Hot leads route to your sales team instantly. Cold inquiries get handled professionally.",
    features: [
      {
        icon: Target,
        title: "Custom Qualification Scripts",
        description:
          "We build your qualification questions into the call flow. Budget, timeline, decision authority, and need are captured every time.",
      },
      {
        icon: TrendingUp,
        title: "Real Time Lead Scoring",
        description:
          "Each call is scored as Hot, Warm, or Cold based on your rules. Hot leads are flagged immediately for fast follow up.",
      },
      {
        icon: Phone,
        title: "Instant Hot Lead Transfer",
        description:
          "Qualified prospects can be transferred live to your sales team or scheduled for a callback within minutes, not hours.",
      },
      {
        icon: Database,
        title: "CRM Integration",
        description:
          "Lead data syncs to HubSpot, Salesforce, Pipedrive, GoHighLevel, and 30+ CRMs in real time. No data entry on your end.",
      },
      {
        icon: FileText,
        title: "Detailed Call Notes",
        description:
          "Every qualified lead arrives with a full summary, qualification answers, and recommended next steps.",
      },
      {
        icon: Bell,
        title: "Multi Channel Alerts",
        description:
          "SMS, email, Slack, or push alerts the moment a hot lead comes in. Your team responds while interest is at its peak.",
      },
    ],
    steps: [
      {
        number: 1,
        title: "Define Your Criteria",
        description: "Tell us what makes a qualified lead. We turn it into a smart conversation script.",
      },
      {
        number: 2,
        title: "We Qualify Every Call",
        description: "Our AI plus human team asks the right questions and scores in real time.",
      },
      {
        number: 3,
        title: "You Close Hot Leads Faster",
        description: "Get notified instantly. Follow up while prospects are ready to buy.",
      },
    ],
    useCases: [
      {
        icon: Target,
        industry: "Home Services",
        scenario:
          "Qualify by zip code, project type, timeline, and budget. Route urgent jobs to dispatch and big projects to estimators.",
      },
      {
        icon: Award,
        industry: "Real Estate",
        scenario:
          "Capture buyer or seller intent, price range, neighborhood, and timeline. Route to the right agent immediately.",
      },
      {
        icon: TrendingUp,
        industry: "Legal and Financial",
        scenario:
          "Screen for case type, jurisdiction, and conflict checks. Only qualified prospects book consultations.",
      },
    ],
    faqs: [
      {
        question: "How do you decide what counts as a hot lead?",
        answer:
          "You do. During onboarding we build your qualification rules. We then apply them on every call and score in real time so your team always knows which calls deserve immediate attention.",
      },
      {
        question: "Can you transfer hot leads live to my team?",
        answer:
          "Yes. We can warm transfer qualified callers to your team during business hours or schedule a callback at the soonest available time.",
      },
      {
        question: "Which CRMs do you integrate with?",
        answer:
          "HubSpot, Salesforce, Pipedrive, GoHighLevel, Zoho, Monday, Close, and 30+ others. We push lead data including qualification answers in real time.",
      },
      {
        question: "What happens to unqualified callers?",
        answer:
          "We handle them professionally. They get a courteous, helpful experience and are routed to the right resource, voicemail, or scheduled callback so your brand stays intact.",
      },
    ],
    ctaTitle: "Stop Wasting Time on Bad Leads",
    ctaSubtitle: "Get a steady stream of qualified prospects, scored and routed automatically.",
  },

  "after-hours": {
    slug: "after-hours",
    icon: Moon,
    title: "After Hours Coverage That Never Sleeps",
    tagline: "24/7/365 Call Handling",
    description:
      "Calls do not stop at 5pm. Neither do we. Our AI handles routine after hours calls instantly, and our human team is on standby for urgent or complex situations. You never miss revenue while you sleep.",
    metaTitle: "After Hours Call Answering Service",
    metaDescription:
      "Never miss a call after hours. AI plus human coverage 24/7/365. Emergency dispatch, message taking, appointment booking, and lead capture while you sleep.",
    features: [
      {
        icon: Clock,
        title: "Always On Coverage",
        description:
          "Nights, weekends, holidays, and overflow. Your business never goes to voicemail again.",
      },
      {
        icon: Zap,
        title: "Emergency Escalation",
        description:
          "Urgent calls trigger immediate alerts to your on call team via SMS, push, or live transfer.",
      },
      {
        icon: Phone,
        title: "AI for Volume, Humans for Nuance",
        description:
          "Our AI handles routine after hours requests instantly. Complex or sensitive calls escalate to live agents.",
      },
      {
        icon: Bell,
        title: "Custom Escalation Rules",
        description:
          "Define what counts as urgent for your business. We follow your protocol every time.",
      },
      {
        icon: Coffee,
        title: "Same Brand Voice, Always",
        description:
          "After hours callers get the same professional greeting and experience as 9 to 5 callers.",
      },
      {
        icon: BarChart3,
        title: "Morning Summary Reports",
        description:
          "Wake up to a clean digest of every call, message, booking, and lead captured overnight.",
      },
    ],
    steps: [
      {
        number: 1,
        title: "Define After Hours",
        description: "Tell us your business hours, holidays, and on call rotations. We follow them exactly.",
      },
      {
        number: 2,
        title: "We Handle the Night Shift",
        description: "AI plus humans cover every minute. Emergencies escalate. Everything else is captured.",
      },
      {
        number: 3,
        title: "Wake Up to a Full Pipeline",
        description: "Bookings, leads, and messages waiting for you. Nothing missed, nothing slipped through.",
      },
    ],
    useCases: [
      {
        icon: Zap,
        industry: "Emergency Services",
        scenario:
          "Plumbing, HVAC, locksmith, restoration. Urgent calls trigger immediate dispatch. Routine inquiries get logged for morning follow up.",
      },
      {
        icon: Heart,
        industry: "Medical and Veterinary",
        scenario:
          "On call doctor protocols followed exactly. Triage scripts route true emergencies. Routine questions handled or scheduled.",
      },
      {
        icon: Target,
        industry: "Property Management",
        scenario:
          "Tenant emergencies escalate to maintenance on call. Leasing inquiries captured for morning follow up. No tenant ever stranded.",
      },
    ],
    faqs: [
      {
        question: "Can I customize what counts as an emergency?",
        answer:
          "Absolutely. During onboarding we build your escalation rules. Common examples include water leaks, lockouts, medical urgency, security alarms, and high value lead criteria.",
      },
      {
        question: "How fast does an emergency reach my team?",
        answer:
          "Within seconds. Once a caller meets your urgent criteria, we trigger SMS, push notification, or live transfer immediately based on your preference.",
      },
      {
        question: "Do you charge extra for after hours?",
        answer:
          "No. After hours, weekends, and holidays are included in every plan at the same per minute rate. You only pay for handle time.",
      },
      {
        question: "What about overnight non urgent calls?",
        answer:
          "We capture them with full details, book appointments if appropriate, and deliver a morning summary so you start the day with a clean inbox.",
      },
    ],
    ctaTitle: "Never Lose Another Overnight Caller",
    ctaSubtitle: "24/7/365 coverage with the same quality as your daytime team.",
  },

  "trilingual-support": {
    slug: "trilingual-support",
    icon: Languages,
    title: "Trilingual Support in English, Spanish, and French",
    tagline: "EN / ES / FR Coverage",
    description:
      "Serve every caller in their preferred language. Our agents and AI handle calls fluently in English, Spanish, and French, expanding your addressable market without hiring three teams.",
    metaTitle: "Bilingual and Trilingual Phone Service",
    metaDescription:
      "Answer calls professionally in English, Spanish, and French. Expand your reach without hiring multilingual staff. 24/7 trilingual coverage starts at the same per minute rate.",
    features: [
      {
        icon: Globe,
        title: "Three Languages, One Team",
        description:
          "English available 24/7. Spanish and French available across business hours and overflow. Same scripts, same quality, three languages.",
      },
      {
        icon: Languages,
        title: "Native Fluency",
        description:
          "Our agents are fluent speakers, not translators. Callers feel understood, not processed.",
      },
      {
        icon: Heart,
        title: "Cultural Awareness",
        description:
          "Tone and etiquette adapted for each language. Spanish callers in Miami, Madrid, and Mexico City all get appropriate treatment.",
      },
      {
        icon: Zap,
        title: "Auto Language Detection",
        description:
          "Our greeting prompt offers a language choice. The right agent or AI voice takes over instantly.",
      },
      {
        icon: Target,
        title: "Expand Your Market",
        description:
          "Reach Spanish speaking customers in the US, Latin America, and Spain. Reach French speaking customers in Canada, France, and West Africa.",
      },
      {
        icon: FileText,
        title: "Multilingual Notes and Reports",
        description:
          "Call summaries, transcripts, and CRM data delivered in the language you prefer to manage your business in.",
      },
    ],
    steps: [
      {
        number: 1,
        title: "Pick Your Languages",
        description: "Choose any combination of English, Spanish, and French during onboarding.",
      },
      {
        number: 2,
        title: "We Translate Your Scripts",
        description: "Your call flows, FAQs, and brand voice get adapted for each language by native speakers.",
      },
      {
        number: 3,
        title: "Serve Every Caller",
        description: "Callers self select their language and get a fluent, professional experience every time.",
      },
    ],
    useCases: [
      {
        icon: Heart,
        industry: "Healthcare",
        scenario:
          "Hispanic and Francophone patients book appointments and ask questions in their native language, improving care and compliance.",
      },
      {
        icon: Award,
        industry: "Legal Services",
        scenario:
          "Immigration, family, and personal injury firms reach communities that competitors cannot, increasing intake by 30 to 60 percent.",
      },
      {
        icon: Target,
        industry: "Real Estate",
        scenario:
          "Agents in bilingual markets capture buyer and seller leads in any of the three languages without missing a beat.",
      },
    ],
    faqs: [
      {
        question: "Are your agents truly fluent or just bilingual?",
        answer:
          "Our trilingual agents are tested for fluency before going live on your account. They handle nuance, idioms, and accents naturally, not phrase by phrase.",
      },
      {
        question: "Is trilingual support included in standard pricing?",
        answer:
          "Yes. We charge the same per minute rate regardless of language. There are no premiums for Spanish or French calls.",
      },
      {
        question: "What hours are Spanish and French covered?",
        answer:
          "English coverage is 24/7. Spanish and French are covered during extended business hours and during your busiest overflow periods. Custom 24/7 trilingual coverage is available on request.",
      },
      {
        question: "Can the AI handle calls in all three languages too?",
        answer:
          "Yes. Our AI Receptionist supports natural conversation in English, Spanish, and French with consistent voice quality across all three.",
      },
    ],
    ctaTitle: "Expand Your Reach Without Hiring Three Teams",
    ctaSubtitle: "Trilingual coverage at the same per minute rate.",
  },

  integrations: {
    slug: "integrations",
    icon: Plug,
    title: "CRM and Calendar Integrations That Just Work",
    tagline: "Plug Into Your Stack",
    description:
      "Stop copying data between tools. We connect natively to your CRM, calendar, helpdesk, and dispatch systems so every call updates the right record, in the right place, in real time.",
    metaTitle: "CRM and Calendar Integrations",
    metaDescription:
      "Native integrations with HubSpot, Salesforce, Google Calendar, Outlook, Calendly, Slack, and 80+ tools. Real time sync, no manual data entry, no double work.",
    features: [
      {
        icon: Database,
        title: "80+ Native Integrations",
        description:
          "HubSpot, Salesforce, Pipedrive, GoHighLevel, Zoho, Monday, Close, Calendly, Acuity, Google, Outlook, Slack, and more.",
      },
      {
        icon: RefreshCw,
        title: "Real Time Bidirectional Sync",
        description:
          "Calls create or update records instantly. Status changes in your CRM update the call flow next time the contact rings.",
      },
      {
        icon: GitBranch,
        title: "Custom Field Mapping",
        description:
          "Map any call field to any CRM field. Capture exactly the data you need, where you need it.",
      },
      {
        icon: Zap,
        title: "Webhooks and Zapier",
        description:
          "Trigger workflows on call events: new lead, qualified, booked, escalated, missed. Connect to 5,000+ tools through Zapier and Make.",
      },
      {
        icon: Shield,
        title: "Secure by Default",
        description:
          "OAuth authentication, encrypted in transit and at rest, SOC 2 aligned practices. Your data stays your data.",
      },
      {
        icon: Activity,
        title: "Live Status Dashboard",
        description:
          "See every integration health check, sync status, and error in one place. Resolve issues before they affect operations.",
      },
    ],
    steps: [
      {
        number: 1,
        title: "Connect Your Tools",
        description: "OAuth in two clicks during onboarding. We handle the rest.",
      },
      {
        number: 2,
        title: "Map Your Data",
        description: "Tell us where each call field belongs. We configure once and it just works.",
      },
      {
        number: 3,
        title: "Watch Records Update Themselves",
        description: "Every call enriches the right contact, deal, or appointment in real time.",
      },
    ],
    useCases: [
      {
        icon: TrendingUp,
        industry: "Sales Teams",
        scenario:
          "Every inbound call creates or updates a contact in HubSpot or Salesforce with full notes, qualification data, and recording link.",
      },
      {
        icon: CalendarDays,
        industry: "Service Businesses",
        scenario:
          "Bookings sync to Google Calendar or Outlook in real time. Reschedules and cancels propagate everywhere automatically.",
      },
      {
        icon: MessageSquare,
        industry: "Support Teams",
        scenario:
          "Calls create tickets in Zendesk or Intercom with full context, priority, and customer history attached.",
      },
    ],
    faqs: [
      {
        question: "What if my tool is not on the integration list?",
        answer:
          "If you have an API or webhook endpoint, we can almost always connect. Custom integrations typically take 1 to 5 business days during onboarding.",
      },
      {
        question: "Do integrations cost extra?",
        answer:
          "Standard integrations are included in every plan. Custom API connections may have a one time setup fee depending on complexity, with no ongoing charges.",
      },
      {
        question: "How fast does data sync?",
        answer:
          "Most integrations sync within seconds of the call ending. Some legacy systems take up to a few minutes. Real time triggers via webhook fire instantly.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Yes. We use OAuth where supported, encrypt all data in transit and at rest, and follow SOC 2 aligned security practices. We never sell or share your data.",
      },
    ],
    ctaTitle: "Stop Copying Data Between Tools",
    ctaSubtitle: "Real time sync to your stack, included in every plan.",
  },

  reporting: {
    slug: "reporting",
    icon: BarChart3,
    title: "Real Time Reporting and Live Dashboards",
    tagline: "See Everything as It Happens",
    description:
      "Live call volume, qualification rates, booking conversions, response times, and revenue impact. Real time dashboards plus daily, weekly, and monthly reports delivered automatically.",
    metaTitle: "Real Time Call Reporting and Analytics",
    metaDescription:
      "Live dashboards, automated reports, and call analytics. Track volume, conversion, response times, and ROI in real time. Email and Slack digests included.",
    features: [
      {
        icon: Activity,
        title: "Live Call Dashboard",
        description:
          "See active calls, today's volume, qualification mix, and bookings as they happen. Refresh free, always current.",
      },
      {
        icon: TrendingUp,
        title: "Conversion Analytics",
        description:
          "Track lead to qualified to booked rates by source, hour, day, agent, and campaign. Spot patterns and optimize fast.",
      },
      {
        icon: Bell,
        title: "Automated Alerts",
        description:
          "Get notified when call volume spikes, conversion drops, or response times slip. Slack, SMS, and email options.",
      },
      {
        icon: FileText,
        title: "Scheduled Reports",
        description:
          "Daily, weekly, and monthly summaries delivered to your inbox. Custom recipients for owners, ops, and sales leads.",
      },
      {
        icon: Eye,
        title: "Call Recording Library",
        description:
          "Searchable archive of every call. Filter by date, agent, disposition, or keyword. Coach faster, resolve disputes instantly.",
      },
      {
        icon: BarChart3,
        title: "Custom KPI Tracking",
        description:
          "Build your own dashboards around the metrics that matter to your business. Export to CSV or push to your BI tool.",
      },
    ],
    steps: [
      {
        number: 1,
        title: "Pick Your Metrics",
        description: "We help you choose the KPIs that matter most for your business.",
      },
      {
        number: 2,
        title: "Set Up Your Dashboards",
        description: "Real time views configured for owners, ops managers, and sales leads.",
      },
      {
        number: 3,
        title: "Make Data Driven Decisions",
        description: "Live numbers plus automated digests keep you ahead of the curve.",
      },
    ],
    useCases: [
      {
        icon: TrendingUp,
        industry: "Marketing Teams",
        scenario:
          "Track which campaigns drive the highest quality calls. Optimize ad spend based on real qualified lead volume, not just call count.",
      },
      {
        icon: Target,
        industry: "Operations Leaders",
        scenario:
          "Monitor response time SLAs, missed call rates, and after hours volume. Catch issues before they hit revenue.",
      },
      {
        icon: Award,
        industry: "Sales Managers",
        scenario:
          "See exactly how many qualified leads each rep received and how fast they followed up. Coach with data, not anecdotes.",
      },
    ],
    faqs: [
      {
        question: "Are reports available in real time or delayed?",
        answer:
          "Dashboards update in real time. Email and Slack digests are sent on the cadence you choose, daily, weekly, or monthly.",
      },
      {
        question: "Can I export data to my own BI tools?",
        answer:
          "Yes. Export to CSV anytime. We also push to common warehouses like BigQuery, Snowflake, and Postgres on request, and webhook events for real time pipelines.",
      },
      {
        question: "Are call recordings included?",
        answer:
          "Yes. Every plan includes call recording with searchable storage, transcription, and secure access controls. Retention policies are configurable.",
      },
      {
        question: "Can I get reports for my team or franchise locations?",
        answer:
          "Absolutely. We support multi location reporting with rollup views and per location drilldowns. Perfect for franchises and multi site operations.",
      },
    ],
    ctaTitle: "Run Your Business on Real Numbers",
    ctaSubtitle: "Live dashboards, automated reports, and call recordings included.",
  },
};
