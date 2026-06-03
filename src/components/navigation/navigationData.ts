import {
  Bot,
  Headphones,
  Briefcase,
  Users,
  MessageSquare,
  Sparkles,
  Wand2,
  Award,
  Stars,
  Building2,
  HelpCircle,
  Play,
  PhoneCall,
  Stethoscope,
  Scale,
  Home,
  Wallet,
  Monitor,
  Heart,
  PawPrint,
  Truck,
  HandHeart,
  AlertTriangle,
  GraduationCap,
  Wrench,
  CalendarDays,
  Calculator,
  Calendar,
  MapPin,
  BookOpen,
  FileText,
  Rocket,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

export interface SolutionItem {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
  /** Slug used to look up the launch flag (e.g., "ai-receptionist"). When the
   *  flag is OFF, UI surfaces should mark this item as "Coming Soon". */
  gatedFlag?: "ai-receptionist" | "hybrid-receptionist";
}

export interface IndustryItem {
  name: string;
  href: string;
  icon: LucideIcon;
  category: "healthcare" | "professional" | "services" | "specialized";
}

export interface IndustryCategory {
  title: string;
  icon: LucideIcon;
}

export interface ResourceItem {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

export interface ResourceSection {
  title: string;
  items: ResourceItem[];
}

export const solutions: SolutionItem[] = [
  {
    name: "Virtual Receptionist",
    href: "/solutions/virtual-receptionist",
    description: "Live professional receptionists",
    icon: Headphones,
  },
  {
    name: "Message Assistant",
    href: "/solutions/message-assistant",
    description: "Smart message handling",
    icon: MessageSquare,
  },
  {
    name: "Virtual Secretary",
    href: "/solutions/virtual-secretary",
    description: "Full administrative support",
    icon: Briefcase,
  },
  {
    name: "Virtual Assistants",
    href: "/solutions/virtual-assistants",
    description: "Dedicated remote assistants",
    icon: Users,
  },
  {
    name: "AI Receptionist",
    href: "/solutions/ai-receptionist",
    description: "24/7 AI-powered call answering",
    icon: Bot,
    gatedFlag: "ai-receptionist",
  },
  {
    name: "Hybrid Receptionist",
    href: "/solutions/hybrid-receptionist",
    description: "Best of AI + Human combined",
    icon: Wand2,
    featured: true,
    gatedFlag: "hybrid-receptionist",
  },
];

export const industryCategories: Record<string, IndustryCategory> = {
  healthcare: { title: "Healthcare", icon: Stethoscope },
  professional: { title: "Professional", icon: Briefcase },
  services: { title: "Home & Business", icon: Home },
  specialized: { title: "Specialized", icon: Stars },
};

export const industries: IndustryItem[] = [
  { name: "Medical Practices", href: "/industries/medical-practices", icon: Stethoscope, category: "healthcare" },
  { name: "Counseling & Therapy", href: "/industries/counseling-therapy", icon: Heart, category: "healthcare" },
  { name: "Veterinary Services", href: "/industries/veterinary", icon: PawPrint, category: "healthcare" },
  { name: "Legal Services", href: "/industries/legal-services", icon: Scale, category: "professional" },
  { name: "Financial Services", href: "/industries/financial-services", icon: Wallet, category: "professional" },
  { name: "Real Estate", href: "/industries/real-estate", icon: Building2, category: "professional" },
  { name: "Home Services", href: "/industries/home-services", icon: Home, category: "services" },
  { name: "Maintenance & Repair", href: "/industries/maintenance-repair", icon: Wrench, category: "services" },
  { name: "IT & Tech Support", href: "/industries/it-tech-support", icon: Monitor, category: "services" },
  { name: "Beauty & Wellness", href: "/industries/beauty-wellness", icon: Sparkles, category: "services" },
  { name: "Emergency Services", href: "/industries/emergency-services", icon: AlertTriangle, category: "specialized" },
  { name: "Educational Services", href: "/industries/educational-services", icon: GraduationCap, category: "specialized" },
  { name: "Event Planning", href: "/industries/event-planning", icon: CalendarDays, category: "specialized" },
  { name: "Transportation", href: "/industries/transportation-logistics", icon: Truck, category: "specialized" },
  { name: "Nonprofits", href: "/industries/nonprofits", icon: HandHeart, category: "specialized" },
];

export const resources: ResourceSection[] = [
  {
    title: "Get Help",
    items: [
      {
        name: "Call Advisor",
        href: "/call-advisor",
        description: "Get a free call handling audit",
        icon: PhoneCall,
      },
      {
        name: "View Demo",
        href: "/demo",
        description: "See our live call simulator",
        icon: Play,
      },
      {
        name: "Book FREE Consultation",
        href: "/get-started",
        description: "Schedule a personalized walkthrough",
        icon: Calendar,
      },
    ],
  },
   {
     title: "Learn More",
     items: [
       {
         name: "Why 24H Virtual",
         href: "/why-24h-virtual",
         description: "What makes us different",
         icon: Award,
       },
       {
         name: "Free Guides",
         href: "/guides",
         description: "Expert business resources",
         icon: BookOpen,
       },
       {
         name: "About Us",
         href: "/about",
         description: "Learn about 24H Virtual",
         icon: Building2,
       },
       {
         name: "Blog",
         href: "/blog",
         description: "Industry insights and tips",
         icon: FileText,
       },
       {
         name: "FAQs",
         href: "/faqs",
         description: "Common questions answered",
         icon: HelpCircle,
       },
     ],
   },
  {
    title: "Tools",
    items: [
      {
        name: "Launch Estimator",
        href: "/launch-estimator",
        description: "Estimate your campaign launch time",
        icon: Rocket,
      },
      {
        name: "Call-Flow Builder",
        href: "/call-flow-builder",
        description: "Design your ideal call flow",
        icon: GitBranch,
      },
      {
        name: "ROI Calculator",
        href: "/cost-calculator",
        description: "See your potential savings",
        icon: Calculator,
      },
      {
        name: "Service Locations",
        href: "/locations",
        description: "Find services near you",
        icon: MapPin,
      },
    ],
  },
];

export const navLinks: { name: string; href: string }[] = [];
